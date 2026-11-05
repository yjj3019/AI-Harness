---
name: design-master
description: Highest-quality design workflow for UI, visual systems, brand, and interfaces. Forces distinctive art direction, design-system tokens, anti-slop rules, and evidence-based visual QA. Use for frontend design, UI components, brand systems,  landing pages, or any visual interface work. Prefer this over generic generation.
---

# Design Master

**Goal**: Produce interfaces and visual systems that are intentional, product-specific, and verifiable — not generic AI slop.

Synthesized from the strongest open patterns (2026):
- Anthropic `frontend-design` — distinctive art direction before code
- [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) — art direction + browser check
- [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — searchable patterns
- [pbakaus/impeccable](https://github.com/pbakaus/impeccable) — critique and anti-patterns
- [emilkowalski/skills](https://github.com/emilkowalski/skills) — motion and design engineering taste
- Anthropic `brand-guidelines` — consistent tokens
- [AgentsORG/DESIGN](https://github.com/AgentsORG/DESIGN) — living `.design` visual contract
- [tigerless-labs/design-harness](https://github.com/tigerless-labs/design-harness) — evidence-linked design reasoning

Does not vendor upstream code. Apply this skill’s gates on top of any external design skill.

## Core principles

1. **Art direction first** — Name the subject, audience, and single job. Choose a deliberate palette, type, and layout before writing code. Take one justified aesthetic risk.

2. **Anti-slop** — Reject generic AI defaults: purple gradients, nested cards for everything, oversized pills, arbitrary bento, decorative motion, Inter-only type, low-contrast gray-on-white.

3. **Tokens over raw values** — Prefer semantic tokens (color, type, spacing, radius). Document them. If a design system exists, use it.

4. **Source of truth** — Keep a short design brief or `.design`-style contract. Record decisions and why.

5. **Visual QA before done** — Browser or render check at multiple widths. Contrast, hierarchy, alignment, states (empty/loading/error), accessibility.  
   Use `skills/design-evidence-harness/SKILL.md`. Record FAIL. Evidence required.

6. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Brief** — Subject, audience, job, constraints, existing brand/system.
2. **Art direction** — Palette (named hex or tokens), type roles, layout concept, one signature idea. Optional: lock with user.
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
- Distinctive direction must be stated before heavy implementation.
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
