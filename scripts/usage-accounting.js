'use strict';

// Offline accounting of caller-supplied usage records. Declared values are not
// provider truth: every number carries a source, and an absent value stays null.
// Prompt text, secrets and customer data are rejected by key allowlist, not stored.
const fs = require('node:fs');
const { TextDecoder } = require('node:util');

const MAX_BYTES = 1024 * 1024;
const MAX_ITEMS = 10000;
const SOURCES = new Set(['provider', 'estimate']);
const COUNTERS = ['input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens', 'calls'];

function fail(message) { throw new Error(message); }
function count(value, where) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${where}: expected non-negative safe integer`);
}
// Reading an unprovided value is null, never 0: absent is not "zero used".
function optionalCount(value, where) {
  if (value === null || value === undefined) return null;
  count(value, where);
  return value;
}
function text(value, where) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) fail(`${where}: expected nonempty string up to 200 chars`);
  return value;
}
function object(value, keys, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) {
    fail(`${where}: expected exactly ${keys.join(', ')}`);
  }
}
function list(value, where, max = MAX_ITEMS) {
  if (!Array.isArray(value) || value.length > max) fail(`${where}: expected array of at most ${max} items`);
  return value;
}

// Sum only within one source; a provider number never absorbs an estimate.
function sumBySource(entries, counter) {
  const out = { provider: null, estimate: null };
  for (const entry of entries) {
    const v = entry.usage[counter];
    if (v === null) continue;
    out[entry.source] = (out[entry.source] === null ? 0 : out[entry.source]) + v;
  }
  return out;
}

function summarise(entries) {
  const totals = {};
  for (const counter of COUNTERS) totals[counter] = sumBySource(entries, counter);
  const elapsed = { provider: null, estimate: null, unknown: 0 };
  const cost = { provider: null, estimate: null, currency: new Set() };
  for (const entry of entries) {
    if (entry.elapsed_ms !== null) elapsed[entry.source] = (elapsed[entry.source] ?? 0) + entry.elapsed_ms;
    else elapsed.unknown += 1;
    if (entry.cost !== null) {
      cost[entry.source] = (cost[entry.source] ?? 0) + entry.cost.amount;
      cost.currency.add(entry.cost.currency);
    }
  }
  const currencies = [...cost.currency];
  return {
    entries: entries.length,
    totals,
    elapsed_ms: elapsed,
    cost: {
      provider: cost.provider,
      estimate: cost.estimate,
      // Mixing currencies would fabricate a comparable total.
      currency: currencies.length === 0 ? null : currencies.length === 1 ? currencies[0] : 'MIXED',
    },
    // Non-zero when any declared field was absent; callers must not read totals as complete.
    unknown_fields: entries.reduce((n, e) => n + e.unknown, 0),
  };
}

function entry(value, where) {
  object(value, ['id', 'source', 'usage', 'elapsed_ms', 'cost', 'retries'], where);
  text(value.id, `${where}.id`);
  if (!SOURCES.has(value.source)) fail(`${where}.source: expected provider or estimate`);
  object(value.usage, ['input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens', 'calls'], `${where}.usage`);
  let unknown = 0;
  for (const c of COUNTERS) {
    const v = optionalCount(value.usage[c], `${where}.usage.${c}`);
    if (v === null) unknown += 1;
    value.usage[c] = v;
  }
  const elapsed = optionalCount(value.elapsed_ms, `${where}.elapsed_ms`);
  if (elapsed === null) unknown += 1;
  let cost = null;
  if (value.cost !== null) {
    object(value.cost, ['amount', 'currency'], `${where}.cost`);
    if (typeof value.cost.amount !== 'number' || !Number.isFinite(value.cost.amount) || value.cost.amount < 0) {
      fail(`${where}.cost.amount: expected non-negative finite number`);
    }
    cost = { amount: value.cost.amount, currency: text(value.cost.currency, `${where}.cost.currency`) };
  } else {
    unknown += 1;
  }
  const retries = list(value.retries, `${where}.retries`);
  // A retry keeps its own counts; folding it into the parent would hide the attempt.
  const nested = retries.map((r, i) => entry(r, `${where}.retries[${i}]`));
  return {
    id: value.id, source: value.source,
    usage: { ...value.usage },
    elapsed_ms: elapsed, cost, retries: nested, unknown,
  };
}

function report(input) {
  object(input, ['version', 'entries'], 'input');
  if (input.version !== 1) fail('input: unsupported version');
  const raw = list(input.entries, 'entries');
  const entries = raw.map((e, i) => entry(e, `entries[${i}]`));
  const ids = new Set();
  for (const e of entries) {
    if (ids.has(e.id)) fail(`duplicate entry id: ${e.id}`);
    ids.add(e.id);
  }
  const all = [];
  const flatten = (e) => { all.push(e); e.retries.forEach(flatten); };
  entries.forEach(flatten);
  return { version: 1, top_level: summarise(entries), including_retries: summarise(all) };
}

function main() {
  if (process.argv.length !== 3) {
    console.error('usage: node scripts/usage-accounting.js <record.json>');
    process.exit(2);
  }
  let input;
  try {
    const stat = fs.statSync(process.argv[2]);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('expected regular file up to 1 MiB');
    input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(process.argv[2])));
  } catch (error) {
    console.error(`usage-accounting: unreadable input (${error.message})`);
    process.exit(2);
  }
  try {
    process.stdout.write(JSON.stringify(report(input), null, 2) + '\n');
  } catch (error) {
    console.error(`usage-accounting: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { report };
