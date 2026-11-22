# HANDOFF.md - Session Hand-off State

## When to Hand Off

After a Phase fully passes, or when context degrades, update this file and start a new session. Read the applicable Phase instructions and the compound log in the new session. Do not resume mid-Phase from degraded context.

## Current State

Keep this block short: one current state, then open items. Chronology, failed attempts and per-run detail belong in `docs/HANDOFF-history-2026-11-20.md` (section "Moved from HANDOFF.md").

### State

- **Version / baseline**: `VERSION` 3.0.0. `main` was at merge commit `74d19f5` (PR #73, 2026-11-23: the three-model review fixes, hosted CI 12/12 green). The branch `docs/ruleset-attestation-summary-20261123` only aligns `docs/merge-policy.md` and the CHANGELOG with the ruleset change below. Check `git status` before work. `SESSION_LOG.md` is a local-only file kept out of the repo through `.git/info/exclude`; the tree hash covers untracked files, so keep such files out of the worktree while attesting.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest strict Phase evidence (2026-11-23, documentation-only run 10 on top of the merged run-9 code)**: Phase `evidence-baseline`; Windows 475 tests, 463 passed, 12 skipped (platform), 0 failed, hooks 512/512; verify PASS with read proof, review APPROVED, all five strict steps passed, attestation `docs/attestations/phase-evidence-baseline.json` regenerated (it carries `evidence_chain_sha256`). Hosted CI for the code run (PR #73) was green on all 12 checks, including the new `checks`/`portability` gating step, the toolbroker count step and the pinned replay. The run-9 detail (three-model review, guard iterations) is in `docs/compound-log.md` and `docs/CHANGELOG.md`.
- **Deviations**: the orchestrator ran the test step itself (the subagent Bash timeout is shorter than the suite), implemented the changes directly instead of through the `coding` subagent, and wrote the run-3 compound-log entry itself.
- **Tree-bound limit**: the attestation covers only that tree. Any later tracked change needs fresh evidence and replay. Hosted CI replay (ubuntu-latest only) has not run; a local Windows `verify-attestation` replay of this tree passed on 2026-11-22 (tree matches, test command passes; not a hosted result).
- **Server settings changed (2026-11-23, with the user's approval)**: ruleset `main-required-ci` (26772795) now requires `attestation summary` in addition to the nine earlier checks (10). Code-owner review is not required: with a single owner GitHub does not count the author's own review. The previous ruleset JSON was saved in the session scratchpad before the change.

### Open

- Actual host permissions and live provider behavior remain distinct from fixtures, read signals, hashes and prompts. MCP, network and default-host enforcement are unverified; the sandbox canaries in `docs/eval-set/harness-pilot-results-2026-11-21.md` are scoped to the tested invocations.
- Hosted CI for PR #70's final state and for PR #71 has not been checked from a session; do not infer it from local results.
- Evaluation pilot (`docs/eval-set/`): most cases and risk-profile comparisons are unverified; a proposed shared reporting rule was removed from the shared core after invented-context errors.
- The original verifier's Git checks did not finish on the earlier PR #71 attempts; the cause is unknown (a separate diagnostic child completed them).

### Next

1. Remaining administrator choice: enabling "Require review from Code Owners" needs a second owner or a bypass setting. Remaining design work: attestation signing (key custody and verification), the `phase-gate.js` split, an OS-level sandbox, a scored instruction-conflict evaluation. Hook checks stay lexical (variables, `python -c`, `node -e` writers evade them).
2. Continue the evaluation only with fixed comparable cases, actual host enforcement and independent observation.
3. Verify old status in the history file against current evidence before relying on it.

## Mandatory Procedure

Update this state at a Phase boundary, preserve relevant evidence and unresolved items, and start a new session. Commit or publish only when separately authorized. In the new session read the host instructions, this file, the compound log and the relevant Phase section; continue from verified next actions.
