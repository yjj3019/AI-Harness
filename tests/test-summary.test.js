"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { inspectTestSummary: inspect } = require("../.claude/workflows/test-summary.js");
const tap = (total, passed, failed, skipped=0) =>
  ["TAP version 13", "# tests " + total, "# pass " + passed,
   "# fail " + failed, "# skipped " + skipped].join("\n");

test("reject TAP zero tests with exit-zero-like output", () => {
  assert.equal(inspect(tap(0,0,0), false).ok, false);
});
test("reject TAP all skipped", () => {
  assert.equal(inspect(tap(2,0,0,2), true).ok, false);
});
test("reject TAP failures and cancellations", () => {
  assert.equal(inspect(tap(2,1,1), true).ok, false);
  assert.equal(inspect(tap(1,1,0) + "\n# cancelled 1", true).ok, false);
});
test("accept TAP with actual nonzero passes", () => {
  const s=inspect(tap(4,3,0,1), true);
  assert.equal(s.ok, true);
  assert.equal(s.passed, 3);
});
test("reject all-skipped pytest summaries", () => {
  assert.equal(inspect("=== 3 skipped in 0.02s ===", true).ok, false);
  assert.equal(inspect("no tests ran in 0.01s", false).ok, false);
});
test("accept pytest nonzero pass summary", () => {
  const s=inspect("=== 3 passed, 1 skipped in 0.02s ===", true);
  assert.equal(s.ok, true);
  assert.equal(s.total, 4);
});
test("reject missing summary in strict mode but preserve legacy", () => {
  assert.equal(inspect("", true).ok, false);
  assert.equal(inspect("some custom test completed", false).ok, null);
});
test("reject incomplete or mismatched TAP totals", () => {
  assert.equal(inspect("TAP version 13\n# tests 1\n# pass 1",true).ok, false);
  assert.equal(inspect(tap(1,2,0),true).ok, false);
});
