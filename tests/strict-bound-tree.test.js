"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const gatePath = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");
const passingSummary = 'console.log("TAP version 13\\n# tests 1\\n# pass 1\\n# fail 0\\n# skipped 0")';

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "strict-bound-tree-"));
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Bound tree\n");
    fs.writeFileSync(path.join(root, ".phase-evidence/report.md"), "fixture report\n");
    const git = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" });
    assert.equal(git.status, 0, git.stdout + git.stderr);
    // Intercept only Git tree discovery in the gate process. The counter is local to
    // each invocation, so before/after failures do not depend on timing or PATH.
    const preload = path.join(root, ".phase-evidence/preload.cjs");
    fs.writeFileSync(preload, `
      const cp = require('node:child_process');
      const real = cp.spawnSync;
      let snapshots = 0, unavailable = false;
      cp.spawnSync = function(command, args, options) {
        if (command === 'git' && args[0] === 'ls-files') {
          snapshots++;
          unavailable = (process.env.INJECT_SNAPSHOTS || '').split(',').includes(String(snapshots));
          if (unavailable) return { status: 1, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
        }
        if (command === 'git' && args[0] === 'rev-parse' && unavailable) {
          return { status: 1, stdout: '', stderr: '' };
        }
        return real.apply(this, arguments);
      };
    `);
    function call(inject, ...args) {
      const env = { ...process.env, PHASE_GATE_ROOT: root, INJECT_SNAPSHOTS: inject,
        NODE_OPTIONS: `--require=${JSON.stringify(preload)}` };
      delete env.NODE_TEST_CONTEXT;
      return spawnSync(process.execPath, [gatePath, ...args], { cwd: root, env, encoding: "utf8" });
    }
    const ok = r => assert.equal(r.status, 0, r.stdout + r.stderr);
    const evidencePath = path.join(root, ".phase-evidence/phase-1-test.json");
    const evidence = () => JSON.parse(fs.readFileSync(evidencePath, "utf8"));
    const record = step => ok(call("", "record", "1", step, "--status", "PASS", "--report", ".phase-evidence/report.md"));
    record("coding");
    fn({ root, call, ok, record, evidence, evidencePath });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function run(call, inject, flags, script) {
  return call(inject, "run", "1", "test", ...flags, "--", process.execPath, "-e", script);
}
function finish(record) { for (const step of ["verify", "review", "compound"]) record(step); }

 test("legacy dual unavailable runs and retains unbound PASS", () => fixture(({ call, ok, evidence, record }) => {
  ok(run(call, "1,2", [], "console.log('legacy')"));
  assert.equal(evidence().status, "PASS");
  assert.equal(evidence().tree, null);
  finish(record);
  ok(call("1", "check", "1"));
}));

test("strict unavailable before execution refuses without running the command", () => fixture(({ root, call }) => {
  const marker = path.join(root, ".phase-evidence/executed");
  const r = run(call, "1,2", ["--require-bound-tree"], `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(fs.existsSync(marker), false);
  const file = path.join(root, ".phase-evidence/phase-1-test.json");
  if (fs.existsSync(file)) assert.notEqual(JSON.parse(fs.readFileSync(file, "utf8")).status, "PASS");
}));

test("strict unavailable after execution cannot record PASS", () => fixture(({ root, call }) => {
  const marker = path.join(root, ".phase-evidence/executed");
  const r = run(call, "2", ["--require-bound-tree"], `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(fs.existsSync(marker), true);
  const file = path.join(root, ".phase-evidence/phase-1-test.json");
  if (fs.existsSync(file)) assert.notEqual(JSON.parse(fs.readFileSync(file, "utf8")).status, "PASS");
}));

for (const field of ["null", "missing"]) {
  test(`strict check rejects legacy ${field} tree even when Git is unavailable`, () => fixture(({ call, ok, evidence, evidencePath, record }) => {
    ok(run(call, "1,2", [], "console.log('legacy')"));
    if (field === "missing") {
      const ev = evidence();
      delete ev.tree;
      fs.writeFileSync(evidencePath, JSON.stringify(ev, null, 2) + "\n");
    }
    finish(record);
    ok(call("1", "check", "1"));
    const strict = call("1", "check", "1", "--require-bound-tree");
    assert.equal(strict.status, 2, strict.stdout + strict.stderr);
  }));
}

test("strict bound run and check succeed on an available unchanged tree", () => fixture(({ call, ok, evidence, record }) => {
  ok(run(call, "", ["--require-bound-tree"], "console.log('passed')"));
  assert.equal(evidence().status, "PASS");
  assert.match(evidence().tree, /^[a-f0-9]{64}$/);
  finish(record);
  ok(call("", "check", "1", "--require-bound-tree"));
  const unavailable = call("1", "check", "1", "--require-bound-tree");
  assert.equal(unavailable.status, 2, unavailable.stdout + unavailable.stderr);
}));

for (const flags of [["--require-bound-tree", "--require-test-summary"], ["--require-test-summary", "--require-bound-tree"]]) {
  test(`combined flags enforce both policies: ${flags.join(" ")}`, () => fixture(({ call, ok, evidence }) => {
    const silent = run(call, "", flags, "process.exit(0)");
    assert.equal(silent.status, 2, silent.stdout + silent.stderr);
    assert.equal(evidence().status, "FAIL");
    ok(run(call, "", flags, passingSummary));
    assert.equal(evidence().status, "PASS");
    assert.equal(evidence().require_test_summary, true);
    assert.match(evidence().tree, /^[a-f0-9]{64}$/);
    const unavailable = run(call, "1,2", flags, passingSummary);
    assert.equal(unavailable.status, 2, unavailable.stdout + unavailable.stderr);
  }));
}

test("phase workflow requests bound snapshots for both run and check", () => {
  const text = fs.readFileSync(path.resolve(__dirname, "../.claude/commands/phase-harness.md"), "utf8");
  assert.match(text, /phase-gate\.js run <id> test --require-test-summary --require-bound-tree -- <test command>/);
  assert.match(text, /phase-gate\.js check <id> --require-bound-tree/);
});

test("malformed and duplicate run/check flags are usage errors", () => fixture(({ root, call }) => {
  const marker = path.join(root, ".phase-evidence/invalid-executed");
  const command = ["--", process.execPath, "-e", `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`];
  const badRuns = [
    ["--require-bound-tree", "--require-bound-tree"],
    ["--require-test-summary", "--require-test-summary"],
    ["--require-bound-tree=true"], ["--unknown"], ["--require-bound-tree", "extra"],
  ];
  for (const flags of badRuns) {
    const r = call("", "run", "1", "test", ...flags, ...command);
    assert.equal(r.status, 1, `${flags}: ${r.stdout}${r.stderr}`);
  }
  assert.equal(fs.existsSync(marker), false);
  for (const flags of [["--require-bound-tree", "--require-bound-tree"], ["--unknown"], ["--require-bound-tree=true"], ["--require-bound-tree", "extra"]]) {
    const r = call("", "check", "1", ...flags);
    assert.equal(r.status, 1, `${flags}: ${r.stdout}${r.stderr}`);
  }
}));
