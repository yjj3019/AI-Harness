#!/usr/bin/env bash
# Single entry point for local checks and CI.
set -eu
cd "$(dirname "$0")/.."

echo "== syntax =="
node --check .claude/workflows/phase-gate.js
node --check scripts/context-contract.js
node --check scripts/handoff-lint.js
for h in .claude/hooks/*.sh tests/*.sh; do bash -n "$h"; done
jq empty .claude/settings.json
echo "ok"

echo "== handoff drift =="
node scripts/handoff-lint.js

echo "== frontmatter =="
bash tests/agents-lint.sh

echo "== hooks =="
bash tests/hooks.test.sh

echo "== phase-gate =="
node --test tests/*.test.js

echo "ALL CHECKS PASSED"
