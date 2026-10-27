# HANDOFF.md - Session Hand-off State

Used for **mandatory Context Reset** at Phase boundaries and whenever context quality degrades.

## When to Hand Off

- After a Phase is fully completed (coding → test → verify → review → compound all PASS).
- When context usage is high (~70%+) and consistency drops.
- Before starting a new Phase in a fresh session.

## Current State

- **Last Completed Phase**: 없음 (하네스의 CI/E2E 검증과 실제 에이전트 운영 Phase는 별개)
- **In Progress**: 없음
- **Key Decisions**: phase-gate·증거·엄격 테스트 유지, 규칙 계약 선언 시 타입이 있는 컨텍스트 체크포인트 검증
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest CI evidence**: 2026-10-27 main b494f7a: all eight CI jobs succeeded after PR #7 merge (Node 22/24, Windows/macOS portability, ToolBroker three hosts, Linux isolation). PR #8 initial head 0b61a52 passed eight CI jobs; subsequent recovery-test fixes require fresh CI.
- **Open Issues**: Claude Code·Codex 실제 호스트 권한 통합 미검증. ToolBroker 서명 승인·DB 멱등성·로컬 HTTP fixture는 구현·테스트됐으나 운영 API/DB 통합과 전체 도구 권한 강제는 별도 검증 필요. Windows 실제 worker 강제 종료·수동 복구 테스트는 통과했으나 POSIX 신호 의미나 자동 복구를 인증하지 않음. Bash lexical 훅은 보안 경계가 아님
- **Artifacts Produced**: .claude/workflows/phase-gate.js, tests/runtime-recovery.test.js, tests/runtime-isolation-linux.sh, docs/maturity/
- **Next Actions**: Optional document-job contract/checker added (docs/document-jobs.md, scripts/document-job.js); manifest-only, runner and live PDF quality remain unimplemented/unverified. Optional report editor added at skills/evidence-preserving-editor/SKILL.md with six synthetic evaluation cases and package-only tests; live model editing quality has NOT been evaluated. Changes are proposed in PR #8; do not treat them as merged until verified. External conditions and owner actions remain in docs/maturity/CLOSURE-2026-10-27.md; never infer production/model certification from fixture success.

## Mandatory Procedure

1. Update this file with the fields above.
2. Commit the update.
3. Start a **new session**.
4. In the new session, read: `CLAUDE.md` + this file + `docs/compound-log.md` + relevant Phase section in `docs/PHASES.md`.
5. Continue only from the Next Actions.

## Instructions for New Session

Do not resume mid-Phase work from a long previous context. Always begin from the clean state recorded here.
