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
  result = run();
  assert.match(result.stdout, /test files: 15 \(floor 15\)/);
  assert.match(result.stdout, /== syntax ==/);
  assert.doesNotMatch(result.stderr, /below the floor/);
});
