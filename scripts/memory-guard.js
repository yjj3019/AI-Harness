#!/usr/bin/env node
/**
 * Deterministic guard for distilled memory stores (the "dreaming" memory-distill style: small linked
 * _index.md wiki files). Dreams are LLM output: this guard is the deterministic check the LLM cannot
 * vouch for. Exit 1 on any error; exit 2 on usage errors.
 *
 * Checks (documented in README "Testing" section):
 *   1. `_index.md` must exist under the store root.
 *   2. Every `[[...]]` / `](...)` link inside a store file must resolve to a real file (relative to the
 *      file's directory or the store root); the target is stripped of `#anchor` and `.md`.
 *   3. Every memory file must carry a valid `date:` line (ISO 8601) when it records a fact (TTL-eligible
 *      policy: missing date => warning, `http`/link-only or `_index.md` exempt).
 *   4. Secret-shaped and coarse PII patterns on file content are errors (secret list mirrors
 *      scripts/secret-scan.js; PII: email-like tokens are flagged as warnings).
 * Refuses nothing at the store namespace level: this runs AFTER the dream on a read-only store.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SECRETS = [
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /glpat-[A-Za-z0-9_-]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /sk-[A-Za-z0-9]{16,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /npm_[A-Za-z0-9]{20,}/,
];
const PII_EMAIL = /\b[A-Za-z0-9._%+-]{2,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function main() {
  if (process.argv.length !== 3) {
    console.error("usage: node scripts/memory-guard.js <store-dir>");
    process.exit(2);
  }
  const root = path.resolve(process.argv[2]);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`memory-guard: ${root} is not a directory`);
    process.exit(2);
  }
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(path.join(root, "_index.md"))) errors.push("_index.md is missing at the store root");

  const known = new Map(walk(root).map((p) => [path.relative(root, p)]));
  for (const file of walk(root)) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");
    const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
    for (const re of SECRETS) if (re.test(body)) errors.push(`${rel}: secret-shaped pattern matched (${re})`);
    if (body.match(PII_EMAIL)) warnings.push(`${rel}: email-like token present (redact before dreaming)`);
    const links = [...body.matchAll(/\[\[([^\]|#]+)[^\]]*\]\]|\(([^)\s]+\.md[^)\s]*)\)/g)];
    for (const m of links) {
      const raw = (m[1] || m[2]).split("#")[0];
      const target = raw.endsWith(".md") ? raw : raw + ".md";
      if (!known.has(raw) && !known.has(target) && !fs.existsSync(path.join(path.dirname(file), target))) {
        errors.push(`${rel}: broken link -> ${raw}`);
      }
    }
    if (!body.match(/^\s*date:\s*\d{4}-\d{2}-\d{2}\b/m) && rel !== "_index.md") {
      warnings.push(rel + ": no ISO date: line (facts must be dated for TTL-aware supersede)");
    }
  }

  if (errors.length) {
    console.error("memory-guard: findings");
    for (const e of errors) console.error(`  [error] ${e}`);
    for (const w of warnings) console.error(`  [warn]  ${w}`);
    process.exit(1);
  }
  for (const w of warnings) console.error(`  [warn]  ${w}`);
  console.log(`memory-guard: ${known.size} files ok${warnings.length ? `, ${warnings.length} warnings` : ""}`);
}

main();
