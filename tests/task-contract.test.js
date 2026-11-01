"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateTaskContract, validateFile, MAX_BYTES } = require("../scripts/task-contract.js");
const script = path.resolve(__dirname, "../scripts/task-contract.js");
function valid() {
  return { schema: 1, goal: "Improve reporting", scope: ["Update report"], non_goals: ["No deployment"],
    deliverables: ["Report"], success_criteria: ["Report contains totals"], restrictions: ["No network"],
    risk: "Totals may be stale", execution_limits: { max_steps: 10, max_duration_seconds: 300 } };
}
test("accepts a complete contract and deterministic results", () => {
  assert.deepEqual(validateTaskContract(valid()), { ok: true });
  assert.deepEqual(validateTaskContract(valid()), validateTaskContract(valid()));
});
test("rejects missing, unknown and wrong-typed fields, including approval claims", () => {
  for (const key of Object.keys(valid())) {
    const obj = valid(); delete obj[key]; assert.equal(validateTaskContract(obj).ok, false, key);
  }
  for (const extra of ["approved", "approval", "unexpected", "__proto__"]) {
    const obj = JSON.parse(JSON.stringify(valid())); Object.defineProperty(obj, extra, { value: true, enumerable: true });
    assert.equal(validateTaskContract(obj).ok, false, extra);
  }
  for (const obj of [null, [], { ...valid(), schema: "1" }, { ...valid(), goal: 1 },
    { ...valid(), scope: "text" }, { ...valid(), execution_limits: null },
    { ...valid(), execution_limits: { ...valid().execution_limits, approved: true } }])
    assert.equal(validateTaskContract(obj).ok, false);
});
test("rejects empty and oversized text and lists", () => {
  for (const key of ["goal", "risk"]) for (const value of [" ", "x".repeat(2001)])
    assert.equal(validateTaskContract({ ...valid(), [key]: value }).ok, false, key);
  for (const key of ["scope", "non_goals", "deliverables", "success_criteria", "restrictions"]) {
    for (const value of [[], Array(1), [" "], [7], ["x".repeat(2001)], Array(51).fill("x")])
      assert.equal(validateTaskContract({ ...valid(), [key]: value }).ok, false, key);
  }
  assert.equal(validateTaskContract({ ...valid(), goal: "x".repeat(2000), scope: Array(50).fill("x") }).ok, true);
});
test("execution limits are bounded safe integers", () => {
  for (const [key, max] of [["max_steps", 1000], ["max_duration_seconds", 86400]]) {
    for (const n of [0, -1, max + 1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1]) {
      const obj = valid(); obj.execution_limits[key] = n; assert.equal(validateTaskContract(obj).ok, false);
    }
    const obj = valid(); obj.execution_limits[key] = max; assert.equal(validateTaskContract(obj).ok, true);
  }
});
test("bounded regular UTF-8 JSON input and CLI statuses", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task-contract-test-"));
  try {
    const file = path.join(dir, "input.json");
    fs.writeFileSync(file, JSON.stringify(valid()));
    assert.deepEqual(validateFile(file), { ok: true });
    let result = spawnSync(process.execPath, [script, "validate", file], { encoding: "utf8" });
    assert.equal(result.status, 0); assert.deepEqual(JSON.parse(result.stdout), { ok: true });
    for (const content of ["{", Buffer.from([0xff]), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}")] ), Buffer.alloc(MAX_BYTES + 1, 32)]) {
      fs.writeFileSync(file, content); assert.equal(validateFile(file).ok, false);
    }
    assert.equal(validateFile(dir).ok, false);
    assert.equal(validateFile(path.join(dir, "missing")).ok, false);
    result = spawnSync(process.execPath, [script, "validate", file], { encoding: "utf8" });
    assert.equal(result.status, 2); assert.equal(JSON.parse(result.stdout).ok, false);
    result = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage:/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
