#!/usr/bin/env bash
# PostToolUse(Read) hook: records which evidence files the verify subagent opened.
# phase-gate.js refuses to record verify PASS unless the test log was opened (Default-FAIL:
# evidence must be read before a verdict). Hook input carries agent_type only inside a subagent.
# Only this script writes .phase-evidence/.reads.jsonl; subagents cannot touch .phase-evidence/
# through Write/Edit/Bash (evidence-guard.sh). Guardrail, not a security boundary.
# Fail-open if jq or sha256sum is missing (phase-gate.js then refuses PASS, which is the safe side).
#
# Paths reach this hook in three shapes: POSIX (/home/x), native Windows (C:\x) and the
# forward-slash Windows form (C:/x). Each is converted to what this shell's realpath understands
# before the comparison. Without that a Windows read is never recorded, and verify PASS stays
# refused on that platform, which is the opposite of what the guard is for.

set -u
command -v jq >/dev/null 2>&1 || { echo "read-tracker: jq missing; verify PASS will be refused" >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo "read-tracker: sha256sum missing; verify PASS will be refused" >&2; exit 2; }

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$tool" = Read ] || exit 0
agent=$(printf '%s' "$input" | jq -r '.agent_type // empty' 2>/dev/null) || exit 0
[ "$agent" = verify ] || exit 0

file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -n "$file" ] || exit 0

root=${CLAUDE_PROJECT_DIR:-$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)}
[ -n "$root" ] || exit 0

# Resolve without GNU-only flags: BSD/macOS realpath has neither -e nor -m.
# Git Bash can spell one location two ways (/tmp/x and /c/Users/.../Temp/x); fold both through the
# Windows form so the root and the read path compare equal.
canon() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -u "$(cygpath -m "$1")" 2>/dev/null || printf '%s' "$1"; else printf '%s' "$1"; fi
}
abspath() {
  local out
  out=$(realpath -e "$1" 2>/dev/null) && [ -n "$out" ] && { canon "$out"; return 0; }
  out=$(realpath "$1" 2>/dev/null) && [ -n "$out" ] && { canon "$out"; return 0; }
  return 1
}

# Convert a Windows path to the form this shell resolves (Git Bash: cygpath, WSL: wslpath).
shell_path() {
  case "$1" in
    [A-Za-z]:[\\/]*)
      if command -v cygpath >/dev/null 2>&1; then cygpath -u "$1"
      elif command -v wslpath >/dev/null 2>&1; then wslpath -u "$1"
      else printf '%s' "$1"; fi
      ;;
    *) printf '%s' "$1" ;;
  esac
}

root=$(shell_path "$root")
file=$(shell_path "$file")
root=$(abspath "$root") || exit 0
dir=$(abspath "$root/.phase-evidence") || exit 0

case "$file" in
  /*) abs=$file ;;
  *) abs=$root/$file ;;
esac
real=$(abspath "$abs") || exit 0

case "$real" in
  "$dir"/*) ;;
  *) exit 0 ;;
esac
[ -f "$real" ] || exit 0

rel=${real#"$root"/}
# Only gate-produced test log names map unambiguously to a phase epoch.
case "$rel" in
  .phase-evidence/phase-*-test.log) phase=${rel#.phase-evidence/phase-}; phase=${phase%-test.log} ;;
  *) exit 0 ;;
esac
case "$phase" in ''|*[!A-Za-z0-9._-]*) exit 0 ;; esac
token_file="$dir/phase-$phase-read-token"
token=$(cat "$token_file" 2>/dev/null) || exit 0
[[ $token =~ ^[a-f0-9]{64}$ ]] || exit 0
sha=$(sha256sum "$real" | cut -d' ' -f1)
[ "$(cat "$token_file" 2>/dev/null)" = "$token" ] || exit 0
jq -nc --arg p "$rel" --arg s "$sha" --arg phase "$phase" --arg token "$token" --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{path:$p, sha256:$s, phase:$phase, token:$token, at:$t, agent_type:"verify"}' >>"$dir/.reads.jsonl" 2>/dev/null || true
exit 0
