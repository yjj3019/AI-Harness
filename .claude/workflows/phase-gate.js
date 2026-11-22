#!/usr/bin/env node
"use strict";
/**
 * Phase gate: records and checks evidence for one Phase.
 *
 * This script does not call agents and does not retry. The /phase-harness
 * command orchestrates the loop (coding -> test -> verify -> review -> compound)
 * and uses this script to record evidence and to decide whether the Phase is done.
 *
 * Commands:
 *   list                                     List valid phase ids from docs/PHASES.md
 *   run <phase> test [--require-test-summary] [--require-bound-tree] -- <command...>  Run and record a test
 *   record <phase> <step> --status PASS|FAIL [--report <file>] [--require-read-proof]
 *                                            Record coding|verify|review|compound evidence
 *   check <phase> [--require-bound-tree]     Verify all five steps; exit 0 only if complete
 *   doctor                                   Check that the guards can run here (jq, sha256sum, realpath, git,
 *                                            hook registration, quoting, executable bits). Exit 2 on a problem
 *   attest <phase>                           After check passes, write docs/attestations/phase-<id>.json
 *                                            (code tree hash + test command) to be committed
 *   verify-attestation <phase> [-- <cmd...>] CI side: recompute the tree hash, re-run the attested
 *                                            test command itself, require exit 0. The attested command must
 *                                            equal -- <cmd...> or, if present, .claude/required-test-command.json
 *
 * Evidence (.phase-evidence/phase-<id>-<step>.json) holds the status, SHA-256 of its
 * report or log, and SHA-256 of the previous step's evidence file (a hash chain).
 * The test evidence also holds a hash of the code tree it ran against; check fails when
 * the code changed afterwards. Recording a step clears the steps after it.
 *
 * Exit codes:
 *   0  success (check: Phase complete; run: test passed)
 *   1  usage error or invalid input
 *   2  evidence missing/invalid, or test failed
 *
 * PHASE_GATE_ROOT overrides the project root (used by tests).
 * PHASE_GATE_TEST_TIMEOUT_MS bounds each test command and attestation replay
 *   (default 150 min, maximum 24 h); a killed command is recorded as FAIL.
 *   PHASE_GATE_DOCTOR_TIMEOUT_MS bounds each doctor tool probe (default 60 s).
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const { inspectTestSummary } = require("./test-summary.js");
const { verifyPhaseContext } = require("../../scripts/context-contract.js");
const { parsePhases, REQUIRED_PHASES, parseRequiredPhases, hasStrictAttestationFlags } = require("../../scripts/phase-definition.js");

const ROOT = path.resolve(process.env.PHASE_GATE_ROOT || path.join(__dirname, "..", ".."));
const PHASES_FILE = path.join(ROOT, "docs", "PHASES.md");
const EVIDENCE_DIR = path.join(ROOT, ".phase-evidence");
const STEPS = ["coding", "test", "verify", "review", "compound"];
const RECORD_STEPS = ["coding", "verify", "review", "compound"];
const SCHEMA = 1;
const ATTEST_DIR = path.join(ROOT, "docs", "attestations");
// Bound every child test command so a hung test cannot block the gate (or CI) forever.
// Overridable for very heavy suites; a killed child is a FAIL, never a hang.
const TIMEOUT_RAW = process.env.PHASE_GATE_TEST_TIMEOUT_MS;
const TEST_TIMEOUT_MS = TIMEOUT_RAW === undefined ? 150 * 60 * 1000 : Number(TIMEOUT_RAW);
if (!Number.isSafeInteger(TEST_TIMEOUT_MS) || TEST_TIMEOUT_MS < 1 || TEST_TIMEOUT_MS > 24 * 60 * 60 * 1000) {
  console.error("ERROR: PHASE_GATE_TEST_TIMEOUT_MS must be an integer from 1 to 86400000");
  process.exit(1);
}
const DOCTOR_TIMEOUT_MS = Number(process.env.PHASE_GATE_DOCTOR_TIMEOUT_MS) || 60 * 1000;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
const outputLimit = Number(process.env.PHASE_GATE_MAX_OUTPUT_BYTES ?? MAX_OUTPUT_BYTES);
if (!Number.isSafeInteger(outputLimit) || outputLimit < 1 || outputLimit > MAX_OUTPUT_BYTES) {
  die(1, "ERROR: PHASE_GATE_MAX_OUTPUT_BYTES must be a positive integer up to 67108864");
}

// Share one pipe for both streams so a summary cannot be reconstructed from
// counters that were separated by diagnostics on stderr.
const CAPTURE_CHILD = `
  const { spawn } = require('node:child_process');
  const [command, ...args] = process.argv.slice(1);
  const reportError = error => { process.send({ message: error.message, code: error.code }); process.exitCode = 1; };
  try {
    const child = spawn(command, args, { stdio: ['inherit', 1, 1], windowsHide: true });
    child.once('error', reportError);
    child.once('close', (status, signal) => {
      if (signal) process.send({ signal });
      process.exitCode = status ?? 1;
    });
  } catch (error) { reportError(error); }
`;

// Terminate the ordinary child process tree on timeout. This is operational
// cleanup, not isolation: descendants that escape a POSIX group or Windows
// process tree are outside this mechanism.
function runBounded(command, args, stdio) {
  return new Promise((resolve) => {
    let child;
    const capture = Array.isArray(stdio);
    try {
      child = spawn(capture ? process.execPath : command, capture ? ["-e", CAPTURE_CHILD, "--", command, ...args] : args, {
        cwd: ROOT, stdio: capture ? [stdio[0], "pipe", "ignore", "ipc"] : stdio,
        detached: process.platform !== "win32", windowsHide: true,
      });
    } catch (error) { resolve({ error, status: null }); return; }
    let done = false, stopError, launchError, childSignal, grace, bytes = 0;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (grace) clearTimeout(grace);
      resolve(result);
    };
    const failure = error => ({ error, status: null });
    const stop = error => {
      if (stopError || done) return;
      stopError = error;
      if (child.pid) {
        if (process.platform === "win32") {
          const systemRoot = process.env.SystemRoot || "C:\\Windows";
          const killed = spawnSync(path.join(systemRoot, "System32", "taskkill.exe"), ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true, timeout: 10000 });
          if (killed.error || killed.status !== 0) { try { child.kill("SIGKILL"); } catch {} }
        } else {
          try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch {} }
        }
      }
      child.stdout?.destroy();
      if (child.connected) child.disconnect();
      grace = setTimeout(() => { child.unref(); finish(failure(error)); }, 10000);
    };
    const timer = setTimeout(() => stop(Object.assign(new Error("test command timed out; escaped descendants are not covered"), { code: "ETIMEDOUT" })), TEST_TIMEOUT_MS);
    if (capture) {
      child.on("message", message => {
        if (message.signal) childSignal = message.signal;
        else launchError = Object.assign(new Error(message.message), { code: message.code });
      });
      child.stdout.on("error", stop);
      child.stdout.on("data", chunk => {
        if (stopError) return;
        try {
          const keep = Math.min(chunk.length, outputLimit - bytes);
          let offset = 0;
          while (offset < keep) {
            const position = stdio[1] === 1 ? null : bytes + offset;
            const written = fs.writeSync(stdio[1], chunk, offset, keep - offset, position);
            if (!written) throw new Error("short write to test log");
            offset += written;
          }
          bytes += keep;
          if (keep < chunk.length) stop(Object.assign(new Error(`test output exceeded ${outputLimit} bytes`), { code: "EOUTPUTLIMIT" }));
        } catch (error) { stop(error); }
      });
    }
    child.once("error", error => finish(failure(stopError || error)));
    child.once("close", (status, signal) => {
      const error = stopError || launchError;
      finish(error ? failure(error) : { status: childSignal ? null : status, signal: childSignal || signal });
    });
  });
}
// Files that legitimately change after the test step (or are environment state) are not part of the tree hash.
// Intentional exclusions. Adding entries narrows the integrity check; review before extending.
const TREE_EXCLUDE = [
  /^\.phase-evidence\//,
  /^\.claude\/\.verification\//,
  /^docs\/(compound-log|HANDOFF)\.md$/,
  /^docs\/attestations\//,
  /^dashboard\/status\.json$/,
];

// Canonical path for containment comparisons. The native variant expands Windows 8.3 short names (for example
// RUNNER~1), which fs.realpathSync leaves unexpanded; comparing mixed short/long spellings would misjudge containment.
function canonicalPath(p) {
  return fs.realpathSync.native(p);
}

function die(code, msg) {
  throw Object.assign(new Error(msg), { gateExitCode: code });
}

async function withPhaseLock(phase, action) {
  requirePhase(phase);
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const lock = path.join(EVIDENCE_DIR, `phase-${phase.toLowerCase()}.lock`);
  try { fs.mkdirSync(lock); }
  catch (error) {
    if (error.code === "EEXIST") die(2, `ERROR: Phase ${phase} is already in use (lock: ${toRel(lock)})`);
    throw error;
  }
  try {
    fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, host: os.hostname() }), { flag: "wx" });
    return await action();
  } finally {
    const owner = path.join(lock, "owner.json");
    if (fs.existsSync(owner)) fs.unlinkSync(owner);
    fs.rmdirSync(lock);
  }
}

// A crash or SIGKILL leaves .phase-evidence/phase-<id>.lock behind, after which run, record, check and attest all
// refuse to start. unlock removes it only when its owner is provably gone: same host, process no longer running.
// A reused PID can still look alive, in which case unlock refuses and the lock must be removed by hand.
function cmdUnlock(args) {
  if (args.length !== 1) usage();
  const phase = args[0];
  requirePhase(phase);
  const lock = path.join(EVIDENCE_DIR, `phase-${phase.toLowerCase()}.lock`);
  if (!fs.existsSync(lock)) {
    console.log(`Phase ${phase} is not locked.`);
    return;
  }
  let owner = null;
  try { owner = JSON.parse(fs.readFileSync(path.join(lock, "owner.json"), "utf8")); } catch { /* unreadable */ }
  if (!owner || !Number.isInteger(owner.pid) || typeof owner.host !== "string") {
    die(2, `ERROR: ${toRel(lock)} has no readable owner (owner.json). Confirm that no gate process runs, then remove it by hand`);
  }
  if (owner.host !== os.hostname()) {
    die(2, `ERROR: the lock belongs to host ${owner.host}, not this host; refusing to remove it`);
  }
  let alive = true;
  try { process.kill(owner.pid, 0); } catch (error) { alive = error.code === "EPERM"; }
  if (alive) die(2, `ERROR: process ${owner.pid} that holds the lock is still running; refusing to remove it`);
  fs.rmSync(lock, { recursive: true, force: true });
  console.log(`Removed the stale lock of Phase ${phase} (owner process ${owner.pid} is gone).`);
}

