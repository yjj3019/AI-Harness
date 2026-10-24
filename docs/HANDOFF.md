# HANDOFF.md - Session Hand-off State

Used for **mandatory Context Reset** at Phase boundaries and whenever context quality degrades.

## When to Hand Off

- After a Phase is fully completed (coding → test → verify → review → compound all PASS).
- When context usage is high (~70%+) and consistency drops.
- Before starting a new Phase in a fresh session.

## Current State

- **Last Completed Phase**: 없음 (하네스 자체 점검 5차, 2026-10-25)
- **In Progress**: 없음
- **Key Decisions**: D9 플랫폼 경로 정규화, D10 E2E 시뮬레이션을 기본 검사에 포함
- **Open Issues**: CI가 ubuntu 단일이라 Windows 회귀를 못 잡는다. macOS 미검증. `rm -rf /home/user` 같은 2단계 깊이 경로는 여전히 가드를 통과한다
- **Artifacts Produced**: `.gitattributes`, `.claude/required-test-command.json`, `tests/e2e.test.js`, `tests/gate-edge.test.js`, `tests/gate-branches.test.js`. 훅 93/93·게이트 52건(1건 환경 skip) 통과, 라인 커버리지 99.3%
- **Next Actions**: `windows-latest` CI 잡 추가 → `docs/PHASES.md`에 Phase 1 정의 후 `/phase-harness 1` 실행

## Mandatory Procedure

1. Update this file with the fields above.
2. Commit the update.
3. Start a **new session**.
4. In the new session, read: `CLAUDE.md` + this file + `docs/compound-log.md` + relevant Phase section in `docs/PHASES.md`.
5. Continue only from the Next Actions.

## Instructions for New Session

Do not resume mid-Phase work from a long previous context. Always begin from the clean state recorded here.
