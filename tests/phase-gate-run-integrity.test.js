"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function fixture(gitEnabled, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phase-run-integrity-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const gate = (...args) => spawnSync(process.execPath, [GATE, ...args], { cwd: root, env, encoding: "utf8" });
  const ok = r => assert.equal(r.status, 0, r.stdout + r.stderr);
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Integrity\n");
    fs.writeFileSync(path.join(root, "tracked.txt"), "original\n");
    fs.writeFileSync(path.join(root, "untracked.txt"), "original\n");
    fs.writeFileSync(path.join(root, ".phase-evidence/report.md"), "coding report\n");
    if (gitEnabled) {
      ok(spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" }));
      ok(spawnSync("git", ["add", "tracked.txt", "docs/PHASES.md"], { cwd: root, encoding: "utf8" }));
    }
    ok(gate("record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report.md"));
    const execute = code => {
      const result = gate("run", "1", "test", "--", process.execPath, "-e", code);
      const evidence = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence/phase-1-test.json"), "utf8"));
      const log = fs.readFileSync(path.join(root, ".phase-evidence/phase-1-test.log"), "utf8");
      return { result, evidence, log };
    };
    run({ root, execute });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

for (const file of ["tracked.txt", "untracked.txt"]) {
  test(`passing command that changes ${file} records FAIL`, () => {
    fixture(true, ({ root, execute }) => {
      const { result, evidence, log } = execute(`require('fs').writeFileSync(${JSON.stringify(file)}, 'changed')`);
      assert.equal(fs.readFileSync(path.join(root, file), "utf8"), "changed");
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.equal(evidence.status, "FAIL");
      assert.equal(evidence.exit_code, 0);
      assert.match(log, /code changed during test/);
      assert.match(result.stdout, /code changed during test/);
    });
  });
}

test("unchanged tree passes and binds the tree", () => {
  fixture(true, ({ execute }) => {
    const { result, evidence, log } = execute("console.log('passed')");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(evidence.status, "PASS");
    assert.match(evidence.tree, /^[a-f0-9]{64}$/);
    assert.match(log, /code tree unchanged/);
  });
});

test("non-repository tree unavailable on both sides preserves legacy unbound behavior", () => {
  fixture(false, ({ execute }) => {
    const { result, evidence, log } = execute("console.log('passed')");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(evidence.status, "PASS");
    assert.equal(evidence.tree, null);
    assert.match(log, /code tree unavailable before and after; tree not bound/);
  });
});

for (const gitEnabled of [true, false]) {
  test(`one unavailable tree fails (${gitEnabled ? "after" : "before"} run)`, () => {
    fixture(gitEnabled, ({ execute }) => {
      const code = gitEnabled
        ? "require('fs').renameSync('.git', '.phase-evidence/git-hidden')"
        : "const r=require('child_process').spawnSync('git',['init','-q']); if(r.status!==0) process.exit(1)";
      const { result, evidence, log } = execute(code);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.equal(evidence.status, "FAIL");
      assert.equal(evidence.exit_code, 0);
      assert.match(log, /code tree unavailable before or after test; cannot compare/);
      assert.match(result.stdout, /code tree unavailable before or after test/);
    });
  });
}
