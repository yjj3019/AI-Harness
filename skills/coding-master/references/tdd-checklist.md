# TDD Checklist

## RED
- Test written before production code for the behavior
- Test fails for the expected reason (not setup/error)
- Test verifies public behavior, not private implementation details

## GREEN
- Minimal code to make the test pass
- No extra features added in the same step

## REFACTOR (while green)
- Tests still pass after each change
- No behavior change unless a new failing test covers it
- Complexity reduced without breaking coverage

## Bug fixes
- Reproducing test written first
- Test fails before the fix
- Test passes after the fix
