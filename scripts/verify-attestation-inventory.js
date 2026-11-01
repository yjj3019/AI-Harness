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

// root and gatePath are dependency injection for callers/tests, not CLI options.
function verifyInventory(manifestPath, { root = ROOT, gatePath = GATE } = {}) {
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
  for (const id of phases) {
    console.log(`Verifying attestation for phase ${id}...`);
    const result = spawnSync(process.execPath, [gatePath, "verify-attestation", id], {
      cwd: root, env: { ...process.env, PHASE_GATE_ROOT: root }, stdio: "inherit", shell: false,
    });
    if (result.error) throw new Error(`phase ${id} verification could not start: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`phase ${id} verification failed (${result.signal || `exit ${result.status}`})`);
  }
  console.log(`Verified ${phases.length} required attestation(s).`);
}

if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error("provide exactly one manifest path");
    verifyInventory(process.argv[2]);
  } catch (err) {
    console.error(`ERROR: ${err.message}\nUsage: node scripts/verify-attestation-inventory.js <manifest.json>`);
    process.exitCode = 1;
  }
}

module.exports = { verifyInventory };
