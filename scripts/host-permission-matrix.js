"use strict";
// Host permission matrix measurement (harness-reinforcement-plan B1 — 호스트 권한 실측).
// Measures what THIS host allows across four dimensions (read / write / exec / network)
// and reports the raw result. It is a measurement record, NOT a gate: a "denied" probe
// is a valid measurement, not a failure, and this script never fails the build.
// The only side effect is a throwaway probe file in the user's home directory, removed
// (and verified removed) immediately. Nothing is written inside the repository.
//
// Usage: node scripts/host-permission-matrix.js [--markdown] [--json]
//   default: one compact line  HOST-MATRIX <os>/<arch> read=.. write=.. exec=.. net=..
//   --markdown: markdown table row for docs/host-permission-matrix-*.md
//   --json: full structured result
// Exit codes: 0 = measurement completed (regardless of probe outcomes); 2 = bad arguments.
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const PROBE_TIMEOUT_MS = 30_000;
const STATUS = new Set(["ok", "denied", "unknown"]);

function usageError(message) {
  console.error(`host-permission-matrix: ${message}`);
  console.error("usage: node scripts/host-permission-matrix.js [--markdown] [--json]");
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { markdown: false, json: false };
  for (const a of argv) {
    if (a === "--markdown") opts.markdown = true;
    else if (a === "--json") opts.json = true;
    else usageError(`unknown argument: ${a}`);
  }
  return opts;
}

function probe(cmd, args, note) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: PROBE_TIMEOUT_MS, maxBuffer: 1024 * 1024 });
  if (r.error) {
    return r.error.code === "ENOENT"
      ? { status: "unknown", detail: `command not found: ${cmd}` }
      : { status: "unknown", detail: `spawn error: ${r.error.message}` };
  }
  if (r.status === 0) {
    const out = (r.stdout || "").trim().split(/\r?\n/)[0] || "";
    return { status: "ok", detail: note || (out ? out.slice(0, 120) : "ok") };
  }
  const err = (r.stderr || "").trim().split(/\r?\n/)[0] || `exit ${r.status}`;
  return { status: "denied", detail: `${note || ""}${note ? " | " : ""}${err.slice(0, 160)}`.trim() };
}

// Per-OS probe targets, chosen to be plain files/commands every standard runner image has.
function readProbe() {
  switch (process.platform) {
    case "win32": return probe("cmd", ["/c", "type", "C:\\Windows\\System32\\drivers\\etc\\hosts"], "read C:\\Windows\\System32\\drivers\\etc\\hosts");
    case "darwin": return probe("cat", ["/etc/hostname"], "read /etc/hostname");
    default: return probe("cat", ["/etc/os-release"], "read /etc/os-release");
  }
}

function writeProbe() {
  const home = os.homedir();
  if (typeof home !== "string" || !home) return { status: "unknown", detail: "home directory unavailable" };
  const p = `${home}${process.platform === "win32" ? "\\" : "/"}.host-matrix-probe-${process.pid}.tmp`;
  try {
    fs.writeFileSync(p, "host-permission-matrix probe");
    fs.unlinkSync(p);
    return { status: "ok", detail: `wrote+removed ${p.split(process.platform === "win32" ? "\\" : "/").slice(-2).join("/")} in home` };
  } catch (err) {
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* best effort */ }
    return { status: "denied", detail: `home write failed: ${err.code || err.message}` };
  }
}

function execProbe() {
  return probe(process.execPath, ["--version"], "exec node --version");
}

function netProbe() {
  // No note here: probe() would overwrite the detail, hiding the -w %{http_code} stdout we parse below.
  const r = probe("curl", ["-s", "-o", process.platform === "win32" ? "NUL" : "/dev/null", "-w", "%{http_code}", "-m", "20", "https://api.github.com/zen"]);
  const code = /^(\d{3})$/.exec((r.detail || "").trim());
  if (r.status === "ok" && code) return { status: "ok", detail: `HTTP ${code[1]} from api.github.com` };
  if (r.status === "ok") return { status: "ok", detail: "curl ok (no status code captured)" };
  return r; // denied (non-zero exit = network blocked/failed) or unknown (curl missing)
}

function measure() {
  const probes = { read: readProbe(), write: writeProbe(), exec: execProbe(), net: netProbe() };
  for (const [k, v] of Object.entries(probes)) {
    if (!STATUS.has(v.status)) { console.error(`host-permission-matrix: internal error, bad status for ${k}`); process.exit(2); }
  }
  return {
    version: 1,
    os: process.platform,
    arch: process.arch,
    release: os.release(),
    hostname: os.hostname(),
    user: os.userInfo().username,
    node: process.version,
    measured_at: new Date().toISOString(),
    probes,
  };
}

const short = p => p.status;
const netShort = p => {
  const hit = p.status === "ok" && /^HTTP (\d{3})/.exec(p.detail);
  return hit ? `ok(${hit[1]})` : p.status;
};

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const m = measure();
  if (opts.json) {
    process.stdout.write(JSON.stringify(m, null, 2) + "\n");
    return;
  }
  const compact = `HOST-MATRIX ${m.os}/${m.arch} read=${short(m.probes.read)} write=${short(m.probes.write)} exec=${short(m.probes.exec)} net=${netShort(m.probes.net)} measured=${m.measured_at}`;
  if (opts.markdown) {
    const d = m.measured_at.replace("T", " ").slice(0, 16) + " UTC";
    const cell = p => p.status === "ok" ? "OK" : p.status === "denied" ? "DENIED" : "UNKNOWN";
    process.stdout.write([
      `| ${m.os}/${m.arch} (${m.hostname}, node ${m.node}) | ${d} | ${cell(m.probes.read)} | ${cell(m.probes.write)} | ${cell(m.probes.exec)} | ${cell(m.probes.net)} |`,
      "",
      `<details><summary>probe details</summary>`,
      "",
      `- read: ${m.probes.read.detail}`,
      `- write: ${m.probes.write.detail}`,
      `- exec: ${m.probes.exec.detail}`,
      `- net: ${m.probes.net.detail}`,
      "",
      `</details>`,
      "",
    ].join("\n"));
    return;
  }
  process.stdout.write(compact + "\n");
}

if (require.main === module) main();
module.exports = { measure };
