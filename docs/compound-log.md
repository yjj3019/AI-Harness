# Compound Learning & Anti-Pattern Log

This file maintains a history of bugs, operational mistakes, and effective solutions. Agents MUST review this document before starting new tasks.

## Entries

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

### [2026-11-11] 외부 소스 도입 - 라이선스 안전 규율

- **Issue/Risk**: 외부 소스가 라이선스 미표기·불명확·바이러스성(예: canvas-design 프론트매터 `license: Complete terms in LICENSE.txt`처럼 라이선스 파일을 판독하기 전에는 판정 불가)일 때 원문을 복사하면 배포·라이선스 충돌이 발생할 수 있다.
- **Root Cause**: 프론트매터 문자열만 보고 라이선스를 '확인한 것처럼' 간주하기 쉽다.
- **Resolution/Pattern**: 출처·라이선스·조항 실측 → 아이디어·패턴만 취해 자체 구현 → 불명확하면 원문 복사 금지, **새 로직 재구현** → 도입 기록에 출처 + 라이선스 + 도입 방식(복사/아이디어만/재구현) 명시. 헌법 Primary Rules **License Safety**로 반영, `scripts/skill-audit.js`가 메타데이터 라이선스(기본 Apache-2.0)를 강제한다.

### [2026-11-11] 신규 스킬 반영 - 라우터 등록·점수 수식·기록 구조 점검

- **Issue/Risk**: 스킬을 '만들기만' 하면 skill-router에서 발각되지 않아 실제로 사용되지 않고, 7축 점수표는 축 배점(20/15·…)과 "체크 각 1점"이 맞물리지 않아 합계 100이 성립하지 않으며, 반영 기록 제목(Anti-AI)이 이후 확장(디자인/글쓰기/문서)을 담지 못한다.
- **Root Cause**: 반영(생성)과 통합(라우터·합산·목차)을 분리하지 않고, 최초 문서 제목을 재사용하면서 범위가 커져도 구조를 갱신하지 않았다.
- **Resolution/Pattern**: 신규 스킬 반영 체크리스트 — ① 라우팅 표에 등록 ② 점수/게이트 수식 합계 검산(배점 체크 분배 규칙 명시) ③ 기록 제목·목차를 현재 범위로 갱신 ④ 게이트 실측 후 보고.

### [2026-11-11] Harness·Loop 조사 반영 - 보유 규율 대조 후 기록만

- **Issue/Risk**: 하네스/루프 조사가 들어올 때 '무엇이 정말 새로운가'를 보유 규율과 대조하지 않으면 이미 있는 것(반복 상한 · verify 분리 · 승인 · 근거 우선 · HANDOFF)을 중복 도입하거나 반대로 틈새(kill-switch/Default-FAIL 훅, 완료 지표)인 것을 '보유'로 착각할 수 있다.
- **Root Cause**: 추천 목록의 기능 명세만 보고 이 저장소의 규율과 겹침 여부를 실측하지 않으면 판단이 문구에 끌린다.
- **Resolution/Pattern**: 보유 규율 컬럼과 대조 표로 '보유/틈새'를 나누고 실측(README 직접 취득) 2건만 채택 — 신규 스킬은 불필요(중복), 틈새는 구현 후보로 명시만. 설치·실행 없이 기록으로만 반영.

### [2026-11-11] 라이선스 제로 허용 강화 - 결정 사다리(채택 → 완전 재구현 → 제거)

- **Issue/Risk**: "문제 소지 라이선스"일 때 "재구현"만 규칙에 있으면, 재구현이 안전하지 않을 경우 소스에 위험 항목이 남을 수 있다. 라이선스 문제는 절대 발생해서는 안 된다(사용자 지시).
- **Root Cause**: 규율이 '복사 금지 → 재구현'까지였고 '최후 수단(제거)'이 명시되지 않음.
- **Resolution/Pattern**: 헌법 License Safety를 **zero tolerance 결정 사다리**로 강화 — ① 확실하고 문제없음 → 아이디어만 채택 ② 문제 소지 → 원소스 참고 완전 새 로직 재구현 ③ 그마저도 불가 → **소스에서 제거**. 도입 방식 분류에 '제거' 추가. 기록(§7) 동기화.

