"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function withAttestation(strict, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attestation-replay-tree-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const gate = (...args) => spawnSync(process.execPath, [GATE, ...args], {
    cwd: root, env, encoding: "utf8",
  });
  const passes = (result) => assert.equal(result.status, 0, result.stdout + result.stderr);
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Replay tree binding\n");
    fs.writeFileSync(path.join(root, "app.js"), "module.exports = 1;\n");
    // Mutation is armed only after a valid attestation exists. The marker is excluded from
    // treeHash, so the pre-replay comparison succeeds; only the replay changes tracked code.
    fs.writeFileSync(path.join(root, "replay.test.js"), [
      "const {test}=require('node:test');",
      "const assert=require('node:assert/strict');",
      "const fs=require('node:fs');",
      "test('real passing replay',()=>{",
      "  assert.equal(2+2,4);",
      "  if(fs.existsSync('.phase-evidence/mutate-on-replay'))",
      "    fs.writeFileSync('app.js','module.exports = 2;\\n');",
      "});",
    ].join("\n"));
    const argv = [process.execPath, "--test", "--test-reporter=tap", "replay.test.js"];
    if (strict) {
      fs.mkdirSync(path.join(root, ".claude"));
      fs.writeFileSync(path.join(root, ".claude/required-test-command.json"), JSON.stringify(argv));
    }
    const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
    passes(git("init", "-q"));
    passes(git("add", "app.js", "replay.test.js", "docs/PHASES.md"));
    const report = ".phase-evidence/report.md";
    fs.writeFileSync(path.join(root, report), "Independent verification report.\n");
    const record = (step) => gate("record", "1", step, "--status", "PASS", "--report", report);
    passes(record("coding"));
    passes(gate("run", "1", "test", "--", ...argv));
    for (const step of ["verify", "review", "compound"]) passes(record(step));
    passes(gate("check", "1"));
    passes(gate("attest", "1"));
    fn({ root, gate, passes });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

for (const strict of [false, true]) {
  const mode = strict ? "pinned strict" : "legacy";
  test(`${mode}: passing replay that changes tracked source is rejected`, () => {
    withAttestation(strict, ({ root, gate }) => {
      fs.writeFileSync(path.join(root, ".phase-evidence/mutate-on-replay"), "armed");
      const result = gate("verify-attestation", "1");
      assert.equal(fs.readFileSync(path.join(root, "app.js"), "utf8"), "module.exports = 2;\n");
      assert.match(result.stdout, /# pass 1/); // The runner passed; the tree guard must reject it.
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, /code changed during attestation replay/);
      assert.doesNotMatch(result.stdout, /attestation verified/);
    });
  });
  test(`${mode}: passing replay with unchanged source still verifies`, () => {
    withAttestation(strict, ({ root, gate, passes }) => {
      const result = gate("verify-attestation", "1");
      passes(result);
      assert.match(result.stdout, /attestation verified: tree matches/);
      assert.equal(fs.readFileSync(path.join(root, "app.js"), "utf8"), "module.exports = 1;\n");
    });
  });
}
