#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ID_RE, REQUIRED_PHASES, parsePhases, parseRequiredPhases, hasStrictAttestationFlags } = require("./phase-definition.js");

function optional(read, fallback) {
  try { return read(); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

const phasesFile = path.join("docs", "PHASES.md");
const attestDir = path.join("docs", "attestations");
const out = path.join("dashboard", "status.json");
const definitions = parsePhases(optional(() => fs.readFileSync(phasesFile, "utf8"), ""));
const required = new Set(optional(() => parseRequiredPhases(fs.readFileSync(REQUIRED_PHASES)), []));
const phases = new Map([...definitions].map(([id, title]) => [id, { id, title, attestation: "missing" }]));

for (const entry of optional(() => fs.readdirSync(attestDir, { withFileTypes: true }), [])) {
  const match = /^phase-(.+)\.json$/.exec(entry.name);
  if (!match || !ID_RE.test(match[1])) continue;
  const id = match[1];
  let attestation = "invalid";
  if (entry.isFile()) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(attestDir, entry.name), "utf8"));
      if (data?.schema === 1 && String(data.phase) === id && typeof data.tree === "string" &&
          /^[a-f0-9]{64}$/.test(data.tree) && Array.isArray(data.argv) && data.argv.length > 0 &&
          data.argv.every(arg => typeof arg === "string") && data.argv[0] &&
          (!required.has(id) || hasStrictAttestationFlags(data))) attestation = "unverified";
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  phases.set(id, { id, title: definitions.get(id) ?? "(attestation only)", attestation });
}

const next = JSON.stringify([...phases.values()], null, 2);
const previous = optional(() => fs.readFileSync(out, "utf8").replace(/\r\n/g, "\n"), null);
if (process.argv.includes("--force") || previous !== next) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = out + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, next, { flag: "wx" });
  try { fs.renameSync(tmp, out); }
  finally { optional(() => fs.unlinkSync(tmp)); }
}
console.log(`dashboard-status: ${phases.size} phases -> ${out}`);
