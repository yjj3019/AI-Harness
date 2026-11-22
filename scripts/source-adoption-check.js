#!/usr/bin/env node
'use strict';
// Independent offline consistency check. This does not prove provenance, license
// compatibility, or that unrelated files contain no third-party code.
const fs = require('node:fs');

const MAX_BYTES = 1024 * 1024;
const LIVE_TIMEOUT_MS = 15000;
const LICENSES = new Set(['MIT', 'Apache-2.0', 'CUSTOM-ATTRIBUTION', 'UNVERIFIED']);
const METHODS = new Set(['ideas-only', 'fresh-implementation', 'reference-only']);
const KEYS = ['id', 'source_url', 'license_url', 'license_commit', 'license_sha256', 'license_label', 'verified_spdx', 'checked_at', 'method', 'copied_files', 'credit_url', 'concept'];
const CODE_DIRS = ['scripts', 'tests', '.claude', '.codex', '.agents'];
// 테스트 픽스처 전용 허용 참조: 실재하지 않는 가짜 저장소 경로이며 기존 네거티브 테스트에서만
// 참조 문자열로 쓰인다. 미등록 탐지 테스트용 URL은 테스트 파일에서 동적 조합해 리터럴로 존재하지 않는다.
const FIXTURE_REFS = new Set(['github.com/a/b', 'github.com/unrelated/thing']);
const REF_RE = /github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g;

