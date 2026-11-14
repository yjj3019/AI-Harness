"use strict";
// Shared bash-capability probe for suites that exercise the real bash hooks.
// On Windows, `bash` on PATH may be a WSL launcher stub with no distro installed; spawning it
// then fails. Such suites should `skip` cleanly there instead of flaking. Set HARNESS_BASH to a
// native bash (for example Git Bash) to run them.
//
// The probe must exercise the real usage shape: bash is always spawned with a SCRIPT PATH
// ARGUMENT, never with -c. The WSL launcher stub (`C:\Windows\system32\bash.exe`) returns
// exit 0 for `-c "exit 0"` yet mangles Windows backslash paths (`C:\Users\...` -> `C:Users...`)
// and exits 127 at the real spawn site, so a -c probe falsely reports "works" and the suite then
// fails deterministically (observed: 10/10 suite runs, identical fail, variants=1). Measuring the
// path-argument shape turns stub hosts into a clean skip while native bash (CI) still runs.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let cached = null;

function bashWorks() {
  if (cached === null) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bash-probe-"));
    try {
      const script = path.join(dir, "probe.sh");
      fs.writeFileSync(script, "#!/usr/bin/env bash\nexit 0\n");
      const r = spawnSync(process.env.HARNESS_BASH || "bash", [script],
        { encoding: "utf8", timeout: 20000 });
      cached = !r.error && r.status === 0;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
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
