---
name: compound-feedback
description: Close the loop from skill use back into the compound log. Use at the end of a non-trivial task that used one or more master skills.  Records what worked, what failed, and what should change next time.
license: MIT
---

# Compound Feedback

**Goal**: Make repeated mistakes visible. After meaningful work, write a short entry to `docs/compound-log.md`.

## When to write an entry

- A skill was used and the outcome was surprising (better or worse than expected).
- A rule was almost violated and then corrected.
- A new pattern or anti-pattern was discovered.
- The same issue appeared more than once.

## Minimal entry format

```markdown
## YYYY-MM-DD — short title

- Context: what was being done
- Skill(s): which skills were used
- What happened: one or two sentences
- Lesson: what to do differently next time
- Evidence: link or note (if any)
```

## Rules

- Keep entries short. One lesson per entry.
- Do not invent measurements or costs.
- Do not overwrite existing entries. Append only.
- Inside a Phase, follow Phase evidence rules. This skill does not create Phase evidence by itself.
- Prefer writing the entry in the same session that discovered the lesson.

## Process

1. At the end of a non-trivial task, ask: “Did anything notable happen that should be remembered?”
2. If yes, append one entry to `docs/compound-log.md` using the format above.
3. If the file is large, still append. Do not reorganize unless asked.

See `docs/compound-log.md` for existing entries.
