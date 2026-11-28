#!/usr/bin/env node
/**
 * Minimal secret and personal-data scan for CI.
 * Looks for common hardcoded secret shapes, mailbox addresses and (locally) a private list of
 * sensitive terms. Exit 1 on findings.
 * Also rejects encrypted files (a host-side agent can rewrite Office/PDF files in a
 * working tree; the encrypted bytes are unusable and must never be committed).
 */
const fs = require("fs");
const path = require("path");

const SKIP = new Set([".git", "node_modules", ".phase-evidence", "docs/attestations"]);
// Token shapes shared with scripts/evidence-redact.js (it imports this list, so the two cannot drift).
const TOKEN_PATTERNS = [
  { re: /(?:AKIA|ASIA)[0-9A-Z]{16}/, why: "aws access key" },
  { re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/, why: "private key" },
  { re: /gh[pousr]_[A-Za-z0-9]{30,}/, why: "github token" },
  { re: /github_pat_[A-Za-z0-9_]{40,}/, why: "github fine-grained token" },
  { re: /glpat-[A-Za-z0-9_-]{20,}/, why: "gitlab token" },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/, why: "slack token" },
  { re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]{20,}/, why: "slack webhook url" },
  { re: /sk-(?:ant|proj|svcacct|admin)-[A-Za-z0-9_-]{20,}/, why: "provider api key" },
  { re: /sk-[A-Za-z0-9]{16,}/, why: "openai-style api key" },
  { re: /(?:sk|rk)_live_[A-Za-z0-9]{16,}/, why: "payment provider live key" },
  { re: /hf_[A-Za-z0-9]{30,}/, why: "model hub token" },
  { re: /AIza[0-9A-Za-z_-]{30,}/, why: "google api key" },
  { re: /npm_[A-Za-z0-9]{20,}/, why: "npm token" },
];
const PATTERNS = [
  ...TOKEN_PATTERNS,
  { re: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/i, why: "hardcoded credential" },
  // Unquoted YAML/env scalars; a constrained URL/base64-like value grammar avoids prose matches.
  { re: /^\s*(api[_-]?key|secret|password|token)\s*[:=]\s*(?!(?:placeholder|example|dummy|changeme|change-me|replace-me|your-api-key-here)(?:[^\s#]*\s|\s|#|$))[^\s#]{8,}\s*(?:#.*)?$/im, why: "hardcoded credential (unquoted)" },
];

// Every text file is scanned, whatever its name: an allowlist of extensions left HTML, .cjs, .log and
// template files unread. A file counts as text when its first block has no NUL byte; larger files are
// read up to the cap (a credential is short, and a text file above 5 MB is not source).
const SNIFF_BYTES = 8192;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;

// Personal data. A real mailbox must not be committed; only addresses that cannot belong to a person pass.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const SAFE_EMAIL_DOMAIN = /(^|\.)(example\.(com|org|net)|invalid|test|example|localhost)$|^users\.noreply\.github\.com$/i;
const SAFE_EMAIL = new Set(["noreply@anthropic.com", "noreply@github.com", "git@github.com"]);
function personalEmails(text) {
  let count = 0;
  for (const hit of text.matchAll(EMAIL)) {
    const address = hit[0].toLowerCase();
    const domain = address.slice(address.lastIndexOf("@") + 1);
    if (SAFE_EMAIL.has(address) || SAFE_EMAIL_DOMAIN.test(domain)) continue;
    // `scheme://user:secret@host` is URL userinfo, not a mailbox (the credential patterns own that case).
    if (/:\/\/[^\s/@]*:$/.test(text.slice(Math.max(0, hit.index - 200), hit.index))) continue;
    count++;
  }
  return count;
}

// A private, never-committed list of terms that must not appear in this repository (a real name, a customer,
// a host name). One literal term per line in .git/info/sensitive-terms.txt; "#" starts a comment. The file
// lives inside .git, so it cannot be committed and is outside the tree hash. A finding names the line number,
// never the term. HARNESS_SENSITIVE_TERMS_FILE overrides the location (used by tests).
function loadLocalTerms(root) {
  const file = process.env.HARNESS_SENSITIVE_TERMS_FILE || path.join(root, ".git", "info", "sensitive-terms.txt");
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); } catch { return []; }
  return raw.split(/\r?\n/).map((line, index) => ({ term: line.trim().toLowerCase(), line: index + 1 }))
    .filter((entry) => entry.term.length >= 2 && !entry.term.startsWith("#"));
}

// Header written by the host agent at the start of an encrypted file. Checked on every file, not only
// by extension, because the agent rewrites Office, PDF and image files alike. Built from parts so the
// vendor name is not spelled out in the source.
const DRM_MARKER = ["<##", "NAS" + "CA", "DR" + "M", "FILE"].join(" ");

function hasDrmHeader(file) {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(DRM_MARKER.length);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    return n === buf.length && buf.toString("latin1") === DRM_MARKER;
  } finally { fs.closeSync(fd); }
}

// The text of a file, or null when it is binary.
function readText(file) {
  const fd = fs.openSync(file, "r");
  try {
    const size = Math.min(fs.fstatSync(fd).size, MAX_TEXT_BYTES);
    const buf = Buffer.alloc(size);
    let got = 0;
    while (got < size) {
      const n = fs.readSync(fd, buf, got, size - got, got);
      if (!n) break;
      got += n;
    }
    const data = buf.subarray(0, got);
    return data.subarray(0, SNIFF_BYTES).includes(0) ? null : data.toString("utf8");
  } finally { fs.closeSync(fd); }
}

function scan(root) {
  const findings = [], errors = [];
  const everyFile = [];
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
      else if (st.isFile()) everyFile.push(p);
    }
  }
  walk(root);
  const terms = loadLocalTerms(root);
  for (const file of everyFile) {
    const rel = path.relative(root, file);
    const relPosix = rel.split(path.sep).join("/");
    try { if (hasDrmHeader(file)) findings.push({ file: rel, why: "DRM-encrypted file (must not be committed)" }); }
    catch (error) { errors.push(`${rel}: cannot read file header (${error.code || error.message})`); continue; }
    for (const { term, line } of terms) {
      // The path itself holds the term, so only its directory is printed.
      if (relPosix.toLowerCase().includes(term)) findings.push({ file: `${path.dirname(relPosix).toLowerCase().includes(term) ? "." : path.dirname(relPosix)}/<name withheld>`, why: `local sensitive term #${line} in a path` });
    }
    if (relPosix === "scripts/secret-scan.js") continue;
    let text;
    try { text = readText(file); }
    catch (error) { errors.push(`${rel}: cannot read file (${error.code || error.message})`); continue; }
    if (text === null) continue;
    for (const { re, why } of PATTERNS) {
      if (re.test(text)) findings.push({ file: rel, why });
    }
    const emails = personalEmails(text);
    if (emails) findings.push({ file: rel, why: `email address (${emails}); use a noreply or example.invalid address` });
    if (terms.length) {
      const lower = text.toLowerCase();
      for (const { term, line } of terms) {
        if (lower.includes(term)) findings.push({ file: rel, why: `local sensitive term #${line}` });
      }
    }
  }
  return { findings, errors };
}

if (require.main === module) {
  const ROOT = path.resolve(process.argv[2] || path.join(__dirname, ".."));
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
}
module.exports = { scan, TOKEN_PATTERNS, personalEmails };
