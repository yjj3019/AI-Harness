# Usage Scenarios

Practical guides for applying the AI-Harness patterns by scenario.  
Mechanisms only — no project-specific examples.

## Scenario 1: New Web / App Feature

**Goal**: Ship a UI feature without the agent declaring success while the screen is broken.

**Steps**
1. Clarify intent with questions (audience, success signal, constraints). No code yet.
2. Write a short plan of 2–5 minute tasks with exact file paths.
3. Create a Default-FAIL entry (`passes: false`) for the feature.
4. Implement with TDD where practical; for UI, require Playwright or browser evidence.
5. Run an independent verifier (no Write/Edit) that opens the evidence before issuing PASS.
6. Only after PASS, set `passes: true` and update `docs/HANDOFF.md`.

**Evidence required**
- Screenshot or Playwright log showing the expected UI state
- Test or build output
- Checklist items in `docs/PHASES.md` confirmed by inspection

**Common failure prevented**: Premature “done” while layout or interaction is broken.

---

## Scenario 2: Backend / API Change

**Goal**: Change behavior safely using compiler and test backpressure.

**Steps**
1. Define the smallest Phase (one endpoint, one migration, one service method).
2. Write a failing test that captures the desired behavior.
3. Implement the minimum code to make the test pass.
4. Require the test runner exit code and log as evidence.
5. Independent review checks for scope creep and missing error handling.
6. Record any anti-patterns in `docs/compound-log.md`.

**Evidence required**
- Test runner output with exit code 0
- Linter / type-check output (if applicable)
- Diff limited to the stated Phase files

**Common failure prevented**: Over-engineering and self-assessed “it works”.

---

## Scenario 3: Document / PPT Creation

**Goal**: Produce a consistent deck without expensive full-regeneration cycles.

**Steps**
1. Capture free ideas (`Brain.md`) then refine the single core claim (`UpgradeBrain.md`).
2. Map narrative flow to slides (`Phase.md`).
3. Write conclusion-style titles and supporting data per slide (`PageDetail.md`).
4. Define layout using the template (`PageLayout.md`).
5. Generate a 3-slide sample first and run visual QA (overflow, contrast, native objects).
6. Only after sample approval, generate the full deck and re-verify.
7. Log layout or tone failures in `docs/compound-log.md`.

**Evidence required**
- Sample file that passed visual QA
- Native OOXML tables/charts (not images)
- Template master preserved

**Common failure prevented**: Infinite revision after a full one-shot generation.

See also `docs/ppt-harness-workflow.md`.

---

## Scenario 4: Long Autonomous Run

**Goal**: Keep an agent productive across many context windows without losing progress.

**Steps**
1. Break work into independently human-testable Phases.
2. At the end of each Phase, write current state and next actions to `docs/HANDOFF.md`.
3. Append lessons to `docs/compound-log.md`.
4. Start the next session by reading both files first.
5. Use the evidence-gate runner so a Phase cannot complete without PASS artifacts.
6. If context degrades mid-Phase, hand off immediately rather than continuing.

**Evidence required**
- Updated `docs/HANDOFF.md`
- `.phase-evidence/` files for the completed Phase
- Clean git history of the Phase commits

**Common failure prevented**: Context Anxiety and loss of progress across sessions.

---

## Scenario 5: Bug Fix / Debugging

**Goal**: Fix a defect with root-cause evidence instead of guessing.

**Steps**
1. Reproduce the failure and capture the exact error or unexpected output.
2. Form a hypothesis and test it with the smallest change.
3. Write a regression test that fails before the fix and passes after.
4. Independent verification confirms the original symptom is gone and no new failures appeared.
5. Record the root cause and the test that guards it in `docs/compound-log.md`.

**Evidence required**
- Before/after logs or test output
- Regression test that fails on the old code
- Scope limited to the bug

**Common failure prevented**: Symptom-only patches and repeated regressions.

---

## Scenario 6: Existing Codebase Improvement

**Goal**: Improve a module without uncontrolled refactoring.

**Steps**
1. State the exact improvement and the files that may change (Surgical Changes).
2. Add characterization tests around current behavior if none exist.
3. Make the smallest change that achieves the goal.
4. Verify tests still pass and the new criterion is met.
5. Reject any change outside the declared scope.

**Evidence required**
- Test results before and after
- Diff confined to the declared files
- Checklist item confirming no out-of-scope edits

**Common failure prevented**: Scope creep and over-engineering.

---

## Choosing a Scenario

| If you need to… | Start with |
|-----------------|------------|
| Add a visible UI feature | Scenario 1 |
| Change an API or service | Scenario 2 |
| Produce a slide deck or report | Scenario 3 |
| Run the agent for hours | Scenario 4 |
| Fix a known defect | Scenario 5 |
| Refactor or improve existing code | Scenario 6 |

In all cases, begin with “no evidence = FAIL” and keep the unit of work small enough for a human to test.
