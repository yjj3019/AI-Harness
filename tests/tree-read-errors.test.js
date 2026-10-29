"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const gateFile = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tree-errors-"));
  const evidence = path.join(root, ".phase-evidence");
  fs.mkdirSync(evidence);
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Test\n");
  fs.writeFileSync(path.join(root, "target.txt"), "contents\n");
  fs.writeFileSync(path.join(evidence, "report"), "report\n");
  const shim = path.join(evidence, "inject.cjs");
  fs.writeFileSync(shim, `
const fs = require('fs');
const path = require('path');
let count = 0;
const original = fs.lstatSync;
fs.lstatSync = function(p, ...rest) {
  if (path.resolve(String(p)) === path.join(process.env.PHASE_GATE_ROOT, 'target.txt')) {
    count++;
    if (count === Number(process.env.FAIL_AT)) {
      if (process.env.FAIL_OP === 'lstat') { const e = new Error('injected'); e.code = process.env.FAIL_CODE || 'EACCES'; throw e; }
      if (process.env.FAIL_OP === 'readlink') return { isSymbolicLink: () => true };
    }
  }
  return original.call(this, p, ...rest);
};
for (const op of ['readFileSync', 'readlinkSync']) {
  const real = fs[op];
  fs[op] = function(p, ...rest) {
    if (path.resolve(String(p)) === path.join(process.env.PHASE_GATE_ROOT, 'target.txt') && count === Number(process.env.FAIL_AT) && process.env.FAIL_OP === (op === 'readFileSync' ? 'read' : 'readlink')) {
      const e = new Error('injected'); e.code = process.env.FAIL_CODE || 'EACCES'; throw e;
    }
    return real.call(this, p, ...rest);
  };
}
`);
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const ok = r => assert.equal(r.status, 0, r.stdout + r.stderr);
  const gate = (args, fault) => {
    const env = { ...process.env, PHASE_GATE_ROOT: root };
    delete env.NODE_TEST_CONTEXT;
    if (fault) Object.assign(env, { FAIL_OP: fault.op, FAIL_AT: String(fault.at), FAIL_CODE: fault.code || "EACCES" });
    return spawnSync(process.execPath, [...(fault ? ["--require", shim] : []), gateFile, ...args], { cwd: root, env, encoding: "utf8" });
  };
  const record = step => ok(gate(["record", "1", step, "--status", "PASS", "--report", ".phase-evidence/report"]));
  const command = [process.execPath, "-e", "console.log('ok')"];
  const run = fault => gate(["run", "1", "test", "--", ...command], fault);
  try {
    ok(git("init", "-q"));
    ok(git("add", "target.txt", "docs/PHASES.md"));
    record("coding");
    fn({ root, gate, record, run, ok, command });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function failure(result, pattern) {
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, pattern);
}
function chain(f) {
  f.ok(f.run());
  for (const step of ["verify", "review", "compound"]) f.record(step);
}

for (const op of ["lstat", "read", "readlink"]) {
  for (const at of [1, 2]) {
    test(`run fails ${op} error at snapshot ${at} and invalidates old evidence`, () => fixture(f => {
      chain(f);
      failure(f.run({ op, at, code: op === "lstat" ? "EACCES" : "ENOENT" }), /cannot snapshot code tree/);
      for (const step of ["test", "verify", "review", "compound"])
        assert.equal(fs.existsSync(path.join(f.root, `.phase-evidence/phase-1-${step}.json`)), false, step);
    }));
  }
  test(`check and attest fail on ${op} errors`, () => fixture(f => {
    chain(f);
    for (const action of ["check", "attest"]) failure(f.gate([action, "1"], { op, at: 1 }), /cannot snapshot code tree/);
    assert.equal(fs.existsSync(path.join(f.root, "docs/attestations/phase-1.json")), false);
    failure(f.gate(["attest", "1"], { op, at: 2 }), /cannot snapshot code tree/);
  }));
  for (const at of [1, 2]) {
    test(`attestation replay fails ${op} error at snapshot ${at}`, () => fixture(f => {
      chain(f);
      f.ok(f.gate(["attest", "1"]));
      const attestation = path.join(f.root, "docs/attestations/phase-1.json");
      const before = fs.readFileSync(attestation);
      failure(f.gate(["attest", "1"], { op, at }), /cannot snapshot code tree/);
      assert.deepEqual(fs.readFileSync(attestation), before);
      failure(f.gate(["verify-attestation", "1", "--", ...f.command], { op, at }), /cannot snapshot code tree/);
    }));
  }
}

test("successful hash remains compatible and tracked deletion is stable", () => fixture(f => {
  const hash = data => crypto.createHash("sha256").update(data).digest("hex");
  const expected = files => hash(files.map(file => `${file}\0${hash(fs.readFileSync(path.join(f.root, file)))}\n`).join(""));
  f.ok(f.run());
  const evidence = () => JSON.parse(fs.readFileSync(path.join(f.root, ".phase-evidence/phase-1-test.json"), "utf8"));
  assert.equal(evidence().tree, expected(["docs/PHASES.md", "target.txt"]));
  fs.unlinkSync(path.join(f.root, "target.txt"));
  f.ok(f.run());
  assert.equal(evidence().tree, expected(["docs/PHASES.md"]));
}));
