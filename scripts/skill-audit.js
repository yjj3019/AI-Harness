#!/usr/bin/env node
/**
 * Minimal skill audit for CI.
 * Scans skills/**\/SKILL.md for automatic-reject patterns.
 * Exit 0 if clean, 1 if findings.
 *
 * Pattern concepts: prompt-injection imperatives, piped installers, hidden/bidi
 * control characters, obfuscated code, credential references, over-broad claims.
 * Implemented with fresh logic (ideas-only; no third-party code). Patterns are
 * heuristics that flag exact token shapes — a finding is a signal for review,
 * not a verdict (mirrors the signal/claim distinction of external detectors).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const SKILLS = path.join(ROOT, "skills");

const REJECT = [
  // severity levels: a finding is a merge-blocking signal; severity grades the report.
  { re: /ignore\s+(all\s+)?previous\s+instructions/i, why: "prompt injection", sev: "CRITICAL" },
  { re: /(curl|wget)[^|\n]*\|\s*(ba|z|k)?sh\b/i, why: "download piped to shell", sev: "CRITICAL" },
  { re: /(iwr|irm)\s+[^|\n]*\|\s*(iex|invoke\s*-?\s*expression)/i, why: "powershell piped installer", sev: "CRITICAL" },
  { re: /[\u200B\u200C\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/, why: "hidden or bidi control character", sev: "HIGH" },
  { re: /\beval\s*\(|\bnew\s+Function\s*\(/, why: "obfuscated/dynamic code shape", sev: "HIGH" },
  { re: /do\s+not\s+tell\s+(the\s+)?(user|human)/i, why: "secrecy directive", sev: "HIGH" },
  { re: /you\s+must\s+(always\s+)?comply\s*[,.\n]/i, why: "coercion wording", sev: "HIGH" },
  { re: /send\s+(api[_ ]?key|token|secret|\.env)/i, why: "secret exfiltration", sev: "HIGH" },
  { re: /base64\s+-d/i, why: "obfuscated decode", sev: "HIGH" },
  { re: /unrestricted\s+(shell|network|file)\s+access/i, why: "over-broad permission claim", sev: "HIGH" },
  { re: /exfiltrate|steal\s+credentials/i, why: "exfiltration intent", sev: "HIGH" },
  { re: /api[_ ]?key\s*[:=]\s*["']?sk-|bearer\s+token\s*[:=]/i, why: "inline credential literal", sev: "HIGH" },
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

// Heuristic SPDX detection for the two texts used in this repository; unknown texts
// are not classified, so they never produce a false mismatch.
function detectLicenseIds(text) {
  const ids = [];
  if (/^\s*MIT License\b/im.test(text)) ids.push("MIT");
  if (/Apache License[\s\S]{0,40}Version 2\.0/i.test(text)) ids.push("Apache-2.0");
  return ids;
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
  } else {
    const shipped = ["LICENSE", "LICENSE.txt"]
      .map(name => path.join(path.dirname(file), name))
      .filter(p => fs.existsSync(p));
    if (lic !== DEFAULT_LICENSE && !shipped.length) {
      findings.push({ file: rel, why: `license "${lic}" without a matching LICENSE or LICENSE.txt in the skill folder` });
    }
    // A shipped license text must be named by the frontmatter, so a third-party
    // notice cannot sit beside a frontmatter that claims only the repository default.
    for (const p of shipped) {
      for (const id of detectLicenseIds(fs.readFileSync(p, "utf8"))) {
        if (!new RegExp(`(^|[^A-Za-z0-9.-])${id.replace(/\./g, "\\.")}($|[^A-Za-z0-9.-])`, "i").test(lic)) {
          findings.push({ file: rel, why: `frontmatter license "${lic}" does not name ${id}, which ${path.basename(p)} contains` });
        }
      }
    }
  }
}

const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
for (const f of findings) counts[f.sev || "MEDIUM"] += 1;

if (findings.length) {
  console.error("skill-audit: findings");
  for (const f of findings) console.error(`  [${f.sev || "MEDIUM"}] ${f.file}: ${f.why}`);
  console.error(
    `skill-audit: ${counts.CRITICAL} critical, ${counts.HIGH} high, ${counts.MEDIUM} medium — heuristics are signals for review, not verdicts`
  );
  process.exit(1);
}
console.log(`skill-audit: ${files.length} skills clean`);
