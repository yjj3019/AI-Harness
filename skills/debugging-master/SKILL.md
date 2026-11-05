---
name: debugging-master
description: Highest-quality systematic debugging workflow. Enforces reproduce-first, hypothesis-driven root-cause analysis, localization, minimal fix, and regression test. No symptom fixes. Use for any bug,  failure, unexpected behavior, or error investigation.
---

# Debugging Master

**Goal**: Find the root cause before changing code. Symptom fixes are forbidden.

Synthesized from the strongest open patterns (2026):
- obra/superpowers `systematic-debugging`
- addyosmani/agent-skills `debugging-and-error-recovery`
- Various hypothesis-driven debug-cycle skills

Does not vendor upstream code. Apply this skill’s gates on top of any external debugging skill.

## Core principles

1. **Reproduce first** — Confirm the failure is observable and repeatable. Capture exact error, stack, logs, or steps. No fix without a reproduction.

2. **Hypothesis-driven** — Form one hypothesis at a time. Design the cheapest experiment that would falsify it. Do not pile on speculative changes.

3. **Localize** — Narrow the failure to the smallest responsible component or line range before editing.

4. **Minimal fix** — Change only what is required to address the root cause. Avoid drive-by refactors during debugging.

5. **Regression test** — Add a failing test that reproduces the bug, then make it pass with the fix. Keep the test.

6. **Evidence required** — Completion claims need the reproduction, the root-cause statement, the test evidence, and the verification result.

7. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Reproduce** — Capture the exact failure and the minimal steps or input that triggers it.
2. **Hypothesize** — State one falsifiable hypothesis.
3. **Experiment** — Run the cheapest check that can disprove the hypothesis. Record the result.
4. **Localize** — Narrow to the responsible code or system boundary.
5. **Fix + Test** — Write the regression test (RED), apply the minimal fix (GREEN), verify.
6. **Verify** — Re-run the original reproduction and the new test. Capture evidence.
7. **Handoff** — Root-cause summary + fix + test evidence + remaining risks.

Detailed checks: `references/debug-checklist.md`.

## Rules that override convenience

- No fix without a reproduction.
- No speculative multi-change debugging.
- No “it seems fixed” without re-running the failure case.
- Regression test required for the fixed bug.
- Speculative logging or temporary code must be removed or justified before handoff.

## Recommended external skills (optional)

| Need | Skill | Install |
|------|-------|---------|
| Systematic debugging | obra/superpowers | `npx skills add obra/superpowers --skill systematic-debugging` |
| Error recovery | addyosmani/agent-skills | `npx skills add addyosmani/agent-skills --skill debugging-and-error-recovery` |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `skills/coding-master/SKILL.md`.
