#!/usr/bin/env node
/**
 * Minimal secret pattern scan for CI.
 * Looks for common hardcoded secret shapes. Exit 1 on findings.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKIP = new Set([".git", "node_modules", ".phase-evidence", "docs/attestations"]);
const PATTERNS = [
  { re: /AKIA[0-9A-Z]{16}/, why: "aws access key" },
  { re: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/, why: "private key" },
  { re: /ghp_[A-Za-z0-9]{30,}/, why: "github personal access token" },
  { re: /github_pat_[A-Za-z0-9_]{40,}/, why: "github fine-grained token" },
  { re: /glpat-[A-Za-z0-9_-]{20,}/, why: "gitlab token" },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/, why: "slack token" },
  { re: /sk-[A-Za-z0-9]{16,}/, why: "openai-style api key" },
  { re: /AIza[0-9A-Za-z_-]{30,}/, why: "google api key" },
  { re: /npm_[A-Za-z0-9]{20,}/, why: "npm token" },
  { re: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/i, why: "hardcoded credential" },
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) continue; // never follow links: a link to an ancestor would recurse without bound
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|py|sh|md|json|yml|yaml|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const findings = [];
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith("scripts/secret-scan.js")) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const { re, why } of PATTERNS) {
    if (re.test(text)) findings.push({ file: rel, why });
  }
}
if (findings.length) {
  console.error("secret-scan: findings");
  for (const f of findings) console.error(`  ${f.file}: ${f.why}`);
  process.exit(1);
}
console.log("secret-scan: clean");
