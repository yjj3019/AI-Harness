"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const GATE = path.resolve(__dirname, "..", ".claude", "workflows", "phase-gate.js");
const NODE = process.execPath;

const PHASES_MD = [
  "# PHASES",
  "",
  "```markdown",
  "### Phase N: [Title]",
  "```",
  "",
  "### Phase 1: Demo",
  "- [ ] thing",
  "",
  "### Phase 2: Other",
  "- [ ] other",
  "",
].join("\n");

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phase-gate-"));
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "PHASES.md"), PHASES_MD);
  return root;
}

function gate(root, ...args) {
  return spawnSync(NODE, [GATE, ...args], {
    env: { ...process.env, PHASE_GATE_ROOT: root },
    encoding: "utf8",
  });
}

function report(root, name, text = "verdict text") {
  fs.mkdirSync(path.join(root, ".phase-evidence"), { recursive: true });
  const rel = `.phase-evidence/${name}`;
  fs.writeFileSync(path.join(root, rel), text);
  return rel;
}

function recordPass(root, phase, step) {
  const r = gate(root, "record", phase, step, "--status", "PASS", "--report", report(root, `${phase}-${step}.md`));
  assert.equal(r.status, 0, r.stderr);
}

function runTest(root, phase, code = 0) {
  return gate(root, "run", phase, "test", "--", NODE, "-e", `console.log("suite"); process.exit(${code})`);
}

function fullChain(root, phase = "1") {
  recordPass(root, phase, "coding");
  const t = runTest(root, phase, 0);
  assert.equal(t.status, 0, t.stderr);
  for (const step of ["verify", "review", "compound"]) recordPass(root, phase, step);
}

function withRoot(fn) {
  const root = makeRoot();
  try {
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("list ignores templates inside code fences", () =>
  withRoot((root) => {
    const r = gate(root, "list");
    assert.equal(r.status, 0);
    assert.deepEqual(r.stdout.trim().split("\n"), ["1", "2"]);
  }));

test("invalid and path-like phase ids are rejected", () =>
  withRoot((root) => {
    assert.equal(gate(root, "check", "N").status, 1);
    assert.equal(gate(root, "check", "../x").status, 1);
    assert.equal(gate(root, "check", "99").status, 1);
  }));

test("check fails when there is no evidence", () =>
  withRoot((root) => {
    assert.equal(gate(root, "check", "1").status, 2);
  }));

test("hand-written PASS files are rejected", () =>
  withRoot((root) => {
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    for (const step of ["coding", "test", "verify", "review", "compound"]) {
      fs.writeFileSync(path.join(root, ".phase-evidence", `phase-1-${step}.json`), '{"status":"PASS"}');
    }
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Hand-written evidence is rejected/);
  }));

test("a full recorded chain passes", () =>
  withRoot((root) => {
    fullChain(root);
    const r = gate(root, "check", "1");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /COMPLETED/);
  }));

test("a step cannot be recorded before the previous step passes", () =>
  withRoot((root) => {
    recordPass(root, "1", "coding");
    const r = gate(root, "record", "1", "verify", "--status", "PASS", "--report", report(root, "v.md"));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /'test' has no valid evidence/);
  }));

test("run records the real exit code and a failing test blocks later steps", () =>
  withRoot((root) => {
    recordPass(root, "1", "coding");
    const t = runTest(root, "1", 3);
    assert.equal(t.status, 2);
    const ev = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(ev.status, "FAIL");
    assert.equal(ev.exit_code, 3);
    const v = gate(root, "record", "1", "verify", "--status", "PASS", "--report", report(root, "v.md"));
    assert.equal(v.status, 2);
    assert.match(v.stderr, /not PASS/);
  }));

test("run records a failure when the command cannot start", () =>
  withRoot((root) => {
    recordPass(root, "1", "coding");
    const t = gate(root, "run", "1", "test", "--", "definitely-not-a-real-command-xyz");
    assert.equal(t.status, 2);
    const ev = JSON.parse(fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.json"), "utf8"));
    assert.equal(ev.status, "FAIL");
    assert.equal(ev.exit_code, -1);
  }));

test("editing a report after it was recorded fails the check", () =>
  withRoot((root) => {
    fullChain(root);
    fs.writeFileSync(path.join(root, ".phase-evidence", "1-verify.md"), "edited after the fact");
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /artifact changed after it was recorded/);
  }));

test("editing an evidence file breaks the hash chain", () =>
  withRoot((root) => {
    fullChain(root);
    const f = path.join(root, ".phase-evidence", "phase-1-coding.json");
    fs.writeFileSync(f, fs.readFileSync(f, "utf8") + "\n");
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /chain broken/);
  }));

