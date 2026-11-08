'use strict';
// Usage accounting is arithmetic over declared records, not provider truth.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report } = require('../scripts/usage-accounting');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'usage-accounting.js');

function record(overrides = {}) {
  return {
    version: 1,
    entries: [{
      id: 'task-1', source: 'provider',
      usage: { input_tokens: 100, output_tokens: 50, cache_read_tokens: 0, cache_write_tokens: 0, calls: 1 },
      elapsed_ms: 1200, cost: { amount: 0.02, currency: 'USD' }, retries: [],
      ...overrides,
    }],
  };
}

test('absent usage values are null, never zero', () => {
  const r = report(record({ usage: { input_tokens: null, output_tokens: 50, cache_read_tokens: null, cache_write_tokens: null, calls: 1 } }));
  assert.equal(r.top_level.totals.input_tokens.provider, null);
  assert.equal(r.top_level.totals.cache_read_tokens.provider, null);
  assert.equal(r.top_level.totals.output_tokens.provider, 50);
  assert.ok(r.top_level.unknown_fields >= 1, 'absent fields must be counted, not treated as zero');
});

test('provider and estimate stay in separate totals', () => {
  const r = report({
    version: 1,
    entries: [
      record().entries[0],
      record({ id: 'task-2', source: 'estimate', usage: { input_tokens: 90, output_tokens: 40, cache_read_tokens: 0, cache_write_tokens: 0, calls: 1 }, cost: null }).entries[0],
    ],
  });
  assert.equal(r.top_level.totals.input_tokens.provider, 100);
  assert.equal(r.top_level.totals.input_tokens.estimate, 90);
});

test('retries are nested and counted separately from top level', () => {
  const r = report(record({
    retries: [{ id: 'task-1#r1', source: 'provider', usage: { input_tokens: 10, output_tokens: 5, cache_read_tokens: 0, cache_write_tokens: 0, calls: 1 }, elapsed_ms: 300, cost: null, retries: [] }],
  }));
  assert.equal(r.top_level.totals.calls.provider, 1);
  assert.equal(r.including_retries.totals.calls.provider, 2);
});

test('missing cost and elapsed are unknown, not zero', () => {
  const r = report(record({ cost: null, elapsed_ms: null }));
  assert.equal(r.top_level.cost.provider, null);
  assert.equal(r.top_level.elapsed_ms.provider, null);
  assert.equal(r.top_level.elapsed_ms.unknown, 1);
  assert.equal(r.top_level.cost.currency, null);
});

test('mixed currencies refuse to produce a comparable total', () => {
  const r = report({
    version: 1,
    entries: [
      record().entries[0],
      record({ id: 'task-2', cost: { amount: 1, currency: 'KRW' } }).entries[0],
    ],
  });
  assert.equal(r.top_level.cost.currency, 'MIXED');
});

test('unknown fields are rejected rather than silently stored', () => {
  assert.throws(() => report(record({ prompt: 'secret text' })), /expected exactly/);
  assert.throws(() => report(record({ source: 'guessed' })), /provider or estimate/);
  assert.throws(() => report(record({ usage: { input_tokens: 1, output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, calls: 1, prompt_text: 'x' } })), /expected exactly/);
  assert.throws(() => report(record({ usage: { input_tokens: -1, output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, calls: 1 } })), /non-negative/);
});

test('duplicate entry ids are rejected', () => {
  assert.throws(() => report({ version: 1, entries: [record().entries[0], record().entries[0]] }), /duplicate entry id/);
});

test('CLI exits 1 on invalid input and 2 on usage error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-'));
  try {
    const bad = path.join(dir, 'bad.json');
    fs.writeFileSync(bad, JSON.stringify({ version: 1, entries: [{ id: 'x' }] }));
    assert.equal(spawnSync(process.execPath, [SCRIPT, bad]).status, 1);
    assert.equal(spawnSync(process.execPath, [SCRIPT]).status, 2);
    const good = path.join(dir, 'good.json');
    fs.writeFileSync(good, JSON.stringify(record()));
    const ok = spawnSync(process.execPath, [SCRIPT, good]);
    assert.equal(ok.status, 0);
    assert.equal(JSON.parse(ok.stdout.toString()).top_level.entries, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
