#!/usr/bin/env bash
# PreToolUse(Bash) guardrail: deny a short list of destructive commands.
# Pattern matching is a guardrail, not a security boundary. Variants can slip through.
# Fail-open: if jq is missing or the input is unparsable, the command is allowed.

set -u

command -v jq >/dev/null 2>&1 || exit 0

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

deny() {
  echo "Blocked by .claude/hooks/block-destructive.sh: $1. Ask the user to run it or approve it explicitly." >&2
  exit 2
}

# rm with recursive/force flags aimed at root, home, cwd, parent, or a bare glob
if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[rRf][a-zA-Z]*[[:space:]]+(/|~|\$HOME|\.|\.\.|\*)([[:space:]]|$)'; then
  deny "recursive/forced rm on a broad target"
fi
# ...or at a top-level system path (/usr, /etc, /*). Deeper absolute paths stay allowed.
if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[rRf][a-zA-Z]*[[:space:]]+(/\*|/[A-Za-z0-9._-]+)([[:space:]]|$)'; then
  deny "recursive/forced rm on a top-level system path"
fi

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

# world-writable recursive chmod. The three parts are matched separately so that flag order and
# extra flags (chmod -R -v 777 /srv) cannot slip through.
if printf '%s' "$cmd" | grep -Eq '(^|[[:space:];&|])chmod([[:space:]]|$)' &&
  printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])(-[a-zA-Z]*R[a-zA-Z]*|--recursive)([[:space:]]|$)' &&
  printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])0?777([[:space:]]|$)'; then
  deny "recursive chmod 777"
fi
if printf '%s' "$cmd" | grep -Eq '(^|[;&|])[[:space:]]*(sudo[[:space:]]+)?(mkfs[.a-z0-9]*|dd[[:space:]]+[^;&|]*of=/dev/(sd|hd|vd|xvd|nvme|mmcblk|loop|md|dm-|mapper|sr))'; then
  deny "raw disk write or filesystem creation"
fi

exit 0