test("recording a step clears the steps after it", () =>
  withRoot((root) => {
    fullChain(root);
    recordPass(root, "1", "coding");
    for (const step of ["test", "verify", "review", "compound"]) {
      assert.equal(fs.existsSync(path.join(root, ".phase-evidence", `phase-1-${step}.json`)), false, step);
    }
    assert.equal(gate(root, "check", "1").status, 2);
  }));

test("reports outside .phase-evidence/ are rejected", () =>
  withRoot((root) => {
    fs.mkdirSync(path.join(root, ".phase-evidence"));
    for (const p of ["docs/PHASES.md", "../outside.md", "/etc/hostname"]) {
      const r = gate(root, "record", "1", "coding", "--status", "PASS", "--report", p);
      assert.equal(r.status, 1, p);
    }
  }));

test("PASS needs a non-empty report", () =>
  withRoot((root) => {
    assert.equal(gate(root, "record", "1", "coding", "--status", "PASS").status, 1);
    const empty = report(root, "empty.md", "");
    assert.equal(gate(root, "record", "1", "coding", "--status", "PASS", "--report", empty).status, 1);
  }));

test("a FAIL record is allowed without a report and fails the check", () =>
  withRoot((root) => {
    assert.equal(gate(root, "record", "1", "coding", "--status", "FAIL").status, 0);
    assert.equal(gate(root, "check", "1").status, 2);
  }));

test("test is not accepted by record", () =>
  withRoot((root) => {
    assert.equal(gate(root, "record", "1", "test", "--status", "PASS", "--report", report(root, "t.md")).status, 1);
  }));

// ---- code tree binding, attestation (needs git) ----

function git(root, ...args) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
}

function withGitRoot(fn) {
  withRoot((root) => {
    git(root, "init", "-q");
    fs.writeFileSync(path.join(root, ".gitignore"), ".phase-evidence/\n");
    fs.writeFileSync(path.join(root, "app.txt"), "v1\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "init");
    fn(root);
  });
}

test("check fails when code changes after the test ran", () =>
  withGitRoot((root) => {
    fullChain(root);
    assert.equal(gate(root, "check", "1").status, 0);
    fs.writeFileSync(path.join(root, "app.txt"), "v2\n");
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /code changed after the test ran/);
  }));

test("a new untracked source file also changes the tree", () =>
  withGitRoot((root) => {
    fullChain(root);
    fs.writeFileSync(path.join(root, "extra.js"), "x\n");
    assert.equal(gate(root, "check", "1").status, 2);
  }));

test("compound-log and HANDOFF edits after the test do not invalidate evidence", () =>
  withGitRoot((root) => {
    fullChain(root);
    fs.writeFileSync(path.join(root, "docs", "compound-log.md"), "lesson\n");
    fs.writeFileSync(path.join(root, "docs", "HANDOFF.md"), "state\n");
    assert.equal(gate(root, "check", "1").status, 0);
  }));

test("test evidence without a tree hash is rejected when git is available", () =>
  withGitRoot((root) => {
    recordPass(root, "1", "coding");
    assert.equal(runTest(root, "1", 0).status, 0);
    // Strip the hash, then record the rest so the chain stays consistent: only the tree rule can fail.
    const f = path.join(root, ".phase-evidence", "phase-1-test.json");
    const ev = JSON.parse(fs.readFileSync(f, "utf8"));
    ev.tree = null;
    fs.writeFileSync(f, JSON.stringify(ev, null, 2) + "\n");
    for (const step of ["verify", "review", "compound"]) recordPass(root, "1", step);
    const r = gate(root, "check", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no code tree hash/);
  }));

test("without git the tree is unbound and check warns", () =>
  withRoot((root) => {
    fullChain(root);
    const r = gate(root, "check", "1");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\[WARN\]/);
  }));

test("attest requires a complete chain and git", () => {
  withGitRoot((root) => {
    recordPass(root, "1", "coding");
    assert.equal(gate(root, "attest", "1").status, 2);
  });
  withRoot((root) => {
    fullChain(root);
    const r = gate(root, "attest", "1");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /without git/);
  });
});