### [2026-11-11] 문서 파싱 정밀도 반영 - 구조 보존 + 부분 성공 보고 (kordoc 실측, MIT → 아이디어만)

- **Issue/Risk**: 문서 '읽기/추출'의 품질은 '열림'과 다르다 — 병합 셀이 깨지거나 실패 항목을 누락으로 감추면 파싱 결과가 사실과 다르게 보인다.
- **Root Cause**: 형식 게이트는 '생성/렌더' 중심이고 '추출(파싱)'의 구조 보존·실패 보고 기준이 없었다.
- **Resolution/Pattern**: kordoc(대표 벤치: HWPX 표 구조 100%)의 패턴을 **자체 기준**으로 옮겨 format-gate.md에 '파싱 정밀도' 절 신설 — 구조 보존(병합 셀)·소비자별 출력 분리·부분 성공 보고·스캔 계층 표기·회복적 파싱·벤치 관리. 설치·실행 없이 아이디어만.

### [2026-11-11] 4종 저장소 실측 반영 - 독자 라이선스·신뢰 라벨·credit 유지

- **Issue/Risk**: 포괄적인 '오픈소스'처럼 보여도 독자 라이선스(소스공개형 프리뷰, vork)나 미판정 소스가 있으면 복사·재배포 시 위반 가능성 — 라이선스 파일 원문 판독 없이 '오픈소스'로 단정하는 실수.
- **Root Cause**: README 문구('free'·'source-available')와 라이선스 종류는 다르다 — MIT/독자/GPL 구분은 LICENSE 원문 판독에만 근거해야 함.
- **Resolution/Pattern**: 4종 LICENSE 원문 직접 취득(MIT 2 · 독자 1 · 미판정 1) → 신뢰 라벨(확인/추정/가설)+credit 라벨을 형식 게이트 공통 항목으로 반영, 복사 0건(아이디어만).

### [2026-11-12] Craft gate - 미적 감각·문장은 외재화·강제 대상이다 (모델 능력 아님)

- **Issue/Risk**: 산출물 5개 버전 연속에서 사용자 리뷰가 "10/100 → 50 → 70 → AI 티/세련미 부족"으로만 상승 — 매 라운드 디자인 언어를 새롭고, "콘텐츠만 추가한 느낌"이 반복됐다.
- **Root Cause**: 미적 감각과 글쓰기 품질이 외재화·강제된 적이 없어서 매 라운드 즉흥 재발명(템플릿+패치)으로 수렴했다. 저장소에는 이미 크래프트 스택이 존재했으나(ppt-master: 액션 타이틀·고스트 덱·디자인 스펙 잠금 / visual-artist: 7축 100점 스코어카드·신선한 시선 재채점 / writer-master: 뷰포인트 퍼스트·7단계 편집·발행 게이트 / anti-ai-harness: anti-AI 패턴 체크리스트·4블록 보고서) 산출물 작성 과정에서 **로드조차 안 했다** — 존재하는 게이트를 우회하면 출력은 템플릿 분포로 회귀한다.
- **Resolution/Pattern**: 산출물급 작업에 크래프트 스택을 게이트로 강제한다 — ① 작성 전 design_spec(소스 오브 트루스) + 액션 타이틀(고스트 덱 테스트) ② 시각 산출물은 렌더 후 7축 스코어카드 ≥70 채점(0점 실패 축 있으면 FAIL) ③ 롱폼은 뷰포인트 퍼스트 문어체 편집 + anti-AI 패턴 체크 ④ 출하 전 4블록 보고서(변경/유지/근거/미검수). 'AI 티'의 원인은 모델의 감각이 아니라 **게이트 부재** — 이번 로그를 시작 전 필독 목록(compound-first)에 둔다. 실증: OpenShift Virtualization 실습 v6(액션 타이틀 10장, 스코어카드 90.5/100, 심층 글 2,164자 문어체 편집).

