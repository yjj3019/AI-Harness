#!/usr/bin/env node
'use strict';
// Independent offline consistency check. This does not prove provenance, license
// compatibility, or that unrelated files contain no third-party code.
const fs = require('node:fs');

const MAX_BYTES = 1024 * 1024;
const LICENSES = new Set(['MIT', 'Apache-2.0', 'CUSTOM-ATTRIBUTION', 'UNVERIFIED']);
const METHODS = new Set(['ideas-only', 'fresh-implementation', 'reference-only']);
const KEYS = ['id', 'source_url', 'license_url', 'license_label', 'verified_spdx', 'checked_at', 'method', 'copied_files', 'credit_url', 'concept'];

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
    const result = validate(JSON.parse(bytes.toString('utf8')));
    process.stdout.write('source-adoption-check: ' + result.entries + ' declarations consistent; verified_spdx cross-checked with GitHub API on 2026-11-15\n');
  } catch {
    process.stderr.write('source-adoption-check: invalid manifest or unreadable input\n');
    process.exitCode = 1;
  }
}
if (require.main === module) main(process.argv.length === 3 ? process.argv[2] : null);
module.exports = { validate };
