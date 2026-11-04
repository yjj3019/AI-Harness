# Design Skills Supplements (PPT, Diagrams, Visual QA)

**Status**: Curated external references and adoption guidance. Optional. Does not install runtimes or change evidence gates.

AI-Harness already has `skills/design-evidence-harness/SKILL.md` (adapted from huashu-design principles) for evidence-preserving visual verification. This document maps high-quality external agent skills and repositories that can strengthen design workflows while staying inside the harness’s evidence, approval, and progressive-disclosure boundaries.

## Recommended external sources (as of 2026-11)

| Area | Repository / Skill | Strengths | Fit with AI-Harness | Notes |
|------|--------------------|-----------|---------------------|-------|
| Editable PPTX | [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) | Native, structured PPTX; high editability; strong independent test scores | High — pair with evidence checks | Top-rated in 2026 community evaluations for colleague-editable decks |
| Editable PPTX | [mpuig/agent-slides](https://github.com/mpuig/agent-slides) | 7 composable skills (extract/build/audit/critique/polish) + CLI | High — maps cleanly to Phase roles | Good for staged, auditable workflows |
| Consulting decks | [appautomaton/presentation](https://github.com/appautomaton/presentation) | Storyboard → brand → PDF or native PPTX; clear handoffs | Medium-High | Composable; plain-file handoffs |
| McKinsey-style | [likaku/Mck-ppt-design-skill](https://github.com/likaku/Mck-ppt-design-skill) | 70 layout patterns, flat design, python-pptx, gate scripts | Medium-High | Strong pattern library; check license before reuse |
| Diagrams (HTML/SVG) | [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) | Clean HTML + SVG diagrams (many types) | High | Portable; easy visual QA |
| Data viz honesty | [Dheemant19/dataviz-design-skill](https://github.com/Dheemant19/dataviz-design-skill) | Chart chooser, claims-and-evidence, perception defaults | High | Aligns with “evidence-first” |
| Content-led PPTX | [sirilsengolraj-source/presentation-skill](https://github.com/sirilsengolraj-source/presentation-skill) | JSON source of truth, presets, rendered visual QA | High | Rebuild-from-source pattern |
| Precision PPT | [sunchaokun/PPT-Design-Skill](https://github.com/sunchaokun/PPT-Design-Skill) | Build Mode with pixel-level control + visual rework loop | Medium | Strong visual gates |
| HTML slides | Various (frontend-slides, guizang-ppt-skill, etc.) | High visual freedom, browser-native | Medium | Prefer when editability in PowerPoint is not required |

Also see community round-ups such as agentskillshub PPT rankings and top-agent-skills diagram guides for current rankings.

## How to adopt without weakening the harness

1. **Keep evidence first** — Any generated PPTX, HTML, SVG, or chart must still be verified with observable artifacts (rendered screenshots, editability checks, contrast/overlap notes, source-of-truth diffs). Use or extend `skills/design-evidence-harness/SKILL.md`.
2. **Progressive disclosure** — Treat external skills as optional. Load body only when the task matches (PPT, diagram, chart). Put long pattern libraries in `references/` inside the skill folder.
3. **Staged workflow** — Prefer extract → plan → build → audit → critique → polish (inspired by agent-slides and presentation skills). Map stages to Phase checklists when used inside a Phase.
4. **Editability vs. visual polish** — Decide the delivery contract up front:
   - Colleague will edit in PowerPoint → native PPTX (ppt-master, Mck-ppt, agent-slides).
   - Present in browser or one-off → HTML/SVG acceptable.
   - Scientific / data claims → pair with dataviz-design principles.
5. **No silent runtime installs** — Document required tools (python-pptx, Playwright, etc.) in the skill or HANDOFF. Require human approval for dependency installs or external image generation.
6. **License hygiene** — Prefer MIT/Apache. Record provenance. Do not copy large asset libraries without checking license.

## Practical integration patterns

- **PPT Phase**: Brief → storyboard/outline → generate with chosen external skill → run design-evidence-harness checks (layout, contrast, editability, chart honesty) → record evidence via phase-gate if inside a Phase.
- **Diagram Phase**: Prose or architecture notes → diagram-design or Mermaid/Excalidraw skill → self-check render → visual QA.
- **Chart Phase**: Headline first (what must be proven) → chart type selection (dataviz skill) → generate → lint on rendered image.

## What remains optional

These supplements do not replace the existing Phase evidence gates, compound-log, or approval boundaries. They improve the quality of design artifacts produced under those constraints.

See also:
- `skills/design-evidence-harness/SKILL.md`
- `docs/ppt-harness-workflow.md`
- `docs/skill-design-progressive-disclosure.md`
- `docs/multi-host-balancing.md`
