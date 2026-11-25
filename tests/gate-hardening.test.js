"use strict";
// Regression tests for the findings of the three-model review (Opus, Codex, Grok): what an attestation binds,
// when replay may run, and which inputs the tree hash and the scanners must not silently ignore.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GATE = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");
const REPO = path.resolve(__dirname, "..");
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

// A throw-away repository with a complete, attested Phase 1. `pin` writes the committed command pin.
function withAttestation({ pin = false, appMode = null }, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gate-hardening-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const gate = (...args) => spawnSync(process.execPath, [GATE, ...args], { cwd: root, env, encoding: "utf8" });
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const passes = (result) => assert.equal(result.status, 0, result.stdout + result.stderr);
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Hardening fixture\n");
    fs.writeFileSync(path.join(root, "app.js"), "module.exports = 1;\n");
    if (appMode !== null) fs.chmodSync(path.join(root, "app.js"), appMode);
    fs.writeFileSync(path.join(root, "ok.test.js"), "const {test}=require('node:test');\ntest('passes',()=>{});\n");
    const argv = [process.execPath, "--test", "--test-reporter=tap", "ok.test.js"];
    if (pin) {
      fs.mkdirSync(path.join(root, ".claude"));
      fs.writeFileSync(path.join(root, ".claude/required-test-command.json"), JSON.stringify(argv));
    }
    passes(git("init", "-q"));
    passes(git("add", "-A"));
    const report = ".phase-evidence/report.md";
    fs.writeFileSync(path.join(root, report), "Independent verification report.\n");
    const record = (step) => gate("record", "1", step, "--status", "PASS", "--report", report);
    passes(record("coding"));
    passes(gate("run", "1", "test", "--", ...argv));
    for (const step of ["verify", "review", "compound"]) passes(record(step));
    passes(gate("check", "1"));
    passes(gate("attest", "1"));
    fn({ root, gate, git, passes, record, report, argv });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
const attFile = (root) => path.join(root, "docs/attestations/phase-1.json");

test("replay with --require-pinned-command refuses an attestation when no command pin is committed", () => {
  withAttestation({ pin: false }, ({ gate }) => {
    const plain = gate("verify-attestation", "1");
    assert.equal(plain.status, 0, "without the flag a missing pin keeps the legacy behaviour: " + plain.stdout + plain.stderr);
    const strictCi = gate("verify-attestation", "1", "--require-pinned-command");
    assert.equal(strictCi.status, 2);
    assert.match(strictCi.stderr, /no pinned test command/);
  });
});

test("replay with --require-pinned-command passes when the pin matches, and rejects a different attested argv", () => {
  withAttestation({ pin: true }, ({ root, gate }) => {
    const ok = gate("verify-attestation", "1", "--require-pinned-command");
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const att = JSON.parse(fs.readFileSync(attFile(root), "utf8"));
    att.argv = [process.execPath, "-e", "process.exit(0)"];
    fs.writeFileSync(attFile(root), JSON.stringify(att));
    const forged = gate("verify-attestation", "1", "--require-pinned-command");
    assert.equal(forged.status, 2);
    assert.match(forged.stderr, /differs from the required one/);
  });
});

test("the attestation commits to the evidence chain and the local chain must match it", () => {
  withAttestation({ pin: true }, ({ root, gate, record, report }) => {
    const att = JSON.parse(fs.readFileSync(attFile(root), "utf8"));
    assert.match(att.evidence_chain_sha256, /^[0-9a-f]{64}$/);
    const finalRecord = fs.readFileSync(path.join(root, ".phase-evidence/phase-1-compound.json"));
    assert.equal(att.evidence_chain_sha256, sha256(finalRecord), "the digest is that of the final (compound) record");
    assert.equal(gate("verify-attestation", "1").status, 0);
    // A different chain for the same tree (a re-recorded step) is not the attested one.
    const again = record("compound");
    assert.equal(again.status, 0, again.stdout + again.stderr);
    const result = gate("verify-attestation", "1");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /local evidence chain differs from the attested one/);
  });
});

