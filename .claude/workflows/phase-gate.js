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
 *   run <phase> test [--require-test-summary] -- <command...>         Run a test command, store its log, record the real exit code
 *   record <phase> <step> --status PASS|FAIL [--report <file>]
 *                                            Record coding|verify|review|compound evidence
 *   check <phase>                            Verify all five steps; exit 0 only if complete
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
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { inspectTestSummary } = require("./test-summary.js");
const { verifyPhaseContext } = require("../../scripts/context-contract.js");

const ROOT = path.resolve(process.env.PHASE_GATE_ROOT || path.join(__dirname, "..", ".."));
const PHASES_FILE = path.join(ROOT, "docs", "PHASES.md");
const EVIDENCE_DIR = path.join(ROOT, ".phase-evidence");
const STEPS = ["coding", "test", "verify", "review", "compound"];
const RECORD_STEPS = ["coding", "verify", "review", "compound"];
const SCHEMA = 1;
const ID_RE = /^[A-Za-z0-9._-]+$/;
const ATTEST_DIR = path.join(ROOT, "docs", "attestations");
// Files that legitimately change after the test step (or are environment state) are not part of the tree hash.
const TREE_EXCLUDE = [
  /^\.phase-evidence\//,
  /^\.claude\/\.verification\//,
  /^docs\/(compound-log|HANDOFF)\.md$/,
  /^docs\/attestations\//,
];

function die(code, msg) {
  console.error(msg);
  process.exit(code);
}

function usage() {
  die(
    1,
    [
      "Usage:",
      "  node phase-gate.js list",
      "  node phase-gate.js run <phase> test [--require-test-summary] -- <command...>",
      "  node phase-gate.js record <phase> <step> --status PASS|FAIL [--report <file under .phase-evidence/>]",
      "  node phase-gate.js check <phase>",
      "  node phase-gate.js doctor",
      "  node phase-gate.js attest <phase>",
      "  node phase-gate.js verify-attestation <phase> [-- <expected command...>]",
      `Steps: ${STEPS.join(", ")}`,
    ].join("\n")
  );
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// Hash of tracked and untracked-but-not-ignored files (minus TREE_EXCLUDE). null when git is unavailable.
function treeHash() {
  const r = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "buffer",
  });
  if (r.error || r.status !== 0) return null;
  const files = [...new Set(r.stdout.toString("utf8").split("\0").filter(Boolean))]
    .filter((f) => !TREE_EXCLUDE.some((re) => re.test(f)))
    .sort();
  const h = crypto.createHash("sha256");
  for (const f of files) {
    const abs = path.join(ROOT, f);
    let content;
    try {
      const st = fs.lstatSync(abs);
      if (st.isSymbolicLink()) content = Buffer.from("symlink:" + fs.readlinkSync(abs));
      else if (st.isFile()) content = fs.readFileSync(abs);
      else continue;
    } catch {
      continue; // deleted but still listed
    }
    h.update(`${f}\0${sha256(content)}\n`);
  }
  return h.digest("hex");
}

function loadValidPhases() {
  if (!fs.existsSync(PHASES_FILE)) die(1, `ERROR: ${PHASES_FILE} not found`);
  // Code fences hold templates and examples, not real phases.
  const content = fs.readFileSync(PHASES_FILE, "utf8").replace(/```[\s\S]*?```/g, "");
  const phases = [];
  const re = /^###\s+Phase\s+([^\s:]+)/gim;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (ID_RE.test(m[1]) && !phases.includes(m[1])) phases.push(m[1]);
  }
  return phases;
}

function requirePhase(phase) {
  if (!phase) usage();
  const valid = loadValidPhases();
  if (!valid.includes(phase)) {
    die(1, `ERROR: invalid phase '${phase}'. Valid phases: ${valid.join(", ") || "(none)"}`);
  }
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
    real = fs.realpathSync(abs);
    realDir = fs.realpathSync(EVIDENCE_DIR);
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
    prev: fields.prev,
  };
  fs.writeFileSync(evidenceFile(phase, step), JSON.stringify(ev, null, 2) + "\n");
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
function readTrackingArmed() {
  try {
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude", "settings.json"), "utf8"));
    return JSON.stringify((st.hooks || {}).PostToolUse || []).includes("read-tracker.sh");
  } catch {
    return false;
  }
}

function readTokenFile(phase) {
  return path.join(EVIDENCE_DIR, `phase-${phase}-read-token`);
}

// Epochs distinguish identical logs across test runs and verify attempts. This is
// an operational guardrail, not protection from evidence tampering or concurrent runs.
function rotateReadToken(phase) {
  fs.writeFileSync(readTokenFile(phase), crypto.randomBytes(32).toString("hex") + "\n");
}

