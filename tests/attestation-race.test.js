"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function fixture(fn, unbound = false, evidenceTree = "unchanged") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attestation-race-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const preload = path.join(root, ".phase-evidence", "inject.cjs");
  const gate = (mode, ...args) => spawnSync(process.execPath, ["--require", preload, GATE, ...args], {
    cwd: root, env: { ...env, INJECT_MODE: mode }, encoding: "utf8",
  });
  const pass = (r) => assert.equal(r.status, 0, `${r.error || ""}\n${r.stdout}\n${r.stderr}`);
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: Attestation race\n");
    fs.writeFileSync(path.join(root, "app.js"), "original\n");
    // Intercept the gate's synchronous git call without shell scripts or executable wrappers.
    // The second ls-files call occurs after validateChain and before attestation is written.
    fs.writeFileSync(preload, `
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const write = fs.writeFileSync;
const rename = fs.renameSync;
fs.writeFileSync = function(file, ...args) {
  if (process.env.INJECT_MODE === 'json-write' && typeof file === 'number') {
    write.call(this, file, '{');
    throw new Error('injected partial JSON write');
  }
  return write.call(this, file, ...args);
};
fs.renameSync = function(from, to) {
  if (process.env.INJECT_MODE === 'json-replace' && path.basename(from).startsWith('.phase-json-'))
    throw new Error('injected JSON replacement failure');
  return rename.call(this, from, to);
};
const original = cp.spawnSync;
let calls = 0;
let unavailable = false;
cp.spawnSync = function(command, args, options) {
  if (command === 'git' && args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree' && unavailable)
    return { status: 1, stdout: '', stderr: '' };
  if (command === 'git' && args[0] === 'ls-files') {
    calls++;
    const mode = process.env.INJECT_MODE;
    if (mode === 'mutate' && calls === 2) fs.writeFileSync('app.js', 'changed\\n');
    unavailable = mode === 'always-unavailable' || (mode === 'first-unavailable' && calls === 1);
    if (unavailable)
      return { status: 1, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    fs.appendFileSync('.phase-evidence/calls', String(calls) + '\\n');
  }
  return original.apply(this, arguments);
};
`);
    pass(spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" }));
    const report = ".phase-evidence/report.md";
    fs.writeFileSync(path.join(root, report), "Independent report\n");
    const record = (step) => gate("control", "record", "1", step, "--status", "PASS", "--report", report);
    pass(record("coding"));
    pass(gate(unbound ? "always-unavailable" : "control", "run", "1", "test", "--", process.execPath, "-e", "process.exit(0)"));
    if (evidenceTree !== "unchanged") {
      // Synthetic historical/malformed evidence fixture, linked by later record calls.
      const file = path.join(root, ".phase-evidence", "phase-1-test.json");
      const evidence = JSON.parse(fs.readFileSync(file, "utf8"));
      if (evidenceTree === "missing") delete evidence.tree;
      else evidence.tree = evidenceTree;
      fs.writeFileSync(file, JSON.stringify(evidence));
    }
    for (const step of ["verify", "review", "compound"]) pass(record(step));
    fn({ root, gate, pass });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("attest rejects a tree changed between validation and its second snapshot", () => {
  fixture(({ root, gate }) => {
    const result = gate("mutate", "attest", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /code tree does not match test evidence/);
    assert.equal(fs.readFileSync(path.join(root, "app.js"), "utf8"), "changed\n");
    assert.equal(fs.existsSync(path.join(root, "docs", "attestations", "phase-1.json")), false);
  });
});

test("attest accepts the unchanged tree", () => {
  fixture(({ root, gate, pass }) => {
    const result = gate("control", "attest", "1");
    pass(result);
    const att = JSON.parse(fs.readFileSync(path.join(root, "docs", "attestations", "phase-1.json"), "utf8"));
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(att.tree, evidence.tree);
  });
});

test("failed JSON staging and replacement preserve published evidence and attestation", () => {
  fixture(({ root, gate, pass }) => {
    pass(gate("control", "attest", "1"));
    const operations = [
      { file: ".phase-evidence/phase-1-coding.json", args: ["record", "1", "coding", "--status", "PASS", "--report", ".phase-evidence/report.md"] },
      { file: "docs/attestations/phase-1.json", args: ["attest", "1"] },
    ];
    for (const { file, args } of operations) {
      const target = path.join(root, file);
      const before = fs.readFileSync(target);
      for (const [mode, reason] of [["json-write", /partial JSON write/], ["json-replace", /JSON replacement failure/]]) {
        const result = gate(mode, ...args);
        assert.equal(result.status, 2, result.stdout + result.stderr);
        assert.match(result.stderr, reason);
        assert.deepEqual(fs.readFileSync(target), before);
        assert.ok(fs.readdirSync(path.dirname(target)).every(name => !name.startsWith(".phase-json-")));
      }
    }
    pass(gate("control", "check", "1", "--require-bound-tree"));
  });
});

test("attest rejects unbound evidence when git becomes available after validation", () => {
  fixture(({ root, gate }) => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(evidence.tree, null);
    const result = gate("first-unavailable", "attest", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /code tree does not match test evidence/);
    assert.equal(fs.existsSync(path.join(root, "docs", "attestations", "phase-1.json")), false);
  }, true);
});

test("check rejects bound evidence when the current tree is unavailable", () => {
  fixture(({ root, gate }) => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(typeof evidence.tree, "string");
    const result = gate("first-unavailable", "check", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /\[FAIL\]\s+test: Git tree snapshot unavailable.*could not be compared/);
    assert.doesNotMatch(result.stdout, /\[WARN\]/);
  });
});

test("check accepts an unchanged bound tree", () => {
  fixture(({ gate, pass }) => {
    const result = gate("control", "check", "1");
    pass(result);
    assert.match(result.stdout, /Phase 1 COMPLETED/);
    assert.doesNotMatch(result.stdout, /\[WARN\]/);
  });
});

test("check warns for explicitly unbound evidence when the tree remains unavailable", () => {
  fixture(({ root, gate, pass }) => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(evidence.tree, null);
    const result = gate("always-unavailable", "check", "1");
    pass(result);
    assert.match(result.stdout, /\[WARN\]\s+code tree is not bound/);
    const available = gate("control", "check", "1");
    assert.equal(available.status, 2, available.stdout + available.stderr);
    assert.match(available.stderr, /test evidence has no code tree hash/);
  }, true);
});

test("check warns for synthetic older evidence without a tree field", () => {
  fixture(({ gate, pass }) => {
    const result = gate("always-unavailable", "check", "1");
    pass(result);
    assert.match(result.stdout, /older evidence has no tree field/);
  }, true, "missing");
});

for (const invalid of [42, false, [], {}]) {
  test(`check rejects invalid tree field ${JSON.stringify(invalid)} when unavailable`, () => {
    fixture(({ gate }) => {
      const result = gate("always-unavailable", "check", "1");
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, /invalid test evidence code tree hash/);
    }, true, invalid);
  });
}

test("attest rejects bound evidence when validation cannot obtain a hash", () => {
  fixture(({ root, gate }) => {
    fs.writeFileSync(path.join(root, "app.js"), "changed\n");
    const result = gate("first-unavailable", "attest", "1");
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /cannot attest\. test: Git tree snapshot unavailable.*could not be compared/);
    assert.equal(fs.existsSync(path.join(root, "docs", "attestations", "phase-1.json")), false);
  });
});
