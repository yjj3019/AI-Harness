---
name: ppt-master-style
description: Apply the ppt-master staged, gated workflow for native-editable PowerPoint decks. Use when creating, generating, reconstructing, beautifying, or templating a PPT/PPTX/slide deck.  Prefer this over one-shot generation. Route first, lock design spec, keep source of truth, verify before export.
license: Apache-2.0
---

# PPT Master Style Workflow

Optional skill adapted from [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) (MIT).  
Encodes the workflow discipline for AI-Harness. Does not vendor upstream scripts.

## Apply the workflow

1. **Select route** (exactly one):
   - **Generate** — new deck from topic or document
   - **Template** — reusable brand/style/layout workspace
   - **Edit / Beautify** — improve existing PPTX
   - **Quick** — explicit speed request; fewer blocking gates

2. **Follow the stages for the chosen route.**  
   Detailed Generate stages: `references/stages.md` (load only when needed).

3. **Enforce blocking gates.**  
   Design spec confirmation is blocking on Generate/Template unless Quick was chosen. Do not proceed past a blocking gate without explicit user approval.

4. **Keep source of truth.**  
   Prefer outline, Markdown, JSON, or SVG intermediates over opaque images.

5. **Verify before claiming done.**  
   Run visual, editability, and chart-honesty checks. Use `skills/design-evidence-harness/SKILL.md`.  
   Record FAIL items. Do not claim completion without observable evidence.

6. **Handoff.**  
   Deliver final `.pptx` plus intermediate artifacts and known limitations.  
   Inside a Phase, record evidence only via the phase gate.

## Minimal working set

- `brief.md` or equivalent
- `design_spec.md` (locked)
- `page_plan.md`
- Final `.pptx`
- Short verification notes

## Rules that override convenience

- No silent dependency installs.
- No hand-written Phase evidence files.
- Native editability must be evidenced, not assumed.
- Chart claims must match the visual encoding.

## Full upstream capability

For SVG→PPTX scripts, template workspaces, narration, and the complete route authorities, use the original skill:

```bash
npx skills add hugohe3/ppt-master
# or clone and follow its SKILL.md load order
```

Then apply the same evidence and approval rules from this harness.

See also: `docs/design-skills-supplements.md`, `docs/ppt-harness-workflow.md`.
