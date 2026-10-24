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

## Pattern 6: Lazy Senior / YAGNI (Ponytail)

Source: [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)

The best code is the code never written. Solve the whole problem with the least new code.

**Decision order** (take the first that fully works):

1. Does it need to exist? Skip unrequested features and name them.
2. Already in this codebase? Reuse the existing helper, component, or pattern.
3. Standard library or platform feature? Use it.
4. Already-installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one clear line? One line.
6. Otherwise: the minimum code that works.

**Rules**
- Be lazy about the solution, never about completeness. Finish callers, tests, and fixtures your change breaks.
- No abstraction, wrapper, config, or “for later” code nobody asked for.
- Bug fix: grep every caller, then fix the root cause once in shared code.
- New non-trivial logic leaves one small test or assert. Trivial changes need none.
- Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, or anything the user asked for.
- End with one or two lines: what was skipped and any residual risk.

## Pattern 7: Karpathy Behavioral Guidelines (detail)

Source: [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)

These four principles are already primary rules in `CLAUDE.md`. The source adds concrete operational detail:

| Principle | Operational detail |
|-----------|--------------------|
| Think Before Coding | State assumptions; present multiple interpretations; push back if a simpler approach exists; stop and name confusion. |
| Simplicity First | No features beyond the ask; no single-use abstractions; no unrequested flexibility; if 200 lines could be 50, rewrite. |
| Surgical Changes | Do not “improve” adjacent code or formatting; match existing style; remove only orphans your change created; every changed line must trace to the request. |
| Goal-Driven Execution | Transform “add validation” → “write tests for invalid inputs, then make them pass”; “fix the bug” → “write a reproducing test, then make it pass”. |

**Working signals**: fewer unnecessary diff lines, fewer rewrites from overcomplication, clarifying questions before implementation.

**Tradeoff**: These bias toward caution over speed. For trivial tasks (typos, obvious one-liners), use judgment — not every change needs full rigor.

## Mapping to This Repository

| External Pattern | AI-Harness Equivalent |
|------------------|-----------------------|
| Forced lifecycle | Phase structure + evidence gates in `phase-harness.js` |
| Default-FAIL | `.phase-evidence/phase-<id>-<step>.json` must contain `"status":"PASS"`; missing = FAIL |
| Fresh-context evaluator | Independent `verify` and `review` agents (isolated context) |
| Agent-maintained handoff | `docs/HANDOFF.md` + mandatory read of `docs/compound-log.md` |
| Small stories | Phase checklists in `docs/PHASES.md` must be independently human-testable |
| Backpressure | Objective verification tools (test runner, Playwright, logs) required before PASS |
| Lazy senior / YAGNI | Simplicity First + Surgical Changes in `CLAUDE.md`; prefer reuse and stdlib before new code |
| Karpathy guidelines | Primary Rules section of `CLAUDE.md` |

## Recommended Adoption Order

1. Keep existing evidence gates and phase validation (already implemented).
2. Add a simple `progress` or feature-status JSON that defaults to `false`.
3. Require the verify agent to open evidence files before issuing PASS.
4. Document a short brainstorm → plan → phase sequence in CLAUDE.md if a project needs it.
5. Periodically re-evaluate which harness pieces are still load-bearing after model upgrades (Anthropic recommendation).

---

These patterns are universal. Copy the mechanism, not the specific project examples.
