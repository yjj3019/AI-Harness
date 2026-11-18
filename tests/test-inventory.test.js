"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { skipReason } = require("./helpers/bash-probe");

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
  ".claude/hooks/block-destructive.sh",
  ".claude/hooks/evidence-guard.sh",
  ".claude/hooks/read-tracker.sh",
  ".codex/hooks/block-destructive.sh",
  ".codex/hooks/evidence-guard.sh",
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
  "scripts/handoff-lint.js",
  "scripts/merge-guard.js",
  "scripts/package-lint.js",
  "scripts/skill-audit.js",
  "scripts/secret-scan.js",
  "scripts/tree-exclude-check.js",
  "skills/skill-audit/SKILL.md",
  "docs/eval-set/eval-set.json",
  "docs/report-editing-cases.json",
  "docs/HANDOFF.md",
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
    const result = spawnSync(bash, [path.join(tests, "run-all.sh")], { encoding: "utf8" });
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
