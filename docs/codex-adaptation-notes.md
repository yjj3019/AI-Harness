# Codex / Multi-Host Adaptation Notes

**Status**: Guidance for using AI-Harness principles with OpenAI Codex (and other AGENTS.md + Agent Skills hosts). Does not change evidence gates, hooks, or Claude-specific tooling.

## Discovery differences

| Item | Claude Code | Codex | Shared / portable |
|------|-------------|-------|-------------------|
| Always-on instructions | `CLAUDE.md` (and variants) | `AGENTS.md` (and `AGENTS.override.md`, nested) | Principles aligned; keep both in sync for dual use |
| Skills location | `.claude/skills/` | `.agents/skills/` | `SKILL.md` format is the open Agent Skills standard |
| Subagents / agents | `.claude/agents/` | Host-specific or skill-driven | Role separation (implement / test / verify / review) is host-agnostic |
| Hooks / settings | `.claude/settings.json` + hooks | Different permission and sandbox model | Approval boundary and evidence rules still apply |

Codex builds an instruction chain from global → repository root → nested directories. Prefer a short root `AGENTS.md` (30–150 lines) and move long procedures into skills.

Claude Code (recent versions) reads `AGENTS.md` only when no `CLAUDE.md` exists higher in the tree. For dual support, keep both files and ensure core rules stay consistent.

## Skills portability

The Agent Skills format (`SKILL.md` with `name` + `description` frontmatter, body on demand, optional `references/` and `scripts/`) is shared.

- Write descriptions that clearly state **when** to use the skill (trigger phrases).
- Keep bodies procedural and under ~500 lines.
- Put host-specific invocation policy in optional files (e.g. `agents/openai.yaml` for Codex) rather than the main body.
- Test triggering on both hosts if you rely on automatic invocation.

Repository skills currently live under `skills/`. To use them in Codex:

```bash
# Example: make them visible to Codex
mkdir -p .agents/skills
# Copy or symlink the desired skill folders
cp -r skills/super-agent-router .agents/skills/
# or ln -s ../../skills/super-agent-router .agents/skills/super-agent-router
```

User-level skills go in `$HOME/.agents/skills`.

## Phase evidence and gates

The shared `.claude/workflows/phase-gate.js` accepts Codex proof from `.codex/hooks.json` and the local `harness_evidence` MCP reader in `.codex/config.toml`. Review and trust the project and hook through the Codex host. The verify subagent calls `read_phase_log` for the Phase, evaluates the result and returns its verdict. On a successful tool event, the hook checks the verify role, current log hash and read epoch. Record the verdict through `phase-gate.js` with `--require-read-proof`.

The reader gives the verifier log excerpts and test diagnostics. Shell reads do not trigger this proof path. If the host omits role attribution, suppresses the hook or denies the tool, strict verify remains blocked.

The MCP process and recording hook resolve their checkout with Git, so they can start from a subdirectory of the same worktree. Run `node .claude/workflows/phase-gate.js doctor --host codex` from the repository root to check the project configuration and start the read-only tool from a subdirectory. A successful doctor does not check hook trust: in Codex, use `/hooks` to confirm the Phase reader's PostToolUse hook is enabled and trusted. Project trust alone is insufficient. Verify actual role attribution and read proof in a real Codex invocation.

## Super-agent pattern

The Router / Worker notes in `docs/super-agent-architecture-notes.md` are host-agnostic. Codex can approximate them with:

- A long-lived coordinating session (or persistent instructions via AGENTS.md + HANDOFF).
- Isolated workers via separate tasks, worktrees, or subagent-style calls when available.
- Explicit status reports back to the coordinator.
- Human approval for external or destructive effects.

## Recommended dual-host setup

1. Keep `AGENTS.md` and `CLAUDE.md` short and aligned on primary rules.
2. Put host-specific tooling notes in this file or in skills.
3. Place reusable procedures in portable `SKILL.md` folders.
4. Verify the important path (evidence, approval, compound-log) on the host you actually use.
5. Prefer explicit skill invocation for high-stakes work.

## What remains Claude-oriented

- `.claude/` directory (agents, hooks, commands, settings, phase-gate.js).
- Some scripts assume Claude Code event/hook model.
- These are reference implementations. Adapt or re-implement the evidence and safety boundaries for Codex rather than assuming the files run unchanged.

See also: `docs/skill-design-progressive-disclosure.md`, `docs/super-agent-architecture-notes.md`.
