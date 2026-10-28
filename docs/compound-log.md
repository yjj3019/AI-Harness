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

### [2026-10-28] Package readiness - Validate definitions and exact hook wiring

- **Issue/Risk**: Missing skills or local references escaped general lint; hook-name substring matching and non-object settings could make doctor report readiness without the required wiring.
- **Root Cause**: Partial inventories and presence-only checks did not validate the actual definition or event/matcher/command contract.
- **Resolution/Pattern**: Add a bounded package checker to the existing CI entry point and validate exact hook wiring plus repository-contained executable files. Test empty inventories, metadata, broken links, external symlinks, malformed settings and lookalike commands. Keep static readiness distinct from live host authorization and document the supported metadata syntax.

## Template for New Entries

### [YYYY-MM-DD] Phase X - [Category]

- **Issue/Risk**: Description of problem or mistake encountered.
- **Root Cause**: Why it happened.
- **Resolution/Pattern**: Effective fix or rule to avoid repeating it.
