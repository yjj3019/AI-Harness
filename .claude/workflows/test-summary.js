"use strict";

// A bounded test-output inspection gate, not an assertion of test relevance.
// The test runner itself remains part of the trust boundary.
function inspectTestSummary(output, required = false) {
  const text = String(output).replace(/\x1b\[[0-9;]*m/g, "");
  function last(regex) {
    const matches = Array.from(text.matchAll(regex));
    return matches.length ? Number(matches[matches.length - 1][1]) : null;
  }
  const total = last(/^# tests\s+(\d+)\s*$/gm);
  if (total !== null) {
    const passed = last(/^# pass\s+(\d+)\s*$/gm);
    const failed = last(/^# fail\s+(\d+)\s*$/gm);
    const skipped = last(/^# skipped\s+(\d+)\s*$/gm) ?? 0;
    const cancelled = last(/^# cancelled\s+(\d+)\s*$/gm) ?? 0;
    const data = { kind: "tap", total, passed, failed, skipped, cancelled };
    if (passed === null || failed === null ||
        total < 1 || passed < 1 || failed > 0 || cancelled > 0 ||
        skipped >= total || passed + failed + skipped + cancelled > total) {
      return { ...data, ok: false, reason: "zero, invalid, failed, cancelled or all-skipped TAP tests" };
    }
    return { ...data, ok: true };
  }
  const py = [...text.matchAll(/^\s*=+\s+([^\r\n]*\b(?:passed|failed|skipped|errors?)\b[^\r\n]*?)\s+in\s+[\d.]+s\s*=+\s*$/gm)];
  if (py.length) {
    const line = py[py.length - 1][1];
    const count = (word) => Number(new RegExp("(\\d+)\\s+" + word + "\\b").exec(line)?.[1] || 0);
    const passed = count("passed"), failed = count("failed"), skipped = count("skipped");
    const errors = count("errors?");
    const data = { kind: "pytest", total: passed + failed + skipped + errors,
      passed, failed, skipped, errors };
    if (passed < 1 || failed > 0 || errors > 0) {
      return { ...data, ok: false, reason: "zero, failed or all-skipped pytest tests" };
    }
    return { ...data, ok: true };
  }
  if (/(?:^|\n)\s*(?:no tests ran|0 tests?\s+(?:passed|executed|run)|0 passing)\b/i.test(text)) {
    return { ok: false, reason: "test output states zero tests" };
  }
  return required
    ? { ok: false, reason: "supported TAP or pytest test count summary required" }
    : { ok: null, reason: "test count unknown in legacy mode" };
}
module.exports = { inspectTestSummary };
