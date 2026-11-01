# HANDOFF.md - Session Hand-off State

Used for **mandatory Context Reset** at Phase boundaries and whenever context quality degrades.

## When to Hand Off

- After a Phase is fully completed (coding → test → verify → review → compound all PASS).
- When context usage is high (~70%+) and consistency drops.
- Before starting a new Phase in a fresh session.

## Current State

- **Last Completed Phase**: 없음 (하네스의 CI/E2E 검증과 실제 에이전트 운영 Phase는 별개)
- **In Progress**: 2026-11-01 기준 `main`은 785cf42이며 CI 8개 잡이 모두 success다. PR #27에서 Windows 8.3 단축 이름(`RUNNER~1`) 때문에 저장소 내부 임시 경로가 저장소 밖으로 오판되던 문제를 `fs.realpathSync.native` 기반 `canonicalPath()`로 고쳤고(증거 디렉터리·훅 파일·재실행 임시 경로 3개 지점), macOS toolbroker slow-drip 테스트는 408 응답 후 peer reset을 허용하도록 조정했다. 독립 감사에서 같은 8.3 유형 결함이 `scripts/package-lint.js`에도 있어(정션 대상이 긴 이름으로 해석돼 정상 파일을 "outside repository"로 오거부) `fs.realpathSync.native`로 함께 고쳤고, 경로 표기(후행 구분자·`.`/`..` 경유)에 따라 포함 판정이 달라지지 않는지 확인하는 불변식 테스트를 추가했다. 그리고 아래 수치는 보안 개선 이전의 로컬 Windows runner 기록이며 현재 코드 전체 결과가 아니다: 225 통과·2 스킵, hooks 138/138. 표적 게이트 변이 3건은 기준 테스트 통과 후 각 예상 assertion에서 탐지됐으나 전체 게이트 보장은 아님. 사용법·한계는 docs/local-evaluation-poc.md 참조; 실제 모델 평가는 미실행. StrykerJS 10.1.1은 승인된 원격 임시 경로에서 test-summary 복사본에 대해 PoC를 실행(365 변이 중 259 탐지, 106 생존)했고 임시 경로를 제거했다. 이는 전체 보안·게이트 품질 검증이 아니다. 신규 실행의 양쪽 Git 목록 실패·트리 모드·버전 정책은 별도 검토 필요.
- **Key Decisions**: phase-gate·증거·엄격 테스트 유지, 규칙 계약 선언 시 타입이 있는 컨텍스트 체크포인트 검증, 테스트 증거는 실행 전후 트리 스냅샷으로 바인딩. 테스트 파일 수 하한은 축소 탐지용이며 파일 신원이나 품질 보장이 아님.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest CI evidence**: As of 2026-11-01 KST, main `785cf42` (merge of PR #27) passed all eight CI jobs: checks/node 22, checks/node 24, portability/macos-latest, portability/windows-latest, isolation/linux namespace, toolbroker/ubuntu-latest, toolbroker/macos-latest, toolbroker/windows-latest. PR #26 was merged while portability/windows-latest was failing, so that merge is not evidence that the gate held. The fd8987f main CI attempt 2 (2026-10-31) is a separate, earlier failure where eight jobs executed no steps and carried a GitHub billing/spending-limit annotation; that specific cause remains unestablished. Local Windows validation before these fixes (fd8987f, with only HANDOFF edited): full runner Node 210 passed, 2 skipped (Windows trailing-space paths and symlink EPERM), hooks 138/138; ToolBroker fixtures 25/25. Local runs do not replace Linux/macOS CI.
- **Open Issues**: Claude Code·Codex 실제 호스트 권한 통합 미검증. ToolBroker 서명 승인·DB 멱등성·로컬 HTTP fixture는 구현·테스트됐으나 운영 API/DB 통합과 전체 도구 권한 강제는 별도 검증 필요. 별도 Windows Git Bash guard 10초 watchdog 시험은 6/6 시간 초과(종료 전 확인 불가)였고, jq --version 자체도 출력 후 종료 지연되어 원인은 미확정. 전체 hooks 138/138 통과와 모순되지 않으며 환경·부하 추가 조사 필요. Windows worker 자체 강제 종료·수동 복구 fixture는 통과했으나 외부 신호 종료, 즉시 프로세스 트리 정리, POSIX 신호 의미나 자동 복구를 인증하지 않음. Bash lexical 훅은 보안 경계가 아님. phase-gate의 실행 전후 트리 비교는 영구 변경만 탐지하며 일시 복원·ignored 입력·파일 모드·서브모듈·동시 쓰기·일부 누락/스캔 오류는 다루지 못함(격리 아님). 기존 증거의 과거 읽기 누락 여부는 판정할 수 없음. 2026-11-01 기준 main 보호 GET과 ruleset GET 모두 HTTP 403(플랜 업그레이드 또는 저장소 공개 필요)이라 서버 측 병합 차단은 없다. 대체 수단은 권고용 `scripts/merge-guard.js`뿐이며 실제 PR로 #26 거부·#27 허용을 확인했지만 강제력은 없다(docs/merge-policy.md). macOS slow-drip 테스트의 peer reset 허용은 macOS CI 재실행으로만 확인했고 로컬에서 재현하지 못했다.
- **Artifacts Produced**: scripts/package-lint.js, tests/package-lint.test.js, tests/doctor-config.test.js, docs/cursor-plugins-review-2026-10-28.md, scripts/merge-guard.js (+ tests/merge-guard.test.js, docs/merge-policy.md), 8.3 short-name 회귀 테스트(tests/attestation-output-paths.test.js); existing phase-gate/runtime/isolation evidence remains in docs/maturity/.
- **Next Actions**: Optional document-job contract/checker added (docs/document-jobs.md, scripts/document-job.js); manifest-only, runner and live PDF quality remain unimplemented/unverified. Optional report editor added at skills/evidence-preserving-editor/SKILL.md with six synthetic evaluation cases, package-only tests and an optional blinded evaluation protocol (docs/report-editing-evaluation.md); live model editing quality has NOT been evaluated and no evaluation result exists. These optional workflows were merged in PR #8 and the gate/verify/report-editing changes in PR #9; never infer actual PDF, model or production quality from those merges. External conditions and owner actions remain in docs/maturity/CLOSURE-2026-10-27.md.

## Mandatory Procedure

1. Update this file with the fields above.
2. Commit the update.
3. Start a **new session**.
4. In the new session, read: `CLAUDE.md` + this file + `docs/compound-log.md` + relevant Phase section in `docs/PHASES.md`.
5. Continue only from the Next Actions.

## Instructions for New Session

Do not resume mid-Phase work from a long previous context. Always begin from the clean state recorded here.
