#!/usr/bin/env bash
# PreToolUse(Bash) guardrail: deny a short list of destructive commands.
# Pattern matching is a guardrail, not a security boundary. Variants can slip through.
# Fail-closed: if jq is missing or the input is unparsable, the command is denied.

set -u

command -v jq >/dev/null 2>&1 || { echo "Blocked by .codex/hooks/block-destructive.sh: jq is required" >&2; exit 2; }

input=$(cat)
[ -n "$input" ] || { echo "Blocked by .codex/hooks/block-destructive.sh: empty hook input" >&2; exit 2; }
# Windows jq's text-mode stdout can duplicate CR in embedded CRLF JSON strings.
# Normalize doubled and ordinary CRLF to LF before lexing Bash continuations.
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) || { echo "Blocked by .codex/hooks/block-destructive.sh: invalid hook input" >&2; exit 2; }
cmd=${cmd//$'\r\r\n'/$'\n'}
cmd=${cmd//$'\r\n'/$'\n'}
[ -n "$cmd" ] || exit 0

deny() {
  echo "Blocked by .codex/hooks/block-destructive.sh: $1. Ask the user to run it or approve it explicitly." >&2
  exit 2
}

# A small lexical guard, NOT a shell parser: group literal words/quotes/escapes and scope
# rm/chmod predicates to one simple command. Never eval or execute the supplied text.
# No expansion, aliases/functions, substitutions, heredocs, redirections or path resolution.
# Those constructs can evade this guard (or cause false positives); host permissions are required.
protected_rm_target() {
  local target=$1
  # Normalize drive-root separators for the lexical matcher, then check the protected roots.
  target=${target//\\//}
  while [[ "$target" != / && "$target" == */ ]]; do target=${target%/}; done
  # A leading ./ or ../ aliases the same entries: `rm -rf ./*` and `rm -rf ../*`
  # must hit the `*` branch that bare `*` hits.
  while [[ "$target" == ./* || "$target" == ../* ]]; do
    target=${target#./}; target=${target#../}
  done
  case "$target" in
    /|/\*|'~'|'$HOME'|'${HOME}'|'$PWD'|'${PWD}'|.|..|\*) return 0 ;;
    '~/'*|'$HOME/'*|'${HOME}/'*|'$PWD/'*|'${PWD}/'*|'$USERPROFILE'|'${USERPROFILE}'|'$USERPROFILE/'*|'${USERPROFILE}/'*) return 0 ;;
    # Windows user profiles as written on native Windows and through MSYS drive mounts.
    [A-Za-z]:|[A-Za-z]:/*|[A-Za-z]:/Windows|[A-Za-z]:/Windows/*|[A-Za-z]:/Program\ Files|[A-Za-z]:/Program\ Files/*|[A-Za-z]:/ProgramData|[A-Za-z]:/ProgramData/*) return 0 ;;
    [A-Za-z]:/[Uu][Ss][Ee][Rr][Ss]|[A-Za-z]:/[Uu][Ss][Ee][Rr][Ss]/*|/[A-Za-z]|/[A-Za-z]/*) return 0 ;;

    # Explicit protected roots include descendants; /tmp/build remains allowed.
    /bin/*|/sbin/*|/boot/*|/dev/*|/etc/*|/home/*|/root/*|/usr/*|/var/*|/lib/*|/lib64/*|/opt/*|/srv/*|/proc/*|/sys/*|/run/*|/mnt/*|/media/*) return 0 ;;
  esac
  [[ "$target" =~ ^/[A-Za-z0-9._-]+$ ]]
}
check_simple_command() {
  local i=0 name recursive=0 broad=0 end_options=0 mode='' word git_subcommand='' skip_value=0 push_option=0
  [ "${#words[@]}" -gt 0 ] || return 0
  # Common literal wrappers only; wrapper options are intentionally not interpreted.
  while [[ "${words[$i]:-}" == sudo || "${words[$i]:-}" == command ]]; do i=$((i + 1)); done
  name=${words[$i]:-}; name=${name##*/}
  if [[ "$name" == git ]]; then
    # Recognize git global options that precede subcommand, including `git -C dir push`.
    # This remains lexical matching; it does not interpret aliases, env wrappers, or shell expansion.
    for ((i=i + 1; i<${#words[@]}; i++)); do
      word=${words[$i]}
      if [[ "$skip_value" == 1 ]]; then skip_value=0; continue; fi
      case "$word" in
        -C|-c|--git-dir|--work-tree|--namespace|--exec-path|--config-env) skip_value=1; continue ;;
        --git-dir=*|--work-tree=*|--namespace=*|--exec-path=*|--config-env=*) continue ;;
        -*) continue ;;
        *) git_subcommand=$word; break ;;
      esac
    done
    if [[ "$git_subcommand" == push ]]; then
      push_option=1
      for ((i=i + 1; i<${#words[@]}; i++)); do
        word=${words[$i]}
        case "$word" in
          --) push_option=0; continue ;;
          --force|-f) deny "git force push" ;;
          --force-with-lease*) continue ;;
          --*) continue ;;
          -*) [[ "$word" == *f* || "$word" == *F* ]] && deny "git force push" ;;
          *)
            if [[ "$push_option" == 1 && "$word" == +* ]]; then
              deny "git force push refspec"
            fi
            ;;
        esac
      done
    fi
    return 0
  fi
  [[ "$name" == rm || "$name" == chmod ]] || return 0
  i=$((i + 1))
  for ((; i < ${#words[@]}; i++)); do
    word=${words[$i]}
    if [ "$end_options" -eq 0 ] && [[ "$word" == -- ]]; then
      end_options=1; continue
    fi
    if [ "$end_options" -eq 0 ] && [[ "$word" == -* ]]; then
      if [[ "$word" == --recursive || ( "$name" == rm && "$word" =~ ^-[a-zA-Z]*[rR][a-zA-Z]*$ ) ||
            ( "$name" == chmod && "$word" =~ ^-[a-zA-Z]*R[a-zA-Z]*$ ) ]]; then recursive=1; fi
      continue
    fi
    if [[ "$name" == rm ]]; then
      if protected_rm_target "$word"; then broad=1; fi
    elif [[ -z "$mode" ]]; then mode=$word
    fi
  done
  if [[ "$name" == rm && "$recursive" -eq 1 && "$broad" -eq 1 ]]; then deny "recursive rm on a broad target"; fi
  if [[ "$name" == chmod && "$recursive" -eq 1 && "$mode" =~ ^0?777$ ]]; then deny "recursive chmod 777"; fi
}
words=()
word='' quote='' escaped=0 active=0
for ((pos=0; pos<${#cmd}; pos++)); do
  char=${cmd:pos:1}
  if [ "$escaped" -eq 1 ]; then word+=$char; escaped=0; active=1; continue; fi
  if [[ "$quote" == '"' && "$char" == '\' ]]; then
    next=${cmd:pos+1:1}
    if [[ "$next" == $'\n' ]]; then pos=$((pos + 1)); continue; fi
    if [[ "$next" == '$' || "$next" == '`' || "$next" == '"' || "$next" == '\' ]]; then
      escaped=1; active=1; continue
    fi
    word+='\'; active=1; continue
  fi
  if [[ "$quote" == "'" ]]; then
    if [[ "$char" == "'" ]]; then quote=''; else word+=$char; fi
    continue
  fi
  if [[ "$char" == '\' ]]; then
    # Bash removes an unquoted/double-quoted backslash-newline pair before word splitting.
    # Do not activate an empty word; single-quoted text was handled above and stays literal.
    if [[ "${cmd:pos+1:1}" == $'\n' ]]; then pos=$((pos + 1)); continue; fi
    if [[ "$quote" == '' && ( "$word" =~ ^[A-Za-z]:$ || "$word" =~ ^[A-Za-z]:/ ) ]]; then
      word+='/'; active=1; continue
    fi
    escaped=1; active=1; continue
  fi
  if [[ "$quote" == '"' ]]; then
    if [[ "$char" == '"' ]]; then quote=''; else word+=$char; fi
    continue
  fi
  case "$char" in
    "'"|'"') quote=$char; active=1 ;;
    ' '|$'\t'|$'\r')
      if [ "$active" -eq 1 ]; then words+=("$word"); word=''; active=0; fi ;;
    ';'|'&'|'|'|'('|')'|$'\n')
      if [ "$active" -eq 1 ]; then words+=("$word"); word=''; active=0; fi
      check_simple_command; words=() ;;
    *) word+=$char; active=1 ;;
  esac
done
if [ "$active" -eq 1 ]; then words+=("$word"); fi
check_simple_command

# git push --force / -f (--force-with-lease is allowed)
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push([[:space:]]+[^;&|]*)?[[:space:]](--force|-[a-zA-Z]*f[a-zA-Z]*)([[:space:]]|$)'; then
  deny "git force push"
fi

# git reset --hard discards uncommitted work
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]]+(.*[[:space:]])?--hard'; then
  deny "git reset --hard"
fi

# piping a download straight into a shell
if printf '%s' "$cmd" | grep -Eq '(curl|wget)[^|;]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z)?sh([[:space:]]|$|[;&)])'; then
  deny "download piped into a shell"
fi

if printf '%s' "$cmd" | grep -Eq '(^|[;&|])[[:space:]]*(sudo[[:space:]]+)?(shred[[:space:]]|mkfs[.a-z0-9]*|dd[[:space:]]+[^;&|]*of=/dev/(sd|hd|vd|xvd|nvme|mmcblk|loop|md|dm-|mapper|sr))'; then
  deny "raw disk write or filesystem creation"
fi

exit 0
