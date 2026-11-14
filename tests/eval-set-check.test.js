"use strict";
// Positive controls for scripts/eval-set-check.js (harness-reinforcement-plan A1 — 평가 입력물 고정 게이트).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "eval-set-check.js");

function sha(p) { return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }

test("eval-set check: original content passes and prints the pinned count", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evalset-"));
  try {
    const f = path.join(dir, "eval-set.json");
    fs.writeFileSync(path.join(dir, "gold.txt"), "gold input\n");
    fs.writeFileSync(f, JSON.stringify({ schema: 1, entries: [
      { path: "gold.txt", sha256: sha(path.join(dir, "gold.txt")), purpose: "gold" },
    ] }));
    const r = spawnSync(process.execPath, [SCRIPT, f], { encoding: "utf8" });
    assert.equal(r.status, 0, r.err);
    assert.match(r.stdout, /1 pinned eval inputs match/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("eval-set check: altered input fails with a sha256 mismatch, missing input fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evalset-"));
  try {
    const f = path.join(dir, "eval-set.json");
    fs.writeFileSync(f, JSON.stringify({ schema: 1, entries: [
      { path: "gold.txt", sha256: crypto.createHash("sha256").update("original").digest("hex"), purpose: "gold" },
      { path: "gone.txt", sha256: "a".repeat(64), purpose: "missing" },
    ] }));
    fs.writeFileSync(path.join(dir, "gold.txt"), "tampered");
    const r = spawnSync(process.execPath, [SCRIPT, f], { encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /sha256 mismatch/);
    assert.match(r.stderr, /gone\.txt \(missing\)/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("eval-set check: CRLF/CR inputs hash identically to pinned LF digest (platform-independent)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evalset-"));
  try {
    const f = path.join(dir, "eval-set.json");
    fs.writeFileSync(path.join(dir, "crlf.txt"), "gold input\r\nsecond line\r\n");
    fs.writeFileSync(path.join(dir, "cr.txt"), "gold input\rsecond line\r");
    const canonical = crypto.createHash("sha256").update("gold input\nsecond line\n").digest("hex");
    fs.writeFileSync(f, JSON.stringify({ schema: 1, entries: [
      { path: "crlf.txt", sha256: canonical, purpose: "gold" },
      { path: "cr.txt", sha256: canonical, purpose: "gold" },
    ] }));
    const r = spawnSync(process.execPath, [SCRIPT, f], { encoding: "utf8" });
    assert.equal(r.status, 0, r.err);
    assert.match(r.stdout, /2 pinned eval inputs match/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