function usage() {
  die(
    1,
    [
      "Usage:",
      "  node phase-gate.js list",
      "  node phase-gate.js run <phase> test [--require-test-summary] [--require-bound-tree] -- <command...>",
      "  node phase-gate.js record <phase> <step> --status PASS|FAIL [--report <file under .phase-evidence/>] [--meta key=value ...] [--require-read-proof]",
      "  node phase-gate.js check <phase> [--require-bound-tree] [--require-strict-evidence]",
      "  node phase-gate.js unlock <phase>   (remove a lock whose owner process is gone)",
      "  node phase-gate.js doctor [--host claude|codex]",
      "  node phase-gate.js attest <phase> [--require-strict-evidence] [--sign [<private-key-file>]]",
      "  node phase-gate.js attest-keygen [<private-key-file>]   (writes the private key outside the repo and the public key to .claude/attestation-public-key.pem)",
      "  node phase-gate.js verify-attestation <phase> [--require-strict-evidence] [--require-pinned-command] [--require-signature] [-- <expected command...>]",
      `Steps: ${STEPS.join(", ")}`,
    ].join("\n")
  );
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// Hash tracked and untracked-but-not-ignored files (minus TREE_EXCLUDE).
// A failed discovery probe remains ambiguous: Git may be unavailable, outside a
// worktree, or the probe itself may have failed. Preserve legacy null in those cases.
function treeHash() {
  // Git's environment can redirect the index, repository, worktree, config, or
  // object store. Refuse it rather than silently binding a different tree.
  const routing = Object.keys(process.env).filter((key) => {
    const name = key.toUpperCase();
    if (!name.startsWith("GIT_")) return false;
    if (name === "GIT_PAGER") return false;
    if (name === "GIT_CONFIG_NOSYSTEM" && process.env[key] === "1") return false;
    // Git for Windows does not accept Node's \\.\nul spelling as a config path.
    if (name === "GIT_CONFIG_GLOBAL" && process.env[key] === (process.platform === "win32" ? "NUL" : "/dev/null")) return false;
    return true;
  }).sort();
  if (routing.length) return { error: `Git environment overrides are not supported: ${routing.join(", ")}` };
  const r = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "buffer",
  });
  if (r.error || r.status !== 0) {
    const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: ROOT, encoding: "utf8" });
    if (!probe.error && probe.status === 0 && probe.stdout.trim() === "true") {
      return { error: `git ls-files failed: ${r.error ? (r.error.code || r.error.message) : `exit ${r.status}`}` };
    }
    return null;
  }
  // Split the raw bytes first: a path that does not survive a UTF-8 round trip would be looked up under a
  // different name, hit ENOENT and silently drop out of the hash.
  const rawPaths = [];
  let from = 0;
  for (let i = 0; i < r.stdout.length; i++) {
    if (r.stdout[i] === 0) {
      if (i > from) rawPaths.push(r.stdout.subarray(from, i));
      from = i + 1;
    }
  }
  if (from < r.stdout.length) rawPaths.push(r.stdout.subarray(from));
  const decoded = [];
  for (const seg of rawPaths) {
    const text = seg.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(seg)) return { error: "a listed path is not valid UTF-8, so the tree hash cannot bind it faithfully" };
    decoded.push(text);
  }
  const files = [...new Set(decoded)]
    .filter((f) => !TREE_EXCLUDE.some((re) => re.test(f)))
    .sort();
  // Windows does not expose Git's executable mode via lstat, so tracked modes come from the index there.
  // The index is read on every platform: a gitlink (mode 160000, a submodule) would otherwise contribute
  // nothing to the hash, so a changed submodule pointer would leave the tree hash unchanged.
  const windowsModes = new Map();
  {
    const index = spawnSync("git", ["--no-optional-locks", "ls-files", "--stage", "-z"], { cwd: ROOT, encoding: "buffer" });
    if (index.error || index.status !== 0) return { error: `git index mode enumeration failed: ${index.error ? (index.error.code || index.error.message) : `exit ${index.status}`}` };
    for (const entry of index.stdout.toString("utf8").split("\0").filter(Boolean)) {
      const tab = entry.indexOf("\t");
      const header = tab < 0 ? null : /^(\d{6}) [a-f0-9]+ ([0-3])$/.exec(entry.slice(0, tab));
      if (!header || header[2] !== "0") return { error: "git index contains invalid or unmerged entries" };
      if (header[1] === "160000") return { error: "the git index contains a submodule (gitlink) entry; the tree hash cannot bind its revision. Remove it or bind it explicitly" };
      windowsModes.set(entry.slice(tab + 1), header[1]);
    }
  }
  const h = crypto.createHash("sha256");
  for (const f of files) {
    const abs = path.join(ROOT, f);
    let content;
    let st;
    try {
      st = fs.lstatSync(abs);
    } catch (err) {
      if (err.code === "ENOENT") continue; // missing listed path, including tracked deletions and races
      return { error: `lstat ${f}: ${err.code || err.message}` };
    }
    try {
      if (st.isSymbolicLink()) content = Buffer.from("symlink:" + fs.readlinkSync(abs));
      else if (st.isFile()) content = fs.readFileSync(abs);
      else continue;
    } catch (err) {
      return { error: `read ${f}: ${err.code || err.message}` };
    }
    // An untracked Windows file has no executable mode; tracked mode comes from Git. POSIX binds whether any
    // execute bit is set, the same single bit Git records, so 0700 and 0755 hash alike and match Windows.
    const executable = !st.isFile() ? "-" : process.platform === "win32"
      ? (windowsModes.get(f) === "100755" ? "111" : "000")
      : (st.mode & 0o111) ? "111" : "000";
    h.update(`${f}\0${executable}\0${sha256(content)}\n`);
  }
  return h.digest("hex");
}

