#!/usr/bin/env node
/** Fail unless TREE_EXCLUDE is exactly the reviewed set. */
const fs = require("fs");
const path = require("path");

// The tree hash binds every tracked or untracked-but-not-ignored file except these patterns. Widening one
// (for example /^docs\// or /./) keeps the entry count unchanged but empties the guarantee, so the exact
// pattern text is frozen here. Changing it needs a reviewed edit of this list (see .github/CODEOWNERS).
const FROZEN = [
  String.raw`/^\.phase-evidence\//`,
  String.raw`/^\.claude\/\.verification\//`,
  String.raw`/^docs\/(compound-log|HANDOFF)\.md$/`,
  String.raw`/^docs\/attestations\//`,
  String.raw`/^dashboard\/status\.json$/`,
];

function extractLiterals(source) {
  const m = source.match(/const TREE_EXCLUDE = \[([\s\S]*?)\];/);
  if (!m) throw new Error("TREE_EXCLUDE not found");
  const body = m[1];
  const literals = [];
  // Walk real array elements, not lines: single-line and multi-line arrays are read the same way.
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (/\s|,/.test(ch)) continue;
    if (ch !== "/") throw new Error("TREE_EXCLUDE contains a non-regex element");
    const start = i;
    // A regex literal ends at an unescaped '/' (an even run of preceding backslashes).
    for (i++; i < body.length; i++) {
      if (body[i] === "/") {
        let backslashes = 0;
        for (let j = i - 1; j >= 0 && body[j] === "\\"; j--) backslashes++;
        if (backslashes % 2 === 0) break;
      }
    }
    let end = i + 1;
    while (end < body.length && /[a-z]/.test(body[end])) end++; // flags belong to the literal
    literals.push(body.slice(start, end));
    i = end - 1;
  }
  return literals;
}

function check(literals) {
  if (literals.length !== FROZEN.length || literals.some((l, i) => l !== FROZEN[i])) {
    return `TREE_EXCLUDE differs from the reviewed set.\n  found:    ${literals.join("  ")}\n  reviewed: ${FROZEN.join("  ")}\nReview the change, then update FROZEN in scripts/tree-exclude-check.js.`;
  }
  return null;
}

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  let literals;
  try {
    literals = extractLiterals(fs.readFileSync(path.join(root, ".claude/workflows/phase-gate.js"), "utf8"));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const problem = check(literals);
  if (problem) { console.error(problem); process.exit(1); }
  console.log(`TREE_EXCLUDE: ${literals.length}/${FROZEN.length} (exact reviewed set)`);
}

module.exports = { extractLiterals, check, FROZEN };
