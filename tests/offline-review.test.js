'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { generate, replayAssignment } = require('../scripts/offline-review');
const casesFile = path.join(__dirname, '..', 'docs', 'report-editing-cases.json');
const caseBytes = fs.readFileSync(casesFile);
const cases = JSON.parse(caseBytes).cases;
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-review-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const paths = ['secret-model-one.json', 'secret-model-two.json', 'packet.json', 'key.json'].map(f => path.join(dir, f));
  const values = [1, 2].map(n => Object.fromEntries(cases.map(c => [c.id, `candidate ${n} for ${c.id}`])));
  fs.writeFileSync(paths[0], JSON.stringify(values[0]));
  fs.writeFileSync(paths[1], JSON.stringify(values[1]));
  const args = ['--candidate-1', paths[0], '--candidate-2', paths[1], '--packet', paths[2], '--key', paths[3]];
  return { paths, values, args };
}
test('packet is blinded, key binds exact bytes and maps each case', t => {
  const { paths, values, args } = fixture(t);
  generate(args);
  const packetText = fs.readFileSync(paths[2], 'utf8');
  const packet = JSON.parse(packetText);
  const key = JSON.parse(fs.readFileSync(paths[3], 'utf8'));
  assert.equal(key.case_sha256, sha(caseBytes));
  assert.equal(key.packet_sha256, sha(fs.readFileSync(paths[2])));
  assert.equal(key.randomization.algorithm, 'hmac-sha256-case-id-v1');
  assert.match(key.randomization.seed, /^[0-9a-f]{64}$/);
  assert.equal(packetText.includes(key.randomization.seed), false);
  assert.equal(packetText.includes(key.randomization.algorithm), false);
  assert.deepEqual(key.inputs.map(i => i.sha256), paths.slice(0, 2).map(p => sha(fs.readFileSync(p))));
  assert.equal(packet.cases.length, cases.length);
  assert.match(packet.privacy_caveat, /may identify/);
  assert.doesNotMatch(packetText, /secret-model|sha256|assignments/);
  for (const [i, c] of packet.cases.entries()) {
    assert.equal(c.id, cases[i].id);
    assert.equal(c.source, cases[i].source);
    const a = key.assignments[i];
    assert.deepEqual(a, replayAssignment(key.randomization.seed, c.id, key.randomization.algorithm));
    assert.deepEqual([a.A, a.B].sort(), [1, 2]);
    assert.equal(c.candidates.A, values[a.A - 1][c.id]);
    assert.equal(c.candidates.B, values[a.B - 1][c.id]);
    assert.equal(Object.hasOwn(c, 'unacceptable'), false);
  }
});
test('separate generations use fresh private seeds without logging them', t => {
  const first = fixture(t);
  const second = fixture(t);
  const messages = [];
  const originalLog = console.log;
  try {
    console.log = (...parts) => messages.push(parts.join(' '));
    generate(first.args);
    generate(second.args);
  } finally { console.log = originalLog; }
  const seeds = [first, second].map(f => JSON.parse(fs.readFileSync(f.paths[3], 'utf8')).randomization.seed);
  assert.notEqual(seeds[0], seeds[1]);
  for (const seed of seeds) assert.equal(messages.join('\n').includes(seed), false);
});
test('versioned replay matches fixed vectors and is independent of case order', () => {
  const seed = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
  const ids = ['case-1', 'case-2', '한글'];
  const expected = [{ id: 'case-1', A: 2, B: 1 }, { id: 'case-2', A: 1, B: 2 }, { id: '한글', A: 1, B: 2 }];
  assert.deepEqual(ids.map(id => replayAssignment(seed, id)), expected);
  assert.deepEqual(ids.slice().reverse().map(id => replayAssignment(seed, id)).reverse(), expected);
  assert.throws(() => replayAssignment(seed, 'case-1', 'unknown'), /Unsupported/);
  for (const bad of ['', '00', 'g'.repeat(64), 'AA'.repeat(32)]) assert.throws(() => replayAssignment(bad, 'case-1'), /Seed/);
  assert.throws(() => replayAssignment(seed, ''), /case ID/);
  assert.throws(() => replayAssignment(seed, '\ud800'), /case ID/);
  assert.throws(() => replayAssignment(seed, '\ud801'), /case ID/);
});
test('different seeds vary allocations across a fixed set of IDs', () => {
  const ids = Array.from({ length: 64 }, (_, i) => `case-${i}`);
  const allocate = seed => ids.map(id => replayAssignment(seed, id).A);
  assert.notDeepEqual(allocate('00'.repeat(32)), allocate('01'.repeat(32)));
});
test('rejects missing, extra, and non-string candidates before creating output', t => {
  for (const mutation of [v => delete v[cases[0].id], v => { v.extra = 'x'; }, v => { v[cases[0].id] = 12; }, v => { v[cases[0].id] = '  '; }]) {
    const { paths, values, args } = fixture(t);
    mutation(values[0]);
    fs.writeFileSync(paths[0], JSON.stringify(values[0]));
    assert.throws(() => generate(args), /exactly the case IDs/);
    assert.equal(fs.existsSync(paths[2]), false);
    assert.equal(fs.existsSync(paths[3]), false);
  }
});
test('exclusive creation preserves existing files and rolls back reservation', t => {
  const { paths, args } = fixture(t);
  fs.writeFileSync(paths[3], 'do not overwrite');
  assert.throws(() => generate(args), /EEXIST/);
  assert.equal(fs.readFileSync(paths[3], 'utf8'), 'do not overwrite');
  assert.equal(fs.existsSync(paths[2]), false);
  fs.writeFileSync(paths[2], 'packet exists');
  assert.throws(() => generate(args), /EEXIST/);
  assert.equal(fs.readFileSync(paths[2], 'utf8'), 'packet exists');
});
test('bounds each candidate by bytes and rejects non-regular inputs', t => {
  const max = 16 * 1024 * 1024;
  for (const index of [0, 1]) {
    const { paths, args } = fixture(t);
    const json = fs.readFileSync(paths[index]);
    fs.writeFileSync(paths[index], Buffer.concat([json, Buffer.alloc(max - json.length, 32)]));
    generate(args); // Exactly the limit remains valid JSON.
    fs.unlinkSync(paths[2]); fs.unlinkSync(paths[3]);
    fs.appendFileSync(paths[index], ' ');
    assert.throws(() => generate(args), /exceeds 16 MiB/);
    assert.equal(fs.existsSync(paths[2]), false);
    assert.equal(fs.existsSync(paths[3]), false);
  }
  const { paths, args } = fixture(t);
  fs.unlinkSync(paths[0]); fs.mkdirSync(paths[0]);
  assert.throws(() => generate(args));
  assert.equal(fs.existsSync(paths[2]), false);
});
test('FIFO input is rejected without waiting for a writer', { skip: process.platform === 'win32' }, t => {
  const { spawnSync } = require('node:child_process');
  const { paths, args } = fixture(t);
  fs.unlinkSync(paths[0]);
  const mk = spawnSync('mkfifo', [paths[0]], { timeout: 5000 });
  assert.equal(mk.status, 0, String(mk.stderr));
  const run = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/offline-review.js'), ...args], { timeout: 5000, encoding: 'utf8' });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /regular file/);
  assert.equal(fs.existsSync(paths[2]), false);
});
test('read cap applies even if fstat understates file size', t => {
  const { paths, args } = fixture(t);
  fs.writeFileSync(paths[0], Buffer.alloc(16 * 1024 * 1024 + 1, 32));
  const original = fs.fstatSync;
  try {
    fs.fstatSync = fd => { const stat = original(fd); stat.size = 0; return stat; };
    assert.throws(() => generate(args), /exceeds 16 MiB/);
  } finally { fs.fstatSync = original; }
  assert.equal(fs.existsSync(paths[2]), false);
});
test('rejects malformed arguments and malformed JSON', t => {
  const { paths, args } = fixture(t);
  assert.throws(() => generate(args.concat('--key', 'other')), /Usage/);
  assert.throws(() => generate(args.slice(0, -1)), /Usage/);
  fs.writeFileSync(paths[0], '{');
  assert.throws(() => generate(args), /not valid JSON/);
  assert.equal(fs.existsSync(paths[2]), false);
});