### [2026-11-12] 바이너리 검증 - '손상' 판정 전 탐침 자체를 검증하라 (양성 대조)

- **Issue/Risk**: 머지된 `03-deck.pptx`가 "corrupted(0슬라이드, 내용 누락)"로 3회 이상 재건·재시도되는 사고. 실제로는 커밋 blob이 시각 검증된 렌더 입력과 바이트 동일(sha256 일치)한 **완전체**였다 — 판정 자체를 뒤집는 오탐이었다.
- **Root Cause**: ① 탐침 스크립트의 한글 유니코드 이스케이프 오타(`\ud589`=호×, 실물 `U+D638` · `\uc740`=는×, 실물 `U+B294`)로 존재하는 텍스트가 '없음'으로 판정 — **양성 대조(이미 렌더 픽셀에서 보본 텍스트) 없이 탐침의 음성을 신뢰**. ② PS5.1 인라인 `-c` 문자열에서 정규식 `$`가 `\$`로 전파돼 '슬라이드 0개' 오판. ③ PS 파이프라인(`git show | Out-File`)이 바이너리를 깨뜨린 것을 blob 손상이라 오인.
- **Resolution/Pattern**: 바이너리 내용 검증은 (a) 탐침 코드를 `.py` 파일로 (PS 인라인 금지), (b) 실행 전 **양성 대조** — 렌더 이미지에서 직접 확인한 텍스트를 탐침이 반드시 True로 잡는지 먼저 확인, (c) blob 바이트는 PS 파이프가 아닌 python `subprocess.run([...], capture_output=True)`로 추출, (d) 최종 준거는 **시각 렌더 픽셀 + sha256(커밋 blob == 렌더 입력 sourceSha256)**. 'corrupted' 선언 전에 최소 2개 독립 경로(텍스트·해시·렌더)가 같은 결론을 내려야 함.

### [2026-11-12] Git 운영 - 머지 커밋에서의 `reset --hard HEAD~1`은 1-parent 회귀

- **Issue/Risk**: 실패 재시도 루프에서 `git reset --hard HEAD~1`을 3회 실행 → 로컬 main이 머지 커밋의 **첫 번째 부모(머지 전)**로 이동, 신규 실습 디렉터리 전체가 디스크에서 소멸(원격은 무사).
- **Root Cause**: 머지 커밋에서 `HEAD~1`은 첫 번째 부모(로컬 브랜치 측) = 머지 이전 상태. `--hard`는 그 상태로 워킹트리 전체를 덮음.
- **Resolution/Pattern**: 잘못된 커밋을 되돌릴 때는 ① `git reset --soft HEAD~1`(워킹트리 보존) 또는 ② **명시적 안전 SHA 피닝**(`git reset --hard <이미 검증한 SHA>`). `HEAD~1` 상대 참조 + `--hard` 조합 금지. 재시도 루프에 하드 리셋이 들어가면 루프 전 단행으로 검증 순서(빌드→탐침→해시→커밋→blob 확인)를 고정.

### [2026-11-12] 파일 정합성 - 온디스크 사본과 커밋 바이트는 별개 (재생성 후 즉시 재검증)

- **Issue/Risk**: 머지 후 정합성 점검에서 온디스크 `03-deck.pptx`(·OpenShift 바이너리 4종)가 커밋 바이트와 다름 — 파일이 외부에서 재생성돼 있었음.
- **Root Cause**: 로컬 파일 보호 프로세스가 렌더 검증 이후 커밋 전 사이에 사본을 다시 쓴 것으로 추정(정확한 시점·주체는 미검증).
- **Resolution/Pattern**: 바이너리 산출물은 **커밋 blob이 준거** — blob을 추출해 check_office·렌더·sha256 비교로 재검증하고, 워킹트리는 `git checkout --`로 복원. 로그에는 '파일 재생성 · 즉시 재검증' 중립 섹션으로만 기록(프로세스 명칭 기록 금지). 커밋 전 `git hash-object` → 커밋 후 `git rev-parse HEAD:<path>` 일치 확인을 바이너리 산출물 표준 절차로.

