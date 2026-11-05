#!/usr/bin/env node
/**
 * Minimal skill audit for CI.
 * Scans skills/**\/SKILL.md for automatic-reject patterns.
 * Exit 0 if clean, 1 if findings.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const SKILLS = path.join(ROOT, "skills");

const REJECT = [
  { re: /ignore\s+(all\s+)?previous\s+instructions/i, why: "prompt injection" },
  { re: /curl[^|]*\|\s*(ba|z)?sh/i, why: "download piped to shell" },
  { re: /base64\s+-d/i, why: "obfuscated decode" },
  { re: /send\s+(api[_ ]?key|token|secret|\.env)/i, why: "secret exfiltration" },
  { re: /unrestricted\s+(shell|network|file)\s+access/i, why: "over-broad permission claim" },
  { re: /exfiltrate|steal\s+credentials/i, why: "exfiltration intent" },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) continue; // never follow links: a link to an ancestor would recurse without bound
    if (st.isDirectory()) walk(p, out);
    else if (name === "SKILL.md") out.push(p);
  }
  return out;
}

const files = walk(SKILLS);
const findings = [];

// License policy: the repository is Apache-2.0 (root LICENSE). A skill must either
// declare a license that matches that default or ship its own LICENSE.txt. Missing
// license metadata is a CI finding so third-party content cannot sit in the tree
// with an undeclared provenance (pattern mirrored from Anthropic skills frontmatter).
const DEFAULT_LICENSE = "Apache-2.0";

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return m ? m[1] : "";
}
function fmField(fm, key) {
  const m = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm);
  return m ? m[1].trim() : null;
}

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  // The audit skill documents the patterns; do not flag it.
  if (rel.startsWith("skills/skill-audit/")) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const { re, why } of REJECT) {
    if (re.test(text)) findings.push({ file: rel, why });
  }
  const lic = fmField(frontmatter(text), "license");
  if (!lic) {
    findings.push({ file: rel, why: "missing license: field (repo default " + DEFAULT_LICENSE + ")" });
  } else if (
    lic !== DEFAULT_LICENSE &&
    !fs.existsSync(path.join(path.dirname(file), "LICENSE.txt"))
  ) {
    findings.push({ file: rel, why: `license "${lic}" without a matching LICENSE.txt in the skill folder` });
  }
}

if (findings.length) {
  console.error("skill-audit: findings");
  for (const f of findings) console.error(`  ${f.file}: ${f.why}`);
  process.exit(1);
}
console.log(`skill-audit: ${files.length} skills clean`);
