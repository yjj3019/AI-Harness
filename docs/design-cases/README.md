# Design cases (measurement corpus — P5 skeleton)

Progressive strengthening corpus for design-omniskill channels. Each case records a real artifact review with before/after scores, so rubric changes are driven by measured gaps, not preference (measurement-loop rule).

## Case template (per case: `case-NN-<format>.md`)

```markdown
# Case NN — <format> — <artifact short name>

## Input
- Artifact path, render evidence chain (sha256), approved reference (if any).

## Before (first channel pass)
| Axis | Score | Measurement row |
| --- | --- | --- |

## Changes made (only artifact changes; gates untouched)

## After (second channel pass)
| Axis | Score | Measurement row |

## Uncovered
- Items that could not be checked and why.

## Lesson
- One line: which rubric row/rule was too weak or too strict → proposed change (change lands only via a positive control).
```

## Root rules

- A score without a measurement row or an Uncovered entry is FAIL (channel rule, unchanged).
- A proposed rubric change requires a positive control in `tests/design-channel-check.test.js` before it can be accepted.
- A case that changes nothing in the harness is still recorded: "no rule change" counts as a legitimate outcome.

## Slots (to fill with real artifacts; each case = 1 real review)

1. HTML page/deck (channel-html)
2. PDF export (channel-pdf)
3. PPTX deck (channel-pptx)
4. DOCX report (channel-docx)
5. Image (channel-image)
6. Code/UI layout (channel-code)
