"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const gateScript = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

for (const kind of ["hard", "symbolic"]) {
  test(`run replaces ${kind} link without modifying its target, including reruns`, (t) => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "gate-log-links-"));
    const root = path.join(sandbox, "repo");
    const evidence = path.join(root, ".phase-evidence");
    const log = path.join(evidence, "phase-1-test.log");
    const target = path.join(sandbox, "victim");
    try {
      fs.mkdirSync(evidence, { recursive: true });
      fs.mkdirSync(path.join(root, "docs"));
      fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Links\n");
      fs.writeFileSync(path.join(evidence, "report"), "report\n");
      fs.writeFileSync(target, "keep this unchanged\n");
      const gate = args => spawnSync(process.execPath, [gateScript, ...args], {
        cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root }, encoding: "utf8",
      });
      let r = gate(["record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report"]);
      assert.equal(r.status, 0, r.stderr);
      try {
        if (kind === "hard") fs.linkSync(target, log);
        else fs.symlinkSync(target, log);
      } catch (err) {
        if (["EPERM", "EACCES", "ENOTSUP"].includes(err.code)) { t.skip(`link unavailable: ${err.code}`); return; }
        throw err;
      }
      for (let i = 0; i < 2; i++) {
        r = gate(["run", "1", "test", "--", process.execPath, "-e", "console.log('test output')"]);
        assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
        assert.equal(fs.readFileSync(target, "utf8"), "keep this unchanged\n");
        assert.equal(fs.lstatSync(log).isSymbolicLink(), false);
        assert.match(fs.readFileSync(log, "utf8"), /test output/);
        assert.deepEqual(fs.readdirSync(evidence).filter(n => n.startsWith(".phase-gate-") && n.endsWith(".tmp")), []);
      }
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
}