function loadValidPhases() {
  if (!fs.existsSync(PHASES_FILE)) die(1, `ERROR: ${PHASES_FILE} not found`);
  return [...parsePhases(fs.readFileSync(PHASES_FILE, "utf8")).keys()];
}

function requirePhase(phase) {
  if (!phase) usage();
  const valid = loadValidPhases();
  if (!valid.includes(phase)) {
    die(1, `ERROR: invalid phase '${phase}'. Valid phases: ${valid.join(", ") || "(none)"}`);
  }
}

function isRequiredPhase(phase) {
  let manifest;
  try {
    manifest = fs.readFileSync(path.join(ROOT, REQUIRED_PHASES));
  } catch (error) {
    if (error.code === "ENOENT") return false; // legacy projects
    throw error;
  }
  return parseRequiredPhases(manifest).includes(phase);
}

function evidenceFile(phase, step) {
  return path.join(EVIDENCE_DIR, `phase-${phase}-${step}.json`);
}

function toRel(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

// Resolve a path that must be an existing regular file inside .phase-evidence/ (symlinks resolved).
function safeEvidencePath(p) {
  if (typeof p !== "string" || p === "") return { error: "empty path" };
  const abs = path.resolve(ROOT, p);
  let real;
  let realDir;
  try {
    real = canonicalPath(abs);
    realDir = canonicalPath(EVIDENCE_DIR);
  } catch {
    return { error: `not found: ${p}` };
  }
  const rel = path.relative(realDir, real);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    return { error: `outside .phase-evidence/: ${p}` };
  }
  if (!fs.statSync(real).isFile()) return { error: `not a file: ${p}` };
  return { real, abs };
}

function artifactFor(p, allowEmpty) {
  const r = safeEvidencePath(p);
  if (r.error) die(1, `ERROR: artifact ${r.error}`);
  const buf = fs.readFileSync(r.real);
  if (!allowEmpty && buf.length === 0) die(1, `ERROR: artifact is empty: ${p}`);
  return { path: toRel(r.abs), sha256: sha256(buf) };
}

function loadEvidence(phase, step) {
  const file = evidenceFile(phase, step);
  if (!fs.existsSync(file)) return { error: "missing", file };
  const raw = fs.readFileSync(file);
  try {
    return { ev: JSON.parse(raw.toString("utf8")), sha: sha256(raw), file };
  } catch {
    return { error: "invalid JSON", file };
  }
}

// The previous step must exist and be PASS. Returns the chain link to store.
function prevLink(phase, step) {
  const idx = STEPS.indexOf(step);
  if (idx === 0) return null;
  const prevStep = STEPS[idx - 1];
  const r = loadEvidence(phase, prevStep);
  if (r.error) die(2, `ERROR: step '${prevStep}' has no valid evidence (${r.error}). Record it first.`);
  if (!r.ev || r.ev.status !== "PASS") die(2, `ERROR: step '${prevStep}' is ${r.ev && r.ev.status}, not PASS.`);
  return { step: prevStep, sha256: r.sha };
}

function writeJsonAtomically(file, value) {
  const temp = path.join(path.dirname(file), `.phase-json-${crypto.randomBytes(16).toString("hex")}.tmp`);
  let mode;
  try {
    const existing = fs.lstatSync(file);
    if (existing.isFile()) mode = existing.mode & 0o777;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  let ownsTemp = false;
  try {
    const fd = fs.openSync(temp, "wx", mode ?? 0o666);
    ownsTemp = true;
    try {
      fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n");
      if (mode !== undefined && process.platform !== "win32") fs.fchmodSync(fd, mode);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, file);
    ownsTemp = false;
  } finally {
    if (ownsTemp) fs.unlinkSync(temp);
  }
}

function writeEvidence(phase, step, fields) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const ev = {
    schema: SCHEMA,
    phase,
    step,
    status: fields.status,
    recorded_at: new Date().toISOString(),
    ...(fields.command !== undefined
      ? { command: fields.command, argv: fields.argv, exit_code: fields.exit_code, tree: fields.tree,
          ...(fields.test_summary !== undefined ? { test_summary: fields.test_summary } : {}),
          ...(fields.require_test_summary ? { require_test_summary: true } : {}) }
      : {}),
    artifacts: fields.artifacts,
    ...(fields.require_read_proof ? { require_read_proof: true } : {}),
    ...(fields.meta && Object.keys(fields.meta).length ? { meta: fields.meta } : {}),
    prev: fields.prev,
  };
  writeJsonAtomically(evidenceFile(phase, step), ev);
  // A changed step invalidates everything after it.
  for (const later of STEPS.slice(STEPS.indexOf(step) + 1)) {
    const f = evidenceFile(phase, later);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

function parseFlags(args, allowed) {
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i];
    if (!name || !name.startsWith("--") || !allowed.includes(name.slice(2)) || args[i + 1] === undefined) usage();
    out[name.slice(2)] = args[i + 1];
  }
  return out;
}

function cmdList() {
  const phases = loadValidPhases();
  console.log(phases.length ? phases.join("\n") : "(none defined)");
}

// Default-FAIL: verify PASS needs proof that the verify subagent opened the test artifacts as recorded.
// Enforced only when read-tracker.sh is registered in .claude/settings.json (otherwise nothing writes the log).
function readTrackingArmed(strict = false) {
  try {
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude", "settings.json"), "utf8"));
    const post = (st.hooks || {}).PostToolUse || [];
    if (!strict) return JSON.stringify(post).includes("read-tracker.sh");
    return Array.isArray(post) && post.some((group) => {
      if (!group || typeof group !== "object" || !Array.isArray(group.hooks)) return false;
      let matches;
      try { matches = group.matcher == null || group.matcher === "" || group.matcher === "*" ||
        (typeof group.matcher === "string" && new RegExp(group.matcher).test("Read")); } catch { return false; }
      return matches && group.hooks.some((hook) => hook && hook.type === "command" &&
        typeof hook.command === "string" && (
          /^(?:[A-Za-z0-9_.:/\\-]+[\\/])?read-tracker\.sh$(?![\s\S])/.test(hook.command) ||
          /^"(?:\$\{CLAUDE_PROJECT_DIR\})?[A-Za-z0-9_.:/\\ -]*[\\/]read-tracker\.sh"$(?![\s\S])/.test(hook.command)));
    });
  } catch {
    return false;
  }
}

function readTokenFile(phase) {
  return path.join(EVIDENCE_DIR, `phase-${phase}-read-token`);
}

const CODEX_BOOTSTRAP = "require(require('node:path').join(require('node:child_process').execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim(),'.codex/hooks/phase-read.js')).main(process.argv[1])";
const CODEX_READER_ARGS = ["-e", CODEX_BOOTSTRAP];
const CODEX_RECORD_COMMAND = `node -e "${CODEX_BOOTSTRAP}" -- record`;

function codexReadTrackingArmed() {
  try {
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, ".codex", "hooks.json"), "utf8"));
    return fs.lstatSync(path.join(ROOT, ".codex", "hooks", "phase-read.js")).isFile() &&
      st.hooks.PostToolUse.some(group => group.matcher === "mcp__harness_evidence__read_phase_log" &&
        group.hooks.some(h => h.type === "command" && h.command === CODEX_RECORD_COMMAND));
  } catch {
    return false;
  }
}

// Epochs distinguish identical logs across test runs and verify attempts. This is
// an operational guardrail, not protection from evidence tampering or concurrent runs.
function rotateReadToken(phase) {
  fs.writeFileSync(readTokenFile(phase), crypto.randomBytes(32).toString("hex") + "\n");
}

