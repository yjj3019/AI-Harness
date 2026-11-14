'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validate } = require('../scripts/source-adoption-check');
const manifestPath = path.join(__dirname, '..', 'docs', 'source-adoption-2026-11-14.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const modified = cb => { const clone = structuredClone(manifest); cb(clone); return clone; };

test('reviewed adoption declarations are consistent and contain no copied files', () => {
  assert.deepEqual(validate(manifest), { entries: 6, copied_files: 0, certification: 'NOT_PERFORMED' });
  assert.deepEqual(manifest.entries.map(x => x.license_label),
    ['MIT', 'MIT', 'MIT', 'Apache-2.0', 'CUSTOM-ATTRIBUTION', 'Apache-2.0']);
  assert.deepEqual(manifest.entries.map(x => x.verified_spdx),
    ['MIT', 'MIT', 'MIT', 'Apache-2.0', 'CUSTOM-ATTRIBUTION', 'Apache-2.0']);
});
test('rejects copied file claims, unknown fields, and verified_spdx mismatches', () => {
  assert.throws(() => validate(modified(m => m.entries[0].copied_files = ['external.js'])));
  assert.throws(() => validate(modified(m => m.entries[0].unapproved = 'yes')));
  assert.throws(() => validate(modified(m => m.entries[0].method = 'copy')));
  assert.throws(() => validate(modified(m => m.entries[0].verified_spdx = 'Apache-2.0')));
});
test('rejects repeated sources and identifiers', () => {
  assert.throws(() => validate(modified(m => m.entries[1].id = m.entries[0].id)));
  assert.throws(() => validate(modified(m => m.entries[1].source_url = m.entries[0].source_url)));
});
test('rejects foreign or credential-bearing provenance and license URLs', () => {
  assert.throws(() => validate(modified(m => m.entries[0].source_url = 'https://evil.example/a/b')));
  assert.throws(() => validate(modified(m => m.entries[0].license_url = m.entries[1].license_url)));
  assert.throws(() => validate(modified(m => m.entries[0].source_url = 'https://user:password@github.com/a/b')));
});
test('custom attribution requires source credit and sensible date', () => {
  assert.throws(() => validate(modified(m => m.entries[4].credit_url = null)));
  assert.throws(() => validate(modified(m => m.entries[4].credit_url = 'https://github.com/unrelated/thing')));
  assert.throws(() => validate(modified(m => m.entries[2].checked_at = '2026-02-30')));
});
test('CLI validates the reviewed baseline in read-only mode', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'source-adoption-check.js'), manifestPath], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /6 declarations consistent/);
  assert.match(result.stdout, /verified_spdx cross-checked/);
});
