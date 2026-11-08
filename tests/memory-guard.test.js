"use strict";
// Deterministic guard for distilled memory stores: links resolve, secrets are absent, facts are dated.
// Covers the deterministic-verification gap of the "dreaming" memory workflow (LLM output has no
// lint pass of its own) plus the pre-dream redaction and TTL eligibility checks.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.resolve(__dirname, "../scripts/memory-guard.js");
function store() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "memory-guard-"));
  const write = (rel, text) => {
    fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  return { root, write };
}
const run = (root) => spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8" });

test("unreadable store path returns a concise IO error instead of a raw stack", () => {
  const missing = path.join(os.tmpdir(), `memory-guard-missing-${process.pid}-${Date.now()}`);
  const r = run(missing);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cannot access store/);
  assert.doesNotMatch(r.stderr, /Error: ENOENT/);
});

test("a clean dated store with resolved links passes", () => {
  const { root, write } = store();
  try {
    write("_index.md", "# Index\n- [[a]]\n");
    write("a.md", "date: 2026-11-05\nfact\n");
    const r = run(root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /files ok/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("missing index, broken link and secret are errors", () => {
  const { root, write } = store();
  try {
    write("_index.md", "- [[missing]]\n");
    write("a.md", "date: 2026-11-05\ntoken ghp_" + "a".repeat(30) + "\n");
    const r = run(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /broken link -> missing/);
    assert.match(r.stderr, /secret-shaped pattern/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("undated facts warn and missing index is reported", () => {
  const { root, write } = store();
  try {
    write("note.md", "fact without a date\n");
    const r = run(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /_index.md is missing/);
    assert.match(r.stderr, /no ISO/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("CRLF frontmatter is stripped before body validation like LF frontmatter", () => {
  const { root, write } = store();
  try {
    write("_index.md", "# Index\r\n- [[a]]\r\n");
    write("a.md", "---\r\ntitle: [[missing]]\r\ndate: 2026-11-05\r\n---\r\nfact\r\n");
    const r = run(root);
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stderr, /broken link/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("external URLs, scheme-relative links and anchors are not broken links", () => {
  const { root, write } = store();
  try {
    write("_index.md", "# Index\n- [[a]]\n");
    write("a.md",
      "date: 2026-11-05\n" +
      "see <https://example.com/page.md> and [ref](#section) and //cdn.example/x.md\n");
    const r = run(root);
    assert.equal(r.status, 0, r.stderr);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a self-referencing directory symlink terminates and is not walked", { skip: process.platform === "win32" && "symlinks need elevation on Windows" }, () => {
  const { root, write } = store();
  try {
    write("_index.md", "- [[a]]\n");
    write("a.md", "date: 2026-11-05\ndated\n");
    fs.symlinkSync(".", path.join(root, "loop"), "dir"); // walking 'loop' would recurse into itself forever
    const r = run(root);
    assert.equal(r.status, 0, r.stderr); // terminates with a verdict instead of a stack overflow
    assert.match(r.stdout, /files ok/);
    assert.doesNotMatch(r.stderr, /Maximum call stack size exceeded/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("an out-of-root symlink is skipped, never reaching files outside the store", { skip: process.platform === "win32" && "symlinks need elevation on Windows" }, () => {
  const { root, write } = store();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "memory-guard-outside-"));
  try {
    write("_index.md", "- [[a]]\n");
    write("a.md", "date: 2026-11-05\ndated\n");
    fs.writeFileSync(path.join(outside, "leak.md"), "token ghp_" + "a".repeat(30) + "\n"); // would error if walked
    fs.symlinkSync(outside, path.join(root, "linked"), "dir");
    const r = run(root);
    assert.equal(r.status, 0, r.stderr); // linked/leak.md must be skipped, so no secret finding
    assert.match(r.stdout, /2 files ok/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});
