# Compound Learning Log - Archive

Oldest entries moved verbatim from `docs/compound-log.md` on 2026-11-26 and 2026-11-27 (cleanups after the 30-entry limit was exceeded). Not required reading; search it by topic. `docs/compound-log-index.md` still lists every entry.

## Archived Entries

### [2026-10-23] Setup - System Setup

- **Issue/Risk**: Self-congratulatory bias in single-agent workflows.
- **Root Cause**: LLMs naturally evaluate their own output positively.
- **Resolution/Pattern**: Always run independent Subagents to verify code rather than relying on self-assessment. Isolate coding and evaluation into separate context windows (coding → test → verify → review → compound).

### [2026-10-25] Harness - Platform Paths

- **Issue/Risk**: `read-tracker.sh`가 POSIX 절대경로만 처리해 Windows에서 읽기 기록이 남지 않았고, 그 결과 `verify PASS`가 영구 거부됐다.
- **Root Cause**: 훅 입력 경로를 셸이 이해하는 형태로 정규화하지 않았고, 단위 테스트는 경로 스타일을 바꿔 넣어 보지 않았다.
- **Resolution/Pattern**: 경로를 받는 훅은 `C:\`·`C:/`·POSIX를 모두 정규화하고, 실제 훅을 호출하는 E2E 테스트를 둔다. 플랫폼 차이는 CI 매트릭스가 아니라 실행 테스트로 먼저 확인한다.

### [2026-10-27] Quality closure - Challenge aggregate evidence

- **Issue/Risk**: A passing final summary masked earlier failing suites; replay could mutate source after the initial tree comparison. Fixture HTTP errors could strand requests as IN_FLIGHT.
- **Root Cause**: Global last-counter parsing, pre-execution-only verification, and incomplete uncertain-response exception classification.
- **Resolution/Pattern**: Validate every complete result block and exact count accounting, verify the tree after replay, persist UNKNOWN for unclassifiable sent requests, and test interrupted uploads/provider responses. Keep host authorization and live-model certification separate from fixtures.

### [2026-10-27] Report editing - Preserve evidence before style

- **Issue/Risk**: A prose rewrite can erase skips, uncertainty, conditions or the distinction between fixture and production results.
- **Root Cause**: Optimizing stylistic patterns without comparing supported claims in both directions.
- **Resolution/Pattern**: Add an opt-in evidence-preserving editor with protected spans and Korean semantic evaluation cases. Keep package checks separate from live-model quality evaluation; do not modify evidence or completion gates for prose style.

### [2026-10-27] Document jobs - Do not aggregate partial conversion as success

- **Issue/Risk**: A worker exit 0 can hide missing files, damaged formula tokens, unreviewed layout, or implicit external document transfer.
- **Root Cause**: Treating conversion as one local action and trusting aggregate process status.
- **Resolution/Pattern**: Declare separate capabilities and bounded work, bind result manifests to exact job bytes and input IDs, require complete outcomes and protected-token multisets. Keep offline manifest consistency distinct from actual authorization, artifact hashes, PDF quality and live-engine certification.

### [2026-10-27] Test evidence - Detect persistent mutation during the first run

- **Issue/Risk**: A successful test could persistently change a tracked or unignored input, and the original run recorded only the changed tree as its test evidence.
- **Root Cause**: The first run and attestation replay had different tree comparison boundaries.
- **Resolution/Pattern**: Compare pre- and post-run tree snapshots; reject a difference or an unavailable snapshot on only one side, retain explicit legacy unbound behavior when both are unavailable, and test both cases. Endpoint snapshots are not isolation and do not detect temporary changes restored before the second snapshot. Separately record static, fixture and live evidence levels and avoid treating package checks as a live model evaluation.

### [2026-10-28] Evaluation baselines - Separate scorer changes from improvements

- **Issue/Risk**: A changed rubric, case set or normalization can create an apparent improvement without a change in candidate quality.
- **Root Cause**: Comparing scores across incompatible baselines conflates measurement changes with results.
- **Resolution/Pattern**: Record baseline revisions and rescore comparable retained outputs or label cross-baseline rounds not comparable. Enforce a test-file count floor to expose substantial suite shrinkage, while recognizing replacements can mask missing suites. A lexical search for network calls is not proof of no egress, particularly when separate components intentionally use loopback networking.

### [2026-10-28] Fixture broker - Preserve uncertain outcomes after adapter exceptions

- **Issue/Risk**: An unexpected adapter exception after a send intent could leave a request IN_FLIGHT rather than explicitly requiring reconciliation.
- **Root Cause**: The uncertain-outcome handler covered a fixed list of exception types.
- **Resolution/Pattern**: Treat ordinary adapter and response-serialization exceptions as UNKNOWN after intent is committed, without catching process interrupts or retrying. If the ledger update fails, UNKNOWN persistence is not guaranteed; the previously committed IN_FLIGHT remains the conservative boundary when the ledger is intact.

### [2026-10-28] Attestation - Compare the final snapshot with tested evidence

- **Issue/Risk**: A tree mutation between chain validation and attestation creation could bind an attestation to a tree that did not match the tested evidence.
- **Root Cause**: Attestation took a second snapshot but did not compare it to the evidence's tree hash.
- **Resolution/Pattern**: Require a bound test hash and equality with the final snapshot before writing. This closes that comparison gap, not concurrent mutation after the snapshot or the existing tree hash's documented exclusions and read-error limitations.

### [2026-10-30] Verify reads - Limit reuse of previously logged signals

- **Issue/Risk**: Identical test-log bytes allowed an older verifier read record to satisfy a later test run.
- **Root Cause**: Read records were matched by path and hash without a phase-specific generation.
- **Resolution/Pattern**: Scope recorded read signals to a fresh generation to reject previously recorded signals in sequential use. A delayed post-read hook can still attribute an older read to the new generation; concurrent operations are not isolated. Treat the hook as a guardrail, not proof of full-file review, comprehension or isolation. A simulated hook event in a disposable fixture reproduced the stale-read case; it did not validate live agent integration.

### [2026-10-28] Package readiness - Validate definitions and exact hook wiring

- **Issue/Risk**: Missing skills or local references escaped general lint; hook-name substring matching and non-object settings could make doctor report readiness without the required wiring.
- **Root Cause**: Partial inventories and presence-only checks did not validate the actual definition or event/matcher/command contract.
- **Resolution/Pattern**: Add a bounded package checker to the existing CI entry point and validate exact hook wiring plus repository-contained executable files. Test empty inventories, metadata, broken links, external symlinks, malformed settings and lookalike commands. Keep static readiness distinct from live host authorization and document the supported metadata syntax.

### [2026-10-30] Fixture timeout - Synchronize on the effect, not sleep durations

- **Issue/Risk**: A short client timeout could fire before the loopback provider applied its write, making the post-effect timeout test intermittent or ambiguous.
- **Root Cause**: Wall-clock sleeps did not establish ordering, and deduplicated fixture state could conceal a repeated call.
- **Resolution/Pattern**: Use bounded events to hold the response after the fixture effect, observe the actual socket timeout, reopen the ledger and assert the precise retry error and provider call count. This is fixture evidence, not a live-provider guarantee.

### [2026-10-30] Tree snapshots - Do not equate read errors with deletion

- **Issue/Risk**: Silently skipping an unreadable file could produce a partial tree hash and hide persistent source changes.
- **Root Cause**: The same catch path handled missing paths and all filesystem read failures.
- **Resolution/Pattern**: Abort on filesystem inspection/read errors except missing initial lstat, preserving the historical tracked-deletion behavior. Successful hashes retain their format, so legacy evidence cannot establish historical snapshot completeness; rerun and re-attest when that matters. Git enumeration failures, absent paths and snapshot races remain limitations, not isolation guarantees.

### [2026-10-30] Test summaries - Recognize standalone expected outcomes

- **Issue/Risk**: An xfailed-only or xpassed-only pytest block could be ignored when another block passed, masking an all-skipped or unexpected-pass result.
- **Root Cause**: The pytest block detector omitted outcomes the later counter parser already understood.
- **Resolution/Pattern**: Recognize standalone xfailed and xpassed summaries, pytest long-duration suffixes and decorated zero-test lines; test those forms in both output orders. Output parsing is an untrusted, bounded heuristic rather than proof of test quality; see the later quiet-output entry.

### [2026-10-30] Test summaries - Quiet output and deselection

- **Issue/Risk**: A quiet pytest summary or deselection-only result could be ignored beside a passing block, while mixed passes and deselections were rejected.
- **Root Cause**: The detector required separator lines and lacked a deselection policy.
- **Resolution/Pattern**: Inspect anchored quiet summaries and treat deselection as a validated diagnostic rather than an executed test. Summary text is forgeable, collect-only output is not execution evidence, and a silent run after a passing block remains invisible; use trusted runner-level evidence when completeness matters.

### [2026-10-30] Bound evidence - Do not silently downgrade comparison

- **Issue/Risk**: Chain check could succeed with a warning when Git was unavailable even though the test evidence had a tree hash, leaving the current tree unverified.
- **Root Cause**: The legacy unbound fallback also applied to previously bound evidence.
- **Resolution/Pattern**: Require comparison when evidence contains a tree hash; retain explicit warnings for unbound null or absent tree fields and reject other invalid types. This does not resolve dual Git enumeration failures at the original run or provide isolation or writer authentication.

### [2026-10-30] Broker fixture - Verify transaction and actual resend boundaries

- **Issue/Risk**: Provider-side deduplication could hide a second HTTP call, while raw SQLite rollback did not exercise the broker request ledger and counter transaction together.
- **Root Cause**: Fixture state was checked without call count and rollback tests did not enter the broker's execution path.
- **Resolution/Pattern**: Count loopback requests and inject a fault immediately after the broker counter update; reopen and verify both ledger and counter rolled back before retry and replay. Close inspection connections explicitly (SQLite connection context managers do not close them); this tests fixture exception handling, not crash-at-commit or live-provider exactly-once behavior.

### [2026-10-30] Replay output - Preserve observed stream order

- **Issue/Risk**: Strict replay could accept an incomplete interleaved summary after concatenating stdout and stderr, or reject a valid large output at the capture buffer limit.
- **Root Cause**: Replay used separate bounded pipes while the original run wrote both streams to one file descriptor.
- **Resolution/Pattern**: Capture both streams to a temporary file for strict replay and inspect the merged bytes. Snapshot and summary heuristics remain non-isolating; disk and full-output memory use are unbounded, and abrupt termination can leave temporary data.

### [2026-11-01] Offline review - Reject lossy input decoding

- **Issue/Risk**: Invalid UTF-8 in a candidate JSON file could silently become U+FFFD, so a reviewer would see altered text rather than the supplied output.
- **Root Cause**: Default buffer-to-string decoding replaces invalid byte sequences before JSON parsing.
- **Resolution/Pattern**: Decode with fatal UTF-8 validation before parsing or creating outputs, test both candidate inputs and preserve valid multilingual text. A leading BOM is deliberately rejected; packet preparation does not establish semantic quality or provenance.

### [2026-11-01] Tree enumeration - Distinguish confirmed worktree failures

- **Issue/Risk**: A damaged Git index made both snapshots unavailable, yet a new test could pass as unbound evidence.
- **Root Cause**: All `git ls-files` failures shared the legacy no-Git fallback.
- **Resolution/Pattern**: If a separate Git probe confirms a worktree, treat enumeration failure as an error. Preserve existing unbound fallback when discovery fails, but label it ambiguous: a broken repository or permission problem can still pass unbound with a warning. The existing tree format does not bind file modes; adding that guarantee requires an explicit version and migration policy, not retroactive claims about old evidence.

### [2026-11-01] Tree policy - Require binding at verification too

- **Issue/Risk**: Requiring a bound snapshot during a run does not prevent a later plain legacy check from accepting an unbound chain when Git discovery fails.
- **Root Cause**: An invocation-only flag is not a durable policy and legacy compatibility remains the default.
- **Resolution/Pattern**: The Phase workflow requests `--require-bound-tree` for both run and check; tests exercise the unbound boundary and workflow wiring. An independent verifier must also require the flag. This does not authenticate evidence or prove historical snapshot completeness; rerun and re-attest where that matters.

### [2026-11-02] Attestation inventory - Zero is not verified

- **Issue/Risk**: An optional CI discovery loop can succeed with zero files and be mistaken for verification of a required Phase.
- **Root Cause**: File discovery is not an independently protected list of required phase IDs; no phases are currently defined, so zero is legitimate but proves none complete.
- **Resolution/Pattern**: Report the discovered count and provide an explicit nonempty required-ID check. Protect the policy, workflow, verifier and command pin independently; replay executes code and must be authorized and isolated. A later failure cannot undo earlier replay effects.

### [2026-10-31] Blind comparison - Record reproducible allocation privately

- **Issue/Risk**: A random A/B packet without a recorded seed could not satisfy the paired protocol's reproducibility requirement; a packet alone does not prove reviewer independence or authentic output provenance.
- **Root Cause**: Independent random choices were recorded only as assignments, while the protocol required a replayable method and seed.
- **Resolution/Pattern**: Generate a private 32-byte random seed and derive each assignment using a versioned HMAC over its valid Unicode case ID; retain seed and key separately, record packet/input hashes and independently preserve them before review. Windows key privacy depends on directory ACLs; crashes can leave partial files, and blinded review and action evidence remain separate duties.

### [2026-11-01] Gate mutation PoC - Attribute failures to targeted assertions

- **Issue/Risk**: An unrelated assertion or zero matching tests could appear to kill a gate mutant; long Windows suites also timed out during a broad baseline.
- **Root Cause**: A nonzero status and generic assertion count did not establish the targeted test or assertion site, and broad suites included unrelated fixture requirements.
- **Resolution/Pattern**: Use an exact focused test name, require the expected assertion site and retain TAP diagnostics, first run an unmodified baseline, and stop on infrastructure errors. A timeout is not a kill and does not guarantee descendant cleanup; TAP remains trusted local evidence, not a sandbox or proof of all branches.

### [2026-11-01] Security review - Bound reads and preserve write ownership

- **Issue/Risk**: Slow-drip local clients held broker slots past an inactivity timeout; predictable gate log paths could follow pre-existing links; direct gate edits were outside an evidence guard's declared coverage. A smoke test could misinterpret unrelated filesystem errors as read-only enforcement.
- **Root Cause**: Per-read deadlines, open-by-name truncation, lexical guard coverage, and a missing positive control did not match the intended claims.
- **Resolution/Pattern**: Use a monotonic request-input deadline, exclusively created staging files, explicit direct-edit guards, matched filesystem controls and mount-state checks; add bounded JSON inputs. Review ownership on error paths and retain platform and race limitations. These are local safeguards, not a sandbox or host authorization certification; actual host/model checks remain separate.

### [2026-11-02] Cross-platform fixtures - Compare filesystem identity

- **Issue/Risk**: A macOS CI test failed because a temporary root was reported as `/var/...` while the child process reported the same cwd as `/private/var/...`.
- **Root Cause**: The test compared path spellings rather than the resolved filesystem location.
- **Resolution/Pattern**: Compare canonical cwd identity while still checking the exact root argument and command arguments. Local Windows regression alone does not establish macOS success; require the updated PR CI result.

### [2026-11-02] Offline planning - Preserve unresolved dependencies and attempts

- **Issue/Risk**: A graph could report a node READY through an inconsistent PASS ancestor; a later completed attempt could mask an earlier unresolved STARTED attempt or inflate completion.
- **Root Cause**: Declared status was accepted without consistent predecessor state, and a retry was treated as reconciliation of an unknown outcome.
- **Resolution/Pattern**: Reject inconsistent PASS dependencies, require UNKNOWN for unreconciled STARTED attempts, count completion from the last attempt, and test both orders. These checks consume declarations only; they do not enforce host permissions, prove truth, or make parallel work safe.

### [2026-11-02] Multi-agent planning - Keep coordination separate from evidence

- **Issue/Risk**: A Team completion, a conflict-free label check, or an inventory presence check can be mistaken for verified safe execution.
- **Root Cause**: Advisory declarations and task state were confused with host enforcement, effect reconciliation, and independent Phase evidence.
- **Resolution/Pattern**: Keep labels and Team scopes advisory, offer a no-replay inventory preflight explicitly marked unverified, and separately check the pinned test command and read-tracker availability. Reject sparse programmatic arrays that bypass element validation. Review actual permissions and independently verify results before recording a Phase.

### [2026-11-02] Benchmark comparisons - Count matched declarations, not claimed gains

- **Issue/Risk**: Aggregate pass rates, repeated selection on a holdout, missing context or an all-fail tie can be mistaken for an independently established improvement.
- **Root Cause**: Pair membership, context, incompleteness and the separation between selection and final assessment were not made explicit.
- **Resolution/Pattern**: Report all four paired verdict cells plus unknown and NA counts; keep incompatible or missing declared context inconclusive, reject missing planned results, and preserve original attempts. Snapshot programmatic inputs before validation and classification. Matching labels and these arithmetic counts remain unverified claims, not a sandbox, proof of preregistration, independent evaluation or authorization to promote.

### [2026-11-08] Session handoff - A clean tree is not a synced tree

- **Issue/Risk**: An earlier session-state read reported `git rev-list --left-right --count origin/main...HEAD` as `0 0` and the working tree clean, which was taken to mean local and remote matched. Both were true of a stale local ref: `origin/main` had not been fetched, and four commits (PR #34, #35 and their fixes) existed only on the remote.
- **Root Cause**: Local cleanliness and local comparison against a cached remote ref were treated as evidence of synchronization. `git status` and a remote-count read do not fetch.
- **Resolution/Pattern**: Run `git fetch` before any ahead/behind or branch-divergence claim, and quote the fetched commit IDs on both sides. Report CI/remote state as `[unverified]` until a fetch or API read succeeds. A clean worktree only means no uncommitted local changes.

### [2026-11-08] Documentation edits - Verify the anchor text before replacing

- **Issue/Risk**: Two edits to `docs/HANDOFF.md` and `docs/PHASES.md` were applied at a wrong location because the search text in the tool call did not match the file exactly; the first edit silently rewrote a sentence with different content, and the second inserted a section at a fabricated marker.
- **Root Cause**: The replacement anchor was reconstructed rather than copied from a fresh read, and the edit result was not diffed against the file before continuing.
- **Resolution/Pattern**: Copy anchors verbatim from a `Read` in the same turn, diff immediately after every documentation edit (`git diff -- <file>`), and revert with `git checkout -- <file>` rather than layering a second edit over a bad one. Prefer a failure-visible replacement (assert the marker exists) for multi-line insertions.

### [2026-11-08] Test invocation - A directory argument is not a suite

- **Issue/Risk**: `node --test tests/toolbroker/` failed with `MODULE_NOT_FOUND`, which read as a red test suite rather than an invocation error.
- **Root Cause**: `run-all.sh` expands `tests/*.test.js` to files and never passes a directory; the direct invocation copied the directory form.
- **Resolution/Pattern**: Run the same command shape the entry point uses (`node --test tests/*.test.js`). Read the failure text before attributing it to the code under test; an invocation error and a test failure are both `exit != 0` but need different responses.

### [2026-11-08] Codex port - A renamed hook is not a ported hook

- **Issue/Risk**: `.codex/` (commit `18bf75f`) copies the `.claude` hooks verbatim except for the error-message prefix, and the commit states both harnesses "share the same guardrails" with "guardrail semantics unchanged". Codex does not use Claude's tool names: edits arrive as `tool_name: "apply_patch"` and there is no `Read` tool at all. `evidence-guard.sh` matches only `Write|Edit|MultiEdit|NotebookEdit`, and `read-tracker.sh` exits unless `tool_name == "Read"`. So the evidence guard never fires for a Codex edit, and the read tracker never records a evidence read, which permanently refuses verify PASS.
- **Root Cause**: The port was validated by diffing the two script copies against each other (they differ by one string), which proves byte-fidelity but not host behavior. No probe exercised the scripts with the *target host's* documented hook payload.
- **Resolution/Pattern**: A cross-host port needs a payload probe per host, not a source diff. Feed each hook the documented input shape of the host it will run under (`apply_patch` for Codex) and assert the deny path still returns 2. A script that is identical on both sides of a port is evidence of copy fidelity only.
- **Open defects (unfixed as of 2026-11-08)**: `apply_patch` bypasses `evidence-guard` (exit 0 where `Write` exits 2); `read-tracker` cannot fire under Codex; `.codex/agents/test.toml:13` points at a nonexistent `.Codex/workflows/phase-gate.js`; all five agent TOMLs carry literal `\r` escapes inside `developer_instructions`; `tests/` has zero `.codex` references.

### [2026-11-08] Guardrail parsing - A dead branch hid a Windows deletion bypass

- **Issue/Risk**: `block-destructive.sh` allows `rm -rf C:\Users` and `rm -rf C:\*` (exit 0) while blocking the forward-slash form `rm -rf C:/Users` (exit 2). `Remove-Item -Recurse -Force` and `cmd /c del /s /q` are not covered at all. Found independently by an external reviewer and reproduced here.
- **Root Cause**: In the word-splitting loop the unquoted-backslash handler (`escaped=1; continue`) consumes `\` before the drive-path rewrite can see it, so the `"$char" == '\' && "$word" =~ ^[A-Za-z]:` branch is unreachable dead code. The lexer also only inspects a command whose first word is `rm` or `chmod`, so native Windows deletion verbs are never in scope. The same defect exists unchanged in `.claude/hooks/block-destructive.sh`; the port reproduced it faithfully rather than introducing it.
- **Resolution/Pattern**: Reachability of a guard branch must be tested, not read: assert that the intended input shape actually hits the branch (here, that `C:\Users` is denied). A guardrail copied between hosts inherits every gap, so a faithful port is not a fixed port. Do not describe a lexical guard as shared protection without a deny-path probe per platform.

### [2026-11-11] 외부 조사 반영 - README 실측 후 패턴만 반영

- **Issue/Risk**: 외부 생성 스킬 후보 조회(추천도라는 주관 평가가 포함됨)를 '사실'로 받고 도입 범위를 정하면 출처 검증 규율과 충돌하고, 문체 개선이 증거 검증·게이트 승인처럼 오독될 수 있다.
- **Root Cause**: 후보 요약표에 주관(추천도)과 사실(기능·라이선스)이 섞여 있고, '탐지 회피'로 취급하면 evidence-first 규율과 용도가 합쳐질 수 있다.
- **Resolution/Pattern**: 후보마다 GitHub raw README를 직접 취득해 사실(기능·라이선스·명시 한계)만 채택하고 주관은 의견으로 표기, 탐지 회피·저자 판정 목적 금지를 선언하며, third-party 실행 없이 패턴만 반영 기록으로 남긴다. README 실측은 자료 실측이며 실행 테스트·보안 감사·무결점이 아니다.
