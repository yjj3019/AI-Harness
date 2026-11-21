# Multi-Host Balancing Guide

**Status**: Practical guidance for keeping AI-Harness principles balanced across Claude Code, Codex, Cursor, Gemini CLI, and other AGENTS.md / Agent Skills hosts. Not a runtime change.

## Source of truth strategy

| Layer | Recommended home | Notes |
|-------|------------------|-------|
| Core invariants (evidence, approval, compound-first, scope) | `AGENTS.md` | Short, always-loaded on Codex and many others. Claude Code can import it. |
| Claude-specific tooling | `CLAUDE.md` + `.claude/` | Hooks, phase-gate.js, agents, commands. |
| Codex-specific discovery | `docs/codex-adaptation-notes.md` | Skill paths, instruction chain. |
| Portable procedures | `skills/*/SKILL.md` | Open Agent Skills format. Copy or link into host paths. |
| Long design notes | `docs/` | Super-agent, progressive disclosure, etc. |

**Recommended dual-host pattern**:
- Keep `AGENTS.md` as the shared core.
- In `CLAUDE.md`, start with `@AGENTS.md` (or a clear pointer) so Claude Code loads the shared rules first, then add only Claude-specific items.
- Do not let the two files drift on primary rules.

## Host discovery summary

| Host | Always-on file | Skills path | Subagents / roles | Notes |
|------|----------------|-------------|-------------------|-------|
| Claude Code | `CLAUDE.md` (reads `AGENTS.md` only if no CLAUDE.md higher) | `.claude/skills/` | `.claude/agents/` | Rich hooks and phase-gate reference |
| Codex | `AGENTS.md` (+ override, nested) | `.agents/skills/` | Host-specific or skill-driven | Instruction chain from root |
| Cursor | `AGENTS.md` or `.cursor/rules` | `.agents/skills/` or `.cursor/skills/` | Limited | Often reads both conventions |
| Gemini CLI | `GEMINI.md` or configured | Varies | Limited | Can point at AGENTS.md |
| Others | Often `AGENTS.md` | Agent Skills compatible | Varies | Prefer portable skills |

## Balancing the verification loop

The Ralph-style loop (implement → test → verify → review → compound) and Phase evidence rules are host-agnostic in principle.

- **Claude Code**: Use `.claude/agents/` + `phase-gate.js` + hooks as the reference implementation.
- **Codex / others**: Approximate with separate sessions or explicit role prompts + the same evidence requirements. Record results in `docs/HANDOFF.md` or structured reports; do not claim completion without observable evidence.
- Never hand-write Phase evidence JSON. The orchestrator may write report inputs under `.phase-evidence/`; only the gate writes Phase records. Prefer the gate when available; otherwise document the equivalent check without claiming strict Phase completion.

## Grok Build discovery and trust

Grok Build 1.0.92 on one Windows machine reported that the repository root was not owned by the process user and did not load its project hooks or discover project instructions. An independently created user-owned synthetic Git repository had a discoverable root, but was not trusted and exposed no project instructions in that inspection. This isolates a candidate ownership condition, not the full trust/discovery behavior. Do not change ownership or bypass folder trust automatically; use a user-owned isolated checkout and verify its instructions and each hook with the actual host. The same Windows build warned that its requested read-only sandbox was not enforced. An explicit Edit permission rule denied one synthetic tool call, but this does not establish OS or network containment or cover other tools. See https://docs.x.ai/build/features/permissions and https://docs.x.ai/build/features/sandbox.

## Skills balancing

- Keep skill bodies portable (no host-specific tool names in the main instructions when possible).
- Put host policy (e.g. Codex `agents/openai.yaml`) in optional side files.
- Repository skills live under `skills/`. Document the one-line copy/link for each major host in `docs/codex-adaptation-notes.md`.

## Super-agent pattern

Router / Worker ideas in `docs/super-agent-architecture-notes.md` apply across hosts:
- Long-lived coordinator (session or persistent AGENTS.md + HANDOFF).
- Isolated workers (separate sessions, worktrees, or subagent calls).
- Structured status reports.
- Evidence and approval boundaries unchanged.

## Practical checklist for dual (or multi) use

1. Align primary rules in `AGENTS.md` and `CLAUDE.md`.
2. Prefer `@AGENTS.md` import at the top of `CLAUDE.md` if Claude Code version supports it.
3. Keep long procedures in skills, not in the always-on files.
4. Verify the evidence path on the host you actually use.
5. When adding a new host-specific artifact, document it here or in the host notes rather than duplicating core rules.

See also: `AGENTS.md`, `CLAUDE.md`, `docs/codex-adaptation-notes.md`, `docs/skill-design-progressive-disclosure.md`.
