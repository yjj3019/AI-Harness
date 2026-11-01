'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { generate } = require('../scripts/offline-review');
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
  assert.match(key.randomization, /no reproducible seed/);
  assert.deepEqual(key.inputs.map(i => i.sha256), paths.slice(0, 2).map(p => sha(fs.readFileSync(p))));
  assert.equal(packet.cases.length, cases.length);
  assert.match(packet.privacy_caveat, /may identify/);
  assert.doesNotMatch(packetText, /secret-model|sha256|assignments/);
  for (const [i, c] of packet.cases.entries()) {
    assert.equal(c.id, cases[i].id);
    assert.equal(c.source, cases[i].source);
    const a = key.assignments[i];
    assert.deepEqual([a.A, a.B].sort(), [1, 2]);
    assert.equal(c.candidates.A, values[a.A - 1][c.id]);
    assert.equal(c.candidates.B, values[a.B - 1][c.id]);
    assert.equal(Object.hasOwn(c, 'unacceptable'), false);
  }
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
test('rejects malformed UTF-8 rather than silently changing candidate output', t => {
  for (const index of [0, 1]) {
    const { paths, args } = fixture(t);
    const bytes = fs.readFileSync(paths[index]);
    const position = bytes.indexOf(Buffer.from('candidate'));
    assert.ok(position >= 0);
    bytes[position] = 0xff;
    fs.writeFileSync(paths[index], bytes);
    assert.throws(() => generate(args), /not valid UTF-8/);
    assert.equal(fs.existsSync(paths[2]), false);
    assert.equal(fs.existsSync(paths[3]), false);
  }
});
test('preserves valid multilingual output and interior BOM characters', t => {
  const { paths, values, args } = fixture(t);
  values[0][cases[0].id] = '한글 📝\ufeff원문';
  fs.writeFileSync(paths[0], JSON.stringify(values[0]));
  generate(args);
  const packet = JSON.parse(fs.readFileSync(paths[2], 'utf8'));
  assert.ok(Object.values(packet.cases[0].candidates).includes(values[0][cases[0].id]));
});
test('rejects a leading UTF-8 BOM rather than silently stripping it', t => {
  const { paths, args } = fixture(t);
  fs.writeFileSync(paths[0], Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), fs.readFileSync(paths[0])]));
  assert.throws(() => generate(args), /not valid JSON/);
  assert.equal(fs.existsSync(paths[2]), false);
  assert.equal(fs.existsSync(paths[3]), false);
});
test('rejects malformed arguments and malformed JSON', t => {
  const { paths, args } = fixture(t);
  assert.throws(() => generate(args.concat('--key', 'other')), /Usage/);
  assert.throws(() => generate(args.slice(0, -1)), /Usage/);
  fs.writeFileSync(paths[0], '{');
  assert.throws(() => generate(args), /not valid JSON/);
  assert.equal(fs.existsSync(paths[2]), false);
});
