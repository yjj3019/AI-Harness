# Observability Checklist

## Surfaces
- New or changed endpoints, jobs, or external calls identified
- Failure and latency modes considered

## Signals
- Minimal structured logs, metrics, or spans defined
- Correlation identifiers present where cross-service calls exist
- No secrets, tokens, or full PII included

## Implementation
- Instrumentation added alongside the logic
- Project conventions followed
- Temporary debug statements removed

## Verification
- Method to confirm signals appear documented
- Residual gaps (what still cannot be diagnosed) listed
