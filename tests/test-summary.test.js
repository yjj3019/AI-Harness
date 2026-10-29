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
test("pytest warnings and expected outcomes have explicit policy", () => {
  for (const suffix of ["1 warning", "2 warnings", "1 xfailed, 1 skipped", "1 skipped, 1 xfailed"]) {
    const result=inspect(`=== 3 passed, ${suffix} in 0.02s ===`,true);
    assert.equal(result.ok,true,suffix);
    assert.equal(result.passed,3);
    assert.equal(result.total,suffix.includes("xfailed") ? 5 : 3);
  }
  assert.equal(inspect("=== 2 passed, 1 xpassed in 0.02s ===",true).ok,false);
  assert.equal(inspect("=== 2 xfailed in 0.02s ===",true).ok,false);
});
const spec = (total, passed, failed, skipped=0) =>
  ["✔ some test", "ℹ tests " + total, "ℹ suites 0", "ℹ pass " + passed,
   "ℹ fail " + failed, "ℹ skipped " + skipped, "ℹ todo 0"].join("\n");

test("accept the Node spec reporter summary (Node 23+ default on pipes)", () => {
  const s=inspect(spec(3,3,0), true);
  assert.equal(s.ok, true);
  assert.equal(s.kind, "spec");
  assert.equal(s.passed, 3);
});
test("reject spec summaries with zero, all-skipped or failing tests", () => {
  assert.equal(inspect(spec(0,0,0), false).ok, false);
  assert.equal(inspect(spec(2,0,0,2), true).ok, false);
  assert.equal(inspect(spec(2,1,1), true).ok, false);
});
test("accept a spec summary that carries a variation selector", () => {
  assert.equal(inspect(spec(2,2,0).replace(/ℹ/g, "ℹ\uFE0F"), true).ok, true);
});
test("legacy mode still reports unknown for a spec run without counts", () => {
  assert.equal(inspect("✔ some test", false).ok, null);
});

