'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const paired = require('../scripts/paired-evaluation');
const accounting = require('../scripts/evaluation-accounting');

function fixture(verdicts = [['FAIL', 'PASS']]) {
  const context = { benchmark: 'bench', case_set: 'cases', rubric: 'rubric', scorer: 'scorer', environment: 'env' };
  const planned = [], results = [];
  verdicts.forEach((pair, i) => pair.forEach((verdict, j) => {
    const condition = ['old', 'new'][j], task_id = `t${i}`;
    planned.push({ task_id, condition, retry_allowed: false });
    const completed = verdict === 'PASS' || verdict === 'FAIL';
    results.push({ task_id, condition, verdict, na_reason: verdict === 'NA' ? 'excluded' : null,
      attempted: completed, completed, attempts: completed ? [{ id: 'a', status: 'COMPLETED' }] : [] });
  }));
  return { version: 1, baseline: 'old', candidate: 'new', context: { baseline: { ...context }, candidate: { ...context } },
    accounting: { version: 1, na_reasons: ['excluded'], planned, results } };
}
test('classifies all four PASS/FAIL combinations and regression takes precedence', () => {
  const r = paired.report(fixture([['FAIL', 'PASS'], ['PASS', 'FAIL'], ['PASS', 'PASS'], ['FAIL', 'FAIL']]));
  assert.deepEqual(r, { outcome: 'DECLARED_REGRESSIONS_PRESENT', counts: { pairs: 4, pass_pass: 1, fail_pass: 1, pass_fail: 1, fail_fail: 1, incomparable_pairs: 0, UNKNOWN_conditions: 0, NA_conditions: 0 }, mismatched_context: [], missing_context_fields: [] });
  assert.equal(paired.report(fixture()).outcome, 'DECLARED_GAINS_ONLY');
  assert.equal(paired.report(fixture([['PASS', 'PASS'], ['FAIL', 'FAIL']])).outcome, 'DECLARED_NO_DIFFERENCE');
  const allFail = paired.report(fixture([['FAIL', 'FAIL'], ['FAIL', 'FAIL']]));
  assert.equal(allFail.outcome, 'DECLARED_NO_DIFFERENCE');
  assert.equal(allFail.counts.fail_fail, 2);
  assert.equal(allFail.counts.pass_pass, 0);
});
test('uncertain verdicts count occurrences and pairs without promotion', () => {
  const r = paired.report(fixture([['UNKNOWN', 'NA'], ['PASS', 'UNKNOWN'], ['FAIL', 'PASS']]));
  assert.equal(r.outcome, 'INCONCLUSIVE');
  assert.deepEqual(r.counts, { pairs: 3, pass_pass: 0, fail_pass: 1, pass_fail: 0, fail_fail: 0, incomparable_pairs: 2, UNKNOWN_conditions: 2, NA_conditions: 1 });
  for (const v of ['UNKNOWN', 'NA']) for (const side of [0, 1]) {
    const pair = ['PASS', 'PASS']; pair[side] = v;
    assert.equal(paired.report(fixture([pair])).outcome, 'INCONCLUSIVE');
  }
});
test('each context identifier is explicit and mismatches are inconclusive', () => {
  for (const field of ['benchmark', 'case_set', 'rubric', 'scorer', 'environment']) {
    let r = fixture(); r.context.candidate[field] = 'different';
    const result = paired.report(r);
    assert.deepEqual(result.mismatched_context, [field]);
    assert.equal(result.outcome, 'INCONCLUSIVE');
    assert.equal(result.counts.fail_pass, 1); // Raw declarations remain visible, not comparable evidence.
    for (const value of ['', ' x', 'x'.repeat(201)]) {
      r = fixture(); r.context.baseline[field] = value; assert.throws(() => paired.report(r));
    }
    r = fixture(); delete r.context.baseline[field]; assert.throws(() => paired.report(r));
  }
  const r = fixture(); r.context.candidate.extra = 'secret'; assert.throws(() => paired.report(r));
});
test('null context is unknown on either side, including matching nulls', () => {
  for (const field of ['benchmark', 'case_set', 'rubric', 'scorer', 'environment']) {
    for (const sides of [['baseline'], ['candidate'], ['baseline', 'candidate']]) {
      const r = fixture();
      for (const side of sides) r.context[side][field] = null;
      const result = paired.report(r);
      assert.equal(result.outcome, 'INCONCLUSIVE');
      assert.deepEqual(result.missing_context_fields, [field]);
      assert.deepEqual(result.mismatched_context, []);
      assert.equal(result.counts.fail_pass, 1);
    }
  }
  const r = fixture();
  r.context.baseline.benchmark = null;
  r.context.candidate.case_set = null;
  r.context.candidate.rubric = 'rubric-v2';
  const result = paired.report(r);
  assert.equal(result.outcome, 'INCONCLUSIVE');
  assert.deepEqual(result.missing_context_fields, ['benchmark', 'case_set']);
  assert.deepEqual(result.mismatched_context, ['rubric']);
});
test('context rejects ambiguous sentinels but accepts other opaque identifiers', () => {
  for (const field of ['benchmark', 'case_set', 'rubric', 'scorer', 'environment']) {
    for (const side of ['baseline', 'candidate']) {
      for (const value of ['UNKNOWN', 'unknown', 'N/A', 'n/a', 'NA', 'na', 'TBD', 'tbd', 'NONE', 'none', 'UNSPECIFIED', 'unspecified', ' Unknown ']) {
        const r = fixture(); r.context[side][field] = value;
        assert.throws(() => paired.report(r));
      }
    }
  }
  const r = fixture();
  r.context.baseline.benchmark = r.context.candidate.benchmark = 'benchmark-unknown-v1';
  r.context.baseline.environment = r.context.candidate.environment = 'prod-na-1';
  assert.equal(paired.report(r).outcome, 'DECLARED_GAINS_ONLY');
});
test('requires complete unique planned pairs and existing accounting validation', () => {
  let r = fixture(); r.accounting.planned.pop(); r.accounting.results.pop(); assert.throws(() => paired.report(r));
  r = fixture(); r.accounting.planned.push({ ...r.accounting.planned[0] }); assert.throws(() => paired.report(r));
  r = fixture(); r.accounting.results.push({ ...r.accounting.results[0] }); assert.throws(() => paired.report(r));
  r = fixture(); r.accounting.results.pop(); assert.throws(() => paired.report(r));
  r = fixture(); r.accounting.planned[0].condition = 'extra'; r.accounting.results[0].condition = 'extra'; assert.throws(() => paired.report(r));
  r = fixture([]); assert.throws(() => paired.report(r));
  r = fixture(); r.candidate = r.baseline; assert.throws(() => paired.report(r));
  r = fixture(); r.accounting.results[0].attempted = false; assert.throws(() => paired.report(r));
  r = fixture(); r.accounting.results[0].attempts.push({ id: 'b', status: 'COMPLETED' }); assert.throws(() => paired.report(r));
});
test('does not mutate accounting and keeps accounting report unchanged', () => {
  const r = fixture(); const before = structuredClone(r); const expected = accounting.report(r.accounting);
  paired.report(r); assert.deepEqual(r, before); assert.deepEqual(accounting.report(r.accounting), expected);
});
test('programmatic getters are snapshotted before validation and classification', () => {
  const first = fixture([['PASS', 'FAIL']]);
  const second = fixture([['FAIL', 'PASS']]);
  const input = fixture();
  let calls = 0;
  Object.defineProperty(input, 'accounting', { enumerable: true, get() { return ++calls === 1 ? first.accounting : second.accounting; } });
  assert.equal(paired.report(input).outcome, 'DECLARED_REGRESSIONS_PRESENT');
  assert.equal(calls, 1);
  const nested = fixture([['PASS', 'FAIL']]);
  let reads = 0;
  Object.defineProperty(nested.accounting.results[0], 'verdict', { enumerable: true, get() { return ++reads === 1 ? 'PASS' : 'FAIL'; } });
  assert.equal(paired.report(nested).outcome, 'DECLARED_REGRESSIONS_PRESENT');
  assert.equal(reads, 1);
  assert.throws(() => paired.report(new Proxy(fixture(), {})));
});
test('reuses strict bounded JSON, UTF-8 and duplicate key validation', () => {
  const r = fixture(); assert.deepEqual(paired.parse(Buffer.from(JSON.stringify(r))), r);
  for (const data of [Buffer.from('{"x":1,"\\u0078":2}'), Buffer.from([0xff]), Buffer.alloc(1048577), Buffer.from([0xef,0xbb,0xbf,0x7b,0x7d]), Buffer.from('{')]) assert.throws(() => paired.parse(data));
});
// Run the actual CLI in a child with an in-memory read-only filesystem fixture;
// all writes through fs are rejected, so the test creates no fixture files.
function cli(bytes, regular = true) {
  const script = path.resolve(__dirname, '../scripts/paired-evaluation.js');
  const code = `const fs=require('node:fs'); const b=Buffer.from(process.env.DATA,'base64'); let pos=0; let max=0;
fs.openSync=()=>42; fs.fstatSync=()=>({isFile:()=>${regular}}); fs.closeSync=()=>{};
fs.readSync=(fd,buf,off,len)=>{max=Math.max(max,len); const n=Math.min(len,b.length-pos); b.copy(buf,off,pos,pos+n);pos+=n;return n};
for(const k of ['writeFileSync','appendFileSync','unlinkSync','mkdirSync','renameSync']) fs[k]=()=>{throw Error('unexpected write')};
process.argv=['node',${JSON.stringify(script)},'secret-path']; require('node:module').runMain();
process.on('exit',()=>{if(pos>1048577||max>1048577)process.exitCode=99});`;
  return spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', env: { ...process.env, DATA: bytes.toString('base64') }, maxBuffer: 3 * 1024 * 1024 });
}
test('CLI emits only aggregate JSON and handles file errors without leaking data', () => {
  const r = fixture(); r.context.baseline.benchmark = r.context.candidate.benchmark = 'private-identifier';
  const out = cli(Buffer.from(JSON.stringify(r))); assert.equal(out.status, 0, out.stderr);
  assert.equal(JSON.parse(out.stdout).outcome, 'DECLARED_GAINS_ONLY'); assert.ok(!out.stdout.includes('private-identifier'));
  for (const bad of [cli(Buffer.from('{')), cli(Buffer.from('{}'), false)]) {
    assert.equal(bad.status, 1); assert.equal(bad.stdout, ''); assert.ok(!bad.stderr.includes('secret-path'));
  }
});
test('CLI caps reads at one MiB plus one', () => {
  // Avoid operating-system environment-size limits while using the same in-memory CLI harness.
  const script = path.resolve(__dirname, '../scripts/paired-evaluation.js');
  const code = `const fs=require('node:fs');let total=0;fs.openSync=()=>1;fs.fstatSync=()=>({isFile:()=>true});fs.closeSync=()=>{};fs.readSync=(fd,b,o,n)=>{total+=n;b.fill(32,o,o+n);return n};process.argv=['node',${JSON.stringify(script)},'x'];require('node:module').runMain();process.on('exit',()=>{if(total!==1048577)process.exitCode=99})`;
  const out = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8' });
  assert.equal(out.status, 1, out.stderr); assert.equal(out.stdout, '');
});
