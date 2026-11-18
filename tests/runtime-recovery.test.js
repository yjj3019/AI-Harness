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
    cwd: root, encoding: "utf8", env: environment(root), timeout: 90000
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
  assert.equal(r.status, 0, resultMessage(r));
}
async function waitForFile(p, timeoutMs=30000) {
  const begin = Date.now();
  while (Date.now()-begin < timeoutMs) {
    if (fs.existsSync(p)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for " + p);
}
async function waitChild(child, timeoutMs=30000) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error("runner did not stop")); }, timeoutMs);
    function cleanup() { clearTimeout(timer); child.off("close", closed); child.off("error", failed); }
    function closed() { cleanup(); resolve(); }
    function failed(error) { cleanup(); reject(error); }
    child.once("close", closed); child.once("error", failed);
  });
}
async function removeFixture(root) {
  // Windows antivirus and subprocess handles may temporarily hold files open.
  await fs.promises.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
function resultMessage(r) {
  return `status=${r.status} signal=${r.signal} error=${r.error || "none"}\n${r.stdout || ""}${r.stderr || ""}`;
}
test("actual worker termination leaves FAIL; a new Phase gate process can recover explicitly", {
  // The worker self-signals after an operator marker; Windows maps SIGKILL to forceful termination.
  // This does not certify externally signalled termination, POSIX semantics or automatic recovery.
  timeout: 600000
}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-recovery-"));
  let child, failure;
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Recovery probe\n");
    fs.writeFileSync(path.join(root, ".gitignore"), ".phase-evidence/\n");
    const init = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8", timeout: 90000 });
    assert.equal(init.status, 0, resultMessage(init));
    report(root, "coding");
    const worker = path.join(root, ".phase-evidence", "hang.cjs");
    fs.writeFileSync(worker, [
      'const fs = require("node:fs");',
      'fs.appendFileSync(".phase-evidence/side-effect-probe", "one-attempt\\n");',
      'fs.writeFileSync(".phase-evidence/ready.tmp", "ready");',
      'fs.renameSync(".phase-evidence/ready.tmp", ".phase-evidence/ready");',
      'const deadline = Date.now() + 120000;',
      'setInterval(() => { if (fs.existsSync(".phase-evidence/terminate-worker") || Date.now() >= deadline) process.kill(process.pid, "SIGKILL"); }, 50);',
      ''
    ].join("\n"));
    child=spawn(NODE, [GATE, "run", "1", "test", "--require-test-summary", "--",
      NODE, ".phase-evidence/hang.cjs"],
      { cwd: root, env: environment(root), stdio: "ignore" });
    // Attach an error handler immediately; never signal an unowned numeric PID.
    let spawnError;
    child.on("error", error => { spawnError = error; });
    await waitForFile(path.join(root, ".phase-evidence", "ready"));
    if (spawnError) throw spawnError;
    assert.equal(child.exitCode, null, "gate exited before termination request");
    assert.equal(child.signalCode, null, "gate was signalled before termination request");
    const competing = gate(root, "run", "1", "test", "--", NODE, "-e", "");
    assert.equal(competing.status, 2, resultMessage(competing));
    assert.match(competing.stderr, /already in use/);
    const racingRecord = gate(root, "record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/coding.md");
    assert.equal(racingRecord.status, 2, resultMessage(racingRecord));
    assert.match(racingRecord.stderr, /already in use/);
    // Ask the live worker to terminate itself; no stale external PID can be signalled.
    fs.writeFileSync(path.join(root, ".phase-evidence", "terminate-worker"), "terminate\n");
    await waitChild(child);
    assert.equal(child.exitCode, 2, "gate must report test failure");
    assert.equal(child.signalCode, null, "gate itself must not be signalled");
    child = null;
    const failed=readEvidence(root, "test");
    assert.equal(failed.status, "FAIL");
    // POSIX reports signal termination as null/-1; Windows can report exit 1.
    assert.ok(Number.isInteger(failed.exit_code) && failed.exit_code !== 0, "gate must record a numeric nonzero worker exit");
    const blocked=gate(root, "check", "1");
    assert.equal(blocked.status, 2, resultMessage(blocked));
    assert.equal(fs.readFileSync(path.join(root, ".phase-evidence", "side-effect-probe"), "utf8").trim(), "one-attempt");
    // Explicit operator-triggered recovery, NOT automatic replay of unknown external work.
    const suite=path.join(root, ".phase-evidence", "resume.test.cjs");
    fs.writeFileSync(suite,
      'const t=require("node:test");const a=require("node:assert/strict");t("recover",()=>a.equal(3*3,9));\n');
    const retried=gate(root, "run", "1", "test", "--require-test-summary", "--",
      NODE, "--test", ".phase-evidence/resume.test.cjs");
    assert.equal(retried.status, 0, resultMessage(retried));
    assert.equal(readEvidence(root, "test").test_summary.passed, 1);
    for (const step of ["verify", "review", "compound"]) report(root, step);
    const checked = gate(root, "check", "1");
    assert.equal(checked.status, 0, resultMessage(checked));
    const attested = gate(root, "attest", "1");
    assert.equal(attested.status, 0, resultMessage(attested));
    const replay=gate(root, "verify-attestation", "1");
    assert.equal(replay.status, 0, resultMessage(replay));
    assert.equal(fs.readFileSync(path.join(root, ".phase-evidence", "side-effect-probe"), "utf8").trim(), "one-attempt");
  } catch (error) {
    failure = error;
  } finally {
    // Do not signal a recorded worker PID during cleanup: it may already have exited
    // and been reused. Kill only the tracked live gate process if still running.
    if (child && child.exitCode === null && child.signalCode === null) {
      try {
        // Wake a possibly started worker before stopping the gate. Its own deadline is a fallback.
        fs.writeFileSync(path.join(root, ".phase-evidence", "terminate-worker"), "terminate\n");
        try { await waitChild(child, 30000); } catch { child.kill("SIGKILL"); await waitChild(child); }
      } catch (error) {
        if (!failure) failure = error;
        else console.error("Recovery fixture gate cleanup failed:", error);
      }
    }
    try { await removeFixture(root); } catch (error) {
      if (!failure) failure = error;
      else console.error("Recovery fixture removal failed:", error);
    }
  }
  if (failure) throw failure;
});

