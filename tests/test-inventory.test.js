"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { skipReason } = require("./helpers/bash-probe");

// A nested `node --test` inherits NODE_TEST_CONTEXT from this test run and then prints no summary at all.
const fixtureEnv = (extra) => { const env = { ...process.env, ...extra }; delete env.NODE_TEST_CONTEXT; return env; };

// Exercise the real entry point in an isolated tree; the guard precedes all
// other checks, so neither the suite nor production files are touched.
const BASH_SKIP = skipReason();

// The unit-facing part of run-all.sh (the floor guard) runs before any file
// lookups. The completion part after the guard needs the production files the
// script executes to exist in the fixture, otherwise the 15-file branch can
// never reach ALL CHECKS PASSED (a false-green arm). Copy the real files.
const PRODUCTION_FILES = [
  ".claude/workflows/phase-gate.js",
  ".claude/workflows/test-summary.js",
  "scripts/test-summary-gate.js",
  ".claude/hooks/block-destructive.sh",
  ".claude/hooks/evidence-guard.sh",
  ".claude/hooks/read-tracker.sh",
  ".codex/hooks/block-destructive.sh",
  ".codex/hooks/evidence-guard.sh",
  ".codex/hooks/read-tracker.sh",
  ".codex/hooks.json",
  ".claude/settings.json",
  ".claude/agents/coding.md",
  ".claude/agents/test.md",
  ".claude/agents/verify.md",
  ".claude/agents/review.md",
  ".claude/agents/compound.md",
  ".claude/commands/phase-harness.md",
  "scripts/context-contract.js",
  "scripts/phase-definition.js",
  "scripts/design-channel-check.js",
  "scripts/eval-set-check.js",
  "scripts/evidence-redact.js",
  "scripts/handoff-lint.js",
  "scripts/merge-guard.js",
  "scripts/package-lint.js",
  "scripts/skill-audit.js",
  "scripts/secret-scan.js",
  "scripts/tree-exclude-check.js",
  "skills/skill-audit/SKILL.md",
  "skills/skill-audit/references/audit-patterns.md",
  "docs/eval-set/eval-set.json",
  "docs/eval-set/harness-pilot-dev.json",
  "docs/eval-set/harness-pilot-holdout.json",
  "docs/eval-set/harness-pilot-protocol.md",
  "docs/eval-set/three-host-remediation-protocol.md",
  "docs/report-editing-cases.json",
  "docs/HANDOFF.md",
  "docs/HANDOFF-history-2026-11-20.md",
  "docs/compound-log.md",
  "docs/compound-log-active.md",
  ".github/workflows/ci.yml",
  "tests/agents-lint.sh",
  "tests/hooks.test.sh",
  "tests/run-all.sh",
];

function copyProduction(root) {
  for (const rel of PRODUCTION_FILES) {
    const src = path.join(__dirname, "..", rel);
    const dst = path.join(root, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

test("inventory guard counts files and rejects a shrunken suite", { skip: BASH_SKIP }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const tests = path.join(root, "tests");
  fs.mkdirSync(tests);
  fs.copyFileSync(path.join(__dirname, "run-all.sh"), path.join(tests, "run-all.sh"));
  const bash = process.env.HARNESS_BASH || "bash";
  const run = () => {
    const result = spawnSync(bash, [path.join(tests, "run-all.sh")], { encoding: "utf8", env: fixtureEnv({ HARNESS_MIN_TEST_FILES: "15", HARNESS_MIN_TESTS: "1" }) });
    assert.ifError(result.error);
    return result;
  };
  let result = run();
  assert.equal(result.status, 2);
  assert.match(result.stdout, /test files: 0 \(floor 15\)/);
  assert.match(result.stderr, /below the floor/);
  for (let i = 0; i < 14; i++) fs.writeFileSync(path.join(tests, `${i}.test.js`), "");
  fs.mkdirSync(path.join(tests, "directory.test.js"));
  result = run();
  assert.equal(result.status, 2);
  assert.match(result.stdout, /test files: 14 \(floor 15\)/);
  assert.match(result.stderr, /below the floor/);
  fs.writeFileSync(path.join(tests, "15.test.js"), "");
  copyProduction(root);
  result = run();
  assert.equal(result.status, 0, `completion branch must pass: ${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /test files: 15 \(floor 15\)/);
  assert.match(result.stdout, /ALL CHECKS PASSED/);
  assert.doesNotMatch(result.stdout, /below the floor/);
  assert.doesNotMatch(result.stderr, /missing required tool/);
});

const { gate: summaryGate } = require("../scripts/test-summary-gate.js");
test("the node summary gate rejects empty, all-skipped, too-small and too-skippy runs", () => {
  const spec = (tests, pass, skipped) => [
    "ℹ tests " + tests, "ℹ suites 0", "ℹ pass " + pass, "ℹ fail 0", "ℹ cancelled 0", "ℹ skipped " + skipped, "ℹ todo 0", "ℹ duration_ms 5",
  ].join("\n");
  assert.equal(summaryGate(spec(458, 448, 10), 400, 20).ok, true);
  assert.match(summaryGate(spec(458, 448, 10), 400, 20).message, /448 passed, 10 skipped of 458/);
  assert.equal(summaryGate("", 1, 20).ok, false, "no summary at all");
  assert.equal(summaryGate(spec(15, 15, 0), 400, 20).ok, false, "fifteen empty files pass but are too few tests");
  assert.match(summaryGate(spec(15, 15, 0), 400, 20).message, /minimum tests 400/);
  assert.equal(summaryGate(spec(15, 0, 15), 1, 20).ok, false, "everything skipped");
  assert.equal(summaryGate(spec(458, 440, 18), 400, 10).ok, false, "too many skips");
  assert.match(summaryGate(spec(458, 440, 18), 400, 10).message, /maximum skipped 10/);
  assert.equal(summaryGate(spec(10, 9, 0).replace("ℹ fail 0", "ℹ fail 1"), 1, 20).ok, false, "a failure is never ok");
});
test("run-all uses the summary gate with the committed minimums", () => {
  const script = fs.readFileSync(path.join(__dirname, "run-all.sh"), "utf8");
  assert.ok(script.includes("floor=${HARNESS_MIN_TEST_FILES:-48}"));
  assert.ok(script.includes('test-summary-gate.js "$node_log" "${HARNESS_MIN_TESTS:-400}" "${HARNESS_MAX_SKIPPED:-20}"'));
});
