# Detailed Stages (Generate route)

Load this file only when executing the Generate route.

## Stage 1 — Intake

- Capture: topic or source files, audience, purpose, desired length, must-include points, brand constraints, delivery contract (native editable PPTX?).
- Normalize sources to Markdown or a structured outline.
- List assumptions and open questions.
- Output: `brief.md` or section in working notes.

## Stage 2 — Design Spec (BLOCKING)

Produce `design_spec.md` covering:

- Narrative arc (problem → insight → action or equivalent)
- Visual direction (palette family, typography tone, density: sparse / medium / dense)
- Chart policy (native charts preferred; claims must match encodings)
- Master/layout expectations if known
- What is out of scope

**Stop.** Wait for explicit user confirmation ("approved", "go", "lock it") unless Quick route was chosen.

## Stage 3 — Page Plan

- One line per slide: claim-oriented title + key evidence or visual.
- Flag slides that need charts, tables, diagrams, or images.
- Keep total slides reasonable for the brief.
- Output: `page_plan.md`

## Stage 4 — Authoring

- Prefer keeping a source of truth (outline JSON, Markdown per slide, or SVG pages).
- If using upstream ppt-master or python-pptx scripts, retain their intermediate directories.
- Avoid pure screenshot slides unless the user explicitly accepts them.

## Stage 5 — Quality Gates

Run before final export. Record results.

- Visual: overflow, low contrast, misalignment, hierarchy failures
- Editability: native text boxes, native charts/tables where claimed
- Chart honesty: visual encoding matches the claim
- Completeness: every planned slide present

Use `skills/design-evidence-harness/SKILL.md` as the verification checklist.  
Any FAIL must be fixed or explicitly accepted by the user before claiming completion.

## Stage 6 — Export & Handoff

- Final `.pptx`
- List of intermediate artifacts
- Known limitations and unverified items
- If this work is inside a Phase, evidence goes through the phase gate only.
