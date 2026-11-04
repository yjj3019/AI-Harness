---
name: super-agent-router
description: Design or apply a two-level Router + isolated Worker pattern for concurrent, continuous agent work while preserving evidence gates and approval boundaries. Use when the user asks to "design a super-agent", "split router and workers", "handle multiple concurrent tasks with one voice", "adapt DeepSeek Harness Super-agent ideas", or "set up always-on style coordination without replacing Phase gates".
---

# Super-agent Router / Worker Coordination (Optional)

This skill helps design a concrete split when the user explicitly wants multi-task continuity and parallelism. It does **not** install any daemon, enable always-on mode, change permissions, or bypass Phase evidence requirements.

## When to apply

- User wants one continuous agent experience across channels while running several tasks in parallel.
- User references Super-agent, Router/Worker, event-driven agents, or DeepSeek Harness design notes.
- Concurrent editing risk exists and worktree isolation is relevant.

Do **not** apply for ordinary single-task coding that fits the normal `/phase-harness` loop.

## Procedure

1. Read `docs/super-agent-architecture-notes.md` and the current `docs/deepseek-team-workflow.md`.
2. Confirm the brief: goal, acceptance criteria, allowed scope, excluded scope, and which operations require separate human approval.
3. Propose a Router role (long-lived, human-facing, dispatch-only, lighter model if available) and one or more Worker roles (isolated context, full tools, structured status reports).
4. Recommend isolation mechanisms already available: separate sessions, git worktrees for writers, explicit write scopes, and the existing UNKNOWN stop rule.
5. Map any lasting work onto an existing or newly defined Phase so that evidence is still recorded only through `.claude/workflows/phase-gate.js`.
6. List residual risks (shared checkout, missing Watchdog infrastructure, unmeasured performance claims) and stop conditions.
7. Output a short design: roles, dispatch rules, thread pass-through idea if applicable, evidence plan, and approval points. Do not claim the design has been executed or measured unless the user has already done so.

## Output shape

- Observed constraints from the current repository.
- Proposed Router / Worker split (with isolation notes).
- Evidence and approval mapping.
- Risks and what remains unverified.
- Suggested next concrete step (usually: define a Phase or write a task contract).

## Hard constraints (do not violate)

- Never instruct the agent to hand-write `.phase-evidence/*` files.
- Never suggest bypassing `phase-gate.js check` or human approval for external/destructive effects.
- Never claim automatic always-on recovery or 24/7 operation unless the user has separately authorized and verified the infrastructure.
- Accuracy and safety take priority over throughput.
