# Hardening notes (2026-11-05)

## 1. Hook fail-closed
`evidence-guard.sh` and `block-destructive.sh` now deny when `jq` is missing or hook input is empty/unparsable. `read-tracker.sh` stays fail-open because phase-gate refuses PASS if the verify read is not recorded.

## 2. Skill audit in CI
`scripts/skill-audit.js` scans `skills/**/SKILL.md` for automatic-reject patterns (prompt injection, piped download, obfuscated decode, secret exfiltration). Wired into `tests/run-all.sh`. The audit skill itself is excluded from self-scan.

## 3. Dashboard placeholder
`dashboard/index.html` is explicitly marked PLACEHOLDER. It does not read `docs/attestations/`.

## 4. Evidence path guardrail
`evidence-guard.sh` documents that path matching does not resolve symlinks, and rejects an obvious `..` traversal pattern toward `.phase-evidence`. This remains a guardrail, not a full filesystem boundary.

## Medium / low priority (same day)

- **MCP pin**: `.mcp.json.example` notes the Playwright MCP pin and review date. Do not use `latest`.
- **Toolbroker token**: optional `TOOLBROKER_TOKEN`. When set, `POST /v1/tools/execute` requires `X-Toolbroker-Token`. Loopback bind unchanged.
- **Phase ID**: `ID_RE` rejects leading dots and caps length at 64.
- **TREE_EXCLUDE**: comment added that new exclusions narrow the integrity check and need review.
- **Secret scan**: `scripts/secret-scan.js` wired into `tests/run-all.sh`. Looks for AWS keys, private keys, and hardcoded credential shapes.
- **CI permissions**: already `contents: read`. No change.
- **Windows path**: evidence-guard remains a guardrail; full alias resolution is not claimed.

## Residual risk patches

- **evidence-guard auto**: agent field parse failure now denies. Empty agent fields still mean the main session and are allowed.
- **evidence-guard path**: if the target exists, `realpath` is also checked for `.phase-evidence`. Still a guardrail for non-existent or aliased paths.
- **read-tracker**: missing `jq` or `sha256sum` logs to stderr. Behavior remains fail-open; phase-gate still refuses verify PASS.
- **toolbroker**: `POST /v1/tools/execute` requires `TOOLBROKER_TOKEN` unless `TOOLBROKER_ALLOW_UNAUTHENTICATED=1`.
- **TREE_EXCLUDE**: `scripts/tree-exclude-check.js` fails CI if the exclusion list grows past 4 without a reviewed change.

## Remaining-limit patches

- **Non-existent paths**: evidence-guard does a single-pass lexical normalize (separators, `//`, `/./`) before matching `.phase-evidence`. Existing paths still get `realpath`.
- **read-tracker**: missing `jq` or `sha256sum` now exits 2 (visible failure). phase-gate still refuses verify PASS if the read is not recorded.
- **Toolbroker**: unauthenticated bypass removed. `TOOLBROKER_TOKEN` is always required.
- **Dashboard**: loads `dashboard/status.json`. Generate with `node scripts/dashboard-status.js` (from PHASES.md headings; not live evidence).
- **block-destructive**: `shred` added to the raw-disk pattern. Still a guardrail.
