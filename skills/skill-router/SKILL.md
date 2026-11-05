---
name: skill-router
description: >
  Meta-skill that maps user intent to the correct master skill.
  Use at the start of any non-trivial task, or when unsure which skill applies.
  Routes to coding-master, debugging-master, security-master, observability-master,
  performance-master, design-master, document-master, ppt-master, or others.
---

# Skill Router

**Goal**: Load the right skill for the task instead of guessing or loading everything.

This is a meta-skill. It does not perform the work itself. It selects and hands off.

## Routing table

| Intent signal | Load this skill |
|---------------|-----------------|
| New feature, implement, code, TDD, refactor logic | `skills/coding-master/SKILL.md` |
| Bug, error, crash, unexpected behavior, debug | `skills/debugging-master/SKILL.md` |
| Security, auth, secrets, input validation, OWASP, audit | `skills/security-master/SKILL.md` |
| Logs, metrics, traces, observability, instrumentation | `skills/observability-master/SKILL.md` |
| Slow, performance, latency, optimize, profile | `skills/performance-master/SKILL.md` |
| UI design, visual, brand, layout, anti-slop | `skills/design-master/SKILL.md` |
| Document, README, guide, Diátaxis, plain language | `skills/document-master/SKILL.md` |
| PPT, slides, presentation, deck | `skills/ppt-master/SKILL.md` |
| Browser, Playwright, E2E, screenshot evidence | `skills/browser-evidence/SKILL.md` |
| Check external skill safety | `skills/skill-audit/SKILL.md` |
| Multiple skills needed for one feature | `skills/skill-composition/SKILL.md` |

## Process

1. Read the user request.
2. Match against the table above. Prefer the most specific match.
3. If multiple match, prefer the composition skill or load the primary skill and note secondary ones.
4. Load the selected SKILL.md and follow it.
5. If no clear match, ask one clarifying question rather than loading several skills.

## Rules

- Do not load every master skill by default.
- Description-level triggers in each skill still apply after routing.
- Phase evidence rules of the target skill remain in force.
- This skill itself does not generate Phase evidence.

See `references/routing-examples.md` for examples.
