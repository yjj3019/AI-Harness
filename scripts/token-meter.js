"use strict";
// Read-only token meter (harness-reinforcement-plan B2 — 토큰 실측).
// Extracts per-session input/output token sums from host session logs. It only reads
// files: it never executes logged commands, never modifies logs, and never writes
// anywhere except stdout. Every number is an extracted value; anything absent from
// the logs stays null (rendered UNKNOWN), never 0. Per-skill/per-feature attribution
// is not present in these log formats and is therefore UNKNOWN by construction.
//
// Supported log formats (measured 2026-11-15):
//   claude: <root>/.claude/projects/<slug>/<uuid>.jsonl
//           line type "assistant" -> message.usage.{input_tokens,cache_read_input_tokens,
//           cache_creation_input_tokens,output_tokens}; one such line = one API call.
//           Sub-agent logs under <slug>/<uuid>/subagents/*.jsonl belong to the parent session.
//   codex:  <root>/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
//           line type "event_msg" payload.type "token_count" -> info.last_token_usage
//           (per-call delta) and info.total_token_usage (running total, cross-check).
//           Semantics (measured): input_tokens INCLUDES cached_input_tokens and
//           output_tokens INCLUDES reasoning_output_tokens, so
//           total_tokens = input_tokens + output_tokens only (no double counting).
//
// Usage: node scripts/token-meter.js [--host claude|codex|all] [--limit N] [--root DIR] [--json]
// Exit codes: 0 = report produced (sessions may be 0); 2 = bad arguments or unreadable root.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MAX_FILE_BYTES = 256 * 1024 * 1024; // measured largest local log: ~48 MiB
const MAX_LINES = 2_000_000;
const DEFAULT_LIMIT = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function usageError(message) {
  console.error(`token-meter: ${message}`);
  console.error("usage: node scripts/token-meter.js [--host claude|codex|all] [--limit N] [--root DIR] [--json]");
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { host: "all", limit: DEFAULT_LIMIT, root: os.homedir(), json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--host") {
      const v = argv[++i];
      if (!["claude", "codex", "all"].includes(v)) usageError(`--host: expected claude|codex|all, got ${v}`);
      opts.host = v;
    } else if (a === "--limit") {
      const v = Number(argv[++i]);
      if (!Number.isSafeInteger(v) || v < 1 || v > 1000) usageError(`--limit: expected integer 1..1000, got ${argv[i]}`);
      opts.limit = v;
    } else if (a === "--root") {
      const v = argv[++i];
      if (typeof v !== "string" || !v) usageError("--root: expected a directory");
      opts.root = path.resolve(v);
    } else if (a === "--json") {
      opts.json = true;
    } else {
      usageError(`unknown argument: ${a}`);
    }
  }
  return opts;
}

function isInt(v) { return Number.isSafeInteger(v) && v >= 0; }

function walkJsonl(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkJsonl(p, out);
    } else if (e.isFile() && e.name.endsWith(".jsonl")) {
      try {
        const st = fs.statSync(p);
        if (st.size <= MAX_FILE_BYTES) out.push({ path: p, mtime: st.mtimeMs, size: st.size });
      } catch { /* unreadable entry: skipped, counted nowhere */ }
    }
  }
}

function readLines(p) {
  let text;
  try {
    const st = fs.statSync(p);
    if (st.size > MAX_FILE_BYTES) return { lines: null, tooBig: true };
    text = fs.readFileSync(p, "utf8");
  } catch { return { lines: null, unreadable: true }; }
  const lines = text.split(/\r?\n/);
  if (lines.length > MAX_LINES) return { lines: null, tooBig: true };
  return { lines };
}

