# HANDOFF.md - Session Hand-off State

## When to Hand Off

After a Phase fully passes, or when context degrades, update this file and start a new session. Read the applicable Phase instructions and the compound log in the new session. Do not resume mid-Phase from degraded context.

## Current State

Keep this block short: one current state, then open items. Chronology, failed attempts and per-run detail belong in `docs/HANDOFF-history-2026-11-20.md` (section "Moved from HANDOFF.md").

### State

- **Version / baseline**: `VERSION` 3.0.0. `main` is at merge commit `4364d1f` (PR #72, 2026-11-22). The work below is on branch `fix/three-model-review-20261122`, uncommitted. Check `git status` before work. `SESSION_LOG.md` is a local-only file kept out of the repo through `.git/info/exclude`; the tree hash covers untracked files, so keep such files out of the worktree while attesting.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest strict Phase evidence (2026-11-22, branch `fix/three-model-review-20261122`, uncommitted tree)**: Phase `evidence-baseline`, run 9, after a three-model review (Opus subagent, Codex CLI, Grok CLI). Bound Windows run: 475 tests, 463 passed, 12 skipped (platform), 0 failed, hooks 512/512; `test summary: … (minimum 400, maximum skipped 20)`. Verify PASS (genuine Reads, several passes) and review APPROVED (two CHANGES_REQUESTED passes were fixed first). All five strict steps passed and `attest --require-strict-evidence` wrote `docs/attestations/phase-evidence-baseline.json` for tree `4a2b173ff65546cf1f8a6ae1e59eaa30e6536f70fd42ec78c70c14af25896185` with `evidence_chain_sha256` `d0aa1d9ebbd94a9e25935e1fa5cc055365f88ce909bf2bb7c7af9f5840d4c873`. Replay on Linux (host mcp-country, Ubuntu, Node 24): `verify-attestation --require-pinned-command` passed (472 passed, 3 skipped of 475, so the Linux-only execute-bit and UTF-8-path tests ran); hooks 524/524 and shellcheck clean there. Windows replay: see the final report of the session. Supersedes the run-8 attestation (tree `de2ce024…` lineage, now `4310ebf5…`).
- **Deviations**: the orchestrator ran the test step itself (the subagent Bash timeout is shorter than the suite), implemented the changes directly instead of through the `coding` subagent, and wrote the run-3 compound-log entry itself.
- **Tree-bound limit**: the attestation covers only that tree. Any later tracked change needs fresh evidence and replay. Hosted CI replay (ubuntu-latest only) has not run; a local Windows `verify-attestation` replay of this tree passed on 2026-11-22 (tree matches, test command passes; not a hosted result).
- **Changes in this tree (uncommitted)**: evidence-guard rewritten with bash-only decisions (aliases, wildcards, trailing dots, 8.3 names, PowerShell and MCP tools, trust-set writes through Write/Edit/patch and through Bash/PowerShell commands); `git -C … reset` guard fix; gate: `evidence_chain_sha256`, `--require-pinned-command`, tree hash rejects gitlinks and non-UTF-8 paths, one execute bit, `unlock` command; CI: always-run dependent jobs that fail instead of being skipped, toolbroker counts, shellcheck on `hooks.test.sh`; `run-all.sh` 48-file floor and test-summary gate; exact `TREE_EXCLUDE` freeze; license ledger +19 reference-only entries with `skills/` scanning; secret-scan breadth; docs ("What an attestation proves", merge-policy ruleset findings); CODEOWNERS. Details: `docs/CHANGELOG.md`, `docs/compound-log.md`.

### Open

- Actual host permissions and live provider behavior remain distinct from fixtures, read signals, hashes and prompts. MCP, network and default-host enforcement are unverified; the sandbox canaries in `docs/eval-set/harness-pilot-results-2026-11-21.md` are scoped to the tested invocations.
- Hosted CI for PR #70's final state and for PR #71 has not been checked from a session; do not infer it from local results.
- Evaluation pilot (`docs/eval-set/`): most cases and risk-profile comparisons are unverified; a proposed shared reporting rule was removed from the shared core after invented-context errors.
- The original verifier's Git checks did not finish on the earlier PR #71 attempts; the cause is unknown (a separate diagnostic child completed them).

### Next

1. Commit and open a PR only when authorized, then read hosted CI for the PR head: first hosted runs of the new `checks`/`portability` gating step, the toolbroker count step and `--require-pinned-command` replay are unverified (verified locally on Windows and a Linux host). Repository settings left for an administrator: add `attestation summary` to the ruleset's required checks and enable "Require review from Code Owners" (a single owner cannot approve their own PR).
2. Continue the evaluation only with fixed comparable cases, actual host enforcement and independent observation.
3. Verify old status in the history file against current evidence before relying on it.

## Mandatory Procedure

Update this state at a Phase boundary, preserve relevant evidence and unresolved items, and start a new session. Commit or publish only when separately authorized. In the new session read the host instructions, this file, the compound log and the relevant Phase section; continue from verified next actions.