function requireEvidenceRead(phase) {
  if (!readTrackingArmed()) return;
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
  const missing = wanted.filter((w) => !reads.some((r) => r && r.phase === phase && r.token === token && r.agent_type === "verify" && r.path === w.path && r.sha256 === w.sha256));
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
  const opts = parseFlags(rest, ["status", "report"]);
  const status = (opts.status || "").toUpperCase();
  if (status !== "PASS" && status !== "FAIL") die(1, "ERROR: --status must be PASS or FAIL");
  if (status === "PASS" && !opts.report) die(1, "ERROR: PASS requires --report <file under .phase-evidence/>");
  const artifacts = opts.report ? [artifactFor(opts.report, false)] : [];
  const prev = prevLink(phase, step);
  if (step === "verify" && status === "PASS") requireEvidenceRead(phase);
  // Consume the current signal before publishing a verdict; a failed write requires a new read.
  if (step === "verify") rotateReadToken(phase);
  writeEvidence(phase, step, { status, artifacts, prev });
  console.log(`Recorded phase ${phase} ${step}: ${status}`);
}

function cmdRun(args) {
  const sep = args.indexOf("--");
  if (sep < 0 || sep === args.length - 1) usage();
  const head = args.slice(0, sep);
  const cmd = args.slice(sep + 1);
  let strict = head.length === 3 && head[2] === "--require-test-summary";
  if ((head.length !== 2 && !strict) || head[1] !== "test") usage();
  const phase = head[0];
  requirePhase(phase);
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
  const fd = fs.openSync(logAbs, "w");
  const treeBefore = treeHash();
  let result;
  try {
    result = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: ["ignore", fd, fd] });
  } finally {
    fs.closeSync(fd);
  }
  if (result.error) fs.appendFileSync(logAbs, `\n[phase-gate] failed to start: ${result.error.message}\n`);
  const exitCode = typeof result.status === "number" ? result.status : -1;
  const summary = inspectTestSummary(fs.readFileSync(logAbs, "utf8"), strict);
  const treeAfter = treeHash();
  // Both unavailable preserves legacy no-git behavior; only one unavailable must fail.
  const treeOk = treeBefore === treeAfter;
  const treeDiagnostic = treeBefore === null && treeAfter === null
    ? "code tree unavailable before and after; tree not bound"
    : !treeOk && (treeBefore === null || treeAfter === null)
      ? "code tree unavailable before or after test; cannot compare"
      : !treeOk ? "code changed during test" : "code tree unchanged";
  // A detected zero/all-skipped/failing summary is always FAIL. A missing summary
  // also fails for new strict invocations; older projects retain legacy behavior.
  const status = exitCode === 0 && summary.ok !== false && treeOk ? "PASS" : "FAIL";
  fs.appendFileSync(logAbs, `[phase-gate] command: ${cmd.join(" ")}\n[phase-gate] exit_code: ${exitCode}\n[phase-gate] test_summary: ${JSON.stringify(summary)}\n[phase-gate] tree: ${treeDiagnostic}\n`);

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
  process.exit(status === "PASS" ? 0 : 2);
}

// Walks the five steps. Returns { passed: [...], fail: { step, why } | null, testEv, warnings: [...] }.
function validateChain(phase) {
  const passed = [];
  const warnings = [];
  let prevSha = null;
  let prevStep = null;
  let prevTime = null;
  let testEv = null;
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
      const now = treeHash();
      if (now !== null) {
        if (typeof ev.tree !== "string") return fail("test evidence has no code tree hash. Run the test again");
        if (ev.tree !== now) return fail("code changed after the test ran. Run the test again");
      } else if (ev.tree !== null) {
        warnings.push("git is unavailable here, so the code tree could not be compared");
      } else {
        warnings.push("code tree is not bound (the tree hash was unavailable when the test ran)");
      }
      testEv = ev;
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
  return { passed, fail: null, testEv, warnings };
}

function cmdCheck(args) {
  const phase = args[0];
  requirePhase(phase);
  const res = validateChain(phase);
  for (const step of res.passed) console.log(`[PASS]    ${step}`);
  for (const w of res.warnings) console.log(`[WARN]    ${w}`);
  if (res.fail) {
    console.error(`[FAIL]    ${res.fail.step}: ${res.fail.why}`);
    console.error(`\nPhase ${phase} is NOT complete.`);
    process.exit(2);
  }
  console.log(`\nPhase ${phase} COMPLETED with full evidence.`);
  console.log("Next: update docs/HANDOFF.md and start a fresh session for the next Phase.");
  process.exit(0);
}

