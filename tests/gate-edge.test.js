"use strict";
/**
 * Edge cases for the phase gate that the original suite did not reach: usage errors, malformed
 * evidence, path escapes through symlinks, and phase ids that are legal but unusual.
 * Each test asserts an exit code the CLI documents, so a silent behaviour change fails here.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const GATE = path.resolve(__dirname, "..", ".claude", "workflows", "phase-gate.js");
const NODE = process.execPath;

function root(phasesMd = "# PHASES\n\n### Phase 1: Demo\n- [ ] a\n") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-edge-"));
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "docs", "PHASES.md"), phasesMd);
  return dir;
}

function gate(dir, ...args) {
  return spawnSync(NODE, [GATE, ...args], { env: { ...process.env, PHASE_GATE_ROOT: dir }, encoding: "utf8" });
}

function report(dir, name, text = "report") {
  fs.mkdirSync(path.join(dir, ".phase-evidence"), { recursive: true });
  const rel = `.phase-evidence/${name}`;
  fs.writeFileSync(path.join(dir, rel), text);
  return rel;
}

function withRoot(fn, phasesMd) {
  const dir = root(phasesMd);
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function chain(dir, phase = "1") {
  const rec = (step) => gate(dir, "record", phase, step, "--status", "PASS", "--report", report(dir, `${phase}-${step}.md`));
  assert.equal(gate(dir, "record", phase, "coding", "--status", "PASS", "--report", report(dir, `${phase}-coding.md`)).status, 0);
  const t = gate(dir, "run", phase, "test", "--", NODE, "-e", "process.exit(0)");
  assert.equal(t.status, 0, t.stderr);
  for (const step of ["verify", "review", "compound"]) assert.equal(rec(step).status, 0);
}

test("list prints a placeholder when no phase is defined", () =>
  withRoot((dir) => {
    const r = gate(dir, "list");
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "(none defined)");
  }, "# PHASES\n\nNo phases yet.\n"));

test("list fails when PHASES.md is missing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-edge-"));
  try {
    const r = gate(dir, "list");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /PHASES\.md not found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("phase ids with dots and dashes are legal", () =>
  withRoot((dir) => {
    const r = gate(dir, "list");
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "1.2-a");
    // valid id, no evidence yet: not a usage error
    assert.equal(gate(dir, "check", "1.2-a").status, 2);
  }, "# PHASES\n\n### Phase 1.2-a: Dotted\n- [ ] a\n"));

test("usage errors exit 1 for a missing flag value, an unknown flag and an extra argument", () =>
  withRoot((dir) => {
    assert.equal(gate(dir, "record", "1", "coding", "--status", "PASS", "--report").status, 1);
    assert.equal(gate(dir, "record", "1", "coding", "--status", "PASS", "--bogus", "x").status, 1);
    assert.equal(
      gate(dir, "record", "1", "coding", "--status", "PASS", "--report", report(dir, "r.md"), "extra").status,
      1
    );
  }));

test("run requires a command after -- and the test step", () =>
  withRoot((dir) => {
    assert.equal(gate(dir, "run", "1", "test", "--").status, 1);
    assert.equal(gate(dir, "run", "1", "coding", "--", "true").status, 1);
    assert.equal(gate(dir, "run", "1", "test", "--").stderr.includes("Usage"), true);
  }));

test("verify-attestation with -- but no command is a usage error", () =>
  withRoot((dir) => {
    assert.equal(gate(dir, "verify-attestation", "1", "--").status, 1);
  }));

test("a report that is a directory is rejected", () =>
  withRoot((dir) => {
    fs.mkdirSync(path.join(dir, ".phase-evidence", "adir"), { recursive: true });
    const r = gate(dir, "record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/adir");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not a file/);
  }));

test("a symlink inside .phase-evidence that points outside is rejected", (t) => {
  withRoot((dir) => {
    fs.mkdirSync(path.join(dir, ".phase-evidence"), { recursive: true });
    const outside = path.join(dir, "outside.md");
    fs.writeFileSync(outside, "secret\n");
    try {
      fs.symlinkSync(outside, path.join(dir, ".phase-evidence", "link.md"));
    } catch (e) {
      t.skip(`symlinks are unavailable here: ${e.code}`);
      return;
    }
    const r = gate(dir, "record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/link.md");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /outside \.phase-evidence/);
  });
});

test("check rejects evidence with an unparsable recorded_at", () =>
  withRoot((dir) => {
    chain(dir);
    const f = path.join(dir, ".phase-evidence", "phase-1-compound.json");
    const ev = JSON.parse(fs.readFileSync(f, "utf8"));
    ev.recorded_at = "not-a-date";
    fs.writeFileSync(f, JSON.stringify(ev, null, 2) + "\n");
    const r = gate(dir, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /invalid recorded_at/);
  }));

test("check rejects a step recorded before the step it links to", () =>
  withRoot((dir) => {
    chain(dir);
    const f = path.join(dir, ".phase-evidence", "phase-1-compound.json");
    const ev = JSON.parse(fs.readFileSync(f, "utf8"));
    ev.recorded_at = "2000-01-01T00:00:00.000Z";
    fs.writeFileSync(f, JSON.stringify(ev, null, 2) + "\n");
    const r = gate(dir, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /recorded before the previous step/);
  }));

test("evidence for one phase does not complete another", () =>
  withRoot((dir) => {
    chain(dir); // phase 1 only
    const r = gate(dir, "check", "2");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /missing/);
  }, "# PHASES\n\n### Phase 1: Demo\n- [ ] a\n\n### Phase 2: Other\n- [ ] b\n"));
