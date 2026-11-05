#!/usr/bin/env node
/**
 * Write dashboard/status.json from docs/PHASES.md and docs/attestations/.
 * Evidence count comes from attestation files when present; otherwise 0.
 * Not a live runtime view — regenerate after attestations change.
 */
const fs = require("fs");
const path = require("path");

const phasesFile = path.join("docs", "PHASES.md");
const attestDir = path.join("docs", "attestations");
const out = path.join("dashboard", "status.json");
const STEPS = 5;

let text = "";
try { text = fs.readFileSync(phasesFile, "utf8"); } catch { text = ""; }

const phases = [];
for (const m of text.matchAll(/^### Phase\s+([A-Za-z0-9._-]+):\s*(.+)$/gm)) {
  if (m[1] === "<id>") continue;
  phases.push({ id: m[1], title: m[2].trim(), evidence: 0, total: STEPS });
}

if (fs.existsSync(attestDir)) {
  for (const name of fs.readdirSync(attestDir)) {
    const m = name.match(/^phase-(.+)\.json$/);
    if (!m) continue;
    const id = m[1];
    const hit = phases.find((p) => p.id === id);
    if (hit) hit.evidence = STEPS;
    else phases.push({ id, title: "(attestation only)", evidence: STEPS, total: STEPS });
  }
}

fs.mkdirSync("dashboard", { recursive: true });
fs.writeFileSync(out, JSON.stringify(phases, null, 2));
console.log(`dashboard-status: ${phases.length} phases -> ${out}`);
