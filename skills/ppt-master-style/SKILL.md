---
name: ppt-master-style
description: >
  Staged, gated workflow for producing native-editable PowerPoint decks inspired by ppt-master.
  Use when the user asks to create, generate, reconstruct, beautify, or template a PPT/PPTX/slide deck
  and wants native shapes rather than screenshots. Prefer this over one-shot generation.
---

# PPT Master Style Workflow (AI-Harness Adaptation)

**Status**: Optional skill. Inspired by [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) (MIT).  
Does not vendor the original scripts or assets. Full native export still benefits from the upstream skill or equivalent tools (python-pptx, svg_to_pptx patterns).

This skill encodes the *workflow discipline* (routing, staged gates, source-of-truth, visual QA) so it stays compatible with AI-Harness evidence rules and progressive disclosure.

## When to use

- User wants a deck a colleague can edit in PowerPoint (native objects preferred).
- Source is a document, outline, topic, or existing PPTX to improve.
- One-shot generation has previously produced poor layout or non-editable output.

## Route selection (do this first)

Choose exactly one primary route:

| Route | When | Primary output |
|-------|------|----------------|
| **Generate** | New deck from topic or document | Native PPTX + intermediate sources |
| **Template** | Build reusable brand/style/layout workspace | Template workspace + sample deck |
| **Edit / Beautify** | Improve an existing PPTX | Updated native PPTX |
| **Quick** | Explicit speed request or small deck | Faster path with reduced gates |

If ambiguous, ask once, then proceed.

## Core stages (Generate route)

1. **Intake & source normalization**  
   - Confirm brief, audience, length, delivery contract (editable PPTX required?).  
   - Convert sources to clean Markdown or structured outline if needed.  
   - Record assumptions.

2. **Design spec lock (blocking)**  
   - Produce a short design spec: narrative arc, color/typography direction, density, chart policy.  
   - **Stop and wait for explicit user confirmation** before heavy generation.  
   - Save spec as `design_spec.md` or equivalent in the working folder.

3. **Page planning**  
   - Slide-by-slide outline with titles that state the claim (action titles preferred).  
   - Note required charts, tables, diagrams.

4. **Authoring**  
   - Prefer intermediate source of truth (Markdown, JSON outline, or SVG pages) over opaque images.  
   - When using external tools (upstream ppt-master, python-pptx, etc.), keep the intermediate files.

5. **Quality gates (before final export)**  
   - Visual review of rendered pages (overflow, contrast, alignment, hierarchy).  
   - Chart honesty check (claims match data encoding).  
   - Editability check: text is native text boxes, charts are native where claimed.  
   - Run or reference `skills/design-evidence-harness/SKILL.md` checks.  
   - Record failures as FAIL; do not claim done.

6. **Export & handoff**  
   - Produce final `.pptx`.  
   - List intermediate artifacts, known limitations, and unverified items.  
   - If inside a Phase, record evidence only through the phase gate (never hand-write evidence files).

## Blocking rules

- Design spec confirmation is blocking unless the user explicitly said “quick” or “no confirmation needed”.
- Do not silently install heavy dependencies. Document required tools and request approval.
- Do not claim native editability without evidence (opening in PowerPoint or equivalent inspection).

## Integration with AI-Harness

- Pair with `skills/design-evidence-harness/SKILL.md` for visual and editability verification.
- See `docs/design-skills-supplements.md` for the broader external catalog.
- For full upstream capability (SVG→PPTX scripts, template workspaces, narration), install or reference [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) separately and follow its SKILL.md load order.
- Progressive disclosure: this file is the entry; load detailed checklists only when executing a stage.

## Quick checklist (copy into working notes)

- [ ] Route selected
- [ ] Brief and delivery contract confirmed
- [ ] Design spec locked (or Quick explicitly chosen)
- [ ] Page plan with claim-oriented titles
- [ ] Intermediate sources kept
- [ ] Visual + editability + chart checks run
- [ ] Final PPTX produced and limitations recorded

## What this skill does not do

- It does not replace the upstream ppt-master implementation.
- It does not weaken Phase evidence gates or approval boundaries.
- It does not guarantee pixel-perfect output without the original tooling and model quality.
