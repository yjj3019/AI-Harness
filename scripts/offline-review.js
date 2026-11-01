#!/usr/bin/env node
'use strict';

// Local packet preparation only: no model calls, subprocesses, or quality judgment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CASES = path.join(__dirname, '..', 'docs', 'report-editing-cases.json');
const usage = 'Usage: node scripts/offline-review.js --candidate-1 FILE --candidate-2 FILE --packet FILE --key FILE';
const privacy = 'Blinding only removes file metadata and randomizes labels. Candidate text or case content may identify its source or contain sensitive information; review and protect both files, especially the private key. No semantic quality is assessed.';

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const allowed = new Set(['--candidate-1', '--candidate-2', '--packet', '--key']);
  const result = Object.create(null);
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!allowed.has(flag) || Object.hasOwn(result, flag) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(usage);
    result[flag] = args[i + 1];
  }
  if ([...allowed].some(flag => !Object.hasOwn(result, flag))) throw new Error(usage);
  return result;
}
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
// v1: HMAC-SHA256 with a 32-byte key over the UTF-8 domain string below,
// a NUL separator, then the UTF-8 case ID. The low bit of byte 0 selects A.
const ALLOCATION_ALGORITHM = 'hmac-sha256-case-id-v1';
function replayAssignment(seed, id, algorithm = ALLOCATION_ALGORITHM) {
  if (algorithm !== ALLOCATION_ALGORITHM) throw new Error('Unsupported allocation algorithm');
  if (typeof seed !== 'string' || !/^[0-9a-f]{64}$/.test(seed)) throw new Error('Seed must be 32 bytes encoded as lowercase hex');
  if (typeof id !== 'string' || !id || !id.isWellFormed()) throw new Error('Invalid case ID');
  const digest = crypto.createHmac('sha256', Buffer.from(seed, 'hex'))
    .update('offline-review:allocation:v1\0', 'utf8').update(id, 'utf8').digest();
  const first = digest[0] & 1;
  return { id, A: first + 1, B: 2 - first };
}
// Bound each JSON input independently; follow symlinks but inspect the opened FD.
const MAX_JSON_BYTES = 16 * 1024 * 1024;
function readJsonBytes(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error('JSON input must be a regular file');
    if (stat.size > MAX_JSON_BYTES) throw new Error('JSON input exceeds 16 MiB');
    const buffer = Buffer.allocUnsafe(MAX_JSON_BYTES + 1);
    let used = 0;
    while (used < buffer.length) {
      const n = fs.readSync(fd, buffer, used, buffer.length - used, null);
      if (!n) break;
      used += n;
    }
    if (used > MAX_JSON_BYTES) throw new Error('JSON input exceeds 16 MiB');
    return buffer.subarray(0, used);
  } finally { fs.closeSync(fd); }
}
function parseJson(bytes, description) {
  try { return JSON.parse(bytes.toString('utf8')); } catch { throw new Error(`${description} is not valid JSON`); }
}
function generate(args) {
  const opts = parseArgs(args);
  if (!opts) { console.log(usage); return; }
  const caseBytes = readJsonBytes(CASES);
  const caseDocument = parseJson(caseBytes, 'Case file');
  if (!caseDocument || !Array.isArray(caseDocument.cases) || !caseDocument.cases.length) throw new Error('Invalid case file');
  const ids = new Set();
  for (const item of caseDocument.cases) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.source !== 'string') throw new Error('Invalid or duplicate case ID');
    ids.add(item.id);
  }
  const inputs = [opts['--candidate-1'], opts['--candidate-2']].map((file, index) => {
    const bytes = readJsonBytes(file);
    const value = parseJson(bytes, `Candidate ${index + 1}`);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== ids.size || Object.keys(value).some(id => !ids.has(id)) || [...ids].some(id => !Object.hasOwn(value, id) || (typeof value[id] !== 'string' || !value[id].trim()))) throw new Error(`Candidate ${index + 1} must contain exactly the case IDs with nonempty string values`);
    return { bytes, value };
  });
  const seed = crypto.randomBytes(32).toString('hex');
  const assignments = [];
  const cases = caseDocument.cases.map(item => {
    const assignment = replayAssignment(seed, item.id);
    const first = assignment.A - 1;
    assignments.push(assignment);
    // Explicit allowlist: never copy candidate filenames or arbitrary input metadata.
    return { id: item.id, source: item.source, required_claims: item.required_claims, required_behavior: item.required_behavior, protected_spans: item.protected_spans, candidates: { A: inputs[first].value[item.id], B: inputs[1 - first].value[item.id] } };
  });
  const packet = { schema_version: 1, privacy_caveat: privacy, cases };
  const packetBytes = Buffer.from(JSON.stringify(packet, null, 2) + '\n');
  const key = { schema_version: 1, privacy_caveat: privacy, randomization: { algorithm: ALLOCATION_ALGORITHM, seed }, case_sha256: hash(caseBytes), packet_sha256: hash(packetBytes), inputs: inputs.map((input, i) => ({ candidate: i + 1, sha256: hash(input.bytes) })), assignments };
  // Reserve both names exclusively before writing. Roll back only files we created.
  const created = [];
  try {
    for (const file of [opts['--packet'], opts['--key']]) {
      const fd = fs.openSync(file, 'wx', 0o600);
      created.push({ file, fd });
    }
    fs.writeFileSync(created[0].fd, packetBytes);
    fs.writeFileSync(created[1].fd, JSON.stringify(key, null, 2) + '\n');
    for (const entry of created) { fs.closeSync(entry.fd); entry.fd = null; }
  } catch (error) {
    for (const entry of created) {
      if (entry.fd !== null) { try { fs.closeSync(entry.fd); } catch {} }
      try { fs.unlinkSync(entry.file); } catch {}
    }
    throw error;
  }
  console.log('Reviewer packet and private key created. ' + privacy);
}
if (require.main === module) {
  try { generate(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { generate, replayAssignment };
