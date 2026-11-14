#!/usr/bin/env node
'use strict';
// Independent offline consistency check. This does not prove provenance, license
// compatibility, or that unrelated files contain no third-party code.
const fs = require('node:fs');

const MAX_BYTES = 1024 * 1024;
const LICENSES = new Set(['MIT', 'Apache-2.0', 'CUSTOM-ATTRIBUTION', 'UNVERIFIED']);
const METHODS = new Set(['ideas-only', 'fresh-implementation', 'reference-only']);
const KEYS = ['id', 'source_url', 'license_url', 'license_label', 'verified_spdx', 'checked_at', 'method', 'copied_files', 'credit_url', 'concept'];
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
  if (manifest.schema !== 1 || !Array.isArray(manifest.entries) ||
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
    if (!license.pathname.startsWith(source.pathname + '/blob/') ||
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
function main(filename) {
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
    process.stdout.write('source-adoption-check: ' + result.entries + ' declarations consistent; verified_spdx cross-checked with GitHub API on 2026-11-15; unregistered code references: 0\n');
  } catch {
    process.stderr.write('source-adoption-check: invalid manifest or unreadable input\n');
    process.exitCode = 1;
  }
}
if (require.main === module) main(process.argv.length === 3 ? process.argv[2] : null);
module.exports = { validate, scanCodeReferences };