test("strict evidence needs evidence_chain_sha256; a malformed one is rejected everywhere", () => {
  withAttestation({ pin: true }, ({ root, gate }) => {
    const original = fs.readFileSync(attFile(root), "utf8");
    const att = JSON.parse(original);
    att.require_test_summary = true;
    att.require_read_proof = true;
    delete att.evidence_chain_sha256;
    fs.writeFileSync(attFile(root), JSON.stringify(att));
    const missing = gate("verify-attestation", "1", "--require-strict-evidence");
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /evidence_chain_sha256/);
    att.evidence_chain_sha256 = "not-a-digest";
    fs.writeFileSync(attFile(root), JSON.stringify(att));
    const malformed = gate("verify-attestation", "1");
    assert.equal(malformed.status, 2);
    assert.match(malformed.stderr, /malformed/);
  });
});

test("a submodule (gitlink) entry makes the tree hash fail instead of silently omitting its revision", () => {
  withAttestation({ pin: true }, ({ root, gate, git }) => {
    const add = git("update-index", "--add", "--cacheinfo", "160000,1111111111111111111111111111111111111111,vendored");
    assert.equal(add.status, 0, add.stderr);
    const result = gate("verify-attestation", "1");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /submodule \(gitlink\)/);
  });
});

test("execute permission is one bit: 0700 and 0755 hash alike, losing the bit changes the hash", { skip: process.platform === "win32" ? "POSIX execute bits are not available on Windows" : false }, () => {
  withAttestation({ pin: true, appMode: 0o700 }, ({ root, gate }) => {
    fs.chmodSync(path.join(root, "app.js"), 0o755);
    assert.equal(gate("verify-attestation", "1").status, 0, "0700 -> 0755 is the same Git mode (100755)");
    fs.chmodSync(path.join(root, "app.js"), 0o644);
    const result = gate("verify-attestation", "1");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /code changed after the attestation/);
  });
});

test("a path that is not valid UTF-8 fails the tree hash instead of dropping out of it", (t) => {
  withAttestation({ pin: true }, ({ root, gate }) => {
    const odd = Buffer.concat([Buffer.from(root + path.sep), Buffer.from([0x66, 0xff, 0x6f])]);
    try { fs.writeFileSync(odd, "x"); } catch { t.skip("this file system rejects non-UTF-8 names"); return; }
    const result = gate("verify-attestation", "1");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /not valid UTF-8/);
  });
});

