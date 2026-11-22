#!/usr/bin/env node
"use strict";
// Gate for the output of `node --test`: exit code 0 alone is not enough. Empty test files and suites that skip
// themselves away both exit 0, so the summary must show a minimum of executed tests and a maximum of skipped ones.
// Usage: node scripts/test-summary-gate.js <captured-output-file> <min-tests> <max-skipped>
const fs = require("node:fs");
const path = require("node:path");
const { inspectTestSummary } = require(path.join(__dirname, "..", ".claude", "workflows", "test-summary.js"));

function gate(output, minTests, maxSkipped) {
  const r = inspectTestSummary(output, true);
  if (!r.ok) return { ok: false, message: "node test summary rejected: " + JSON.stringify(r) };
  if (r.total < minTests) return { ok: false, message: `node test summary rejected: ${r.total} tests ran, minimum tests ${minTests}` };
  if (r.skipped > maxSkipped) return { ok: false, message: `node test summary rejected: ${r.skipped} skipped, maximum skipped ${maxSkipped}` };
  return { ok: true, message: `test summary: ${r.passed} passed, ${r.skipped} skipped of ${r.total} (minimum ${minTests}, maximum skipped ${maxSkipped})` };
}

if (require.main === module) {
  const [file, minTests, maxSkipped] = process.argv.slice(2);
  const min = Number(minTests), max = Number(maxSkipped);
  if (!file || !Number.isInteger(min) || min < 0 || !Number.isInteger(max) || max < 0) {
    console.error("usage: node scripts/test-summary-gate.js <captured-output-file> <min-tests> <max-skipped>");
    process.exit(2);
  }
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch (error) { console.error("ERROR: cannot read " + file + ": " + error.message); process.exit(2); }
  const result = gate(text, min, max);
  (result.ok ? console.log : console.error)(result.ok ? result.message : "ERROR: " + result.message);
  process.exit(result.ok ? 0 : 1);
}

module.exports = { gate };