// Guards fail open when a tool they need is missing, so a missing tool must be visible before work starts.
function cmdDoctor() {
  const problems = [];
  const ok = (m) => console.log(`[OK]      ${m}`);
  const bad = (m) => {
    problems.push(m);
    console.error(`[PROBLEM] ${m}`);
  };
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
    const r = spawnSync(shell, ["-c", probe], { encoding: "utf8" });
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
      seen.get(name) ? ok(name) : bad(`${name} is missing; the hooks fail open without it`);
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
  } catch {
    bad(".claude/settings.json is missing or not valid JSON; no guard is registered");
  }
  if (st) {
    const cmds = Object.values(st.hooks || {}).flatMap((groups) => groups.flatMap((g) => (g.hooks || []).map((h) => h.command || "")));
    for (const want of ["evidence-guard.sh", "block-destructive.sh", "read-tracker.sh"]) {
      const c = cmds.find((x) => x.includes(want));
      if (!c) {
        bad(`${want} is not registered in .claude/settings.json`);
        continue;
      }
      if (!c.startsWith('"${CLAUDE_PROJECT_DIR}/')) bad(`${want}: the command path must be quoted, or a project path with a space disables the hook`);
      else ok(`${want} registered`);
      const f = path.join(ROOT, ".claude", "hooks", want);
      try {
        fs.accessSync(f, fs.constants.X_OK);
      } catch {
        bad(`${toRel(f)} is missing or not executable`);
      }
    }
  }
  if (/\s/.test(ROOT)) ok("project path contains a space (hook commands are quoted)");
  if (problems.length) {
    console.error(`\n${problems.length} problem(s). Fix them before relying on the evidence gate.`);
    process.exit(2);
  }
  console.log("\nGuards can run here.");
}

function attestationFile(phase) {
  return path.join(ATTEST_DIR, `phase-${phase}.json`);
}

function cmdAttest(args) {
  const phase = args[0];
  requirePhase(phase);
  const res = validateChain(phase);
  if (res.fail) die(2, `ERROR: cannot attest. ${res.fail.step}: ${res.fail.why}`);
  const tree = treeHash();
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
    attested_at: new Date().toISOString(),
  };
  fs.writeFileSync(attestationFile(phase), JSON.stringify(att, null, 2) + "\n");
  console.log(`Wrote ${toRel(attestationFile(phase))}. Commit it; CI re-runs the test command and compares the tree.`);
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

function cmdVerifyAttestation(args) {
  const sep = args.indexOf("--");
  const head = sep < 0 ? args : args.slice(0, sep);
  const expected = sep < 0 ? null : args.slice(sep + 1);
  if (head.length !== 1 || (expected !== null && expected.length === 0)) usage();
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
  if (!Array.isArray(att.argv) || att.argv.length === 0 || !att.argv.every((x) => typeof x === "string")) bad("argv is missing");
  if (typeof att.tree !== "string") bad("tree hash is missing");
  // The required command comes from the command line, else from the committed pin file.
  const pinned = loadPinnedCommand(bad);
  const required = expected || pinned;
  if ((required && JSON.stringify(required) !== JSON.stringify(att.argv)) ||
      (pinned && JSON.stringify(pinned) !== JSON.stringify(att.argv))) {
    bad(`attested command differs from the required one: ${att.argv.join(" ")}`);
  }
  // An attestation cannot disable count checks when a trusted command pin exists.
  const strictReplay = att.require_test_summary === true || Boolean(pinned);
  const now = treeHash();
  if (now === null) bad("git is unavailable, so the code tree cannot be compared");
  if (now !== att.tree) bad("code changed after the attestation. Run the phase again and re-attest");
  const opts = strictReplay
    ? { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    : { cwd: ROOT, stdio: "inherit" };
  const r = spawnSync(att.argv[0], att.argv.slice(1), opts);
  if (strictReplay) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  if (r.error) bad(`test command failed to start: ${r.error.message}`);
  if (r.status !== 0) bad(`test command exited with ${r.status}`);
  if (strictReplay) {
    const summary = inspectTestSummary(String(r.stdout || "") + "\n" + String(r.stderr || ""), true);
    if (!summary.ok) bad(`strict test summary invalid: ${summary.reason}`);
  }
  // A passing test may itself rewrite source. Verify the binding again after replay, not
  // merely before executing the command, before claiming this tree was independently verified.
  const replayedTree = treeHash();
  if (replayedTree === null) bad("git is unavailable after attestation replay, so the code tree cannot be compared");
  if (replayedTree !== att.tree) bad("code changed during attestation replay. Run the phase again and re-attest");
  console.log(`Phase ${phase} attestation verified: tree matches and the test command passes.`);
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "list":
      return cmdList();
    case "run":
      return cmdRun(args);
    case "record":
      return cmdRecord(args);
    case "check":
      return cmdCheck(args);
    case "doctor":
      return cmdDoctor();
    case "attest":
      return cmdAttest(args);
    case "verify-attestation":
      return cmdVerifyAttestation(args);
    default:
      return usage();
  }
}

main();
