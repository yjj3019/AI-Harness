"use strict";
// dashboard-status.js: phase-id parsing must mirror phase-gate.js (a colon-less heading is still a
// valid phase) and the write must be atomic (a crash mid-write never leaves a truncated status.json).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.resolve(__dirname, "../scripts/dashboard-status.js");

test("colon-less and colon-headed phases both appear; attestation-only phases are added", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-status-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "docs", "attestations"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "# Phases\n\n### Phase x: Titled\n- [ ] a\n\n### Phase y-no-colon\n- [ ] b\n\n### Phase <id>: Template\n- [ ] c\n");
  fs.writeFileSync(path.join(root, "docs", "attestations", "phase-x.json"), "{}\n");
  fs.writeFileSync(path.join(root, "docs", "attestations", "phase-orphan.json"), "{}\n");
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "dashboard", "status.json"), "utf8")), [
    { id: "x", title: "Titled", evidence: 5, total: 5 },
    { id: "y-no-colon", title: "", evidence: 0, total: 5 },
    { id: "orphan", title: "(attestation only)", evidence: 5, total: 5 },
  ]);
  assert.deepEqual(fs.readdirSync(path.join(root, "dashboard")), ["status.json"], "no temp file may remain");
});

test("the write is atomic: the old status.json is fully replaced, never a leftover temp", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-atomic-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "dashboard"), { recursive: true });
  fs.writeFileSync(path.join(root, "dashboard", "status.json"), "{ stale }\n");
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "dashboard", "status.json"), "utf8")), []);
  assert.deepEqual(fs.readdirSync(path.join(root, "dashboard")), ["status.json"], "no temp file may remain");
});
