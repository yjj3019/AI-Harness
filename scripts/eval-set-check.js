"use strict";
// eval-set-check.js — 고정 평가 입력물 대조 게이트 (harness-reinforcement-plan A1).
//   node scripts/eval-set-check.js    docs/eval-set/eval-set.json (기본)
// 고정 목록의 파일이 누락·변경(schema 불일치·sha256 불일치)이면 exit 1.
// 평가 기준이 흔들리면 평가가 무의미해지므로 의도적 갱신만 허용 (CHANGELOG 기록 의무).
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const file = process.argv[2] || path.join(__dirname, "..", "docs", "eval-set", "eval-set.json");

function main() {
  const list = JSON.parse(fs.readFileSync(file, "utf8"));
  if (list.schema !== 1 || !Array.isArray(list.entries) || list.entries.length === 0) {
    process.stderr.write("eval-set-check: invalid eval-set manifest\n");
    process.exit(2);
  }
  const bad = [];
  for (const e of list.entries) {
    if (typeof e.path !== "string" || typeof e.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(e.sha256)) {
      bad.push(e.path + " (schema)");
      continue;
    }
    const p = path.join(path.dirname(file), e.path);
    if (!fs.existsSync(p)) { bad.push(e.path + " (missing)"); continue; }
    const actual = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
    if (actual !== e.sha256) bad.push(e.path + ` (sha256 mismatch ${actual.slice(0, 12)}…)`);
  }
  if (bad.length) {
    process.stderr.write("eval-set-check: pinned eval inputs changed: " + bad.join(", ") + "\n");
    process.exit(1);
  }
  process.stdout.write(`eval-set-check: ${list.entries.length} pinned eval inputs match (sha256)\n`);
}

main();
