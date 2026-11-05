---
name: coding-master
description: Highest-quality coding workflow for professional-grade implementation. Enforces spec-first, TDD (red-green-refactor), incremental slices, source-driven verification, adversarial review, multi-axis code review, and evidence-based  completion. Use for any non-trivial coding task. Prefer this over generic coding.
---

# Coding Master

**Goal**: Produce production-grade code with the discipline of a careful senior engineer — spec before code, tests as proof, small verified slices, and independent review.

Synthesized from the strongest open patterns (2026):
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — full DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP lifecycle, TDD, spec-driven, source-driven, doubt-driven, code-review
- [mattpocock/skills](https://github.com/mattpocock/skills) — TDD, improve-codebase-architecture, grill-me / to-spec
- [adityaarakeri/senior-agent-skills](https://github.com/adityaarakeri/senior-agent-skills) — repo-recon, plan-first, tdd-loop, debug-protocol, safe-refactor, self-review, verify-done, git-hygiene
- SOLID / clean architecture patterns from various senior-engineer skills

Does not vendor upstream code. Apply this skill’s gates on top of any external coding skill.

## Core principles

1. **Spec before code** — Non-trivial work starts with a short, verifiable spec (objective, acceptance criteria, boundaries, verification method). No silent assumptions.

2. **TDD as default** — For new logic or behavior changes: write a failing test (RED), make it pass with minimal code (GREEN), then refactor while green. Bug fixes start with a reproducing test.

3. **Incremental slices** — Prefer thin vertical slices. Implement, verify, commit. Avoid large untested batches.

4. **Source-driven** — Framework/library-specific decisions must be backed by current official docs or source, not memory. Cite or mark when unverified.

5. **Adversarial review** — Non-trivial decisions get a fresh-context challenge (doubt-driven style). Look for ways the claim could be wrong.

6. **Multi-axis review** — Before claiming done: correctness, security, performance (measure first), readability/maintainability, test coverage of the change.

7. **Evidence required** — Completion claims need observable evidence (test output, build log, review notes). Exit code alone is insufficient.

8. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Recon / Spec** — Map relevant code and constraints. Write or confirm a short spec with acceptance criteria and verification method.
2. **Plan** — Break into small, independently verifiable tasks if the change is non-trivial.
3. **TDD loop** — RED → GREEN → (refactor while green). One behavior at a time.
4. **Source check** — Verify framework patterns against official docs when relevant.
5. **Self / Adversarial review** — Challenge the change. Run multi-axis checklist.
6. **Verify** — Run the relevant tests and any other required checks. Capture evidence.
7. **Handoff** — Deliverable + known limitations + unverified items + test evidence.

Detailed checks: `references/tdd-checklist.md`, `references/review-axes.md`.

## Minimal working set

- Spec or acceptance criteria
- Failing-then-passing tests for the change
- Review notes (or explicit “no issues found” with axes checked)
- Verification evidence

## Rules that override convenience

- No silent dependency installs.
- No hand-written Phase evidence.
- Do not claim done without test/build evidence.
- Spec or acceptance criteria before substantial new logic.
- Refactor only while tests are green.

## Recommended external skills (optional)

| Need | Skill | Install |
|------|-------|---------|
| Full lifecycle | addyosmani/agent-skills | `npx skills add addyosmani/agent-skills` |
| TDD focus | mattpocock/skills (tdd) | `npx skills add mattpocock/skills` |
| Senior engineer loop | adityaarakeri/senior-agent-skills | `npx skills add adityaarakeri/senior-agent-skills` |
| SOLID / clean | various solid-skills | project-specific |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `skills/document-master/SKILL.md`, `skills/design-master/SKILL.md`.
