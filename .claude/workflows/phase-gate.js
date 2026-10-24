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
 *   run <phase> test -- <command...>         Run a test command, store its log, record the real exit code
 *   record <phase> <step> --status PASS|FAIL [--report <file>]
 *                                            Record coding|verify|review|compound evidence
 *   check <phase>                            Verify all five steps; exit 0 only if complete
 *
 * Evidence (.phase-evidence/phase-<id>-<step>.json) holds the status, SHA-256 of its
 * report or log, and SHA-256 of the previous step's evidence file (a hash chain).
 * Recording a step clears the steps after it.
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

const ROOT = path.resolve(process.env.PHASE_GATE_ROOT || path.join(__dirname, "..", ".."));
const PHASES_FILE = path.join(ROOT, "docs", "PHASES.md");
const EVIDENCE_DIR = path.join(ROOT, ".phase-evidence");
const STEPS = ["coding", "test", "verify", "review", "compound"];
const RECORD_STEPS = ["coding", "verify", "review", "compound"];
const SCHEMA = 1;
const ID_RE = /^[A-Za-z0-9._-]+$/;

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
      "  node phase-gate.js run <phase> test -- <command...>",
      "  node phase-gate.js record <phase> <step> --status PASS|FAIL [--report <file under .phase-evidence/>]",
      "  node phase-gate.js check <phase>",
      `Steps: ${STEPS.join(", ")}`,
    ].join("\n")
  );
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
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
    ...(fields.command !== undefined ? { command: fields.command, exit_code: fields.exit_code } : {}),
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
  writeEvidence(phase, step, { status, artifacts, prev });
  console.log(`Recorded phase ${phase} ${step}: ${status}`);
}

function cmdRun(args) {
  const sep = args.indexOf("--");
  if (sep < 0 || sep === args.length - 1) usage();
  const head = args.slice(0, sep);
  const cmd = args.slice(sep + 1);
  if (head.length !== 2 || head[1] !== "test") usage();
  const phase = head[0];
  requirePhase(phase);
  const prev = prevLink(phase, "test");

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logAbs = path.join(EVIDENCE_DIR, `phase-${phase}-test.log`);
  const fd = fs.openSync(logAbs, "w");
  let result;
  try {
    result = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: ["ignore", fd, fd] });
  } finally {
    fs.closeSync(fd);
  }
  if (result.error) fs.appendFileSync(logAbs, `\n[phase-gate] failed to start: ${result.error.message}\n`);
  const exitCode = typeof result.status === "number" ? result.status : -1;
  const status = exitCode === 0 ? "PASS" : "FAIL";

  writeEvidence(phase, "test", {
    status,
    command: cmd.join(" "),
    exit_code: exitCode,
    artifacts: [artifactFor(toRel(logAbs), true)],
    prev,
  });

  const tail = fs.readFileSync(logAbs, "utf8").split("\n").slice(-21).join("\n");
  console.log(tail);
  console.log(`Recorded phase ${phase} test: ${status} (exit_code=${exitCode}, log=${toRel(logAbs)})`);
  process.exit(status === "PASS" ? 0 : 2);
}

function cmdCheck(args) {
  const phase = args[0];
  requirePhase(phase);
  let prevSha = null;
  let prevStep = null;
  let prevTime = null;

  for (const step of STEPS) {
    const bad = (why) => {
      console.error(`[FAIL]    ${step}: ${why}`);
      console.error(`\nPhase ${phase} is NOT complete.`);
      process.exit(2);
    };
    const r = loadEvidence(phase, step);
    if (r.error) bad(`${r.error} (${toRel(r.file)})`);
    const ev = r.ev;
    if (!ev || typeof ev !== "object") bad("evidence is not an object");
    if (ev.schema !== SCHEMA) bad(`missing or unsupported schema (expected ${SCHEMA}). Hand-written evidence is rejected`);
    if (String(ev.phase) !== phase || ev.step !== step) bad("phase/step fields do not match the file name");
    if (ev.status !== "PASS") bad(`status=${ev.status}`);
    if (!Array.isArray(ev.artifacts) || ev.artifacts.length === 0) bad("no artifacts recorded");
    for (const a of ev.artifacts) {
      const p = a && safeEvidencePath(a.path);
      if (!p || p.error) bad(`artifact ${p ? p.error : "malformed entry"}`);
      if (sha256(fs.readFileSync(p.real)) !== a.sha256) bad(`artifact changed after it was recorded: ${a.path}`);
    }
    if (step === "test" && (ev.exit_code !== 0 || !ev.command)) bad("test evidence needs a command and exit_code 0");

    if (prevStep === null) {
      if (ev.prev !== null) bad("first step must not link to a previous step");
    } else if (!ev.prev || ev.prev.step !== prevStep || ev.prev.sha256 !== prevSha) {
      bad(`chain broken: '${prevStep}' changed after this step was recorded`);
    }

    const t = Date.parse(ev.recorded_at);
    if (Number.isNaN(t)) bad("invalid recorded_at");
    if (prevTime !== null && t < prevTime) bad("recorded before the previous step");

    console.log(`[PASS]    ${step}`);
    prevSha = r.sha;
    prevStep = step;
    prevTime = t;
  }

  console.log(`\nPhase ${phase} COMPLETED with full evidence.`);
  console.log("Next: update docs/HANDOFF.md and start a fresh session for the next Phase.");
  process.exit(0);
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
    default:
      return usage();
  }
}

main();
