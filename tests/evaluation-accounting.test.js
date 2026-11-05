'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, parse } = require('../scripts/evaluation-accounting');

function fixture() {
  return { version: 1, na_reasons: ['ineligible'], planned: [
    { task_id: 'a', condition: 'baseline', retry_allowed: true },
    { task_id: 'b', condition: 'baseline', retry_allowed: false },
    { task_id: 'c', condition: 'candidate', retry_allowed: false },
  ], results: [
    { task_id: 'a', condition: 'baseline', verdict: 'PASS', na_reason: null, attempted: true, completed: true, attempts: [{ id: '1', status: 'INVALID' }, { id: '2', status: 'COMPLETED' }] },
    { task_id: 'b', condition: 'baseline', verdict: 'UNKNOWN', na_reason: null, attempted: false, completed: false, attempts: [{ id: '1', status: 'SKIPPED' }] },
    { task_id: 'c', condition: 'candidate', verdict: 'NA', na_reason: 'ineligible', attempted: false, completed: false, attempts: [] },
  ] };
}
const cli = path.join(__dirname, '..', 'scripts', 'evaluation-accounting.js');
function runCli(input, timeout = 20000) {
  return spawnSync(process.execPath, [cli, input], { encoding: 'utf8', timeout });
}
test('CLI reads a regular JSON file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evaluation-accounting-'));
  try {
    const input = path.join(dir, 'record.json');
    fs.writeFileSync(input, JSON.stringify(fixture()));
    const result = runCli(input);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(JSON.parse(result.stdout), report(fixture()));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('CLI rejects a directory and unwritten FIFO without blocking', { skip: process.platform === 'win32' ? 'POSIX FIFO creation and nonblocking open are not available on Windows' : false }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evaluation-accounting-'));
  try {
    const fifo = path.join(dir, 'input.fifo');
    const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8', timeout: 20000 });
    assert.ifError(made.error);
    assert.equal(made.status, 0, made.stderr);
    for (const input of [dir, fifo]) {
      const result = runCli(input);
      assert.ifError(result.error);
      assert.equal(result.status, 1, result.stderr);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /^evaluation-accounting: input must be a regular file\s*$/);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('accounts for unknown, retries and denominators', () => {
  assert.deepEqual(report(fixture()), { counts: { planned: 3, PASS: 1, FAIL: 0, UNKNOWN: 1, NA: 1, eligible: 2, attempted: 1, completed: 1, attempts: 3 }, rates: { pass: { numerator: 1, denominator: 2, value: 0.5 }, completion: { numerator: 1, denominator: 2, value: 0.5 } } });
});
test('zero denominator is null, not zero or NaN', () => {
  const r = report({ version: 1, na_reasons: [], planned: [], results: [] });
  assert.deepEqual(r.rates.pass, { numerator: 0, denominator: 0, value: null });
  assert.equal(r.rates.completion.value, null);
});
test('rejects malformed schema and input bytes', () => {
  const r = fixture(); r.extra = 1; assert.throws(() => report(r));
  assert.throws(() => parse(Buffer.from('{')));
  assert.throws(() => parse(Buffer.from('{"version":1,"ver\\u0073ion":1}')));
  assert.throws(() => parse(Buffer.from([0xff])));
  assert.throws(() => parse(Buffer.alloc(1048577)));
  assert.throws(() => parse(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])));
});
test('rejects duplicate, missing and unplanned pairs', () => {
  let r = fixture(); r.planned.push(r.planned[0]); assert.throws(() => report(r));
  r = fixture(); r.results.push(r.results[0]); assert.throws(() => report(r));
  r = fixture(); r.results.pop(); assert.throws(() => report(r));
  r = fixture(); r.results[0].task_id = 'other'; assert.throws(() => report(r));
});
test('rejects inconsistent status and unauthorized retry', () => {
  let r = fixture(); r.results[0].attempts[1].id = '1'; assert.throws(() => report(r));
  r = fixture(); r.planned[0].retry_allowed = false; assert.throws(() => report(r));
  r = fixture(); r.results[0].completed = false; assert.throws(() => report(r));
  r = fixture(); r.results[0].attempts.push({ id: '3', status: 'STARTED' }); assert.throws(() => report(r));
  r = fixture(); r.results[2].na_reason = 'not registered'; assert.throws(() => report(r));
  r = fixture(); r.results[1].verdict = 'FAIL'; assert.throws(() => report(r));
});
test('unreconciled starts never become PASS or FAIL through later completion', () => {
  for (const order of [['STARTED', 'COMPLETED'], ['COMPLETED', 'STARTED']]) {
    for (const verdict of ['PASS', 'FAIL', 'UNKNOWN']) {
      const r = fixture(); const entry = r.results[0];
      entry.attempts = order.map((status, i) => ({ id: String(i), status }));
      entry.attempted = true; entry.completed = order[1] === 'COMPLETED'; entry.verdict = verdict;
      if (verdict !== 'UNKNOWN') assert.throws(() => report(r));
      else assert.equal(report(r).counts.completed, Number(entry.completed));
    }
  }
});
test('interleaved attempts preserve verdict and error behavior', () => {
  const r = fixture(); const entry = r.results[0];
  entry.attempts = ['INVALID', 'COMPLETED', 'SKIPPED', 'COMPLETED'].map((status, i) => ({ id: String(i), status }));
  for (const verdict of ['PASS', 'FAIL', 'UNKNOWN']) {
    entry.verdict = verdict;
    assert.equal(report(r).counts[verdict], verdict === 'UNKNOWN' ? 2 : 1);
  }
  entry.attempts[2].status = 'STARTED'; entry.verdict = 'PASS';
  assert.throws(() => report(r), { message: 'started attempt requires UNKNOWN' });
  entry.verdict = 'UNKNOWN';
  assert.equal(report(r).counts.UNKNOWN, 2);
  entry.attempts[3].status = 'INVALID'; entry.completed = false; entry.verdict = 'FAIL';
  assert.throws(() => report(r), { message: 'PASS/FAIL require a completed attempt' });
  entry.verdict = 'UNKNOWN';
  assert.equal(report(r).counts.completed, 0);
});
test('accounts for maximum-length retry history', () => {
  const r = fixture(); const entry = r.results[0];
  entry.attempts = Array.from({ length: 10000 }, (_, i) => ({ id: String(i), status: i === 9999 ? 'COMPLETED' : 'INVALID' }));
  const out = report(r);
  assert.equal(out.counts.PASS, 1);
  assert.equal(out.counts.attempts, 10001);
  assert.equal(out.counts.completed, 1);
});
test('completed UNKNOWN and observed FAIL remain distinct', () => {
  const r = fixture(); r.results[0].verdict = 'UNKNOWN';
  r.results[1].verdict = 'FAIL'; r.results[1].attempted = true; r.results[1].completed = true; r.results[1].attempts = [{ id: 'f', status: 'COMPLETED' }];
  const out = report(r); assert.equal(out.counts.UNKNOWN, 1); assert.equal(out.counts.FAIL, 1); assert.equal(out.counts.completed, 2);
});
