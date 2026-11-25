---
name: design-master
description: Design and review interfaces using the product brief, brand tokens, accessibility requirements, and rendered evidence. Use for frontend design, UI components, brand systems, and landing pages.
license: MIT
---

# Design Master

**Goal**: Produce interfaces and visual systems that are intentional, product-specific, and verifiable — not generic AI slop.

Synthesized from the strongest open patterns (2026) — licenses measured via GitHub API spdx_id 2026-11-14:
- Anthropic `frontend-design` — distinctive art direction before code (Anthropic 상표·명칭 미사용, 아이디어만)
- [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT) — art direction + browser check
- [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) — searchable patterns
- [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) — critique and anti-patterns
- [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT) — motion and design engineering taste
- Anthropic `brand-guidelines` — consistent tokens (Anthropic 상표·명칭 미사용, 아이디어만)
- [AgentsORG/DESIGN](https://github.com/AgentsORG/DESIGN) (MIT) — living `.design` visual contract
- [tigerless-labs/design-harness](https://github.com/tigerless-labs/design-harness) (NOASSERTION — 커스텀 라이선스, 코드 복사 금지, 아이디어만)

Does not vendor upstream code. Apply this skill’s gates on top of any external design skill.

## Core principles

1. **Art direction first** — Name the subject, audience, and single job. Choose a deliberate palette, type, and layout before writing code. Take one justified aesthetic risk only when it serves the brief.

2. **Fit to context** — Keep familiar colors, type, and components when they serve the brand and the task. Change a pattern when it causes a specific problem such as unclear hierarchy, poor contrast, or extra steps. See `references/anti-slop.md`.

3. **Tokens over raw values** — Prefer semantic tokens (color, type, spacing, radius). Document them. If a design system exists, use it.

4. **Source of truth** — Keep a short design brief or `.design`-style contract. Record decisions and why.

5. **Visual QA before done** — Browser or render check at multiple widths. Contrast, hierarchy, alignment, states (empty/loading/error), accessibility.  
   Use [design evidence checklist](../design-evidence-harness/SKILL.md). Record FAIL. Evidence required.

6. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Brief** — Subject, audience, job, constraints, existing brand/system.
2. **Art direction** — Select palette tokens, type roles, and layout from the brief. Include a signature idea when it helps the audience.
3. **System** — Tokens, component rules, states, anti-patterns to avoid.
4. **Implementation** — Build within the locked direction. Prefer existing components and tokens.
5. **Critique & QA** — Self-critique against the brief and anti-slop list. Visual evidence. Accessibility check.
6. **Handoff** — Deliverables + known limitations + unverified items.

Detailed checks: `references/anti-slop.md`, `references/visual-qa.md`.

## Minimal working set

- Design brief or art-direction note
- Token / system notes (even if short)
- Implementation
- Visual QA notes with evidence

## Rules that override convenience

- No silent dependency installs.
- No hand-written Phase evidence.
- State the chosen direction and its purpose before heavy implementation.
- Visual QA and accessibility are mandatory before claiming done.
- Prefer existing design systems and tokens over invention.

## Recommended external skills (optional)

| Need | Skill | Install |
|------|-------|---------|
| Distinctive frontend | anthropics/skills (frontend-design) | `npx skills add anthropics/skills --skill frontend-design` |
| Anti-slop + browser check | Leonxlnx/taste-skill | `npx skills add Leonxlnx/taste-skill` |
| Pattern library | nextlevelbuilder/ui-ux-pro-max-skill | `npx skills add nextlevelbuilder/ui-ux-pro-max-skill` |
| Critique | pbakaus/impeccable | `npx skills add pbakaus/impeccable` |
| Motion taste | emilkowalski/skills | `npx skills add emilkowalski/skills` |
| Living contract | AgentsORG/DESIGN | `npx skills add AgentsORG/DESIGN` |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `docs/design-skills-supplements.md`, `skills/design-evidence-harness/SKILL.md`, `skills/ppt-master/SKILL.md`.
