'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validate, scanCodeReferences, verifyLive, rawLicenseUrl, runLive } = require('../scripts/source-adoption-check');
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
test('license links must be pinned to a commit with a matching sha256', () => {
  const sha = '0123456789abcdef0123456789abcdef01234567';
  // A branch name in place of the commit, or a link naming a different commit, is rejected.
  assert.throws(() => validate(modified(m => { m.entries[0].license_url = m.entries[0].license_url.replace(m.entries[0].license_commit, 'main'); })));
  assert.throws(() => validate(modified(m => { m.entries[0].license_commit = sha; })));
  // The commit and the hash must have the exact shape (40 and 64 lowercase hex characters).
  assert.throws(() => validate(modified(m => { m.entries[0].license_commit = m.entries[0].license_commit.toUpperCase(); })));
  assert.throws(() => validate(modified(m => { m.entries[0].license_sha256 = 'abc'; })));
  assert.throws(() => validate(modified(m => { delete m.entries[0].license_sha256; })));
  assert.throws(() => validate(modified(m => { m.schema = 1; })));
  for (const e of manifest.entries) {
    assert.match(e.license_commit, /^[0-9a-f]{40}$/);
    assert.match(e.license_sha256, /^[0-9a-f]{64}$/);
    assert.ok(e.license_url.includes('/blob/' + e.license_commit + '/'));
  }
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
  assert.match(result.stdout, /verified_spdx recorded per entry/);
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
test('live verification maps a pinned license link to its raw URL', () => {
  const e = manifest.entries[0];
  assert.equal(rawLicenseUrl(e),
    'https://raw.githubusercontent.com/cloudflare/security-audit-skill/' + e.license_commit + '/LICENSE');
});
test('live verification reports match, mismatch and unreachable separately (injected fetch)', async () => {
  const fake = async (url) => {
    if (url.includes('shadcn')) return { ok: false };
    if (url.includes('cloudflare')) return { ok: true, arrayBuffer: async () => new TextEncoder().encode('changed upstream').buffer };
    if (url.includes('walkinglabs')) throw new Error('offline');
    const want = manifest.entries.find(x => url.includes('/' + x.license_commit + '/'));
    // Serve bytes whose sha256 equals the ledger value by hashing a stand-in with a patched ledger below.
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode('stand-in:' + want.id).buffer };
  };
  const patched = structuredClone(manifest);
  for (const e of patched.entries.slice(3)) {
    e.license_sha256 = require('node:crypto').createHash('sha256').update('stand-in:' + e.id).digest('hex');
  }
  const status = Object.fromEntries((await verifyLive(patched, fake)).map(r => [r.id, r.status]));
  assert.equal(status['cloudflare-security-audit'], 'mismatch');
  assert.equal(status['shadcn-improve'], 'unreachable');
  assert.equal(status['walkinglabs-learn-harness-engineering'], 'unreachable');
  assert.equal(status['anthropics-knowledge-work-plugins'], 'match');
  assert.equal(status['yang0-handraw-style'], 'match');
  assert.equal(status['pbakaus-impeccable'], 'match');
});
test('runLive maps results to exit codes and bounds each request', async () => {
  const quiet = process.stdout.write; process.stdout.write = () => true;
  try {
    const digest = (e) => require('node:crypto').createHash('sha256').update('x:' + e.id).digest('hex');
    const pinned = structuredClone(manifest);
    for (const e of pinned.entries) e.license_sha256 = digest(e);
    const serve = (mutate) => async (url, opts) => {
      assert.ok(opts && opts.signal, 'every live request carries a timeout signal');
      const e = pinned.entries.find(x => url.includes('/' + x.license_commit + '/'));
      return mutate(e) || { ok: true, arrayBuffer: async () => new TextEncoder().encode('x:' + e.id).buffer };
    };
    assert.equal(await runLive(pinned, serve(() => null)), 0);
    assert.equal(await runLive(pinned, serve(e => e === pinned.entries[0] ? { ok: true, arrayBuffer: async () => new TextEncoder().encode('other').buffer } : null)), 1);
    assert.equal(await runLive(pinned, serve(e => e === pinned.entries[1] ? { ok: false } : null)), 2);
    assert.equal(await runLive(pinned, serve(e => e === pinned.entries[2] ? { ok: true, arrayBuffer: async () => new ArrayBuffer(1024 * 1024 + 1) } : null)), 2);
  } finally { process.stdout.write = quiet; }
});
test('live read cap: exactly 1 MiB is read, one byte more is rejected, a stream is cut off early', async () => {
  const MAX = 1024 * 1024;
  const crypto = require('node:crypto');
  const one = { ...structuredClone(manifest), entries: [structuredClone(manifest.entries[0])] };
  const run = (res) => verifyLive(one, async () => res).then(r => r[0].status);
  const exact = new Uint8Array(MAX);
  one.entries[0].license_sha256 = crypto.createHash('sha256').update(exact).digest('hex');
  assert.equal(await run({ ok: true, arrayBuffer: async () => exact.buffer }), 'match');
  assert.equal(await run({ ok: true, arrayBuffer: async () => new ArrayBuffer(MAX + 1) }), 'unreachable');
  assert.equal(await run({ ok: true, headers: new Headers({ 'content-length': String(MAX + 1) }), arrayBuffer: async () => { throw new Error('must not buffer'); } }), 'unreachable');
  let pulled = 0, cancelled = false;
  const stream = { getReader: () => ({
    read: async () => { pulled++; return { done: false, value: new Uint8Array(MAX / 4) }; },
    cancel: async () => { cancelled = true; },
  }) };
  assert.equal(await run({ ok: true, body: stream }), 'unreachable');
  assert.ok(cancelled && pulled === 5, 'stream cancelled right after crossing the cap, pulled=' + pulled);
});
