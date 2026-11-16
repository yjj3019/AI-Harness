"use strict";
// Positive controls for scripts/token-meter.js (harness-reinforcement-plan B2 — 토큰 실측, 읽기 전용).
// Fixtures reproduce the measured log shapes (2026-11-15): claude assistant message.usage lines,
// codex event_msg/token_count last_token_usage deltas. Absent fields must stay UNKNOWN, never 0.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "token-meter.js");
const UUID1 = "11111111-2222-4333-8444-555555555555";
const UUID2 = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function claudeLine(usage, extra = {}) {
  return JSON.stringify({ type: "assistant", message: { role: "assistant", usage }, ...extra });
}

function codexCount(last, total) {
  return JSON.stringify({ type: "event_msg", payload: { type: "token_count", info: { last_token_usage: last, total_token_usage: total } } });
}

function listing(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-meter-"));
  const claude = path.join(root, ".claude", "projects", "slug-a");
  const sub = path.join(claude, UUID1, "subagents");
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(claude, `${UUID1}.jsonl`), [
    claudeLine({ input_tokens: 100, cache_read_input_tokens: 200, cache_creation_input_tokens: 300, output_tokens: 50 }),
    "not-json",
    claudeLine({ input_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 30, output_tokens: 5 }),
    // Host-side cumulative accounting: equals the TOP-LEVEL line sum (subagent line excluded).
    JSON.stringify({ type: "cost-state", modelUsage: { "m-1": { inputTokens: 110, outputTokens: 55, thinkingTokens: 7, cacheReadInputTokens: 220, cacheCreationInputTokens: 330, costUSD: 1.25 } } }),
  ].join("\n") + "\n");
  fs.writeFileSync(path.join(sub, "agent-abc.jsonl"),
    claudeLine({ input_tokens: 1, cache_read_input_tokens: 2, cache_creation_input_tokens: 3, output_tokens: 4 }) + "\n");
  // Session with an assistant line whose usage carries no extractable fields: counts stay UNKNOWN.
  fs.writeFileSync(path.join(claude, `${UUID2}.jsonl`), claudeLine({}) + "\n");
  const codex = path.join(root, ".codex", "sessions", "2026", "11", "15");
  fs.mkdirSync(codex, { recursive: true });
  // Measured codex semantics: total_tokens = input + output; cached is a subset of input,
  // reasoning a subset of output (neither additive).
  fs.writeFileSync(path.join(codex, "rollout-2026-11-15T10-00-00-01.jsonl"), [
    codexCount({ input_tokens: 10, cached_input_tokens: 5, cache_write_input_tokens: 1, output_tokens: 2, reasoning_output_tokens: 3 },
      { input_tokens: 10, cached_input_tokens: 5, cache_write_input_tokens: 1, output_tokens: 2, reasoning_output_tokens: 3, total_tokens: 12 }),
    codexCount({ input_tokens: 7, cached_input_tokens: 3, cache_write_input_tokens: 0, output_tokens: 4, reasoning_output_tokens: 1 },
      { input_tokens: 17, cached_input_tokens: 8, cache_write_input_tokens: 1, output_tokens: 6, reasoning_output_tokens: 4, total_tokens: 23 }),
  ].join("\n") + "\n");
  // Deterministic mtimes: UUID2 newest, then codex, then UUID1.
  fs.utimesSync(path.join(claude, `${UUID2}.jsonl`), new Date("2026-11-15T12:00:00Z"), new Date("2026-11-15T12:00:00Z"));
  fs.utimesSync(path.join(codex, "rollout-2026-11-15T10-00-00-01.jsonl"), new Date("2026-11-15T11:00:00Z"), new Date("2026-11-15T11:00:00Z"));
  fs.utimesSync(path.join(claude, `${UUID1}.jsonl`), new Date("2026-11-15T10:00:00Z"), new Date("2026-11-15T10:00:00Z"));
  // The session mtime is the max over its files, subagent logs included: pin that one too, or UUID1 turns "newest" once the real clock passes the fixture dates.
  fs.utimesSync(path.join(sub, "agent-abc.jsonl"), new Date("2026-11-15T09:00:00Z"), new Date("2026-11-15T09:00:00Z"));
  return root;
}

function run(root, ...extra) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, ...extra], { encoding: "utf8" });
}

