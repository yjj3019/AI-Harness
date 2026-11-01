'use strict';

// A diagnostic over declarations, not a gate or a verification of those declarations.
const fs = require('node:fs');
const accounting = require('./evaluation-accounting');
const MAX_BYTES = 1024 * 1024;
const FIELDS = ['benchmark', 'case_set', 'rubric', 'scorer', 'environment'];

function exact(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) {
    throw new Error(`${name}: invalid fields`);
  }
}
function identifier(value, name) {
  if (typeof value !== 'string' || !value.length || value.length > 200 || value.trim() !== value || !value.trim()) {
    throw new Error(`${name}: expected nonempty trimmed string of at most 200 characters`);
  }
}
function report(input) {
  // Validate and classify the same snapshot, even for programmatic callers.
  input = structuredClone(input);
  exact(input, ['version', 'baseline', 'candidate', 'context', 'accounting'], 'input');
  if (input.version !== 1) throw new Error('input: unsupported version');
  // Validate the entire accounting record before examining any comparison outcomes.
  accounting.report(input.accounting);
  identifier(input.baseline, 'baseline');
  identifier(input.candidate, 'candidate');
  if (input.baseline === input.candidate) throw new Error('conditions must differ');
  exact(input.context, ['baseline', 'candidate'], 'context');
  for (const side of ['baseline', 'candidate']) {
    exact(input.context[side], FIELDS, 'context side');
    for (const field of FIELDS) {
      const value = input.context[side][field];
      if (value === null) continue;
      identifier(value, `context ${field}`);
      if (['UNKNOWN', 'N/A', 'NA', 'TBD', 'NONE', 'UNSPECIFIED'].includes(value.trim().toUpperCase())) {
        throw new Error(`context ${field}: use null for unknown context`);
      }
    }
  }
  const missing_context_fields = FIELDS.filter(field => input.context.baseline[field] === null || input.context.candidate[field] === null);
  const mismatched_context = FIELDS.filter(field => input.context.baseline[field] !== null && input.context.candidate[field] !== null && input.context.baseline[field] !== input.context.candidate[field]);
  const tasks = new Map();
  for (const item of input.accounting.planned) {
    if (item.condition !== input.baseline && item.condition !== input.candidate) throw new Error('unexpected condition');
    if (!tasks.has(item.task_id)) tasks.set(item.task_id, new Set());
    tasks.get(item.task_id).add(item.condition);
  }
  if (!tasks.size) throw new Error('at least one task is required');
  for (const conditions of tasks.values()) if (conditions.size !== 2) throw new Error('each task requires both conditions');
  const results = new Map();
  for (const r of input.accounting.results) {
    if (!results.has(r.task_id)) results.set(r.task_id, new Map());
    results.get(r.task_id).set(r.condition, r.verdict);
  }
  const counts = { pairs: tasks.size, pass_pass: 0, fail_pass: 0, pass_fail: 0, fail_fail: 0,
    incomparable_pairs: 0, UNKNOWN_conditions: 0, NA_conditions: 0 };
  for (const task of tasks.keys()) {
    const pair = results.get(task);
    const a = pair.get(input.baseline), b = pair.get(input.candidate);
    for (const verdict of [a, b]) {
      if (verdict === 'UNKNOWN' || verdict === 'NA') counts[`${verdict}_conditions`]++;
    }
    if (!['PASS', 'FAIL'].includes(a) || !['PASS', 'FAIL'].includes(b)) counts.incomparable_pairs++;
    else counts[`${a.toLowerCase()}_${b.toLowerCase()}`]++;
  }
  const outcome = missing_context_fields.length || mismatched_context.length || counts.incomparable_pairs || !counts.pairs ? 'INCONCLUSIVE' :
    counts.pass_fail ? 'DECLARED_REGRESSIONS_PRESENT' : counts.fail_pass ? 'DECLARED_GAINS_ONLY' : 'DECLARED_NO_DIFFERENCE';
  return { outcome, counts, mismatched_context, missing_context_fields };
}
function parse(bytes) { return accounting.parse(bytes); }

if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('usage');
    // Nonblocking open avoids waiting on FIFOs where the platform supports it.
    const fd = fs.openSync(process.argv[2], fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
    let bytes;
    try {
      if (!fs.fstatSync(fd).isFile()) throw new Error('not a regular file');
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      let used = 0, n;
      while (used < buffer.length && (n = fs.readSync(fd, buffer, used, buffer.length - used, null)) > 0) used += n;
      bytes = buffer.subarray(0, used);
    } finally { fs.closeSync(fd); }
    console.log(JSON.stringify(report(parse(bytes)), null, 2));
  } catch (_) {
    // Filesystem and parser errors may contain paths or input fragments.
    console.error('paired-evaluation: invalid input or unable to read file');
    process.exitCode = 1;
  }
}
module.exports = { report, parse };