function requireEvidenceRead(phase, required = false) {
  const armed = readTrackingArmed(required);
  const codexArmed = codexReadTrackingArmed();
  if (!armed && !codexArmed && required) die(2, "ERROR: --require-read-proof requires read-tracker.sh registration in valid .claude/settings.json or the Codex Phase reader hook");
  if (!armed && !codexArmed) return;
  const t = loadEvidence(phase, "test");
  let token;
  try { token = fs.readFileSync(readTokenFile(phase), "utf8").trim(); } catch { token = ""; }
  if (!/^[a-f0-9]{64}$/.test(token)) die(2, "ERROR: missing read epoch; run the test again");
  const wanted = (t.ev && Array.isArray(t.ev.artifacts) ? t.ev.artifacts : []).map((a) => ({ path: a.path, sha256: a.sha256 }));
  let reads = [];
  try {
    reads = fs
      .readFileSync(path.join(EVIDENCE_DIR, ".reads.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    // no log, or a damaged line: treated as no proof
  }
  const missing = wanted.filter((w) => !reads.some((r) => r && r.phase === phase && r.token === token &&
    r.agent_type === "verify" && r.path === w.path && r.sha256 === w.sha256 &&
    (r.host === "codex" ? codexArmed && typeof r.agent_id === "string" && r.agent_id &&
      typeof r.tool_use_id === "string" && r.tool_use_id : armed && !r.host)));
  if (wanted.length === 0 || missing.length > 0) {
    rotateReadToken(phase);
    die(
      2,
      "ERROR: verify PASS needs proof that the verify agent opened the test artifacts" +
        (missing.length ? ` (no read record: ${missing.map((m) => m.path).join(", ")})` : "") +
        ". Run the verify agent again and have it Read them. Record FAIL if it cannot."
    );
  }
}

function cmdRecord(args) {
  const [phase, step, ...rest] = args;
  if (!phase || !step) usage();
  requirePhase(phase);
  if (!RECORD_STEPS.includes(step)) {
    die(1, `ERROR: record supports ${RECORD_STEPS.join(", ")}. Use 'run' for test.`);
  }
  // Optional repeatable metadata (policy/skill version, retry count, elapsed time, cost...).
  // Stored under `meta` in the evidence file; absent keys are not materialized.
  const meta = {};
  const plain = [];
  let requireReadProof = false;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--require-read-proof") {
      if (requireReadProof) usage();
      requireReadProof = true;
    } else if (rest[i] === "--meta" && rest[i + 1] && rest[i + 1].includes("=")) {
      const eq = rest[i + 1].indexOf("=");
      meta[rest[i + 1].slice(0, eq)] = rest[i + 1].slice(eq + 1);
      i += 1;
    } else {
      plain.push(rest[i]);
    }
  }
  const opts = parseFlags(plain, ["status", "report"]);
  const status = (opts.status || "").toUpperCase();
  if (status !== "PASS" && status !== "FAIL") die(1, "ERROR: --status must be PASS or FAIL");
  if (requireReadProof && (step !== "verify" || status !== "PASS")) die(1, "ERROR: --require-read-proof requires verify PASS");
  if (step === "verify" && status === "PASS" && isRequiredPhase(phase)) requireReadProof = true;
  if (status === "PASS" && !opts.report) die(1, "ERROR: PASS requires --report <file under .phase-evidence/>");
  const artifacts = opts.report ? [artifactFor(opts.report, false)] : [];
  const prev = prevLink(phase, step);
  if (step === "verify" && status === "PASS") requireEvidenceRead(phase, requireReadProof);
  // Consume the current signal before publishing a verdict; a failed write requires a new read.
  if (step === "verify") rotateReadToken(phase);
  writeEvidence(phase, step, { status, artifacts, prev, meta, require_read_proof: requireReadProof });
  console.log(`Recorded phase ${phase} ${step}: ${status}`);
}

async function cmdRun(args) {
  const sep = args.indexOf("--");
  if (sep < 0 || sep === args.length - 1) usage();
  const head = args.slice(0, sep);
  const cmd = args.slice(sep + 1);
  const flags = head.slice(2);
  if (head.length < 2 || head[1] !== "test" ||
      flags.some((flag) => !["--require-test-summary", "--require-bound-tree"].includes(flag)) ||
      new Set(flags).size !== flags.length) usage();
  const phase = head[0];
  requirePhase(phase);
  const required = isRequiredPhase(phase);
  let strict = required || flags.includes("--require-test-summary");
  const requireBoundTree = required || flags.includes("--require-bound-tree");
  // Even a rejected rerun invalidates prior test and verify evidence.
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  rotateReadToken(phase);
  for (const step of STEPS.slice(1)) {
    const f = evidenceFile(phase, step);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  const context = verifyPhaseContext(ROOT, phase);
  if (!context.ok) die(2, "ERROR: required context contract: " + context.reason);
  const prev = prevLink(phase, "test");
  // Enforce the committed command pin at the original run, not only at attestation replay.
  const pinned = loadPinnedCommand((why) => die(2, "ERROR: " + why));
  if (pinned && JSON.stringify(pinned) !== JSON.stringify(cmd)) {
    die(2, "ERROR: test command differs from .claude/required-test-command.json");
  }
  // Projects with a committed command pin implicitly require recognized test counts.
  // Unpinned legacy projects retain their old no-summary behavior unless opted in.
  if (pinned) strict = true;

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logAbs = path.join(EVIDENCE_DIR, `phase-${phase}-test.log`);
  const treeBefore = treeHash();
  if (treeBefore && typeof treeBefore === "object") {
    die(2, `ERROR: cannot snapshot code tree before test: ${treeBefore.error}`);
  }
  if (requireBoundTree && treeBefore === null) {
    die(2, "ERROR: cannot snapshot code tree before test; --require-bound-tree requires a tree");
  }
  // Create a new inode exclusively, then replace the directory entry, never opening
  // the predictable log for writing. Existing symlinks and hardlinks are not followed.
  // This assumes the evidence directory is trusted against concurrent manipulation.
  const tempLog = path.join(EVIDENCE_DIR, `.phase-gate-${crypto.randomBytes(16).toString("hex")}.tmp`);
  let fd;
  let ownsTempLog = false;
  let result, exitCode, summary, treeAfter, status, operationError, cleanupError;
  // Append gate metadata after the captured output and handle partial writes.
  const appendLog = (text) => {
    const data = Buffer.from(text);
    let pos = fs.fstatSync(fd).size;
    let written = 0;
    while (written < data.length) {
      const n = fs.writeSync(fd, data, written, data.length - written, pos);
      if (!n) throw new Error("short write to test log");
      written += n;
      pos += n;
    }
  };
  try {
    fd = fs.openSync(tempLog, "wx+", 0o600);
    ownsTempLog = true;
    result = await runBounded(cmd[0], cmd.slice(1), ["ignore", fd, fd]);
    if (result.error) {
      if (result.error.code === "ETIMEDOUT" || result.error.killed) appendLog(`\n[phase-gate] status: TIMEOUT after ${TEST_TIMEOUT_MS}ms; process-tree termination requested, escaped descendants may remain\n`);
      else if (result.error.code === "EOUTPUTLIMIT") appendLog(`\n[phase-gate] status: OUTPUT LIMIT: ${result.error.message}\n`);
      else appendLog(`\n[phase-gate] failed to start: ${result.error.message}\n`);
    }
    exitCode = typeof result.status === "number" ? result.status : -1;
    // Read the capped capture and gate diagnostic using explicit offsets.
    const content = Buffer.alloc(fs.fstatSync(fd).size);
    let offset = 0;
    while (offset < content.length) {
      const n = fs.readSync(fd, content, offset, content.length - offset, offset);
      if (!n) throw new Error("short read of test log");
      offset += n;
    }
    summary = result.error?.code === "EOUTPUTLIMIT"
      ? { ok: false, reason: result.error.message }
      : inspectTestSummary(content.toString("utf8"), strict);
    treeAfter = treeHash();
    if (treeAfter && typeof treeAfter === "object") {
      const err = new Error(`cannot snapshot code tree after test: ${treeAfter.error}`);
      err.phaseGateExitCode = 2;
      throw err;
    }
    // Both unavailable preserves legacy no-git behavior; only one unavailable must fail.
    const treeOk = treeBefore === treeAfter && (!requireBoundTree || treeAfter !== null);
    const treeDiagnostic = treeBefore === null && treeAfter === null
      ? "code tree unavailable before and after; tree not bound"
      : !treeOk && (treeBefore === null || treeAfter === null)
        ? "code tree unavailable before or after test; cannot compare"
        : !treeOk ? "code changed during test" : "code tree unchanged";
    // A detected zero/all-skipped/failing summary is always FAIL. A missing summary
    // also fails for new strict invocations; older projects retain legacy behavior.
    status = exitCode === 0 && summary.ok !== false && treeOk ? "PASS" : "FAIL";
    // Keep an unterminated final test-output line separate from the metadata.
    const separator = content.length && content[content.length - 1] !== 0x0a ? "\n" : "";
    appendLog(`${separator}[phase-gate] command: ${cmd.join(" ")}\n[phase-gate] exit_code: ${exitCode}\n[phase-gate] test_summary: ${JSON.stringify(summary)}\n[phase-gate] tree: ${treeDiagnostic}\n`);
    const closingFd = fd;
    fd = undefined;
    fs.closeSync(closingFd);
    fs.renameSync(tempLog, logAbs);
    ownsTempLog = false;
  } catch (err) {
    operationError = err;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (err) { cleanupError = err; }
    }
    if (ownsTempLog) {
      try { fs.unlinkSync(tempLog); } catch (err) {
        if (err.code !== "ENOENT") {
          if (cleanupError) console.error(`ERROR: temporary log unlink: ${err.message}`);
          else cleanupError = err;
        }
      }
    }
  }
  if (operationError) {
    if (cleanupError) console.error(`ERROR: temporary log cleanup: ${cleanupError.message}`);
    if (operationError.phaseGateExitCode) die(operationError.phaseGateExitCode, `ERROR: ${operationError.message}`);
    throw operationError;
  }
  if (cleanupError) throw cleanupError;

  // Reads made while the test command was running do not count.
  rotateReadToken(phase);
  writeEvidence(phase, "test", {
    status,
    command: cmd.join(" "),
    argv: cmd,
    exit_code: exitCode,
    tree: treeAfter,
    require_test_summary: strict,
    test_summary: summary,
    artifacts: [artifactFor(toRel(logAbs), true)],
    prev,
  });

  const tail = fs.readFileSync(logAbs, "utf8").split("\n").slice(-21).join("\n");
  console.log(tail);
  console.log(`Recorded phase ${phase} test: ${status} (exit_code=${exitCode}, log=${toRel(logAbs)}, summary=${summary.reason || summary.kind})`);
  process.exitCode = status === "PASS" ? 0 : 2;
}

