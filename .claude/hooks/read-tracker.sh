#!/usr/bin/env bash
# PostToolUse(Read) hook: records which evidence files the verify subagent opened.
# phase-gate.js refuses to record verify PASS unless the test log was opened (Default-FAIL:
# evidence must be read before a verdict). Hook input carries agent_type only inside a subagent.
# Only this script writes .phase-evidence/.reads.jsonl; subagents cannot touch .phase-evidence/
# through Write/Edit/Bash (evidence-guard.sh). Guardrail, not a security boundary.
# Fail-open if jq or sha256sum is missing (phase-gate.js then refuses PASS, which is the safe side).

set -u
command -v jq >/dev/null 2>&1 || exit 0
command -v sha256sum >/dev/null 2>&1 || exit 0

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$tool" = Read ] || exit 0
agent=$(printf '%s' "$input" | jq -r '.agent_type // empty' 2>/dev/null) || exit 0
[ "$agent" = verify ] || exit 0

file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -n "$file" ] || exit 0

root=${CLAUDE_PROJECT_DIR:-$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)}
[ -n "$root" ] || exit 0
root=$(realpath -e "$root" 2>/dev/null) || exit 0
dir=$(realpath -m "$root/.phase-evidence" 2>/dev/null) || exit 0
case "$file" in /*) abs=$file ;; *) abs=$root/$file ;; esac
real=$(realpath -e "$abs" 2>/dev/null) || exit 0

case "$real" in
  "$dir"/*) ;;
  *) exit 0 ;;
esac
[ -f "$real" ] || exit 0

sha=$(sha256sum "$real" | cut -d' ' -f1)
rel=${real#"$root"/}
jq -nc --arg p "$rel" --arg s "$sha" --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{path:$p, sha256:$s, at:$t, agent_type:"verify"}' >>"$dir/.reads.jsonl" 2>/dev/null || true
exit 0
