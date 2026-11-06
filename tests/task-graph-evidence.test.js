"use strict";
// P5: task-graph --evidence link mode — a PASS/UNKNOWN task declaring an optional `gate`
// (phase id) must be backed by a PASS compound step in that phase's phase-gate evidence.
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
function evidenceRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tg-ev-"));
  fs.writeFileSync(path.join(root, "phase-1-compound.json"), JSON.stringify({ schema: 1, phase: "1", step: "compound", status: "PASS", artifacts: [], recorded_at: new Date().toISOString() }));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("gate field only (no evidence mode) keeps declarative behavior", () => {
  const r = analyze(taskGraph());
  assert.equal(r.verdict, "PASS");
});

test("evidence mode: PASS task requires PASS compound evidence", (t) => {
  const r = analyze(taskGraph(), { evidenceRoot: evidenceRoot(t) });
  assert.equal(r.verdict, "PASS", JSON.stringify(r.errors));
});

test("evidence mode: missing compound evidence fails the link", (t) => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "tg-ev-empty-"));
  t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
  const r = analyze(taskGraph(), { evidenceRoot: empty });
  assert.equal(r.verdict, "FAIL");
  assert.match(JSON.stringify(r.errors), /no PASS compound evidence/);
});

test("evidence mode: FAIL or invalid JSON compound evidence is not PASS", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tg-ev-bad-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const content of [JSON.stringify({ status: "FAIL" }), "{not json"]) {
    fs.writeFileSync(path.join(root, "phase-1-compound.json"), content);
    const r = analyze(taskGraph(), { evidenceRoot: root });
    assert.equal(r.verdict, "FAIL", "must be FAIL, not PASS");
  }
});

test("CLI: --evidence DIR INPUT.json exit 0 on linked PASS, 1 when absent", (t) => {
  const root = evidenceRoot(t);
  const good = path.join(root, "good.json");
  fs.writeFileSync(good, JSON.stringify(taskGraph()));
  let r = spawnSync(process.execPath, [CLI, "--evidence", root, good], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "tg-ev-cli-"));
  t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
  fs.writeFileSync(path.join(empty, "g.json"), JSON.stringify(taskGraph()));
  r = spawnSync(process.execPath, [CLI, "--evidence", empty, path.join(empty, "g.json")], { encoding: "utf8" });
  assert.equal(r.status, 1);
});
