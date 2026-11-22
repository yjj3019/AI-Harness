# HANDOFF.md - Session Hand-off State

## When to Hand Off

After a Phase fully passes, or when context degrades, update this file and start a new session. Read the applicable Phase instructions and the compound log in the new session. Do not resume mid-Phase from degraded context.

## Current State

Keep this block short: one current state, then open items. Chronology, failed attempts and per-run detail belong in `docs/HANDOFF-history-2026-11-20.md` (section "Moved from HANDOFF.md").

### State

- **Version / baseline**: `VERSION` 3.0.0. `main` was at merge commit `d1e0922` (PR #74, 2026-11-23). The branch `feat/signed-attestations-20261123` adds signed attestations. Check `git status` before work. `SESSION_LOG.md` is a local-only file kept out of the repo through `.git/info/exclude`; the tree hash covers untracked files, so keep such files out of the worktree while attesting.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest strict Phase evidence (2026-11-23, run 11: signed attestations)**: Phase `evidence-baseline`; Windows 479 tests, 467 passed, 12 skipped (platform), 0 failed, hooks 522/522; verify PASS with read proof (two passes), review APPROVED; all five strict steps passed. The attestation `docs/attestations/phase-evidence-baseline.json` is now signed (Ed25519, key_id `dca09e3c37928d0a5ca2d78e2cf4f700f642f5efe7ed581b45f7fefa65d178f8`) for tree `c4d0cceb731c0562f28ee5b149ab315447c0b35c5b32d7e991f76ca44e9c9ff6` with `evidence_chain_sha256` `abf05cac3c9188ed21521fd442ab4188f9aa88a61c593b5fa0e79f91589f8d71`. Replay with `--require-pinned-command --require-signature`: see the final report for the Windows and Linux results.
- **Deviations**: the orchestrator ran the test step itself (the subagent Bash timeout is shorter than the suite), implemented the changes directly instead of through the `coding` subagent, and wrote the run-3 compound-log entry itself.
- **Tree-bound limit**: the attestation covers only that tree. Any later tracked change needs fresh evidence and replay. Hosted CI replay (ubuntu-latest only) has not run; a local Windows `verify-attestation` replay of this tree passed on 2026-11-22 (tree matches, test command passes; not a hosted result).
- **Signing key custody (2026-11-23)**: the private key is `~/.harness/attest-ed25519.pem` on the maintainer's machine (created with `phase-gate.js attest-keygen`; `Read(~/.harness/**)` is denied in settings and the guard refuses subagents to write or name it). The public key is `.claude/attestation-public-key.pem` (trust set, CODEOWNERS). Back the private key up outside the repository: losing it means a reviewed key rotation (replace the public key file in a PR, then re-attest). CI reads the public key from the PR base commit (`ATTEST_KEY_BASE_SHA`); the first PR that introduces the key is trusted once with a warning. Server settings from the earlier step: ruleset `main-required-ci` requires `attestation summary` (10 checks); code-owner review stays off (single owner).

### Open

- Actual host permissions and live provider behavior remain distinct from fixtures, read signals, hashes and prompts. MCP, network and default-host enforcement are unverified; the sandbox canaries in `docs/eval-set/harness-pilot-results-2026-11-21.md` are scoped to the tested invocations.
- Hosted CI for PR #70's final state and for PR #71 has not been checked from a session; do not infer it from local results.
- Evaluation pilot (`docs/eval-set/`): most cases and risk-profile comparisons are unverified; a proposed shared reporting rule was removed from the shared core after invented-context errors.
- The original verifier's Git checks did not finish on the earlier PR #71 attempts; the cause is unknown (a separate diagnostic child completed them).

### Next

1. After this branch merges, every future Phase must be attested with `attest <id> --require-strict-evidence --sign` (CI requires the signature). Remaining administrator choice: "Require review from Code Owners" needs a second owner or a bypass setting; until then a PR that edits `ci.yml` (for example to drop `--require-signature`) must be read by a person. Remaining design work: the `phase-gate.js` split, an OS-level sandbox, a scored instruction-conflict evaluation. Hook checks stay lexical (variables, `python -c`, `node -e` writers evade them).
2. Continue the evaluation only with fixed comparable cases, actual host enforcement and independent observation.
3. Verify old status in the history file against current evidence before relying on it.

## Mandatory Procedure

Update this state at a Phase boundary, preserve relevant evidence and unresolved items, and start a new session. Commit or publish only when separately authorized. In the new session read the host instructions, this file, the compound log and the relevant Phase section; continue from verified next actions.