test("token-meter: claude session sums usage lines incl. subagent file; absent fields are UNKNOWN", () => {
  const root = buildFixture();
  try {
    const r = run(root, "--json");
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(r.stdout);
    const rows = rep.hosts.claude.selected;
    assert.equal(rows.length, 2);
    const s1 = rows.find(x => x.session.includes(UUID1));
    assert.ok(s1);
    assert.equal(s1.calls, 3, "2 top-level + 1 subagent assistant line");
    assert.equal(s1.input_tokens, 111);
    assert.equal(s1.cache_read_tokens, 222);
    assert.equal(s1.cache_write_tokens, 333);
    assert.equal(s1.output_tokens, 59);
    assert.equal(s1.total_tokens, 725);
    assert.equal(s1.bad_lines, 1);
    assert.equal(s1.subagent_files, 1);
    assert.equal(s1.cost_state_cross_check, "match", "top-level sum equals the host's own cost-state");
    assert.equal(s1.cost_state.cost_usd, 1.25);
    const s2 = rows.find(x => x.session.includes(UUID2));
    assert.equal(s2.calls, 1);
    assert.equal(s2.input_tokens, 0, "no extractable field: stays 0 only because the field was absent, flagged below");
    assert.equal(s2.unknown_fields, 4, "four absent usage fields");
    assert.equal(s2.skill_attribution, "UNKNOWN");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("token-meter: codex session sums per-call deltas and cross-checks the running total", () => {
  const root = buildFixture();
  try {
    const r = run(root, "--json");
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(r.stdout);
    const rows = rep.hosts.codex.selected;
    assert.equal(rows.length, 1);
    const c = rows[0];
    assert.equal(c.calls, 2);
    assert.equal(c.input_tokens, 17);
    assert.equal(c.cache_read_tokens, 8);
    assert.equal(c.cache_write_tokens, 1);
    assert.equal(c.output_tokens, 6);
    assert.equal(c.reasoning_output_tokens, 4);
    assert.equal(c.total_tokens, 23, "total = input + output (cached/reasoning are subsets)");
    assert.equal(c.total_cross_check, "match");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("token-meter: forked codex session (running total exceeds file deltas) is flagged carried", () => {
  const root = buildFixture();
  try {
    const f = path.join(root, ".codex", "sessions", "2026", "11", "15", "rollout-2026-11-15T10-00-00-01.jsonl");
    const lines = fs.readFileSync(f, "utf8").trim().split("\n").map(JSON.parse);
    lines[1].payload.info.total_token_usage.input_tokens = 99999; // inherited from a parent rollout
    fs.writeFileSync(f, lines.map(JSON.stringify).join("\n") + "\n");
    const r = run(root, "--json", "--host", "codex");
    assert.equal(r.status, 0, r.stderr);
    const c = JSON.parse(r.stdout).hosts.codex.selected[0];
    assert.equal(c.total_cross_check, "carried");
    assert.equal(c.final_total_input_tokens, 99999);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("token-meter: --limit selects the most recent sessions per host", () => {
  const root = buildFixture();
  try {
    const r = run(root, "--json", "--limit", "1");
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(r.stdout);
    // One host's 50-session backlog must not crowd the other host out: limit applies per host.
    assert.equal(rep.hosts.claude.selected.length, 1);
    assert.equal(rep.hosts.codex.selected.length, 1);
    assert.equal(rep.grand_total.sessions, 2);
    assert.ok(rep.hosts.claude.selected[0].session.includes(UUID2), "newest by mtime wins");
    assert.equal(rep.hosts.claude.found, 2);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("token-meter: --host filter restricts to one host", () => {
  const root = buildFixture();
  try {
    const r = run(root, "--json", "--host", "claude");
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(r.stdout);
    assert.equal(rep.hosts.codex.selected.length, 0);
    assert.equal(rep.hosts.claude.selected.length, 2);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("token-meter: bad arguments and unreadable root exit 2", () => {
  const root = buildFixture();
  try {
    for (const args of [["--host", "bogus"], ["--limit", "0"], ["--wat"], ["--root", path.join(root, "nope")]]) {
      const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
      assert.equal(r.status, 2, `args=${args.join(" ")}: ${r.stderr}`);
      assert.match(r.stderr, /token-meter:|usage:/);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("token-meter: empty root reports zero sessions and exits 0", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-meter-empty-"));
  try {
    const r = run(root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /no sessions found/);
    assert.match(r.stdout, /skill\/feature attribution=UNKNOWN/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("token-meter: strictly read-only — fixture file set unchanged after a run", () => {
  const root = buildFixture();
  try {
    const before = listing(root);
    const r = run(root, "--json");
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(listing(root), before, "no file created, removed, or restructured");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
