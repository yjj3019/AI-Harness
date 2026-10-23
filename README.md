# AI-Harness

**AI Harness Engineering** package for safe, long-running Code Agent workflows.

This repository synthesizes a complete harness methodology for Claude Code (and compatible agents). It combines lessons from original Gemini notebook sources with external research and production practices from Anthropic, Geoffrey Huntley, Jesse Vincent (Superpowers), Andrej Karpathy-inspired guidelines, and multi-agent orchestration systems.

> **Korean version**: [README.ko.md](./README.ko.md)

## Why Harness Engineering?

As coding agents become capable of multi-hour autonomous work, the limiting factor is no longer raw model intelligence. It is the **harness** — the scaffolding of rules, feedback loops, tools, context management, and verification that keeps the agent on track.

Common failure modes without a harness:
- Premature "victory" declarations
- Context Anxiety (degraded consistency above ~70% context window)
- Self-assessment bias (agents praise their own work)
- Over-engineering and scope creep
- Loss of progress across sessions

Harness Engineering shifts the developer role from writing code lines to designing the system that makes agents reliable.

## Core Principles

1. **Index-Only Constitution** — `CLAUDE.md` stays lean (~100 lines). Detailed specs live in `docs/`.
2. **No One-Shot** — Break work into explicit Phases/Sprints with completion criteria.
3. **Ralph Wiggum Loop** — Autonomous cycle: `coding → test → verify → review → compound`. Auto-retry on FAIL or [BLOCKING] (max 3 iterations).
4. **Independent Evaluators** — Coding and evaluation run in isolated context windows to eliminate self-bias.
5. **Objective Verification** — Use Playwright MCP, DevTools, logs, and test runners — never subjective code reading.
6. **Compound Learning** — Agents must read `docs/compound-log.md` before every task.
7. **Context Reset & Hand-off** — When context fills, summarize state into `docs/HANDOFF.md` and start a fresh session.
8. **Surgical Changes & Simplicity** — Touch only what is required. Prefer the minimum robust solution (Karpathy-inspired).

## Directory Structure

```
AI-Harness/
├── CLAUDE.md                          # Project Constitution & Index
├── README.md                          # This file (English)
├── README.ko.md                       # Korean version
├── docs/
│   ├── architecture-spec.md            # Full synthesis
│   ├── DETAIL_SPEC.md                 # Requirements template
│   ├── PHASES.md                      # Phase checklists
│   ├── HANDOFF.md                     # Session hand-off state
│   └── compound-log.md                # Accumulated lessons
└── .claude/
    ├── agents/
    │   ├── coding.md
    │   ├── test.md
    │   ├── verify.md
    │   ├── review.md
    │   └── compound.md
    └── workflows/
        └── phase-harness.js            # Loop runner skeleton
```

## The Ralph Wiggum Loop

Named after the persistently optimistic Simpsons character. Coined by Geoffrey Huntley (2025) as a simple bash loop:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

Anthropic later packaged it as the official `ralph-wiggum` Claude Code plugin and added built-in primitives (`/loop`, `/goal`, `/batch`).

**Key insight**: Progress lives in files and git history, not in the model's context. Each iteration can start fresh. The loop continues until objective completion criteria are met.

In this harness the loop is structured as five specialized subagents:

| Step | Agent | Responsibility | Failure Action |
|------|-------|----------------|----------------|
| 1 | coding | Implement current Phase | — |
| 2 | test | Objective dynamic tests (Playwright, CLI) | FAIL → coding |
| 3 | verify | Checklist vs artifacts | FAIL → coding |
| 4 | review | Static analysis ([BLOCKING]/[NIT]) | [BLOCKING] → coding |
| 5 | compound | Append lessons to compound-log.md | — |

Maximum 3 retries per phase.

## Related Patterns & Frameworks

### Anthropic Effective Harnesses
- **Initializer + Coding Agent** (Nov 2025): First session scaffolds the environment (feature list, progress file, git). Subsequent sessions make one incremental feature and leave clear artifacts.
- **Generator-Evaluator** (2026): GAN-inspired separation. Planner expands specs, Generator builds, Evaluator independently grades (often with Playwright). External evaluation outperforms self-evaluation.

### Superpowers (obra/superpowers)
The most widely adopted agent skills framework. Enforces:
- Brainstorming → Design sign-off
- Writing plans (small verifiable tasks)
- TDD (tests must fail before implementation)
- Subagent-driven development with review between tasks
- Systematic debugging and verification-before-completion

### Karpathy-Inspired Guidelines
A minimal `CLAUDE.md` (originally ~65 lines) that became extremely popular:
1. Think Before Coding — surface assumptions and ambiguity
2. Simplicity First — minimum code that solves the problem
3. Surgical Changes — touch only what is required
4. Goal-Driven Execution — define and verify success criteria

### Multi-Agent Orchestration
Systems such as Oh My Claudecode / Oh My Opencode provide higher-level orchestration (Team, Autopilot, Ralph, Ultrawork modes) on top of individual harness patterns.

## Quick Start

1. Read `CLAUDE.md`.
2. Review `docs/compound-log.md`.
3. Define phases in `docs/PHASES.md` and requirements in `docs/DETAIL_SPEC.md`.
4. Run phases via agent orchestration or the workflow skeleton in `.claude/workflows/phase-harness.js`.
5. When context degrades, write state to `docs/HANDOFF.md` and start a fresh session.

## Further Reading

- [docs/architecture-spec.md](./docs/architecture-spec.md) — Full synthesis
- Anthropic: [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic: [Harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps)
- Geoffrey Huntley — Ralph technique
- obra/superpowers
- Karpathy-inspired CLAUDE.md collections

---

*Built as a living harness. Agents that read the compound log get smarter over time.*
