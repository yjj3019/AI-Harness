"use strict";
// P5: task-graph --evidence invokes the canonical phase-gate checker for an optional task gate.
// It validates phase evidence, not the evidence writer's identity or host authorization.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { analyze } = require("../scripts/task-graph.js");

const CLI = path.resolve(__dirname, "../scripts/task-graph.js");

function taskGraph() {
  return {
    version: 1,
    tasks: [
      { id: "a", dependencies: [], role: "phase", readScopes: [], writeScopes: [], retryCap: 2, attempts: 1, status: "PASS", effect: "NONE", gate: "1" },
    ],
  };
}
function installPhaseGate(root) {
  const workflow = path.join(root, ".claude", "workflows");
  fs.mkdirSync(workflow, { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, "../.claude/workflows/phase-gate.js"), path.join(workflow, "phase-gate.js"));
  fs.copyFileSync(path.resolve(__dirname, "../.claude/workflows/test-summary.js"), path.join(workflow, "test-summary.js"));
  fs.copyFileSync(path.resolve(__dirname, "../scripts/context-contract.js"), path.join(root, "scripts/context-contract.js"));
  fs.copyFileSync(path.resolve(__dirname, "../scripts/phase-definition.js"), path.join(root, "scripts/phase-definition.js"));
}
function evidenceRoot(t) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "tg-ev-"));
  const root = path.join(sandbox, "repo");
  const evidenceRoot = path.join(root, ".phase-evidence");
  fs.mkdirSync(path.join(evidenceRoot, "artifacts"), { recursive: true });
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Evidence link\n");
  installPhaseGate(root);
  const gate = (...args) => spawnSync(process.execPath, [path.resolve(__dirname, "../.claude/workflows/phase-gate.js"), ...args], {
    cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root }, encoding: "utf8", timeout: 120000,
  });
  const record = (step, text) => {
    const artifact = `artifacts/${step}.md`;
    fs.writeFileSync(path.join(evidenceRoot, artifact), text);
    const result = gate("record", "1", step, "--status", "PASS", "--report", `.phase-evidence/${artifact}`);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  record("coding", "coding report\n");
  const testLog = path.join(evidenceRoot, "artifacts", "strict-test.tap");
  fs.writeFileSync(testLog, "TAP version 13\n# tests 1\n# pass 1\n# fail 0\n# skipped 0\n");
  const testRun = gate("run", "1", "test", "--require-test-summary", "--", process.execPath, "-e", "process.stdout.write(require('fs').readFileSync(process.argv[1],'utf8'))", testLog);
  assert.equal(testRun.status, 0, testRun.stdout + testRun.stderr);
  record("verify", "verify report\n");
  record("review", "review report\n");
  record("compound", "compound report\n");
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
  return { evidence: evidenceRoot, root };
}

test("gate field only (no evidence mode) keeps declarative behavior", () => {
  const r = analyze(taskGraph());
  assert.equal(r.verdict, "PASS");
});

test("evidence mode: PASS task requires complete canonical phase-gate evidence", (t) => {
  const fixture = evidenceRoot(t);
  const r = analyze(taskGraph(), { evidenceRoot: fixture.evidence, root: fixture.root });
  assert.equal(r.verdict, "PASS", JSON.stringify(r.errors));
});

test("evidence mode: missing chain fails closed", (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "tg-ev-empty-"));
  const root = path.join(sandbox, "repo");
  const empty = path.join(root, ".phase-evidence");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(empty, { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Evidence link\n");
  installPhaseGate(root);
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
  const r = analyze(taskGraph(), { evidenceRoot: empty, root });
  assert.equal(r.verdict, "FAIL");
  assert.match(JSON.stringify(r.errors), /phase-gate check failed/);
});

test("evidence mode rejects a symlinked phase-gate checker or parent directory", t => {
  const fixture = evidenceRoot(t);
  const outside = path.join(path.dirname(fixture.root), "untrusted-phase-gate.js");
  fs.writeFileSync(outside, "process.exit(0)\n");
  t.after(() => fs.rmSync(outside, { force: true }));
  try {
    const gatePath = path.join(fixture.root, ".claude", "workflows", "phase-gate.js");
    fs.unlinkSync(gatePath);
    fs.symlinkSync(outside, gatePath);
    let result = analyze(taskGraph(), { evidenceRoot: fixture.evidence, root: fixture.root });
    assert.equal(result.verdict, "FAIL");
    assert.match(JSON.stringify(result.errors), /non-symlink/);

    fs.unlinkSync(gatePath);
    const workflows = path.dirname(gatePath);
    fs.rmSync(workflows, { recursive: true, force: true });
    fs.symlinkSync(path.dirname(outside), workflows, "junction");
    result = analyze(taskGraph(), { evidenceRoot: fixture.evidence, root: fixture.root });
    assert.equal(result.verdict, "FAIL");
    assert.match(JSON.stringify(result.errors), /non-symlink directories/);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) return t.skip(`symlinks unavailable: ${error.code}`);
    throw error;
  }
});

