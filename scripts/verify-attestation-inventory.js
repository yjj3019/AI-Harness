#!/usr/bin/env node
"use strict";

// Protect the manifest and workflow. The gate replays a command from the attestation.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { ID_RE, REQUIRED_PHASES, parsePhases, parseRequiredPhases } = require("./phase-definition.js");

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

function basePolicy(root, sha) {
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error("invalid base commit SHA");
  const git = args => {
    const result = spawnSync("git", args, { cwd: root, timeout: 30_000 });
    if (result.error || result.status !== 0) throw new Error("cannot read required Phase policy at the PR base commit");
    return result.stdout;
  };
  if (!git(["ls-tree", sha, "--", REQUIRED_PHASES]).length) return []; // first adoption
  return parseRequiredPhases(git(["show", `${sha}:${REQUIRED_PHASES}`]));
}

function inventory(manifestPath, root, includeOptional = false, baseSha = "") {
  if (typeof manifestPath !== "string" || !manifestPath || manifestPath.startsWith("-")) {
    throw new Error("provide exactly one manifest path");
  }
  const phases = parseRequiredPhases(fs.readFileSync(manifestPath));
  if (baseSha) {
    for (const id of basePolicy(root, baseSha)) {
      if (!phases.includes(id)) throw new Error(`required Phase policy removes '${id}' from the PR base policy`);
    }
  }
  const valid = parsePhases(fs.readFileSync(path.join(root, "docs", "PHASES.md"), "utf8"));
  const dir = path.join(root, "docs", "attestations");
  let files;
  try {
    files = new Map(fs.readdirSync(dir, { withFileTypes: true }).map(entry => [entry.name, entry]));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    files = new Map();
  }
  const present = includeOptional
    ? [...files.keys()].filter(name => name.startsWith("phase-") && name.endsWith(".json")).map(name => name.slice(6, -5))
    : [];
  const selected = [...new Set([...phases, ...present])];
  if (selected.length > 256) throw new Error("at most 256 attestations may be replayed");
  for (const id of selected) {
    if (!ID_RE.test(id)) throw new Error(`invalid attestation phase ID: ${id}`);
    if (!valid.has(id)) throw new Error(`unknown phase ID: ${id}`);
    if (!files.get(`phase-${id}.json`)?.isFile()) {
      throw new Error(`missing or unreadable attestation for phase ${id}: expected a regular file`);
    }
  }
  return selected;
}

// root and gatePath are dependency injection for callers/tests, not CLI options.
function verifyInventory(manifestPath, { root = ROOT, gatePath = GATE, preflight = false, ciParity = false } = {}) {
  root = path.resolve(root);
  // ciParity selects the same phases as CI matrix discovery (required plus every committed attestation) and
  // replays them the way CI does (--require-pinned-command), so a local pass predicts the CI replay.
  const phases = inventory(manifestPath, root, ciParity);
  if (preflight) {
    for (const id of phases) console.log(`Phase ${id}: attestation file present (unverified).`);
    console.log(`Preflight: ${phases.length} required attestation file(s) present; attestations were not verified and no commands were run.`);
    return;
  }
  const replayTimeoutMs = replayTimeout();
  for (const id of phases) {
    console.log(`Verifying attestation for phase ${id}...`);
    // Leave time for the gate's own bounded replay, snapshots and cleanup.
    const result = spawnSync(process.execPath, [gatePath, "verify-attestation", id, ...(ciParity ? ["--require-pinned-command"] : [])], {
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
    if (args.length <= 2 && args[0] === "--matrix") {
      const phases = inventory(path.join(ROOT, REQUIRED_PHASES), ROOT, true, args[1]).sort();
      console.log(`phases=${JSON.stringify(phases)}`);
    } else {
      const preflight = args[0] === "--preflight";
      const ciParity = args[0] === "--ci-parity";
      if (args.length !== (preflight || ciParity ? 2 : 1)) throw new Error("provide exactly one manifest path");
      verifyInventory(args[preflight || ciParity ? 1 : 0], { preflight, ciParity });
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}\nUsage: node scripts/verify-attestation-inventory.js --matrix [<base-sha>] | [--preflight | --ci-parity] <manifest.json>`);
    process.exitCode = 1;
  }
}

module.exports = { verifyInventory };
