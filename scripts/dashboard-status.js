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

// 1.2.0 증분 갱신: 소스(PHASES.md·attestations)가 출력보다 오래되지 않았으면 스킵 (실측 근거:
// 생성 1.5s/회 — 스폰 2.3s 계수 지배. --force로 강제 재생성).
if (!process.argv.includes("--force")) {
  let newest = 0;
  try { newest = fs.statSync(phasesFile).mtimeMs; } catch { newest = 0; }
  if (fs.existsSync(attestDir)) {
    for (const name of fs.readdirSync(attestDir)) {
      const s = fs.statSync(path.join(attestDir, name)).mtimeMs;
      if (s > newest) newest = s;
    }
  }
  let outMtime = -1;
  try { outMtime = fs.statSync(out).mtimeMs; } catch { /* first run */ }
  if (newest > 0 && outMtime >= newest) {
    console.log(`dashboard-status: up-to-date (소스 미변경). --force로 강제 재생성`);
    process.exit(0);
  }
}

// Mirror phase-gate.js and verify-attestation-inventory.js: a phase id is the first
// non-whitespace, non-colon token; the title after ": " is optional there, so a
// colon-less heading must not silently vanish from the dashboard.
const PHASE_RE = /^###\s+Phase\s+([^\s:]+)/gm;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

let text = "";
try { text = fs.readFileSync(phasesFile, "utf8"); } catch { text = ""; }

const phases = new Map();
for (const m of text.matchAll(PHASE_RE)) {
  if (m[1] === "<id>") continue;
  if (!ID_RE.test(m[1])) continue;
  const line = text.slice(m.index).split(/\r?\n/, 1)[0];
  const title = (line.split(":", 2)[1] || "").trim();
  phases.set(m[1], { id: m[1], title, evidence: 0, total: STEPS });
}

if (fs.existsSync(attestDir)) {
  for (const name of fs.readdirSync(attestDir)) {
    const m = name.match(/^phase-(.+)\.json$/);
    if (!m) continue;
    const id = m[1];
    if (!ID_RE.test(id)) continue;
    const hit = phases.get(id);
    if (hit) hit.evidence = STEPS;
    else phases.set(id, { id, title: "(attestation only)", evidence: STEPS, total: STEPS });
  }
}

fs.mkdirSync("dashboard", { recursive: true });
// Atomic write: a reader never observes a truncated status.json.
const tmp = out + ".tmp-" + process.pid;
fs.writeFileSync(tmp, JSON.stringify([...phases.values()], null, 2));
fs.renameSync(tmp, out);
console.log(`dashboard-status: ${phases.size} phases -> ${out}`);
