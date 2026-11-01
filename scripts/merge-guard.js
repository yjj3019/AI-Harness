"use strict";
// Procedural merge gate: refuse to merge a pull request unless every reported check passed.
//
// This is NOT enforcement. GitHub branch protection / rulesets are unavailable for this private
// repository without a paid plan (the API answers 403 "Upgrade to GitHub Pro or make this repository
// public"), so a merge can still be performed by hand or by another tool. See docs/merge-policy.md.
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

// `gh pr checks --json name,state,bucket` reports a coarse bucket; only "pass" is accepted.
// "skipping" is deliberately not accepted: a skipped suite is not evidence the suite passed.
const PASSING = new Set(["pass"]);
const MAX_CHECKS_BYTES = 1024 * 1024;

function evaluateChecks(checks) {
  if (!Array.isArray(checks)) return { ok: false, reason: "check list is not an array" };
  if (checks.length === 0)
    return { ok: false, reason: "no checks reported; a missing CI run is not evidence of passing" };
  const failing = [];
  for (const check of checks) {
    const name = check && typeof check.name === "string" && check.name ? check.name : "<unnamed>";
    const bucket = check && typeof check.bucket === "string" ? check.bucket : "";
    if (!PASSING.has(bucket)) {
      failing.push({
        name,
        bucket: bucket || "<missing>",
        state: check && typeof check.state === "string" ? check.state : "",
      });
    }
  }
  if (failing.length) return { ok: false, reason: `${failing.length} check(s) not passing`, failing };
  return { ok: true, count: checks.length };
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

function fetchChecks(pr) {
  const r = spawnSync("gh", ["pr", "checks", pr, "--json", "name,state,bucket"], {
    encoding: "utf8",
    timeout: 60_000,
  });
  if (r.error) return { error: `cannot run gh: ${r.error.message}` };
  if (r.status !== 0) {
    const stderr = (r.stderr || "").trim();
    return { error: `gh pr checks ${pr} failed with status ${r.status}${stderr ? `: ${stderr}` : ""}` };
  }
  return { text: r.stdout || "" };
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
  console.error("usage: node scripts/merge-guard.js <pull-request-number> | --checks-file <path>");
  console.error("Evaluates `gh pr checks` output and exits 0 only when every check passed.");
}

function report(checks, pr) {
  const verdict = evaluateChecks(checks);
  console.log(JSON.stringify(verdict));
  if (!verdict.ok) console.error(`merge-guard: refusing to merge ${pr}: ${verdict.reason}`);
  return verdict.ok ? 0 : 2;
}

function main(argv) {
  if (argv[0] === "--checks-file") {
    if (!argv[1]) {
      usage();
      return 2;
    }
    const read = readChecksFile(argv[1]);
    if (read.error) {
      console.error(`merge-guard: ${read.error}`);
      return 2;
    }
    const parsed = parseChecks(read.text);
    if (parsed.error) {
      console.error(`merge-guard: ${parsed.error}`);
      return 2;
    }
    return report(parsed.checks, argv[1]);
  }
  const pr = argv[0];
  if (!pr || !/^[0-9]+$/.test(pr)) {
    usage();
    return 2;
  }
  const fetched = fetchChecks(pr);
  if (fetched.error) {
    console.error(`merge-guard: ${fetched.error}`);
    return 2;
  }
  const parsed = parseChecks(fetched.text);
  if (parsed.error) {
    console.error(`merge-guard: ${parsed.error}`);
    return 2;
  }
  return report(parsed.checks, `PR ${pr}`);
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { evaluateChecks, parseChecks };
