"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/ci.yml"), "utf8");
test("checks job budget accommodates a full run and bounded replay", () => {
  const checks = workflow.match(/^  checks:\r?\n([\s\S]*?)(?=^  portability:)/m);
  assert.ok(checks);
  const jobMinutes = Number(checks[1].match(/timeout-minutes:\s*(\d+)/)?.[1]);
  const gate = fs.readFileSync(path.join(__dirname, "../.claude/workflows/phase-gate.js"), "utf8");
  const gateMinutes = Number(gate.match(/TIMEOUT_RAW === undefined \? (\d+) \* 60 \* 1000/)?.[1]);
  const runMinutes = Number(checks[1].match(/name: Run all checks\s+timeout-minutes:\s*(\d+)/)?.[1]);
  assert.ok(Number.isFinite(jobMinutes) && Number.isFinite(gateMinutes));
  assert.equal(runMinutes, gateMinutes, "full run and individual replay need aligned bounds");
  assert.ok(jobMinutes >= runMinutes + gateMinutes + 10, "job must allow one run, one replay and overhead");
});
test("portability job budget accommodates the full regression and setup", () => {
  const job = workflow.match(/^  portability:\r?\n([\s\S]*?)(?=^  isolation-linux:)/m);
  assert.ok(job);
  const jobMinutes = Number(job[1].match(/timeout-minutes:\s*(\d+)/)?.[1]);
  const runMinutes = Number(job[1].match(/name: Run full regression on host\s+timeout-minutes:\s*(\d+)/)?.[1]);
  assert.equal(runMinutes, 150);
  assert.ok(jobMinutes >= runMinutes + 30, "portability job must leave time for setup and artifacts");
});
const match = workflow.match(/      - name: Verify phase attestations\r?\n        run: \|\r?\n((?:          .*\r?\n)+)/);
assert.ok(match, "CI attestation step must exist");
const script = match[1].replace(/^          /gm, "");
const bash = process.platform === "win32" && fs.existsSync("C:/Program Files/Git/bin/bash.exe")
  ? "C:/Program Files/Git/bin/bash.exe" : "bash";

function run(attestations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ci-attestations-"));
  try {
    fs.mkdirSync(path.join(root, "docs/attestations"), { recursive: true });
    fs.mkdirSync(path.join(root, ".claude/workflows"), { recursive: true });
    fs.writeFileSync(path.join(root, ".claude/workflows/phase-gate.js"), `
      const fs = require("node:fs");
      const id = process.argv[3];
      fs.appendFileSync("calls", id + "\\n");
      const att = JSON.parse(fs.readFileSync("docs/attestations/phase-" + id + ".json", "utf8"));
      if (att.schema !== 1 || att.phase !== id) process.exit(2);
    `);
    for (const [id, attestation] of Object.entries(attestations)) {
      fs.writeFileSync(path.join(root, "docs/attestations", `phase-${id}.json`), JSON.stringify(attestation));
    }
    const result = spawnSync(bash, ["--noprofile", "--norc", "-eo", "pipefail", "-c", script], { cwd: root, encoding: "utf8" });
    assert.ifError(result.error);
    const calls = fs.existsSync(path.join(root, "calls")) ? fs.readFileSync(path.join(root, "calls"), "utf8").trim().split("\n") : [];
    return { ...result, calls };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("CI runs the gate for every attestation with the same tree and command", () => {
  const att = { schema: 1, tree: "same", argv: ["node", "--test"] };
  const result = run({ a: { ...att, phase: "a" }, b: { ...att, phase: "b" } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, ["a", "b"]);
});

test("CI fails when a later same-tree attestation has an invalid schema", () => {
  const att = { schema: 1, tree: "same", argv: ["node", "--test"] };
  const result = run({ a: { ...att, phase: "a" }, b: { ...att, schema: 99, phase: "b" } });
  assert.notEqual(result.status, 0);
  assert.deepEqual(result.calls, ["a", "b"]);
});

test("CI reports an empty attestation inventory without claiming verification", () => {
  const result = run({});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, []);
  assert.match(result.stdout, /No attestations verified/);
});
