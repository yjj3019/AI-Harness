# HANDOFF.md - Session Hand-off State

Used for **mandatory Context Reset** at Phase boundaries and whenever context quality degrades.

## When to Hand Off

- After a Phase is fully completed (coding → test → verify → review → compound all PASS).
- When context usage is high (~70%+) and consistency drops.
- Before starting a new Phase in a fresh session.

## Current State

- **Last Completed Phase**: 없음 (하네스의 CI/E2E 검증과 실제 에이전트 운영 Phase는 별개)
- **In Progress**: 미커밋 선택형 `--require-bound-tree` 정책과 필수 attestation 목록 검증기를 로컬 검증했다 (GitHub 작업 보류). 목록 검증기는 CI에 자동 연결되지 않았고 독립적으로 보호된 필수 정책이 아니다. 현재 정의된 Phase는 없으며 CI의 0개 attestation은 어떤 Phase도 검증하지 않았다는 뜻이다. docs/harness-evaluation-pilot.md는 제안이며 로컬 fixture 범위 관측만 docs/maturity/LOCAL-FIXTURE-BASELINE-2026-11-02.md에 기록했다.
- **Key Decisions**: phase-gate·증거·엄격 테스트 유지, 규칙 계약 선언 시 타입이 있는 컨텍스트 체크포인트 검증. Git 트리 확보 시 테스트 증거를 실행 전후 스냅샷으로 바인딩하며, 발견 실패 시 레거시 미바인딩은 경고만 함. 테스트 파일 수 하한은 축소 탐지용이며 파일 신원이나 품질 보장이 아님.
- **CI platforms**: ubuntu-latest, windows-latest, macos-latest
- **Latest CI evidence**: As of 2026-10-31 KST, PR #24 merged as aa2a814 and PR #25 as main fd8987f. The fd8987f main CI attempt 2 has eight failed jobs, all with no executed steps and GitHub's payment failure or spending-limit annotation; the specific billing cause is not established. Earlier PR #23 and main 3d920a4 passed eight CI jobs, not evidence for the newer commits. Local Windows validation of fd8987f (with only this HANDOFF documentation edited): full runner Node 210 passed, 2 skipped (Windows trailing-space paths and symlink EPERM), hooks 138/138; ToolBroker fixtures 25/25 passed. This does not replace Linux/macOS CI. Do not rerun billable jobs until the owner confirms the billing issue is resolved and authorizes any cost.
- **Open Issues**: Claude Code·Codex 실제 호스트 권한 통합 미검증. ToolBroker 서명 승인·DB 멱등성·로컬 HTTP fixture는 구현·테스트됐으나 운영 API/DB 통합과 전체 도구 권한 강제는 별도 검증 필요. 별도 Windows Git Bash guard 10초 watchdog 시험은 6/6 시간 초과(종료 전 확인 불가)였고, jq --version 자체도 출력 후 종료 지연되어 원인은 미확정. 전체 hooks 138/138 통과와 모순되지 않으며 환경·부하 추가 조사 필요. Windows worker 자체 강제 종료·수동 복구 fixture는 통과했으나 외부 신호 종료, 즉시 프로세스 트리 정리, POSIX 신호 의미나 자동 복구를 인증하지 않음. Bash lexical 훅은 보안 경계가 아님. phase-gate의 실행 전후 트리 비교는 영구 변경만 탐지하며 일시 복원·ignored 입력·파일 모드·서브모듈·동시 쓰기·일부 누락/스캔 오류는 다루지 못함(격리 아님). 기존 증거의 과거 읽기 누락 여부는 판정할 수 없음. 2026-10-31 main 보호 GET은 HTTP 403(플랜 업그레이드 또는 공개 필요)으로 현재 보호 규칙을 확인할 수 없었음; 설정·공개 범위는 변경하지 않음
- **Local working-tree verification (2026-11-02, Windows Node 24.15.0)**: `tests/run-all.sh` completed on current source/test changes: 26 test files, Node 242 passed / 2 skipped / 0 failed (Windows trailing-space paths and symlink EPERM), hooks 138/138; package and handoff checks passed. The inventory checker suite has 6 passing tests; its successful multiple-phase dispatch uses a stub and the real gate test only rejects malformed attestation before replay. ToolBroker fixture unittest passed 25/25; summary-parser tests passed 27/27. These are local results for an uncommitted working tree, not GitHub CI, Linux/macOS verification, actual host authorization, full pilot execution, or model quality evidence.
- **Additional caveats**: `git ls-files` 출력은 Node 기본 spawnSync 버퍼에 제한되며 큰 저장소에서 ENOBUFS로 거부될 수 있다. 실패한 재-attest는 기존 attestation 파일을 삭제하지 않는다. 파일의 존재만으로 최신 실행의 성공을 주장하지 말고 명령 결과와 재검증을 확인한다. 확인된 worktree의 Git 목록 오류를 attest 두 스냅샷과 replay 전후에 주입하는 fixture는 로컬 6/6 통과했다. 실패한 발견 프로브는 레거시 호출에서 모호하며 엄격 플래그는 이를 해당 호출에서 차단한다.
- **Artifacts Produced**: scripts/package-lint.js, tests/package-lint.test.js, tests/doctor-config.test.js, docs/cursor-plugins-review-2026-10-28.md; existing phase-gate/runtime/isolation evidence remains in docs/maturity/.
- **Next Actions**: 보호된 외부 필수 Phase 목록·필수 워크플로 및 안전한 replay 환경을 운영자가 결정한다. 목록 검증기 실제 성공 CLI/다중 Phase 통합은 stub만 검증됐으므로 추후 일회용 fixture에서 보강한다. strict 플래그의 외부 검증자 강제 및 기본값 전환 여부를 별도 결정한다. 작업 트리 실행 권한과 인덱스 모드 중 바인딩할 대상, 명시적 해시 버전과 기존 증거 재발급 정책은 미결정이다. 권한·Graph·Ratchet 평가 계획은 docs/harness-evaluation-pilot.md에 제안만 기록했으며 실제 호스트 실험이나 기준선은 아직 없다. 자동 CI 재실행 전 비용 승인을 받아야 한다. Optional document-job contract/checker added (docs/document-jobs.md, scripts/document-job.js); manifest-only, runner and live PDF quality remain unimplemented/unverified. Optional report editor added at skills/evidence-preserving-editor/SKILL.md with six synthetic evaluation cases, package-only tests and an optional blinded evaluation protocol (docs/report-editing-evaluation.md); live model editing quality has NOT been evaluated and no evaluation result exists. These optional workflows were merged in PR #8 and the gate/verify/report-editing changes in PR #9; never infer actual PDF, model or production quality from those merges. External conditions and owner actions remain in docs/maturity/CLOSURE-2026-10-27.md.

## Mandatory Procedure

1. Update this file with the fields above.
2. Commit the update.
3. Start a **new session**.
4. In the new session, read: `CLAUDE.md` + this file + `docs/compound-log.md` + relevant Phase section in `docs/PHASES.md`.
5. Continue only from the Next Actions.

## Instructions for New Session

Do not resume mid-Phase work from a long previous context. Always begin from the clean state recorded here.
