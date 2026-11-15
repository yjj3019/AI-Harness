"use strict";
// Positive controls for scripts/host-permission-matrix.js (harness-reinforcement-plan B1 — 호스트 권한 실측).
// Assertions are portable: structure, enum, and exec=ok hold on every runner; per-OS probe
// outcomes (read/net) are not asserted because they are the very values under measurement.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "host-permission-matrix.js");
const STATUS = ["ok", "denied", "unknown"];

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

test("host-permission-matrix: json report has all probes with valid enum statuses", () => {
  const r = run("--json");
  assert.equal(r.status, 0, r.stderr);
  const m = JSON.parse(r.stdout);
  assert.equal(m.version, 1);
  assert.equal(m.os, process.platform);
  assert.equal(m.arch, process.arch);
  assert.match(m.measured_at, /^\d{4}-\d{2}-\d{2}T/);
  for (const k of ["read", "write", "exec", "net"]) {
    assert.ok(m.probes[k], `probe ${k} missing`);
    assert.ok(STATUS.includes(m.probes[k].status), `probe ${k} bad status: ${m.probes[k].status}`);
    assert.equal(typeof m.probes[k].detail, "string");
    assert.ok(m.probes[k].detail.length > 0, `probe ${k} detail empty`);
  }
  assert.equal(m.probes.exec.status, "ok", "node --version must succeed where the tests run");
});

test("host-permission-matrix: compact line format", () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^HOST-MATRIX \S+ read=(ok|denied|unknown) write=(ok|denied|unknown) exec=(ok|denied|unknown) net=.+ measured=\d{4}-\d{2}-\d{2}T/);
});

test("host-permission-matrix: markdown mode emits a table row", () => {
  const r = run("--markdown");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`^\\| ${process.platform}/`));
  assert.match(r.stdout, /probe details/);
  assert.match(r.stdout, /- read: /);
});

test("host-permission-matrix: bad arguments exit 2", () => {
  const r = run("--bogus");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown argument/);
});

test("host-permission-matrix: leaves no probe file behind in the home directory", () => {
  const r = run("--json");
  assert.equal(r.status, 0, r.stderr);
  const home = os.homedir();
  const leftovers = fs.readdirSync(home).filter(n => n.startsWith(".host-matrix-probe-"));
  assert.deepEqual(leftovers, [], "write probe file must be removed");
});
