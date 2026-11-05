#!/usr/bin/env bash
# Single entry point for local checks and CI.
set -eu
cd "$(dirname "$0")/.."

echo "== test inventory =="
# Count only files, not an unmatched glob or a directory named like a suite.
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

echo "== skill audit =="
node scripts/skill-audit.js

echo "== secret scan =="
node scripts/secret-scan.js

echo "== tree exclude =="
node scripts/tree-exclude-check.js

echo "== handoff drift =="
node scripts/handoff-lint.js

echo "== frontmatter =="
bash tests/agents-lint.sh
node scripts/package-lint.js

echo "== hooks =="
bash tests/hooks.test.sh

echo "== phase-gate =="
node --test "${test_files[@]}"

echo "ALL CHECKS PASSED"
