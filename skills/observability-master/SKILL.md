---
name: observability-master
description: Highest-quality observability and instrumentation workflow. Ensures logs, metrics, and traces are designed with the feature, secrets are never logged, and production behavior is diagnosable. Use when adding features that will run in production or when diagnosing  issues that lack sufficient telemetry.
---

# Observability Master

**Goal**: Make systems diagnosable from the outside. Instrumentation is written with the feature, not after the first incident.

Synthesized from the strongest open patterns (2026):
- addyosmani/agent-skills `observability-and-instrumentation`
- SRE and OpenTelemetry practices from various agent skills

Does not vendor upstream code. Apply this skill’s gates on top of any external observability skill.

## Core principles

1. **Instrument with the feature** — New endpoints, jobs, and external calls get logs, metrics, or traces at the same time as the logic. Not a post-launch add-on.

2. **Answer “what and why”** — Telemetry must allow answering what the system is doing and why, without requiring a code deploy.

3. **No secrets in telemetry** — Never log tokens, passwords, full PII, or credentials. This is a hard rule.

4. **Structured over free-text** — Prefer structured fields that can be queried. Avoid unbounded string interpolation of user data.

5. **Measure before claiming** — When diagnosing performance or reliability, use existing signals or add the minimum needed. Do not guess.

6. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Identify surfaces** — List new or changed operations that cross process, network, or user boundaries.
2. **Design signals** — Decide the minimal logs, metrics, or spans needed to diagnose failure and latency.
3. **Implement** — Add instrumentation alongside the logic. Use existing project conventions.
4. **Verify** — Confirm signals appear as expected (or note how they would be verified). Check that secrets are absent.
5. **Handoff** — List of signals added + verification method + residual gaps.

Detailed checks: `references/observability-checklist.md`.

## Rules that override convenience

- No secrets, tokens, or full PII in logs or traces.
- Do not claim a feature is “observable” without listing the signals.
- Temporary debug logs must be removed or justified before handoff.
- Prefer existing telemetry conventions of the project.

## Recommended external skills (optional)

| Need | Skill | Install |
|------|-------|---------|
| Observability | addyosmani/agent-skills | `npx skills add addyosmani/agent-skills --skill observability-and-instrumentation` |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `skills/debugging-master/SKILL.md`, `skills/security-master/SKILL.md`.
