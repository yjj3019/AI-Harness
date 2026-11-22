# HANDOFF.md - Session Hand-off State

## When to Hand Off

After a Phase fully passes, or when context degrades, update this file and start a new session. Read the applicable Phase instructions and the compound log in the new session. Do not resume mid-Phase from degraded context.

## Current State

Keep this block short: one current state, then open items. Chronology, failed attempts and per-run detail belong in `docs/HANDOFF-history-2026-11-20.md` (section "Moved from HANDOFF.md").

### State

- **Version / baseline**: `VERSION` 3.0.0. Local main HEAD `9fba254` merged PR #70 (2026-11-20). Check `git status` before work; `SESSION_LOG.md` is untracked.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest strict Phase evidence (2026-11-22, branch `fix/harness-gaps-20261121`, uncommitted tree)**: Phase `evidence-baseline`, run 7 (same code as run 6; evidence regenerated on the exact commit tree). Bound Windows run 458 tests, 448 passed, 10 skipped (platform), 0 failed, hooks 350/350, with portable Node v26.13.1 and the Git override variables (`GIT_ASKPASS`, `GIT_EDITOR`, `GIT_TERMINAL_PROMPT`) unset. Verify PASS with a genuine verify-role read; review APPROVED, no [BLOCKING] item (only [NIT]s: stream test uses a hand-built reader, runLive test covers one oversize path). All five strict gate steps passed and `attest --require-strict-evidence` wrote `docs/attestations/phase-evidence-baseline.json` for tree `82ab81add0a9ea79a8f090a1d1a1a592356447583db5743f9d87699671ee5289`. **Replay checked on a second OS (run-7 tree)**: Linux (host mcp-country, Ubuntu, Node 24, bash 5.3) `verify-attestation` reports "tree matches and the test command passes"; shellcheck 0.11.0 on that host passes the CI commands on run-all.sh, both hook directories and hooks.test.sh. All tracked files in the worktree are LF (a CRLF worktree hashes differently from a Linux checkout, measured in run 5). The tree hash covers untracked files, so the user's local-only `SESSION_LOG.md` is kept outside the worktree while attesting (a clean checkout does not have it; with it present, `check` fails). Supersedes the PR #71 attestation (tree `e42e559a…`).
- **Deviations**: the orchestrator ran the test step itself (the subagent Bash timeout is shorter than the suite), implemented the changes directly instead of through the `coding` subagent, and wrote the run-3 compound-log entry itself.
- **Tree-bound limit**: the attestation covers only that tree. Any later tracked change needs fresh evidence and replay. Hosted CI replay (ubuntu-latest only) has not run; a local Windows `verify-attestation` replay of this tree passed on 2026-11-22 (tree matches, test command passes; not a hosted result).
- **Changes in this tree (uncommitted)**: hooks no longer lock the main session out of Write/Edit when `jq` is missing (subagents and Bash stay fail-closed); `block-destructive.sh` blocks PowerShell/cmd recursive deletes on broad targets and is registered for `Bash|PowerShell`; `read-tracker.sh` canonicalizes Git Bash path spellings; `.codex/hooks.json` matcher includes `apply_patch`; `skill-audit.js` compares a shipped LICENSE with the frontmatter and `design-evidence-harness` declares `Apache-2.0 AND MIT`; the adoption ledger (schema 2) pins license links to commit SHAs with license hashes, and `source-adoption-check.js --verify-live` compares them with GitHub (all six matched); `tests/instruction-skill-drift.test.js` guards the CLAUDE.md skill list; `docs/compound-log-active.md` is the distilled digest; this file was condensed. The digest carries the 2026-11-22 lessons.

### Open

- Actual host permissions and live provider behavior remain distinct from fixtures, read signals, hashes and prompts. MCP, network and default-host enforcement are unverified; the sandbox canaries in `docs/eval-set/harness-pilot-results-2026-11-21.md` are scoped to the tested invocations.
- Hosted CI for PR #70's final state and for PR #71 has not been checked from a session; do not infer it from local results.
- Evaluation pilot (`docs/eval-set/`): most cases and risk-profile comparisons are unverified; a proposed shared reporting rule was removed from the shared core after invented-context errors.
- The original verifier's Git checks did not finish on the earlier PR #71 attempts; the cause is unknown (a separate diagnostic child completed them).

### Next

1. Commit and open a PR only when authorized, then read hosted CI for the PR head: the first hosted run of shellcheck (apt version may differ from 0.11.0) and the hosted ubuntu attestation replay are unverified; both were verified on a local Linux host (mcp-country) on 2026-11-22.
2. Continue the evaluation only with fixed comparable cases, actual host enforcement and independent observation.
3. Verify old status in the history file against current evidence before relying on it.

## Mandatory Procedure

Update this state at a Phase boundary, preserve relevant evidence and unresolved items, and start a new session. Commit or publish only when separately authorized. In the new session read the host instructions, this file, the compound log and the relevant Phase section; continue from verified next actions.
