---
name: skill-composition
description: Guidance for combining multiple master skills on one task. Use when a feature needs coding + security + observability, or any multi-skill workflow.  Prevents loading everything at once and missing handoffs.
license: Apache-2.0
---

# Skill Composition

**Goal**: Apply several skills in a deliberate order without context overload or skipped gates.

## Recommended sequences

### New feature (backend or full-stack)
1. `skill-router` (select primary)
2. `coding-master` (spec + TDD + implementation)
3. `security-master` (if input, auth, or secrets involved)
4. `observability-master` (if the feature will run in production)
5. `browser-evidence` (if UI is involved)
6. Final verification evidence

### Bug fix
1. `debugging-master` (reproduce → root cause → regression test)
2. `coding-master` only if the fix requires non-trivial redesign
3. `security-master` if the bug has a security dimension

### UI / design work
1. `design-master` (art direction and tokens)
2. `coding-master` or implementation steps
3. `browser-evidence` for visual proof

### Documentation
1. `document-master`
2. `evidence-preserving-editor` if editing existing evidence-bearing text

## Rules

- Load one primary skill at a time. Note secondary skills rather than pasting all of them.
- Each skill’s evidence and Phase rules still apply.
- Do not skip a skill’s exit criteria just because another skill is also in play.
- Prefer the composition order above over ad-hoc mixing.

See `references/composition-examples.md`.
