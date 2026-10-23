# AI-Harness

AI Harness Engineering package for safe, long-running Code Agent workflows.

This repository synthesizes the complete AI Harness Engineering methodology extracted from the provided Gemini notebook sources. It implements the Ralph Wiggum Loop, independent subagents, phase-based execution, and compounded learning to prevent derailment, hallucination, and over-engineering.

## Directory Structure

```
AI-Harness/
├── CLAUDE.md                          # Project Constitution & Index (~100 lines)
├── docs/
│   ├── architecture-spec.md            # Full comprehensive specification
│   ├── DETAIL_SPEC.md                 # Functional requirements template
│   ├── PHASES.md                      # Phase breakdown & checklists
│   ├── HANDOFF.md                     # Session hand-off state
│   └── compound-log.md                # Accumulated lessons & anti-patterns
└── .claude/
    ├── agents/
    │   ├── coding.md
    │   ├── test.md
    │   ├── verify.md
    │   ├── review.md
    │   └── compound.md
    └── workflows/
        └── phase-harness.js            # Ralph Wiggum Loop runner
```

## Core Principles

- **Index-Only CLAUDE.md**: Keep under ~100 lines to prevent context pollution.
- **No One-Shot**: Proceed strictly by Phase/Sprint with explicit completion criteria.
- **Ralph Wiggum Loop**: coding → test → verify → review → compound (auto-retry on FAIL/[BLOCKING], max 3 iterations).
- **Independent Evaluators**: Coding and evaluation run in isolated context subagents to eliminate self-assessment bias.
- **Objective Verification**: Use Playwright MCP, DevTools, logs — never subjective code reading.
- **Compound Learning**: Review `docs/compound-log.md` before every task.
- **Context Reset**: When context fills, hand off via `docs/HANDOFF.md`.

## Quick Start

1. Read `CLAUDE.md`.
2. Review `docs/compound-log.md`.
3. Define phases in `docs/PHASES.md` and requirements in `docs/DETAIL_SPEC.md`.
4. Run phases via the workflow in `.claude/workflows/phase-harness.js` or agent orchestration.

See `docs/architecture-spec.md` for the full synthesis of all source materials.
