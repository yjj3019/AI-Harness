"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateChecks, parseChecks, requiredChecks, liveReadiness } = require("../scripts/merge-guard.js");

const SCRIPT = path.resolve(__dirname, "../scripts/merge-guard.js");

const check = (name, bucket, state = bucket.toUpperCase()) => ({ name, bucket, state });
const sha = "a".repeat(40);
const required = [
  "checks / node 22", "checks / node 24",
  "portability / macos-latest", "portability / windows-latest",
  "isolation / linux namespace",
  "toolbroker / macos-latest", "toolbroker / ubuntu-latest", "toolbroker / windows-latest",
  "self-qa / shellcheck",
];
const completeChecks = () => required.map(name => check(name, "pass"));

test("generic check evaluation accepts passing checks only when all required jobs are listed", () => {
  const verdict = evaluateChecks(completeChecks());
  assert.equal(verdict.ok, true);
  assert.equal(verdict.count, required.length);
});

test("missing and duplicate required job names fail closed", () => {
  const missing = evaluateChecks(completeChecks().slice(1));
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, [required[0]]);
  const duplicate = evaluateChecks([...completeChecks(), check(required[0], "pass")]);
  assert.equal(duplicate.ok, false);
  assert.ok(duplicate.failing.some(item => item.bucket === "<duplicate>"));
});

test("head binding rejects absent, malformed and stale PR heads", () => {
  assert.equal(evaluateChecks(completeChecks(), { expectedHeadSha: sha }).ok, false);
  assert.equal(evaluateChecks(completeChecks(), { expectedHeadSha: "invalid", reportedHeadSha: "invalid" }).ok, false);
  assert.equal(evaluateChecks(completeChecks(), { expectedHeadSha: sha, reportedHeadSha: "b".repeat(40) }).ok, false);
  assert.equal(evaluateChecks(completeChecks(), { expectedHeadSha: sha, reportedHeadSha: sha }).ok, true);
});

test("required check inventory must match the CI workflow and reviewed allowlist", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "ci.yml"), "utf8");
  const actual = requiredChecks(workflow);
  assert.equal(actual.error, undefined);
  assert.deepEqual(actual.value, [...required].sort());
  assert.match(requiredChecks("jobs: {}\n").error, /jobs section unavailable/);
  assert.match(requiredChecks(workflow.replace("    name: self-qa / shellcheck", "    name: self-qa / modified")).error, /job-name set changed/);
});

test("a single failing check refuses readiness and names it", () => {
  const checks = completeChecks();
  checks.find(item => item.name === "portability / windows-latest").bucket = "fail";
  const verdict = evaluateChecks(checks);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /1 check\(s\) not passing/);
  assert.deepEqual(verdict.failing.map(f => f.name), ["portability / windows-latest"]);
});

test("pending checks are not treated as passing", () => {
  const checks = completeChecks();
  checks[0].bucket = "pending";
  const verdict = evaluateChecks(checks);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.failing[0].bucket, "pending");
});

test("skipped checks are not treated as passing", () => {
  const checks = completeChecks();
  checks[2].bucket = "skipping";
  const verdict = evaluateChecks(checks);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.failing[0].bucket, "skipping");
});

test("an empty or missing check list is not evidence of passing", () => {
  assert.equal(evaluateChecks([]).ok, false);
  assert.match(evaluateChecks([]).reason, /no checks reported/);
  assert.equal(evaluateChecks(null).ok, false);
  assert.equal(evaluateChecks({}).ok, false);
});

test("live readiness refuses draft or unknown draft-state PRs before fetching CI runs", () => {
  const draftResults = [true, undefined];
  for (const draftState of draftResults) {
    const calls = [];
    const run = (_file, args) => {
      calls.push(args);
      const p = { url: "https://github.com/yjj3019/AI-Harness/pull/12", baseRefName: "main", baseRefOid: "a".repeat(40), headRefOid: "b".repeat(40), headRepository: { nameWithOwner: "yjj3019/AI-Harness" }, state: "OPEN" };
      if (draftState !== undefined) p.isDraft = draftState;
      return { error: null, status: 0, stdout: JSON.stringify(p) };
    };
    const result = liveReadiness("12", run);
    assert.match(result.error, /draft/);
    assert.equal(calls.length, 1);
  }
});

test("live readiness binds unique complete checks to stable PR head/base/source", () => {
  const head = "b".repeat(40), base = "a".repeat(40);
  let prReads = 0, checkRead = null;
  const run = (_file, args) => {
    if (args[0] === "pr") {
      prReads++;
      return { error: null, status: 0, stdout: JSON.stringify({ url: "https://github.com/yjj3019/AI-Harness/pull/33", baseRefName: "main", baseRefOid: base, headRefOid: head, headRepository: { nameWithOwner: "yjj3019/AI-Harness" }, state: "OPEN", isDraft: false }) };
    }
    checkRead = args;
    return { error: null, status: 0, stdout: completeChecks().map(item => JSON.stringify({ ...item, head_sha: head, app: { slug: "github-actions" }, status: "completed", conclusion: "success", pull_requests: [{ number: 33, head: { sha: head }, base: { sha: base } }] })).join("\n") };
  };
  const result = liveReadiness("33", run);
  assert.equal(result.error, undefined);
  assert.equal(prReads, 2);
  assert.ok(checkRead.some(arg => String(arg).includes(head)));
  assert.equal(evaluateChecks(result.checks, { expectedChecks: result.expectedChecks, expectedHeadSha: result.head, reportedHeadSha: result.head }).ok, true);
  assert.equal(result.headRepository, "yjj3019/AI-Harness");
});

