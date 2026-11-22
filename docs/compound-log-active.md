# Active Constraints Digest

Derived from docs/compound-log.md; the full log remains the authoritative record.
Read this before every task; search the full log by topic for details and context.
Each bullet ends with the source entry date. Static/fixture evidence is never live-host proof.

## Evidence & verification
- Never trust a self-assessment; verify with independent subagents in separate contexts. [2026-10-23]
- Validate every result block and exact counts, not the last counter; exit 0 is not proof. [2026-10-27]
- Test-summary text is forgeable and collect-only is not execution; use runner-level evidence when completeness matters. [2026-10-30]
- Verify the tree after replay; compare pre/post snapshots; abort on read errors (missing initial lstat excepted). [2026-10-30]
- Require tree comparison whenever evidence has a tree hash; never silently downgrade to unbound. [2026-10-30]
- Challenge oracles with plausible wrong implementations; a public holdout is not sequestered. [2026-11-21]
- Probe with the real usage shape; run a positive control before trusting a negative probe or declaring "corrupted". [2026-11-12]
- Preserve skips, uncertainty and fixture-vs-production distinctions when editing reports. [2026-10-27]
- Check tool events, policy denials and actual effects; an unchanged canary without an attempted write is no denial proof. [2026-11-21]
- Treat a single-target probe "denied" together with its detail (a missing file is not a denial). [2026-11-15]

## Phase gate & attestation
- Tests passing with a changed tree is not Phase PASS; never overwrite user files to force a hash. [2026-11-16]
- Use `--require-bound-tree` on run and check; an independent verifier must require it too. [2026-11-01]
- Attestation needs a bound test hash equal to the final snapshot; stale attestations must not be reused. [2026-10-28]
- Verify PASS needs a genuine verify-role Read bound to the exact log SHA-256 and active epoch; never fabricate hook events. [2026-11-21]
- A failed strict record rotates the read token; the next attempt needs a fresh real Read. [2026-11-16]
- Require a nonempty versioned inventory in CI; zero discovered files proves nothing. [2026-11-18]
- Bind CI evidence to one workflow run attempt; check effective rulesets, not just classic protection. [2026-11-18]
- Resolve check provenance to the reviewed workflow and head; reject missing or ambiguous provenance. [2026-11-17]
- Prepare a clean checkout of the exact merge candidate; compare raw bytes to Git blobs. [2026-11-21]

## Hooks & guardrails
- Treat hooks as guardrails, not proof of review, comprehension or isolation. [2026-10-30]
- Probe each host with its own documented payload; a copied hook is not a ported hook. [2026-11-08]
- Test guard-branch reachability by input; lexical guards inherit gaps when copied. [2026-11-08]
- Project trust and per-hook trust are separate; check `/hooks`; a read can succeed without the recorder running. [2026-11-20]
- Fail closed on inherited `GIT_*` overrides except the narrow pager/config exceptions. [2026-11-16]
- Hook paths must handle `C:\`, `C:/` and POSIX; add E2E tests that call the real hook. [2026-10-25]
- Unset inherited `GIT_ASKPASS`, `GIT_EDITOR`, `GIT_TERMINAL_PROMPT` before running the gate; it fails closed on them, so read the error text before suspecting code. [2026-11-22]
- Avoid bash-4-only expansions (`${var,,}`) in hooks (macOS bash 3.2) and loop over printf input with `|| [ -n "$line" ]`. [2026-11-22]
- A test must fail, not skip, when it cannot isolate the branch it guards (for example jq missing from PATH). [2026-11-22]
- The lexical Bash guard scans heredoc text; create denied-command fixtures with the Write tool. [2026-11-22]

## Windows/POSIX & line endings
- A Windows Git archive can convert files to CRLF; transfer via Git bundle and compare blobs and modes. [2026-11-21]
- Normalize extracted shell script line endings; a mutation without normalization must fail the test. [2026-11-20]
- Compare canonical filesystem identity, not path spellings (macOS `/var` vs `/private/var`). [2026-11-02]
- Git Bash spells one place as `/tmp/x` or `/c/Users/.../Temp/x`; canonicalize with `cygpath -m` then `-u` before containment checks. [2026-11-22]
- Windows `jq -r` ends lines with a carriage return (`\r`); strip it before using output as keys, and keep tracked files recoverable before overwriting. [2026-11-22]

## CI & hosted checks
- Run `git fetch` before any ahead/behind or sync claim; mark remote state `[unverified]` until read. [2026-11-08]
- Separate platform dispatch failures (0 steps) from code failures; never weaken gates or bypass rulesets. [2026-11-12]
- For a single-OS socket flake: confirm unchanged code, other legs green, local pass, then rerun failed jobs only. [2026-11-15]
- Local results never prove hosted success; require the PR-head run. [2026-11-18]
- Query the target workflow's run list before trusting job checks; queued runs may lack jobs. [2026-11-18]
- Run merge-guard in documented argv shapes only (live: PR number; snapshot: `--checks-file` plus `--expected-head`). [2026-11-15]
- Adding run-all stages or eval inputs requires updating the inventory fixture; run its real completion branch. [2026-11-14]

## Licenses & external adoption
- License Safety ladder: verified clean, adopt ideas; risky, re-implement fresh; else remove; record source, license, method. [2026-11-11]
- Verify licenses from LICENSE text or API spdx_id, never from README or frontmatter claims. [2026-11-14]
- Adopt only facts from direct README reads; label opinions; no third-party execution. [2026-11-11]
- Pin license links to a commit SHA and record the LICENSE sha256; compare with `source-adoption-check.js --verify-live` (opt-in network check). [2026-11-22]

## Evaluation & fixtures
- Synchronize fixture tests on events, not sleeps; count provider calls and verify rollbacks. [2026-10-30]
- Decode input with fatal UTF-8 validation; reject lossy decoding. [2026-11-01]
- Craft gates: design spec, scorecard of at least 70, anti-AI check and four-block report for deliverables. [2026-11-12]

## Git operations
- Never combine `reset --hard` with relative `HEAD~1`; use `--soft` or a verified SHA. [2026-11-12]
- The committed blob is authoritative for binaries; verify `hash-object` against `rev-parse HEAD:<path>`. [2026-11-12]
- Do not equate a clean tree with a synced tree. [2026-11-08]

## Docs & handoff
- Copy edit anchors from a same-turn Read and diff after each docs edit; revert, do not layer. [2026-11-08]
- Capture long replay output and exit status durably; lost output is not a pass. [2026-11-16]
- Challenge revised shared instructions for new assumptions; keep unvalidated rules out of the shared core. [2026-11-21]
- The tree hash covers raw bytes: a CRLF Windows worktree never replays on LF Linux. Make tracked files LF before attesting, then replay on Linux. [2026-11-22]
- A "tool removed from PATH" test must also prove the shell still runs there, or exit 127 reads as a pass or a wrong failure. [2026-11-22]
- A hook's fail-closed branch must not call external tools: a missing grep made the jq-less subagent check fail open (found on macOS CI). Use bash pattern matching. [2026-11-22]

Entries covered: 2026-10-23 .. 2026-11-22
