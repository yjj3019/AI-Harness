"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const checker = path.resolve(__dirname, "../scripts/verify-attestation-inventory.js");
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-test-"));
  try {
    fs.mkdirSync(path.join(root, "docs", "attestations"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: One\n### Phase 2: Two\n```\n### Phase fake: Example\n```\n");
    const gate = path.join(root, "stub gate.js");
    fs.writeFileSync(gate, `const fs=require('node:fs');\nfs.appendFileSync('calls',JSON.stringify({argv:process.argv.slice(2),root:process.env.PHASE_GATE_ROOT,cwd:process.cwd(),exec:process.execPath})+'\\n');\nconsole.log('stub '+process.argv[3]);\nif(process.argv[3]==='2' && process.env.FAIL_SECOND) process.exit(7);\n`);
    const manifest = path.join(root, "manifest.json");
    const att = (id) => fs.writeFileSync(path.join(root, "docs", "attestations", `phase-${id}.json`), "{}");
    const run = (input, extraEnv = {}) => {
      if (input !== undefined) fs.writeFileSync(manifest, input);
      const runner = `require(${JSON.stringify(checker)}).verifyInventory(${JSON.stringify(manifest)}, {root:${JSON.stringify(root)}, gatePath:${JSON.stringify(gate)}})`;
      return spawnSync(process.execPath, ["-e", `try { ${runner} } catch(e) { console.error(e.message); process.exitCode=1; }`], { cwd: root, encoding: "utf8", env: { ...process.env, ...extraEnv } });
    };
    const calls = () => fs.existsSync(path.join(root, "calls")) ? fs.readFileSync(path.join(root, "calls"), "utf8").trim().split("\n").map(JSON.parse) : [];
    fn({ root, manifest, att, run, calls });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test("rejects empty, malformed, duplicate, traversal, unknown and non-string manifests before replay", () => {
  fixture(({ att, run, calls }) => {
    att("1"); att("2");
    for (const value of ["[]", "{}", "null", "[", '["1","1"]', '["1","../2"]', '["1","2/3"]', '["1","fake"]', '["1",2]', '["1","--help"]']) {
      const r = run(value);
      assert.notEqual(r.status, 0, value);
      assert.match(r.stderr, /manifest|unknown phase/i, value);
      assert.deepEqual(calls(), [], value);
    }
    assert.notEqual(run(Buffer.from([0xff])).status, 0);
    assert.deepEqual(calls(), []);
  });
});

test("missing later attestation fails before any gate runs", () => {
  fixture(({ att, run, calls }) => {
    att("1");
    const r = run('["1","2"]');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /missing.*phase 2/i);
    assert.deepEqual(calls(), []);
  });
});

test("verifies multiple phases sequentially with only the gate command and ID", () => {
  fixture(({ root, att, run, calls }) => {
    att("1"); att("2");
    const r = run('["2","1"]');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /stub 2[\s\S]*stub 1[\s\S]*Verified 2 required attestation/);
    assert.deepEqual(calls(), ["2", "1"].map((id) => ({ argv: ["verify-attestation", id], root, cwd: root, exec: process.execPath })));
  });
});

test("gate failure aborts and does not report success", () => {
  fixture(({ att, run, calls }) => {
    att("1"); att("2");
    const r = run('["2","1"]', { FAIL_SECOND: "1" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /phase 2 verification failed \(exit 7\)/);
    assert.doesNotMatch(r.stdout, /Verified 2/);
    assert.equal(calls().length, 1);
  });
});

test("real gate rejects a malformed attestation in a fixture root", () => {
  fixture(({ root, manifest, att }) => {
    att("1");
    fs.writeFileSync(manifest, '["1"]');
    const gate = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");
    const runner = `require(${JSON.stringify(checker)}).verifyInventory(${JSON.stringify(manifest)}, {root:${JSON.stringify(root)}, gatePath:${JSON.stringify(gate)}})`;
    const r = spawnSync(process.execPath, ["-e", `try { ${runner} } catch(e) { console.error(e.message); process.exitCode=1; }`], { cwd: root, encoding: "utf8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /attestation for phase 1: schema or phase mismatch/);
    assert.match(r.stderr, /phase 1 verification failed/);
    assert.doesNotMatch(r.stdout, /Verified 1 required/);
  });
});

test("CLI requires exactly one explicit path and rejects options or missing files", () => {
  fixture(({ root }) => {
    for (const args of [[], ["--help"], ["missing.json"], ["a", "b"]]) {
      const r = spawnSync(process.execPath, [checker, ...args], { cwd: root, encoding: "utf8" });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Usage:/);
      assert.doesNotMatch(r.stdout, /Verifying/);
    }
  });
});
