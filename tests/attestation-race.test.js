"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function fixture(fn, unbound = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attestation-race-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const preload = path.join(root, ".phase-evidence", "inject.cjs");
  const gate = (mode, ...args) => spawnSync(process.execPath, ["--require", preload, GATE, ...args], {
    cwd: root, env: { ...env, INJECT_MODE: mode }, encoding: "utf8",
  });
  const pass = (r) => assert.equal(r.status, 0, `${r.error || ""}\n${r.stdout}\n${r.stderr}`);
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Attestation race\n");
    fs.writeFileSync(path.join(root, "app.js"), "original\n");
    // Intercept the gate's synchronous git call without shell scripts or executable wrappers.
    // The second ls-files call occurs after validateChain and before attestation is written.
    fs.writeFileSync(preload, `
const cp = require('node:child_process');
const fs = require('node:fs');
const original = cp.spawnSync;
let calls = 0;
cp.spawnSync = function(command, args, options) {
  if (command === 'git' && args[0] === 'ls-files') {
    calls++;
    const mode = process.env.INJECT_MODE;
    if (mode === 'mutate' && calls === 2) fs.writeFileSync('app.js', 'changed\\n');
    if (mode === 'always-unavailable' || (mode === 'first-unavailable' && calls === 1))
      return { status: 1, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    fs.appendFileSync('.phase-evidence/calls', String(calls) + '\\n');
  }
  return original.apply(this, arguments);
};
`);
    pass(spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" }));
    const report = ".phase-evidence/report.md";
    fs.writeFileSync(path.join(root, report), "Independent report\n");
    const record = (step) => gate("control", "record", "1", step, "--status", "PASS", "--report", report);
    pass(record("coding"));
    pass(gate(unbound ? "always-unavailable" : "control", "run", "1", "test", "--", process.execPath, "-e", "process.exit(0)"));
    for (const step of ["verify", "review", "compound"]) pass(record(step));
    fn({ root, gate, pass });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("attest rejects a tree changed between validation and its second snapshot", () => {
  fixture(({ root, gate }) => {
    const result = gate("mutate", "attest", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /code tree does not match test evidence/);
    assert.equal(fs.readFileSync(path.join(root, "app.js"), "utf8"), "changed\n");
    assert.equal(fs.existsSync(path.join(root, "docs", "attestations", "phase-1.json")), false);
  });
});

test("attest accepts the unchanged tree", () => {
  fixture(({ root, gate, pass }) => {
    const result = gate("control", "attest", "1");
    pass(result);
    const att = JSON.parse(fs.readFileSync(path.join(root, "docs", "attestations", "phase-1.json"), "utf8"));
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(att.tree, evidence.tree);
  });
});

test("attest rejects unbound evidence when git becomes available after validation", () => {
  fixture(({ root, gate }) => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(evidence.tree, null);
    const result = gate("first-unavailable", "attest", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /code tree does not match test evidence/);
    assert.equal(fs.existsSync(path.join(root, "docs", "attestations", "phase-1.json")), false);
  }, true);
});

test("attest rejects a mismatching tree when validation cannot obtain a hash", () => {
  fixture(({ root, gate }) => {
    fs.writeFileSync(path.join(root, "app.js"), "changed\n");
    const result = gate("first-unavailable", "attest", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /code tree does not match test evidence/);
    assert.equal(fs.existsSync(path.join(root, "docs", "attestations", "phase-1.json")), false);
  });
});