### [2026-11-12] CI 운영 - 플랫폼 디스패치 장애와 코드 실패는 다르게 판정

- **Issue/Risk**: 06:04Z부터 모든 CI 잡이 2~4초, 스텝 0개, 러너 미할당으로 전멸(동일 워크플로우는 40분 전 9/9 통과). fresh push 신규 런까지 동일 실패. `gh pr merge --admin`도 리포지토리 룰셋(필수 체크 9/9)에 하드 블로킹.
- **Root Cause**: GitHub 상태 페이지는 전무장(전일 21:21Z 해결된 Actions 대형 사고 이후 잔여 영향 추정 — 미검증). 저장소 코드·워크플로와 무관한 디스패치 계층 실패(0 스텝 = 코드 미실행).
- **Resolution/Pattern**: 실패 판정 시 `steps` 개수·러너 할당·동일 시점의 main push 런을 대조해 **플랫폼 실패인지 코드 실패인지** 먼저 분리. 플랫폼 실패면 게이트를 약화하지 않고(룰셋 우회 금지) 주기적 재시도로 대기, 전이력·근거를 검증 로그와 최종 보고에 기록.

### [2026-11-14] External review - Verify licenses by API, adopt ideas-only, probe positive controls

- **Issue/Risk**: Adopting external detector "pattern concepts" without license verification, or trusting a gate extension without planted-sample controls.
- **Root Cause**: A detector's effectiveness is only as trustworthy as (a) its source's license evidence and (b) positive controls whose fixture text matches the pattern's actual syntax.
- **Resolution/Pattern**: Every external repo review: GitHub API spdx_id 실측 + LICENSE 보조 실측 → decisions ideas-only/기록/미채택, code copy 0. Gate 확장 시 양성 대조 7종(정규식과 픽스처 문법 일치) + 자기 스킬 셋 clean + 기존 테스트 전부 통과를 동시에 검증. 양성 대조 문구가 패턴과 어긋나면(예: 'Never tell' vs 'do not tell') 대조가 silently miss — 픽스처를 패턴 구문에 맞게 고정.

### [2026-11-14] Simulation - 10x determinism runs expose a probe-shape blind spot and a latent CI fixture gap

- **Issue/Risk**: 전체 스위트 386테스트 중 정확히 1건 fail (`inventory guard counts files and rejects a shrunken suite`, 실패 테스트 이름 확인까지 3회의 스위트 런 소요). 같은 자리에서 감쪽같이 가려진 잠복 결함 발견: run-all.sh의 신규 스테이지 `node scripts/design-channel-check.js code scripts`가 fixture(`test-inventory.test.js`의 PRODUCTION_FILES)에 없음 → WSL 스텁 호스트에서는 127 트랩에 가려 보이지 않지만 **Ubuntu CI에서는 완료 분기가 MODULE_NOT_FOUND로 확정 실패**.
- **Root Cause**: (a) bash 탐지(`-c "exit 0"`)가 **실제 사용 형태(Windows 경로 인자 스폰)와 다름** — WSL 런처 스텁이 `-c`는 통과, 경로 인자는 백슬래시를 이스케이프로 변조해 `C:Usersuser...` → 127. 탐지와 사용 형태의 불일치 = 판별 검증이 실제 경로를 걷지 않은 것. (b) run-all.sh에 스테이지 추가 시 fixture 복사 목록을 갱신하는 규칙이 없었음.
- **Resolution/Pattern**: 탐지는 반드시 **실제 사용 형태 그대로** 측정 (임시 스크립트를 경로 인자로 스폰). run-all.sh가 스폰하는 모든 파일 리스트 ⊆ fixture PRODUCTION_FILES 교차검증을 커밋 전 게이트로 수행. 추가 파일=양성 대조·fixture 갱신·결정론 재실측 3종 셋.

