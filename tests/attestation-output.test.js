"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attestation-output-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  delete env.REPLAY_OUTPUT;
  const gate = (args, extra = {}) => spawnSync(process.execPath, [GATE, ...args], {
    cwd: root, env: { ...env, ...extra }, encoding: "utf8", maxBuffer: 24 * 1024 * 1024,
  });
  const passes = r => assert.equal(r.status, 0, (r.stdout || "") + (r.stderr || ""));
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Output replay\n");
    fs.writeFileSync(path.join(root, "actual.test.js"), "require('node:test').test('actual fixture test', () => require('node:assert/strict').equal(2 + 2, 4));\n");
    // Forward a real runner's output; only its placement and additional noise vary at replay.
    fs.writeFileSync(path.join(root, "runner.js"), [
      "const fs = require('node:fs');",
      "const r = require('node:child_process').spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'actual.test.js'], {encoding:'utf8'});",
      "if (r.error || r.status !== 0) process.exit(1);",
      "if (process.env.REPLAY_OUTPUT === 'large') fs.writeSync(1, 'x'.repeat(17 * 1024 * 1024) + '\\n');",
      "if (process.env.REPLAY_OUTPUT === 'interleaved') {",
      "  const i = r.stdout.indexOf('# pass '); if (i < 0) process.exit(1);",
      "  fs.writeSync(1, r.stdout.slice(0, i)); fs.writeSync(2, 'intervening noise\\n'); fs.writeSync(1, r.stdout.slice(i));",
      "} else fs.writeSync(1, r.stdout);",
    ].join("\n"));
    const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
    passes(git("init", "-q"));
    passes(git("add", "docs/PHASES.md", "actual.test.js", "runner.js"));
    const argv = [process.execPath, "runner.js"];
    const report = ".phase-evidence/report.md";
    fs.writeFileSync(path.join(root, report), "Disposable fixture report.\n");
    const record = step => gate(["record", "1", step, "--status", "PASS", "--report", report]);
    passes(record("coding"));
    passes(gate(["run", "1", "test", "--require-test-summary", "--", ...argv]));
    for (const step of ["verify", "review", "compound"]) passes(record(step));
    passes(gate(["check", "1"]));
    passes(gate(["attest", "1"]));
    fn({ gate, passes });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("strict replay rejects stderr noise interleaved within real TAP counts", () => {
  fixture(({ gate }) => {
    const r = gate(["verify-attestation", "1"], { REPLAY_OUTPUT: "interleaved" });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stdout, /# tests 1\r?\n(?:# suites \d+\r?\n)?intervening noise\r?\n# pass 1/);
    assert.match(r.stderr, /strict test summary invalid/);
  });
});

test("strict replay accepts over 16 MiB with real passing TAP counts", () => {
  fixture(({ gate, passes }) => {
    const r = gate(["verify-attestation", "1"], { REPLAY_OUTPUT: "large" });
    passes(r);
    assert.ok(r.stdout.length > 17 * 1024 * 1024);
    assert.match(r.stdout, /# pass 1/);
    assert.match(r.stdout, /attestation verified/);
  });
});
