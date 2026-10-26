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

## Template for New Entries

### [YYYY-MM-DD] Phase X - [Category]

- **Issue/Risk**: Description of problem or mistake encountered.
- **Root Cause**: Why it happened.
- **Resolution/Pattern**: Effective fix or rule to avoid repeating it.
