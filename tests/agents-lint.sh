#!/usr/bin/env bash
# Lint .claude/agents/*.md and .claude/commands/*.md frontmatter.
# Claude Code skips a file whose first line is not '---', so a missing delimiter silently disables it.
set -u
cd "$(dirname "$0")/.."

fails=0
checked=0

lint() {
  local f=$1 kind=$2 need_name=$3
  checked=$((checked + 1))
  if [ "$(head -n 1 "$f")" != "---" ]; then
    echo "FAIL $f: first line must be ---"
    fails=$((fails + 1))
    return
  fi
  local close
  close=$(awk 'NR>1 && /^---$/ {print NR; exit}' "$f")
  if [ -z "$close" ]; then
    echo "FAIL $f: frontmatter is not closed with ---"
    fails=$((fails + 1))
    return
  fi
  local fm
  fm=$(sed -n "2,$((close - 1))p" "$f")
  if [ "$need_name" = yes ] && ! printf '%s\n' "$fm" | grep -Eq '^name:[[:space:]]*[^[:space:]]'; then
    echo "FAIL $f: missing name"
    fails=$((fails + 1))
  fi
  if ! printf '%s\n' "$fm" | grep -Eq '^description:[[:space:]]*[^[:space:]]'; then
    echo "FAIL $f: missing description"
    fails=$((fails + 1))
  fi
  if [ "$kind" = agent ] && [ "$need_name" = yes ]; then
    local name
    name=$(printf '%s\n' "$fm" | sed -n 's/^name:[[:space:]]*//p' | head -n 1)
    if [ "$name" != "$(basename "$f" .md)" ]; then
      echo "FAIL $f: name '$name' does not match the file name"
      fails=$((fails + 1))
    fi
  fi
}

for f in .claude/agents/*.md; do [ -e "$f" ] && lint "$f" agent yes; done
for f in .claude/commands/*.md; do [ -e "$f" ] && lint "$f" command no; done

# The test agent may hold only the reviewed Playwright tools: no wildcard, no code execution, storage writes, routing or uploads.
if grep -Eq '^- mcp__playwright__(\*|browser_(run_code_unsafe|evaluate|route|unroute|route_list|set_storage_state|network_state_set|file_upload|drop|pdf_save|[a-z]+storage_(set|clear|delete)|cookie_(set|clear|delete)|localstorage_(set|clear|delete)|start_[a-z]+|stop_[a-z]+))' .claude/agents/test.md; then
  echo "FAIL .claude/agents/test.md: lists a Playwright tool outside the reviewed safe set"
  fails=$((fails + 1))
fi

# The evidence guard must be registered in settings.json. Agent frontmatter hooks are skipped
# until the workspace trust dialog is accepted, so they cannot be the only guard.
for h in 'evidence-guard.sh auto' 'block-destructive.sh'; do
  if ! jq -e --arg h "$h" '[.hooks.PreToolUse[]?.hooks[]?.command] | any(contains($h))' .claude/settings.json >/dev/null 2>&1; then
    echo "FAIL .claude/settings.json: PreToolUse hook '$h' is not registered"
    fails=$((fails + 1))
  fi
done

echo "frontmatter: $checked files checked, $fails problems"
[ "$fails" -eq 0 ]
