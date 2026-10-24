# Office Document (PPT) Harness Workflow with Claude Code

This document improves on educational material by analyzing real failure patterns and external best practices (skill comparison, visual verification, narrative design). It does not copy source material verbatim.

Generating an entire deck in a single prompt causes modification costs to rise sharply. This workflow combines **document-based staged construction + sample-first verification + objective visual QA** to produce stable office documents.

## 1. Why Staged Documentation Is Necessary (Analysis)

Real failure causes are classified as follows:

| Failure Type | Cause | How Staged Approach Resolves It |
|--------------|-------|---------------------------------|
| Layout inconsistency · overflow | Too many slides generated at once | Fix tone, spacing, and tone-and-manner with a 3-slide sample first |
| Ambiguous core message | Slide titles remain section labels | Force “conclusion-style titles” in PageDetail |
| Data-message mismatch | Insufficient source grounding | Explicitly record supporting data in PageDetail and verify it |
| Non-editable artifacts | Some skills render tables/charts as images | Use Anthropic official pptx skill’s native OOXML |
| Infinite revision cycle | Full generation before direction approval | Place a sample verification gate |

The original educational sequence Brain → UpgradeBrain → Phase → PageDetail → PageLayout remains valid. This document preserves that sequence while strengthening **verification intensity and realistic skill characteristics**.

## 2. Recommended Skill and Technical Constraints

### Anthropic Official pptx Skill (Primary Recommendation)

The official skill is most stable for the following:

- **Native OOXML** table and chart generation (real editable objects, not images)
- Built-in QA loop that **renders slides to images** after generation to inspect overflow, overlap, and contrast
- Template-based generation and editing support

Installation (project or global):

```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

Visual QA requires LibreOffice (and Poppler) in the environment. Without them, overflow inspection becomes weaker.

### Skill Selection Guide

| Situation | Recommended Skill | Reason |
|-----------|-------------------|--------|
| General business reports / proposals | Anthropic official | Native objects + visual QA |
| Strong brand tone required | Official + additional design guidelines | Maintain editability |
| Paper / codebase-based charts | slides_maker or similar auxiliary | Strengthen native charts when needed |

## 3. Improved Staged Document Structure

The original 6-stage structure is retained, with **clear completion criteria** added to each stage.

| Stage | Document | Core Goal | Completion Criteria |
|-------|----------|-----------|---------------------|
| 0 | CLAUDE.md | Constitution + skill/template linking | Rules and reference paths are explicit |
| 1 | Brain.md | Free idea explosion | Contains claims, audience, questions, source keywords |
| 2 | UpgradeBrain.md | Logical concretization | One core claim + 3–5 pieces of supporting evidence are clear |
| 3 | Phase.md | Narrative flow | Gi-seung-jeon-gyeol or SCQA mapped to slide units |
| 4 | PageDetail.md | Per-page specification | Each slide has a conclusion-style title + supporting data |
| 5 | PageLayout.md | Visual placement | Template layout numbers and positions specified |
| 6 | sample.ppt | Direction verification | 3 slides pass visual QA |
| 7 | final.ppt | Full generation | Sample tone maintained + full verification |

### Narrative Strengthening Points (Additions)

- **Conclusion-style titles**: Use titles that contain a judgment (e.g., “Global market share of the company was under 5% in the target year”) rather than section labels such as “Background” or “Problem”.
- **Audience- and decision-centered**: Explicitly state who will see the deck and what decision is intended in UpgradeBrain.md or Phase.md.
- **Source grounding**: Record sources for numbers and comparative data in PageDetail.md; do not generate data that is not present.
- **One idea per slide**: Limit each slide to one core message in PageDetail.md.

## 4. CLAUDE.md Example (Improved Version)

```markdown
# CLAUDE.md - PPT Creation Harness

## Core Rules
- Sample first: Always generate a 3-slide sample and pass visual QA before full generation.
- Conclusion-style titles: Write slide titles as judgment sentences, not section labels.
- Source fidelity: Do not add new numbers beyond data explicitly stated in PageDetail.md.
- Native objects: Generate tables and charts as native OOXML (no images).
- Mandatory visual QA: After generation, render each slide to an image and check for overflow and contrast issues, then fix.

## References
- Skill: Anthropic document-skills (pptx)
- Template: templates/company_PPT_template.pptx
- Detailed workflow: docs/ppt-harness-workflow.md
```

## 5. Sample Creation and Verification (Strengthened)

### Example Prompt

```
/pptx
Referencing CLAUDE.md, PageDetail.md, and PageLayout.md, first create a 3-slide sample.
Filename: sample.pptx
Requirements:
- Apply the company template
- Use conclusion-style titles
- After generation, render each slide to an image, check for overflow/contrast problems, and fix them
```

### Verification Points (Additions)

- Visual: text overflow, element overlap, contrast ratio
- Content: does the message come across from the title alone?
- Technical: are tables/charts editable native objects?
- Brand: is the template slide master preserved?

## 6. Full Generation and Feedback Loop

Generate the full deck only after the sample passes. Perform visual QA again after full generation.

Record failure patterns in `docs/compound-log.md` so they are reflected in the next creation. Example:

```markdown
### [YYYY-MM-DD] PPT Phase - Visual QA
- **Issue/Risk**: Text overflow occurred on sample slide 2
- **Root Cause**: Font size constraint missing in PageLayout.md
- **Resolution/Pattern**: Explicitly state maximum character count in PageLayout.md and enforce inspection at the sample stage
```

## 7. Linkage with Harness Principles (Strengthened)

| Harness Principle | PPT Workflow Application |
|-------------------|--------------------------|
| No One-Shot | Full generation only after 3-slide sample gate |
| Phase management | Brain → PageDetail → sample → final |
| Independent evaluator | Visual QA + human verification separated from coding |
| Objective Verification | Slide image rendering + overflow inspection |
| Compound Log | Structure and record overflow / tone-mismatch patterns |
| Context Reset | Hand off current Phase and sample state via HANDOFF.md for long productions |

## 8. Execution Checklist

- [ ] Install Anthropic pptx skill and place template
- [ ] Link rules and skill in CLAUDE.md
- [ ] Complete Brain.md → UpgradeBrain.md
- [ ] Finalize narrative (Gi-seung-jeon-gyeol or SCQA) in Phase.md
- [ ] Write conclusion-style titles + supporting data in PageDetail.md
- [ ] Define template-based placement in PageLayout.md
- [ ] Generate sample.pptx (3 slides) + pass visual QA
- [ ] Generate full PPT + re-verify
- [ ] Record failure patterns in compound-log.md

---

Use this workflow together with `docs/PHASES.md`, `docs/DETAIL_SPEC.md`, and `docs/compound-log.md`.  
Copy the document templates above to start a new project.
