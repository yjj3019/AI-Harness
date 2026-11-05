"use strict";
// Output discipline and fail-closed behavior of gate scripts: usage misuse exits 2,
// findings go to stderr, and a secret in input can never pass as clean.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const node = process.execPath;

test("gate scripts fail closed (exit 2) on missing required arguments", () => {
  for (const script of ["scripts/memory-guard.js", "scripts/evidence-redact.js"]) {
    const r = spawnSync(node, [path.join(ROOT, script)], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.status, 2, `${script} must exit 2 without args`);
    assert.match(r.stderr, /usage/, `${script} must explain usage on stderr`);
  }
});

test("evidence-redact rejects a secret-shaped token and never in stdout", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er-"));
  try {
    const bad = path.join(dir, "leak.txt");
    fs.writeFileSync(bad, "token ghp_" + "a".repeat(32) + "\n");
    const r = spawnSync(node, [path.join(ROOT, "scripts/evidence-redact.js"), bad], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.status, 1, "secret must fail the redaction gate");
    assert.match(r.stderr, /secrets detected/);
    assert.doesNotMatch(r.stderr, /ghp_[A-Za-z0-9]{30}/, "no raw token may be echoed");
    const clean = path.join(dir, "clean.txt");
    fs.writeFileSync(clean, "no secrets here\n");
    const ok = spawnSync(node, [path.join(ROOT, "scripts/evidence-redact.js"), clean], { encoding: "utf8", timeout: 20000 });
    assert.equal(ok.status, 0, "clean file must pass");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("secret-scan behavior with synthetic fixtures and negative controls", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ss-"));
  try {
    fs.mkdirSync(path.join(dir, "skills"), { recursive: true });
    fs.writeFileSync(path.join(dir, "skills", "safe.md"), "placeholder ghp_xxx and sk-abc are not real\n");
    const neg = spawnSync(node, [path.join(ROOT, "scripts/secret-scan.js"), dir], { encoding: "utf8", timeout: 30000 });
    assert.equal(neg.status, 0, "negative controls must stay clean");
    fs.writeFileSync(path.join(dir, "skills", "leak.md"), "ghp_" + "b".repeat(36) + "\n");
    const pos = spawnSync(node, [path.join(ROOT, "scripts/secret-scan.js"), dir], { encoding: "utf8", timeout: 30000 });
    assert.equal(pos.status, 1, "synthetic secret must be found");
    assert.match(pos.stderr, /secret-scan: findings/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
