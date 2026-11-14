"use strict";
// design-channel-check.js — deterministic static channel checks for design-omniskill.
// Commands:
//   node scripts/design-channel-check.js html <file.html>     static HTML/CSS layout hygiene
//   node scripts/design-channel-check.js code <file-or-dir>   token-scale scan of code
//   node scripts/design-channel-check.js evidence <channel> <evidence.json>  render-evidence contract
//   node scripts/design-channel-check.js scorecard <scorecard.json>        scorecard metric/UNKNOWN contract
// Exit 0 = clean, 1 = findings, 2 = usage/IO error. Heuristics are signals for
// review, not verdicts. Positive controls live in tests/design-channel-check.test.js.

const fs = require("node:fs");
const path = require("node:path");

const SCALE = new Set([1, 2, 4, 8, 12, 16, 24, 32, 48, 64]);
const OS_GAP = /\b(?:margin|padding|row-gap|column-gap|gap|inset)\s*:\s*(\d+(?:\.\d+)?)px/g;
const FONT_SIZE = /(?:font-size):\s*(\d+(?:\.\d+)?)px/g;
const HEX = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g;
const FAMILY = /font-family\s*:\s*([^;}]+)/g;
const INLINE_STYLE = /style\s*=\s*"([^"]*)"/g;
const IMG = /<img\b[^>]*>/g;

function hits(found) {
  return found.length ? found : null;
}

function checkHtml(file) {
  const text = fs.readFileSync(file, "utf8");
  const found = [];
  for (const m of text.matchAll(OS_GAP)) {
    const v = Number(m[1]);
    if (!SCALE.has(v)) found.push(`off-scale gap: ${m[0]} @${m.index}`);
  }
  for (const m of text.matchAll(FONT_SIZE)) {
    const v = Number(m[1]);
    if (v % 2 !== 0 || v < 10 || v > 96) found.push(`off-axis font-size: ${m[0]} @${m.index}`);
  }
  for (const m of text.matchAll(FAMILY)) {
    const fams = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (fams.length < 2) found.push(`single-family declaration: font-family: ${m[1].trim()} @${m.index}`);
  }
  for (const m of text.matchAll(INLINE_STYLE)) {
    if (/margin|padding|gap|width|height/.test(m[1])) found.push(`inline style: style="${m[1].slice(0, 40)}…" @${m.index}`);
  }
  for (const m of text.matchAll(IMG)) {
    if (!/alt\s*=/.test(m[0])) found.push(`missing alt: <img …> @${m.index}`);
  }
  return hits(found);
}

function checkCode(file) {
  const text = fs.readFileSync(file, "utf8");
  const found = [];
  for (const m of text.matchAll(OS_GAP)) {
    const v = Number(m[1]);
    if (!SCALE.has(v)) found.push(`off-scale gap: ${m[0]} @${m.index}`);
  }
  for (const m of text.matchAll(HEX)) {
    if (!/\bvar\(--/.test(text.slice(Math.max(0, m.index - 60), m.index))) {
      found.push(`bare color literal: ${m[0]} @${m.index}`);
    }
  }
  return hits(found);
}

const EVIDENCE_CONTRACT = {
  html: ["status", "engine", "input", "output", "width", "height", "sha256"],
  pdf: ["status", "engine", "input", "pdf", "raster", "width", "height", "sha256"],
  pptx: ["status", "engine", "input", "pdf", "raster", "width", "height", "sha256"],
  docx: ["status", "engine", "input", "pdf", "raster", "width", "height", "sha256"],
  image: ["status", "file", "width", "height", "format", "sha256"],
};

function checkEvidence(channel, file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const required = EVIDENCE_CONTRACT[channel] || [];
  const missing = required.filter((k) => !(k in data));
  const status = data.status;
  const okStatus = ["SUCCESS", "PARTIAL_SUCCESS", "FAILURE", "SKIPPED"].includes(status);
  const bad = [...missing.map((k) => `missing ${k}`), ...(!okStatus ? [`invalid status ${JSON.stringify(status)}`] : [])];
  return bad.length ? [`evidence contract (${channel}): ${bad.join(", ")}`] : null;
}

function checkScorecard(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const items = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(items)) return ["scorecard must be an array or { items: [...] }"];
  const bad = [];
  for (const it of items) {
    const label = it && typeof it.item === "string" ? it.item : "?";
    if (typeof label === "?" || !label) { bad.push("item label missing"); continue; }
    if (it.unknown === true) continue;               // UNKNOWN 명시 = 허용 (미검증은 UNKNOWN 표기 규율)
    if (typeof it.metric === "undefined" || it.metric === null || String(it.metric).trim() === "") bad.push(label + ": scorecard item without measured metric (set a metric or unknown: true)");
    if (typeof it.evidence !== "string" || !it.evidence) bad.push(label + ": scorecard item without evidence");
  }
  return bad.length ? bad : null;
}

function main() {
  const [cmd, arg, arg2] = process.argv.slice(2);
  if (cmd === "html" && arg) {
    const f = hits(checkHtml(arg) || []);
    if (f) { console.log(`design-channel-check ${cmd}:\n - ${f.join("\n - ")}`); process.exit(1); }
    console.log(`design-channel-check ${cmd}: clean`);
  } else if (cmd === "code" && arg) {
    const files = [];
    const push = (p) => { if (/\.(css|html|js|jsx|ts|tsx)$/.test(p)) files.push(p); };
    if (fs.statSync(arg).isDirectory()) {
      const walk = (d) => { for (const e of fs.readdirSync(d)) { const p = path.join(d, e); if (fs.statSync(p).isDirectory()) walk(p); else push(p); } };
      walk(arg);
    } else push(arg);
    const f = hits(files.flatMap((p) => (checkCode(p) || []).map((m) => `${path.relative(process.cwd(), p)}: ${m}`)));
    if (f) { console.log(`design-channel-check ${cmd}:\n - ${f.slice(0, 20).join("\n - ")}` + (f.length > 20 ? `\n - … ${f.length - 20} more` : "")); process.exit(1); }
    console.log(`design-channel-check ${cmd}: clean (${files.length} files)`);
  } else if (cmd === "evidence" && arg && arg2) {
    const f = hits(checkEvidence(arg, arg2) || []);
    if (f) { console.log(`design-channel-check evidence ${arg}: FAIL\n - ${f.join("\n - ")}`); process.exit(1); }
    console.log(`design-channel-check evidence ${arg}: ok`);
  } else if (cmd === "scorecard" && arg) {
    const data = JSON.parse(fs.readFileSync(arg, "utf8"));
    const f = hits(checkScorecard(arg) || []);
    if (f) { console.log(`design-channel-check scorecard: FAIL\n - ${f.join("\n - ")}`); process.exit(1); }
    console.log(`design-channel-check scorecard: ok (${(Array.isArray(data) ? data : data.items).length} items)`);
  } else {
    console.error("usage: design-channel-check.js html <file> | code <file-or-dir> | evidence <channel> <json> | scorecard <json>");
    process.exit(2);
  }
}

main();
