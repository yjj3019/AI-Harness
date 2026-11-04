# Security Review Axes

## Input & Injection
- Untrusted input is validated or sanitized before use
- No obvious SQL/NoSQL/command/path injection paths
- XSS and template injection surfaces reviewed for web code

## Authentication & Authorization
- Auth checks present on protected operations
- Session or token handling does not leak or allow fixation
- Privilege escalation paths considered

## Secrets & Data
- No hardcoded secrets, API keys, or credentials
- Sensitive data not logged in full
- PII handling noted if present

## Dependencies
- New or updated dependencies flagged
- Known high-risk packages noted
- No silent major upgrades

## Configuration & Defaults
- Insecure defaults avoided
- Error messages do not leak internal details unnecessarily
- CORS, headers, and cookie flags reviewed where applicable

## Verification
- Relevant static checks or manual review recorded
- Residual risks explicitly listed