test("attestation: verifies, then fails on code change, failing command, wrong command, or missing file", () =>
  withGitRoot((root) => {
    assert.equal(gate(root, "verify-attestation", "1").status, 2); // missing
    fullChain(root);
    assert.equal(gate(root, "attest", "1").status, 0);
    const attFile = path.join(root, "docs", "attestations", "phase-1.json");
    assert.ok(fs.existsSync(attFile));

    assert.equal(gate(root, "verify-attestation", "1").status, 0);

    // required command differs from the attested one
    const wrong = gate(root, "verify-attestation", "1", "--", "npm", "test");
    assert.equal(wrong.status, 2);
    assert.match(wrong.stderr, /differs from the required one/);

    // the attested command itself fails when CI re-runs it
    const att = JSON.parse(fs.readFileSync(attFile, "utf8"));
    const good = fs.readFileSync(attFile, "utf8");
    att.argv = [NODE, "-e", "process.exit(3)"];
    fs.writeFileSync(attFile, JSON.stringify(att));
    const failing = gate(root, "verify-attestation", "1");
    assert.equal(failing.status, 2);
    assert.match(failing.stderr, /exited with 3/);
    fs.writeFileSync(attFile, good);

    // code changes after attestation
    fs.writeFileSync(path.join(root, "app.txt"), "v2\n");
    const drift = gate(root, "verify-attestation", "1");
    assert.equal(drift.status, 2);
    assert.match(drift.stderr, /code changed after the attestation/);
  }));

// ---- Default-FAIL: verify PASS needs proof the test artifacts were opened ----

const crypto = require("crypto");

function arm(root) {
  fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".claude", "settings.json"),
    JSON.stringify({ hooks: { PostToolUse: [{ matcher: "Read", hooks: [{ type: "command", command: "x/read-tracker.sh" }] }] } })
  );
}

function logRead(root, rel, sha) {
  const real = sha || crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex");
  fs.appendFileSync(path.join(root, ".phase-evidence", ".reads.jsonl"), JSON.stringify({ path: rel, sha256: real, agent_type: "verify" }) + "\n");
}

function verifyPass(root) {
  return gate(root, "record", "1", "verify", "--status", "PASS", "--report", report(root, "1-verify.md"));
}

test("verify PASS is refused without a read record when tracking is armed", () =>
  withRoot((root) => {
    arm(root);
    recordPass(root, "1", "coding");
    assert.equal(runTest(root, "1", 0).status, 0);
    const r = verifyPass(root);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /opened the test artifacts/);
  }));

test("verify PASS is accepted after the test log was read; a stale hash or other file does not count", () =>
  withRoot((root) => {
    arm(root);
    recordPass(root, "1", "coding");
    assert.equal(runTest(root, "1", 0).status, 0);
    logRead(root, ".phase-evidence/phase-1-test.log", "0".repeat(64));
    logRead(root, ".phase-evidence/1-coding.md");
    assert.equal(verifyPass(root).status, 2);
    logRead(root, ".phase-evidence/phase-1-test.log");
    assert.equal(verifyPass(root).status, 0);
  }));

test("a verify FAIL record needs no read proof, and unarmed projects are not blocked", () => {
  withRoot((root) => {
    arm(root);
    recordPass(root, "1", "coding");
    assert.equal(runTest(root, "1", 0).status, 0);
    assert.equal(gate(root, "record", "1", "verify", "--status", "FAIL").status, 0);
  });
  withRoot((root) => {
    recordPass(root, "1", "coding");
    assert.equal(runTest(root, "1", 0).status, 0);
    assert.equal(verifyPass(root).status, 0);
  });
});

test("a committed required-test-command pin rejects any other attested command", () =>
  withGitRoot((root) => {
    const pin = path.join(root, ".claude", "required-test-command.json");
    fs.mkdirSync(path.dirname(pin), { recursive: true });
    // The pin is committed with the code, so it exists before the phase runs.
    fs.writeFileSync(pin, JSON.stringify([NODE, "-e", 'console.log("suite"); process.exit(0)']));
    fullChain(root);
    assert.equal(gate(root, "attest", "1").status, 0);
    assert.equal(gate(root, "verify-attestation", "1").status, 0);

    fs.writeFileSync(pin, JSON.stringify(["npm", "test"]));
    const wrong = gate(root, "verify-attestation", "1");
    assert.equal(wrong.status, 2);
    assert.match(wrong.stderr, /differs from the required one/);

    fs.writeFileSync(pin, "not json");
    const broken = gate(root, "verify-attestation", "1");
    assert.equal(broken.status, 2);
    assert.match(broken.stderr, /not valid JSON/);
  }));

test("a silent test still leaves a log with the command and exit code", () =>
  withRoot((root) => {
    recordPass(root, "1", "coding");
    assert.equal(gate(root, "run", "1", "test", "--", NODE, "-e", "process.exit(0)").status, 0);
    const log = fs.readFileSync(path.join(root, ".phase-evidence", "phase-1-test.log"), "utf8");
    assert.match(log, /\[phase-gate\] exit_code: 0/);
    assert.match(log, /\[phase-gate\] command: /);
  }));
