# Composition Examples

**Example: Add a user settings endpoint**
- coding-master: spec, failing tests, implementation
- security-master: auth check, input validation, no secrets in logs
- observability-master: request log + error metric
- Result: tests green + security notes + signal list

**Example: Fix a layout bug on the dashboard**
- debugging-master: reproduce with screenshot or steps
- design-master: token and spacing check
- browser-evidence: before/after screenshot or Playwright
- Result: regression test or visual evidence + fix
