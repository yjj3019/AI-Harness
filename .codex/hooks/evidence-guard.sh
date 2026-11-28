#!/usr/bin/env bash
# Subagent PreToolUse guard for .phase-evidence/ and the gate's trust set (Codex host).
# Usage: evidence-guard.sh auto   (hooks.json: subagents only; test agent -> test, others -> deny)
#        evidence-guard.sh deny   (guard selected edits and Bash calls; Read is not blocked)
#        evidence-guard.sh test   (may only call `phase-gate run`)
# Only the orchestrator (main session) records evidence, through phase-gate.js.
# Path matching is a guardrail, not a security boundary: symlinks, other aliases,
# other tools and indirect writes are not resolved; host tool semantics are unverified.
# Fail-closed if jq is missing, the input is unparsable, or an inspection cannot run.
# Every allow/deny decision below uses bash builtins only ([[ =~ ]], case, parameter expansion), so a PATH
# without grep or sed can never turn a deny into an allow.

set -u

mode=${1:-deny}
input=$(cat)
[ -n "$input" ] || { echo "Blocked by .codex/hooks/evidence-guard.sh: empty hook input" >&2; exit 2; }
if ! command -v jq >/dev/null 2>&1; then
  # Without jq the input cannot be parsed. In auto mode only, input that never mentions
  # agent_id/agent_type is the main session (unrestricted); every other case stays
  # fail-closed. A substring test, not parsing: a false match blocks, never allows.
  if [ "$mode" = auto ]; then
    case $input in *agent_id*|*agent_type*) ;; *) exit 0 ;; esac
  fi
  echo "Blocked by .codex/hooks/evidence-guard.sh: jq is required (install: winget install jqlang.jq | apt install jq | brew install jq)" >&2
  exit 2
