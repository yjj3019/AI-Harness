---
name: ppt-master
description: Highest-quality PowerPoint workflow for AI agents. Produces native-editable PPTX decks with claim-oriented action titles, design-spec lock, source-of-truth intermediates, visual QA gates, and chart honesty checks. Use for any PPT, PPTX, slide deck, pitch,  board, academic, or consulting presentation. Prefer this over one-shot generation.
license: MIT
---

# PPT Master

**Goal**: Deliver a deck a colleague can open in PowerPoint and keep editing — native shapes, text, charts, and tables — with a clear argument and verified visual quality.

Synthesized from the strongest open patterns (2026) — licenses measured via GitHub API spdx_id 2026-11-14:
- [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) (MIT) — routed native PPTX pipeline
- [likaku/Mck-ppt-design-skill](https://github.com/likaku/Mck-ppt-design-skill) (Apache-2.0) — consulting layout patterns
- [Gabberflast/academic-pptx-skill](https://github.com/Gabberflast/academic-pptx-skill) (MIT) — action titles & ghost-deck test
- [siril9/presentation-skill](https://github.com/siril9/presentation-skill) (MIT) — JSON source + visual QA
- [sunchaokun/PPT-Design-Skill](https://github.com/sunchaokun/PPT-Design-Skill) (MIT) — design decision gates
- Anthropic official `pptx` skill — baseline file operations (anthropics/skills 독점 항목 — 상표·명칭 미사용, 아이디어만)
- [EveryInc/hands-on-deck](https://github.com/EveryInc/hands-on-deck) (MIT) — atomic edit discipline

Does not vendor upstream code. Full native export still benefits from installing one of the above when available.

## Route (choose one)

| Route | Use when | Blocking gates |
|-------|----------|----------------|
| **Generate** | New deck from topic or document | Design spec lock |
| **Consulting / Academic** | Board, strategy, paper, defense | Design spec + action-title review |
| **Template / Brand** | Reusable workspace from existing assets | Spec + style lock |
| **Edit / Beautify** | Improve existing PPTX | Scope confirmation |
| **Quick** | Explicit speed request | Minimal (user opt-out) |

If ambiguous, ask once.

## Core principles (always)

1. **Action titles** — Every slide title is a complete sentence stating the takeaway, not a topic label.  
   Ghost-deck test: titles alone must tell the story.

2. **Source of truth** — Keep `brief.md`, `design_spec.md`, `page_plan.md` (or `outline.json`).  
   Prefer these over opaque images.

3. **Design spec lock (blocking)** — Narrative arc, visual direction, density, chart policy.  
   Stop for explicit user confirmation unless Quick.

4. **Native editability** — Text boxes, shapes, charts, tables must be native objects where claimed.  
   Evidence required (file inspection or render).

5. **Visual QA before done** — Overflow, contrast, alignment, hierarchy, chart honesty.  
   Use [design evidence checklist](../design-evidence-harness/SKILL.md). Record FAIL. Do not claim completion without evidence.

6. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages (Generate / Consulting)

1. **Intake** — Brief, audience, purpose, length, must-include points, brand constraints, delivery contract.
2. **Design spec** — Narrative, visual direction, density, chart policy. **Block for confirmation.**
3. **Page plan** — Claim-oriented titles + key evidence/visual per slide. Ghost-deck check.
4. **Authoring** — Build from source of truth. Use available native tools (python-pptx, upstream ppt-master, hands-on-deck, etc.).
5. **Quality gates** — Visual + editability + chart honesty. Fix or accept explicitly.
6. **Export & handoff** — Final `.pptx` + intermediates + known limitations.

Detailed checklists: `references/quality-gates.md`, `references/action-titles.md`.

## Minimal working set

- `brief.md`
- `design_spec.md` (locked)
- `page_plan.md` (action titles)
- Final `.pptx`
- Short verification notes

## Rules that override convenience

- No silent dependency installs.
- No hand-written Phase evidence.
- Native editability and chart honesty must be evidenced.
- Prefer claim-oriented action titles over topic labels.
- Visual QA is mandatory before claiming done.

## Recommended external tools (optional)

| Need | Tool | Install |
|------|------|---------|
| Full native SVG→PPTX + templates | hugohe3/ppt-master | `npx skills add hugohe3/ppt-master` |
| Consulting layouts | likaku/Mck-ppt-design-skill | clone + python-pptx |
| Atomic PPTX editing | EveryInc/hands-on-deck | clone |
| Official baseline | anthropics/skills (pptx) | `npx skills add anthropics/skills --skill pptx` |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `docs/design-skills-supplements.md`, `skills/design-evidence-harness/SKILL.md`, `skills/ppt-master-style/`.
