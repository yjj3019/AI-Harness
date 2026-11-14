'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validate, scanCodeReferences } = require('../scripts/source-adoption-check');
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
  assert.match(result.stdout, /unregistered code references: 0/);
});
test('code reference scan accepts self repo, ledger, and fixture references', () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'sa-scan-ok-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'scripts', 'ok.js'), [
      '// self: https://github.com/yjj3019/AI-Harness/blob/main/README.md',
      '// fixture: https://github.com/a/b and https://github.com/unrelated/thing',
      '// ledger: ' + manifest.entries[2].source_url,
    ].join('\n'));
    assert.deepEqual(scanCodeReferences(manifest, root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('code reference scan rejects unregistered external references', () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'sa-scan-bad-'));
  try {
    fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
    // 리터럴로 존재하지 않도록 동적 조합 (자기 자신이 스캔 대상이 되는 것 방지)
    const evil = ['github.com', 'evil', 'thing'].join('/');
    fs.writeFileSync(path.join(root, 'tests', 'probe.test.js'),
      '// copied from https://' + evil + '/blob/main/x.js\n');
    const violations = scanCodeReferences(manifest, root);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /github\.com\/evil\/thing/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
