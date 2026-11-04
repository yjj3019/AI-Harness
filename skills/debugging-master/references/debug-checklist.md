# Debugging Checklist

## Reproduce
- Exact error message, stack trace, or unexpected behavior captured
- Minimal steps or input that triggers the failure identified
- Failure is repeatable in the current environment

## Hypothesis & Experiment
- One hypothesis stated clearly
- Cheapest falsifying experiment designed and run
- Result recorded (supports or disproves)

## Localize
- Failure narrowed to a specific component, function, or boundary
- Related code and recent changes reviewed

## Fix & Regression
- Regression test written that fails before the fix
- Minimal code change applied
- Test passes after the fix
- Original reproduction no longer fails

## Handoff
- Root-cause statement written
- Test evidence attached
- Temporary debug code removed
- Known remaining risks listed
