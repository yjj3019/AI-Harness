# Visual QA (before claiming done)

Run and record:

## Hierarchy & layout
- Clear primary action and reading path
- Consistent spacing and alignment
- No overlapping or clipped content

## Contrast & type
- Sufficient contrast for text and interactive elements
- Type roles are distinguishable
- Line length and size are readable

## States
- Empty, loading, and error states exist where relevant
- Focus and hover states are visible

## CJK & motion
- Inspect long Korean action labels and table headings at the intended narrow width. Check the full string, wrapping, and access to each action.
- Where animation or transition is used, check reduced-motion behavior and its static end state

## Anti-slop
- Identify the effect of familiar patterns on this task. Preserve established brand choices when the content remains legible and controls are usable.
- Direction matches the stated art direction

## Accessibility
- Keyboard reachable where applicable
- Labels and names present
- Target sizes adequate

## Evidence
- Record the desktop and mobile viewport sizes, states inspected, and defects. Mark each unobserved state or interaction as unverified.
- Pair with [design evidence checklist](../../design-evidence-harness/SKILL.md)
- Inside a Phase, record only through the phase gate
