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
function parseJson(bytes, description) {
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new Error(`${description} is not valid UTF-8`); }
  try { return JSON.parse(text); } catch { throw new Error(`${description} is not valid JSON`); }
}
function generate(args) {
  const opts = parseArgs(args);
  if (!opts) { console.log(usage); return; }
  const caseBytes = fs.readFileSync(CASES);
  const caseDocument = parseJson(caseBytes, 'Case file');
  if (!caseDocument || !Array.isArray(caseDocument.cases) || !caseDocument.cases.length) throw new Error('Invalid case file');
  const ids = new Set();
  for (const item of caseDocument.cases) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.source !== 'string') throw new Error('Invalid or duplicate case ID');
    ids.add(item.id);
  }
  const inputs = [opts['--candidate-1'], opts['--candidate-2']].map((file, index) => {
    const bytes = fs.readFileSync(file);
    const value = parseJson(bytes, `Candidate ${index + 1}`);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== ids.size || Object.keys(value).some(id => !ids.has(id)) || [...ids].some(id => !Object.hasOwn(value, id) || (typeof value[id] !== 'string' || !value[id].trim()))) throw new Error(`Candidate ${index + 1} must contain exactly the case IDs with nonempty string values`);
    return { bytes, value };
  });
  const assignments = [];
  const cases = caseDocument.cases.map(item => {
    const first = crypto.randomInt(2);
    assignments.push({ id: item.id, A: first + 1, B: 2 - first });
    // Explicit allowlist: never copy candidate filenames or arbitrary input metadata.
    return { id: item.id, source: item.source, required_claims: item.required_claims, required_behavior: item.required_behavior, protected_spans: item.protected_spans, candidates: { A: inputs[first].value[item.id], B: inputs[1 - first].value[item.id] } };
  });
  const packet = { schema_version: 1, privacy_caveat: privacy, cases };
  const packetBytes = Buffer.from(JSON.stringify(packet, null, 2) + '\n');
  const key = { schema_version: 1, privacy_caveat: privacy, randomization: 'crypto.randomInt(2) independently per case; no reproducible seed', case_sha256: hash(caseBytes), packet_sha256: hash(packetBytes), inputs: inputs.map((input, i) => ({ candidate: i + 1, sha256: hash(input.bytes) })), assignments };
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
module.exports = { generate };
