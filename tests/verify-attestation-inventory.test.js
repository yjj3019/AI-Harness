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

test("preflight checks presence without spawning or verifying attestation contents", () => {
  const child = require("node:child_process");
  const original = child.spawnSync;
  let spawned = 0;
  child.spawnSync = () => { spawned++; throw new Error("unexpected spawn"); };
  delete require.cache[checker];
  const { verifyInventory } = require(checker);
  child.spawnSync = original;
  delete require.cache[checker];
  fixture(({ root, manifest, att }) => {
    const output = [];
    const log = console.log;
    console.log = (line) => output.push(line);
    try {
      att("1"); att("2");
      fs.writeFileSync(path.join(root, "docs", "attestations", "phase-2.json"), "not JSON");
      fs.writeFileSync(manifest, '["2","1"]');
      verifyInventory(manifest, { root, preflight: true });
      assert.match(output.join("\n"), /Phase 2:.*present.*unverified[\s\S]*Phase 1:.*present.*unverified/i);
      assert.match(output.join("\n"), /not verified and no commands were run/i);
      assert.doesNotMatch(output.join("\n"), /Verified \d+ required/);
      for (const input of ["[]", "{}", "null", "[", '["1","1"]', '["../2"]', '[".draft"]', '["1",2]', '["fake"]', '["unknown"]', Buffer.from([0xff])]) {
        fs.writeFileSync(manifest, input);
        assert.throws(() => verifyInventory(manifest, { root, preflight: true }), /manifest|unknown phase/i);
      }
      fs.writeFileSync(manifest, '["1","2"]');
      fs.unlinkSync(path.join(root, "docs", "attestations", "phase-2.json"));
      assert.throws(() => verifyInventory(manifest, { root, preflight: true }), /missing.*phase 2/i);
      fs.mkdirSync(path.join(root, "docs", "attestations", "phase-2.json"));
      assert.throws(() => verifyInventory(manifest, { root, preflight: true }), /missing.*phase 2/i);
      assert.equal(spawned, 0);
    } finally { console.log = log; }
  });
});

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
    const observed = calls();
    assert.deepEqual(observed.map(({ argv, root, exec }) => ({ argv, root, exec })),
      ["2", "1"].map((id) => ({ argv: ["verify-attestation", id], root, exec: process.execPath })));
    for (const call of observed) assert.equal(fs.realpathSync.native(call.cwd), fs.realpathSync.native(root));
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

test("reports a replay timeout as a timeout", () => {
  const child = require("node:child_process");
  const original = child.spawnSync;
  child.spawnSync = () => ({ error: Object.assign(new Error("spawnSync timed out"), { code: "ETIMEDOUT" }), status: null });
  delete require.cache[checker];
  const { verifyInventory } = require(checker);
  child.spawnSync = original;
  delete require.cache[checker];
  fixture(({ root, manifest, att }) => {
    att("1");
    fs.writeFileSync(manifest, '["1"]');
    assert.throws(() => verifyInventory(manifest, { root }), /phase 1 verification timed out.*descendant cleanup is not guaranteed/);
  });
});

