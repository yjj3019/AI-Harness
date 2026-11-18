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

test("dashboard distinguishes missing, invalid and unverified attestations and updates after deletion", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-status-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "docs", "attestations"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "# Phases\n\n### Phase x: Title: detail\n\n### Phase y-no-colon\n\n~~~md\n### Phase sample: Example\n~~~\n");
  fs.writeFileSync(path.join(root, "docs", "attestations", "phase-x.json"), "{}\n");
  fs.writeFileSync(path.join(root, "docs", "attestations", "phase-orphan.json"),
    JSON.stringify({ schema: 1, phase: "orphan", tree: "a".repeat(64), argv: ["node"] }));
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "dashboard", "status.json"), "utf8")), [
    { id: "x", title: "Title: detail", attestation: "invalid" },
    { id: "y-no-colon", title: "", attestation: "missing" },
    { id: "orphan", title: "(attestation only)", attestation: "unverified" },
  ]);
  fs.unlinkSync(path.join(root, "docs", "attestations", "phase-x.json"));
  const after = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
  assert.equal(after.status, 0, after.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "dashboard", "status.json"), "utf8"))[0].attestation, "missing");
  assert.deepEqual(fs.readdirSync(path.join(root, "dashboard")), ["status.json"], "no temp file may remain");
});

test("skill catalog drops deleted inputs without a forced rebuild", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-catalog-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const script = path.join(root, "scripts/skill-catalog/generate.js");
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.mkdirSync(path.join(root, "docs"));
  fs.copyFileSync(path.resolve(__dirname, "../scripts/skill-catalog/generate.js"), script);
  for (const name of ["retained", "removed"]) {
    const dir = path.join(root, "skills", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), `---\r\nname: ${name}\r\ndescription: Description\r\n---\r\n`);
  }
  const run = () => {
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return fs.readFileSync(path.join(root, "docs/skill-catalog.md"), "utf8");
  };
  assert.match(run(), /\| removed \| Description/);
  fs.unlinkSync(path.join(root, "skills/removed/SKILL.md"));
  assert.doesNotMatch(run(), /\| removed \|/);
});

test("required phase attestations need both strict flags for verification pending", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-strict-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".github"));
  fs.mkdirSync(path.join(root, "docs/attestations"), { recursive: true });
  fs.writeFileSync(path.join(root, ".github/required-phases.json"), '["required"]\n');
  fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase required: Strict\n### Phase optional: Legacy\n");
  const att = { schema: 1, phase: "required", tree: "a".repeat(64), argv: ["node"], require_test_summary: true };
  const file = path.join(root, "docs/attestations/phase-required.json");
  fs.writeFileSync(path.join(root, "docs/attestations/phase-optional.json"), JSON.stringify({ ...att, phase: "optional" }));
  const status = () => {
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(fs.readFileSync(path.join(root, "dashboard/status.json"), "utf8")).map(row => row.attestation);
  };
  fs.writeFileSync(file, JSON.stringify(att));
  assert.deepEqual(status(), ["invalid", "unverified"]);
  fs.writeFileSync(file, JSON.stringify({ ...att, require_read_proof: true, require_test_summary: "true" }));
  assert.deepEqual(status(), ["invalid", "unverified"]);
  fs.writeFileSync(file, JSON.stringify({ ...att, require_read_proof: true }));
  assert.deepEqual(status(), ["unverified", "unverified"]);
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