test("tree-exclude-check freezes the exact reviewed patterns, not just their number", () => {
  const { extractLiterals, check, FROZEN } = require("../scripts/tree-exclude-check.js");
  const real = fs.readFileSync(path.join(REPO, ".claude/workflows/phase-gate.js"), "utf8");
  assert.equal(check(extractLiterals(real)), null);
  const replace = (from, to) => real.replace(from, to);
  // Same count, one entry widened until it excludes everything: the old count-only check passed this.
  const widened = replace("/^docs\\/attestations\\//", "/./");
  assert.notEqual(widened, real);
  assert.match(check(extractLiterals(widened)), /differs from the reviewed set/);
  // Narrower or reordered or extended sets are also changes that need review.
  assert.match(check(extractLiterals(replace(/const TREE_EXCLUDE = \[/, "const TREE_EXCLUDE = [\n  /^extra\\//,"))), /differs/);
  assert.match(check(FROZEN.slice(1)), /differs/);
  assert.match(check([...FROZEN].reverse()), /differs/);
  assert.throws(() => extractLiterals("const nothing = [];"), /not found/);
  const cli = spawnSync(process.execPath, [path.join(REPO, "scripts/tree-exclude-check.js")], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
});

test("secret-scan rejects a DRM-encrypted file by its header, whatever the extension", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "secret-scan-drm-"));
  try {
    const scan = () => spawnSync(process.execPath, [path.join(REPO, "scripts/secret-scan.js"), root], { encoding: "utf8" });
    fs.writeFileSync(path.join(root, "plain.pptx"), Buffer.from("PK an ordinary zip header", "latin1"));
    assert.equal(scan().status, 0, "an ordinary binary is clean");
    const marker = ["<##", "NAS" + "CA", "DR" + "M", "FILE", "-", "VER1.00", "##>"].join(" ");
    for (const rel of ["deck.pptx", "report.pdf", "noext"]) {
      const file = path.join(root, rel);
      fs.writeFileSync(file, Buffer.concat([Buffer.from(marker, "latin1"), Buffer.from([1, 0x99, 0x67, 0x84])]));
      const result = scan();
      assert.equal(result.status, 1, rel + " must be flagged: " + result.stdout + result.stderr);
      assert.match(result.stderr, /DRM-encrypted/);
      assert.match(result.stderr, new RegExp(rel.replace(".", "\.")));
      fs.rmSync(file);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("secret-scan reads the files where credentials usually live", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "secret-scan-"));
  try {
    const scan = () => spawnSync(process.execPath, [path.join(REPO, "scripts/secret-scan.js"), root], { encoding: "utf8" });
    assert.equal(scan().status, 0, "an empty tree is clean");
    // Assembled at run time so this file does not contain a literal credential shape for secret-scan to flag.
    const quoted = (name, sep, value) => name + sep + '"' + value + '"';
    const value = ["abcdefgh", "12345678"].join("");
    const header = "-----BEGIN " + "PRIVATE KEY-----";
    const cases = [
      ["key.pem", header + "\nabc\n"],
      [".env", quoted("API_" + "TOKEN", "=", value) + "\n"],
      ["conf/settings.toml", quoted("pass" + "word", " = ", value) + "\n"],
      ["id_rsa", header + "\n"],
    ];
    for (const [rel, text] of cases) {
      const file = path.join(root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
      const result = scan();
      assert.equal(result.status, 1, rel + " must be flagged: " + result.stdout + result.stderr);
      assert.match(result.stderr, new RegExp(path.basename(rel).replace(".", "\\.")));
      fs.rmSync(file);
    }
    // The documented skip is by repo-relative path, so it works for the nested attestation directory.
    fs.mkdirSync(path.join(root, "docs/attestations"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs/attestations/phase-1.json"), quoted("to" + "ken", ": ", value));
    assert.equal(scan().status, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("doctor reports a settings.local.json that disables every hook", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-home-"));
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-root-"));
  try {
    for (const rel of [".claude/settings.json", ".claude/hooks/evidence-guard.sh", ".claude/hooks/block-destructive.sh",
      ".claude/hooks/read-tracker.sh", "docs/PHASES.md"]) {
      const dst = path.join(copy, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(path.join(REPO, rel), dst);
      if (rel.endsWith(".sh")) fs.chmodSync(dst, 0o755);
    }
    const run = () => spawnSync(process.execPath, [GATE, "doctor", "--host", "claude"], {
      cwd: copy, env: { ...process.env, PHASE_GATE_ROOT: copy, HOME: home, USERPROFILE: home }, encoding: "utf8",
    });
    fs.writeFileSync(path.join(copy, ".claude/settings.local.json"), JSON.stringify({ disableAllHooks: true }));
    const bad = run();
    assert.match(bad.stdout + bad.stderr, /settings\.local\.json sets disableAllHooks/);
    assert.notEqual(bad.status, 0);
    fs.writeFileSync(path.join(copy, ".claude/settings.local.json"), JSON.stringify({ permissions: {} }));
    assert.match(run().stdout, /settings\.local\.json does not disable hooks/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(copy, { recursive: true, force: true });
  }
});

test("unlock removes a stale lock, and refuses a live owner, another host and a lock without owner", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gate-unlock-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const gate = (...args) => spawnSync(process.execPath, [GATE, ...args], { cwd: root, env, encoding: "utf8" });
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Lock fixture\n");
    const lock = path.join(root, ".phase-evidence/phase-1.lock");
    const own = (owner) => { fs.mkdirSync(lock, { recursive: true }); if (owner) fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify(owner)); };
    assert.match(gate("unlock", "1").stdout, /not locked/);
    // A live owner (this very test process) is never evicted.
    own({ pid: process.pid, host: os.hostname() });
    let result = gate("unlock", "1");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /still running/);
    assert.ok(fs.existsSync(lock));
    // Another host: not provable from here.
    fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: 1, host: "some-other-host.invalid" }));
    result = gate("unlock", "1");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /belongs to host/);
    // No owner file: refuse, a person has to look.
    fs.rmSync(path.join(lock, "owner.json"));
    result = gate("unlock", "1");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /no readable owner/);
    // A process that has exited: the lock is stale and removable, then the gate works again.
    const dead = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" });
    fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: Number(dead.stdout), host: os.hostname() }));
    result = gate("unlock", "1");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Removed the stale lock/);
    assert.equal(fs.existsSync(lock), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