test("live readiness rejects old-head check runs", () => {
  const head = "b".repeat(40), base = "a".repeat(40);
  const run = (_file, args) => {
    if (args[0] === "pr") return { error: null, status: 0, stdout: JSON.stringify({ url: "https://github.com/yjj3019/AI-Harness/pull/33", baseRefName: "main", baseRefOid: base, headRefOid: head, headRepository: { nameWithOwner: "yjj3019/AI-Harness" }, state: "OPEN", isDraft: false }) };
    return { error: null, status: 0, stdout: completeChecks().map(item => JSON.stringify({ ...item, head_sha: "c".repeat(40), status: "completed", conclusion: "success", pull_requests: [{ number: 33, head: { sha: "c".repeat(40) }, base: { sha: base } }] })).join("\n") };
  };
  const result = liveReadiness("33", run);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.checks, []);
});

test("live readiness rejects source repository changes during check collection", () => {
  const head = "b".repeat(40), base = "a".repeat(40);
  let prReads = 0;
  const run = (_file, args) => {
    if (args[0] === "pr") {
      prReads++;
      const source = prReads === 2 ? "fork/AI-Harness" : "yjj3019/AI-Harness";
      return { error: null, status: 0, stdout: JSON.stringify({ url: "https://github.com/yjj3019/AI-Harness/pull/33", baseRefName: "main", baseRefOid: base, headRefOid: head, headRepository: { nameWithOwner: source }, state: "OPEN", isDraft: false }) };
    }
    return { error: null, status: 0, stdout: completeChecks().map(item => JSON.stringify({ ...item, head_sha: head, app: { slug: "github-actions" }, status: "completed", conclusion: "success", pull_requests: [{ number: 33, head: { sha: head }, base: { sha: base } }] })).join("\n") };
  };
  const result = liveReadiness("33", run);
  assert.match(result.error, /source repository changed/);
});

test("live readiness excludes checks associated with another PR on same head/base", () => {
  const head = "b".repeat(40), base = "a".repeat(40);
  const run = (_file, args) => {
    if (args[0] === "pr") return { error: null, status: 0, stdout: JSON.stringify({ url: "https://github.com/yjj3019/AI-Harness/pull/33", baseRefName: "main", baseRefOid: base, headRefOid: head, headRepository: { nameWithOwner: "fork/AI-Harness" }, state: "OPEN", isDraft: false }) };
    return { error: null, status: 0, stdout: completeChecks().map(item => JSON.stringify({ ...item, head_sha: head, app: { slug: "github-actions" }, status: "completed", conclusion: "success", pull_requests: [{ number: 34, head: { sha: head }, base: { sha: base } }] })).join("\n") };
  };
  const result = liveReadiness("33", run);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.checks, []);
});

test("live readiness rejects PR base changes during check collection", () => {
  const head = "b".repeat(40), base = "a".repeat(40);
  let prReads = 0;
  const run = (_file, args) => {
    if (args[0] === "pr") {
      prReads++;
      const changedBase = prReads === 2;
      return { error: null, status: 0, stdout: JSON.stringify({ url: "https://github.com/yjj3019/AI-Harness/pull/33", baseRefName: "main", baseRefOid: changedBase ? "c".repeat(40) : base, headRefOid: head, headRepository: { nameWithOwner: "yjj3019/AI-Harness" }, state: "OPEN", isDraft: false }) };
    }
    return { error: null, status: 0, stdout: completeChecks().map(item => JSON.stringify({ ...item, head_sha: head, app: { slug: "github-actions" }, status: "completed", conclusion: "success", pull_requests: [{ number: 33, head: { sha: head }, base: { sha: base } }] })).join("\n") };
  };
  const result = liveReadiness("33", run);
  assert.match(result.error, /changed/);
});

test("malformed entries are reported instead of passing", () => {
  const verdict = evaluateChecks([{}, { name: "x" }, { name: "y", bucket: 7 }, null]);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.failing.length, 5);
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

test("CLI refuses captured readiness snapshots and malformed files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-guard-"));
  try {
    const captured = path.join(dir, "checks.json");
    fs.writeFileSync(captured, JSON.stringify(completeChecks()));
    const refused = run(["--checks-file", captured, "--expected-head", sha]);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /untrusted/);

    const broken = path.join(dir, "broken.json");
    fs.writeFileSync(broken, "{ not json");
    const invalid = run(["--checks-file", broken, "--expected-head", sha]);
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

test("CLI bounds check file reads and rejects non-files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-guard-"));
  try {
    const sha = "a".repeat(40);
    const missing = run(["--checks-file", path.join(dir, "nope.json"), "--expected-head", sha]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /ENOENT|no such file/i);

    const oversized = path.join(dir, "oversized.json");
    fs.writeFileSync(oversized, "x".repeat(1024 * 1024 + 1));
    const big = run(["--checks-file", oversized, "--expected-head", sha]);
    assert.equal(big.status, 2);
    assert.match(big.stderr, /exceeds/);

    const big2 = run(["--checks-file", dir, "--expected-head", sha]);
    assert.equal(big2.status, 2);
    assert.match(big2.stderr, /not a regular file/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