### [2026-11-15] P1 build - probe() note param clobbered measured stdout; assert.match needs RegExp; merge-guard checks-file argv has no PR number

- **Issue/Risk**: Three latent defects found while wiring B1/B3: (1) `host-permission-matrix.js` net probe printed "curl ok (no status code captured)" — the `note` argument to `probe()` overwrites the detail with a static string, hiding the `-w %{http_code}` stdout the caller needs to parse; (2) a test asserted `assert.match(stdout, `^\\| win32/`)` with a **string**, which throws `ERR_INVALID_ARG_TYPE` instead of failing the assertion; (3) invoking merge-guard as `merge-guard.js 61 --checks-file …` silently ran **live mode** (argv[0] must be the PR number or `--checks-file`), producing a usage error that looks like a checks-file failure.
- **Root Cause**: (1) `probe()` conflates "human label" with "measured output" — when status is ok it returns `note || firstLineOfStdout`, so any probe whose value lives in stdout must omit the note; (2) `assert.match` (strict) requires a RegExp instance — template-literal strings are not auto-compiled; (3) `main()` dispatches on `argv[0]` only, so extra leading args route to the live path.
- **Resolution/Pattern**: (1) For value-bearing probes, pass no note and parse `detail` with an anchored regex; keep notes only for probes whose detail is a label. (2) Build RegExp with `new RegExp(...)` when the pattern is dynamic. (3) Documented argv shapes: live = `<pr-number>`; snapshot = `--checks-file <path> --expected-head <sha>` (no PR number) — both refuse (exit 2) by design, and the refusal messages are the measured evidence (B3 H-08).

### [2026-11-15] Local run-all on Windows - hooks gate takes 35+ min under concurrent load; log stays silent until gates flush