// 새 로직: 코드 디렉터리(scripts·tests·.claude·.codex·.agents)에서 github.com 참조를 자동
// 스캔한다. 허용 대상은 ① 자기 저장소(github.com/yjj3019/*) ② 장부 등록 source/license/credit
// ③ 테스트 fixture 2건뿐. 이 외 미등록 외부 참조가 발견되면 위반으로 보고한다.
// docs/ 등 문서 디렉터리는 출처 기록(출처·라이선스 서지)을 담당하므로 스캔 대상에서 제외.
function scanCodeReferences(manifest, root) {
  const allowed = new Set(FIXTURE_REFS);
  allowed.add('github.com/yjj3019/');
  for (const item of manifest.entries) {
    allowed.add(item.source_url.replace(/^https:\/\//, ''));
    allowed.add(item.license_url.replace(/^https:\/\//, ''));
    if (item.credit_url !== null) allowed.add(item.credit_url.replace(/^https:\/\//, ''));
  }
  const violations = [];
  function walk(dir) {
    let names;
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of names) {
      const p = require('node:path').join(dir, ent.name);
      if (ent.isDirectory()) { walk(p); continue; }
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.match(REF_RE) || []) {
        if (!allowed.has(m) && !m.startsWith('github.com/yjj3019/')) violations.push(p + ' -> ' + m);
      }
    }
  }
  for (const d of CODE_DIRS) walk(require('node:path').join(root, d));
  return violations;
}

function fail() { throw new Error('invalid adoption manifest'); }
function exactObject(value, fields) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== fields.length || fields.some(k => !Object.hasOwn(value, k))) fail();
}
function nonempty(value, limit = 500) {
  if (typeof value !== 'string' || !value || value.length > limit || value.trim() !== value) fail();
}
function httpsUrl(value) {
  nonempty(value, 1000);
  let u;
  try { u = new URL(value); } catch { fail(); }
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.search ||
      u.toString() !== value || u.hostname !== 'github.com') fail();
  return u;
}
function checkedDate(value) {
  nonempty(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail();
  const d = new Date(value + 'T00:00:00.000Z');
  if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== value) fail();
}
function validate(manifest) {
  exactObject(manifest, ['schema', 'entries']);
  if (manifest.schema !== 2 || !Array.isArray(manifest.entries) ||
      manifest.entries.length === 0 || manifest.entries.length > 100) fail();
  const ids = new Set(), urls = new Set();
  for (const item of manifest.entries) {
    exactObject(item, KEYS);
    nonempty(item.id, 80); nonempty(item.concept, 600);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id)) fail();
    ids.add(item.id);
    const source = httpsUrl(item.source_url);
    if (!/^\/[^/]+\/[^/]+$/.test(source.pathname) || urls.has(item.source_url)) fail();
    urls.add(item.source_url);
    const license = httpsUrl(item.license_url);
    // A license link must name an immutable commit, not a branch, and carry the hash of the text read there.
    if (typeof item.license_commit !== 'string' || !/^[0-9a-f]{40}$/.test(item.license_commit) ||
        typeof item.license_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.license_sha256)) fail();
    if (!license.pathname.startsWith(source.pathname + '/blob/' + item.license_commit + '/') ||
        license.pathname.split('/').length < 6) fail();
    if (!LICENSES.has(item.license_label) || !METHODS.has(item.method)) fail();
    if (!LICENSES.has(item.verified_spdx) || item.verified_spdx !== item.license_label) fail();
    checkedDate(item.checked_at);
    if (!Array.isArray(item.copied_files) || item.copied_files.length !== 0) fail();
    if (item.credit_url !== null && item.credit_url !== item.source_url) fail();
    if (item.license_label === 'CUSTOM-ATTRIBUTION' && item.credit_url !== item.source_url) fail();
  }
  return { entries: manifest.entries.length, copied_files: 0, certification: 'NOT_PERFORMED' };
}
// Opt-in network check (`--verify-live`, never run by CI or run-all): re-read each pinned LICENSE
// from raw.githubusercontent.com at its recorded commit and compare the sha256 with the ledger.
// The offline validator only checks the shape of license_sha256; this is what compares content.
function rawLicenseUrl(item) {
  const parts = new URL(item.license_url).pathname.split('/'); // '', owner, repo, 'blob', commit, ...path
  return 'https://raw.githubusercontent.com/' + parts[1] + '/' + parts[2] + '/' + parts[4] + '/' + parts.slice(5).join('/');
}
// Read at most MAX_BYTES. A streamed body is cut off as soon as the cap is crossed, so an oversized
// response is never fully buffered; a fetch stand-in without a stream falls back to arrayBuffer.
async function readCapped(res) {
  const declared = Number(res.headers && res.headers.get && res.headers.get('content-length'));
  if (declared > MAX_BYTES) return null;
  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { await reader.cancel().catch(() => {}); return null; }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  const body = Buffer.from(await res.arrayBuffer());
  return body.length > MAX_BYTES ? null : body;
}
async function verifyLive(manifest, fetchImpl = fetch) {
  const results = [];
  for (const item of manifest.entries) {
    let status;
    try {
      const res = await fetchImpl(rawLicenseUrl(item), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
      if (!res.ok) status = 'unreachable';
      else {
        const body = await readCapped(res);
        if (body === null) status = 'unreachable'; // a LICENSE is small; anything larger is not what was pinned
        else status = require('node:crypto').createHash('sha256').update(body).digest('hex') === item.license_sha256 ? 'match' : 'mismatch';
      }
    } catch { status = 'unreachable'; }
    results.push({ id: item.id, status });
  }
  return results;
}
async function runLive(manifest, fetchImpl = fetch) {
  const results = await verifyLive(manifest, fetchImpl);
  for (const r of results) process.stdout.write('source-adoption-check: live ' + r.status + ' ' + r.id + '\n');
  // A mismatch is a finding (exit 1); an unreachable source is unverified, not a pass (exit 2).
  if (results.some(r => r.status === 'mismatch')) return 1;
  if (results.some(r => r.status !== 'match')) return 2;
  return 0;
}
function main(filename, live = false) {
  try {
    if (typeof filename !== 'string') fail();
    const st = fs.statSync(filename);
    if (!st.isFile() || st.size > MAX_BYTES) fail();
    const bytes = fs.readFileSync(filename);
    if (bytes.length > MAX_BYTES) fail();
    const manifest = JSON.parse(bytes.toString('utf8'));
    const result = validate(manifest);
    const violations = scanCodeReferences(manifest, require('node:path').resolve(__dirname, '..'));
    if (violations.length > 0) {
      process.stderr.write('source-adoption-check: unregistered external references in code: ' + violations.join(', ') + '\n');
      process.exitCode = 1;
      return;
    }
    process.stdout.write('source-adoption-check: ' + result.entries + ' declarations consistent; verified_spdx recorded per entry (checked_at); license links pinned to commits; unregistered code references: 0\n');
    if (live) runLive(manifest).then(code => { if (code) process.exitCode = code; }, () => { process.exitCode = 2; });
  } catch {
    process.stderr.write('source-adoption-check: invalid manifest or unreadable input\n');
    process.exitCode = 1;
  }
}
if (require.main === module) {
  const args = process.argv.slice(2);
  const live = args.includes('--verify-live');
  const files = args.filter(a => a !== '--verify-live');
  main(files.length === 1 ? files[0] : null, live);
}
module.exports = { validate, scanCodeReferences, verifyLive, rawLicenseUrl, runLive };