test("a hung test command is bounded by PHASE_GATE_TEST_TIMEOUT_MS and recorded as FAIL", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-timeout-"));
  let failure;
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Timeout probe\n");
    report(root, "coding");
    const sleep = process.platform === "win32"
      ? [process.execPath, "-e", "setTimeout(()=>{}, 30000)"]
      : [process.execPath, "-e", "setTimeout(()=>process.exit(0), 30000)"];
    const env = { ...process.env, PHASE_GATE_ROOT: root, PHASE_GATE_TEST_TIMEOUT_MS: "2500" };
    const result = spawnSync(NODE, [GATE, "run", "1", "test", "--", ...sleep], {
      cwd: root, encoding: "utf8", env, timeout: 90000,
    });
    assert.equal(result.status, 2, resultMessage(result));
    assert.match(result.stdout + result.stderr, /TIMEOUT after 2500ms/);
    const evidence = readEvidence(root, "test");
    assert.equal(evidence.status, "FAIL");
    assert.equal(evidence.test_summary.ok, null, "a killed run claims no passing summary");
    assert.equal(evidence.exit_code, -1, "a timeout records -1, and worst of all a FAIL");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failure) throw failure;
});

test("timeout stops an ordinary child and its grandchild", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-tree-timeout-"));
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Timeout probe\n");
    report(root, "coding");
    const ready = path.join(root, ".phase-evidence", "ready");
    const grandchildReady = path.join(root, ".phase-evidence", "grandchild-ready");
    const marker = path.join(root, ".phase-evidence", "grandchild-survived");
    const grandchild = `require('fs').writeFileSync(${JSON.stringify(grandchildReady)}, 'ready'); setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'alive'), 12000)`;
    const parent = `const cp=require('child_process'); cp.spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore'}).unref(); require('fs').writeFileSync(${JSON.stringify(ready)},'ready'); setTimeout(()=>{},30000)`;
    const env = { ...process.env, PHASE_GATE_ROOT: root, PHASE_GATE_TEST_TIMEOUT_MS: "6000" };
    const result = spawnSync(NODE, [GATE, "run", "1", "test", "--", NODE, "-e", parent], { cwd: root, env, encoding: "utf8", timeout: 90000 });
    assert.equal(result.status, 2, resultMessage(result));
    assert.match(result.stdout + result.stderr, /TIMEOUT after 6000ms/);
    assert.equal(fs.existsSync(ready), true, "the child must actually create the grandchild");
    assert.equal(fs.existsSync(grandchildReady), true, "the grandchild must actually start before timeout");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 8000);
    assert.equal(fs.existsSync(marker), false, "ordinary grandchild must not survive the timeout");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("invalid test timeout settings fail before gate execution", () => {
  for (const value of ["", "0", "-1", "1.5", "86400001", "NaN"]) {
    const result = spawnSync(NODE, [GATE, "list"], {
      env: { ...process.env, PHASE_GATE_TEST_TIMEOUT_MS: value }, encoding: "utf8",
    });
    assert.equal(result.status, 1, resultMessage(result));
    assert.match(result.stderr, /PHASE_GATE_TEST_TIMEOUT_MS must be an integer/);
  }
});

test("oversized output yields a bounded FAIL record and releases the phase lock", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-output-limit-"));
  t.after(() => removeFixture(root));
  fs.mkdirSync(path.join(root, "docs"));
  fs.mkdirSync(path.join(root, ".phase-evidence"));
  fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Output limit\n");
  report(root, "coding");
  const result = spawnSync(NODE, [GATE, "run", "1", "test", "--", NODE, "-e", "process.stdout.write('x'.repeat(32768))"], {
    cwd: root, encoding: "utf8", env: { ...environment(root), PHASE_GATE_MAX_OUTPUT_BYTES: "1024" }, timeout: 90000,
  });
  assert.equal(result.status, 2, resultMessage(result));
  assert.match(readEvidence(root, "test").test_summary.reason, /exceeded 1024 bytes/);
  assert.equal(readEvidence(root, "test").status, "FAIL");
  const log = fs.readFileSync(path.join(root, ".phase-evidence/phase-1-test.log"), "utf8");
  assert.match(log, /^x{1024}\n\[phase-gate\] status: OUTPUT LIMIT/);
  assert.equal(fs.existsSync(path.join(root, ".phase-evidence/phase-1.lock")), false);
});
