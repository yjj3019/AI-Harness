#!/usr/bin/env node
/**
 * Minimal secret pattern scan for CI.
 * Looks for common hardcoded secret shapes. Exit 1 on findings.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, ".."));
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
  // Unquoted YAML/env scalars; a constrained URL/base64-like value grammar avoids prose matches.
  { re: /^\s*(api[_-]?key|secret|password|token)\s*[:=]\s*(?!(?:placeholder|example|dummy|changeme|change-me|replace-me|your-api-key-here)(?:[^\s#]*\s|\s|#|$))[^\s#]{8,}\s*(?:#.*)?$/im, why: "hardcoded credential (unquoted)" },
];

// Where credentials usually live: more than source and docs. A committed .env, key or config file is the common leak.
const SCANNED_EXT = /\.(js|py|sh|md|json|yml|yaml|ts|toml|cfg|ini|conf|env|pem|key|crt|txt|properties|tf|tfvars)$/i;
const SCANNED_NAME = /^(\.env(\..*)?|\.npmrc|\.netrc|\.pypirc|id_rsa|id_dsa|id_ecdsa|id_ed25519|credentials)$/i;

function scan(root) {
  const findings = [], errors = [];
  const files = [];
  function walk(dir) {
    let names;
    try { names = fs.readdirSync(dir); }
    catch (error) { errors.push(`${path.relative(root, dir) || "."}: cannot list path (${error.code || error.message})`); return; }
    for (const name of names) {
      const p = path.join(dir, name);
      // SKIP holds names and repo-relative paths (docs/attestations); a bare name never matched a nested path.
      if (SKIP.has(name) || SKIP.has(path.relative(root, p).split(path.sep).join("/"))) continue;
      let st;
      try { st = fs.lstatSync(p); }
      catch (error) { errors.push(`${path.relative(root, p)}: cannot inspect path (${error.code || error.message})`); continue; }
      if (st.isSymbolicLink()) continue; // never follow links: a link to an ancestor would recurse without bound
      if (st.isDirectory()) walk(p);
      else if (SCANNED_EXT.test(name) || SCANNED_NAME.test(name)) files.push(p);
    }
  }
  walk(root);
  for (const file of files) {
    const rel = path.relative(root, file);
    if (rel.split(path.sep).join("/") === "scripts/secret-scan.js") continue;
    let text;
    try { text = fs.readFileSync(file, "utf8"); }
    catch (error) { errors.push(`${rel}: cannot read file (${error.code || error.message})`); continue; }
    for (const { re, why } of PATTERNS) {
      if (re.test(text)) findings.push({ file: rel, why });
    }
  }
  return { findings, errors };
}

let rootStat;
try { rootStat = fs.statSync(ROOT); }
catch (error) {
  console.error(`secret-scan: cannot access root: ${error.code || error.message}`);
  process.exit(2);
}
if (!rootStat.isDirectory()) {
  console.error(`secret-scan: root is not a directory: ${ROOT}`);
  process.exit(2);
}
const { findings, errors } = scan(ROOT);
if (errors.length) {
  console.error("secret-scan: scan incomplete");
  for (const error of errors) console.error(`  ${error}`);
}
if (findings.length) {
  console.error("secret-scan: findings");
  for (const f of findings) console.error(`  ${f.file}: ${f.why}`);
}
if (errors.length) process.exit(2);
if (findings.length) process.exit(1);
console.log("secret-scan: clean");
module.exports = { scan };
