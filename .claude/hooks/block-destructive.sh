#!/usr/bin/env bash
# PreToolUse(Bash) guardrail: deny a short list of destructive commands.
# Pattern matching is a guardrail, not a security boundary. Variants can slip through.
# Fail-closed: if jq is missing or the input is unparsable, the command is denied.

set -u

command -v jq >/dev/null 2>&1 || { echo "Blocked by .claude/hooks/block-destructive.sh: jq is required (install: winget install jqlang.jq | apt install jq | brew install jq)" >&2; exit 2; }

input=$(cat)
[ -n "$input" ] || { echo "Blocked by .claude/hooks/block-destructive.sh: empty hook input" >&2; exit 2; }
# Windows jq's text-mode stdout can duplicate CR in embedded CRLF JSON strings.
# Normalize doubled and ordinary CRLF to LF before lexing Bash continuations.
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) || { echo "Blocked by .claude/hooks/block-destructive.sh: invalid hook input" >&2; exit 2; }
cmd=${cmd//$'\r\r\n'/$'\n'}
cmd=${cmd//$'\r\n'/$'\n'}
[ -n "$cmd" ] || exit 0

deny() {
  echo "Blocked by .claude/hooks/block-destructive.sh: $1. Ask the user to run it or approve it explicitly." >&2
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
    # The repository's own history and configuration (`rm -rf .git`, `rm -rf ./.git`).
    .git) return 0 ;;
    '~/'*|'$HOME/'*|'${HOME}/'*|'$PWD/'*|'${PWD}/'*|'$USERPROFILE'|'${USERPROFILE}'|'$USERPROFILE/'*|'${USERPROFILE}/'*) return 0 ;;
    # Windows user profiles as written on native Windows and through MSYS drive mounts.
    [A-Za-z]:|[A-Za-z]:/*|[A-Za-z]:/Windows|[A-Za-z]:/Windows/*|[A-Za-z]:/Program\ Files|[A-Za-z]:/Program\ Files/*|[A-Za-z]:/ProgramData|[A-Za-z]:/ProgramData/*) return 0 ;;
    [A-Za-z]:/[Uu][Ss][Ee][Rr][Ss]|[A-Za-z]:/[Uu][Ss][Ee][Rr][Ss]/*|/[A-Za-z]|/[A-Za-z]/*) return 0 ;;

    # Explicit protected roots include descendants; /tmp/build remains allowed.
    /bin/*|/sbin/*|/boot/*|/dev/*|/etc/*|/home/*|/root/*|/usr/*|/var/*|/lib/*|/lib64/*|/opt/*|/srv/*|/proc/*|/sys/*|/run/*|/mnt/*|/media/*) return 0 ;;
  esac
  [[ "$target" =~ ^/[A-Za-z0-9._-]+$ ]]
}
# Reading a secret file through the shell. The host `Read` deny rule only covers the Read tool, so
# `cat .env` was an open path to the same bytes. Lexical guard: a reader/copy command whose argument is a
# `.env` or `.env.<name>` path (templates such as .env.example are fine). Variables, aliases, globs and
# wrappers can evade it; it narrows the easy path, host permissions remain the real boundary.
# Index (cmd_i) of the command word after literal wrappers and their options: `sudo -n rm`, `env A=1 rm`,
# `A=1 rm`, `time rm`, `nohup rm`, `nice -n 5 rm`, `timeout 5 rm`. Without this a wrapper in front of rm, git or
# cat hid the command from every check below. Lexical only: the value of an option is skipped for the common
# options listed here; other wrappers (xargs, a shell -c string, aliases) still evade it.
cmd_i=0
command_index() {
  local i=0 w re_assign='^[A-Za-z_][A-Za-z0-9_]*='
  while :; do
    w=${words[$i]:-}
    if [[ "$w" =~ $re_assign ]]; then i=$((i + 1)); continue; fi   # NAME=value prefix
    w=${w##*/}
    case "$w" in
      sudo|doas)
        i=$((i + 1))
        while [[ "${words[$i]:-}" == -* ]]; do
          case "${words[$i]}" in
            --) i=$((i + 1)); break ;;
            -u|-g|-h|-p|-C|-D|-R|-T|-U|-r|-t) i=$((i + 2)) ;;
            *) i=$((i + 1)) ;;
          esac
        done ;;
      env)
        i=$((i + 1))
        while [[ "${words[$i]:-}" == -* || "${words[$i]:-}" =~ $re_assign ]]; do
          case "${words[$i]}" in -u|-C|-S) i=$((i + 2)) ;; *) i=$((i + 1)) ;; esac
        done ;;
      nice|ionice)
        i=$((i + 1))
        while [[ "${words[$i]:-}" == -* ]]; do
          case "${words[$i]}" in -n|-c|-p) i=$((i + 2)) ;; *) i=$((i + 1)) ;; esac
        done ;;
      timeout)
        i=$((i + 1))
        while [[ "${words[$i]:-}" == -* ]]; do
          case "${words[$i]}" in -s|-k) i=$((i + 2)) ;; *) i=$((i + 1)) ;; esac
        done
        i=$((i + 1)) ;;   # the duration
      command|builtin|exec|nohup|time|setsid)
        i=$((i + 1))
        while [[ "${words[$i]:-}" == -* ]]; do
          case "${words[$i]}" in -a) i=$((i + 2)) ;; *) i=$((i + 1)) ;; esac
        done ;;
      *) break ;;
    esac
  done
  cmd_i=$i
}
env_read_guard() {
  local i=0 name word first tail
  [ "${#words[@]}" -gt 0 ] || return 0
  command_index; i=$cmd_i
  name=${words[$i]:-}; name=${name##*/}
  shopt -s nocasematch
  case "$name" in
    cat|bat|less|more|head|tail|grep|egrep|fgrep|rg|sed|awk|gawk|cut|sort|uniq|tr|od|xxd|hexdump|strings|base64|nl|tac|rev|diff|cmp|source|.|cp|mv|ln|copy|type|gc|get-content|select-string|sls|more.com) ;;
    *) shopt -u nocasematch; return 0 ;;
  esac
  for ((i=i + 1; i<${#words[@]}; i++)); do
    word=${words[$i]}
    word=${word//\\//}; word=${word#<}; word=${word#--file=}
    tail=${word##*/}
    case "$tail" in
      .env|.env.*)
        case "$tail" in
          *.example|*.sample|*.template|*.dist|*.tpl) ;;
          *) shopt -u nocasematch; deny "reading an environment secrets file through the shell" ;;
        esac ;;
    esac
  done
  shopt -u nocasematch
  return 0
}
check_simple_command() {
  local i=0 name recursive=0 broad=0 end_options=0 mode='' word git_subcommand='' skip_value=0 push_option=0
  [ "${#words[@]}" -gt 0 ] || return 0
  env_read_guard
  # Literal wrappers and their common options are skipped (see command_index).
  command_index; i=$cmd_i
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
    if [[ "$git_subcommand" == reset ]]; then
      # Same option-aware parse as push: `git -C dir reset --hard` must not bypass the check.
      for ((i=i + 1; i<${#words[@]}; i++)); do
        [[ "${words[$i]}" == --hard ]] && deny "git reset --hard"
      done
    fi
    if [[ "$git_subcommand" == clean ]]; then
      # `git clean -f` deletes untracked files for good (local notes, unstaged work). A dry run stays allowed.
      local clean_force=0 clean_dry=0
      for ((i=i + 1; i<${#words[@]}; i++)); do
        word=${words[$i]}
        case "$word" in
          --force) clean_force=1 ;;
          --dry-run) clean_dry=1 ;;
          --*) ;;
          -*) [[ "$word" == *f* ]] && clean_force=1; [[ "$word" == *n* ]] && clean_dry=1 ;;
        esac
      done
      if [[ "$clean_force" -eq 1 && "$clean_dry" -eq 0 ]]; then deny "git clean -f (deletes untracked files)"; fi
    fi
    if [[ "$git_subcommand" == push ]]; then
      push_option=1
      for ((i=i + 1; i<${#words[@]}; i++)); do
        word=${words[$i]}
        case "$word" in
          --) push_option=0; continue ;;
          --force|-f) deny "git force push" ;;
          --mirror) deny "git push --mirror (overwrites and deletes remote refs)" ;;
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

# Whole-command regex checks. They use bash [[ =~ ]] only (no external grep), so a PATH without grep
# cannot turn a deny into an allow.
re_push_force='git[[:space:]]+push([[:space:]]+[^;&|]*)?[[:space:]](--force|-[a-zA-Z]*f[a-zA-Z]*)([[:space:]]|$)'
re_reset_hard='git[[:space:]]+(-[^[:space:]]+[[:space:]]+([^-[:space:]][^[:space:]]*[[:space:]]+)?)*reset[[:space:]]+(.*[[:space:]])?--hard'
re_curl_sh='(curl|wget)[^|;]*\|[[:space:]]*(sudo([[:space:]]+-[^[:space:]]+)*[[:space:]]+)?(ba|z|da|k)?sh([[:space:]]|$|[;&)])'
# The same download run through a substitution: `bash <(curl ...)`, `sh -c "$(curl ...)"`, `eval "$(wget ...)"`.
re_sh_subst='(^|[[:space:];&|(])((ba|z|da|k)?sh|source|eval)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*["'"'"']?(<\(|\$\()[[:space:]]*(curl|wget)[[:space:]]'
re_disk='(^|[;&|])[[:space:]]*(sudo[[:space:]]+)?(shred[[:space:]]|mkfs[.a-z0-9]*|dd[[:space:]]+[^;&|]*of=/dev/(sd|hd|vd|xvd|nvme|mmcblk|loop|md|dm-|mapper|sr))'
# git push --force / -f (--force-with-lease is allowed)
if [[ $cmd =~ $re_push_force ]]; then deny "git force push"; fi
# git reset --hard discards uncommitted work (also with global options such as -C dir)
if [[ $cmd =~ $re_reset_hard ]]; then deny "git reset --hard"; fi
# piping a download straight into a shell
if [[ $cmd =~ $re_curl_sh ]]; then deny "download piped into a shell"; fi
if [[ $cmd =~ $re_sh_subst ]]; then deny "download run by a shell through a substitution"; fi
if [[ $cmd =~ $re_disk ]]; then deny "raw disk write or filesystem creation"; fi

# PowerShell/cmd-style recursive deletes (Remove-Item, ri, del, erase, rd, rmdir) on a broad target.
# Segment-scoped lexical guard like the rm rules above; it does not parse PowerShell, so quoting
# tricks, variables and aliases can evade it. Host permissions remain the real boundary.
ps_open='${'; ps_new='$'   # variables, not inline quotes: quote handling inside ${//} differs on bash 3.2/4.x
ps_src=${cmd//"$ps_open"/"$ps_new"}
shopt -s nocasematch   # bash 3.2 has no ${var,,}; nocasematch makes the case patterns below case-insensitive
while IFS= read -r seg || [ -n "$seg" ]; do
  read -ra pw <<<"$seg"
  [ "${#pw[@]}" -gt 0 ] || continue
  case "${pw[0]}" in remove-item|ri|del|erase|rd|rmdir) ;; *) continue ;; esac
  ps_recursive=0 ps_broad=0
  for w in "${pw[@]:1}"; do
    w=${w//\"/}; w=${w//\'/}
    case "$w" in
      -r|-re|-rec|-recu|-recur|-recurs|-recurse|-recurse:*|/s) ps_recursive=1; continue ;;
      -*|/[a-z]) continue ;;
      '$env:userprofile'*|'$env:homepath'*|'$env:homedrive'*|'$env:systemroot'*|'$env:windir'*|'$env:programfiles'*|'$env:programdata'*) ps_broad=1; continue ;;
    esac
    if protected_rm_target "$w"; then ps_broad=1; fi
  done
  if [ "$ps_recursive" -eq 1 ] && [ "$ps_broad" -eq 1 ]; then deny "recursive delete on a broad target"; fi
done < <(printf '%s' "$ps_src" | tr ';&|(){}' '\n')
shopt -u nocasematch

exit 0
