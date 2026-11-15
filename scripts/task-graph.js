'use strict';

// Offline analysis only: no task execution, filesystem scope checks, or retries.
const path = require('node:path');
const fs = require('node:fs');
const childProcess = require('node:child_process');
const { parse: parseStrictJson } = require('./evaluation-accounting');
const MAX_BYTES = 1024 * 1024;
const MAX_TASKS = 256;
const MAX_LIST = 256;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const LABEL = /^[^\u0000-\u001f\u007f]{1,256}$/u;

function analyze(graph, options = {}) {
  const errors = [];
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const keys = (x, required, where, optional = []) => {
    if (!object(x)) { errors.push(`${where}: expected object`); return false; }
    for (const k of required) if (!Object.hasOwn(x, k)) errors.push(`${where}: missing ${k}`);
    for (const k of Object.keys(x)) if (!required.includes(k) && !optional.includes(k)) errors.push(`${where}: unexpected ${k}`);
    return true;
  };
  if (!keys(graph, ['version', 'tasks'], 'graph')) return { verdict: 'FAIL', errors };
  if (graph.version !== 1) errors.push('graph: version must be 1');
  if (!Array.isArray(graph.tasks) || graph.tasks.length < 1 || graph.tasks.length > MAX_TASKS) {
    errors.push(`graph: tasks must contain 1..${MAX_TASKS} entries`);
    return { verdict: 'FAIL', errors };
  }
  const ids = new Map();
  const fields = ['id', 'dependencies', 'role', 'readScopes', 'writeScopes', 'retryCap', 'attempts', 'status', 'effect'];
  Array.from(graph.tasks).forEach((t, i) => {
    const where = `tasks[${i}]`;
    if (!keys(t, fields, where, ['gate'])) return;
    if (typeof t.id !== 'string' || !ID.test(t.id)) errors.push(`${where}: invalid id`);
    else if (ids.has(t.id)) errors.push(`${where}: duplicate id ${t.id}`);
    else ids.set(t.id, t);
    if (typeof t.role !== 'string' || !ID.test(t.role)) errors.push(`${where}: invalid role`);
    if (Object.hasOwn(t, 'gate') && (typeof t.gate !== 'string' || !ID.test(t.gate))) errors.push(`${where}: invalid gate`);
    for (const name of ['dependencies', 'readScopes', 'writeScopes']) {
      const a = t[name];
      if (!Array.isArray(a) || a.length > MAX_LIST) { errors.push(`${where}: invalid ${name}`); continue; }
      const valid = name === 'dependencies' ? ID : LABEL;
      if (Array.from(a).some(s => typeof s !== 'string' || !valid.test(s))) errors.push(`${where}: invalid ${name} entry`);
      if (new Set(a).size !== a.length) errors.push(`${where}: duplicate ${name} entry`);
    }
    if (!Number.isInteger(t.retryCap) || t.retryCap < 0 || t.retryCap > 10) errors.push(`${where}: invalid retryCap`);
    if (!Number.isInteger(t.attempts) || t.attempts < 0 || t.attempts > 11) errors.push(`${where}: invalid attempts`);
    if (!['PENDING', 'PASS', 'FAIL', 'UNKNOWN'].includes(t.status)) errors.push(`${where}: invalid status`);
    if (!['NONE', 'EXTERNAL'].includes(t.effect)) errors.push(`${where}: invalid effect`);
    if (Number.isInteger(t.attempts) && Number.isInteger(t.retryCap) && t.attempts > t.retryCap + 1) errors.push(`${where}: attempts exceed retry budget`);
    if (t.status === 'PENDING' && t.attempts !== 0) errors.push(`${where}: pending requires zero attempts`);
    if (['PASS', 'FAIL'].includes(t.status) && !(t.attempts >= 1)) errors.push(`${where}: terminal status requires an attempt`);
  });
  for (const [id, t] of ids) if (Array.isArray(t.dependencies)) for (const dep of t.dependencies) {
    if (typeof dep === 'string' && !ids.has(dep)) errors.push(`${id}: unknown dependency ${dep}`);
  }
  if (errors.length) return { verdict: 'FAIL', errors };
  // Opt-in link to phase-gate's canonical checker. A compound status alone is not proof;
  // reuse its chain/artifact/test-summary/tree checks instead of copying its evidence schema.
  if (options.evidenceRoot !== undefined && options.evidenceRoot !== null) {
    if (typeof options.evidenceRoot !== 'string' || !options.evidenceRoot) return { verdict: 'FAIL', errors: ['evidence mode requires a nonempty evidence root path'] };
    if (options.requireBoundTree !== undefined && typeof options.requireBoundTree !== 'boolean') return { verdict: 'FAIL', errors: ['requireBoundTree must be boolean'] };
    if (options.phaseGate !== undefined) return { verdict: 'FAIL', errors: ['phaseGate override is not supported; use the canonical project phase-gate.js'] };
    let evidenceRoot, projectRoot;
    try {
      evidenceRoot = fs.realpathSync.native(path.resolve(options.evidenceRoot));
      projectRoot = fs.realpathSync.native(path.resolve(options.root || path.dirname(evidenceRoot)));
    } catch { return { verdict: 'FAIL', errors: ['project evidence root is unavailable'] }; }
    // Canonicalize system temp roots (for example macOS /var -> /private/var) before checks.
    // Reject symlink/junction components inside the canonical project path, not system aliases.
    // Reject symlink/junction components anywhere in the supplied project path, not only
    // the final checker file and its immediate parent directories.
    let projectCursor = path.parse(projectRoot).root;
    for (const component of projectRoot.slice(projectCursor.length).split(path.sep).filter(Boolean)) {
      projectCursor = path.join(projectCursor, component);
      let componentStat;
      try { componentStat = fs.lstatSync(projectCursor); }
      catch { return { verdict: 'FAIL', errors: ['project root path component is unavailable'] }; }
      if (componentStat.isSymbolicLink() || !componentStat.isDirectory())
        return { verdict: 'FAIL', errors: ['project root path must contain only regular non-symlink directories'] };
    }
    if (path.join(projectRoot, '.phase-evidence') !== evidenceRoot)
      return { verdict: 'FAIL', errors: ['evidenceRoot must be the project .phase-evidence directory used by phase-gate'] };
    const gatePath = path.join(projectRoot, '.claude', 'workflows', 'phase-gate.js');
    for (const directory of [projectRoot, path.join(projectRoot, '.claude'), path.join(projectRoot, '.claude', 'workflows')]) {
      let stat;
      try { stat = fs.lstatSync(directory); } catch { return { verdict: 'FAIL', errors: ['project-local phase-gate directory is unavailable'] }; }
      if (stat.isSymbolicLink() || !stat.isDirectory()) return { verdict: 'FAIL', errors: ['phase-gate path must use project-local non-symlink directories'] };
    }
    let gateStat;
    try { gateStat = fs.lstatSync(gatePath); } catch { return { verdict: 'FAIL', errors: ['project-local phase-gate.js is unavailable'] }; }
    if (gateStat.isSymbolicLink() || !gateStat.isFile()) return { verdict: 'FAIL', errors: ['project-local phase-gate.js must be a regular non-symlink file'] };
    const checked = new Map();
    const verifyPhase = phase => {
      if (checked.has(phase)) return checked.get(phase);
      const result = childProcess.spawnSync(process.execPath, [gatePath, 'check', phase, ...(options.requireBoundTree ? ['--require-bound-tree'] : [])], {
        cwd: projectRoot, env: { ...process.env, PHASE_GATE_ROOT: projectRoot }, encoding: 'utf8', timeout: Number.isInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000, maxBuffer: 1024 * 1024,
      });
      const error = result.error && result.error.code === 'ETIMEDOUT'
        ? `phase-gate check timed out after ${Number.isInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000}ms`
        : result.error
          ? `phase-gate could not start: ${result.error.message}`
          : result.status === null
            ? `phase-gate check was terminated by signal ${result.signal || 'unknown'}`
            : result.status !== 0
              ? `phase-gate check failed (exit ${result.status}): ${(result.stderr || result.stdout || '').trim()}`
              : null;
      const verdict = { ok: !error, error };
      checked.set(phase, verdict);
      return verdict;
    };
    for (const [id, t] of ids) {
      // UNKNOWN is already blocking graph progress; only a declared PASS requires verified phase evidence.
      if (!Object.hasOwn(t, 'gate') || t.status !== 'PASS') continue;
      const result = verifyPhase(t.gate);
      if (!result.ok) errors.push(`${id}: declared PASS but gate phase '${t.gate}' failed canonical phase-gate verification: ${result.error}`);
    }
    if (errors.length) return { verdict: 'FAIL', errors };
  }
  for (const [id, t] of ids) if (t.status === 'PASS') {
    for (const dep of t.dependencies) if (ids.get(dep).status !== 'PASS') errors.push(`${id}: PASS requires dependency ${dep} to be PASS`);
  }
  if (errors.length) return { verdict: 'FAIL', errors };
  // Kahn's algorithm avoids recursion and detects self-cycles as well.
  const remaining = new Map([...ids].map(([id, t]) => [id, t.dependencies.length]));
  const dependents = new Map([...ids.keys()].map(id => [id, []]));
  for (const [id, t] of ids) for (const dep of t.dependencies) dependents.get(dep).push(id);
  const queue = [...ids.keys()].filter(id => remaining.get(id) === 0).sort();
  let seen = 0;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]; seen++;
    for (const next of dependents.get(id)) {
      remaining.set(next, remaining.get(next) - 1);
      if (remaining.get(next) === 0) queue.push(next);
    }
  }
  if (seen !== ids.size) return { verdict: 'FAIL', errors: ['graph: dependency cycle'] };
  const nodes = [...ids.keys()].sort().map(id => {
    const t = ids.get(id);
    const unmet = t.dependencies.filter(dep => ids.get(dep).status !== 'PASS').sort();
    let state, reason;
    if (t.status === 'PASS') { state = 'DONE'; reason = 'declared PASS'; }
    else if (t.status === 'UNKNOWN') { state = 'BLOCKED'; reason = 'unknown outcome; reconcile before any action'; }
    else if (unmet.length) { state = 'BLOCKED'; reason = 'prerequisites not PASS'; }
    else if (t.status === 'PENDING') { state = 'READY'; reason = 'not attempted'; }
    else if (t.effect === 'EXTERNAL') { state = 'BLOCKED'; reason = 'external effect requires reconciliation; no automatic retry'; }
    else if (t.attempts <= t.retryCap) { state = 'READY'; reason = 'declared failure within retry budget'; }
    else { state = 'BLOCKED'; reason = 'retry budget exhausted'; }
    return { id, status: t.status, state, reason, unmet };
  });
  const result = { verdict: 'PASS', nodes };
  if (options.scopeWarnings) {
    const ready = nodes.filter(node => node.state === 'READY').map(node => ids.get(node.id));
    const warnings = [];
    let total = 0;
    // One record per task pair and label; modes retain both directions when applicable.
    for (let i = 0; i < ready.length; i++) for (let j = i + 1; j < ready.length; j++) {
      const a = ready[i], b = ready[j];
      const ar = new Set(a.readScopes), aw = new Set(a.writeScopes);
      const br = new Set(b.readScopes), bw = new Set(b.writeScopes);
      const labels = [...new Set([...aw, ...bw])].sort();
      for (const label of labels) {
        const modes = [];
        if (aw.has(label) && bw.has(label)) modes.push('write/write');
        if (aw.has(label) && br.has(label)) modes.push('write/read');
        if (ar.has(label) && bw.has(label)) modes.push('read/write');
        if (!modes.length) continue;
        total++;
        if (warnings.length < 256) warnings.push({ tasks: [a.id, b.id], label, modes });
      }
    }
    result.scopeWarnings = { warnings, total, truncated: total > warnings.length };
  }
  return result;
}

