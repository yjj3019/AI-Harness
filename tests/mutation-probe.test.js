"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { classify, replaceOnce, verifyAndCleanup } = require("../scripts/mutation-probe.js");

function result({ status = 0, pass = 1, fail = 0, details = "", stderr = "" } = {}) {
  return { status, signal: null, stderr, stdout: `TAP version 13\n${details}# tests 1\n# pass ${pass}\n# fail ${fail}\n# cancelled 0\n# skipped 0\n# todo 0\n` };
}
const assertion = "not ok 1 - assertion\n  ---\n  failureType: 'testCodeFailure'\n  code: 'ERR_ASSERTION'\n  ...\n";
test("classifies only a clean run or confirmed assertion failure", () => {
  assert.equal(classify(result()), "survived");
  assert.equal(classify(result({ status: 1, pass: 0, fail: 1, details: assertion })), "killed");
  for (const bad of [
    result({ status: 1, pass: 0, fail: 1, details: assertion.replace("ERR_ASSERTION", "MODULE_NOT_FOUND") }),
    result({ status: 1, pass: 0, fail: 1 }), result({ status: 1 }),
    result({ status: 0, pass: 0, fail: 1, details: assertion }),
    { ...result(), error: new Error("timeout") }, { ...result(), signal: "SIGTERM" },
    result({ stderr: "runner failed" }), { ...result(), stdout: "" },
    { ...result(), stdout: result().stdout + "# pass 1\n" },
    { ...result(), stdout: result().stdout.replace("# skipped 0", "# skipped 1") },
  ]) assert.equal(classify(bad), "error");
});
test("cleanup removes temporary copies when original hash verification fails", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mutation-probe-test-"));
  const error = new Error("original hash read failed");
  try {
    fs.writeFileSync(path.join(parent, "copy"), "temporary");
    assert.throws(() => verifyAndCleanup(parent, () => { throw error; }), value => value === error);
    assert.equal(fs.existsSync(parent), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
test("replacement requires exactly one literal occurrence and changes it", () => {
  assert.equal(replaceOnce("a.b a", ".", "!"), "a!b a");
  for (const [text, from, to] of [["abc", "z", "x"], ["aaaa", "aa", "x"], ["abc", "", "x"], ["abc", "a", "a"]]) {
    assert.throws(() => replaceOnce(text, from, to));
  }
});
