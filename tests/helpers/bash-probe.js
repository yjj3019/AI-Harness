"use strict";
// Shared bash-capability probe for suites that exercise the real bash hooks.
// On Windows, `bash` on PATH may be a WSL launcher stub with no distro installed; spawning it
// then fails. Such suites should `skip` cleanly there instead of flaking. Set HARNESS_BASH to a
// native bash (for example Git Bash) to run them.
const { spawnSync } = require("node:child_process");

let cached = null;

function bashWorks() {
  if (cached === null) {
    const r = spawnSync(process.env.HARNESS_BASH || "bash", ["-c", "exit 0"],
      { encoding: "utf8", timeout: 20000 });
    cached = !r.error && r.status === 0;
  }
  return cached;
}

function skipReason() {
  return bashWorks() ? false : "requires a working bash (set HARNESS_BASH to a native bash)";
}

let jqChecked = null;
function jqReason() {
  if (jqChecked === null) {
    const r = spawnSync("jq", ["--version"], { encoding: "utf8", timeout: 20000 });
    jqChecked = !r.error && r.status === 0;
  }
  return jqChecked ? false : "requires jq on PATH (doctor prerequisites)";
}

module.exports = { bashWorks, skipReason, jqReason };
