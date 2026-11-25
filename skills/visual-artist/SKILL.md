---
name: visual-artist
description: Maximize the aesthetic quality of static visual output — posters, covers, charts, infographics, diagrams, and shapes — with a numeric visual-quality scorecard, art-direction brief, and critique-and-refine loop. Use for images, charts, posters, infographics, and static graphics. Pairs with design-master (UI) and anti-ai-harness (anti-slop) without replacing them.
license: MIT
---

# Visual Artist

**Goal**: Make static visual artifacts — posters, covers, diagram figures, charts, infographics, abstract shapes — look and read as deliberate visual design, judged by a numeric scorecard, not by how "polished" it feels.

This skill is original content written for this repository, synthesizing review ideas documented in `docs/anti-ai-skills-2026-11-11.md` and `docs/design-skills-supplements.md`. It copies no upstream source.

## Core principles

1. **Philosophy before pixels** — Name one visual idea (space, form, palette, rhythm, hierarchy) before placing marks. A poster is a visual statement; a chart is a visual statement with a takeaway.
2. **One message per artifact** — One takeaway, one accent, one dominant mark. One accent hue, one bold number, one heavy stroke. Everything else whispers.
3. **Honest marks** — Length and position carry exact values; area only suggests size; color separates categories. Numbers stay true: axes start at zero or break loudly, units and sources stay visible, and no metric is invented.
4. **Numeric scorecard** — Score every artifact on 7 axes (composition/balance 20 · typography/hierarchy 15 · color/harmony 15 · whitespace/proportion 15 · originality/fit 15 · clarity/legibility 15 · render 5) out of 100. A score without the checklist and the render pass is not done.
5. **Show the render, then re-score** — Inspect the actual rendered output (open the PNG/PDF/SVG it lands like), check the pixels, then re-score. A source that passes and a render that fails is a fail.

## Stages

1. **Brief** — Subject, audience, takeaway, constraints, any existing palette/type.
2. **Art direction** — One visual idea in one line, a 3-4 color palette, a type plan, a composition rule (grid, symmetry, rhythm), one accent.
3. **Compose** — Compose with space, weight, ratio, baseline grid, and hierarchy before styling. Text is a visual element: minimal, essential, contained, overlapping nothing.
4. **Build** — Draw the artifact (SVG/PDF/PNG), one file for one takeaway.
5. **Score** — `references/scorecard.md`: 7 axes, out of 100, each with a one-line reason and a one-line fix. Text that overlaps, or a chart that distorts data, is a 0 on render regardless of taste.
6. **Refine** — One critique by a fresh-eye pass against the brief, one revision, then one re-score. A score that did not change is not a revision.
7. **Handoff** — Output + score, kept facts, sources, uncovered items. Same three always listed: kept, uncovered, remaining risk.

## Scorecard

See `references/scorecard.md`: 7 axes, 100 points, checklist, examples of 0-point fails.

## Rules

- **No invented numbers** — Every number, label, unit, and source exists in the data or the brief. Anything else is removed or marked.
- **No hand-written Phase evidence** — This skill never writes gate records; those stay with the phase gate and evidence rules.
- **No render skip** — A static artifact is scored against its rendered output, not its source.
- **Lead with the takeaway** — State the output's one message in one sentence; a second message is a second artifact.
- **Phase evidence rules still apply** — Inside a Phase, this skill follows the phase gate, read-proof, and verification rules unchanged.

## When not to use

- UI/component/brand systems → `design-master`.
- Prose/style review → `anti-ai-harness`. Copy layout/numerics/sources → `document-master`.
- Slides → `ppt-master`.

## Boundaries

This skill reads and reviews the artifact and its sources and renders where the host allows. It never claims authorship verdicts, never avoids detectors, never claims verification. It is not a human critic, a sandbox, or a guarantee.
