"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const GATE = path.resolve(__dirname, "..", ".claude", "workflows", "phase-gate.js");
const NODE = process.execPath;

const PHASES_MD = [
  "# PHASES",
  "",
  "```markdown",
  "### Phase N: [Title]",
  "```",
  "",
  "### Phase 1: Demo",
  "- [ ] thing",
  "",
  "### Phase 2: Other",
  "- [ ] other",
  "",
].join("\n");

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phase-gate-"));
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), PHASES_MD);
  return root;
}

function gate(root, ...args) {
  return spawnSync(NODE, [GATE, ...args], {
    env: { ...process.env, PHASE_GATE_ROOT: root },
    encoding: "utf8",
  });
}

function report(root, name, text = "verdict text") {
  fs.mkdirSync(path.join(root, ".phase-evidence"), { recursive: true });
  const rel = `.phase-evidence/${name}`;
  fs.writeFileSync(path.join(root, rel), text);
  return rel;
}

function recordPass(root, phase, step) {
  const r = gate(root, "record", phase, step, "--status", "PASS", "--report", report(root, `${phase}-${step}.md`));
  assert.equal(r.status, 0, r.stderr);
}

function runTest(root, phase, code = 0) {
  return gate(root, "run", phase, "test", "--", NODE, "-e", `console.log("suite"); process.exit(${code})`);
}

function fullChain(root, phase = "1") {
  recordPass(root, phase, "coding");
  const t = runTest(root, phase, 0);
  assert.equal(t.status, 0, t.stderr);
  for (const step of ["verify", "review", "compound"]) recordPass(root, phase, step);
}

function withRoot(fn) {
  const root = makeRoot();
  try {
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("list ignores templates inside code fences", () =>
  withRoot((root) => {
    const r = gate(root, "list");
    assert.equal(r.status, 0);
    assert.deepEqual(r.stdout.trim().split("\n"), ["1", "2"]);
  }));

test("invalid and path-like phase ids are rejected", () =>
  withRoot((root) => {
    assert.equal(gate(root, "check", "N").status, 1);
    assert.equal(gate(root, "check", "../x").status, 1);
    assert.equal(gate(root, "check", "99").status, 1);
  }));

test("check fails when there is no evidence", () =>
  withRoot((root) => {
    assert.equal(gate(root, "check", "1").status, 2);
  }));

test("hand-written PASS files are rejected", () =>
  withRoot((root) => {
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    for (const step of ["coding", "test", "verify", "review", "compound"]) {
      fs.writeFileSync(path.join(root, ".phase-evidence", `phase-1-${step}.json`), '{"status":"PASS"}');
    }
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Hand-written evidence is rejected/);
  }));

test("a full recorded chain passes", () =>
  withRoot((root) => {
    fullChain(root);
    const r = gate(root, "check", "1");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /COMPLETED/);
  }));

test("a step cannot be recorded before the previous step passes", () =>
  withRoot((root) => {
    recordPass(root, "1", "coding");
    const r = gate(root, "record", "1", "verify", "--status", "PASS", "--report", report(root, "v.md"));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /'test' has no valid evidence/);
  }));

test("run records the real exit code and a failing test blocks later steps", () =>
  withRoot((root) => {
    recordPass(root, "1", "coding");
    const t = runTest(root, "1", 3);
    assert.equal(t.status, 2);
    const ev = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(ev.status, "FAIL");
    assert.equal(ev.exit_code, 3);
    const v = gate(root, "record", "1", "verify", "--status", "PASS", "--report", report(root, "v.md"));
    assert.equal(v.status, 2);
    assert.match(v.stderr, /not PASS/);
  }));

test("run records a failure when the command cannot start", () =>
  withRoot((root) => {
    recordPass(root, "1", "coding");
    const t = gate(root, "run", "1", "test", "--", "definitely-not-a-real-command-xyz");
    assert.equal(t.status, 2);
    const ev = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(ev.status, "FAIL");
    assert.equal(ev.exit_code, -1);
  }));

test("editing a report after it was recorded fails the check", () =>
  withRoot((root) => {
    fullChain(root);
    fs.writeFileSync(path.join(root, ".phase-evidence", "1-verify.md"), "edited after the fact");
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /artifact changed after it was recorded/);
  }));

test("editing an evidence file breaks the hash chain", () =>
  withRoot((root) => {
    fullChain(root);
    const f = path.join(root, ".phase-evidence", "phase-1-coding.json");
    fs.writeFileSync(f, fs.readFileSync(f, "utf8") + "\n");
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /chain broken/);
  }));

test("recording a step clears the steps after it", () =>
  withRoot((root) => {
    fullChain(root);
    recordPass(root, "1", "coding");
    for (const step of ["test", "verify", "review", "compound"]) {
      assert.equal(fs.existsSync(path.join(root, ".phase-evidence", `phase-1-${step}.json`)), false, step);
    }
    assert.equal(gate(root, "check", "1").status, 2);
  }));

test("reports outside .phase-evidence/ are rejected", () =>
  withRoot((root) => {
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    for (const p of ["docs/PHASES.md", "../outside.md", "/etc/hostname"]) {
      const r = gate(root, "record", "1", "coding", "--status", "PASS", "--report", p);
      assert.equal(r.status, 1, p);
    }
  }));

test("PASS needs a non-empty report", () =>
  withRoot((root) => {
    assert.equal(gate(root, "record", "1", "coding", "--status", "PASS").status, 1);
    const empty = report(root, "empty.md", "");
    assert.equal(gate(root, "record", "1", "coding", "--status", "PASS", "--report", empty).status, 1);
  }));

test("a FAIL record is allowed without a report and fails the check", () =>
  withRoot((root) => {
    assert.equal(gate(root, "record", "1", "coding", "--status", "FAIL").status, 0);
    assert.equal(gate(root, "check", "1").status, 2);
  }));

test("test is not accepted by record", () =>
  withRoot((root) => {
    assert.equal(gate(root, "record", "1", "test", "--status", "PASS", "--report", report(root, "t.md")).status, 1);
  }));
