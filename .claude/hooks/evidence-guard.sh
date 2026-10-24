#!/usr/bin/env bash
# Subagent PreToolUse guard for .phase-evidence/.
# Usage: evidence-guard.sh deny   (coding, verify, compound: no access to evidence or phase-gate.js)
#        evidence-guard.sh test   (test: may only call `phase-gate.js run`)
# Only the orchestrator (main session) records evidence, through phase-gate.js.
# Pattern matching is a guardrail, not a security boundary. Fail-open if jq is missing.

set -u

mode=${1:-deny}
command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

block() {
  echo "Blocked by .claude/hooks/evidence-guard.sh: $1" >&2
  exit 2
}

case "$tool" in
  Write | Edit | MultiEdit | NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)
    if printf '%s' "$path" | grep -Eq '(^|/)\.phase-evidence(/|$)'; then
      block "only the orchestrator records evidence"
    fi
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
    if printf '%s' "$cmd" | grep -Fq '.phase-evidence'; then
      block "commands must not touch .phase-evidence/"
    fi
    uses=$(printf '%s' "$cmd" | grep -Eo 'phase-gate\.js[[:space:]]*[A-Za-z]*' || true)
    if [ -n "$uses" ]; then
      [ "$mode" = "test" ] || block "phase-gate.js is called by the orchestrator only"
      while IFS= read -r use; do
        [ -n "$use" ] || continue
        printf '%s' "$use" | grep -Eq '^phase-gate\.js[[:space:]]+run$' || block "the test agent may only call phase-gate.js run"
      done <<<"$uses"
    fi
    ;;
esac

exit 0
