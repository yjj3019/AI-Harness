---
name: browser-evidence
description: >
  Capture browser or E2E evidence for UI changes.
  Use when a change affects what the user sees, or when Playwright / screenshot
  proof is required. Complements coding-master for frontend work.
---

# Browser Evidence

**Goal**: Prove UI changes with observable browser evidence instead of “it looks fine.”

## When to use

- Any change to pages, components, forms, or visual layout that a user will see.
- When the project already uses Playwright, Cypress, or similar.
- When a screenshot or trace is the appropriate evidence.

## Minimal evidence

1. **Reproduction or baseline** — Screenshot, trace, or test that shows the before state or the failing case.
2. **After state** — Screenshot, trace, or passing E2E test that shows the expected result.
3. **Command output** — The test runner or browser tool output (exit code + relevant log).

## Process

1. Identify the user-visible behavior that must change.
2. If a test exists, extend it. If not, prefer a focused Playwright (or equivalent) check over a full suite.
3. Run the check and capture the output.
4. For visual regressions, keep before/after images or traces.
5. Do not claim the UI is done without the evidence above.

## Rules

- Exit code 0 alone is not enough if the test did not actually exercise the changed path.
- Screenshots must show the relevant state, not a blank or unrelated page.
- This skill does not replace Phase evidence rules. Inside a Phase, follow the phase gate.
- Prefer the project’s existing browser tooling.

See `references/evidence-examples.md`.
