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
function withAttestation({ pin = false, appMode = null, sign = false }, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gate-hardening-"));
  const keyDir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-hardening-key-"));
  const keyPath = path.join(keyDir, "attest.pem");
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  delete env.ATTEST_KEY_BASE_SHA; // a CI job exports it for the replay; fixtures must not see it
  const gate = (...args) => spawnSync(process.execPath, [GATE, ...args], { cwd: root, env, encoding: "utf8" });
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const passes = (result) => assert.equal(result.status, 0, result.stdout + result.stderr);
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Hardening fixture\n");
    fs.writeFileSync(path.join(root, "app.js"), "module.exports = 1;\n");
    if (appMode !== null) fs.chmodSync(path.join(root, "app.js"), appMode);
    // The replayed command must not inherit the CI job's ATTEST_KEY_BASE_SHA (the gate removes it after reading it).
    fs.writeFileSync(path.join(root, "ok.test.js"), "const {test}=require('node:test');\nconst assert=require('node:assert/strict');\ntest('passes',()=>{ assert.equal(process.env.ATTEST_KEY_BASE_SHA, undefined); });\n");
    const argv = [process.execPath, "--test", "--test-reporter=tap", "ok.test.js"];
    if (pin) {
      fs.mkdirSync(path.join(root, ".claude"));
      fs.writeFileSync(path.join(root, ".claude/required-test-command.json"), JSON.stringify(argv));
    }
    // The public key is a tracked file of the tree that gets attested, so it is created before the test step.
    if (sign) passes(gate("attest-keygen", keyPath));
    passes(git("init", "-q"));
    passes(git("add", "-A"));
    const report = ".phase-evidence/report.md";
    fs.writeFileSync(path.join(root, report), "Independent verification report.\n");
    const record = (step) => gate("record", "1", step, "--status", "PASS", "--report", report);
    passes(record("coding"));
    passes(gate("run", "1", "test", "--", ...argv));
    for (const step of ["verify", "review", "compound"]) passes(record(step));
    passes(gate("check", "1"));
    passes(gate("attest", "1", ...(sign ? ["--sign", keyPath] : [])));
    fn({ root, gate, git, passes, record, report, argv, keyPath });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(keyDir, { recursive: true, force: true });
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
  delete env.ATTEST_KEY_BASE_SHA; // a CI job exports it for the replay; fixtures must not see it
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

const pubFile = (root) => path.join(root, ".claude/attestation-public-key.pem");
const emptyTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

test("attest-keygen writes a key pair, refuses to overwrite either key, and the key never lands in the repository", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gate-keygen-"));
  const keyDir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-keygen-key-"));
  const env = { ...process.env, PHASE_GATE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  delete env.ATTEST_KEY_BASE_SHA; // a CI job exports it for the replay; fixtures must not see it
  const gate = (...args) => spawnSync(process.execPath, [GATE, ...args], { cwd: root, env, encoding: "utf8" });
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase 1: Keygen fixture\n");
    const key = path.join(keyDir, "k.pem");
    const made = gate("attest-keygen", key);
    assert.equal(made.status, 0, made.stdout + made.stderr);
    assert.match(made.stdout, /key_id [0-9a-f]{64}/);
    assert.match(fs.readFileSync(key, "utf8"), /BEGIN PRIVATE KEY/);
    assert.match(fs.readFileSync(pubFile(root), "utf8"), /BEGIN PUBLIC KEY/);
    assert.ok(!fs.readFileSync(pubFile(root), "utf8").includes("PRIVATE"));
    assert.equal(fs.existsSync(path.join(root, "k.pem")), false, "the private key is written where the caller said, not into the repo");
    const again = gate("attest-keygen", path.join(keyDir, "other.pem"));
    assert.equal(again.status, 2);
    assert.match(again.stderr, /rotating the trusted key is a reviewed change/);
    fs.rmSync(pubFile(root));
    const overwrite = gate("attest-keygen", key);
    assert.equal(overwrite.status, 2);
    assert.match(overwrite.stderr, /refusing to overwrite a signing key/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(keyDir, { recursive: true, force: true });
  }
});

test("a signed attestation verifies with --require-signature, and every kind of tampering is refused", () => {
  withAttestation({ pin: true, sign: true }, ({ root, gate }) => {
    const att = JSON.parse(fs.readFileSync(attFile(root), "utf8"));
    assert.equal(att.signature.alg, "ed25519");
    assert.match(att.signature.key_id, /^[0-9a-f]{64}$/);
    const ok = gate("verify-attestation", "1", "--require-pinned-command", "--require-signature");
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const write = (mutate) => { const copy = structuredClone(att); mutate(copy); fs.writeFileSync(attFile(root), JSON.stringify(copy)); };
    const refused = (pattern, extra = []) => {
      const result = gate("verify-attestation", "1", "--require-signature", ...extra);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, pattern);
    };
    // Any change to a signed field fails at the signature, before anything is executed.
    write((a) => { a.tree = "0".repeat(64); });
    refused(/signature does not match/);
    write((a) => { a.argv = [process.execPath, "-e", "0"]; });
    refused(/signature does not match/);
    write((a) => { a.evidence_chain_sha256 = "1".repeat(64); });
    refused(/signature does not match/);
    write((a) => { a.require_read_proof = true; });
    refused(/signature does not match/);
    // A missing or malformed signature, a different key id, a different algorithm.
    write((a) => { delete a.signature; });
    refused(/no valid signature object/);
    write((a) => { a.signature.value = Buffer.from("not a signature").toString("base64"); });
    refused(/signature does not match/);
    write((a) => { a.signature.key_id = "2".repeat(64); });
    refused(/different key than the trusted public key/);
    write((a) => { a.signature.alg = "rsa"; });
    refused(/no valid signature object/);
    // Without the flag a present-but-wrong signature is still refused; an absent one is allowed (legacy).
    write((a) => { a.tree = "0".repeat(64); });
    const noFlag = gate("verify-attestation", "1");
    assert.equal(noFlag.status, 2);
    assert.match(noFlag.stderr, /signature does not match/);
    write((a) => { delete a.signature; });
    assert.equal(gate("verify-attestation", "1").status, 0, "an unsigned attestation still verifies without the flag");
  });
});

