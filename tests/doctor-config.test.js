"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const source = path.resolve(__dirname, "..");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doctor config "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".claude/hooks"), { recursive: true });
  const settings = JSON.parse(fs.readFileSync(path.join(source, ".claude/settings.json"), "utf8"));
  for (const name of ["evidence-guard.sh", "block-destructive.sh", "read-tracker.sh"])
    fs.writeFileSync(path.join(root, ".claude/hooks", name), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const run = (value = settings) => {
    fs.writeFileSync(path.join(root, ".claude/settings.json"), JSON.stringify(value));
    return spawnSync(process.execPath, [path.join(source, ".claude/workflows/phase-gate.js"), "doctor"], {
      env: { ...process.env, PHASE_GATE_ROOT: root }, encoding: "utf8",
    });
  };
  return { root, settings, run };
}

test("doctor accepts exact wiring in a project path with spaces", t => {
  const { run } = fixture(t);
  const result = run();
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

for (const value of [null, false, 0, "", [], "settings"]) {
  test("doctor rejects settings root " + JSON.stringify(value), t => {
    const { run } = fixture(t);
    const result = run(value);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /not a valid JSON object/);
  });
}

for (const [label, mutate] of [
  ["lookalike script name", s => { s.hooks.PreToolUse[0].hooks[0].command = '"${CLAUDE_PROJECT_DIR}/.claude/hooks/not-evidence-guard.sh" auto'; }],
  ["extra shell command", s => { s.hooks.PreToolUse[0].hooks[0].command += " || true"; }],
  ["missing auto argument", s => { s.hooks.PreToolUse[0].hooks[0].command = '"${CLAUDE_PROJECT_DIR}/.claude/hooks/evidence-guard.sh"'; }],
  ["wrong event", s => { s.hooks.PostToolUse.push(s.hooks.PreToolUse.shift()); }],
  ["wrong matcher", s => { s.hooks.PreToolUse[0].matcher = "Read"; }],
  ["wrong hook type", s => { s.hooks.PreToolUse[0].hooks[0].type = "prompt"; }],
  ["malformed event", s => { s.hooks.PreToolUse = {}; }],
  ["malformed group", s => { s.hooks.PreToolUse = [null]; }],
]) {
  test("doctor rejects " + label, t => {
    const { settings, run } = fixture(t);
    mutate(settings);
    const result = run();
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /expected PreToolUse matcher/);
    assert.doesNotMatch(result.stdout, /Guards can run here/);
  });
}

test("doctor rejects a hook directory even if it is executable", t => {
  const { root, run } = fixture(t);
  const file = path.join(root, ".claude/hooks/evidence-guard.sh");
  fs.unlinkSync(file);
  fs.mkdirSync(file);
  const result = run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not a repository file/);
});

test("doctor rejects hook files reached through an external directory symlink", t => {
  const { root, run } = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const hooks = path.join(root, ".claude/hooks");
  for (const name of fs.readdirSync(hooks)) fs.copyFileSync(path.join(hooks, name), path.join(outside, name));
  fs.rmSync(hooks, { recursive: true });
  fs.symlinkSync(outside, hooks, process.platform === "win32" ? "junction" : "dir");
  const result = run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not a repository file/);
});
