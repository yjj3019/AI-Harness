# Hardening notes (2026-11-05)

## 1. Hook fail-closed
`evidence-guard.sh` and `block-destructive.sh` now deny when `jq` is missing or hook input is empty/unparsable. `read-tracker.sh` stays fail-open because phase-gate refuses PASS if the verify read is not recorded.

## 2. Skill audit in CI
`scripts/skill-audit.js` scans `skills/**/SKILL.md` for automatic-reject patterns (prompt injection, piped download, obfuscated decode, secret exfiltration). Wired into `tests/run-all.sh`. The audit skill itself is excluded from self-scan.

## 3. Dashboard placeholder
`dashboard/index.html` is explicitly marked PLACEHOLDER. It does not read `docs/attestations/`.

## 4. Evidence path guardrail
`evidence-guard.sh` documents that path matching does not resolve symlinks, and rejects an obvious `..` traversal pattern toward `.phase-evidence`. This remains a guardrail, not a full filesystem boundary.