test("unexplained tests are rejected for TAP and spec", () => {
  for (const make of [tap, spec]) assert.equal(inspect(make(3,1,0), true).ok, false);
});
test("Node todo tests participate in exact totals without counting as passes", () => {
  assert.equal(inspect(tap(3,1,0,1) + "\n# todo 1", true).ok, true);
  assert.equal(inspect(spec(3,1,0,1).replace("ℹ todo 0", "ℹ todo 1"), true).ok, true);
  assert.equal(inspect(tap(1,0,0) + "\n# todo 1", true).ok, false);
  assert.equal(inspect(tap(1,1,0) + "\n# todo 1", true).ok, false);
});
test("an incomplete trailing block cannot borrow earlier counters", () => {
  for (const make of [tap,spec]) {
    const prefix = make === tap ? "#" : "ℹ";
    assert.equal(inspect(make(1,1,0) + `\n${prefix} tests 1\n${prefix} pass 1`, true).ok, false);
    assert.equal(inspect(make(1,1,0) + `\n${prefix} pass 1`, true).ok, false);
  }
});
test("a failed or zero block cannot be hidden by a later passing block", () => {
  for (const make of [tap,spec]) {
    assert.equal(inspect(make(2,1,1) + "\n" + make(1,1,0), true).ok, false);
    assert.equal(inspect(make(0,0,0) + "\n" + make(1,1,0), true).ok, false);
  }
});
test("mixed formats validate every summary, in either order", () => {
  const pass = [tap(1,1,0), spec(1,1,0), "=== 1 passed in 0.01s ==="];
  const fail = [tap(2,1,1), spec(2,1,1), "=== 1 passed, 1 failed in 0.01s ==="];
  for (const good of pass) for (const bad of fail) {
    assert.equal(inspect(good + "\n" + bad, true).ok, false);
    assert.equal(inspect(bad + "\n" + good, true).ok, false);
  }
});
test("all pytest summaries are inspected, not just the last one", () => {
  for (const bad of ["=== 1 failed in 0.01s ===", "=== 0 passed in 0.01s ===",
      "=== 2 skipped in 0.01s ===", "=== 1 passed, unknown in 0.01s ==="]) {
    assert.equal(inspect(bad + "\n=== 2 passed in 0.02s ===",true).ok,false);
  }
});
test("standalone pytest xfailed and xpassed blocks cannot be masked", () => {
  const pass = "=== 2 passed in 0.02s ===";
  for (const outcome of ["xfailed", "xpassed"]) {
    const bad = `=== 1 ${outcome} in 0.01s ===`;
    for (const text of [bad, `${bad}\n${pass}`, `${pass}\n${bad}`]) {
      const result = inspect(text, true);
      assert.equal(result.ok, false, text);
      assert.equal(result.kind, "pytest");
      assert.equal(result.total, 1);
      assert.equal(result[outcome === "xfailed" ? "skipped" : "failed"], 1);
    }
  }
});
test("pytest long-duration and decorated zero summaries cannot be masked", () => {
  const good = "=== 1 passed in 0.02s ===";
  for (const bad of ["=== 1 xfailed in 65.01s (0:01:05) ===",
    "=== 1 xpassed in 90061.50s (1 day, 1:01:01) ===",
    "=== 1 failed in 65.01s (0:01:05) ===", "=== no tests ran in 0.01s ==="]) {
    for (const text of [`${bad}\n${good}`, `${good}\n${bad}`]) assert.equal(inspect(text, true).ok, false, text);
  }
  assert.equal(inspect("=== 2 passed, 1 xfailed in 90061.50s (1 day, 1:01:01) ===", true).ok, true);
});
test("quiet pytest summaries and deselection are independently validated", () => {
  const good = [tap(1,1,0), spec(1,1,0), "=== 1 passed in 0.01s ==="];
  const bad = ["1 failed in 0.01s", "1 xpassed in 0.01s", "1 xfailed in 0.01s",
    "3 deselected in 0.01s", "=== 3 deselected in 0.01s ===",
    "1 warning in 0.01s", "1 warning, 1 error in 0.01s",
    "1 passed, 2 deselected, 1 deselected in 0.01s", "1 passed, unknown in 0.01s",
    "1 passed, 9007199254740992 deselected in 0.01s"];
  for (const pass of good) for (const fail of bad) for (const text of [`${pass}\n${fail}`, `${fail}\n${pass}`]) {
    assert.equal(inspect(text, true).ok, false, text);
  }
  const summary = inspect("2 passed, 3 deselected, 1 xfailed in 0.02s", true);
  assert.equal(summary.ok, true);
  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 2);
  assert.equal(summary.skipped, 1);
  assert.equal(inspect("1 passed in 0.01s", true).ok, true);
  assert.equal(inspect("1 passed", true).ok, false);
  assert.equal(inspect("1 passed in 0.01s\ncache refresh failed in 1s\n2 files skipped in 0.05s", true).ok, true);
});
test("multiple valid summaries aggregate with an explicit kind", () => {
  const s=inspect(tap(2,1,0,1)+"\n"+spec(2,2,0)+"\n=== 3 passed in 0.01s ===",true);
  assert.equal(s.ok,true);assert.equal(s.kind,"multiple");
  assert.equal(s.total,7);assert.equal(s.passed,6);assert.equal(s.skipped,1);
});
test("single-summary API shape is retained", () => {
  assert.deepEqual(inspect(tap(1,1,0),true),{kind:"tap",total:1,passed:1,failed:0,skipped:0,cancelled:0,ok:true});
  assert.deepEqual(inspect("=== 1 passed in 0.01s ===",true),{kind:"pytest",total:1,passed:1,failed:0,skipped:0,errors:0,ok:true});
});
test("unsafe, negative, fractional and duplicate counts fail closed", () => {
  for (const count of ["9007199254740992", "-1", "1.5", "Infinity"]) {
    assert.equal(inspect(`# tests ${count}\n# pass ${count}\n# fail 0`,true).ok,false);
    assert.equal(inspect(`ℹ tests ${count}\nℹ pass ${count}\nℹ fail 0`,true).ok,false);
  }
  assert.equal(inspect("=== 9007199254740992 passed in 0.01s ===",true).ok,false);
  assert.equal(inspect(tap(1,1,0)+"\n# pass 1",true).ok,false);
  assert.equal(inspect("=== 1 passed, 1 passed in 0.01s ===",true).ok,false);
  const max=tap(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,0);
  assert.equal(inspect(max+"\n"+max,true).ok,false);
});
test("intervening logs and mixed partial counters do not complete a block", () => {
  assert.equal(inspect("# tests 1\n# pass 1\nrunner restarted\n# fail 0",true).ok,false);
  assert.equal(inspect("# tests 1\nℹ pass 1\nℹ fail 0",true).ok,false);
});
test("explicit zero-test text is not masked by valid summaries", () => {
  assert.equal(inspect("no tests ran in 0.01s\n"+tap(1,1,0),true).ok,false);
});
