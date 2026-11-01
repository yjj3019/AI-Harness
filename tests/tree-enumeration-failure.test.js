"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tree-enumeration-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const preload = path.join(root, ".phase-evidence", "inject.cjs");
  const gate = (mode, ...args) => spawnSync(process.execPath, ["--require", preload, GATE, ...args], {
    cwd: root, env: { ...env, INJECT_MODE: mode }, encoding: "utf8",
  });
  const pass = r => assert.equal(r.status, 0, `${r.error || ""}\n${r.stdout}\n${r.stderr}`);
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Tree\n");
    fs.writeFileSync(path.join(root, "app.js"), "original\n");
    fs.writeFileSync(preload, `
const cp = require('node:child_process');
const original = cp.spawnSync;
let count = 0;
cp.spawnSync = function(command, args) {
  if (command === 'git' && args[0] === 'ls-files') {
    count++;
    if (process.env.INJECT_MODE === 'fail' || (process.env.INJECT_MODE === 'after' && count === 2) || process.env.INJECT_MODE === 'ambiguous')
      return { status: 1, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  }
  if (command === 'git' && args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree' && process.env.INJECT_MODE === 'ambiguous')
    return { status: 1, stdout: '', stderr: '' };
  return original.apply(this, arguments);
};
`);
    pass(spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" }));
    pass(spawnSync("git", ["add", "app.js"], { cwd: root, encoding: "utf8" }));
    fs.writeFileSync(path.join(root, ".phase-evidence", "report"), "report\n");
    const record = step => gate("control", "record", "1", step, "--status", "PASS", "--report", ".phase-evidence/report");
    pass(record("coding"));
    fn({ root, gate, pass, record });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const run = (gate, mode) => gate(mode, "run", "1", "test", "--", process.execPath, "-e", "process.exit(0)");
const evidence = root => path.join(root, ".phase-evidence", "phase-1-test.json");

test("corrupt index fails the original run instead of recording unbound PASS", () => {
  fixture(({ root, gate, pass }) => {
    fs.writeFileSync(path.join(root, ".git", "index"), "corrupt index\n");
    const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8" });
    pass(probe);
    assert.equal(probe.stdout.trim(), "true");
    const result = run(gate, "control");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /cannot snapshot code tree before test: git ls-files failed/);
    assert.equal(fs.existsSync(evidence(root)), false);
  });
});

test("established worktree enumeration errors fail before and after test", () => {
  for (const [mode, position] of [["fail", "before"], ["after", "after"]]) {
    fixture(({ root, gate }) => {
      const result = run(gate, mode);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, new RegExp(`cannot snapshot code tree ${position} test: git ls-files failed`));
      assert.equal(fs.existsSync(evidence(root)), false);
    });
  }
});

test("check rejects injected enumeration failure for established worktree", () => {
  fixture(({ gate, pass, record }) => {
    pass(run(gate, "control"));
    for (const step of ["verify", "review", "compound"]) pass(record(step));
    const result = gate("fail", "check", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /cannot snapshot code tree: git ls-files failed/);
  });
});

test("attest rejects enumeration failures at both snapshots without replacing an attestation", () => {
  for (const [mode, message] of [
    ["fail", /cannot attest\. test: cannot snapshot code tree: git ls-files failed: exit 1/],
    ["after", /cannot snapshot code tree for attestation: git ls-files failed: exit 1/],
  ]) {
    fixture(({ root, gate, pass, record }) => {
      const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8" });
      pass(probe);
      assert.equal(probe.stdout.trim(), "true");
      pass(run(gate, "control"));
      for (const step of ["verify", "review", "compound"]) pass(record(step));
      pass(gate("control", "attest", "1"));
      const file = path.join(root, "docs", "attestations", "phase-1.json");
      const original = fs.readFileSync(file);
      const result = gate(mode, "attest", "1");
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, message);
      assert.deepEqual(fs.readFileSync(file), original);
    });
  }
});

test("verify-attestation rejects enumeration failures before and after replay", () => {
  for (const [mode, message, replayed] of [
    ["fail", /cannot snapshot code tree: git ls-files failed: exit 1/, false],
    ["after", /cannot snapshot code tree after replay: git ls-files failed: exit 1/, true],
  ]) {
    fixture(({ root, gate, pass, record }) => {
      const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8" });
      pass(probe);
      assert.equal(probe.stdout.trim(), "true");
      const marker = path.join(root, ".phase-evidence", "replayed");
      const script = "require('node:fs').writeFileSync('.phase-evidence/replayed', 'ran')";
      pass(gate("control", "run", "1", "test", "--", process.execPath, "-e", script));
      for (const step of ["verify", "review", "compound"]) pass(record(step));
      pass(gate("control", "attest", "1"));
      const file = path.join(root, "docs", "attestations", "phase-1.json");
      const original = fs.readFileSync(file);
      fs.unlinkSync(marker);
      pass(gate("control", "verify-attestation", "1"));
      assert.equal(fs.readFileSync(marker, "utf8"), "ran");
      fs.unlinkSync(marker);
      const result = gate(mode, "verify-attestation", "1");
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, message);
      assert.equal(fs.existsSync(marker), replayed);
      if (replayed) assert.equal(fs.readFileSync(marker, "utf8"), "ran");
      assert.deepEqual(fs.readFileSync(file), original);
    });
  }
});

test("failed discovery remains legacy unbound and ambiguous", () => {
  fixture(({ root, gate, pass, record }) => {
    pass(run(gate, "ambiguous"));
    const ev = JSON.parse(fs.readFileSync(evidence(root), "utf8"));
    assert.equal(ev.status, "PASS");
    assert.equal(ev.tree, null);
    for (const step of ["verify", "review", "compound"]) pass(record(step));
    const checked = gate("ambiguous", "check", "1");
    pass(checked);
    assert.match(checked.stdout, /\[WARN\].*code tree is not bound/);
    const attested = gate("ambiguous", "attest", "1");
    assert.equal(attested.status, 2, attested.stdout + attested.stderr);
    assert.match(attested.stderr, /without git/);
  });
});
