# Multi-Axis Review Checklist

## Correctness
- Matches spec / acceptance criteria
- Edge cases handled (null, empty, boundaries, errors)
- Tests actually verify the claimed behavior

## Security
- No new injection, XSS, auth, or secret-handling issues
- Dependencies and inputs treated carefully
- No silent privilege expansion

## Performance
- No obvious regressions (N+1, unbounded loops, blocking where avoidable)
- Measure before claiming improvement

## Readability / Maintainability
- Names reveal intent
- Functions are focused
- No unnecessary complexity introduced

## Tests
- New/changed behavior has covering tests
- Existing tests still pass
- No skipped or zero-test “success”

## Verification
- Relevant test command run and evidence captured
- Build/lint if required by the project
- Known limitations listed
