#!/usr/bin/env bash
# Single entry point for local checks and CI.
# Usage: bash tests/run-all.sh [--fast]
#   기본(기본값): 전체 수트 (CI와 동일). --fast: 게이트 블록까지 실행, 무거운 E2E(node --test) 생략.
#   게이트 블록은 병렬 실행 후 원 순서대로 출력한다 (1.2.0 개선: 6게이트 병렬 실측 -54%,
#   docs/perf-bench-2026-11-14.md).
set -eu
cd "$(dirname "$0")/.."

mode=full
if [ "${1:-}" = "--fast" ]; then mode=fast; fi

# Prerequisites: node (>=20), bash, jq. Fail with a clear message instead of a late, opaque error.
for tool in node jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: missing required tool '$tool' (see README prerequisites)." >&2
    exit 2
  fi
done
command -v bash >/dev/null 2>&1 || { echo "ERROR: missing required tool 'bash'." >&2; exit 2; }

echo "== mode: ${mode} =="

echo "== test inventory =="
test_files=()
for file in tests/*.test.js; do
  [ -f "$file" ] && test_files+=("$file")
done
count=${#test_files[@]}
floor=15
echo "test files: $count (floor $floor)"
if [ "$count" -lt "$floor" ]; then
  echo "ERROR: test file count $count is below the floor $floor. A suite file was probably removed or renamed; restore it, or adjust the floor in tests/run-all.sh deliberately." >&2
  exit 2
fi

echo "== syntax =="
node --check .claude/workflows/phase-gate.js
node --check scripts/context-contract.js
node --check scripts/handoff-lint.js
node --check scripts/merge-guard.js
node --check scripts/package-lint.js
for h in .claude/hooks/*.sh tests/*.sh; do bash -n "$h"; done
jq empty .claude/settings.json
echo "ok"

echo "== gates (병렬 실행, 순서 보존 출력) =="
tmp_dir=$(mktemp -d)
phase() {
  label=$1; shift
  ( "$@" >"$tmp_dir/out.$label" 2>&1; echo $? >"$tmp_dir/st.$label" ) &
}
phase skill-audit node scripts/skill-audit.js
phase secret-scan node scripts/secret-scan.js
phase tree-exclude node scripts/tree-exclude-check.js
phase handoff-lint node scripts/handoff-lint.js
phase agents-lint bash tests/agents-lint.sh
phase package-lint node scripts/package-lint.js
phase design-channel node scripts/design-channel-check.js code scripts
phase eval-set node scripts/eval-set-check.js
phase hooks bash tests/hooks.test.sh
wait
fails=0
for l in skill-audit secret-scan tree-exclude handoff-lint agents-lint package-lint design-channel eval-set hooks; do
  echo "== $l =="
  cat "$tmp_dir/out.$l"
  s=$(cat "$tmp_dir/st.$l" 2>/dev/null || echo 2)
  [ "$s" = 0 ] || fails=1
done
rm -rf "$tmp_dir"
if [ "$fails" -ne 0 ]; then echo "A GATE FAILED" >&2; exit 2; fi

if [ "$mode" = "fast" ]; then
  echo "== mode fast: 무거운 E2E(node --test) 생략 — 전체는 기본 모드 (CI와 동일) =="
  echo "ALL CHECKS PASSED (fast)"
  exit 0
fi

echo "== phase-gate =="
node --test "${test_files[@]}"

echo "ALL CHECKS PASSED"
