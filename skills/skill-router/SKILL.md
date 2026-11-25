---
name: skill-router
description: Meta-skill that maps user intent to the correct master skill. Use at the start of any non-trivial task, or when unsure which skill applies. Routes to coding-master, debugging-master, security-master, observability-master,  performance-master, design-master, document-master, ppt-master, writer-master, visual-artist, anti-ai-harness, office-master, or others.
license: MIT
---

# Skill Router

**Goal**: Load the right skill for the task instead of guessing or loading everything.

This is a meta-skill. It does not perform the work itself. It selects and hands off.

## Routing table

| Intent signal | Load this skill |
|---------------|-----------------|
| New feature, implement, code, TDD, refactor logic | [coding-master](../coding-master/SKILL.md) |
| Bug, error, crash, unexpected behavior, debug | [debugging-master](../debugging-master/SKILL.md) |
| Security, auth, secrets, input validation, OWASP, audit | [security-master](../security-master/SKILL.md) |
| Logs, metrics, traces, observability, instrumentation | [observability-master](../observability-master/SKILL.md) |
| Slow, performance, latency, optimize, profile | [performance-master](../performance-master/SKILL.md) |
| UI design, brand system, layout, tokens | [design-master](../design-master/SKILL.md) |
| Document, README, guide, Diátaxis, plain language | [document-master](../document-master/SKILL.md) |
| PPT, slides, presentation, deck | [ppt-master](../ppt-master/SKILL.md) |
| Writing, tech blog, report, essay, copy, fact-check | [writer-master](../writer-master/SKILL.md) |
| Poster, chart, infographic, shapes, static visual, aesthetics | [visual-artist](../visual-artist/SKILL.md) |
| Prose style, anti-slop, AI tells (writing style only) | [anti-ai-harness](../anti-ai-harness/SKILL.md) |
| Office file, docx, pptx, xlsx, pdf, hwpx, deck/report/sheet | [office-master](../office-master/SKILL.md) |
| Browser, Playwright, E2E, screenshot evidence | [browser-evidence](../browser-evidence/SKILL.md) |
| Check external skill safety | [skill-audit](../skill-audit/SKILL.md) |
| Multiple skills needed for one feature | [skill-composition](../skill-composition/SKILL.md) |

중복 신호 우선 구분: "보고서·문서"는 **내용(writer-master)** 과 **파일(office-master)** 을 먼저 가른다. 모호하면 표의 첫 일치 대신 1문장으로 확인한다.

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