test("evidence mode: failure and invalid evidence never produce PASS", (t) => {
  const fixture = evidenceRoot(t);
  fs.writeFileSync(path.join(fixture.evidence, "phase-1-review.json"), "{not json");
  const r = analyze(taskGraph(), { evidenceRoot: fixture.evidence, root: fixture.root });
  assert.equal(r.verdict, "FAIL");
  assert.match(JSON.stringify(r.errors), /phase-gate check failed/);
});

test("CLI: evidence mode validates linked phase; strict bound-tree is explicit", (t) => {
  const fixture = evidenceRoot(t);
  const graph = path.join(fixture.root, "tasks.json");
  fs.writeFileSync(graph, JSON.stringify(taskGraph()));
  let r = spawnSync(process.execPath, [CLI, "--evidence", fixture.evidence, graph], { cwd: fixture.root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  r = spawnSync(process.execPath, [CLI, "--evidence", fixture.evidence, "--require-bound-tree", graph], { cwd: fixture.root, encoding: "utf8" });
  assert.equal(r.status, 1, "fixture did not record bound tree; strict mode must reject it");
  r = spawnSync(process.execPath, [CLI, "--require-bound-tree", "--evidence", fixture.evidence, graph], { cwd: fixture.root, encoding: "utf8" });
  assert.equal(r.status, 2, "strict-bound-tree must follow --evidence");
});

test("evidence mode requires canonical project evidence root", (t) => {
  const fixture = evidenceRoot(t);
  const r = analyze(taskGraph(), { evidenceRoot: path.dirname(fixture.evidence), root: fixture.root });
  assert.equal(r.verdict, "FAIL");
  assert.match(JSON.stringify(r.errors), /project \.phase-evidence/);
});

test("gate spawn errors report startup failure instead of timeout", (t) => {
  const fixture = evidenceRoot(t);
  const graph = taskGraph();
  const realSpawn = require("node:child_process").spawnSync;
  const childProcess = require("node:child_process");
  const taskGraphModule = require("../scripts/task-graph.js");
  try {
    // Force ENOENT while keeping the project checker a valid regular file.
    childProcess.spawnSync = () => ({ error: Object.assign(new Error("missing"), { code: "ENOENT" }), status: null, signal: null });
    const result = taskGraphModule.analyze(graph, { evidenceRoot: fixture.evidence, root: fixture.root });
    assert.equal(result.verdict, "FAIL");
    assert.match(JSON.stringify(result.errors), /phase-gate could not start/);
    assert.doesNotMatch(JSON.stringify(result.errors), /timed out/);
  } finally { childProcess.spawnSync = realSpawn; }
});

test("gate timeout reports timeout separately from checker startup errors", (t) => {
  const root = evidenceRoot(t);
  const timedOut = analyze(taskGraph(), { evidenceRoot: root.evidence, root: root.root, timeoutMs: 1 });
  assert.equal(timedOut.verdict, "FAIL");
  assert.match(JSON.stringify(timedOut.errors), /phase-gate check timed out/);
  assert.doesNotMatch(JSON.stringify(timedOut.errors), /could not start/);
});

test("UNKNOWN task with absent gate evidence remains BLOCKED without forcing PASS gate verification", (t) => {
  const graph = taskGraph();
  graph.tasks[0].status = "UNKNOWN";
  graph.tasks[0].attempts = 0;
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "tg-ev-unknown-"));
  const root = path.join(sandbox, "repo");
  const evidence = path.join(root, ".phase-evidence");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Evidence link\n");
  installPhaseGate(root);
  try {
    const r = analyze(graph, { evidenceRoot: evidence, root });
    assert.equal(r.verdict, "PASS", JSON.stringify(r.errors));
    assert.equal(r.nodes[0].state, "BLOCKED");
  } finally { fs.rmSync(sandbox, { recursive: true, force: true }); }
});
