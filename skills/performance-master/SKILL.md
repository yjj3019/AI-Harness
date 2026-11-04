---
name: performance-master
description: >
  Highest-quality performance workflow.
  Enforces measure-first optimization, regression verification,
  and evidence-based claims. No premature optimization.
  Use when investigating slowness, claiming a performance improvement,
  or reviewing changes that may affect latency or resource use.
---

# Performance Master

**Goal**: Optimize only what is measured. Claims of improvement require before/after evidence.

Synthesized from the strongest open patterns (2026):
- addyosmani/agent-skills `performance-optimization`
- Measure-first practices from senior-engineer skills

Does not vendor upstream code. Apply this skill’s gates on top of any external performance skill.

## Core principles

1. **Measure first** — Do not optimize without a measurement that shows a problem. Speculation is not evidence.

2. **One change at a time** — Isolate the change whose effect is being measured. Avoid bundling unrelated refactors with performance work.

3. **Before/after evidence** — Any claim of improvement must include the measurement method and the before/after numbers or traces.

4. **Regression check** — Verify that the change does not degrade other important paths. Run relevant tests.

5. **Correctness first** — Performance work must not break existing behavior. Tests stay green.

6. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Establish baseline** — Capture current measurements (timing, traces, resource use) for the relevant path.
2. **Hypothesize** — State what is expected to improve and why.
3. **Change** — Apply the smallest change that addresses the measured issue.
4. **Re-measure** — Capture the same measurements after the change.
5. **Verify** — Confirm tests still pass and no unintended regressions on related paths.
6. **Handoff** — Before/after evidence + method + residual risks.

Detailed checks: `references/performance-checklist.md`.

## Rules that override convenience

- No “this should be faster” without measurement.
- No large refactors justified only by performance speculation.
- Before/after numbers or traces required for improvement claims.
- Existing tests must still pass.

## Recommended external skills (optional)

| Need | Skill | Install |
|------|-------|---------|
| Performance optimization | addyosmani/agent-skills | `npx skills add addyosmani/agent-skills --skill performance-optimization` |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `skills/coding-master/SKILL.md`, `skills/observability-master/SKILL.md`.
