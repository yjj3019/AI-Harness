# HANDOFF.md - Session Hand-off State

Used for **mandatory Context Reset** at Phase boundaries and whenever context quality degrades.

## When to Hand Off

- After a Phase is fully completed (coding → test → verify → review → compound all PASS).
- When context usage is high (~70%+) and consistency drops.
- Before starting a new Phase in a fresh session.

## Current State

- **Last Completed Phase**: 없음 (하네스의 CI/E2E 검증과 실제 에이전트 운영 Phase는 별개)
- **In Progress**: 보안 점검 개선 후 회귀 검증 진행 (GitHub 작업 보류). 다음 수치는 보안 개선 이전의 로컬 Windows runner 기록이며 현재 코드 전체 결과가 아니다: 225 통과·2 스킵, hooks 138/138. 표적 게이트 변이 3건은 기준 테스트 통과 후 각 예상 assertion에서 탐지됐으나 전체 게이트 보장은 아님. 사용법·한계는 docs/local-evaluation-poc.md 참조; 실제 모델 평가는 미실행. StrykerJS 10.1.1은 승인된 원격 임시 경로에서 test-summary 복사본에 대해 PoC를 실행(365 변이 중 259 탐지, 106 생존)했고 임시 경로를 제거했다. 이는 전체 보안·게이트 품질 검증이 아니다. 최신 main의 CI 복구와 다중 플랫폼 검증도 미완료. PR #24 attestation 출력 캡처와 PR #25 선택적 디자인 근거 워크플로는 병합됨. 신규 실행의 양쪽 Git 목록 실패·트리 모드·버전 정책은 별도 검토 필요.
- **Key Decisions**: phase-gate·증거·엄격 테스트 유지, 규칙 계약 선언 시 타입이 있는 컨텍스트 체크포인트 검증, 테스트 증거는 실행 전후 트리 스냅샷으로 바인딩. 테스트 파일 수 하한은 축소 탐지용이며 파일 신원이나 품질 보장이 아님.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest CI evidence**: As of 2026-10-31 KST, PR #24 merged as aa2a814 and PR #25 as main fd8987f. The fd8987f main CI attempt 2 has eight failed jobs, all with no executed steps and GitHub's payment failure or spending-limit annotation; the specific billing cause is not established. Earlier PR #23 and main 3d920a4 passed eight CI jobs, not evidence for the newer commits. Local Windows validation of fd8987f (with only this HANDOFF documentation edited): full runner Node 210 passed, 2 skipped (Windows trailing-space paths and symlink EPERM), hooks 138/138; ToolBroker fixtures 25/25 passed. This does not replace Linux/macOS CI. Do not rerun billable jobs until the owner confirms the billing issue is resolved and authorizes any cost.
- **Open Issues**: Claude Code·Codex 실제 호스트 권한 통합 미검증. ToolBroker 서명 승인·DB 멱등성·로컬 HTTP fixture는 구현·테스트됐으나 운영 API/DB 통합과 전체 도구 권한 강제는 별도 검증 필요. 별도 Windows Git Bash guard 10초 watchdog 시험은 6/6 시간 초과(종료 전 확인 불가)였고, jq --version 자체도 출력 후 종료 지연되어 원인은 미확정. 전체 hooks 138/138 통과와 모순되지 않으며 환경·부하 추가 조사 필요. Windows worker 자체 강제 종료·수동 복구 fixture는 통과했으나 외부 신호 종료, 즉시 프로세스 트리 정리, POSIX 신호 의미나 자동 복구를 인증하지 않음. Bash lexical 훅은 보안 경계가 아님. phase-gate의 실행 전후 트리 비교는 영구 변경만 탐지하며 일시 복원·ignored 입력·파일 모드·서브모듈·동시 쓰기·일부 누락/스캔 오류는 다루지 못함(격리 아님). 기존 증거의 과거 읽기 누락 여부는 판정할 수 없음. 2026-10-31 main 보호 GET은 HTTP 403(플랜 업그레이드 또는 공개 필요)으로 현재 보호 규칙을 확인할 수 없었음; 설정·공개 범위는 변경하지 않음
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
