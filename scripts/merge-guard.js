"use strict";
// Advisory PR readiness check, NOT server-side merge enforcement.
// It requires every named job from the local CI workflow and reads check runs for the exact
// PR head SHA, then brackets that query with PR head/base reads. A later push can still race
// a manual merge; GitHub branch protection is the only server-side enforcement boundary.
// Check names and passing statuses do not prove test quality, owner review, or host isolation.
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { REQUIRED_PHASES, parseRequiredPhases } = require("./phase-definition.js");

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
  const auxiliaryFound = new Set();
  let checksDependsOnSummary = false;
  for (let i = jobs + 1; i < lines.length; i++) {
    if (!/^  [A-Za-z0-9_-]+:$/.test(lines[i])) continue;
    const start = i;
    let end = i + 1;
    while (end < lines.length && !/^  [A-Za-z0-9_-]+:$/.test(lines[end])) end++;
    const block = lines.slice(start, end);
    const nameLine = /^    name:\s*(.+)$/.exec(block[1] || "");
    if (!nameLine) return { error: "CI job is missing its explicit name" };
    const template = nameLine[1].trim();
    const auxiliary = {
      "attestation-discovery": "attestation discovery",
      "attestation-replay": "attestation replay / ${{ matrix.phase }}",
      "attestation-summary": "attestation summary",
    };
    const jobId = block[0].trim().slice(0, -1);
    if (Object.hasOwn(auxiliary, jobId)) {
      if (template !== auxiliary[jobId]) return { error: `CI attestation job name changed: ${jobId}` };
      auxiliaryFound.add(jobId);
      i = end - 1;
      continue;
    }
    if (jobId === "checks") checksDependsOnSummary = block.includes("    needs: attestation-summary");
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
  if (auxiliaryFound.size !== 3 || !checksDependsOnSummary) return { error: "CI attestation dependencies unavailable" };
  if (!value.length || value.some(name => !name || /\$\{\{/.test(name))) return { error: "no complete CI job names found" };
  if (JSON.stringify(value) !== JSON.stringify([...REQUIRED_CHECKS].sort()))
    return { error: "CI job-name set changed; review and update the required-check allowlist" };
  return { value };
}

function evaluateChecks(checks, {
  expectedChecks = REQUIRED_CHECKS, expectedHeadSha = null, reportedHeadSha = null,
  requireAttestations = false, expectedPhases = [],
} = {}) {
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
  const isAuxiliary = name => name === "attestation discovery" || name === "attestation summary" ||
    /^attestation replay \/ [A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name);
  const unexpected = [...seen].filter(name => !expectedChecks.includes(name) && !(requireAttestations && isAuxiliary(name)));
  if (unexpected.length) return { ok: false, reason: `${unexpected.length} unexpected CI job(s) reported`, unexpected, failing };
  const missing = expectedChecks.filter(name => !seen.has(name));
  if (requireAttestations) {
    for (const name of ["attestation discovery", "attestation summary"]) if (!seen.has(name)) missing.push(name);
    for (const phase of expectedPhases) {
      const name = `attestation replay / ${phase}`;
      if (!seen.has(name)) missing.push(name);
    }
    if (!expectedPhases.length && ![...seen].some(name => /^attestation replay \//.test(name))) missing.push("attestation replay");
  }
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
    if (parsed && (typeof parsed.name === "string" || Number.isSafeInteger(parsed.check_suite_id))) return { value: [parsed] };
    return { error: "check-run API returned an invalid result" };
  } catch (err) {
    try {
      const lines = (r.stdout || "").split(/\r?\n/).filter(line => line.trim());
      return { value: lines.map(line => JSON.parse(line)) };
    } catch { return { error: `gh ${args[0]} returned invalid check-run JSON: ${err.message}` }; }
  }
}

function latestCiRun(pr, { head, repository, base, headRepository }, run) {
  const fields = ".workflow_runs[] | {id,run_number,run_attempt,check_suite_id,head_sha,path,event,status,conclusion,head_repository:{full_name:.head_repository.full_name},pull_requests:[.pull_requests[]? | {number,head:{sha:.head.sha},base:{sha:.base.sha}}]} | @json";
  const runs = ghJsonLines(["api", "--paginate", "--jq", fields,
    `repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${head}&event=pull_request&per_page=100`], run);
  if (runs.error) return runs;
  if (runs.value.some(item => typeof item?.path !== "string")) return { error: "CI workflow provenance unavailable" };
  const ci = runs.value.filter(item => item.path.split("@")[0] === ".github/workflows/ci.yml");
  if (ci.some(item => item.event !== "pull_request" || item.head_sha !== head ||
      !Number.isSafeInteger(item.run_number) || item.run_number < 1) ||
      new Set(ci.map(item => item.run_number)).size !== ci.length)
    return { error: "CI workflow run identity or order unavailable or ambiguous" };
  ci.sort((a, b) => b.run_number - a.run_number);
  for (const item of ci) {
    if (!Array.isArray(item.pull_requests) ||
        item.pull_requests.some(p => !Number.isSafeInteger(p?.number)))
      return { error: "CI workflow run PR association unavailable" };
    if (!item.pull_requests.length) {
      const ref = /@refs\/pull\/(\d+)\/merge$/.exec(item.path);
      const source = item.head_repository?.full_name;
      if (typeof source !== "string") return { error: "CI workflow run head repository identity unavailable" };
      if (source.toLowerCase() !== headRepository.toLowerCase()) continue;
      if (!ref) return { error: "CI workflow run PR merge-ref identity unavailable" };
      if (Number(ref[1]) !== Number(pr)) continue;
      return { value: item, needsContext: true };
    }
    const matching = item.pull_requests.filter(p => p.number === Number(pr));
    if (!matching.length) continue;
    if (matching.length !== 1 || matching[0].head?.sha !== head || matching[0].base?.sha !== base)
      return { error: "Latest CI workflow run is not bound to the current PR head and base" };
    return { value: item };
  }
  return { value: null };
}

function verifyPrContext(discovery, pr, base, mergeSha) {
  if (discovery.status !== "completed" || discovery.conclusion !== "success" ||
      !Array.isArray(discovery.steps)) return false;
  const expected = [`PR base ${pr} ${base}`, `PR merge ${mergeSha}`];
  const steps = discovery.steps.filter(step => /^PR (?:base|merge) /.test(step?.name || ""));
  return steps.length === expected.length && expected.every(name =>
    steps.some(step => step.name === name && step.status === "completed" && step.conclusion === "success"));
}

function fetchChecks(pr, identity, run = spawnSync) {
  const { head, repository, base } = identity;
  if (!SHA.test(head || "") || !SHA.test(base || "") || typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return { error: "PR head/base repository identity is unavailable" };
  // Inspect runs before check-runs: GitHub can list a queued run before its jobs exist.
  const selected = latestCiRun(pr, identity, run);
  if (selected.error) return selected;
  if (!selected.value) return { value: [] };
  const { id: runId, run_number: number, run_attempt: attempt, check_suite_id: suite, status, conclusion } = selected.value;
  if ([runId, attempt, suite].some(id => !Number.isSafeInteger(id) || id < 1))
    return { error: "CI workflow run, attempt or suite identity unavailable" };
  if (status !== "completed" || conclusion !== "success")
    return { error: "Latest CI workflow run did not complete successfully" };
  const fields = ".check_runs[] | {id,name,head_sha,status,conclusion,app:{slug:.app.slug},check_suite:{id:.check_suite.id},pull_requests:[.pull_requests[]? | {number,head:{sha:.head.sha},base:{sha:.base.sha}}]} | @json";
  const r = ghJsonLines(["api", "--paginate", "--jq", fields, `repos/${repository}/commits/${head}/check-runs?per_page=100&filter=all`], run);
  if (r.error) return r;
  // Only GitHub Actions jobs from the checked-in workflow can satisfy this job-name contract.
  // Other apps/status producers may reuse names but are not evidence that this workflow ran.
  const candidates = r.value.filter(item => item && item.check_suite?.id === suite && item.head_sha === head && typeof item.name === "string" &&
      item.app && item.app.slug === "github-actions" && Array.isArray(item.pull_requests) &&
      (!item.pull_requests.length || item.pull_requests.some(p => p && p.number === Number(pr) &&
        p.head?.sha === head && p.base?.sha === base)));
  if (!candidates.length) return { value: [] };
  const attemptPath = `repos/${repository}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`;
  const jobFields = '.jobs[] | {id,run_id,run_attempt,name,check_run_url,status,conclusion,steps:(if .name == "attestation discovery" then [.steps[]? | {name,status,conclusion}] else null end)} | @json';
  const jobs = ghJsonLines(["api", "--paginate", "--jq", jobFields, attemptPath], run);
  if (jobs.error) return jobs;
  const byId = new Map(candidates.map(item => [item.id, item]));
  const prefix = `https://api.github.com/repos/${repository}/check-runs/`;
  const checks = [];
  for (const job of jobs.value) {
    const ref = typeof job?.check_run_url === "string" && job.check_run_url.startsWith(prefix) ? job.check_run_url.slice(prefix.length) : "";
    const check = /^\d+$/.test(ref) && byId.get(Number(ref));
    if (!check || job.run_id !== runId || job.run_attempt !== attempt || job.name !== check.name ||
        job.status !== check.status || job.conclusion !== check.conclusion)
      return { error: "CI job is missing or differs from the PR check in the selected run attempt" };
    checks.push(check);
  }
  if (selected.needsContext) {
    const discovery = jobs.value.filter(job => job.name === "attestation discovery");
    const ref = ghJson(["api", `repos/${repository}/git/ref/pull/${pr}/merge`], 60_000, run);
    if (ref.error) return ref;
    const mergeSha = ref.value?.object?.sha;
    if (ref.value?.ref !== `refs/pull/${pr}/merge` || ref.value?.object?.type !== "commit" || !SHA.test(mergeSha || ""))
      return { error: "GitHub did not return the current PR merge commit" };
    if (discovery.length !== 1 || !verifyPrContext(discovery[0], pr, base, mergeSha))
      return { error: "Selected CI discovery job does not bind the run to this PR base and merge commit" };
  }
  const latest = latestCiRun(pr, identity, run);
  if (latest.error) return latest;
  if (latest.value?.id !== runId || latest.value.run_number !== number ||
      latest.value.run_attempt !== attempt || latest.value.check_suite_id !== suite ||
      latest.value.status !== "completed" || latest.value.conclusion !== "success" ||
      latest.needsContext !== selected.needsContext)
    return { error: "CI workflow run attempt changed or did not complete successfully" };
  return { value: checks
    .map(item => ({ name: item.name, state: item.conclusion || item.status, bucket: item.status === "completed" && item.conclusion === "success" ? "pass" : (item.status === "completed" && item.conclusion === "skipped" ? "skipping" : item.status) }))
  };
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
  let expectedPhases;
  try { workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "ci.yml"), "utf8"); }
  catch (err) { return { error: `cannot read local CI workflow: ${err.message}` }; }
  try { expectedPhases = parseRequiredPhases(fs.readFileSync(path.join(__dirname, "..", REQUIRED_PHASES))); }
  catch (err) { return { error: `cannot read local required Phase policy: ${err.message}` }; }
  const expected = requiredChecks(workflow);
  if (expected.error) return expected;
  const before = fetchPullRequest(pr, run);
  if (before.error) return before;
  if (before.value.draft) return { error: "draft PR is not merge-ready" };
  const fetched = fetchChecks(pr, before.value, run);
  if (fetched.error) return fetched;
  const after = fetchPullRequest(pr, run);
  if (after.error) return after;
  if (after.value.draft || before.value.draft !== after.value.draft) return { error: "PR draft state changed or became draft while check runs were queried" };
  if (before.value.head !== after.value.head || before.value.base !== after.value.base || before.value.baseRef !== after.value.baseRef || before.value.repository !== after.value.repository || before.value.headRepository !== after.value.headRepository)
    return { error: "PR head, base or source repository changed while check runs were queried" };
  return { checks: fetched.value, expectedChecks: expected.value, expectedPhases, head: before.value.head, base: before.value.base, baseRef: before.value.baseRef, repository: before.value.repository, headRepository: before.value.headRepository, draft: before.value.draft };
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
  return report(readiness.checks, `PR ${argv[0]} @ ${readiness.head}`, {
    expectedChecks: readiness.expectedChecks, expectedHeadSha: readiness.head, reportedHeadSha: readiness.head,
    requireAttestations: true, expectedPhases: readiness.expectedPhases,
  });
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { evaluateChecks, parseChecks, requiredChecks, liveReadiness };
