#!/usr/bin/env bash
# Subagent PreToolUse guard for .phase-evidence/.
# Usage: evidence-guard.sh auto   (settings.json: subagents only; test agent -> test, others -> deny)
#        evidence-guard.sh deny   (guard selected edits and Bash calls; Read is not blocked)
#        evidence-guard.sh test   (may only call `phase-gate.js run`)
# Only the orchestrator (main session) records evidence, through phase-gate.js.
# Path matching is a guardrail, not a security boundary: symlinks, other aliases,
# other tools and indirect writes are not resolved; host tool semantics are unverified.
# Fail-closed if jq is missing or critical input is unparsable.

set -u

mode=${1:-deny}
command -v jq >/dev/null 2>&1 || { echo "Blocked by .codex/hooks/evidence-guard.sh: jq is required" >&2; exit 2; }

input=$(cat)
[ -n "$input" ] || { echo "Blocked by .codex/hooks/evidence-guard.sh: empty hook input" >&2; exit 2; }
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null) || { echo "Blocked by .codex/hooks/evidence-guard.sh: invalid hook input" >&2; exit 2; }

# auto: registered in settings.json, so it runs for every tool call. Claude Code adds
# agent_id / agent_type to the hook input only inside a subagent. The main session
# (the orchestrator) is not restricted. Agent frontmatter hooks are skipped until the
# workspace trust dialog is accepted, so settings.json is the authority.
if [ "$mode" = auto ]; then
  agent_id=$(printf '%s' "$input" | jq -r '.agent_id // empty' 2>/dev/null) || { echo "Blocked by .codex/hooks/evidence-guard.sh: invalid agent fields" >&2; exit 2; }
  agent_type=$(printf '%s' "$input" | jq -r '.agent_type // empty' 2>/dev/null) || { echo "Blocked by .codex/hooks/evidence-guard.sh: invalid agent fields" >&2; exit 2; }
  # Empty agent fields mean the main session (orchestrator). That is allowed.
  [ -n "$agent_id$agent_type" ] || exit 0
  if [ "$agent_type" = test ]; then mode=test; else mode=deny; fi
fi

block() {
  echo "Blocked by .codex/hooks/evidence-guard.sh: $1" >&2
  exit 2
}

case "$tool" in
  Write | Edit | MultiEdit | NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)
    # Lexical check for non-existent paths: normalize separators once, then match.
    norm=$(printf '%s' "$path" | sed 's|\\|/|g; s|//|/|g; s|/\./|/|g')
    if printf '%s' "$norm" | grep -Eiq '(^|/)\.phase-evidence(/|$)'; then
      block "only the orchestrator records evidence"
    fi
    if printf '%s' "$path" | grep -Eiq '(^|[\\/])\.phase-evidence([\\/]|$)'; then
      block "only the orchestrator records evidence"
    fi
    # Best-effort realpath for existing targets (catches symlinks).
    if [ -n "$path" ] && [ -e "$path" ]; then
      real=$(realpath "$path" 2>/dev/null || true)
      if [ -n "$real" ] && printf '%s' "$real" | grep -Eiq '(^|[\\/])\.phase-evidence([\\/]|$)'; then
        block "only the orchestrator records evidence"
      fi
    fi
    # Conservatively treat trailing Win32 dots/spaces and NTFS stream suffixes
    # as aliases, even on POSIX. This does not resolve other filesystem aliases.
    # The test agent's run exception applies to Bash invocation, not direct edits.
    if (shopt -s nocasematch; [[ $path =~ (^|[\\/])phase-gate\.js[.\ ]*(:[^\\/]*)?$ ]]); then
      block "only the orchestrator may modify phase-gate.js"
    fi
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
    if printf '%s' "$cmd" | grep -Fiq '.phase-evidence'; then
      block "commands must not touch .phase-evidence/"
    fi
    uses=$(printf '%s' "$cmd" | grep -Eio 'phase-gate\.js["'"'"']?[[:space:]]*[A-Za-z]*' || true)
    if [ -n "$uses" ]; then
      [ "$mode" = "test" ] || block "phase-gate.js is called by the orchestrator only"
      while IFS= read -r use; do
        [ -n "$use" ] || continue
        printf '%s' "$use" | grep -Eiq '^phase-gate\.js["'"'"']?[[:space:]]+run$' || block "the test agent may only call phase-gate.js run"
      done <<<"$uses"
    fi
    ;;
esac

exit 0
