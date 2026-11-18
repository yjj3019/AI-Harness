#!/usr/bin/env node
/** Fail if TREE_EXCLUDE grows beyond the reviewed set. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const text = fs.readFileSync(path.join(root, ".claude/workflows/phase-gate.js"), "utf8");
const m = text.match(/const TREE_EXCLUDE = \[([\s\S]*?)\];/);
if (!m) { console.error("TREE_EXCLUDE not found"); process.exit(1); }
// Count real array elements, not lines: single-line arrays and multi-line arrays
// must both be counted by element boundaries (',' outside a regex literal).
let entries = 0;
for (let i = 0; i < m[1].length; i++) {
  let ch = m[1][i];
  if (/\s|,/.test(ch)) continue;
  if (ch !== "/") { console.error("TREE_EXCLUDE contains a non-regex element"); process.exit(1); }
  entries++;
  // Advance past the regex literal: an unescaped closing '/' ends it. A regex body
  // may contain '\/' escapes and character classes, so only a '/' not preceded by
  // an odd run of backslashes closes the literal.
  for (i++; i < m[1].length; i++) {
    if (m[1][i] === "/") {
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && m[1][j] === "\\"; j--) backslashes++;
      if (backslashes % 2 === 0) break;
    }
  }
}
const MAX = 5;
if (entries > MAX) {
  console.error(`TREE_EXCLUDE has ${entries} entries (max ${MAX}). Review before extending.`);
  process.exit(1);
}
console.log(`TREE_EXCLUDE: ${entries}/${MAX}`);
