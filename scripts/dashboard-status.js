#!/usr/bin/env node
/** Write dashboard/status.json from docs/PHASES.md headings. Not live evidence. */
const fs = require("fs");
const path = require("path");
const phasesFile = path.join("docs", "PHASES.md");
const out = path.join("dashboard", "status.json");
let text = "";
try { text = fs.readFileSync(phasesFile, "utf8"); } catch { text = ""; }
const phases = [];
for (const m of text.matchAll(/^### Phase\s+([A-Za-z0-9._-]+):\s*(.+)$/gm)) {
  phases.push({ id: m[1], title: m[2].trim(), evidence: 0, total: 5 });
}
fs.mkdirSync("dashboard", { recursive: true });
fs.writeFileSync(out, JSON.stringify(phases, null, 2));
console.log(`dashboard-status: ${phases.length} phases -> ${out}`);
