# Performance Checklist

## Baseline
- Relevant path identified
- Measurement method and baseline numbers or traces captured
- Representative input for the real usage shape identified
- Host OS, runtime version, configuration, and the exact measurement command recorded

## Change
- Hypothesis stated
- Smallest change applied
- Unrelated refactors avoided

## After
- Same measurement method re-run
- Before/after comparison recorded
- Improvement (or lack of improvement) stated with numbers
- Repeat measurements recorded with the observed variance range
- Error and boundary input behavior compared, not only the nominal path
- Where the input is not representative of the full behavior, that scope stated

## Safety
- Existing tests still pass
- Related paths checked for regression
- Residual risks listed
- Rollback or disable method for the change recorded
