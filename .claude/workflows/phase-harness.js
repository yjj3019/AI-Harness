#!/usr/bin/env node
/**
 * Phase Harness Automation Script (Ralph Wiggum Loop)
 *
 * Workflow: coding → test → verify → review → compound
 * On FAIL or [BLOCKING]: retry coding (max 3 iterations)
 *
 * Enforcement:
 * - Validates phase name against docs/PHASES.md
 * - Each step must produce observable evidence (logs, artifacts, PASS/FAIL)
 * - verify and review are expected to run in isolated contexts
 * - After full PASS, recommends updating docs/HANDOFF.md and starting a fresh session
 *
 * Exit codes:
 *   0  — Phase completed with full evidence PASS
 *   1  — Usage error or invalid phase
 *   2  — Evidence missing or step failed (after retries exhausted)
 *   3  — Max retries exceeded
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const PHASES_FILE = path.join(ROOT, "docs", "PHASES.md");
const EVIDENCE_DIR = path.join(ROOT, ".phase-evidence");
const MAX_RETRIES = 3;

const STEPS = ["coding", "test", "verify", "review", "compound"];

function loadValidPhases() {
  if (!fs.existsSync(PHASES_FILE)) {
    console.error(`ERROR: ${PHASES_FILE} not found`);
    process.exit(1);
  }
  const content = fs.readFileSync(PHASES_FILE, "utf8");
  const phases = [];
  // Match headings like "### Phase 1: Title" or "### Phase N: Title"
  const re = /^###\s+Phase\s+([^\s:]+)/gim;
  let m;
  while ((m = re.exec(content)) !== null) {
    phases.push(m[1]);
  }
  return phases;
}

function evidencePath(phase, step) {
  return path.join(EVIDENCE_DIR, `phase-${phase}-${step}.json`);
}

function readEvidence(phase, step) {
  const p = evidencePath(phase, step);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function hasPassingEvidence(phase, step) {
  const ev = readEvidence(phase, step);
  if (!ev) return false;
  // Accept status PASS, APPROVED, or explicit pass:true
  const status = (ev.status || "").toUpperCase();
  return status === "PASS" || status === "APPROVED" || ev.pass === true;
}

function runPhase(phase) {
  console.log(`\n=== Phase ${phase} ===`);
  console.log(`Evidence directory: ${EVIDENCE_DIR}`);

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`\n--- Attempt ${attempt}/${MAX_RETRIES} ---`);

    let failedStep = null;

    for (const step of STEPS) {
      const ev = readEvidence(phase, step);
      const ok = hasPassingEvidence(phase, step);

      if (!ev) {
        console.log(`[MISSING] ${step}: no evidence file (${evidencePath(phase, step)})`);
        failedStep = step;
        break;
      }
      if (!ok) {
        console.log(`[FAIL]    ${step}: status=${ev.status || "unknown"}`);
        failedStep = step;
        break;
      }
      console.log(`[PASS]    ${step}: ${ev.status || "ok"}`);
    }

    if (!failedStep) {
      console.log(`\nPhase ${phase} COMPLETED with full evidence.`);
      console.log("Next: update docs/HANDOFF.md and start a fresh session for the next Phase.");
      process.exit(0);
    }

    // Evidence gate failed
    if (attempt >= MAX_RETRIES) {
      console.error(`\nMax retries (${MAX_RETRIES}) exceeded. Failed at step: ${failedStep}`);
      process.exit(3);
    }

    console.log(`Evidence gate failed at '${failedStep}'. Retrying coding...`);
    // In a real harness this would invoke the coding agent again.
    // Here we simply loop; the caller (or human) is expected to produce new evidence.
  }

  process.exit(2);
}

function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error("Usage: node phase-harness.js <phase>");
    console.error("Example: node phase-harness.js 1");
    process.exit(1);
  }

  const validPhases = loadValidPhases();
  console.log("Initializing Phase Harness Workflow...");
  console.log(`Valid phases from PHASES.md: ${validPhases.length ? validPhases.join(", ") : "(none defined)"}`);

  if (!validPhases.includes(arg)) {
    console.error(`ERROR: invalid phase '${arg}'. Valid phases: ${validPhases.join(", ") || "(none)"}`);
    process.exit(1);
  }

  runPhase(arg);
}

main();