// Walks the five steps. Returns { passed: [...], fail: { step, why } | null, testEv, warnings: [...] }.
function validateChain(phase, { requireBoundTree = false, strict = false } = {}) {
  const passed = [];
  const warnings = [];
  let prevSha = null;
  let prevStep = null;
  let prevTime = null;
  let testEv = null;
  let readProof = false;
  const context = verifyPhaseContext(ROOT, phase);
  if (!context.ok) return { passed, fail: { step: "context", why: context.reason }, testEv, warnings };

  for (const step of STEPS) {
    const fail = (why) => ({ passed, fail: { step, why }, testEv, warnings });
    const r = loadEvidence(phase, step);
    if (r.error) return fail(`${r.error} (${toRel(r.file)})`);
    const ev = r.ev;
    if (!ev || typeof ev !== "object") return fail("evidence is not an object");
    if (ev.schema !== SCHEMA) return fail(`missing or unsupported schema (expected ${SCHEMA}). Hand-written evidence is rejected`);
    if (String(ev.phase) !== phase || ev.step !== step) return fail("phase/step fields do not match the file name");
    if (ev.status !== "PASS") return fail(`status=${ev.status}`);
    if (!Array.isArray(ev.artifacts) || ev.artifacts.length === 0) return fail("no artifacts recorded");
    for (const a of ev.artifacts) {
      const p = a && safeEvidencePath(a.path);
      if (!p || p.error) return fail(`artifact ${p ? p.error : "malformed entry"}`);
      if (sha256(fs.readFileSync(p.real)) !== a.sha256) return fail(`artifact changed after it was recorded: ${a.path}`);
    }
    if (step === "test") {
      if (ev.exit_code !== 0 || !ev.command || !Array.isArray(ev.argv) || ev.argv.length === 0) {
        return fail("test evidence needs a command, argv and exit_code 0");
      }
      if (strict && ev.require_test_summary !== true) return fail("strict evidence requires require_test_summary: true");
      if (ev.require_test_summary) {
        const log = ev.artifacts.find((a) => a && typeof a.path === "string" && a.path.endsWith("-test.log"));
        if (!log) return fail("strict test summary has no test log");
        const p = safeEvidencePath(log.path);
        if (p.error) return fail("strict test log not available: " + p.error);
        const check = inspectTestSummary(fs.readFileSync(p.real, "utf8"), true);
        if (!check.ok || JSON.stringify(check) !== JSON.stringify(ev.test_summary)) {
          return fail("strict test summary invalid or changed");
        }
      }
      if (requireBoundTree && (ev.tree === null || ev.tree === undefined)) {
        return fail("test evidence has no code tree hash; --require-bound-tree requires bound evidence");
      }
      const now = treeHash();
      if (now && typeof now === "object") return fail(`cannot snapshot code tree: ${now.error}`);
      if (requireBoundTree && now === null) return fail("code tree snapshot unavailable; --require-bound-tree requires a current tree");
      if (now !== null) {
        if (typeof ev.tree !== "string") return fail("test evidence has no code tree hash. Run the test again");
        if (ev.tree !== now) return fail("code changed after the test ran. Run the test again");
      } else if (typeof ev.tree === "string") {
        return fail("Git tree snapshot unavailable, so the bound code tree could not be compared");
      } else if (ev.tree !== null && ev.tree !== undefined) {
        return fail("invalid test evidence code tree hash");
      } else if (ev.tree === undefined) {
        warnings.push("code tree is not bound (older evidence has no tree field)");
      } else {
        warnings.push("code tree is not bound (the tree hash was unavailable when the test ran)");
      }
      testEv = ev;
    }
    if (step === "verify") {
      readProof = ev.require_read_proof === true;
      if (strict && !readProof) return fail("strict evidence requires require_read_proof: true");
    }

    if (prevStep === null) {
      if (ev.prev !== null) return fail("first step must not link to a previous step");
    } else if (!ev.prev || ev.prev.step !== prevStep || ev.prev.sha256 !== prevSha) {
      return fail(`chain broken: '${prevStep}' changed after this step was recorded`);
    }

    const t = Date.parse(ev.recorded_at);
    if (Number.isNaN(t)) return fail("invalid recorded_at");
    if (prevTime !== null && t < prevTime) return fail("recorded before the previous step");

    passed.push(step);
    prevSha = r.sha;
    prevStep = step;
    prevTime = t;
  }
  return { passed, fail: null, testEv, readProof, warnings, chainSha: prevSha };
}

function cmdCheck(args) {
  const [phase, ...flags] = args;
  if (flags.some(flag => !["--require-bound-tree", "--require-strict-evidence"].includes(flag)) ||
      new Set(flags).size !== flags.length) usage();
  requirePhase(phase);
  const strict = flags.includes("--require-strict-evidence") || isRequiredPhase(phase);
  const res = validateChain(phase, { strict, requireBoundTree: strict || flags.includes("--require-bound-tree") });
  for (const step of res.passed) console.log(`[PASS]    ${step}`);
  for (const w of res.warnings) console.log(`[WARN]    ${w}`);
  if (res.fail) {
    console.error(`[FAIL]    ${res.fail.step}: ${res.fail.why}`);
    console.error(`\nPhase ${phase} is NOT complete.`);
    process.exitCode = 2;
    return;
  }
  console.log(`\nPhase ${phase} COMPLETED under the evidence checks; historical tree-read completeness is not established.`);
  console.log("Next: update docs/HANDOFF.md and start a fresh session for the next Phase.");
  process.exitCode = 0;
}

