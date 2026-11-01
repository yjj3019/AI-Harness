"use strict";
// Optional local experiment, not a gate or a sandbox. No network or packages used.
// Each run uses copied inputs; the focused tests create their own temporary fixtures.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const source = ".claude/workflows/phase-gate.js";
const inputs = [source, ".claude/workflows/test-summary.js", "scripts/context-contract.js",
  "tests/phase-gate-run-integrity.test.js", "tests/strict-phase-e2e.test.js", "tests/phase-gate.test.js"];
const mutations = [
  { name: "tree-comparison", suite: inputs[3], testName: "passing command that changes tracked.txt records FAIL", assertionLine: 46, from: "const treeOk = treeBefore === treeAfter;", to: "const treeOk = true;" },
  { name: "command-pin", suite: inputs[4], testName: "pinned command differs: reject before executing", assertionLine: 74, from: "if (pinned && JSON.stringify(pinned) !== JSON.stringify(cmd)) {", to: "if (false) {" },
  { name: "hash-chain", suite: inputs[5], testName: "editing an evidence file breaks the hash chain", assertionLine: 157, from: "ev.prev.sha256 !== prevSha", to: "false" },
];
const timeout = 120000; // Bounds the direct runner, not necessarily its descendants.
function hash(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function replaceOnce(text, from, to) {
  if (!from || from === to) throw new Error("invalid replacement");
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) !== -1) throw new Error("mutation must match exactly once");
  return text.slice(0, at) + to + text.slice(at + from.length);
}
function escapeRegex(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function classify(result, target, suitePath) {
  if (!target || typeof target.testName !== "string" || !target.testName ||
      typeof target.suite !== "string" || !Number.isSafeInteger(target.assertionLine) || target.assertionLine <= 0) return "error";
  if (result.error || result.signal || !Number.isInteger(result.status) || result.stderr) return "error";
  const text = String(result.stdout || "");
  if (!/^TAP version 13\s*$/m.test(text)) return "error";
  const count = key => {
    const matches = [...text.matchAll(new RegExp(`^# ${key} (\\d+)\\s*$`, "gm"))];
    return matches.length === 1 ? Number(matches[0][1]) : NaN;
  };
  const [tests, pass, fail, skipped, cancelled, todo] = ["tests", "pass", "fail", "skipped", "cancelled", "todo"].map(count);
  if (![tests, pass, fail, skipped, cancelled, todo].every(Number.isSafeInteger) ||
      tests <= 0 || pass + fail <= 0 || cancelled || todo || pass + fail + skipped !== tests) return "error";
  const failures = [...text.matchAll(/^not ok \d+ - /gm)].length;
  const testFailures = [...text.matchAll(/^\s*failureType: ['"]?testCodeFailure['"]?\s*$/gm)].length;
  const assertions = [...text.matchAll(/^\s*code: ['"]?ERR_ASSERTION['"]?\s*$/gm)].length;
  const exactTest = new RegExp(`^(?:not )?ok \\d+ - ${escapeRegex(target.testName)}$`);
  const selected = text.split(/\r?\n/).filter(line => exactTest.test(line));
  if (pass + fail !== 1 || selected.length !== 1) return "error";
  if (result.status === 0 && pass === 1 && fail === 0 && selected[0].startsWith("ok ") && failures === 0 && testFailures === 0 && assertions === 0) return "survived";
  // Require the target test's specific assertion site, not an incidental assertion elsewhere.
  if (typeof suitePath !== "string" || !path.isAbsolute(suitePath)) return "error";
  const assertionFrame = new RegExp(`^\\s*(?:at )?(?:[^\\r\\n]* \\()?${escapeRegex(suitePath)}:${target.assertionLine}:\\d+\\)?\\s*$`, "m");
  if (result.status === 1 && fail === 1 && pass === 0 && selected[0].startsWith("not ok ") && failures === 1 && testFailures === 1 && assertions === 1 && assertionFrame.test(text)) return "killed";
  return "error";
}
function hashes(bytes) { return Object.fromEntries(Object.entries(bytes).map(([name, value]) => [name, hash(value)])); }
function runCopy(parent, label, bytes, target) {
  const { suite, testName } = target;
  const dir = fs.mkdtempSync(path.join(parent, label + "-"));
  for (const [name, value] of Object.entries(bytes)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  }
  const expected = hashes(bytes);
  const env = { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
  delete env.PHASE_GATE_ROOT;
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "--test-name-pattern", `^${escapeRegex(testName)}$`, path.join(dir, suite)], {
    cwd: dir, env, encoding: "utf8", timeout, maxBuffer: 8 * 1024 * 1024,
  });
  const actual = hashes(Object.fromEntries(Object.keys(bytes).map(name => [name, fs.readFileSync(path.join(dir, name))])));
  const classification = JSON.stringify(expected) === JSON.stringify(actual) ? classify(result, target, path.join(dir, suite)) : "error";
  return { classification, hashes: { expected, actual }, status: result.status, signal: result.signal,
    ...(result.error ? { error: result.error.message } : {}),
    ...(classification !== "survived" ? { stdout: result.stdout, stderr: result.stderr } : {}) };
}
function runPlan(plan, bytes, parent, runner = runCopy, report = value => console.log(JSON.stringify(value))) {
  let failed = false;
  for (const mutation of plan) {
    try {
      const baseline = runner(parent, "baseline", bytes, mutation);
      report({ name: "baseline-" + mutation.name, suite: mutation.suite, testName: mutation.testName, ...baseline });
      if (baseline.classification !== "survived") { failed = true; break; }
      const changed = { ...bytes, [source]: Buffer.from(replaceOnce(bytes[source].toString("utf8"), mutation.from, mutation.to)) };
      const result = runner(parent, mutation.name, changed, mutation);
      report({ name: mutation.name, suite: mutation.suite, testName: mutation.testName, expectedAssertionLine: mutation.assertionLine, ...result });
      if (result.classification !== "killed") failed = true;
      if (result.classification === "error") break;
    } catch (error) {
      failed = true;
      report({ name: mutation.name, classification: "error", error: error.message });
      break;
    }
  }
  return !failed;
}
function main() {
  const bytes = Object.fromEntries(inputs.map(name => [name, fs.readFileSync(path.join(root, name))]));
  const before = hashes(bytes);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "gate-mutation-probe-"));
  let failed = false;
  try {
    failed = !runPlan(mutations, bytes, parent);
  } finally {
    try {
      const after = hashes(Object.fromEntries(inputs.map(name => [name, fs.readFileSync(path.join(root, name))])));
      console.log(JSON.stringify({ name: "original-hashes", before, after }));
      if (JSON.stringify(before) !== JSON.stringify(after)) failed = true;
    } finally { fs.rmSync(parent, { recursive: true, force: true }); }
  }
  if (failed) process.exitCode = 1;
}
if (require.main === module) {
  try { main(); } catch (error) { console.error("probe error:", error.message); process.exitCode = 1; }
}
module.exports = { replaceOnce, classify, hash, hashes, runCopy, runPlan };
