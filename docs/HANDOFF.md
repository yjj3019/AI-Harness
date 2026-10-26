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
- **Latest CI evidence**: 2026-10-26 main 98ac5fb — Actions run 40266931345 성공. Ubuntu 67/67, macOS 67/67, Windows 66 PASS + POSIX 복구 검사 1 SKIP, hooks 93/93, Linux namespace isolation PASS
- **Open Issues**: Claude Code·Codex 실제 격리 정책 미검증, 외부 API·DB 멱등성 및 도구 승인 강제 미구현, Windows POSIX SIGKILL 검증 제외, main 보호 비활성, Bash 정규식 훅은 보안 경계가 아님
- **Artifacts Produced**: .claude/workflows/phase-gate.js, tests/runtime-recovery.test.js, tests/runtime-isolation-linux.sh, docs/maturity/
- **Next Actions**: 실제 모델 런타임 권한 격리·외부 쓰기 멱등성 검증, 장기 작업의 원본 지침 보존 평가

## Mandatory Procedure

1. Update this file with the fields above.
2. Commit the update.
3. Start a **new session**.
4. In the new session, read: `CLAUDE.md` + this file + `docs/compound-log.md` + relevant Phase section in `docs/PHASES.md`.
5. Continue only from the Next Actions.

## Instructions for New Session

Do not resume mid-Phase work from a long previous context. Always begin from the clean state recorded here.