// claude: session = top-level <slug>/<uuid>.jsonl plus <slug>/<uuid>/subagents/*.jsonl
function meterClaude(root) {
  const base = path.join(root, ".claude", "projects");
  const files = [];
  walkJsonl(base, files);
  const bySession = new Map();
  for (const f of files) {
    const rel = path.relative(base, f.path);
    const parts = rel.split(path.sep);
    if (parts.length < 2) continue;
    const [slug, id] = [parts[0], parts[1].replace(/\.jsonl$/, "")];
    const isTop = parts.length === 2 && UUID_RE.test(id);
    const isSub = parts.length >= 4 && parts[2] === "subagents" && UUID_RE.test(id);
    if (!isTop && !isSub) continue;
    if (!bySession.has(id)) bySession.set(id, { id, slug, files: [], subagentFiles: 0 });
    bySession.get(id).files.push(f);
    if (isSub) bySession.get(id).subagentFiles += 1;
  }
  const sessions = [];
  for (const s of bySession.values()) {
    const top = { input: 0, cache_read: 0, cache_write: 0, output: 0, calls: 0 };
    const all = { input: 0, cache_read: 0, cache_write: 0, output: 0, calls: 0 };
    let unknown_fields = 0, bad_lines = 0, mtime = 0, readable = true;
    let costState = null;
    for (const f of s.files) {
      const { lines, unreadable, tooBig } = readLines(f.path);
      if (unreadable || tooBig) { readable = false; continue; }
      mtime = Math.max(mtime, f.mtime);
      const isTopFile = path.dirname(f.path) === path.join(base, s.slug);
      for (const line of lines) {
        if (!line.trim()) continue;
        let o;
        try { o = JSON.parse(line); } catch { bad_lines += 1; continue; }
        if (isTopFile && o.type === "cost-state" && o.modelUsage && typeof o.modelUsage === "object") costState = o;
        if (o.type !== "assistant" || !o.message || typeof o.message !== "object") continue;
        const u = o.message.usage;
        if (!u || typeof u !== "object") continue;
        all.calls += 1;
        if (isTopFile) top.calls += 1;
        for (const [key, field] of [["input_tokens", "input"], ["cache_read_input_tokens", "cache_read"], ["cache_creation_input_tokens", "cache_write"], ["output_tokens", "output"]]) {
          const v = u[key];
          if (isInt(v)) { all[field] += v; if (isTopFile) top[field] += v; } else unknown_fields += 1;
        }
      }
    }
    // Cross-check against the host's own cumulative accounting (last cost-state line).
    // A stale cost-state (session outlived its last state line) legitimately diverges.
    let crossCheck = "unknown";
    let costStateAgg = null;
    if (costState) {
      const agg = { input: 0, output: 0, thinking: 0, cache_read: 0, cache_write: 0, cost_usd: 0 };
      for (const m of Object.values(costState.modelUsage)) {
        agg.input += m.inputTokens || 0; agg.output += m.outputTokens || 0;
        agg.thinking += m.thinkingTokens || 0; agg.cache_read += m.cacheReadInputTokens || 0;
        agg.cache_write += m.cacheCreationInputTokens || 0; agg.cost_usd += m.costUSD || 0;
      }
      costStateAgg = { ...agg, cost_usd: Number(agg.cost_usd.toFixed(6)) };
      const eq = (a, b) => a.input === b.input && a.output === b.output && a.cache_read === b.cache_read && a.cache_write === b.cache_write;
      if (eq(agg, top)) crossCheck = "match";
      else if (eq(agg, all)) crossCheck = "match_with_subagents";
      else crossCheck = "divergent"; // e.g. last cost-state predates the file's final lines
    }
    sessions.push({
      host: "claude",
      session: `${s.slug}/${s.id}`,
      mtime,
      mtime_iso: mtime ? new Date(mtime).toISOString() : null,
      calls: all.calls,
      input_tokens: all.input,
      cache_read_tokens: all.cache_read,
      cache_write_tokens: all.cache_write,
      output_tokens: all.output,
      total_tokens: all.input + all.cache_read + all.cache_write + all.output,
      unknown_fields,
      bad_lines,
      subagent_files: s.subagentFiles,
      cost_state: costStateAgg,
      cost_state_cross_check: crossCheck,
      complete: readable && all.calls > 0,
      skill_attribution: "UNKNOWN", // not present in the log format
    });
  }
  return sessions;
}

// codex: session = one rollout-*.jsonl; per-call deltas from last_token_usage
function meterCodex(root) {
  const base = path.join(root, ".codex", "sessions");
  const files = [];
  walkJsonl(base, files);
  const sessions = [];
  for (const f of files) {
    if (!/rollout-.*\.jsonl$/.test(path.basename(f.path))) continue;
    const t = { input: 0, cache_read: 0, cache_write: 0, output: 0, reasoning: 0, calls: 0, unknown_fields: 0, bad_lines: 0 };
    let lastTotal = null;
    let readable = true;
    const { lines, unreadable, tooBig } = readLines(f.path);
    if (unreadable || tooBig) { readable = false; }
    else {
      for (const line of lines) {
        if (!line.trim()) continue;
        let o;
        try { o = JSON.parse(line); } catch { t.bad_lines += 1; continue; }
        if (o.type !== "event_msg" || !o.payload || o.payload.type !== "token_count") continue;
        const info = o.payload.info;
        if (!info || typeof info !== "object") continue;
        t.calls += 1;
        const lu = info.last_token_usage;
        if (lu && typeof lu === "object") {
          for (const [key, field] of [["input_tokens", "input"], ["cached_input_tokens", "cache_read"], ["cache_write_input_tokens", "cache_write"], ["output_tokens", "output"], ["reasoning_output_tokens", "reasoning"]]) {
            const v = lu[key];
            if (isInt(v)) t[field] += v; else t.unknown_fields += 1;
          }
        } else {
          t.unknown_fields += 5;
        }
        if (info.total_token_usage && typeof info.total_token_usage === "object") lastTotal = info.total_token_usage;
      }
    }
    // Cross-check against the log's own running total (final event). Measured semantics:
    //  - total_tokens = input + output (cached/reasoning are subsets, not additive);
    //  - a rolled-out file may inherit the running total of a forked/continued session
    //    (final total > this file's own deltas: "carried");
    //  - compaction resets can make deltas exceed the running total ("divergent").
    let crossCheck = "unknown";
    if (lastTotal && typeof lastTotal.input_tokens === "number" && typeof lastTotal.output_tokens === "number") {
      if (lastTotal.input_tokens === t.input && lastTotal.output_tokens === t.output) crossCheck = "match";
      else if (lastTotal.input_tokens > t.input || lastTotal.output_tokens > t.output) crossCheck = "carried";
      else crossCheck = "divergent";
    }
    sessions.push({
      host: "codex",
      session: `sessions/${path.relative(base, f.path).split(path.sep).join("/")}`,
      mtime: f.mtime,
      mtime_iso: new Date(f.mtime).toISOString(),
      calls: t.calls,
      input_tokens: t.input,
      cache_read_tokens: t.cache_read,
      cache_write_tokens: t.cache_write,
      output_tokens: t.output,
      reasoning_output_tokens: t.reasoning,
      total_tokens: t.input + t.output,
      unknown_fields: t.unknown_fields,
      bad_lines: t.bad_lines,
      final_total_input_tokens: lastTotal && typeof lastTotal.input_tokens === "number" ? lastTotal.input_tokens : null,
      final_total_output_tokens: lastTotal && typeof lastTotal.output_tokens === "number" ? lastTotal.output_tokens : null,
      total_cross_check: crossCheck,
      complete: readable && t.calls > 0,
      skill_attribution: "UNKNOWN", // not present in the log format
    });
  }
  return sessions;
}