test("an unsigned attestation fails --require-signature", () => {
  withAttestation({ pin: true, sign: true }, ({ root, gate, keyPath }) => {
    // Re-attest without --sign: the file has no signature although the key exists.
    const unsigned = gate("attest", "1");
    assert.equal(unsigned.status, 0, unsigned.stdout + unsigned.stderr);
    assert.equal(JSON.parse(fs.readFileSync(attFile(root), "utf8")).signature, undefined);
    const result = gate("verify-attestation", "1", "--require-signature");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /no valid signature object/);
    assert.ok(fs.existsSync(keyPath));
  });
});

test("CI takes the public key from the base commit, so a change cannot swap the key it is verified against", () => {
  withAttestation({ pin: true, sign: true }, ({ root, gate, git }) => {
    const commit = git("-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "-m", "base");
    assert.equal(commit.status, 0, commit.stderr);
    const base = git("rev-parse", "HEAD").stdout.trim();
    const withBase = (sha, ...args) => {
      const env = { ...process.env, PHASE_GATE_ROOT: root, ATTEST_KEY_BASE_SHA: sha };
      delete env.NODE_TEST_CONTEXT;
      return spawnSync(process.execPath, [GATE, "verify-attestation", "1", "--require-signature", ...args], { cwd: root, env, encoding: "utf8" });
    };
    // Swap the working-tree key for another one (what an attacker's change would do).
    const originalKey = fs.readFileSync(pubFile(root));
    const other = require("node:crypto").generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
    fs.writeFileSync(pubFile(root), other);
    const swapped = gate("verify-attestation", "1", "--require-signature");
    assert.equal(swapped.status, 2);
    assert.match(swapped.stderr, /different key than the trusted public key/, "without a base the working-tree key is trusted");
    // The replayed test asserts that ATTEST_KEY_BASE_SHA is not in its environment, so a pass proves the gate strips it.
    fs.writeFileSync(pubFile(root), originalKey);
    const stripped = withBase(base);
    assert.equal(stripped.status, 0, stripped.stdout + stripped.stderr);
    fs.writeFileSync(pubFile(root), other);
    const fromBase = withBase(base);
    assert.equal(fromBase.status, 2);
    assert.doesNotMatch(fromBase.stderr, /signature|trusted public key/, "with the base key the signature itself is fine");
    assert.match(fromBase.stderr, /code changed after the attestation/, "it fails later, on the changed tree, not on the key");
    // A base that has no key yet: the introduction case, trusted once with a warning.
    fs.writeFileSync(pubFile(root), originalKey); // byte-for-byte, so the tree is the attested one again
    // The empty tree object has to exist in the repository before a commit can point at it.
    const tree = spawnSync("git", ["hash-object", "-t", "tree", "-w", "--stdin"], { cwd: root, encoding: "utf8", input: "" }).stdout.trim();
    assert.equal(tree, emptyTree);
    const emptyBase = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit-tree", tree, "-m", "empty"], { cwd: root, encoding: "utf8" }).stdout.trim();
    assert.match(emptyBase, /^[0-9a-f]{40}$/);
    const intro = withBase(emptyBase);
    assert.equal(intro.status, 0, intro.stdout + intro.stderr);
    assert.match(intro.stdout, /\[WARNING\] the base commit has no attestation public key/);
    // A base whose key file exists but is empty is not the introduction case: it fails closed.
    const emptyKeyBlob = spawnSync("git", ["hash-object", "-w", "--stdin"], { cwd: root, encoding: "utf8", input: "" }).stdout.trim();
    const claudeTree = spawnSync("git", ["mktree"], { cwd: root, encoding: "utf8", input: "100644 blob " + emptyKeyBlob + "\tattestation-public-key.pem\n" }).stdout.trim();
    const rootTree = spawnSync("git", ["mktree"], { cwd: root, encoding: "utf8", input: "040000 tree " + claudeTree + "\t.claude\n" }).stdout.trim();
    const emptyKeyBase = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit-tree", rootTree, "-m", "empty key"], { cwd: root, encoding: "utf8" }).stdout.trim();
    const emptyKey = withBase(emptyKeyBase);
    assert.equal(emptyKey.status, 2, emptyKey.stdout + emptyKey.stderr);
    assert.match(emptyKey.stderr, /public key file at the base commit is empty/);
    // A base that cannot be read, and a malformed value, fail closed.
    const missing = withBase("a".repeat(40));
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /not available/);
    const malformed = withBase("main");
    assert.equal(malformed.status, 2);
    assert.match(malformed.stderr, /40-character commit id/);
  });
});

