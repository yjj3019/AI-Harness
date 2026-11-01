"use strict";
// Manual, local PoC: node scripts/mutation-probe.js. Not a sandbox or CI gate.
// Runs only the fixed test-summary suite and fixed mutations, on disposable copies.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const source = ".claude/workflows/test-summary.js";
const suite = "tests/test-summary.test.js";
// The timeout does not ensure termination of descendant processes.
const timeout = 30000;
const mutations = [
  { name: "zero-and-all-skipped", from: "total > 0 && passed > 0", to: "total >= 0 && passed >= 0" },
  { name: "incomplete-counts", from: "sum === total", to: "true" },
  { name: "ignore-failure-block", from: "summaries.find(summary => !summary.ok)", to: "summaries.find(summary => false)" },
];

function replaceOnce(text, from, to) {
  if (!from || from === to) throw new Error("invalid replacement");
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) !== -1) throw new Error("mutation must match exactly once");
  return text.slice(0, at) + to + text.slice(at + from.length);
}
function hash(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function verifyAndCleanup(parent, verify) {
  try { return verify(); }
  finally { fs.rmSync(parent, { recursive: true, force: true }); }
}

// Fail closed: only Node TAP testCodeFailure/ERR_ASSERTION diagnostics count as kills.
// This is evidence from a trusted local runner, not protection against forged TAP.
function classify(result) {
  if (result.error || result.signal || !Number.isInteger(result.status)) return "error";
  const text = String(result.stdout || "");
  if (result.stderr || !/^TAP version 13\s*$/m.test(text)) return "error";
  function count(key) {
    const matches = [...text.matchAll(new RegExp(`^# ${key} (\\d+)\\s*$`, "gm"))];
    return matches.length === 1 ? Number(matches[0][1]) : NaN;
  }
  const tests = count("tests"), pass = count("pass"), fail = count("fail");
  const skipped = count("skipped"), cancelled = count("cancelled"), todo = count("todo");
  if (![tests, pass, fail, skipped, cancelled, todo].every(Number.isSafeInteger) ||
      tests <= 0 || skipped !== 0 || cancelled !== 0 || todo !== 0 || pass + fail !== tests) return "error";
  const failedLines = [...text.matchAll(/^not ok \d+ - /gm)].length;
  const testFailures = [...text.matchAll(/^\s*failureType: ['"]?testCodeFailure['"]?\s*$/gm)].length;
  const assertions = [...text.matchAll(/^\s*code: ['"]?ERR_ASSERTION['"]?\s*$/gm)].length;
  if (result.status === 0 && fail === 0 && failedLines === 0 && testFailures === 0 && assertions === 0) return "survived";
  if (result.status === 1 && fail > 0 && failedLines === fail && testFailures === fail && assertions === fail) return "killed";
  return "error";
}

function runCopy(parent, label, input, testBytes) {
  const dir = fs.mkdtempSync(path.join(parent, label + "-"));
  const target = path.join(dir, source), testFile = path.join(dir, suite);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.mkdirSync(path.dirname(testFile), { recursive: true });
  fs.writeFileSync(target, input);
  fs.writeFileSync(testFile, testBytes);
  const expected = { source: hash(input), test: hash(testBytes) };
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", testFile], {
    cwd: dir, encoding: "utf8", timeout, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" },
  });
  const actual = { source: hash(fs.readFileSync(target)), test: hash(fs.readFileSync(testFile)) };
  const classification = expected.source === actual.source && expected.test === actual.test ? classify(result) : "error";
  return { classification, hashes: { expected, actual }, status: result.status, signal: result.signal,
    ...(result.error ? { error: result.error.message } : {}) };
}
function main() {
  const sourcePath = path.join(root, source), suitePath = path.join(root, suite);
  const original = fs.readFileSync(sourcePath), testBytes = fs.readFileSync(suitePath);
  const originalHashes = { source: hash(original), test: hash(testBytes) };
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "test-summary-mutation-probe-"));
  let failed = false;
  try {
    const baseline = runCopy(parent, "baseline", original, testBytes);
    console.log(JSON.stringify({ name: "baseline", ...baseline }));
    if (baseline.classification !== "survived") { failed = true; return; }
    for (const mutation of mutations) {
      try {
        const changed = replaceOnce(original.toString("utf8"), mutation.from, mutation.to);
        const result = runCopy(parent, mutation.name, Buffer.from(changed), testBytes);
        console.log(JSON.stringify({ name: mutation.name, ...result }));
        if (result.classification !== "killed") failed = true;
      } catch (error) {
        failed = true;
        console.log(JSON.stringify({ name: mutation.name, classification: "error", error: error.message }));
      }
    }
  } finally {
    try {
      verifyAndCleanup(parent, () => {
        const after = { source: hash(fs.readFileSync(sourcePath)), test: hash(fs.readFileSync(suitePath)) };
        console.log(JSON.stringify({ name: "original-hashes", before: originalHashes, after }));
        if (originalHashes.source !== after.source || originalHashes.test !== after.test) failed = true;
      });
    } finally {
      if (failed) process.exitCode = 1;
    }
  }
}
if (require.main === module) {
  try { main(); } catch (error) { console.error("probe error:", error.message); process.exitCode = 1; }
}
module.exports = { classify, replaceOnce, verifyAndCleanup };
