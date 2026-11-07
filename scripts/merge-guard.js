"use strict";
// Advisory PR readiness check, NOT server-side merge enforcement.
// It requires every named job from the local CI workflow and reads check runs for the exact
// PR head SHA, then brackets that query with PR head/base reads. A later push can still race
// a manual merge; GitHub branch protection is the only server-side enforcement boundary.
// Check names and passing statuses do not prove test quality, owner review, or host isolation.
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

// `gh pr checks --json name,state,bucket` reports a coarse bucket; only "pass" is accepted.
// "skipping" is deliberately not accepted: a skipped suite is not evidence the suite passed.
const PASSING = new Set(["pass"]);
const MAX_CHECKS_BYTES = 1024 * 1024;
const SHA = /^[0-9a-f]{40}$/i;
const REQUIRED_CHECKS = [
  "checks / node 22", "checks / node 24",
  "portability / macos-latest", "portability / windows-latest",
  "isolation / linux namespace",
  "toolbroker / macos-latest", "toolbroker / ubuntu-latest", "toolbroker / windows-latest",
  "self-qa / shellcheck",
];

// Parse only the simple `name` and matrix declarations used by this repository's CI file.
// The extracted set must equal the reviewed allowlist, so an accidental job removal/addition
// cannot silently reduce/expand what this advisory verifier considers required.
function requiredChecks(workflow) {
  if (typeof workflow !== "string" || !workflow) return { error: "CI workflow unavailable" };
  const lines = workflow.replace(/\r\n/g, "\n").split("\n");
  const jobs = lines.indexOf("jobs:");
  if (jobs < 0) return { error: "CI jobs section unavailable" };
  const names = new Set();
  for (let i = jobs + 1; i < lines.length; i++) {
    if (!/^  [A-Za-z0-9_-]+:$/.test(lines[i])) continue;
    const start = i;
    let end = i + 1;
    while (end < lines.length && !/^  [A-Za-z0-9_-]+:$/.test(lines[end])) end++;
    const block = lines.slice(start, end);
    const nameLine = /^    name:\s*(.+)$/.exec(block[1] || "");
    if (!nameLine) return { error: "CI job is missing its explicit name" };
    const template = nameLine[1].trim();
    const matrix = /\$\{\{\s*matrix\.(node|os)\s*\}\}/.exec(template);
    if (!matrix) { names.add(template); i = end - 1; continue; }
    const matrixIndex = block.indexOf("      matrix:");
    if (matrixIndex < 0) return { error: `CI ${matrix[1]} matrix unavailable for job ${block[0].trim()}` };
    const valueLine = new RegExp(`^        ${matrix[1]}:\\s*\\[([^\\]]+)\\]\\s*$`).exec(block[matrixIndex + 1] || "");
    if (!valueLine) return { error: `CI ${matrix[1]} matrix unavailable for job ${block[0].trim()}` };
    const values = valueLine[1].split(",").map(x => x.trim());
    if (!values.length || values.some(value => !value || /[\[\]$]/.test(value))) return { error: `invalid CI ${matrix[1]} matrix` };
    for (const value of values) names.add(template.replace(matrix[0], value));
    i = end - 1;
  }
  const value = [...names].sort();
  if (!value.length || value.some(name => !name || /\$\{\{/.test(name))) return { error: "no complete CI job names found" };
  if (JSON.stringify(value) !== JSON.stringify([...REQUIRED_CHECKS].sort()))
    return { error: "CI job-name set changed; review and update the required-check allowlist" };
  return { value };
}

function evaluateChecks(checks, { expectedChecks = REQUIRED_CHECKS, expectedHeadSha = null, reportedHeadSha = null } = {}) {
  if (!Array.isArray(expectedChecks) || !expectedChecks.length || !expectedChecks.every(name => typeof name === "string" && name.length) || new Set(expectedChecks).size !== expectedChecks.length)
    return { ok: false, reason: "required CI job-name list is invalid" };
  if (expectedHeadSha !== null && (typeof expectedHeadSha !== "string" || !SHA.test(expectedHeadSha) || reportedHeadSha !== expectedHeadSha))
    return { ok: false, reason: "check results are not bound to the expected PR head SHA" };
  if (!Array.isArray(checks)) return { ok: false, reason: "check list is not an array" };
  if (checks.length === 0)
    return { ok: false, reason: "no checks reported; a missing CI run is not evidence of passing" };
  const seen = new Set();
  const duplicateNames = new Set();
  const failing = [];
  for (const check of checks) {
    const name = check && typeof check.name === "string" && check.name ? check.name : "<unnamed>";
    if (seen.has(name)) duplicateNames.add(name);
    seen.add(name);
    const bucket = check && typeof check.bucket === "string" ? check.bucket : "";
    if (!PASSING.has(bucket)) {
      failing.push({
        name,
        bucket: bucket || "<missing>",
        state: check && typeof check.state === "string" ? check.state : "",
      });
    }
  }
  for (const name of duplicateNames) failing.push({ name, bucket: "<duplicate>", state: "" });
  const unexpected = [...seen].filter(name => !expectedChecks.includes(name));
  if (unexpected.length) return { ok: false, reason: `${unexpected.length} unexpected CI job(s) reported`, unexpected, failing };
  const missing = expectedChecks.filter(name => !seen.has(name));
  if (missing.length) return { ok: false, reason: `${missing.length} required CI job(s) missing`, missing, failing };
  if (failing.length) return { ok: false, reason: `${failing.length} check(s) not passing`, failing };
  return { ok: true, count: checks.length, ...(expectedHeadSha ? { head_sha: expectedHeadSha } : {}) };
}

function readChecksFile(p) {
  let st;
  try {
    st = fs.statSync(p);
  } catch (err) {
    return { error: `cannot read check list: ${err.message}` };
  }
  if (!st.isFile()) return { error: `not a regular file: ${p}` };
  if (st.size > MAX_CHECKS_BYTES) return { error: `check list exceeds ${MAX_CHECKS_BYTES} bytes` };
  try {
    return { text: fs.readFileSync(p, "utf8") };
  } catch (err) {
    return { error: `cannot read check list: ${err.message}` };
  }
}

function ghJson(args, timeout = 60_000, run = spawnSync) {
  const r = run("gh", args, { encoding: "utf8", timeout, maxBuffer: MAX_CHECKS_BYTES });
  if (r.error) return { error: `cannot run gh ${args[0]}: ${r.error.message}` };
  if (r.status !== 0) {
    const stderr = (r.stderr || "").trim();
    return { error: `gh ${args.join(" ")} failed with status ${r.status}${stderr ? `: ${stderr}` : ""}` };
  }
  try { return { value: JSON.parse(r.stdout || "") }; }
  catch (err) { return { error: `gh ${args[0]} returned invalid JSON: ${err.message}` }; }
}

function fetchPullRequest(pr, run = spawnSync) {
  const r = ghJson(["pr", "view", pr, "--json", "url,baseRefName,baseRefOid,headRefOid,headRepository,state,isDraft"], 60_000, run);
  if (r.error) return r;
  const p = r.value;
  if (!p || p.state !== "OPEN" || typeof p.isDraft !== "boolean" || typeof p.baseRefName !== "string" || !p.baseRefName ||
      !SHA.test(p.baseRefOid || "") || !SHA.test(p.headRefOid || "")) return { error: "PR is not open or head/base/draft identity is unavailable" };
  let url;
  try { url = new URL(p.url); } catch { return { error: "PR repository URL is unavailable" }; }
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname !== "github.com" || parts.length !== 4 || parts[2] !== "pull" || !/^\d+$/.test(parts[3]))
    return { error: "PR base repository URL is unsupported or invalid" };
  if (String(pr) !== parts[3]) return { error: "GitHub returned a different pull request than requested" };
  const repository = `${parts[0]}/${parts[1]}`;
  const headRepository = p.headRepository && (p.headRepository.nameWithOwner || (p.headRepository.owner && p.headRepository.name ? `${p.headRepository.owner.login}/${p.headRepository.name}` : null));
  if (typeof headRepository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(headRepository))
    return { error: "PR head source repository identity is unavailable" };
  return { value: { base: p.baseRefOid, baseRef: p.baseRefName, head: p.headRefOid, repository, headRepository, draft: p.isDraft } };
}

function ghJsonLines(args, run = spawnSync) {
  const r = run("gh", args, { encoding: "utf8", timeout: 60_000, maxBuffer: MAX_CHECKS_BYTES });
  if (r.error) return { error: `cannot run gh ${args[0]}: ${r.error.message}` };
  if (r.status !== 0) {
    const stderr = (r.stderr || "").trim();
    return { error: `gh ${args.join(" ")} failed with status ${r.status}${stderr ? `: ${stderr}` : ""}` };
  }
  try {
    const text = (r.stdout || "").trim();
    if (!text) return { value: [] };
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { value: parsed };
    if (parsed && Array.isArray(parsed.check_runs)) return { value: parsed.check_runs };
    return { error: "check-run API returned an invalid result" };
  } catch (err) {
    try {
      const lines = (r.stdout || "").split(/\r?\n/).filter(line => line.trim());
      return { value: lines.map(line => JSON.parse(line)) };
    } catch { return { error: `gh ${args[0]} returned invalid check-run JSON: ${err.message}` }; }
  }
}

function fetchChecks(pr, head, repository, base, run = spawnSync) {
  if (!SHA.test(head || "") || !SHA.test(base || "") || typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return { error: "PR head/base repository identity is unavailable" };
  const r = ghJsonLines(["api", "--paginate", "--jq", ".check_runs[] | @json", `repos/${repository}/commits/${head}/check-runs?per_page=100`], run);
  if (r.error) return r;
  // Only GitHub Actions jobs from the checked-in workflow can satisfy this job-name contract.
  // Other apps/status producers may reuse names but are not evidence that this workflow ran.
  const checks = r.value.filter(item => item && item.head_sha === head && typeof item.name === "string" &&
      item.app && item.app.slug === "github-actions" && Array.isArray(item.pull_requests) &&
      item.pull_requests.some(p => p && p.number === Number(pr) && p.head && p.base && p.head.sha === head && p.base.sha === base))
    .map(item => ({ name: item.name, state: item.conclusion || item.status, bucket: item.status === "completed" && item.conclusion === "success" ? "pass" : (item.status === "completed" && item.conclusion === "skipped" ? "skipping" : item.status) }));
  return { value: checks };
}

function parseChecks(text) {
  if (typeof text !== "string" || text.trim() === "") return { error: "empty check list output" };
  try {
    return { checks: JSON.parse(text) };
  } catch (err) {
    return { error: `check list is not valid JSON: ${err.message}` };
  }
}

function usage() {
  console.error("usage: node scripts/merge-guard.js <pull-request-number> | --checks-file <path> --expected-head <sha>");
  console.error("Live mode requires every reviewed CI job and reads check runs for a stable PR head/base. Advisory only; branch protection is still required.");
}

function report(checks, pr, options = {}) {
  const verdict = evaluateChecks(checks, options);
  console.log(JSON.stringify(verdict));
  if (!verdict.ok) console.error(`merge-guard: NOT VERIFIED for ${pr}: ${verdict.reason}`);
  return verdict.ok ? 0 : 2;
}

function liveReadiness(pr, run = spawnSync) {
  let workflow;
  try { workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "ci.yml"), "utf8"); }
  catch (err) { return { error: `cannot read local CI workflow: ${err.message}` }; }
  const expected = requiredChecks(workflow);
  if (expected.error) return expected;
  const before = fetchPullRequest(pr, run);
  if (before.error) return before;
  if (before.value.draft) return { error: "draft PR is not merge-ready" };
  const fetched = fetchChecks(pr, before.value.head, before.value.repository, before.value.base, run);
  if (fetched.error) return fetched;
  const after = fetchPullRequest(pr, run);
  if (after.error) return after;
  if (after.value.draft || before.value.draft !== after.value.draft) return { error: "PR draft state changed or became draft while check runs were queried" };
  if (before.value.head !== after.value.head || before.value.base !== after.value.base || before.value.baseRef !== after.value.baseRef || before.value.repository !== after.value.repository || before.value.headRepository !== after.value.headRepository)
    return { error: "PR head, base or source repository changed while check runs were queried" };
  return { checks: fetched.value, expectedChecks: expected.value, head: before.value.head, base: before.value.base, baseRef: before.value.baseRef, repository: before.value.repository, headRepository: before.value.headRepository, draft: before.value.draft };
}

function main(argv) {
  if (argv[0] === "--checks-file") {
    const file = argv[1];
    if (!file || argv.length !== 4 || argv[2] !== "--expected-head" || !SHA.test(argv[3] || "")) { usage(); return 2; }
    const read = readChecksFile(file);
    if (read.error) { console.error(`merge-guard: ${read.error}`); return 2; }
    const parsed = parseChecks(read.text);
    if (parsed.error) { console.error(`merge-guard: ${parsed.error}`); return 2; }
    console.error("merge-guard: captured check files are untrusted and are not accepted as readiness evidence");
    return 2;
  }
  if (argv.length !== 1 || !/^[0-9]+$/.test(argv[0] || "")) { usage(); return 2; }
  const readiness = liveReadiness(argv[0]);
  if (readiness.error) { console.error(`merge-guard: NOT VERIFIED: ${readiness.error}`); return 2; }
  return report(readiness.checks, `PR ${argv[0]} @ ${readiness.head}`, { expectedChecks: readiness.expectedChecks, expectedHeadSha: readiness.head, reportedHeadSha: readiness.head });
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { evaluateChecks, parseChecks, requiredChecks, liveReadiness };
