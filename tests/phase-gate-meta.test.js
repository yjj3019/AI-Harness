"use strict";
// P1 evidence-schema extension: `record` accepts repeatable --meta key=value pairs that are
// stored under `meta` in the evidence file (policy/skill version, retries, elapsed time...).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function sandbox(t) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "gate-meta-"));
  const root = path.join(sandbox, "repo");
  const evidence = path.join(root, ".phase-evidence");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Meta\n");
  fs.writeFileSync(path.join(evidence, "report"), "report\n");
  const gate = (args) => spawnSync(process.execPath, [GATE, ...args], {
    cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root }, encoding: "utf8", timeout: 30000,
  });
  return { root, evidence, gate, cleanup: () => fs.rmSync(sandbox, { recursive: true, force: true }) };
}

test("record stores repeatable --meta pairs and omits meta when absent", (t) => {
  const { root, evidence, gate, cleanup } = sandbox();
  t.after(cleanup);
  const evFile = path.join(evidence, "phase-1-coding.json");

  let r = gate(["record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report",
    "--meta", "policy=v2.1", "--meta", "retries=2", "--meta", "elapsed_ms=43100"]);
  assert.equal(r.status, 0, r.stderr);
  const withMeta = JSON.parse(fs.readFileSync(evFile, "utf8"));
  assert.equal(withMeta.meta.policy, "v2.1");
  assert.equal(withMeta.meta.retries, "2");
  assert.equal(withMeta.meta.elapsed_ms, "43100");

  fs.rmSync(evFile, { force: true });
  r = gate(["record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal("meta" in JSON.parse(fs.readFileSync(evFile, "utf8")), false, "no meta key when none given");

  assert.ok(path.relative(root, evFile), "evidence stays inside the sandbox root");
});

test("a --meta flag without key=value is a usage error (fail-closed)", (t) => {
  const { gate, cleanup } = sandbox();
  t.after(cleanup);
  const r = gate(["record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report", "--meta"]);
  assert.equal(r.status, 1, "bare --meta must be rejected (usage error)");
  assert.match(r.stderr + r.stdout, /usage/i);
});
