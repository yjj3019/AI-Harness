---
name: document-master
description: Highest-quality document writing workflow for technical docs, reports, manuals, READMEs, ADRs, and agent-facing instructions. Forces audience clarity, Diátaxis structure, sourced claims, plain language, and evidence-based review. Use for  any substantial document. Prefer this over generic drafting.
license: Apache-2.0
---

# Document Master

**Goal**: Produce documents that help a specific reader complete a specific task, with every claim traceable and no AI-sounding filler.

Synthesized from the strongest open patterns (2026):
- Anthropic `doc-coauthoring` — context gathering, section refinement, fresh-reader check
- Diátaxis framework (via github/awesome-copilot documentation-writer) — tutorial / how-to / reference / explanation
- [mattpocock/skills](https://github.com/mattpocock/skills) `writing-for-agents` — docs that agents can follow
- [magnus919/agent-skills](https://github.com/magnus919/agent-skills) technical-documentation — interface, not implementation
- [docwriter-org/plain-writing-skill](https://github.com/docwriter-org/plain-writing-skill) — plain language, revision view
- [riekelt/technical-writer](https://github.com/riekelt/technical-writer) — sourced claims, no AI tells
- PracticalSwan writing-skills — test-driven skill writing

Does not vendor upstream code. Apply this skill’s gates on top of any external document skill.

## Core principles

1. **Reader and job first** — Name the audience and the single job the document must help them complete. Agree on scope before drafting.

2. **Diátaxis structure** — Classify the document:
   - Tutorial (learning-oriented)
   - How-to (task-oriented)
   - Reference (information-oriented)
   - Explanation (understanding-oriented)
   Do not mix modes in the same section.

3. **Interface, not implementation** — Document what the reader needs to do or know. Leave internal mechanics to source code unless the document is for maintainers.

4. **Sourced claims** — Every non-obvious claim has a source or is marked unverified. No invented measurements, costs, or experience.

5. **Plain language** — Short sentences, active voice, consistent terms. Remove AI tells (delve, leverage, robust, seamless, etc.).

6. **Fresh-reader check** — Before claiming done, simulate a reader who has not seen the drafting process. Can they complete the job?

7. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Brief** — Audience, job, document type (Diátaxis), scope, constraints, existing sources.
2. **Outline** — Section structure matching the document type. Lock with user if substantial.
3. **Draft** — Write section by section. Prefer existing templates or styles if present.
4. **Source check** — Mark claims. Flag unverified items.
5. **Plain-language pass** — Remove filler and AI tells. Shorten.
6. **Fresh-reader review** — Can the target reader complete the job without asking questions?
7. **Handoff** — Deliverable + known limitations + unverified items.

Detailed checks: `references/plain-language.md`, `references/review-checklist.md`.

## Minimal working set

- Brief (audience + job + type)
- Outline
- Draft with sourced claims
- Review notes

## Rules that override convenience

- No silent dependency installs.
- No hand-written Phase evidence.
- Audience and job must be stated before heavy drafting.
- Unverified claims must be marked.
- Fresh-reader check is mandatory before claiming done.

## Recommended external skills (optional)

| Need | Skill | Install |
|------|-------|---------|
| Collaborative drafting | anthropics/skills (doc-coauthoring) | `npx skills add anthropics/skills --skill doc-coauthoring` |
| Diátaxis structure | github/awesome-copilot (documentation-writer) | `npx skills add github/awesome-copilot --skill documentation-writer` |
| Agent-facing docs | mattpocock/skills (writing-for-agents) | `npx skills add mattpocock/skills` |
| Plain language | docwriter-org/plain-writing-skill | `npx skills add docwriter-org/plain-writing-skill` |
| DOCX lifecycle | various docx skills | project-specific |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `skills/ppt-master/SKILL.md`, `skills/design-master/SKILL.md`.