test("secret-scan reads every text file and flags new token shapes, mailboxes and local sensitive terms", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "secret-scan-wide-"));
  const aside = fs.mkdtempSync(path.join(os.tmpdir(), "secret-scan-terms-"));
  try {
    const script = path.join(REPO, "scripts/secret-scan.js");
    const scan = (env = {}) => spawnSync(process.execPath, [script, root], { encoding: "utf8", env: { ...process.env, HARNESS_SENSITIVE_TERMS_FILE: path.join(aside, "none.txt"), ...env } });
    const put = (rel, data) => {
      const file = path.join(root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, data);
      return file;
    };
    // Shapes are assembled at run time so this file holds no literal credential or mailbox.
    const token = "gh" + "o_" + "a".repeat(36);
    for (const rel of ["page.html", "tool.cjs", "run.log", "notes", "config.example", "deep/dir/style.css"]) {
      const file = put(rel, "x " + token + "\n");
      const result = scan();
      assert.equal(result.status, 1, rel + " must be read: " + result.stdout + result.stderr);
      assert.match(result.stderr, /github token/);
      fs.rmSync(file);
    }
    const shapes = [
      "sk-" + "ant-" + "a".repeat(24), "sk-" + "proj-" + "b".repeat(24), "AS" + "IA" + "A".repeat(16),
      "-----BEGIN ENCRYPTED " + "PRIVATE KEY-----", "-----BEGIN PGP " + "PRIVATE KEY BLOCK-----",
      "-----BEGIN DSA " + "PRIVATE KEY-----", "hf" + "_" + "a".repeat(32), "sk" + "_live_" + "a".repeat(20),
    ];
    for (const shape of shapes) {
      const file = put("a.md", "value: " + shape + "\n");
      assert.equal(scan().status, 1, "shape must be flagged: " + shape.slice(0, 12));
      const redact = spawnSync(process.execPath, [path.join(REPO, "scripts/evidence-redact.js"), file], { encoding: "utf8" });
      assert.equal(redact.status, 1, "evidence-redact shares the list: " + shape.slice(0, 12));
      fs.rmSync(file);
    }
    // A binary file is not decoded as text.
    const blob = put("blob.bin", Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(token)]));
    assert.equal(scan().status, 0);
    fs.rmSync(blob);

    const at = "@";
    const mailbox = put("a.md", "contact someone" + at + "mail-provider.co.kr for access\n");
    const flagged = scan();
    assert.equal(flagged.status, 1);
    assert.match(flagged.stderr, /email address \(1\)/);
    fs.rmSync(mailbox);
    const harmless = ["t" + at + "example.invalid", "1+name" + at + "users.noreply.github.com", "noreply" + at + "anthropic.com",
      "https://user:pw" + at + "host.internal-corp.io/x", "pkg" + at + "1.2.3", "actions/checkout" + at + "v4", "a " + at + " b"];
    const safe = put("a.md", harmless.join("\n") + "\n");
    const safeResult = scan();
    assert.equal(safeResult.status, 0, safeResult.stderr);
    fs.rmSync(safe);

    // The private term list: a hit names the line of the list, never the term or a path that holds it.
    const terms = path.join(aside, "terms.txt");
    fs.writeFileSync(terms, "# people and customers\n\nSecretPerson\n");
    put("a.md", "written by secretperson\n");
    put("docs/SecretPerson-notes.md", "x\n");
    const local = scan({ HARNESS_SENSITIVE_TERMS_FILE: terms });
    assert.equal(local.status, 1);
    assert.match(local.stderr, /a\.md: local sensitive term #3/);
    assert.match(local.stderr, /docs\/<name withheld>: local sensitive term #3 in a path/);
    assert.doesNotMatch(local.stdout + local.stderr, /secretperson/i);
    assert.equal(scan().status, 0, "without the list the same tree is clean");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(aside, { recursive: true, force: true });
  }
});

test("secret-scan can be required without running or exiting", () => {
  const probe = spawnSync(process.execPath, ["-e", "const s=require(process.argv[1]);console.log(typeof s.scan, s.TOKEN_PATTERNS.length>10)", path.join(REPO, "scripts/secret-scan.js")], { encoding: "utf8" });
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout.trim(), "function true");
});