function main(argv) {
  // Flags must precede the input path (backward contract); anything after it is a usage error.
  const opts = { scopeWarnings: false, evidenceRoot: null, requireBoundTree: false };
  let rest = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--scope-warnings') {
      if (rest !== null) { console.error('usage: node scripts/task-graph.js [--scope-warnings] [--evidence DIR] INPUT.json'); return 2; }
      opts.scopeWarnings = true; continue;
    }
    if (argv[i] === '--evidence') {
      if (rest !== null || !argv[i + 1] || argv[i + 1].startsWith('--')) { console.error('usage: node scripts/task-graph.js [--scope-warnings] [--evidence DIR] [--require-bound-tree] INPUT.json'); return 2; }
      opts.evidenceRoot = argv[i + 1]; i++; continue;
    }
    if (argv[i] === '--require-bound-tree') {
      if (rest !== null || opts.evidenceRoot === null) { console.error('usage: --require-bound-tree requires a preceding --evidence DIR and must precede INPUT.json'); return 2; }
      opts.requireBoundTree = true; continue;
    }
    if (argv[i].startsWith('--')) { console.error('usage: node scripts/task-graph.js [--scope-warnings] [--evidence DIR] [--require-bound-tree] INPUT.json'); return 2; }
    if (rest !== null) { console.error('usage: node scripts/task-graph.js [--scope-warnings] [--evidence DIR] INPUT.json'); return 2; }
    rest = argv[i];
  }
  if (rest === null) { console.error('usage: node scripts/task-graph.js [--scope-warnings] [--evidence DIR] [--require-bound-tree] INPUT.json'); return 2; }
  const input = rest;
  let fd, bytes;
  try {
    const fs = require('node:fs');
    fd = fs.openSync(input, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
    if (!fs.fstatSync(fd).isFile()) throw new Error('not a regular file');
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let count = 0, n;
    while (count < buffer.length && (n = fs.readSync(fd, buffer, count, buffer.length - count, null)) > 0) count += n;
    bytes = buffer.subarray(0, count);
  } catch (error) {
    console.log(JSON.stringify({ verdict: 'UNKNOWN', errors: ['input unavailable'] })); return 2;
  } finally { if (fd !== undefined) require('node:fs').closeSync(fd); }
  let result;
  try {
    result = analyze(parseStrictJson(bytes), { scopeWarnings: opts.scopeWarnings, evidenceRoot: opts.evidenceRoot, requireBoundTree: opts.requireBoundTree });
  } catch (error) { result = { verdict: 'FAIL', errors: ['invalid or oversized UTF-8 JSON'] }; }
  console.log(JSON.stringify(result));
  return result.verdict === 'PASS' ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { analyze, main };
