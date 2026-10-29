"use strict";

// A bounded output inspector, not proof of test relevance or a trusted test runner.
// Validate every recognized block independently: a later success cannot erase a failure.
function inspectTestSummary(output, required = false) {
  const text = String(output).replace(/\x1b\[[0-9;]*m/g, "");
  const summaries = [];
  let block = null;
  const safe = value => Number.isSafeInteger(value) && value >= 0;
  function finish() {
    if (!block) return;
    const { kind, counts, invalid } = block;
    const total = counts.tests ?? null, passed = counts.pass ?? null, failed = counts.fail ?? null;
    const skipped = counts.skipped ?? 0, cancelled = counts.cancelled ?? 0, todo = counts.todo ?? 0;
    const data = { kind, total, passed, failed, skipped, cancelled, ...(todo ? { todo } : {}) };
    const sum = passed + failed + skipped + cancelled + todo;
    const ok = !invalid && [total, passed, failed, skipped, cancelled, todo, sum].every(safe) &&
      total > 0 && passed > 0 && failed === 0 && cancelled === 0 && sum === total;
    summaries.push({ ...data, ok, ...(!ok ? { reason: "zero, incomplete, invalid, failed, cancelled or all-skipped " + kind + " tests" } : {}) });
    block = null;
  }
  for (const line of text.split(/\r?\n/)) {
    const node = /^(#|\s*ℹ\uFE0F?)\s+(tests|pass|fail|skipped|cancelled|todo|suites|duration_ms)\s+(\S+)\s*$/.exec(line);
    if (node) {
      const kind = node[1] === "#" ? "tap" : "spec", key = node[2];
      if (block && (block.kind !== kind || key === "tests")) finish();
      // suites and timing alone are not test-count evidence.
      if (!block && ["suites", "duration_ms"].includes(key)) continue;
      if (!block) block = { kind, counts: {}, invalid: false };
      if (!["suites", "duration_ms"].includes(key)) {
        if (Object.hasOwn(block.counts, key) || !/^\d+$/.test(node[3])) block.invalid = true;
        block.counts[key] = Number(node[3]);
      }
      if (key === "duration_ms") finish();
      continue;
    }
    // A summary must not borrow counters across another runner's output or intervening logs.
    if (line.trim()) finish();
    const py = /^\s*=+\s+([^\r\n]*\b(?:passed|failed|skipped|errors?|xfailed|xpassed|deselected|warnings?)\b[^\r\n]*?)\s+in\s+\d+(?:\.\d+)?s(?:\s+\((?:\d+ days?, )?\d+:\d{2}:\d{2}\))?\s*=+\s*$/.exec(line)
      || /^\s*(\d+\s+(?:passed|failed|skipped|errors?|xfailed|xpassed|deselected|warnings?)\b[^\r\n]*?)\s+in\s+\d+(?:\.\d+)?s(?:\s+\((?:\d+ days?, )?\d+:\d{2}:\d{2}\))?\s*$/.exec(line);
    if (py) {
      const counts = { passed: 0, failed: 0, skipped: 0, errors: 0 }, seen = new Set();
      let invalid = false;
      for (const token of py[1].split(",")) {
        // Warnings and deselections are not executed tests; expected failures are skipped work.
        const auxiliary = /^\s*(\d+)\s+(warnings?|deselected|xfailed|xpassed)\s*$/.exec(token);
        if (auxiliary) {
          const value = Number(auxiliary[1]);
          if (!safe(value) || seen.has(auxiliary[2])) invalid = true;
          seen.add(auxiliary[2]);
          if (auxiliary[2] === "xfailed") counts.skipped += value;
          if (auxiliary[2] === "xpassed") counts.failed += value; // conservative unexpected-pass policy
          continue;
        }
        const match = /^\s*(\d+)\s+(passed|failed|skipped|errors?)\s*$/.exec(token);
        if (!match) { invalid = true; continue; }
        const key = match[2] === "error" ? "errors" : match[2];
        if (seen.has(key)) invalid = true;
        seen.add(key);
        counts[key] += Number(match[1]);
      }
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      const ok = !invalid && [...Object.values(counts), total].every(safe) &&
        counts.passed > 0 && counts.failed === 0 && counts.errors === 0;
      summaries.push({ kind: "pytest", total, ...counts, ok,
        ...(!ok ? { reason: "zero, invalid, failed or all-skipped pytest tests" } : {}) });
    }
  }
  finish();
  // Even an explicit zero-test message alongside a valid summary must fail closed.
  if (/(?:^|\n)[ \t]*(?:=+[ \t]+)?(?:no tests ran|0 tests?\s+(?:passed|executed|run)|0 passing)\b/i.test(text)) {
    return { ok: false, reason: "test output states zero tests" };
  }
  const rejected = summaries.find(summary => !summary.ok);
  if (rejected) return rejected;
  if (summaries.length === 1) return summaries[0];
  if (summaries.length > 1) {
    const data = { kind: "multiple", total: 0, passed: 0, failed: 0, skipped: 0, cancelled: 0, todo: 0, errors: 0 };
    for (const summary of summaries) {
      for (const key of Object.keys(data).filter(key => key !== "kind")) data[key] += summary[key] || 0;
    }
    if (!Object.values(data).filter(value => typeof value === "number").every(safe))
      return { ...data, ok: false, reason: "unsafe aggregate test counts" };
    return { ...data, ok: true };
  }
  return required
    ? { ok: false, reason: "supported TAP, Node spec or pytest test count summary required" }
    : { ok: null, reason: "test count unknown in legacy mode" };
}
module.exports = { inspectTestSummary };