test("exclusive temp collision leaves the existing file untouched", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "gate-log-collision-"));
  const root = path.join(sandbox, "repo");
  const evidence = path.join(root, ".phase-evidence");
  const collision = path.join(evidence, `.phase-gate-${"ab".repeat(16)}.tmp`);
  const preload = path.join(sandbox, "preload.cjs");
  try {
    fs.mkdirSync(evidence, { recursive: true });
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Collision\n");
    fs.writeFileSync(path.join(evidence, "report"), "report\n");
    fs.writeFileSync(collision, "do not remove\n");
    fs.writeFileSync(preload, `
const crypto = require('node:crypto');
const original = crypto.randomBytes;
crypto.randomBytes = function(n) { return n === 16 ? Buffer.alloc(16, 0xab) : original.apply(this, arguments); };
const cp = require('node:child_process');
const spawn = cp.spawnSync;
cp.spawnSync = function(cmd) { return cmd === 'git' ? { status: 1 } : spawn.apply(this, arguments); };
`);
    const gate = args => spawnSync(process.execPath, ["--require", preload, gateScript, ...args], {
      cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root }, encoding: "utf8", timeout: 15000,
    });
    const record = gate(["record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report"]);
    assert.equal(record.status, 0, record.stderr);
    const run = gate(["run", "1", "test", "--", process.execPath, "-e", "console.log('unexpected')"]);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /EEXIST/);
    assert.equal(fs.readFileSync(collision, "utf8"), "do not remove\n");
    assert.equal(fs.existsSync(path.join(evidence, "phase-1-test.json")), false);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test("strict summary without trailing newline survives run and check", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "gate-log-summary-"));
  const root = path.join(sandbox, "repo");
  const evidence = path.join(root, ".phase-evidence");
  const preload = path.join(sandbox, "preload.cjs");
  try {
    fs.mkdirSync(evidence, { recursive: true });
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Summary\n");
    fs.writeFileSync(path.join(evidence, "report"), "report\n");
    fs.writeFileSync(preload, `
const fs = require('node:fs');
const cp = require('node:child_process');
const { EventEmitter } = require('node:events');
cp.spawnSync = function(cmd, args, opts) {
  if (cmd === 'git') return { status: 1 };
  throw new Error('unexpected synchronous child');
};
cp.spawn = function(cmd, args, opts) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  process.nextTick(() => {
    child.stdout.emit('data', Buffer.from('# tests 1\\n# pass 1\\n# fail 0'));
    child.emit('close', 0, null);
  });
  return child;
};
`);
    const gate = args => spawnSync(process.execPath, ["--require", preload, gateScript, ...args], {
      cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root }, encoding: "utf8", timeout: 15000,
    });
    const pass = r => assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    const record = step => gate(["record", "1", step, "--status", "PASS", "--report", ".phase-evidence/report"]);
    pass(record("coding"));
    pass(gate(["run", "1", "test", "--require-test-summary", "--", "fixture-command"]));
    assert.match(fs.readFileSync(path.join(evidence, "phase-1-test.log"), "utf8"), /# fail 0\n\[phase-gate\] command:/);
    for (const step of ["verify", "review", "compound"]) pass(record(step));
    pass(gate(["check", "1"]));
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

for (const mode of ["seek", "tree-error", "tree-close-error"]) {
  test(`run handles ${mode} without corrupting output or hiding errors`, () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "gate-log-errors-"));
    const root = path.join(sandbox, "repo");
    const evidence = path.join(root, ".phase-evidence");
    const preload = path.join(sandbox, "preload.cjs");
    try {
      fs.mkdirSync(evidence, { recursive: true });
      fs.mkdirSync(path.join(root, "docs"));
      fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Errors\n");
      fs.writeFileSync(path.join(root, "source"), "source\n");
      fs.writeFileSync(path.join(evidence, "report"), "report\n");
      fs.writeFileSync(preload, `
const fs = require('node:fs');
const cp = require('node:child_process');
const { EventEmitter } = require('node:events');
const mode = process.env.INJECT_MODE;
let snapshots = 0, tempFd;
const open = fs.openSync, close = fs.closeSync, lstat = fs.lstatSync;
fs.openSync = function(file, flags) { const fd = open.apply(this, arguments); if (flags === 'wx+') tempFd = fd; return fd; };
fs.closeSync = function(fd) { const r = close.apply(this, arguments); if (mode === 'tree-close-error' && fd === tempFd) throw new Error('injected close failure'); return r; };
fs.lstatSync = function(file) { if (mode !== 'seek' && snapshots === 2 && String(file).endsWith('source')) { const e = new Error('injected tree read failure'); e.code = 'EACCES'; throw e; } return lstat.apply(this, arguments); };
cp.spawnSync = function(cmd, args, opts) {
  if (cmd === 'git' && args[0] === '--no-optional-locks') return { status: 0, stdout: Buffer.from('100644 ' + 'a'.repeat(40) + ' 0\\tsource\\0') };
  if (cmd === 'git') { snapshots++; return { status: 0, stdout: Buffer.from('source\\0') }; }
  throw new Error('unexpected synchronous child');
};
cp.spawn = function(cmd, args, opts) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  process.nextTick(() => {
    child.stdout.emit('data', Buffer.from('child output\\n'));
    child.emit('close', 0, null);
  });
  return child;
};
`);
      const gate = args => spawnSync(process.execPath, ["--require", preload, gateScript, ...args], {
        cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root, INJECT_MODE: mode }, encoding: "utf8", timeout: 15000,
      });
      const record = gate(["record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report"]);
      assert.equal(record.status, 0, record.stderr);
      const run = gate(["run", "1", "test", "--", "fixture-command"]);
      if (mode === "seek") {
        assert.equal(run.status, 0, run.stderr);
        assert.match(fs.readFileSync(path.join(evidence, "phase-1-test.log"), "utf8"), /^child output\n\[phase-gate\] command:/);
      } else {
        assert.equal(run.status, 2, run.stderr);
        assert.match(run.stderr, /cannot snapshot code tree after test: lstat source: EACCES/);
        if (mode === "tree-close-error") assert.match(run.stderr, /injected close failure/);
        assert.deepEqual(fs.readdirSync(evidence).filter(n => n.startsWith(".phase-gate-") && n.endsWith(".tmp")), []);
      }
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
}
