#!/usr/bin/env node
/**
 * perf-bench.js — AI-Harness 정적 게이트·CI 수트 성능 실측 하네스 (표준 라이브러리만 사용)
 *
 * 용도:
 *   node scripts/perf-bench.js [--out <json 경로>] [--samples N] [--phase-samples N] [--no-parallel]
 *
 * 측정 원칙:
 *   - 각 타깃을 별도 프로세스로 스폰(wall time, spawnSync). CI(tests/run-all.sh)와 동일한 호출 형태.
 *   - warmup 1회 후 N회 샘플 → min/median/mean/max 기록.
 *   - 쓰기 부작용 있는 생성기 2종(dashboard-status, skill-catalog generate)은 임시 복사본에서 측정(원본 트리 불변).
 *   - 병렬 실험: 핵심 게이트 동시 스폰 wall time vs 순차 합계 (in-process 병합은 process.exit
 *     직접 호출 게이트(skill-audit/secret-scan 등)가 있어 실행 안전상 배제).
 * 결과: JSON(--out, 기본 docs/practice/perf-bench-2026-11-14/perf-bench-raw.json).
 */
"use strict";
const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2);
const outPath =
  (argv[argv.indexOf("--out") + 1]) ||
  path.join(ROOT, "docs", "practice", "perf-bench-2026-11-14", "perf-bench-raw.json");
const SAMPLES = Number(argv[argv.indexOf("--samples") + 1]) || 7;
const PHASE_SAMPLES = Number(argv[argv.indexOf("--phase-samples") + 1]) || 3;
const NO_PARALLEL = argv.includes("--no-parallel");

// --- 도구 해석 ---
const NODE = process.execPath;
const BASH_CANDIDATES = ["C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files\\Git\\usr\\bin\\bash.exe", "bash"];
const BASH = BASH_CANDIDATES.find((c) => {
  try { return fs.existsSync(c) || (spawnSync(c, ["-c", "exit 0"]).status === 0); } catch { return false; }
});
let JQ = null;
try { if (spawnSync("jq", ["--version"]).status === 0) JQ = "jq"; } catch { /* 없음 */ }

const testFiles = fs.readdirSync(path.join(ROOT, "tests")).filter((f) => f.endsWith(".test.js")).map((f) => path.join("tests", f));
const shFiles = [
  ...fs.readdirSync(path.join(ROOT, "tests")).filter((f) => f.endsWith(".sh")).map((f) => path.join("tests", f)),
  ...fs.readdirSync(path.join(ROOT, ".claude", "hooks")).filter((f) => f.endsWith(".sh")).map((f) => path.join(".claude", "hooks", f)),
];

// --- 입력 규모 참조 비용: skills/docs/scripts/tests/.claude/dashboard 파일 수·바이트 ---
const WALK_SRC = `
const fs=require('fs'),path=require('path');
const dirs=['skills','docs','scripts','tests','.claude','dashboard'];
for(const d of dirs){let n=0,b=0;
 (function w(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){if(e.isDirectory()){w(path.join(p,e.name))}else{n++;b+=fs.statSync(path.join(p,e.name)).size;}}})(d);
 console.log(d+': files='+n+' bytes='+b);}
`;

function walkBytes(dirs) {
  let n = 0, b = 0;
  const w = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (e.isDirectory()) w(path.join(p, e.name));
      else { n++; b += fs.statSync(path.join(p, e.name)).size; }
    }
  };
  dirs.forEach((d) => w(path.join(ROOT, d)));
  return { files: n, bytes: b };
}
const inputScale = Object.fromEntries(
  ["skills", "docs", "scripts", "tests", ".claude", "dashboard"]
    .map((d) => [d, walkBytes([d])])
);
inputScale.core = walkBytes(["skills", "docs", "scripts", "tests", ".claude", "dashboard"]);

// --- 타깃 정의 (tests/run-all.sh 단계 호출과 동일) ---
function nodeCheck(files) { return files.map((f) => ({ cmd: NODE, args: ["--check", f] })); }
function bashN(files) { return files.map((f) => ({ cmd: BASH, args: ["-n", f] })); }

const phases = [
  { name: "baseline:node-coldstart", exec: [{ cmd: NODE, args: ["-e", ""] }] },
  { name: "baseline:bash-coldstart", exec: [{ cmd: BASH, args: ["-c", ":"] }] },
  { name: "ref:raw-scan-walk", exec: [{ cmd: NODE, args: ["-e", WALK_SRC] }] },
  { name: "syntax:node-check(4파일)", exec: nodeCheck([".claude/workflows/phase-gate.js", "scripts/context-contract.js", "scripts/handoff-lint.js", "scripts/merge-guard.js", "scripts/package-lint.js"]) },
  { name: "syntax:bash-n(쉘 수트)", exec: bashN(shFiles) },
  ...(JQ ? [{ name: "syntax:jq(settings)", exec: [{ cmd: "jq", args: ["empty", ".claude/settings.json"] }] }] : []),
  { name: "gate:skill-audit", exec: [{ cmd: NODE, args: ["scripts/skill-audit.js"] }] },
  { name: "gate:secret-scan", exec: [{ cmd: NODE, args: ["scripts/secret-scan.js"] }] },
  { name: "gate:tree-exclude", exec: [{ cmd: NODE, args: ["scripts/tree-exclude-check.js"] }] },
  { name: "gate:handoff-lint", exec: [{ cmd: NODE, args: ["scripts/handoff-lint.js"] }] },
  { name: "gate:agents-lint(bash)", exec: [{ cmd: BASH, args: ["tests/agents-lint.sh"] }] },
  { name: "gate:package-lint", exec: [{ cmd: NODE, args: ["scripts/package-lint.js"] }] },
  { name: "gate:design-channel", exec: [{ cmd: NODE, args: ["scripts/design-channel-check.js", "code", "scripts"] }] },
  { name: "gate:hooks-test(bash)", exec: [{ cmd: BASH, args: ["tests/hooks.test.sh"] }] },
  { name: "suite:phase-gate(node --test)", exec: [{ cmd: NODE, args: ["--test", ...testFiles] }] },
];