fi
# Parse the tool and agent classification in one jq process. Emit only fixed
# tokens, so arbitrary JSON strings cannot become shell syntax or delimiters.
parsed=$(printf '%s' "$input" | jq -r '
  ((.tool_name // "") | if type == "string" then sub("\\n+$"; "") else . end) as $tool |
  (if $tool == "apply_patch" then "apply_patch"
   elif $tool == "Write" then "Write"
   elif $tool == "Edit" then "Edit"
   elif $tool == "MultiEdit" then "MultiEdit"
   elif $tool == "NotebookEdit" then "NotebookEdit"
   elif $tool == "Bash" then "Bash"
   elif $tool == "PowerShell" then "PowerShell"
   elif ($tool | startswith("mcp__")) then "mcp"
   else "other" end),
  (if (((.agent_id // "") | tostring | length) > 0 or
       ((.agent_type // "") | tostring | length) > 0) then
     if .agent_type == "test" then "test" else "deny" end
   else "main" end)' 2>/dev/null) || { echo "Blocked by .codex/hooks/evidence-guard.sh: invalid hook input" >&2; exit 2; }
tool=${parsed%%$'\n'*}
agent_mode=${parsed#*$'\n'}
# Native Windows jq may emit CRLF even when called from Git Bash.
tool=${tool%$'\r'}
agent_mode=${agent_mode%$'\r'}

# Missing identity is treated as main; Codex tool-event identity is not verified.
if [ "$mode" = auto ]; then
  [ "$agent_mode" != main ] || exit 0
  mode=$agent_mode
fi

block() {
  echo "Blocked by .codex/hooks/evidence-guard.sh: $1" >&2
  exit 2
}

shopt -s nocasematch   # case-insensitive [[ =~ ]] and case; bash 3.2 has no ${var,,}

# Separators once: backslashes to slashes, then collapse // and /./ (lexical only).
norm_path() {
  local p=${1//\\//}
  while [[ $p == *//* ]]; do p=${p//\/\///}; done
  while [[ $p == */./* ]]; do p=${p//\/.\///}; done
  printf '%s' "$p"
}

# Win32 ignores trailing dots and spaces on a path component, so "x.sh." and ".claude./hooks" name the same files as
# "x.sh" and ".codex/hooks". Strip them from every component ("." and ".." components are left alone).
strip_win32_tails() {
  local p=$1
  while [[ $p =~ ^(.*[^/.\ ])[.\ ]+(/.*)?$ ]]; do p=${BASH_REMATCH[1]}${BASH_REMATCH[2]}; done
  printf '%s' "$p"
}
# 8.3 short names (CLAUDE~1, WORKFL~1, SETTIN~1.JSO ...) can alias any protected directory or file, and a path
# check by long name cannot see them, so a subagent may not write through any "~N" component.
re_short_names='(^|/)[^/]*~[0-9]'
# The attestation signing key: a subagent may neither write nor name it (reading it is signing).
re_signing_key='(^|/)\.harness(/|$)|attest-ed25519|attest[-_]keygen|attest[-_]?key[-_]?file|attest[-_]?key\.pem'

# Any component that starts with ".phase-" is treated as the evidence directory: this also covers
# trailing Win32 dots/spaces and NTFS stream suffixes (".phase-evidence." ".phase-evidence :$DATA").
# "phase-~N" is the Windows 8.3 short name of such a directory.
re_evidence_component='(^|/)(\.phase-|phase-~[0-9])'
# A dot-prefixed component that contains a glob character can expand to the evidence directory.
re_dot_glob_path='(^|/)\.[^/]*[*?\[{]'
# The gate's trust base: files whose content decides what a PASS means. Subagents may not edit them.
# docs/attestations/ is written by `phase-gate.js attest` only: a hand-edited attestation is not evidence.
re_trust_set='(^|/)(\.claude/(workflows/|hooks/|settings[^/]*\.json$|required-test-command\.json$|attestation-public-key\.pem$)|\.codex/(hooks/|hooks\.json$|config\.toml$)|\.github/(workflows/|required-phases\.json$|CODEOWNERS$)|CODEOWNERS$|docs/attestations/|tests/run-all\.sh$|scripts/(phase-definition|context-contract|tree-exclude-check|merge-guard|verify-attestation-inventory|test-summary-gate|secret-scan|source-adoption-check)\.js$)|(^|/)phase-gate\.js[.\ ]*(:[^/]*)?$'

check_write_path() { # check_write_path <raw path>
  local raw=$1 norm real
  [ -n "$raw" ] || block "missing file path in the tool input"
  norm=$(strip_win32_tails "$(norm_path "$raw")")
  [[ $norm =~ $re_signing_key ]] && block "the attestation signing key is for the orchestrator only"
  [[ $norm =~ $re_short_names ]] && block "an 8.3 short name may alias a protected directory; use the long name"
  [[ $norm =~ $re_evidence_component ]] && block "only the orchestrator records evidence"
  [[ $norm =~ $re_dot_glob_path ]] && block "a wildcard in a dot-prefixed path component may reach .phase-evidence"
  [[ $norm =~ $re_trust_set ]] && block "only the orchestrator may modify the gate and its guards ($norm)"
  # Best-effort realpath for existing targets (catches symlinks). A missing realpath is skipped; a failing one is not.
  if [ -e "$raw" ] && command -v realpath >/dev/null 2>&1; then
    real=$(realpath "$raw" 2>/dev/null) || block "cannot resolve the target path"
    real=$(strip_win32_tails "$(norm_path "$real")")
    [[ $real =~ $re_evidence_component ]] && block "only the orchestrator records evidence"
    [[ $real =~ $re_trust_set ]] && block "only the orchestrator may modify the gate and its guards"
  fi
  return 0
}

check_command() { # check_command <command text> (Bash and PowerShell)
  local cmd=$1 rest prefix tail
  # Evidence directory, its 8.3 alias, or a dot-prefixed wildcard that can expand to it.
  local re_cmd_evidence='\.phase-|phase-~[0-9]|\[\.\]phase|phase-g[^[:space:]]*[*?\[]'
  local re_cmd_dot_glob='(^|[[:space:]/="'"'"'])(\.[*?\[{]|\.[^[:space:]/.][^[:space:]/]*[*?\[{])'
  [[ $cmd =~ $re_cmd_evidence ]] && block "commands must not touch .phase-evidence/"
  [[ ${cmd//\\//} =~ $re_signing_key ]] && block "commands must not name the attestation signing key"
  [[ $cmd =~ $re_cmd_dot_glob ]] && block "a dot-prefixed wildcard may expand to .phase-evidence; name the paths explicitly"
  # A command that names a trust-set path and also writes (redirect, sed -i, tee, cp, mv, rm, git apply, Set-Content ...).
  # Reading, running and diffing those files stays allowed. Lexical only: variables, indirection, python -c and
  # node -e writers evade it. Backslashes are read as slashes, and the path may carry any prefix (absolute, ../,
  # $CLAUDE_PROJECT_DIR/ ...), so the match is not anchored to the start of a word.
  local cmd_n=${cmd//\\//}
  local re_cmd_trust='(\.claude/(workflows|hooks)(/|[[:space:]"'"'"';&|)]|$)|\.claude/(settings[^[:space:]/]*\.json|required-test-command\.json|attestation-public-key\.pem)|\.codex/(hooks(/|[[:space:]"'"'"';&|)]|$)|hooks\.json|config\.toml)|\.github/(workflows(/|[[:space:]"'"'"';&|)]|$)|required-phases\.json|CODEOWNERS)|(^|[^A-Za-z0-9_.-])CODEOWNERS|docs/attestations(/|[[:space:]"'"'"';&|)]|$)|tests/run-all\.sh|scripts/(phase-definition|context-contract|tree-exclude-check|merge-guard|verify-attestation-inventory|test-summary-gate|secret-scan|source-adoption-check)\.js)'
  local re_cmd_write='(sed|perl)([[:space:]]+-[^[:space:]]+)*[[:space:]]+-[a-zA-Z]*i|--in-place|(^|[[:space:];&|(])(tee|cp|mv|rm|install|truncate|ln|patch|chmod|chown|dd|sponge|touch|unlink|rsync|curl|wget)[[:space:]]|git[[:space:]]+(apply|checkout|restore|reset|stash|rm|mv|clean)|find[[:space:]].*-delete|(Set|Add|Out|New|Remove|Move|Copy|Rename)-(Content|Item|File)'
  # Redirects: drop the harmless ones (to /dev/null, and fd duplication such as 2>&1), then any ">" left is a write,
  # including 1>, &> and >>.
  local cmd_w=$cmd_n
  local re_devnull='^(.*)[0-9]*[&]?[>][>]?[[:space:]]*/dev/null(.*)$' re_fddup='^(.*)[0-9]*[>][&][0-9-]+(.*)$'
  while [[ $cmd_w =~ $re_devnull ]]; do cmd_w=${BASH_REMATCH[1]}${BASH_REMATCH[2]}; done
  while [[ $cmd_w =~ $re_fddup ]]; do cmd_w=${BASH_REMATCH[1]}${BASH_REMATCH[2]}; done
  local re_cmd_redirect='[>]'
  if [[ $cmd_n =~ $re_cmd_trust ]] && { [[ $cmd_n =~ $re_cmd_write ]] || [[ $cmd_w =~ $re_cmd_redirect ]]; }; then
    block "a command that writes the gate's trust set (hooks, settings, command pin, run-all.sh, CI) is for the orchestrator only"
  fi
  # 8.3 short names of protected directories and files in command text (HEAD~1 and similar stay allowed).
  local re_cmd_short='(claude|codex|github|workfl|settin|requir|contex|verify|merge-)[a-z0-9_-]*~[0-9]'
  [[ $cmd_n =~ $re_cmd_short ]] && block "an 8.3 short name may alias a protected path; use the long name"
  # Every mention of the gate, with or without the .js extension and quoting. Walk from the last one.
  local re_gate='^(.*)(phase-gate(\.js)?(["'"'"']|[[:space:]]|$))(.*)$'
  local re_run='^phase-gate(\.js)?["'"'"']?[[:space:]]+run([[:space:]]|$)'
  rest=$cmd
  while [[ $rest =~ $re_gate ]]; do
    prefix=${BASH_REMATCH[1]}
    tail=${BASH_REMATCH[2]}${BASH_REMATCH[5]}
    [ "$mode" = test ] || block "phase-gate is called by the orchestrator only"
    [[ $tail =~ $re_run ]] || block "the test agent may only call phase-gate run"
    rest=$prefix
  done
  return 0
}

case "$tool" in
  apply_patch)
    patch=$(printf '%s' "$input" | jq -er '.tool_input.command | select(type == "string" and length > 0)' 2>/dev/null) || block "invalid patch input"
    patch_paths=0
    re_patch_header='^\*\*\* (Add File|Update File|Delete File|Move to): (.*)$'
    while IFS= read -r line || [ -n "$line" ]; do
      line=${line%$'\r'}
      if [[ $line =~ $re_patch_header ]]; then
        patch_paths=$((patch_paths + 1))
        check_write_path "${BASH_REMATCH[2]}"
      fi
    done <<<"$patch"
    [ "$patch_paths" -gt 0 ] || block "patch without any file header"
    ;;
  Write | Edit | MultiEdit | NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null) || block "invalid tool input"
    path=${path%$'\r'}
    # The test agent's run exception applies to Bash invocation, not direct edits.
    check_write_path "$path"
    ;;
  Bash | PowerShell)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) || block "invalid tool input"
    check_command "$cmd"
    ;;
  mcp)
    # Unknown MCP tools may write files. Without parsing each schema, refuse any that mention the
    # evidence directory or its alias anywhere in their input.
    re_mcp='\.phase-|phase-~[0-9]'
    [[ $input =~ $re_mcp ]] && block "MCP tool input must not touch .phase-evidence/"
    ;;
esac

exit 0
