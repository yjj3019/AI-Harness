# External Patterns for AI Harness Engineering

This document synthesizes reusable patterns from established open-source harnesses.  
It is intentionally general — no project-specific scenarios.

## Source Repositories

| Repository | Focus | Key Contribution |
|------------|-------|------------------|
| [obra/superpowers](https://github.com/obra/superpowers) | Skills framework | Forced lifecycle: brainstorm → plan → TDD → review → verify |
| [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents) | Harness primitives | Default-FAIL contract, fresh-context evaluator, agent-maintained handoff |
| [snarktank/ralph](https://github.com/snarktank/ralph) | Autonomous loop | PRD → small stories with `passes: false`, append-only progress log |
| [ghuntley/ralph](https://ghuntley.com/ralph/) | Loop engineering | Agent backpressure via compilers, tests, and type checkers |

## Pattern 1: Forced Lifecycle (Superpowers)

Do not jump to implementation. Enforce sequence:

1. **Brainstorm / clarify intent** — questions that surface real requirements before any code.
2. **Write design / plan** — small, verifiable tasks (2–5 minutes each) with exact files and acceptance criteria.
3. **TDD (RED-GREEN-REFACTOR)** — failing test first; delete code written before tests.
4. **Independent review** — between tasks or at branch end; critical issues block progress.
5. **Verification before completion** — run the actual verification command and confirm output before claiming done.

**Rule**: Skills/workflows must be mandatory, not optional suggestions.

## Pattern 2: Default-FAIL Contract (Anthropic cwc)

Every criterion starts as `false`. The agent cannot mark it passing without first opening evidence.

```json
{
  "feature-1": { "passes": false },
  "feature-2": { "passes": false }
}
```

- Evidence must be opened (Read) before any write that claims success.
- A PreToolUse-style gate denies status updates unless evidence was observed.
- Fresh-context evaluator (no Write/Edit tools) grades from a window that never saw the build.

**Exit condition**: loop continues while any `"passes": false` remains, or until budget/no-progress.

## Pattern 3: Agent-Maintained Handoff

A fresh session has no memory. The agent itself maintains continuity:

- Scope each session to one feature/phase.
- Write structured progress notes (`PROGRESS.md` or `docs/HANDOFF.md`) and re-read them first on restart.
- Commit at meaningful checkpoints so `git log` is a second record.
- Optional Stop hook commits anything still uncommitted.

This pairs with the existing `docs/HANDOFF.md` and `docs/compound-log.md` in this repository.

## Pattern 4: Small Stories + Append-Only Learnings (Ralph)

Break work into right-sized stories:

- **Right-sized**: add a column + migration, add one UI component, update one server action.
- **Too big**: "build the entire dashboard", "add authentication".

Each story has:
- Clear acceptance criteria
- `passes: false` until independently verified

After each iteration, append learnings to an append-only log (`progress.txt` / `docs/compound-log.md`). Future iterations read this before starting.

## Pattern 5: Agent Backpressure (Huntley)

Let external systems push back so the agent corrects itself:

- Compiler / type checker errors
- Test runner failures
- Linter output
- Browser / Playwright evidence

The harness does not rely on the model's self-assessment. The environment is the evaluator.

## Mapping to This Repository

| External Pattern | AI-Harness Equivalent |
|------------------|-----------------------|
| Forced lifecycle | Phase structure + evidence gates in `phase-harness.js` |
| Default-FAIL | `.phase-evidence/phase-<id>-<step>.json` must contain `"status":"PASS"`; missing = FAIL |
| Fresh-context evaluator | Independent `verify` and `review` agents (isolated context) |
| Agent-maintained handoff | `docs/HANDOFF.md` + mandatory read of `docs/compound-log.md` |
| Small stories | Phase checklists in `docs/PHASES.md` must be independently human-testable |
| Backpressure | Objective verification tools (test runner, Playwright, logs) required before PASS |

## Recommended Adoption Order

1. Keep existing evidence gates and phase validation (already implemented).
2. Add a simple `progress` or feature-status JSON that defaults to `false`.
3. Require the verify agent to open evidence files before issuing PASS.
4. Document a short brainstorm → plan → phase sequence in CLAUDE.md if a project needs it.
5. Periodically re-evaluate which harness pieces are still load-bearing after model upgrades (Anthropic recommendation).

---

These patterns are universal. Copy the mechanism, not the specific project examples.