function statOf(v) {
  const s = [...v].sort((a, b) => a - b);
  const sum = s.reduce((x, y) => x + y, 0);
  return { min: s[0], median: s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2, mean: +(sum / s.length).toFixed(2), max: s[s.length - 1] };
}

function runPhase(ph, samples) {
  const runs = [];
  for (let i = 0; i < samples + 1; i++) {
    const t0 = process.hrtime.bigint();
    let maxStatus = 0;
    for (const { cmd, args } of ph.exec) {
      const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", timeout: 600000 });
      if (r.status === null && r.error) { maxStatus = -1; break; }
      maxStatus = Math.max(maxStatus, r.status);
    }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (i > 0) runs.push(+ms.toFixed(2));
    ph._status = maxStatus;
  }
  return { ...statOf(runs), samples: runs.length, status: ph._status };
}

function spawnOnce(cmd, args, cwd) {
  return new Promise((res) => {
    const t0 = process.hrtime.bigint();
    const c = spawn(cmd, args, { cwd, stdio: "ignore" });
    c.on("error", () => res({ ms: 0, error: "spawn fail" }));
    c.on("close", (code) => res({ ms: Number(process.hrtime.bigint() - t0) / 1e6, code }));
  });
}

async function main() {
  const results = {};
  for (const ph of phases) {
    results[ph.name] = runPhase(ph, ph.name.startsWith("suite") ? PHASE_SAMPLES : SAMPLES);
  }
  // 순차 합계(추정) — suite 제외한 전 단계 median 합 (run-all 순차 실행과 동일 경로 가정)
  const sumSeq = Object.entries(results)
    .filter(([k]) => k.startsWith("gate:") || k.startsWith("syntax:") || k.includes("agents-lint") || k.includes("hooks-test"))
    .reduce((s, [, v]) => s + v.median, 0);
  results["estimate:run-all-순차-합계"] = { median: +sumSeq.toFixed(2), basis: "위 단계 median 합(추정)" };

  // 병렬 실험: 핵심 node 게이트 6종 동시 스폰 (in-process 병합 아님, 프로세스 분리 병렬)
  const parallelSet = [
    { cmd: NODE, args: ["scripts/skill-audit.js"] },
    { cmd: NODE, args: ["scripts/secret-scan.js"] },
    { cmd: NODE, args: ["scripts/tree-exclude-check.js"] },
    { cmd: NODE, args: ["scripts/handoff-lint.js"] },
    { cmd: NODE, args: ["scripts/package-lint.js"] },
    { cmd: NODE, args: ["scripts/design-channel-check.js", "code", "scripts"] },
  ];
  if (!NO_PARALLEL) {
    const parRuns = [];
    let parStatus = 0;
    for (let i = 0; i < 3; i++) {
      const t0 = process.hrtime.bigint();
      const codes = await Promise.all(parallelSet.map((j) => spawnOnce(j.cmd, j.args, ROOT)));
      parRuns.push(+(Number(process.hrtime.bigint() - t0) / 1e6).toFixed(2));
      parStatus = Math.max(parStatus, ...codes.map((c) => c.code || 0));
    }
    const seqSum = parallelSet.map((j) => {
      const k = "gate:" + j.args[0].split("/").pop().replace(".js", "");
      return results[k] ? results[k].median : 0;
    }).reduce((a, b) => a + b, 0);
    results["exp:병렬6게이트-동시"] = { ...statOf(parRuns), seqSumOfMedians: +seqSum.toFixed(2), status: parStatus };
  }

  // 쓰기 생성기: 임시 복사본(원본 트리 불변)에서 측정.
  // 1차 실행에서 skill-catalog/generate.js가 __dirname 기준 절대 경로로 출력
  // (ROOT/docs/skill-catalog.md)하는 것이 확인되어 scripts/도 함께 복사해 복사본에서 실행한다.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ah-perf-"));
  try {
    for (const d of ["skills", "scripts", "docs", "dashboard"]) {
      fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
    }
    const genTargets = [
      { name: "write:skill-catalog-generate", args: [path.join(tmp, "scripts", "skill-catalog", "generate.js")] },
      { name: "write:dashboard-status", args: [path.join(ROOT, "scripts", "dashboard-status.js")] },
    ];
    for (const g of genTargets) {
      const runs = [];
      for (let i = 0; i < 4; i++) {
        const t0 = process.hrtime.bigint();
        const r = spawnSync(NODE, g.args, { cwd: tmp, stdio: "ignore", timeout: 120000 });
        if (i > 0) runs.push(+(Number(process.hrtime.bigint() - t0) / 1e6).toFixed(2));
        g._status = r.status;
      }
      results[g.name] = { ...statOf(runs), samples: runs.length, status: g._status };
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const report = {
    tool: "scripts/perf-bench.js",
    measuredAt: new Date().toISOString(),
    env: {
      node: process.version, platform: process.platform, arch: process.arch,
      cpu: os.cpus()[0] ? os.cpus()[0].model : "n/a",
      bash: BASH, jq: JQ || "missing(해당 syntax 단계 제외)",
    },
    inputScale,
    testFiles: testFiles.length,
    results,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ out: outPath, env: report.env, inputScale, results }, null, 2));
}

main().catch((e) => { console.error("perf-bench error:", e); process.exit(1); });
