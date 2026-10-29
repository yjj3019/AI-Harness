# HANDOFF.md - Session Hand-off State

Used for **mandatory Context Reset** at Phase boundaries and whenever context quality degrades.

## When to Hand Off

- After a Phase is fully completed (coding → test → verify → review → compound all PASS).
- When context usage is high (~70%+) and consistency drops.
- Before starting a new Phase in a fresh session.

## Current State

- **Last Completed Phase**: 없음 (하네스의 CI/E2E 검증과 실제 에이전트 운영 Phase는 별개)
- **In Progress**: 이전에 기록된 읽기 신호의 순차적 재사용 방지 검토 및 재현 (작업 브랜치; 지연 훅·동시 실행은 보장하지 않음). PR #16 패키지/doctor 보강은 병합됨. phase-gate 트리 해시의 모드·읽기 오류 보강은 별도 보류됨.
- **Key Decisions**: phase-gate·증거·엄격 테스트 유지, 규칙 계약 선언 시 타입이 있는 컨텍스트 체크포인트 검증, 테스트 증거는 실행 전후 트리 스냅샷으로 바인딩. 테스트 파일 수 하한은 축소 탐지용이며 파일 신원이나 품질 보장이 아님.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest CI evidence**: PR #16 final head c0d9db4 and squash main 63218ac CI passed; PR #16 reports eight jobs on its final head. This branch requires fresh verification; CI is not live host authorization.
- **Open Issues**: Claude Code·Codex 실제 호스트 권한 통합 미검증. ToolBroker 서명 승인·DB 멱등성·로컬 HTTP fixture는 구현·테스트됐으나 운영 API/DB 통합과 전체 도구 권한 강제는 별도 검증 필요. Windows worker 자체 강제 종료·수동 복구 fixture는 통과했으나 외부 신호 종료, 즉시 프로세스 트리 정리, POSIX 신호 의미나 자동 복구를 인증하지 않음. Bash lexical 훅은 보안 경계가 아님. phase-gate의 실행 전후 트리 비교는 영구 변경만 탐지하며 일시 복원·ignored 입력·파일 모드·서브모듈·동시 쓰기·읽기 오류는 다루지 못함(격리 아님)
- **Artifacts Produced**: scripts/package-lint.js, tests/package-lint.test.js, tests/doctor-config.test.js, docs/cursor-plugins-review-2026-10-28.md; existing phase-gate/runtime/isolation evidence remains in docs/maturity/.
- **Next Actions**: Optional document-job contract/checker added (docs/document-jobs.md, scripts/document-job.js); manifest-only, runner and live PDF quality remain unimplemented/unverified. Optional report editor added at skills/evidence-preserving-editor/SKILL.md with six synthetic evaluation cases, package-only tests and an optional blinded evaluation protocol (docs/report-editing-evaluation.md); live model editing quality has NOT been evaluated and no evaluation result exists. These optional workflows were merged in PR #8 and the gate/verify/report-editing changes in PR #9; never infer actual PDF, model or production quality from those merges. External conditions and owner actions remain in docs/maturity/CLOSURE-2026-10-27.md.

## Mandatory Procedure

1. Update this file with the fields above.
2. Commit the update.
3. Start a **new session**.
4. In the new session, read: `CLAUDE.md` + this file + `docs/compound-log.md` + relevant Phase section in `docs/PHASES.md`.
5. Continue only from the Next Actions.

## Instructions for New Session

Do not resume mid-Phase work from a long previous context. Always begin from the clean state recorded here.