// A missing tool degrades or blocks the guards (jq missing: Bash and subagent writes fail closed), so it must be visible before work starts.
function checkClaudeDoctor(ok, bad) {
  // The hooks are bash scripts, so a tool must exist where bash finds it, not only on the Node PATH
  // (on Windows jq and git usually live on the Git Bash PATH). One probe answers all of them, run
  // through the shell Claude Code uses: HARNESS_BASH, then Git Bash on Windows, then bash.
  const probe = [
    'for t in bash jq sha256sum git; do command -v "$t" >/dev/null 2>&1 && echo "have:$t" || echo "miss:$t"; done',
    'if realpath -e / >/dev/null 2>&1; then echo have:realpath-e;',
    'elif command -v realpath >/dev/null 2>&1; then echo have:realpath-plain;',
    'else echo miss:realpath; fi',
  ].join("\n");
  const shells = [process.env.HARNESS_BASH, process.env.CLAUDE_CODE_GIT_BASH_PATH];
  if (process.platform === "win32") shells.push("C:\\Program Files\\Git\\bin\\bash.exe");
  shells.push("bash");
  let probed = null;
  for (const shell of shells.filter(Boolean)) {
    const r = spawnSync(shell, ["-c", probe], { encoding: "utf8", timeout: DOCTOR_TIMEOUT_MS });
    if (!r.error && r.status === 0 && String(r.stdout).includes("have:bash")) {
      probed = r;
      break;
    }
  }
  const seen = new Map();
  for (const line of String((probed && probed.stdout) || "").split(/\r?\n/)) {
    const m = /^(have|miss):(.+)$/.exec(line.trim());
    if (m) seen.set(m[2], m[1] === "have");
  }
  if (seen.size === 0) {
    bad("bash could not be started, so the hooks cannot run here (Windows: install Git Bash or use WSL2)");
  } else {
    for (const name of ["bash", "jq", "sha256sum", "git"]) {
      seen.get(name) ? ok(name) : bad(`${name} is missing; the hooks cannot work correctly without it (missing jq blocks Bash and subagent writes)`);
    }
    if (seen.get("realpath-e")) ok("realpath -e");
    else if (seen.get("realpath-plain")) ok("realpath (no -e; read-tracker.sh falls back)");
    else bad("realpath is missing; read-tracker.sh cannot record, so verify PASS will be refused");
    if (process.platform === "win32") ok("Windows: hook paths are matched with both separators");
  }

  const settingsFile = path.join(ROOT, ".claude", "settings.json");
  let st = null;
  try {
    st = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    if (!st || typeof st !== "object" || Array.isArray(st)) throw new Error("settings must be an object");
  } catch {
    st = null;
    bad(".claude/settings.json is missing or not a valid JSON object; no guard is registered");
  }
  if (st) {
    const required = [
      ["PreToolUse", "Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell|mcp__.*", "evidence-guard.sh", " auto"],
      ["PreToolUse", "Bash|PowerShell", "block-destructive.sh", ""],
      ["PostToolUse", "Read", "read-tracker.sh", ""],
    ];
    for (const [event, matcher, want, args] of required) {
      const groups = st.hooks && st.hooks[event];
      const command = '"${CLAUDE_PROJECT_DIR}/.claude/hooks/' + want + '"' + args;
      const registered = Array.isArray(groups) && groups.some(g => g && g.matcher === matcher &&
        Array.isArray(g.hooks) && g.hooks.some(h => h && h.type === "command" && h.command === command));
      if (!registered) {
        bad(`${want} is not registered in .claude/settings.json`);
        bad(`${want}: expected ${event} matcher ${matcher} and exact command ${command}; path must be quoted`);
      } else {
        ok(`${want} registered`);
      }
      const f = path.join(ROOT, ".claude", "hooks", want);
      try {
        const relative = path.relative(canonicalPath(ROOT), canonicalPath(f));
        if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative) || !fs.statSync(f).isFile())
          throw new Error("not a repository file");
        fs.accessSync(f, fs.constants.X_OK);
      } catch {
        bad(`${toRel(f)} is missing or not executable, or not a repository file`);
      }
    }
  }
  // Local and user settings are outside the tree hash and the committed file, yet the host merges them. One
  // of them can switch every guard off without any tracked change, so the doctor must look at them too.
  for (const [label, file] of [
    [".claude/settings.local.json", path.join(ROOT, ".claude", "settings.local.json")],
    ["~/.claude/settings.json", path.join(os.homedir(), ".claude", "settings.json")],
  ]) {
    let raw;
    try { raw = fs.readFileSync(file, "utf8"); } catch { continue; }
    let other;
    try { other = JSON.parse(raw); } catch {
      console.log(`[WARNING] ${label} is not valid JSON; the host may ignore it, so its hook settings were not checked.`);
      continue;
    }
    if (other && typeof other === "object" && other.disableAllHooks === true) {
      bad(`${label} sets disableAllHooks: true, which switches off every guard`);
    } else {
      ok(`${label} does not disable hooks`);
    }
  }
  if (/\s/.test(ROOT)) ok("project path contains a space (hook commands are quoted)");
}

function checkCodexDoctor(ok, bad) {
  if (!codexReadTrackingArmed()) bad("Codex Phase reader hook is missing or does not match .codex/hooks.json");
  else ok("Codex Phase reader hook registered");
  let registered = false;
  try {
    const lines = fs.readFileSync(path.join(ROOT, ".codex", "config.toml"), "utf8")
      .split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
    const name = "[mcp_servers.harness_evidence]";
    const start = lines.indexOf(name);
    if (start >= 0 && start === lines.lastIndexOf(name)) {
      const rest = lines.slice(start + 1);
      const end = rest.findIndex(line => line.startsWith("["));
      const entries = rest.slice(0, end < 0 ? undefined : end).sort();
      const expected = ['command = "node"', 'enabled_tools = ["read_phase_log"]',
        `args = ["-e", ${JSON.stringify(CODEX_BOOTSTRAP)}]`].sort();
      registered = JSON.stringify(entries) === JSON.stringify(expected);
    }
  } catch { /* missing or unreadable config */ }
  if (!registered) return bad("Codex MCP reader configuration does not match the project harness_evidence registration");
  const r = spawnSync(process.execPath, CODEX_READER_ARGS, {
    cwd: path.join(ROOT, ".codex"), encoding: "utf8", timeout: DOCTOR_TIMEOUT_MS,
    input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n",
  });
  try {
    if (r.error || r.status !== 0 || !JSON.parse(r.stdout).result.tools.some(tool => tool.name === "read_phase_log" &&
        tool.annotations?.readOnlyHint === true)) throw new Error("reader unavailable");
    ok("Codex MCP reader starts from a repository subdirectory and advertises read_phase_log");
  } catch {
    bad("Codex MCP reader could not start or list the read-only tool; check Node and Git");
  }
  console.log("[WARNING] Codex hook trust and live verify-role events were not checked; inspect /hooks and run a real verify read.");
}

