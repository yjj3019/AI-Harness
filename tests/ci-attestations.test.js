"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/ci.yml"), "utf8");
const source = path.resolve(__dirname, "..");
const bash = process.platform === "win32" && fs.existsSync("C:/Program Files/Git/bin/bash.exe") ? "C:/Program Files/Git/bin/bash.exe" : "bash";
function scriptAfter(marker, text = workflow) {
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, marker);
  const match = text.slice(start).match(/\n        run: \|\r?\n((?:          .*\r?\n)+)/);
  assert.ok(match, marker);
  return match[1].replace(/\r\n/g, "\n").replace(/^          /gm, "");
}
const discovery = scriptAfter("      - id: phases");
const replay = scriptAfter("      - name: Verify phase attestation");

test("workflow script extraction normalizes CRLF", () => {
  const lf = workflow.replace(/\r\n/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  for (const marker of ["      - id: phases", "      - name: Verify phase attestation"]) {
    assert.equal(scriptAfter(marker, crlf), scriptAfter(marker, lf));
  }
});

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ci-attestations-"));
  try {
    fs.mkdirSync(path.join(root, "docs/attestations"), { recursive: true });
    fs.mkdirSync(path.join(root, ".claude/workflows"), { recursive: true });
    fs.mkdirSync(path.join(root, ".github"));
    fs.mkdirSync(path.join(root, "scripts"));
    for (const name of ["phase-definition.js", "verify-attestation-inventory.js"]) {
      fs.copyFileSync(path.join(source, "scripts", name), path.join(root, "scripts", name));
    }
    fs.writeFileSync(path.join(root, ".github/required-phases.json"), '["a"]\n');
    fs.writeFileSync(path.join(root, "docs/PHASES.md"), "### Phase a: Required\n### Phase b: Optional\n");
    fs.writeFileSync(path.join(root, ".claude/workflows/phase-gate.js"), `const fs=require('fs'); const id=process.argv[3]; fs.appendFileSync('calls',id+'\\n'); if (JSON.parse(fs.readFileSync('docs/attestations/phase-'+id+'.json')).invalid) process.exit(2);`);
    fn(root);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function run(root, script, env) {
  const result = spawnSync(bash, ["--noprofile", "--norc", "-eo", "pipefail", "-c", script], { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", timeout: 90000 });
  assert.ifError(result.error);
  return result;
}
test("discovery enumerates all phases and replay rejects a corrupt later attestation", () => fixture(root => {
  for (const [id, content] of [["a", {}], ["b", { invalid: true }]]) fs.writeFileSync(path.join(root, `docs/attestations/phase-${id}.json`), JSON.stringify(content));
  const output = path.join(root, "output");
  assert.equal(run(root, discovery, { GITHUB_OUTPUT: output }).status, 0);
  const ids = JSON.parse(fs.readFileSync(output, "utf8").trim().slice("phases=".length));
  assert.deepEqual(ids, ["a", "b"]);
  assert.equal(run(root, replay, { PHASE_ID: ids[0] }).status, 0);
  assert.notEqual(run(root, replay, { PHASE_ID: ids[1] }).status, 0);
  assert.equal(fs.readFileSync(path.join(root, "calls"), "utf8"), "a\nb\n");
}));
test("discovery rejects empty inventory, or missing required attestations despite optional files", () => fixture(root => {
  const output = path.join(root, "output");
  const discover = () => run(root, discovery, { GITHUB_OUTPUT: output, BASE_SHA: "" });
  assert.match(discover().stderr, /missing or unreadable attestation for phase a/);
  fs.writeFileSync(path.join(root, "docs/attestations/phase-b.json"), "{}");
  const result = discover();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing or unreadable attestation for phase a/);
  assert.equal(fs.readFileSync(output, "utf8"), "");
  assert.equal(fs.existsSync(path.join(root, "calls")), false);
}));
test("PR discovery preserves requirements from the base commit", () => fixture(root => {
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  git("add", ".github/required-phases.json");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "Base phase policy");
  const base = git("rev-parse", "HEAD");
  const output = path.join(root, "output");
  fs.writeFileSync(path.join(root, ".github/required-phases.json"), '["b"]\n');
  fs.writeFileSync(path.join(root, "docs/attestations/phase-b.json"), "{}");
  const result = run(root, discovery, { GITHUB_OUTPUT: output, BASE_SHA: base });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /removes 'a' from the PR base policy/);
  fs.writeFileSync(path.join(root, ".github/required-phases.json"), '["a", "b"]\n');
  fs.writeFileSync(path.join(root, "docs/attestations/phase-a.json"), "{}");
  assert.equal(run(root, discovery, { GITHUB_OUTPUT: output, BASE_SHA: base }).status, 0);
}));
test("invalid phase names fail discovery before any replay", () => fixture(root => {
  fs.writeFileSync(path.join(root, "docs/attestations/phase-..json"), "{}");
  assert.notEqual(run(root, discovery, { GITHUB_OUTPUT: path.join(root, "output") }).status, 0);
}));
test("discovery exposes PR context through GitHub step metadata", () => {
  const block = workflow.slice(workflow.indexOf("  attestation-discovery:"), workflow.indexOf("  attestation-replay:"));
  assert.match(block, /- name: PR base \$\{\{ github\.event\.pull_request\.number \}\} \$\{\{ github\.event\.pull_request\.base\.sha \}\}\r?\n\s+if: github\.event_name == 'pull_request'/);
  assert.match(block, /- name: PR merge \$\{\{ github\.sha \}\}\r?\n\s+if: github\.event_name == 'pull_request'/);
});
test("replays have independent budgets and checks require their aggregate success", () => {
  assert.match(workflow, /attestation-replay:[\s\S]*?timeout-minutes: 180/);
  assert.match(workflow, /attestation-summary:[\s\S]*?needs: \[attestation-discovery, attestation-replay\]/);
  assert.match(workflow, /test "\$DISCOVERY_RESULT" = success && test "\$REPLAY_RESULT" = success/);
  assert.match(workflow, /checks:\r?\n    name: checks \/ node .*\r?\n    needs: attestation-summary/);
});
test("aggregate rejects failed or skipped replay", () => fixture(root => {
  const match = workflow.match(/^        run: (test "\$DISCOVERY_RESULT" = success && test "\$REPLAY_RESULT" = success)$/m);
  assert.ok(match);
  assert.equal(run(root, match[1], { DISCOVERY_RESULT: "success", REPLAY_RESULT: "success" }).status, 0);
  for (const result of ["failure", "skipped", "cancelled"]) {
    assert.notEqual(run(root, match[1], { DISCOVERY_RESULT: "success", REPLAY_RESULT: result }).status, 0);
  }
}));
