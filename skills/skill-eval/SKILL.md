---
name: skill-eval
description: Evaluate whether a skill triggers correctly and improves outcomes. Use when adding or changing a SKILL.md, or when checking that a skill  actually loads and helps. Supports trigger tests and simple with/without comparison.
---

# Skill Evaluation

**Goal**: Confirm a skill is discoverable and useful before relying on it.

Inspired by progressive disclosure guidance and ablation-style testing patterns. Does not replace Phase gates.

## What to check

1. **Trigger quality** — Does the `description` contain concrete “Use when …” phrases that match real user language?
2. **Frontmatter validity** — `name` matches directory; description is specific.
3. **Body size** — Prefer under ~500 lines. Deep material belongs in `references/`.
4. **Outcome delta** — For important skills, compare a small task with the skill loaded vs. not loaded. Note whether the skill helped, hurt, or was neutral.

## Minimal trigger test

For a skill under review:

1. List 5–10 realistic user phrases that should trigger it.
2. List 3–5 phrases that should *not* trigger it.
3. Confirm the description contains enough signal for the positive cases.
4. Record the result in a short note (not a Phase evidence file unless inside a Phase that requires it).

## With / without comparison (optional)

1. Define a small, repeatable task.
2. Run once with the skill explicitly loaded.
3. Run once without it (or with a prior version).
4. Compare: did the skill reduce errors, improve structure, or add unnecessary overhead?
5. Keep the skill only if the delta is neutral or positive.

## Rules

- Do not claim a skill is “verified” without at least a trigger review.
- Negative or neutral delta is a valid result. Do not force a skill that does not help.
- This skill does not modify Phase evidence rules.

See `references/eval-checklist.md`.
