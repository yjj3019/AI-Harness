"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function fixture(fn, { nested = false, trailingSpace = false } = {}) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "gate-output-paths-"));
  const repo = path.join(sandbox, trailingSpace ? "repository " : "repository");
  const root = nested ? path.join(repo, "nested") : repo;
  const outside = path.join(sandbox, "outside-temp");
  const marker = path.join(sandbox, "child-ran");
  const preload = path.join(sandbox, "inject.cjs");
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(outside);
  fs.writeFileSync(preload, `
const cp = require('node:child_process');
const original = cp.spawnSync;
cp.spawnSync = function(command, args, options) {
  if (process.env.INJECT_CHILD_FAILURE === '1' && command === process.execPath && args[0] === 'runner.js') {
    const error = new Error('injected child spawn failure'); error.code = 'ENOENT';
    return { error, status: null, signal: null };
  }
  return original.apply(this, arguments);
};
`);
  const env = { ...process.env, PHASE_GATE_ROOT: root, TMPDIR: outside, TMP: outside, TEMP: outside, CHILD_MARKER: marker };
  delete env.NODE_TEST_CONTEXT;
  delete env.INJECT_CHILD_FAILURE;
  delete env.REPLAY_FAIL;
  const gate = (args, extra = {}) => spawnSync(process.execPath, ["--require", preload, GATE, ...args], {
    cwd: root, env: { ...env, ...extra }, encoding: "utf8",
  });
  const passes = r => assert.equal(r.status, 0, `${r.error || ""}\n${r.stdout}\n${r.stderr}`);
  const replayDirs = dir => fs.readdirSync(dir).filter(name => name.startsWith("phase-gate-replay-"));
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Output paths\n");
    fs.writeFileSync(path.join(root, "runner.js"), [
      "const fs = require('node:fs');",
      "const r = require('node:child_process').spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'actual.test.js'], {encoding:'utf8'});",
      "if (r.error || r.status !== 0) process.exit(1);",
      "if (process.env.CHILD_MARKER) fs.writeFileSync(process.env.CHILD_MARKER, 'ran');",
      "process.stdout.write(r.stdout);",
      "if (process.env.REPLAY_FAIL === '1') process.exitCode = 7;",
    ].join("\n"));
    fs.writeFileSync(path.join(root, "actual.test.js"), "require('node:test').test('fixture', () => require('node:assert/strict').equal(1, 1));\n");
    passes(spawnSync("git", ["init", "-q"], { cwd: repo, encoding: "utf8" }));
    passes(spawnSync("git", ["add", "docs/PHASES.md", "runner.js", "actual.test.js"], { cwd: root, encoding: "utf8" }));
    const report = ".phase-evidence/report.md";
    fs.writeFileSync(path.join(root, report), "Disposable fixture report.\n");
    const record = step => gate(["record", "1", step, "--status", "PASS", "--report", report]);
    passes(record("coding"));
    passes(gate(["run", "1", "test", "--require-test-summary", "--", process.execPath, "runner.js"]));
    for (const step of ["verify", "review", "compound"]) passes(record(step));
    passes(gate(["attest", "1"]));
    fs.unlinkSync(marker);
    fn({ repo, root, outside, marker, gate, replayDirs });
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

for (const nested of [false, true]) {
  test(`strict replay rejects temp inside ${nested ? "nested worktree root" : "repository"}`, () => {
    fixture(({ repo, root, marker, gate, replayDirs }) => {
      // For a nested project root, place temp in a sibling under the enclosing repo.
      const inside = path.join(repo, "inside-temp");
      fs.mkdirSync(inside);
      // The test directory must not change the bound tree (empty directories are not enumerated).
      const r = gate(["verify-attestation", "1"], { TMPDIR: inside, TMP: inside, TEMP: inside });
      assert.equal(r.status, 2, r.stderr);
      assert.match(r.stderr, /temporary directory is inside the repository/);
      assert.equal(fs.existsSync(marker), false, "child must not run");
      assert.deepEqual(replayDirs(inside), []);
      assert.deepEqual(replayDirs(repo), []);
    }, { nested });
  });
}

// Windows runners expose os.tmpdir() as an 8.3 short name (for example RUNNER~1). A temp directory inside the repository
// must still be recognized when only one side of the comparison is spelled with short names.
test("strict replay rejects temp inside repository addressed by its 8.3 short name", { skip: process.platform !== "win32" && "8.3 short names exist only on Windows" }, () => {
  fixture(({ repo, marker, gate, replayDirs }) => {
    const inside = path.join(repo, "inside-temp");
    fs.mkdirSync(inside);
    // fs.realpathSync (JS) keeps a short spelling, so derive the short form from a ShortPath lookup instead.
    const lookup = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:HARNESS_SHORT_TARGET).ShortPath"], { encoding: "utf8", env: { ...process.env, HARNESS_SHORT_TARGET: inside } });
    const short = (lookup.stdout || "").trim();
    if (!short || short.toLowerCase() === inside.toLowerCase()) return; // volume does not generate short names
    const r = gate(["verify-attestation", "1"], { TMPDIR: short, TMP: short, TEMP: short });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /temporary directory is inside the repository/);
    assert.equal(fs.existsSync(marker), false, "child must not run");
    assert.deepEqual(replayDirs(inside), []);
  });
});

test("strict replay rejects temp inside repository with trailing-space root", { skip: process.platform === "win32" && "Windows does not support trailing-space directory names" }, () => {
  fixture(({ repo, marker, gate, replayDirs }) => {
    const inside = path.join(repo, "inside-temp");
    fs.mkdirSync(inside);
    const r = gate(["verify-attestation", "1"], { TMPDIR: inside, TMP: inside, TEMP: inside });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /temporary directory is inside the repository/);
    assert.equal(fs.existsSync(marker), false);
    assert.deepEqual(replayDirs(inside), []);
  }, { trailingSpace: true });
});

test("strict replay removes temporary output when test exits nonzero", () => {
  fixture(({ outside, marker, gate, replayDirs }) => {
    const r = gate(["verify-attestation", "1"], { REPLAY_FAIL: "1" });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /test command exited with 7/);
    assert.equal(fs.existsSync(marker), true);
    assert.deepEqual(replayDirs(outside), []);
  });
});

test("strict replay removes temporary output on child spawn failure", () => {
  fixture(({ outside, marker, gate, replayDirs }) => {
    const r = gate(["verify-attestation", "1"], { INJECT_CHILD_FAILURE: "1" });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /injected child spawn failure/);
    assert.equal(fs.existsSync(marker), false);
    assert.deepEqual(replayDirs(outside), []);
  });
});
