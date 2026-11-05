#!/usr/bin/env node
/** Fail if TREE_EXCLUDE grows beyond the reviewed set. */
const fs = require("fs");
const text = fs.readFileSync(".claude/workflows/phase-gate.js", "utf8");
const m = text.match(/const TREE_EXCLUDE = \[([\s\S]*?)\];/);
if (!m) { console.error("TREE_EXCLUDE not found"); process.exit(1); }
const entries = m[1].split("\n").filter((l) => l.trim().startsWith("/"));
const MAX = 4;
if (entries.length > MAX) {
  console.error(`TREE_EXCLUDE has ${entries.length} entries (max ${MAX}). Review before extending.`);
  process.exit(1);
}
console.log(`TREE_EXCLUDE: ${entries.length}/${MAX}`);
