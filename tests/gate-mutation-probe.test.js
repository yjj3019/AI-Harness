"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { classify, replaceOnce, hash, hashes, runCopy, runPlan } = require("../scripts/gate-mutation-probe.js");

const target = { suite: "tests/sample.test.js", testName: "sample (exact).", assertionLine: 42 };
const suitePath = path.resolve('tests/sample.test.js');
const assertion = `not ok 3 - ${target.testName}\n  ---\n  failureType: 'testCodeFailure'\n  code: 'ERR_ASSERTION'\n  stack: |-\n    at TestContext.<anonymous> (${suitePath}:42:12)\n  ...\n`;
function result(status = 0, fail = 0, detail = null) {
  const line = detail === null ? `ok 3 - ${target.testName}\n` : detail;
  return { status, signal: null, stderr: "", stdout: `TAP version 13\nok 1 - skipped one # SKIP test name does not match pattern\nok 2 - skipped two # SKIP test name does not match pattern\n${line}# tests 3\n# pass ${1 - fail}\n# fail ${fail}\n# cancelled 0\n# skipped 2\n# todo 0\n` };
}
test("classifies only selected exact test and expected assertion site", () => {
  assert.equal(classify(result(), target), "survived");
  assert.equal(classify(result(1, 1, assertion), target, suitePath), "killed");
  assert.equal(classify(result(1, 1, assertion.replace(`at TestContext.<anonymous> (${suitePath}:42:12)`, `${suitePath}:42:12`)), target, suitePath), "killed");
  for (const bad of [result(1, 1, assertion.replace("sample.test.js:42:", "sample.test.js:41:")),
    result(1, 1, assertion.replace(`at TestContext.<anonymous> (${suitePath}:42:12)`, `expected text ${suitePath}:42:12`)),
    result(1, 1, assertion.replace(suitePath, path.resolve('other/sample.test.js'))),
    result(1, 1, assertion.replace(suitePath, suitePath.replace('sample.test.js', 'not-sample.test.js'))),
    result(1, 1, assertion.replace("ERR_ASSERTION", "MODULE_NOT_FOUND")),
    result(1, 1, assertion.replace(target.testName, "unrelated failure")),
    { ...result(), error: new Error("timeout") }, { ...result(), signal: "SIGTERM" },
    { ...result(), stderr: "error" }, { ...result(), stdout: "" },
    { ...result(), stdout: result().stdout + "# pass 1\n" },
    { ...result(), stdout: result().stdout.replace("# skipped 2", "# skipped 3") },
    { ...result(), stdout: result().stdout.replace("# pass 1", "# pass 0").replace("# skipped 2", "# skipped 3") }, result(0, 1, assertion)]) {
    assert.equal(classify(bad, target, suitePath), "error");
  }
  assert.equal(classify(result()), "error");
});
test("replacement is literal, unique including overlapping matches and nontrivial", () => {
  assert.equal(replaceOnce("a.b", ".", "!"), "a!b");
  for (const args of [["aaaa", "aa", "x"], ["abc", "z", "x"], ["abc", "", "x"], ["abc", "a", "a"]])
    assert.throws(() => replaceOnce(...args));
});
test("runner errors and baseline failures stop remaining mutations", () => {
  const bytes = { ".claude/workflows/phase-gate.js": Buffer.from("original") };
  const plan = ["first", "second"].map(name => ({ name, suite: "s", testName: name, assertionLine: 1, from: "original", to: "mutant" }));
  let calls = [];
  const reports = [];
  const runner = (_, label) => { calls.push(label); return { classification: label === "baseline" ? "survived" : "error", stdout: "diagnostic" }; };
  assert.equal(runPlan(plan, bytes, "unused", runner, r => reports.push(r)), false);
  assert.deepEqual(calls, ["baseline", "first"]);
  assert.equal(reports[1].stdout, "diagnostic");
  calls = [];
  assert.equal(runPlan(plan, bytes, "unused", (_, label) => { calls.push(label); return { classification: "error" }; }, () => {}), false);
  assert.deepEqual(calls, ["baseline"]);
  calls = [];
  assert.equal(runPlan(plan, bytes, "unused", (_, label) => { calls.push(label); if (label === "first") throw Error("infrastructure"); return { classification: "survived" }; }, () => {}), false);
  assert.deepEqual(calls, ["baseline", "first"]);
});
test("hashes bind names to exact bytes", () => {
  assert.equal(hash("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.deepEqual(hashes({ a: Buffer.from("abc") }), { a: hash("abc") });
  assert.notEqual(hash("abc"), hash("abd"));
});
test("copy runs in isolation and detects modified input", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "gate-probe-unit-"));
  try {
    const suite = "tests/sample.test.js";
    const selection = { suite, testName: "target (one).", assertionLine: 1 };
    const clean = Buffer.from("const t=require('node:test'); t('target (one).',()=>{}); t('target XoneY',()=>{ throw Error('not selected') });\n");
    assert.equal(runCopy(parent, "clean", { [suite]: clean }, selection).classification, "survived");
    const changed = Buffer.from("require('node:test')('target (one).',()=>require('node:fs').appendFileSync(__filename,'x'));\n");
    const outcome = runCopy(parent, "changed", { [suite]: changed }, selection);
    assert.equal(outcome.classification, "error");
    assert.match(outcome.stdout, /target \(one\)\./);
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});