function cmdDoctor(args) {
  const host = args[1];
  if (args.length && (args.length !== 2 || args[0] !== "--host" || !["claude", "codex"].includes(host))) usage();
  const problems = [];
  const ok = (m) => console.log(`[OK]      ${m}`);
  const bad = (m) => {
    problems.push(m);
    console.error(`[PROBLEM] ${m}`);
  };
  if (host !== "codex") checkClaudeDoctor(ok, bad);
  if (host === "codex" || (!host && [".codex/config.toml", ".codex/hooks/phase-read.js"]
      .some(file => fs.existsSync(path.join(ROOT, file))))) checkCodexDoctor(ok, bad);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s). Fix them before relying on the evidence gate.`);
    process.exit(2);
  }
  console.log("\nConfigured guard checks passed; host enforcement is not verified.");
}

function attestationFile(phase) {
  return path.join(ATTEST_DIR, `phase-${phase}.json`);
}

// ---- Attestation signatures (Ed25519) -------------------------------------------------------------------
// The signature covers the canonical JSON of the attestation without its "signature" field, so changing the tree,
// the command, the flags or the evidence-chain digest invalidates it. The private key stays outside the repository
// (default ~/.harness/attest-ed25519.pem); the public key is committed at .claude/attestation-public-key.pem and is
// part of the gate's trust set. CI reads the public key from the PR base commit (ATTEST_KEY_BASE_SHA), so a pull
// request cannot swap the key it is verified against. A signature proves that the holder of the private key attested
// this exact payload; it does not prove that the verify and review steps were independent.
const ATTEST_PUBKEY_REL = ".claude/attestation-public-key.pem";
const DEFAULT_ATTEST_KEY = path.join(os.homedir(), ".harness", "attest-ed25519.pem");

function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function publicKeyId(publicPem) {
  return sha256(crypto.createPublicKey(publicPem).export({ type: "spki", format: "der" }));
}

function signAttestation(att, privatePem) {
  const key = crypto.createPrivateKey(privatePem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("the attestation signing key must be an Ed25519 key");
  const { signature: _ignored, ...payload } = att;
  const publicPem = crypto.createPublicKey(key).export({ type: "spki", format: "pem" });
  const value = crypto.sign(null, Buffer.from(canonicalJson(payload)), key).toString("base64");
  return { alg: "ed25519", key_id: publicKeyId(publicPem), value };
}

// Returns null when the signature is valid, else the reason.
function checkAttestationSignature(att, publicPem) {
  const sig = att.signature;
  if (!sig || typeof sig !== "object" || sig.alg !== "ed25519" || typeof sig.value !== "string" || typeof sig.key_id !== "string") {
    return "the attestation has no valid signature object";
  }
  let key;
  try { key = crypto.createPublicKey(publicPem); } catch { return "the trusted public key is not a valid public key"; }
  if (key.asymmetricKeyType !== "ed25519") return "the trusted public key is not an Ed25519 key";
  if (publicKeyId(publicPem) !== sig.key_id) return "the signature names a different key than the trusted public key";
  const { signature: _ignored, ...payload } = att;
  let ok = false;
  try { ok = crypto.verify(null, Buffer.from(canonicalJson(payload)), key, Buffer.from(sig.value, "base64")); } catch { ok = false; }
  return ok ? null : "the signature does not match the attestation (it was changed after signing, or signed with another key)";
}

// The trusted public key: from the PR base commit when ATTEST_KEY_BASE_SHA is set (a pull request cannot swap it),
// else from the working tree. A base without the key file is the one-time introduction of the key: the key of the
// change itself is used and a warning says so.
function loadTrustedPublicKey(bad) {
  const baseSha = process.env.ATTEST_KEY_BASE_SHA;
  const local = () => {
    try { return fs.readFileSync(path.join(ROOT, ATTEST_PUBKEY_REL), "utf8"); } catch { return null; }
  };
  if (baseSha) {
    if (!/^[0-9a-f]{40}$/i.test(baseSha)) bad("ATTEST_KEY_BASE_SHA must be a 40-character commit id");
    const show = spawnSync("git", ["show", `${baseSha}:${ATTEST_PUBKEY_REL}`], { cwd: ROOT, encoding: "utf8" });
    if (!show.error && show.status === 0) {
      // The file exists at the base: it is the trusted key, even when it is empty or garbage (that fails the check
      // later). Only a missing file is the introduction case; an empty file must not fall through to it.
      if (!show.stdout.trim()) bad("the public key file at the base commit is empty");
      return show.stdout;
    }
    const probe = spawnSync("git", ["cat-file", "-e", `${baseSha}^{commit}`], { cwd: ROOT });
    if (probe.error || probe.status !== 0) bad("the base commit named by ATTEST_KEY_BASE_SHA is not available; fetch it before verifying");
    // Only a path that is really absent at the base is the introduction case; a key that exists but could not be
    // read is a failure, not a reason to trust the change's own key.
    const present = spawnSync("git", ["cat-file", "-e", `${baseSha}:${ATTEST_PUBKEY_REL}`], { cwd: ROOT });
    if (!present.error && present.status === 0) bad("the public key exists at the base commit but could not be read");
    const pem = local();
    if (!pem) bad("no trusted public key: the base commit has none and the change does not add " + ATTEST_PUBKEY_REL);
    console.log("[WARNING] the base commit has no attestation public key; this change introduces it, so it is trusted this once.");
    return pem;
  }
  const pem = local();
  if (!pem) bad("no trusted public key: " + ATTEST_PUBKEY_REL + " is missing");
  return pem;
}

function cmdAttestKeygen(args) {
  const privatePath = path.resolve(args[0] || DEFAULT_ATTEST_KEY);
  if (args.length > 1) usage();
  const publicPath = path.join(ROOT, ATTEST_PUBKEY_REL);
  if (fs.existsSync(privatePath)) die(2, `ERROR: ${privatePath} already exists; refusing to overwrite a signing key`);
  if (fs.existsSync(publicPath)) die(2, `ERROR: ${ATTEST_PUBKEY_REL} already exists; rotating the trusted key is a reviewed change, not a command`);
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.mkdirSync(path.dirname(privatePath), { recursive: true });
  fs.writeFileSync(privatePath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600, flag: "wx" });
  const publicPem = publicKey.export({ type: "spki", format: "pem" });
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(publicPath, publicPem, { flag: "wx" });
  console.log(`Wrote the private key to ${privatePath} (keep it outside the repository; on Windows the file mode is not enforced, so protect the directory).`);
  console.log(`Wrote the public key to ${ATTEST_PUBKEY_REL}, key_id ${publicKeyId(publicPem)}. Commit the public key through a reviewed change.`);
}

function cmdAttest(args) {
  const [phase, ...rest] = args;
  const flags = [];
  let keyFile = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--require-strict-evidence") flags.push(rest[i]);
    else if (rest[i] === "--sign") {
      keyFile = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : (process.env.HARNESS_ATTEST_KEY || DEFAULT_ATTEST_KEY);
    } else usage();
  }
  if (flags.length > 1) usage();
  requirePhase(phase);
  const strict = flags.length === 1 || isRequiredPhase(phase);
  const res = validateChain(phase, { strict, requireBoundTree: strict });
  if (res.fail) die(2, `ERROR: cannot attest. ${res.fail.step}: ${res.fail.why}`);
  const tree = treeHash();
  if (tree && typeof tree === "object") die(2, `ERROR: cannot snapshot code tree for attestation: ${tree.error}`);
  if (tree === null) die(2, "ERROR: cannot attest without git. The attestation binds to the code tree");
  if (typeof res.testEv.tree !== "string" || tree !== res.testEv.tree) {
    die(2, "ERROR: cannot attest: code tree does not match test evidence. Run the test again");
  }
  fs.mkdirSync(ATTEST_DIR, { recursive: true });
  const att = {
    schema: SCHEMA,
    phase,
    tree,
    argv: res.testEv.argv,
    ...(res.testEv.require_test_summary ? { require_test_summary: true } : {}),
    ...(res.readProof ? { require_read_proof: true } : {}),
    // Digest of the final evidence record; each record links the previous one, so this identifies the
    // exact chain (coding, test, verify, review, compound) that was attested. The records themselves stay
    // local (.phase-evidence is not committed); keep a copy if the chain must be re-checked later.
    evidence_chain_sha256: res.chainSha,
    attested_at: new Date().toISOString(),
  };
  if (keyFile) {
    let privatePem;
    try { privatePem = fs.readFileSync(keyFile, "utf8"); } catch (error) { die(2, `ERROR: cannot read the signing key ${keyFile}: ${error.code || error.message}`); }
    try { att.signature = signAttestation(att, privatePem); } catch (error) { die(2, `ERROR: cannot sign: ${error.message}`); }
    // Fail now, not in CI: the committed public key must be the one that verifies this signature.
    let trusted = null;
    try { trusted = fs.readFileSync(path.join(ROOT, ATTEST_PUBKEY_REL), "utf8"); } catch { /* reported below */ }
    const problem = trusted === null ? `${ATTEST_PUBKEY_REL} is missing` : checkAttestationSignature(att, trusted);
    if (problem) die(2, `ERROR: the signature would not verify against the committed public key: ${problem}`);
  }
  writeJsonAtomically(attestationFile(phase), att);
  console.log(`Wrote ${toRel(attestationFile(phase))}${att.signature ? " (signed)" : ""}. Commit it; CI re-runs the test command and compares the tree.`);
}

// .claude/required-test-command.json: a JSON array of strings, committed and reviewed with the code.
// When present, no attestation may use any other test command.
function loadPinnedCommand(bad) {
  const file = path.join(ROOT, ".claude", "required-test-command.json");
  if (!fs.existsSync(file)) return null;
  let v;
  try {
    v = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return bad(`${toRel(file)} is not valid JSON`);
  }
  if (!Array.isArray(v) || v.length === 0 || !v.every((x) => typeof x === "string")) {
    return bad(`${toRel(file)} must be a non-empty JSON array of strings`);
  }
  return v;
}

async function cmdVerifyAttestation(args) {
  const sep = args.indexOf("--");
  const head = sep < 0 ? args : args.slice(0, sep);
  const expected = sep < 0 ? null : args.slice(sep + 1);
  const OPTIONS = ["--require-strict-evidence", "--require-pinned-command", "--require-signature"];
  const options = head.slice(1);
  if (head.length < 1 || options.some((o) => !OPTIONS.includes(o)) || new Set(options).size !== options.length ||
      (expected !== null && expected.length === 0)) usage();
  const requirePin = options.includes("--require-pinned-command");
  const requireSignature = options.includes("--require-signature");
  const phase = head[0];
  requirePhase(phase);
  const file = attestationFile(phase);
  const bad = (why) => die(2, `[FAIL] attestation for phase ${phase}: ${why}`);
  if (!fs.existsSync(file)) bad(`missing (${toRel(file)})`);
  let att;
  try {
    att = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    bad("invalid JSON");
  }
  if (!att || att.schema !== SCHEMA || String(att.phase) !== phase) bad("schema or phase mismatch");
  const strict = options.includes("--require-strict-evidence") || isRequiredPhase(phase);
  if (strict && !hasStrictAttestationFlags(att)) {
    bad("strict evidence requires test summary and verify read proof flags");
  }
  if (!Array.isArray(att.argv) || att.argv.length === 0 || !att.argv.every((x) => typeof x === "string")) bad("argv is missing");
  if (typeof att.tree !== "string") bad("tree hash is missing");
  // CI passes --require-signature: an unsigned attestation, or one that does not verify against the trusted
  // public key, is refused before anything is executed.
  if (requireSignature) {
    const problem = checkAttestationSignature(att, loadTrustedPublicKey(bad));
    if (problem) bad(problem);
  } else if (att.signature !== undefined) {
    const pem = (() => { try { return fs.readFileSync(path.join(ROOT, ATTEST_PUBKEY_REL), "utf8"); } catch { return null; } })();
    const problem = pem ? checkAttestationSignature(att, pem) : "a signature is present but no public key is committed";
    if (problem) bad(problem);
  }
  // The required command comes from the command line, else from the committed pin file. Replay never
  // runs an argv that nothing independent of the attestation names: a missing pin is a failure.
  const pinned = loadPinnedCommand(bad);
  const required = expected || pinned;
  // CI passes --require-pinned-command: replay must not execute an argv that only the attestation names.
  if (requirePin && !pinned) bad("no pinned test command: --require-pinned-command needs a valid .claude/required-test-command.json");
  if (strict && !/^[0-9a-f]{64}$/.test(att.evidence_chain_sha256 || "")) {
    bad("strict evidence requires evidence_chain_sha256 (the digest of the final evidence record)");
  }
  if (att.evidence_chain_sha256 !== undefined && !/^[0-9a-f]{64}$/.test(String(att.evidence_chain_sha256))) bad("evidence_chain_sha256 is malformed");
  if ((required && JSON.stringify(required) !== JSON.stringify(att.argv)) ||
      (pinned && JSON.stringify(pinned) !== JSON.stringify(att.argv))) {
    bad(`attested command differs from the required one: ${att.argv.join(" ")}`);
  }
  // On the machine that holds the evidence, the local chain must be the one that was attested.
  if (att.evidence_chain_sha256) {
    const local = loadEvidence(phase, STEPS[STEPS.length - 1]);
    if (!local.error && local.sha && local.sha !== att.evidence_chain_sha256) {
      bad("the local evidence chain differs from the attested one (evidence_chain_sha256). Re-attest or restore the attested chain");
    }
  }
  // An attestation cannot disable count checks when a trusted command pin exists.
  const strictReplay = att.require_test_summary === true || Boolean(pinned);
  const now = treeHash();
  if (now && typeof now === "object") bad(`cannot snapshot code tree: ${now.error}`);
  if (now === null) bad("git is unavailable, so the code tree cannot be compared");
  if (now !== att.tree) bad("code changed after the attestation. Run the phase again and re-attest");
  let r, output;
  if (strictReplay) {
    let dir, fd;
    try {
      // Keep replay output outside this worktree, including when TMPDIR points inside it.
      const repo = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: ROOT, encoding: "utf8" });
      if (repo.error || repo.status !== 0) throw new Error("cannot locate repository root");
      const repoRoot = canonicalPath(repo.stdout.replace(/\r?\n$/, ""));
      const tempRoot = canonicalPath(os.tmpdir());
      const rel = path.relative(repoRoot, tempRoot);
      if (!rel || (rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel))) {
        throw new Error("temporary directory is inside the repository");
      }
      dir = fs.mkdtempSync(path.join(tempRoot, "phase-gate-replay-"));
      fd = fs.openSync(path.join(dir, "output.log"), "wx", 0o600);
      r = await runBounded(att.argv[0], att.argv.slice(1), ["ignore", fd, fd]);
      fs.closeSync(fd);
      fd = undefined;
      if (r.error) throw new Error(["ETIMEDOUT", "EOUTPUTLIMIT"].includes(r.error.code) ? r.error.message : `test command failed to start: ${r.error.message}`);
      output = fs.readFileSync(path.join(dir, "output.log"), "utf8");
    } catch (err) {
      r = { error: err };
    } finally {
      try { if (fd !== undefined) fs.closeSync(fd); } catch (err) { r = { error: err }; }
      try { if (dir) fs.rmSync(dir, { recursive: true, force: true }); } catch (err) { r = { error: err }; }
    }
    if (r.error) bad(`replay output or start error: ${r.error.message}`);
    process.stdout.write(output);
  } else {
    r = await runBounded(att.argv[0], att.argv.slice(1), ["inherit", 1, 1]);
  }
  if (r.error) bad(r.error.code === "ETIMEDOUT" ? r.error.message : `test command failed to start: ${r.error.message}`);
  if (r.status !== 0) bad(`test command exited with ${r.status}`);
  if (strictReplay) {
    const summary = inspectTestSummary(output, true);
    if (!summary.ok) bad(`strict test summary invalid: ${summary.reason}`);
  }
  // A passing test may itself rewrite source. Verify the binding again after replay, not
  // merely before executing the command, before claiming this tree was independently verified.
  const replayedTree = treeHash();
  if (replayedTree && typeof replayedTree === "object") bad(`cannot snapshot code tree after replay: ${replayedTree.error}`);
  if (replayedTree === null) bad("git is unavailable after attestation replay, so the code tree cannot be compared");
  if (replayedTree !== att.tree) bad("code changed during attestation replay. Run the phase again and re-attest");
  console.log(`Phase ${phase} attestation verified: tree matches and the test command passes.`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "list":
      return cmdList();
    case "run":
      return withPhaseLock(args[0], () => cmdRun(args));
    case "record":
      return withPhaseLock(args[0], () => cmdRecord(args));
    case "check":
      return withPhaseLock(args[0], () => cmdCheck(args));
    case "unlock":
      return cmdUnlock(args);
    case "doctor":
      return cmdDoctor(args);
    case "attest":
      return withPhaseLock(args[0], () => cmdAttest(args));
    case "attest-keygen":
      return cmdAttestKeygen(args);
    case "verify-attestation":
      return cmdVerifyAttestation(args);
    default:
      return usage();
  }
}

main().catch(error => {
  console.error(error.gateExitCode ? error.message : `ERROR: ${error.message}`);
  process.exitCode = error.gateExitCode || 2;
});
