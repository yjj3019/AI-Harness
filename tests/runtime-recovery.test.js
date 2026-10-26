"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");
const NODE = process.execPath;

function environment(root) {
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  return env;
}
function gate(root, ...args) {
  return spawnSync(NODE, [GATE, ...args], {
    cwd: root, encoding: "utf8", env: environment(root), timeout: 30000
  });
}
function readEvidence(root, step) {
  const p = path.join(root, ".phase-evidence", "phase-1-" + step + ".json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function report(root, step) {
  const p = path.join(root, ".phase-evidence", step + ".md");
  fs.writeFileSync(p, "Evidence for " + step + "\n");
  const r = gate(root, "record", "1", step, "--status", "PASS", "--report", ".phase-evidence/" + step + ".md");
  assert.equal(r.status, 0, r.stdout + r.stderr);
}
async function waitForFile(p, timeoutMs=8000) {
  const begin = Date.now();
  while (Date.now()-begin < timeoutMs) {
    if (fs.existsSync(p)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for " + p);
}
async function waitChild(child, timeoutMs=9000) {
  if (child.exitCode !== null) return child.exitCode;
  return await Promise.race([
    new Promise((resolve,reject) => { child.once("close", resolve); child.once("error", reject); }),
    new Promise((_,reject) => setTimeout(() => reject(new Error("runner did not stop")), timeoutMs))
  ]);
}
test("actual worker termination leaves FAIL; a new Phase gate process can recover explicitly", {
  // Node maps SIGKILL to forceful process termination on Windows; this exercises that host path,
  // not POSIX signal semantics. The effect and manual recovery assertions apply on either host.
  timeout: 120000
}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-recovery-"));
  let child, workerPid;
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Recovery probe\n");
    fs.writeFileSync(path.join(root, ".gitignore"), ".phase-evidence/\n");
    assert.equal(spawnSync("git", ["init", "-q"], {cwd:root}).status, 0);
    report(root, "coding");
    const worker = path.join(root, ".phase-evidence", "hang.cjs");
    fs.writeFileSync(worker, [
      'const fs = require("node:fs");',
      'fs.writeFileSync(".phase-evidence/worker.pid", String(process.pid));',
      'fs.appendFileSync(".phase-evidence/side-effect-probe", "one-attempt\\n");',
      'setInterval(() => {}, 1000);',
      ''
    ].join("\n"));
    child=spawn(NODE, [GATE, "run", "1", "test", "--require-test-summary", "--",
      NODE, ".phase-evidence/hang.cjs"],
      { cwd: root, env: environment(root), stdio: "ignore" });
    await waitForFile(path.join(root, ".phase-evidence", "worker.pid"));
    workerPid=Number(fs.readFileSync(path.join(root, ".phase-evidence", "worker.pid"), "utf8"));
    assert.ok(Number.isInteger(workerPid) && workerPid > 0);
    process.kill(workerPid, "SIGKILL");
    await waitChild(child);
    child = null;
    const failed=readEvidence(root, "test");
    assert.equal(failed.status, "FAIL");
    assert.notEqual(failed.exit_code, 0);
    const blocked=gate(root, "check", "1");
    assert.equal(blocked.status, 2, blocked.stdout + blocked.stderr);
    assert.equal(fs.readFileSync(path.join(root, ".phase-evidence", "side-effect-probe"), "utf8").trim(), "one-attempt");
    // Explicit operator-triggered recovery, NOT automatic replay of unknown external work.
    const suite=path.join(root, ".phase-evidence", "resume.test.cjs");
    fs.writeFileSync(suite,
      'const t=require("node:test");const a=require("node:assert/strict");t("recover",()=>a.equal(3*3,9));\n');
    const retried=gate(root, "run", "1", "test", "--require-test-summary", "--",
      NODE, "--test", ".phase-evidence/resume.test.cjs");
    assert.equal(retried.status, 0, retried.stdout + retried.stderr);
    assert.equal(readEvidence(root, "test").test_summary.passed, 1);
    for (const step of ["verify", "review", "compound"]) report(root, step);
    assert.equal(gate(root, "check", "1").status, 0);
    assert.equal(gate(root, "attest", "1").status, 0);
    const replay=gate(root, "verify-attestation", "1");
    assert.equal(replay.status, 0, replay.stdout + replay.stderr);
    assert.equal(fs.readFileSync(path.join(root, ".phase-evidence", "side-effect-probe"), "utf8").trim(), "one-attempt");
  } finally {
    if (workerPid) { try { process.kill(workerPid, "SIGKILL"); } catch {} }
    if (child) { try { child.kill("SIGKILL"); } catch {} }
    fs.rmSync(root, {recursive:true, force:true});
  }
});