- **Issue/Risk**: `bash tests/run-all.sh` showed no output for 35+ minutes (gate phase buffers per-gate output until flush), risking a false "hung" diagnosis while a determinism loop and a 5-file `node --test` ran concurrently.
- **Root Cause**: The gate phase runs 9 gates in parallel with order-preserving output (buffered), and the hooks gate spawns many short-lived Git Bash child processes per case (306 cases); on Windows Git Bash each spawn is slow, and CPU contention from concurrent work stretches it well past the nominal 22–26 min total. The parent bash's own CPU time stays low (~12s) because it mostly waits on children.
- **Resolution/Pattern**: To check liveness without trusting log silence: list `bash.exe` processes and watch (a) the `hooks.test.sh` parent still accumulating CPU and (b) **fresh child bash/hook processes appearing with new start times** (e.g. `evidence-guard.sh` spawning). No new children + flat CPU = actually stuck. Avoid heavy concurrent work during the gate phase; a full run-all under load measured ~70 min here (410 pass/6 skip/0 fail, hooks 306/306, ALL CHECKS PASSED) versus 22–26 min unloaded. Also: `jq` is a hard run-all prerequisite on Windows — `choco install jq` (the same route CI's Windows job uses) when `ERROR: missing required tool 'jq'` appears.

### [2026-11-15] CI triage - toolbroker/windows single-test flake (WinError 10053); darwin read probe "denied" is a missing-file artifact

- **Issue/Risk**: PR #62 run 43667190047: 8/9 green, `toolbroker / windows-latest` failed in ~19s with `FAILED (errors=1)` — `test_slow_drip_has_absolute_deadline_and_releases_slot` (ServerLimitTests) raised `ConnectionAbortedError: [WinError 10053]` in the **test-side** `sock.recv()` after the slow-drip server enforced its absolute deadline. Also, the new B1 matrix showed `read=denied` on macos-latest, which superficially looks like a host permission denial.
- **Root Cause**: (1) Socket tests that race a clean close against a TCP RST are timing-sensitive: on one Windows runner the RST reached the test socket instead of a clean EOF. Flake diagnosis rested on three facts: toolbroker code/tests/CI job were byte-identical to the v1.5.0 run that passed 26/26 on the same windows-latest image 2h earlier; ubuntu+macos legs of the same PR run passed; local Windows re-run passed 26/26. (2) The darwin read probe targets `/etc/hostname`, which does not exist on macOS (`cat: /etc/hostname: No such file or directory` — measured in the artifact probe details), so `denied` means missing probe target, not a denied permission.
- **Resolution/Pattern**: (1) For a single-test socket error on one OS leg: confirm (a) code unchanged in the run, (b) other OS legs green, (c) local re-run green — then rerun only the failed job (`gh run rerun <id> --failed`) instead of patching; if it fails twice, inspect the test's close-vs-RST timing assumptions. (2) Any `denied` in a single-target read probe must be read together with the probe detail (error body) before concluding "host denies reads"; the detail is co-published in the matrix doc/artifact by design. Candidate future fix: a darwin read target that exists on macOS (e.g. `/etc/hosts`). (3) Environment (this PC): GitHub Actions log/artifact downloads fail with a direct-dial timeout because a corporate PAC (registry `AutoConfigURL`) routes non-GitHub traffic through a corporate egress proxy while direct Azure blob IPs are blackholed; setting `HTTPS_PROXY`/`HTTP_PROXY` to that PAC proxy makes `gh` log and artifact downloads work (curl on Windows does not honor the PAC, so it needs the explicit proxy too).

### [2026-11-15] P2 build - Playwright MCP video pipeline: ffmpeg helper, remote video.path(), no fs in vm sandbox

- **Issue/Risk**: C2b 렌더→영상 PoC에서 3중 장애: (1) `recordVideo` 컨텍스트 생성 실패 — DSH 커스텀 playwright-core(1.64.0-alpha)의 ffmpeg-1011 헬퍼가 기본 `ms-playwright` 경로에 없음 (브라우저는 커스텀 `b\browser@…` 레이아웃에만 존재); (2) `video.path()`가 "Path is not available when connecting remotely" — MCP 원격 연결 모드는 원본 경로를 노출하지 않음; (3) MCP `browser_run_code_unsafe`는 vm 샌드박스에서 실행되어 `require('fs')`도 `await import('node:fs')`도 불가.
- **Root Cause**: (1) DSH 빌드의 브라우저만 비기본 경로에 설치되고 ffmpeg 헬퍼는 기본 경로로만 지연 설치됨; (2) 원격 모드에서는 video의 원본 경로를 의도적으로 감추고 `saveAs()`만 지원하는 API 설계; (3) vm 컨텍스트에 CJS require도 ESM dynamic import 콜백도 없다.
- **Resolution/Pattern**: (1) MCP 서버와 **같은 npx 캐치의 playwright-core** `cli.js install ffmpeg` 실행 (playwright-core 버전 == 빌드 리비전 일치 보장) 후 `ffmpeg -version`으로 검증. (2) `path()` 없이 `saveAs(final)` 호출 + recordVideo dir에 쓰인 원본을 외부에서(size+sha256) 대조 후 원본 제거 — 동일성 검증 없이 rename 금지. (3) 파일시스템 작업은 vm 밖(호스트 셸)에서 수행, MCP 코드는 브라우저 오케스트레이션만. 영상 메타(길이/해상도/fps)는 설치된 ffmpeg 바이너리로 실측, API 추측 금지. (참고: html 편집 후 렌더/녹화 최종본을 반드시 재확정 — C1에서 sha 체인 불일치 1회 교훈 재확인.)

### [2026-11-16] Tree binding - inherited Git routing and practical environment compatibility

- **Issue/Risk**: Git environment overrides can redirect snapshot enumeration. Rejecting every `GIT_*` variable also rejected the ordinary `GIT_PAGER` inherited by this host, causing 29 regression test failures in the first targeted run.
- **Root Cause**: Git subprocesses inherited routing and configuration overrides, while the initial blanket rejection did not distinguish the pager variable from tree-affecting overrides.
- **Resolution/Pattern**: Fail closed on inherited `GIT_*` variables with narrowly scoped pager and config-disabling exceptions; test alternate index, repository and configuration environment overrides before test execution. Independent review also identified the real multi-phase fixture's config isolation variables, so that fixture uses the platform null device rather than an arbitrary global config path. This does not isolate Git configuration files, concurrent mutation or validate old evidence. Actual Codex read-signal integration remains unverified.
- **Windows detail**: Git for Windows rejected Node's `os.devNull` spelling as a configuration file; the `NUL` spelling was verified locally and the real multi-phase fixture passed after the platform-specific correction. POSIX hosts remain unverified locally.

### [2026-11-16] Claude read signal - test real host before Phase rerun

- **Issue/Risk**: Codex shell reads cannot satisfy the existing verify read tracker, while a registered hook alone does not show that a host emits the required event.
- **Root Cause**: The hook requires a `Read` event attributed to the `verify` subagent; host-specific tool events cannot be inferred from configuration.
- **Resolution/Pattern**: In a disposable Git fixture, Claude Code 2.1.325 used a real verify subagent Read on a gate-generated test log. The hook produced a matching signal, and the fixture gate recorded verify PASS with `require_read_proof: true`. This verifies that fixture's Claude path, not Codex integration, host isolation, or review comprehension.

### [2026-11-16] Phase run - passing tests with changed tree are not Phase PASS

- **Issue/Risk**: The full Windows suite reported 415 passed, 6 skipped and 0 failed, but the Phase gate recorded FAIL because its initial and final tree snapshots differed. Five tracked practice binaries appeared modified after the run; their timestamps were old and the responsible actor was not established.
- **Root Cause**: Unverified. The aggregate tree hash does not identify changed files or when they changed. Git status before and after provides a candidate set, not proof of causation.
- **Resolution/Pattern**: Preserve changed binaries and failed evidence, do not equate test exit 0 with Phase success, and compare snapshots when rerunning. Do not restore or overwrite user files to force a matching hash.

### [2026-11-16] Read hooks - fixture success can fail on the real host under resource pressure

- **Issue/Risk**: A real Claude verify subagent read the successful test log, but strict verify could not record PASS because no read signal was generated.
- **Root Cause**: Claude hook event output showed the actual `PostToolUse:Read` hooks were cancelled; one reported Git Bash `fork: Resource temporarily unavailable`. The specific resource exhaustion mechanism was not established.
- **Resolution/Pattern**: Keep the valid bound test evidence and the Phase incomplete. Do not synthesize hook events. A failed strict record rotates the read token, so a later attempt needs a fresh real verify Read. Fixture success alone does not prove the production invocation will succeed under different load.
- **Follow-up**: A fresh actual verify-subagent Read with a per-invocation 60-second hook setting produced successful hook events and a matching phase/token/log-hash signal. Strict verify was recorded with `require_read_proof: true`. This shows a successful configured invocation, not a controlled proof that the 10-second timeout caused earlier cancellations or a permanent repair of the default host configuration.

## Template for New Entries

### [YYYY-MM-DD] Phase X - [Category]

- **Issue/Risk**: Description of problem or mistake encountered.
- **Root Cause**: Why it happened.
- **Resolution/Pattern**: Effective fix or rule to avoid repeating it.


## 2026-11-16: Portable evidence and replay limits

- Compare staged Git blobs with raw checkout bytes before binding evidence; Windows checkout conversion can invalidate an otherwise equivalent snapshot. Preserve user-modified artifacts separately.
- The isolated LF snapshot passed the strict full test and genuine default-hook read proof; the inventory replay exit and output were lost during session transition and must not be reported as a pass. Capture long-running replay output and exit status durably in future.
- A single GitHub Actions job has a finite budget; sequential replay of multiple individually bounded attestations can still exceed it. The current CI arrangement fails closed but does not solve this scaling limitation. A default hook success does not prove reliability under process exhaustion.
