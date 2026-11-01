'use strict';

// Offline accounting only; caller-supplied records are not evidence of truth.
const fs = require('node:fs');
const { TextDecoder } = require('node:util');
const MAX_BYTES = 1024 * 1024;
const MAX_ITEMS = 10000;

function fail(message) { throw new Error(message); }
function object(value, keys, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) {
    fail(`${where}: expected exactly ${keys.join(', ')}`);
  }
}
function text(value, where) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 200 || value.trim() !== value || !value.trim()) {
    fail(`${where}: expected nonempty trimmed string of at most 200 characters`);
  }
}
function list(value, where) {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) fail(`${where}: expected array of at most ${MAX_ITEMS} items`);
}
function key(task, condition) { return JSON.stringify([task, condition]); }
function rate(numerator, denominator) {
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
}

function report(input) {
  object(input, ['version', 'na_reasons', 'planned', 'results'], 'input');
  if (input.version !== 1) fail('input: unsupported version');
  list(input.na_reasons, 'na_reasons');
  const reasons = new Set();
  for (const reason of input.na_reasons) {
    text(reason, 'na reason');
    if (reasons.has(reason)) fail('duplicate na reason');
    reasons.add(reason);
  }
  list(input.planned, 'planned');
  list(input.results, 'results');
  const planned = new Map();
  for (const p of input.planned) {
    object(p, ['task_id', 'condition', 'retry_allowed'], 'planned entry');
    text(p.task_id, 'task_id'); text(p.condition, 'condition');
    if (typeof p.retry_allowed !== 'boolean') fail('retry_allowed must be boolean');
    const id = key(p.task_id, p.condition);
    if (planned.has(id)) fail('duplicate planned task-condition');
    planned.set(id, p);
  }
  const seen = new Set();
  const counts = { planned: planned.size, PASS: 0, FAIL: 0, UNKNOWN: 0, NA: 0, eligible: 0, attempted: 0, completed: 0, attempts: 0 };
  for (const r of input.results) {
    object(r, ['task_id', 'condition', 'verdict', 'na_reason', 'attempted', 'completed', 'attempts'], 'result');
    text(r.task_id, 'task_id'); text(r.condition, 'condition');
    const id = key(r.task_id, r.condition);
    if (!planned.has(id)) fail('result is not planned');
    if (seen.has(id)) fail('duplicate result task-condition');
    seen.add(id);
    if (!['PASS', 'FAIL', 'UNKNOWN', 'NA'].includes(r.verdict)) fail('invalid verdict');
    if (typeof r.attempted !== 'boolean' || typeof r.completed !== 'boolean') fail('attempted and completed must be boolean');
    list(r.attempts, 'attempts');
    const ids = new Set();
    let started = false;
    for (const a of r.attempts) {
      object(a, ['id', 'status'], 'attempt');
      text(a.id, 'attempt id');
      if (ids.has(a.id)) fail('duplicate attempt id within task-condition');
      ids.add(a.id);
      if (!['STARTED', 'COMPLETED', 'INVALID', 'SKIPPED'].includes(a.status)) fail('invalid attempt status');
      if (a.status !== 'SKIPPED') started = true;
    }
    // Completion describes the final attempt, not a stale earlier outcome.
    const completed = r.attempts.length > 0 && r.attempts[r.attempts.length - 1].status === 'COMPLETED';
    if (r.attempts.length > 1 && !planned.get(id).retry_allowed) fail('multiple attempts require preregistered retry');
    if (r.attempted !== started || r.completed !== completed) fail('attempted/completed inconsistent with attempts');
    if (r.verdict === 'NA') {
      if (typeof r.na_reason !== 'string' || !reasons.has(r.na_reason)) fail('NA requires preregistered reason');
      if (r.attempts.length) fail('NA cannot have attempts');
    } else {
      if (r.na_reason !== null) fail('non-NA reason must be null');
      if ((r.verdict === 'PASS' || r.verdict === 'FAIL') && !completed) fail('PASS/FAIL require a completed attempt');
      // A subsequent completion does not reconcile an earlier uncertain start.
      if (r.verdict !== 'UNKNOWN' && r.attempts.some(a => a.status === 'STARTED')) fail('started attempt requires UNKNOWN');
      if (r.verdict !== 'UNKNOWN') {
        let laterCompleted = false;
        for (let i = r.attempts.length - 1; i >= 0; i--) {
          if (r.attempts[i].status === 'COMPLETED') laterCompleted = true;
          else if (!laterCompleted) fail('unresolved attempt requires UNKNOWN');
        }
      }
    }
    counts[r.verdict]++;
    counts.attempted += Number(r.attempted);
    counts.completed += Number(r.completed);
    counts.attempts += r.attempts.length;
  }
  if (seen.size !== planned.size) fail('each planned task-condition needs exactly one result');
  counts.eligible = counts.PASS + counts.FAIL + counts.UNKNOWN;
  return { counts, rates: { pass: rate(counts.PASS, counts.eligible), completion: rate(counts.completed, counts.eligible) } };
}

function parse(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_BYTES) fail('input must be a JSON file of at most 1048576 bytes');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('UTF-8 BOM is not allowed');
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const value = JSON.parse(source); // First establish valid JSON syntax.
  // Scan valid JSON separately, retaining decoded object keys to reject duplicates.
  let i = 0;
  function whitespace() { while (/[\x20\t\r\n]/.test(source[i] || '\0')) i++; }
  function string() {
    const start = i++;
    while (source[i] !== '"') { if (source[i] === '\\') i++; i++; }
    i++;
    return JSON.parse(source.slice(start, i));
  }
  function scan(depth) {
    if (depth > 20) fail('JSON nesting exceeds limit');
    whitespace();
    if (source[i] === '{') {
      i++; whitespace(); const keys = new Set();
      if (source[i] === '}') { i++; return; }
      while (true) {
        whitespace(); const name = string();
        if (keys.has(name)) fail('duplicate JSON object member');
        keys.add(name); whitespace(); i++; scan(depth + 1); whitespace();
        if (source[i++] === '}') return;
      }
    }
    if (source[i] === '[') {
      i++; whitespace(); if (source[i] === ']') { i++; return; }
      while (true) { scan(depth + 1); whitespace(); if (source[i++] === ']') return; }
    }
    if (source[i] === '"') { string(); return; }
    while (i < source.length && !/[\x20\t\r\n,}\]]/.test(source[i])) i++;
  }
  scan(0);
  return value;
}

if (require.main === module) {
  try {
    if (process.argv.length !== 3) fail('usage: node scripts/evaluation-accounting.js <record.json>');
    // Read at most the limit plus one byte, even for a large file.
    const fd = fs.openSync(process.argv[2], fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
    let bytes;
    try {
      if (!fs.fstatSync(fd).isFile()) fail('input must be a regular file');
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      let used = 0, n;
      while (used < buffer.length && (n = fs.readSync(fd, buffer, used, buffer.length - used, null)) > 0) used += n;
      bytes = buffer.subarray(0, used);
    } finally { fs.closeSync(fd); }
    console.log(JSON.stringify(report(parse(bytes)), null, 2));
  } catch (error) { console.error(`evaluation-accounting: ${error.message}`); process.exitCode = 1; }
}
module.exports = { report, parse };
