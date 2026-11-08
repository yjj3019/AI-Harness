#!/usr/bin/env node
/**
 * Evidence redaction guard (fail-closed): scans files for secret-shaped tokens before
 * they are written to evidence, handoff docs, or compound logs. Exit 0 only when the
 * input is clean; exit 1 with a redacted preview otherwise so a gate step can refuse
 * ("did not run") rather than record secrets.
 *
 * Implemented from scratch in this repository; the token families mirror the same
 * well-known formats also covered by scripts/secret-scan.js. This script does not
 * modify any file: it reports, the caller decides.
 *
 * usage: node scripts/evidence-redact.js <file...>
 */
"use strict";
const fs = require("fs");

const PATTERNS = [
  { re: /AKIA[0-9A-Z]{16}/g, label: "AWS access key" },
  { re: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/g, label: "private key" },
  { re: /ghp_[A-Za-z0-9]{30,}/g, label: "GitHub PAT (ghp_)" },
  { re: /github_pat_[A-Za-z0-9_]{40,}/g, label: "GitHub PAT (github_pat_)" },
  { re: /glpat-[A-Za-z0-9_-]{20,}/g, label: "GitLab PAT" },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, label: "Slack token" },
  { re: /sk-[A-Za-z0-9]{16,}/g, label: "OpenAI-style key" },
  { re: /AIza[0-9A-Za-z_-]{30,}/g, label: "Google API key" },
  { re: /npm_[A-Za-z0-9]{20,}/g, label: "npm token" },
];

function scan(text) {
  const hits = [];
  for (const { re, label } of PATTERNS) {
    for (const m of text.matchAll(re)) hits.push({ label, sample: m[0].replace(/[A-Za-z0-9_-]{8,}$/, "...<redacted>") });
  }
  return hits;
}

function main() {
  if (process.argv.length < 3) {
    console.error("usage: node scripts/evidence-redact.js <file...>");
    process.exit(2);
  }
  const findings = [], errors = [];
  for (const arg of process.argv.slice(2)) {
    let text;
    try { text = fs.readFileSync(arg, "utf8"); }
    catch (error) { errors.push({ file: arg, code: error.code || "IO_ERROR" }); continue; }
    for (const hit of scan(text)) findings.push({ file: arg, ...hit });
  }
  if (errors.length) {
    console.error("evidence-redact: scan incomplete; do not record this content");
    for (const error of errors) console.error(`  ${error.file}: cannot read file (${error.code})`);
  }
  if (findings.length) {
    console.error("evidence-redact: secrets detected — do not record this content");
    for (const f of findings) console.error(`  ${f.file}: ${f.label} (${f.sample})`);
  }
  if (errors.length) process.exitCode = 2;
  else if (findings.length) process.exitCode = 1;
  else console.log(`evidence-redact: clean (${process.argv.length - 2} file(s))`);
}

if (require.main === module) main();
module.exports = { scan, main };