function sumTotals(rows, fields) {
  const out = {};
  for (const k of fields) out[k] = rows.reduce((n, r) => n + r[k], 0);
  out.sessions = rows.length;
  return out;
}

const FIELDS = ["calls", "input_tokens", "cache_read_tokens", "cache_write_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens", "unknown_fields", "bad_lines"];

function main() {
  const opts = parseArgs(process.argv.slice(2));
  let st;
  try { st = fs.statSync(opts.root); } catch { usageError(`--root: not a readable directory: ${opts.root}`); }
  if (!st.isDirectory()) usageError(`--root: not a directory: ${opts.root}`);

  const own = { claude: [], codex: [] };
  if (opts.host === "claude" || opts.host === "all") own.claude = meterClaude(opts.root);
  if (opts.host === "codex" || opts.host === "all") own.codex = meterCodex(opts.root);

  // The most recent N sessions PER host: one busy host must not crowd the other out of the report.
  const byHost = {};
  const selected = [];
  for (const h of ["claude", "codex"]) {
    const rows = [...own[h]].sort((a, b) => b.mtime - a.mtime || a.session.localeCompare(b.session)).slice(0, opts.limit);
    byHost[h] = { found: own[h].length, selected: rows, total: sumTotals(rows, FIELDS) };
    selected.push(...rows);
  }
  const report = {
    version: 1,
    root: opts.root,
    generated_at: new Date().toISOString(),
    note: "Read-only extraction from session logs. null/UNKNOWN = not present in the logs; 0 is only reported when the log carried a zero. skill_attribution is UNKNOWN: neither format records per-skill token use.",
    hosts: byHost,
    grand_total: sumTotals(selected, FIELDS),
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }

  const fmt = n => (n === null || n === undefined ? "UNKNOWN" : String(n));
  for (const h of ["claude", "codex"]) {
    const { selected: rows, total, found } = byHost[h];
    console.log(`\n== ${h} (recent ${rows.length} of ${found} sessions) ==`);
    console.log(h === "claude"
      ? "counters: input/cache_read/cache_write/output independent; total = sum of the four"
      : "counters: cached subset of input, reasoning subset of output; total = input + output");
    if (!rows.length) { console.log("(no sessions found)"); continue; }
    const header = "session | mtime | calls | input | cache_read | cache_write | output | total | xcheck | unknown";
    console.log(header);
    for (const r of rows) {
      console.log([r.session, r.mtime_iso ? r.mtime_iso.replace("T", " ").slice(0, 16) : "UNKNOWN", r.calls,
        fmt(r.input_tokens), fmt(r.cache_read_tokens), fmt(r.cache_write_tokens), fmt(r.output_tokens),
        fmt(r.total_tokens), r.total_cross_check || r.cost_state_cross_check || "UNKNOWN",
        r.unknown_fields === 0 ? "0" : `${r.unknown_fields}`].join(" | "));
    }
    console.log(`TOTAL | - | ${total.calls} | ${fmt(total.input_tokens)} | ${fmt(total.cache_read_tokens)} | ${fmt(total.cache_write_tokens)} | ${fmt(total.output_tokens)} | ${fmt(total.total_tokens)} | - | ${total.unknown_fields}`);
  }
  const g = report.grand_total;
  console.log(`\n== grand total (selected ${g.sessions} sessions) ==`);
  console.log(`calls=${g.calls} input=${fmt(g.input_tokens)} cache_read=${fmt(g.cache_read_tokens)} cache_write=${fmt(g.cache_write_tokens)} output=${fmt(g.output_tokens)} total=${fmt(g.total_tokens)} unknown_fields=${g.unknown_fields} skill/feature attribution=UNKNOWN`);
}

if (require.main === module) main();
module.exports = { meterClaude, meterCodex };
