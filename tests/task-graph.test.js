'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze, main } = require('../scripts/task-graph.js');

const task = (id, extra = {}) => ({ id, dependencies: [], role: 'reader', readScopes: ['fixture'], writeScopes: [], retryCap: 1, attempts: 0, status: 'PENDING', effect: 'NONE', ...extra });
const graph = (...tasks) => ({ version: 1, tasks });
const nodes = result => Object.fromEntries(result.nodes.map(n => [n.id, n]));

test('valid graph yields deterministic declared readiness', () => {
  const a = task('a', { status: 'PASS', attempts: 1 });
  const b = task('b', { dependencies: ['a'] });
  assert.deepEqual(analyze(graph(b, a)), analyze(graph(a, b)));
  assert.equal(nodes(analyze(graph(b, a))).b.state, 'READY');
});
test('opt-in exact labels report ready pairs and preserve directions deterministically', () => {
  const a = task('a', { readScopes: ['x', 'read', 'Case'], writeScopes: ['x', 'z'] });
  const b = task('b', { readScopes: ['x', 'z', 'read', 'case'], writeScopes: ['x'] });
  const blocked = task('c', { status: 'UNKNOWN', writeScopes: ['x'] });
  const done = task('d', { status: 'PASS', attempts: 1, writeScopes: ['x'] });
  const options = { scopeWarnings: true };
  const result = analyze(graph(b, blocked, a, done), options);
  assert.deepEqual(result, analyze(graph(done, a, b, blocked), options));
  assert.deepEqual(result.scopeWarnings, { warnings: [
    { tasks: ['a', 'b'], label: 'x', modes: ['write/write', 'write/read', 'read/write'] },
    { tasks: ['a', 'b'], label: 'z', modes: ['write/read'] }
  ], total: 2, truncated: false });
  assert.equal(Object.hasOwn(analyze(graph(a, b)), 'scopeWarnings'), false);
  assert.equal(Object.hasOwn(analyze(graph(task('a', { dependencies: ['missing'] })), options), 'scopeWarnings'), false);
  assert.deepEqual(analyze(graph(task('a'), task('b')), options).scopeWarnings, { warnings: [], total: 0, truncated: false });
});
test('scope warnings count all results while retaining only the first 256', () => {
  const labels = Array.from({ length: 256 }, (_, i) => `label${String(i).padStart(3, '0')}`);
  const a = task('a', { readScopes: [], writeScopes: labels });
  const b = task('b', { readScopes: labels, writeScopes: [] });
  const c = task('c', { readScopes: ['label000'], writeScopes: [] });
  const result = analyze(graph(c, b, a), { scopeWarnings: true }).scopeWarnings;
  assert.equal(result.total, 257);
  assert.equal(result.truncated, true);
  assert.equal(result.warnings.length, 256);
  assert.equal(result.warnings[255].label, 'label255');
  assert.deepEqual(result, analyze(graph(a, b, c), { scopeWarnings: true }).scopeWarnings);
  assert.equal(analyze(graph(a, b), { scopeWarnings: true }).scopeWarnings.truncated, false);
});
test('rejects cycles, dangling references, duplicate IDs and unexpected properties', () => {
  for (const g of [graph(task('a', { dependencies: ['b'] }), task('b', { dependencies: ['a'] })), graph(task('a', { dependencies: ['missing'] })), graph(task('a'), task('a')), graph(task('a', { surprise: 1 }))]) assert.equal(analyze(g).verdict, 'FAIL');
});
test('unknown and failed prerequisites block downstream even if retryable', () => {
  for (const status of ['UNKNOWN', 'FAIL']) {
    const r = nodes(analyze(graph(task('a', { status, attempts: 1 }), task('b', { dependencies: ['a'] }))));
    assert.equal(r.b.state, 'BLOCKED');
    assert.deepEqual(r.b.unmet, ['a']);
    if (status === 'UNKNOWN') assert.equal(r.a.state, 'BLOCKED');
  }
});
test('rejects PASS with non-PASS prerequisites, including a downstream pending node', () => {
  for (const status of ['UNKNOWN', 'FAIL']) {
    const result = analyze(graph(task('a', { status, attempts: 1 }), task('b', { dependencies: ['a'], status: 'PASS', attempts: 1 }), task('c', { dependencies: ['b'] })));
    assert.equal(result.verdict, 'FAIL');
    assert.match(result.errors.join('\n'), /b: PASS requires dependency a to be PASS/);
  }
});
test('scope lengths count Unicode code points', () => {
  assert.equal(analyze(graph(task('a', { readScopes: ['😀'.repeat(256)] }))).verdict, 'PASS');
  assert.equal(analyze(graph(task('a', { readScopes: ['😀'.repeat(257)] }))).verdict, 'FAIL');
});
test('retry cap is retries after first attempt, never auto-retries effects', () => {
  const r = nodes(analyze(graph(task('retry', { status: 'FAIL', attempts: 1 }), task('spent', { status: 'FAIL', attempts: 2 }), task('external', { status: 'FAIL', attempts: 1, effect: 'EXTERNAL' }), task('unknown', { status: 'UNKNOWN', attempts: 1, effect: 'EXTERNAL' }))));
  assert.equal(r.retry.state, 'READY');
  for (const id of ['spent', 'external', 'unknown']) assert.equal(r[id].state, 'BLOCKED');
  assert.equal(analyze(graph(task('a', { attempts: 3, status: 'FAIL' }))).verdict, 'FAIL');
});
test('bounded schema rejects invalid shapes and values', () => {
  for (const g of [null, graph(), graph(task('a', { retryCap: 11 })), graph(task('a', { readScopes: [''] })), graph(task('a', { dependencies: ['a', 'a'] })), graph(task('a', { status: 'PASS' }))]) assert.equal(analyze(g).verdict, 'FAIL');
});
test('programmatic sparse arrays are invalid rather than skipped', () => {
  for (const g of [
    { version: 1, tasks: Array(1) },
    graph(task('a', { dependencies: Array(1) })),
    graph(task('a', { readScopes: Array(1) })),
    graph(task('a', { writeScopes: Array(1) }), task('b', { writeScopes: Array(1) }))
  ]) assert.equal(analyze(g, { scopeWarnings: true }).verdict, 'FAIL');
});
test('analysis has no host effects; CLI reads only named input', () => {
  const original = { openSync: fs.openSync, fstatSync: fs.fstatSync, readSync: fs.readSync, closeSync: fs.closeSync, writeFileSync: fs.writeFileSync, log: console.log };
  const input = Buffer.from(JSON.stringify(graph(task('a'))));
  const calls = [];
  try {
    fs.openSync = (path, flags) => { calls.push(['open', path, flags]); return 42; };
    fs.fstatSync = fd => { calls.push(['fstat', fd]); return { isFile: () => true }; };
    fs.readSync = (fd, buffer, offset) => { calls.push(['read', fd]); if (offset) return 0; input.copy(buffer, offset); return input.length; };
    fs.closeSync = fd => calls.push(['close', fd]);
    fs.writeFileSync = () => { throw new Error('unexpected write'); };
    console.log = () => {};
    analyze(graph(task('a')));
    assert.deepEqual(calls, []);
    assert.equal(main(['specified.json']), 0);
    assert.deepEqual(calls, [['open', 'specified.json', fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0)], ['fstat', 42], ['read', 42], ['read', 42], ['close', 42]]);
  } finally { Object.assign(fs, { openSync: original.openSync, fstatSync: original.fstatSync, readSync: original.readSync, closeSync: original.closeSync, writeFileSync: original.writeFileSync }); console.log = original.log; }
});
test('CLI opt-in flag precedes input and default output stays unchanged', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-graph-cli-'));
  try {
    const input = path.join(dir, 'input.json');
    fs.writeFileSync(input, JSON.stringify(graph(task('a', { writeScopes: ['fixture'] }), task('b'))));
    const cli = path.resolve(__dirname, '../scripts/task-graph.js');
    const run = args => {
      const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 15000 });
      assert.ifError(result.error);
      return result;
    };
    const normal = run([input]), opt = run(['--scope-warnings', input]);
    assert.ifError(normal.error); assert.ifError(opt.error);
    assert.equal(normal.status, 0); assert.equal(opt.status, 0);
    const plain = JSON.parse(normal.stdout), flagged = JSON.parse(opt.stdout);
    assert.equal(Object.hasOwn(plain, 'scopeWarnings'), false);
    assert.equal(flagged.scopeWarnings.total, 1);
    delete flagged.scopeWarnings;
    assert.deepEqual(flagged, plain);
    assert.equal(run([input, '--scope-warnings']).status, 2);
    assert.equal(run(['--scope-warnings']).status, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('unreadable input is UNKNOWN', () => {
  const open = fs.openSync, log = console.log;
  const output = [];
  try { console.log = s => output.push(JSON.parse(s)); fs.openSync = () => { throw new Error('denied'); }; assert.equal(main(['input']), 2); assert.equal(output[0].verdict, 'UNKNOWN'); }
  finally { fs.openSync = open; console.log = log; }
});
test('CLI rejects a directory and, on POSIX, a FIFO without blocking', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-graph-'));
  try {
    const cli = path.resolve(__dirname, '../scripts/task-graph.js');
    const check = input => {
      const result = spawnSync(process.execPath, [cli, input], { encoding: 'utf8', timeout: 20000 });
      assert.ifError(result.error);
      assert.equal(result.status, 2);
      assert.equal(JSON.parse(result.stdout).verdict, 'UNKNOWN');
    };
    check(dir);
    if (process.platform !== 'win32') {
      const fifo = path.join(dir, 'fifo');
      const mkfifo = spawnSync('mkfifo', [fifo], { timeout: 20000 });
      assert.ifError(mkfifo.error);
      assert.equal(mkfifo.status, 0);
      check(fifo);
    } else t.diagnostic('FIFO case requires POSIX');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('malformed JSON and invalid UTF-8 return FAIL', () => {
  const original = { open: fs.openSync, stat: fs.fstatSync, read: fs.readSync, close: fs.closeSync, log: console.log };
  try {
    fs.fstatSync = () => ({ isFile: () => true });
    for (const input of [Buffer.from('{'), Buffer.from([0xff])]) {
      let position = 0, output;
      fs.openSync = () => 42;
      fs.readSync = (fd, buffer, offset) => { if (position) return 0; position = 1; input.copy(buffer, offset); return input.length; };
      fs.closeSync = () => {};
      console.log = s => { output = JSON.parse(s); };
      assert.equal(main(['input']), 1);
      assert.equal(output.verdict, 'FAIL');
    }
  } finally { fs.openSync = original.open; fs.fstatSync = original.stat; fs.readSync = original.read; fs.closeSync = original.close; console.log = original.log; }
});

test('CLI rejects ambiguous duplicate members including escaped equivalents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-graph-duplicates-'));
  try {
    const input = path.join(dir, 'graph.json');
    const cli = path.resolve(__dirname, '../scripts/task-graph.js');
    const valid = JSON.stringify(graph(task('a')));
    for (const source of [
      valid.replace('"version":1', '"version":2,"version":1'),
      valid.replace('"status":"PENDING"', '"status":"PASS","status":"PENDING"'),
      valid.replace('"effect":"NONE"', '"effect":"EXTERNAL","\\u0065ffect":"NONE"')
    ]) {
      fs.writeFileSync(input, source);
      const result = spawnSync(process.execPath, [cli, input], { encoding: 'utf8', timeout: 15000 });
      assert.ifError(result.error);
      assert.equal(result.status, 1);
      assert.equal(JSON.parse(result.stdout).verdict, 'FAIL');
    }
    fs.writeFileSync(input, valid);
    const result = spawnSync(process.execPath, [cli, input], { encoding: 'utf8', timeout: 15000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).verdict, 'PASS');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
