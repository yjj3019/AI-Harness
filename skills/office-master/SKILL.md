---
name: office-master
description: Coordinator and quality gate for producing, reading, converting, and validating office documents — PPTX, DOCX, XLSX, PDF, HWPX — with per-format acceptance criteria, brand/template overlays, a role-separated build-then-critique loop, and a documented deliverable gate. Use for reports, decks, sheets, PDFs, and Hangul (HWPX) documents. Composes writer-master and visual-artist.
license: MIT
---

# Office Master — Document Quality Gate

**Goal**: Ship a document that opens, renders, edits, and is factually sound — not just a file that was created. The gate decides; the builder does not self-approve.

Original content for this repository. Synthesizes ideas from document skills surveyed in `docs/anti-ai-skills-2026-11-11.md` (실측 2026-11-11); no upstream text is copied.

## Loop (role-separated)

1. **Read the brief** — Format, audience, purpose, length, conversion target — state it in one line: `Making this as: PPTX Q1 deck, company brand, 16:9, 12 slides`.
2. **Route** — docx / pptx / xlsx / pdf / hwpx × build / read / convert; pick the engine for this environment.
3. **Overlay** — Brand (existing template or captured brand/kit: colors, fonts, logo, policy) and message structure (answer-first: action title, one-page summary, conclusion up front).
4. **Build** — Content first, design second. Facts come from a facts list with sources; real assets only.
5. **Critique (independent)** — A separate pass lists text/cells as extracted text, runs the format gate, then judges what scripts cannot judge.
6. **Verify & report** — Smallest fix per violation, re-run until green (cap 3), report with command output. Missing tools are reported as unavailable — never faked, never skipped silently.

## The format gate

Per-format acceptance criteria: `references/format-gate.md`. Common rules first:

- **Facts** — Every number, date, and statistic exists in a sourced facts list or it is cut.
- **No emoji / PII / insecure links** — bracket markers allowed; PII and insecure links are gate failures.
- **Accessibility essentials** — Declared colors pass contrast; headings are real styles, not bold text.
- **Rendering** — Where a renderer exists, render and inspect; where none exists, mark the render step **unavailable** in the report.
- **Editable** — Text, tables, shapes, and charts stay natively editable; no flattened fakes.
- **No fabricated output** — A missing engine or tool produces a documented placeholder, never a pretended file.

## Deliverable handoff — 4 blocks

**PASS / 재작업 / **kept facts with sources** / **failed items + render status**. PASS requires the gate to be green and the report to state what was and was not checked.

## Rules

- **No gate changes** — This skill never writes phase evidence or gate records and never skips a criterion for convenience; approval, verification, and read-proof rules apply unchanged.
- **Style ≠ quality** — A beautiful file that fails the gate fails. A passing gate is not a human review.
- **Route to domain skills** — Content and prose → `writer-master`; charts, shapes, infographics → `visual-artist`; UI/brand systems → `design-master`; slides as design-first decks → `ppt-master`; prose editing only → `anti-ai-harness`.

## Boundaries

Engines available in this environment (bundled LibreOffice, python-docx/pptx/xlsxwriter/openpyxl etc.) decide what can actually be built and rendered; HWPX rendering depends on a Hangul-capable engine, and absence is disclosed. This skill is original reference material, not a license opinion, a verifier, or a guarantee.