test("inventory timeout exceeds the gate timeout and rejects invalid values before replay", () => {
  const child = require("node:child_process");
  const originalSpawn = child.spawnSync;
  const previous = process.env.PHASE_GATE_TEST_TIMEOUT_MS;
  const observed = [];
  child.spawnSync = (_program, _args, options) => { observed.push(options.timeout); return { status: 0 }; };
  delete require.cache[checker];
  const { verifyInventory } = require(checker);
  child.spawnSync = originalSpawn;
  delete require.cache[checker];
  try {
    fixture(({ root, manifest, att }) => {
      att("1");
      fs.writeFileSync(manifest, '["1"]');
      delete process.env.PHASE_GATE_TEST_TIMEOUT_MS;
      verifyInventory(manifest, { root });
      process.env.PHASE_GATE_TEST_TIMEOUT_MS = "2500";
      verifyInventory(manifest, { root });
      assert.deepEqual(observed, [9_120_000, 122_500]);
      for (const invalid of ["", "0", "-1", "1.5", "86400001", "NaN"]) {
        process.env.PHASE_GATE_TEST_TIMEOUT_MS = invalid;
        assert.throws(() => verifyInventory(manifest, { root }), /PHASE_GATE_TEST_TIMEOUT_MS must be an integer/);
      }
      assert.equal(observed.length, 2, "invalid configuration must not spawn a replay");
    });
  } finally {
    if (previous === undefined) delete process.env.PHASE_GATE_TEST_TIMEOUT_MS;
    else process.env.PHASE_GATE_TEST_TIMEOUT_MS = previous;
  }
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

test("real gate verifies a complete multi-phase inventory and rejects missing or corrupt entries", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-real-"));
  const gate = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  // Do not let inherited Git routing/config redirect fixture operations elsewhere.
  for (const name of Object.keys(env)) if (/^GIT_/i.test(name)) delete env[name];
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  delete env.NODE_TEST_CONTEXT; // Permit the fixture's independent Node test runner.
  const run = (program, args) => spawnSync(program, args, { cwd: root, env, encoding: "utf8" });
  const ok = (result, label) => assert.equal(result.status, 0, `${label}: ${result.error || ""}\n${result.stdout}\n${result.stderr}`);
  try {
    ok(run("git", ["init", "-q"]), "git init");
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.mkdirSync(path.join(root, "scripts"));
    fs.mkdirSync(path.join(root, ".claude", "workflows"), { recursive: true });
    fs.copyFileSync(checker, path.join(root, "scripts", "verify-attestation-inventory.js"));
    fs.copyFileSync(path.resolve(__dirname, "../scripts/context-contract.js"), path.join(root, "scripts", "context-contract.js"));
    fs.copyFileSync(gate, path.join(root, ".claude", "workflows", "phase-gate.js"));
    fs.copyFileSync(path.resolve(__dirname, "../.claude/workflows/test-summary.js"), path.join(root, ".claude", "workflows", "test-summary.js"));
    fs.copyFileSync(path.resolve(__dirname, "../scripts/phase-definition.js"), path.join(root, "scripts", "phase-definition.js"));
    fs.writeFileSync(path.join(root, "docs", "PHASES.md"), "### Phase 1: One\n### Phase 2: Two\n");
    const manifest = path.join(root, "manifest.json");
    fs.writeFileSync(manifest, '["1","2"]');
    const report = ".phase-evidence/report.txt";
    fs.writeFileSync(path.join(root, report), "fixture report\n");
    fs.writeFileSync(path.join(root, "fixture.test.js"), 'const { test } = require("node:test");\nconst assert = require("node:assert/strict");\ntest("deterministic fixture", () => assert.equal(2 + 2, 4));\n');
    const gateRun = (...args) => run(process.execPath, [gate, ...args]);
    for (const id of ["1", "2"]) {
      ok(gateRun("record", id, "coding", "--status", "PASS", "--report", report), `coding ${id}`);
      const command = [process.execPath, "--test", "fixture.test.js"];
      ok(gateRun("run", id, "test", "--require-bound-tree", "--require-test-summary", "--", ...command), `test ${id}`);
      for (const step of ["verify", "review", "compound"]) {
        ok(gateRun("record", id, step, "--status", "PASS", "--report", report), `${step} ${id}`);
      }
      ok(gateRun("check", id, "--require-bound-tree"), `check ${id}`);
      ok(gateRun("attest", id), `attest ${id}`);
    }
    const inventory = () => run(process.execPath, [path.join(root, "scripts", "verify-attestation-inventory.js"), manifest]);
    const valid = inventory();
    ok(valid, "inventory");
    assert.match(valid.stdout, /deterministic fixture[\s\S]*Phase 1 attestation verified[\s\S]*deterministic fixture[\s\S]*Phase 2 attestation verified[\s\S]*Verified 2 required attestation/);

    const second = path.join(root, "docs", "attestations", "phase-2.json");
    const original = fs.readFileSync(second);
    fs.unlinkSync(second);
    const missing = inventory();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /missing or unreadable attestation for phase 2/i);
    assert.doesNotMatch(missing.stdout, /deterministic fixture|Verified 2 required/);
    fs.writeFileSync(second, original);
    fs.writeFileSync(second, "{invalid");
    const corrupt = inventory();
    assert.notEqual(corrupt.status, 0);
    assert.match(corrupt.stdout, /Phase 1 attestation verified/);
    assert.match(corrupt.stderr, /attestation for phase 2: invalid JSON[\s\S]*phase 2 verification failed/i);
    assert.doesNotMatch(corrupt.stdout, /Phase 2 attestation verified|Verified 2 required/);

    fs.writeFileSync(second, original);
    fs.appendFileSync(path.join(root, "fixture.test.js"), "\n// changed after attestation\n");
    const changed = inventory();
    assert.notEqual(changed.status, 0);
    assert.match(changed.stderr, /attestation for phase 1: code changed after the attestation[\s\S]*phase 1 verification failed/i);
    assert.doesNotMatch(changed.stdout, /deterministic fixture|attestation verified|Verified 2 required/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("CLI preflight reports fixture presence without running the gate", () => {
  fixture(({ root, manifest, att }) => {
    att("1");
    fs.writeFileSync(manifest, '["1"]');
    fs.mkdirSync(path.join(root, "scripts"));
    const localChecker = path.join(root, "scripts", "verify-attestation-inventory.js");
    fs.copyFileSync(checker, localChecker);
    fs.copyFileSync(path.join(path.dirname(checker), "phase-definition.js"), path.join(root, "scripts", "phase-definition.js"));
    const r = spawnSync(process.execPath, [localChecker, "--preflight", manifest], { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /present \(unverified\)/);
    assert.match(r.stdout, /not verified and no commands were run/);
    assert.doesNotMatch(r.stdout, /Verified \d+ required/);
  });
});

test("CLI preflight rejects malformed argument lists", () => {
  fixture(({ root }) => {
    for (const args of [["--preflight"], ["--preflight", "a", "b"], ["--preflight", "--help"], ["a", "--preflight"]]) {
      const r = spawnSync(process.execPath, [checker, ...args], { cwd: root, encoding: "utf8" });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Usage:/);
      assert.doesNotMatch(r.stdout, /Verifying/);
    }
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
