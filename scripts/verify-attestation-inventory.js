#!/usr/bin/env node
"use strict";

// This is an opt-in completeness check, not authority or authentication. Protect
// the manifest and workflow: the real gate replays an attested arbitrary command.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { TextDecoder } = require("node:util");

const ROOT = path.resolve(__dirname, "..");
const GATE = path.join(ROOT, ".claude", "workflows", "phase-gate.js");
const DEFAULT_TEST_TIMEOUT_MS = 150 * 60 * 1000;
const REPLAY_OVERHEAD_MS = 2 * 60 * 1000;

function replayTimeout() {
  const raw = process.env.PHASE_GATE_TEST_TIMEOUT_MS;
  const inner = raw === undefined ? DEFAULT_TEST_TIMEOUT_MS : Number(raw);
  if (!Number.isSafeInteger(inner) || inner < 1 || inner > 24 * 60 * 60 * 1000) {
    throw new Error("PHASE_GATE_TEST_TIMEOUT_MS must be an integer from 1 to 86400000");
  }
  return inner + REPLAY_OVERHEAD_MS;
}

// root and gatePath are dependency injection for callers/tests, not CLI options.
function verifyInventory(manifestPath, { root = ROOT, gatePath = GATE, preflight = false } = {}) {
  if (typeof manifestPath !== "string" || !manifestPath || manifestPath.startsWith("-")) {
    throw new Error("provide exactly one manifest path");
  }
  root = path.resolve(root);
  let phases;
  try {
    const bytes = fs.readFileSync(manifestPath);
    phases = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch (err) {
    throw new Error(`cannot read valid manifest JSON: ${err.message}`);
  }
  if (!Array.isArray(phases) || phases.length === 0 ||
      !phases.every((id) => typeof id === "string" && /^[A-Za-z0-9._-]+$/.test(id) && id !== "." && id !== "..") ||
      new Set(phases).size !== phases.length) {
    throw new Error("manifest must be a nonempty array of unique valid phase IDs");
  }
  // Mirror the gate's phase-list parsing so unknown IDs fail before any replay.
  const content = fs.readFileSync(path.join(root, "docs", "PHASES.md"), "utf8").replace(/```[\s\S]*?```/g, "");
  const valid = new Set();
  const re = /^###\s+Phase\s+([^\s:]+)/gim;
  let match;
  while ((match = re.exec(content)) !== null) {
    if (/^[A-Za-z0-9._-]+$/.test(match[1])) valid.add(match[1]);
  }
  for (const id of phases) {
    if (!valid.has(id)) throw new Error(`unknown phase ID: ${id}`);
    const file = path.join(root, "docs", "attestations", `phase-${id}.json`);
    try {
      if (!fs.statSync(file).isFile()) throw new Error("not a regular file");
    } catch (err) {
      throw new Error(`missing or unreadable attestation for phase ${id}: ${err.message}`);
    }
  }
  if (preflight) {
    for (const id of phases) console.log(`Phase ${id}: attestation file present (unverified).`);
    console.log(`Preflight: ${phases.length} required attestation file(s) present; attestations were not verified and no commands were run.`);
    return;
  }
  const replayTimeoutMs = replayTimeout();
  for (const id of phases) {
    console.log(`Verifying attestation for phase ${id}...`);
    // Leave time for the gate's own bounded replay, snapshots and cleanup.
    const result = spawnSync(process.execPath, [gatePath, "verify-attestation", id], {
      cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root }, stdio: "inherit", shell: false,
      timeout: replayTimeoutMs,
    });
    if (result.error && result.error.code === "ETIMEDOUT") throw new Error(`phase ${id} verification timed out after ${replayTimeoutMs}ms; descendant cleanup is not guaranteed`);
    if (result.error) throw new Error(`phase ${id} verification could not start: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`phase ${id} verification failed (${result.signal || `exit ${result.status}`})`);
  }
  console.log(`Verified ${phases.length} required attestation(s).`);
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const preflight = args[0] === "--preflight";
    if (args.length !== (preflight ? 2 : 1)) throw new Error("provide exactly one manifest path");
    verifyInventory(args[preflight ? 1 : 0], { preflight });
  } catch (err) {
    const usage = process.argv[2] === "--preflight" ? "[--preflight] <manifest.json>" : "<manifest.json>";
    console.error(`ERROR: ${err.message}\nUsage: node scripts/verify-attestation-inventory.js ${usage}`);
    process.exitCode = 1;
  }
}

module.exports = { verifyInventory };
