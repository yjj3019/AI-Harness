"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateChecks, parseChecks } = require("../scripts/merge-guard.js");

const SCRIPT = path.resolve(__dirname, "../scripts/merge-guard.js");

const check = (name, bucket, state = bucket.toUpperCase()) => ({ name, bucket, state });

test("all checks passing is the only accepted verdict", () => {
  const verdict = evaluateChecks([check("checks / node 22", "pass"), check("portability / windows-latest", "pass")]);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.count, 2);
});

test("a single failing check refuses the merge and names it", () => {
  const verdict = evaluateChecks([check("checks / node 24", "pass"), check("portability / windows-latest", "fail")]);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /1 check\(s\) not passing/);
  assert.deepEqual(verdict.failing.map(f => f.name), ["portability / windows-latest"]);
});

test("pending checks are not treated as passing", () => {
  const verdict = evaluateChecks([check("checks / node 24", "pending")]);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.failing[0].bucket, "pending");
});

test("skipped checks are not treated as passing", () => {
  const verdict = evaluateChecks([check("portability / windows-latest", "skipping")]);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.failing[0].bucket, "skipping");
});

test("an empty or missing check list is not evidence of passing", () => {
  assert.equal(evaluateChecks([]).ok, false);
  assert.match(evaluateChecks([]).reason, /no checks reported/);
  assert.equal(evaluateChecks(null).ok, false);
  assert.equal(evaluateChecks({}).ok, false);
});

test("malformed entries are reported instead of passing", () => {
  const verdict = evaluateChecks([{}, { name: "x" }, { name: "y", bucket: 7 }, null]);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.failing.length, 4);
  assert.equal(verdict.failing[0].name, "<unnamed>");
  assert.equal(verdict.failing[0].bucket, "<missing>");
});

test("check output parsing rejects empty and invalid JSON", () => {
  assert.match(parseChecks("").error, /empty/);
  assert.match(parseChecks("   ").error, /empty/);
  assert.match(parseChecks("not json").error, /not valid JSON/);
  assert.deepEqual(parseChecks('[{"name":"a","bucket":"pass"}]').checks, [{ name: "a", bucket: "pass" }]);
});

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", timeout: 60_000 });
}

test("CLI evaluates a captured check list and exits 0 only when everything passed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-guard-"));
  try {
    const good = path.join(dir, "good.json");
    fs.writeFileSync(good, JSON.stringify([check("a", "pass"), check("b", "pass")]));
    const passed = run(["--checks-file", good]);
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /"ok":true/);

    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(bad, JSON.stringify([check("a", "pass"), check("b", "fail")]));
    const refused = run(["--checks-file", bad]);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /refusing to merge/);
    assert.match(refused.stdout, /"ok":false/);

    const empty = path.join(dir, "empty.json");
    fs.writeFileSync(empty, "[]");
    assert.equal(run(["--checks-file", empty]).status, 2);

    const broken = path.join(dir, "broken.json");
    fs.writeFileSync(broken, "{ not json");
    const invalid = run(["--checks-file", broken]);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /not valid JSON/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI rejects a missing or non-numeric pull request number without calling gh", () => {
  for (const args of [[], ["--checks-file"], ["abc"], ["12; rm -rf /"], ["-1"]]) {
    const r = run(args);
    assert.equal(r.status, 2, `args ${JSON.stringify(args)}`);
    assert.match(r.stderr, /usage: node scripts\/merge-guard\.js/);
  }
});

test("CLI refuses a check list file that is missing, oversized or not a file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-guard-"));
  try {
    const missing = run(["--checks-file", path.join(dir, "nope.json")]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /ENOENT|no such file/i);

    const oversized = path.join(dir, "oversized.json");
    fs.writeFileSync(oversized, "x".repeat(1024 * 1024 + 1));
    const big = run(["--checks-file", oversized]);
    assert.equal(big.status, 2);
    assert.match(big.stderr, /exceeds/);

    const big2 = run(["--checks-file", dir]);
    assert.equal(big2.status, 2);
    assert.match(big2.stderr, /not a regular file/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
