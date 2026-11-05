"use strict";
/**
 * End-to-end simulation of one Phase, the loop the /phase-harness command drives in a real session:
 * the orchestrator records evidence through phase-gate.js, a failing test forces a retry, and the
 * real read-tracker hook supplies the read proof the gate demands before a verify PASS.
 *
 * The unit tests in phase-gate.test.js cover the gate's rules one by one. This file covers the
 * lifecycle those rules are wired into, so a regression in the wiring fails CI as well.
 *
 * HARNESS_BASH selects the shell used to exercise the hooks (default: bash on PATH). Set it to the
 * Git Bash binary on Windows, where `bash` on PATH may be WSL and not the shell Claude Code uses.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { skipReason } = require("./helpers/bash-probe");

const BASH_SKIP = skipReason();

const REPO = path.resolve(__dirname, "..");
const GATE = path.join(REPO, ".claude", "workflows", "phase-gate.js");
const READ_HOOK = path.join(REPO, ".claude", "hooks", "read-tracker.sh");
const NODE = process.execPath;
const BASH = process.env.HARNESS_BASH || "bash";

const PHASES_MD = ["# PHASES", "", "### Phase 1: Demo", "- [ ] a", "", "### Phase 2: Next", "- [ ] b", ""].join("\n");

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-e2e-"));
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), PHASES_MD);
  return root;
}

function git(root, ...args) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
}

function initRepo(root) {
  git(root, "init", "-q");
  fs.writeFileSync(path.join(root, ".gitignore"), ".phase-evidence/\n");
  fs.writeFileSync(path.join(root, "app.js"), "module.exports = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
}

function gate(root, ...args) {
  return spawnSync(NODE, [GATE, ...args], { env: { ...process.env, PHASE_GATE_ROOT: root }, encoding: "utf8" });
}

function report(root, name, text = "agent report") {
  fs.mkdirSync(path.join(root, ".phase-evidence"), { recursive: true });
  const rel = `.phase-evidence/${name}`;
  fs.writeFileSync(path.join(root, rel), text);
  return rel;
}

function record(root, step, status = "PASS") {
  const args = ["record", "1", step, "--status", status];
  if (status === "PASS") args.push("--report", report(root, `1-${step}.md`));
  return gate(root, ...args);
}

function runTests(root, code = 0) {
  return gate(root, "run", "1", "test", "--", NODE, "-e", `console.log("suite"); process.exit(${code})`);
}

function bashHasJq() {
  const r = spawnSync(BASH, ["-c", "command -v jq >/dev/null 2>&1 && echo yes"], { encoding: "utf8" });
  return !r.error && String(r.stdout).includes("yes");
}

function armReadTracking(root) {
  fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".claude", "settings.json"),
    JSON.stringify({ hooks: { PostToolUse: [{ matcher: "Read", hooks: [{ type: "command", command: "x/read-tracker.sh" }] }] } })
  );
}

// Simulates the verify subagent opening the test log: the real hook runs and writes the record.
function verifyReadsLog(root, filePath) {
  const payload = JSON.stringify({ tool_name: "Read", tool_input: { file_path: filePath }, agent_id: "sim", agent_type: "verify" });
  return spawnSync(BASH, [READ_HOOK], {
    cwd: root,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    input: payload,
    encoding: "utf8",
  });
}

test("simulated phase: five steps, gate, attestation and CI re-verification", { skip: BASH_SKIP }, () => {
  const root = project();
  try {
    initRepo(root);
    assert.equal(record(root, "coding").status, 0);
    assert.equal(runTests(root, 0).status, 0);
    for (const step of ["verify", "review", "compound"]) assert.equal(record(root, step).status, 0);

    const check = gate(root, "check", "1");
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /COMPLETED/);

    assert.equal(gate(root, "attest", "1").status, 0);
    const ci = gate(root, "verify-attestation", "1");
    assert.equal(ci.status, 0, ci.stderr);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("simulated phase: a failing test forces a retry that re-runs the whole chain", { skip: BASH_SKIP }, () => {
  const root = project();
  try {
    initRepo(root);
    assert.equal(record(root, "coding").status, 0);

    assert.equal(runTests(root, 3).status, 2);
    const ev = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(ev.exit_code, 3);
    // The gate must not move on while the test step is FAIL.
    assert.equal(record(root, "verify").status, 2);

    // Retry: a new coding record clears every later step, so test and verify run again.
    assert.equal(record(root, "coding").status, 0);
    for (const step of ["test", "verify", "review", "compound"]) {
      assert.equal(fs.existsSync(path.join(root, ".phase-evidence", `phase-1-${step}.json`)), false, step);
    }
    assert.equal(runTests(root, 0).status, 0);
    for (const step of ["verify", "review", "compound"]) assert.equal(record(root, step).status, 0);
    const check = gate(root, "check", "1");
    assert.equal(check.status, 0, check.stderr);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("simulated verify subagent: the real read-tracker hook unlocks verify PASS for relative and native paths", { skip: BASH_SKIP }, (t) => {
  if (!bashHasJq()) {
    t.skip("bash with jq is required to exercise the hook");
    return;
  }
  for (const style of ["relative", "native"]) {
    const root = project();
    try {
      initRepo(root);
      armReadTracking(root);
      assert.equal(record(root, "coding").status, 0);
      assert.equal(runTests(root, 0).status, 0);
      assert.equal(record(root, "verify").status, 2, "PASS before the log was opened must be refused");

      const abs = path.join(root, ".phase-evidence", "phase-1-test.log");
      const target = style === "native" ? abs : ".phase-evidence/phase-1-test.log";
      const hook = verifyReadsLog(root, target);
      assert.equal(hook.status, 0, hook.stderr);

      const verdict = record(root, "verify");
      assert.equal(verdict.status, 0, `${style}: ${verdict.stderr}`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});
