"use strict";
/**
 * Branch coverage for the gate's error paths: corrupt evidence, corrupt attestations, a doctor
 * run against a broken settings file, and a tracked file that was deleted from the worktree.
 * These are the paths that decide whether a broken project is reported or silently accepted.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const GATE = path.resolve(__dirname, "..", ".claude", "workflows", "phase-gate.js");
const NODE = process.execPath;
const PHASES = "# PHASES\n\n### Phase 1: Demo\n- [ ] a\n";

function root() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-branch-"));
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "docs", "PHASES.md"), PHASES);
  return dir;
}

function gate(dir, ...args) {
  return spawnSync(NODE, [GATE, ...args], { env: { ...process.env, PHASE_GATE_ROOT: dir }, encoding: "utf8" });
}

function report(dir, name) {
  fs.mkdirSync(path.join(dir, ".phase-evidence"), { recursive: true });
  const rel = `.phase-evidence/${name}`;
  fs.writeFileSync(path.join(dir, rel), "report");
  return rel;
}

function record(dir, step) {
  return gate(dir, "record", "1", step, "--status", "PASS", "--report", report(dir, `1-${step}.md`));
}

function fullChain(dir) {
  assert.equal(record(dir, "coding").status, 0);
  assert.equal(gate(dir, "run", "1", "test", "--", NODE, "-e", "process.exit(0)").status, 0);
  for (const step of ["verify", "review", "compound"]) assert.equal(record(dir, step).status, 0);
}

function withRoot(fn) {
  const dir = root();
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("an unknown command prints the usage and exits 1", () =>
  withRoot((dir) => {
    const r = gate(dir, "frobnicate");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage:/);
  }));

test("corrupt evidence JSON is reported, not crashed on", () =>
  withRoot((dir) => {
    fs.mkdirSync(path.join(dir, ".phase-evidence"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".phase-evidence", "phase-1-coding.json"), "{ not json");
    const r = gate(dir, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /invalid JSON/);
  }));

test("a malformed artifact entry fails the check", () =>
  withRoot((dir) => {
    fs.mkdirSync(path.join(dir, ".phase-evidence"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".phase-evidence", "phase-1-coding.json"),
      JSON.stringify({ schema: 1, phase: "1", step: "coding", status: "PASS", recorded_at: new Date().toISOString(), artifacts: [null], prev: null })
    );
    const r = gate(dir, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /malformed/);
  }));

test("record accepts a lower-case --status value", () =>
  withRoot((dir) => {
    const r = gate(dir, "record", "1", "coding", "--status", "pass", "--report", report(dir, "c.md"));
    assert.equal(r.status, 0);
    assert.match(r.stdout, /PASS/);
  }));

test("a tracked file deleted from the worktree does not crash the tree hash", () => {
  const dir = root();
  try {
    const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd: dir, encoding: "utf8" });
    git("init", "-q");
    fs.writeFileSync(path.join(dir, ".gitignore"), ".phase-evidence/\n");
    fs.writeFileSync(path.join(dir, "app.js"), "1\n");
    git("add", "-A");
    git("commit", "-q", "-m", "init");
    fs.unlinkSync(path.join(dir, "app.js")); // still in the index, gone from disk

    fullChain(dir);
    const r = gate(dir, "check", "1");
    assert.equal(r.status, 0, r.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports a hook that is not registered in settings.json", () =>
  withRoot((dir) => {
    fs.mkdirSync(path.join(dir, ".claude", "hooks"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".claude", "settings.json"),
      JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ type: "command", command: '"${CLAUDE_PROJECT_DIR}/.claude/hooks/evidence-guard.sh" auto' }] }] } })
    );
    const r = gate(dir, "doctor");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /block-destructive\.sh is not registered/);
    assert.match(r.stderr, /read-tracker\.sh is not registered/);
  }));

test("doctor reports a registered hook that is missing on disk", () =>
  withRoot((dir) => {
    fs.mkdirSync(path.join(dir, ".claude", "hooks"), { recursive: true });
    const hook = (n) => ({ hooks: [{ type: "command", command: `"\${CLAUDE_PROJECT_DIR}/.claude/hooks/${n}"` }] });
    fs.writeFileSync(
      path.join(dir, ".claude", "settings.json"),
      JSON.stringify({ hooks: { PreToolUse: [hook("evidence-guard.sh"), hook("block-destructive.sh")], PostToolUse: [hook("read-tracker.sh")] } })
    );
    const r = gate(dir, "doctor");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /missing or not executable/);
  }));

test("attestation errors: invalid JSON, missing argv, wrong schema, a pin that is not an array", () => {
  const dir = root();
  try {
    fs.mkdirSync(path.join(dir, "docs", "attestations"), { recursive: true });
    const file = path.join(dir, "docs", "attestations", "phase-1.json");

    fs.writeFileSync(file, "{ nope");
    let r = gate(dir, "verify-attestation", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /invalid JSON/);

    fs.writeFileSync(file, JSON.stringify({ schema: 1, phase: "1", tree: "x" }));
    r = gate(dir, "verify-attestation", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /argv is missing/);

    fs.writeFileSync(file, JSON.stringify({ schema: 99, phase: "1", tree: "x", argv: [NODE, "-e", "0"] }));
    r = gate(dir, "verify-attestation", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /schema or phase mismatch/);

    fs.writeFileSync(file, JSON.stringify({ schema: 1, phase: "1", tree: "x", argv: [NODE, "-e", "0"] }));
    fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude", "required-test-command.json"), JSON.stringify({ cmd: "npm test" }));
    r = gate(dir, "verify-attestation", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /non-empty JSON array of strings/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
