# AI-Harness 정밀 분석 및 고도화 검토 — 검증·보정·우선순위 평가 (2026-11-06)

- 대상 커밋: `4a1714f513773c81ddeb02992623b8a167421113` (main)
- 방법: 저장소 정적 실측 검증(:ext-claim) + 외부 자료 8건 웹 검증(:ext-verify) — 서브에이전트 병렬 검증 결과 기반
- 라벨: **실측** = 저장소 파일/실행 결과로 확인 · **미검증** = 환경 제약(arxiv.org·docs.langchain.com transport 차단, 비공개 저장소 API 403, CI 그린, attestation 저장소 내 실경로)으로 확인 불가

## 1. 기존 분석서 주장 13건 검증 결과

| # | 주장 | 판정 | 근거 |
| --- | --- | --- | --- |
| 1 | Phase 기반 분할 + 5단계 루프 구현·문서화 | 실측 ✓ | `phase-gate.js:51` STEPS, `.claude/agents/{coding,test,verify,review,compound}.md` 5종 |
| 2 | 재시도 3회 규칙 | 실측 ✓ (문서 정책) | `CLAUDE.md:101`, `AGENTS.md:56` — 게이트는 "does not retry" |
| 3 | 해시체인·트리해시·--require-test-summary·attest/verify-attestation | 실측 ✓ | `phase-gate.js:24-25,104-140,337-339,673-785` |
| 4 | task-graph = 선언 검증기 (비실행·비보안게이트) | 실측 ✓ | `task-graph.js:1`, `task-graph.md:3` |
| 5 | paired-evaluation = 선언 집계 (모델 러너 아님) | 실측 ✓ | `paired-evaluation.js:3` |
| 6 | 평가 pilot 실행 | 실측 ⚠️ 부분 | 실행 기록 = fixture 스위트만(`LOCAL-FIXTURE-BASELINE-2026-11-02.md`: ToolBroker 25 + test-summary 27) · pilot은 proposal only · `docs/attestations/` 미커밋 |
| 7 | 격리 검증 | 실측 ✓ (smoke만) | `RUNTIME-VALIDATION-2026-10-26.md`(DENIED_READ_ONLY 30 등) — 라이브 호스트 인증은 미실행 |
| 8 | host-verification-plan = 미실행 계획 | 실측 ✓ | 제목 "(not executed)" |
| 9 | 복구 = 수동 fixture, 자동 재개 없음 | 실측 ✓ | `runtime-recovery.test.js` + 매뉴얼/재부팅 복구 미검증 명시 |
| 10 | ToolBroker UNKNOWN·자동 재시도 금지 | 실측 ✓ | `broker.py:168,195,209`, README:40 |
| 11 | 병합 미강제 + merge-guard 한계 3가지 | 실측 ⚠️ **정정** | 3한계 중 2개는 `merge-policy.md:44-46`에만 기재(merge-guard.js는 1개) · 한계 총 **5개** |
| 12 | 13개·4개 저장소 분석 문서 존재 | 실측 ✓ | `harness-optimization-review-2026-11-02.md`, `external-patterns-4repo-2026-11-05.md` |
| 13 | CI attestation 재검증·persist-credentials:false·self-qa | 실측 ✓ | `ci.yml:29-52,121-133` |

### 분석서가 놓친 저장소 사실
- `docs/attestations/` 미커밋 → attest 경로는 코드+CI에서만 존재, 저장소 내 실경로 **미실행**
- 트리해시는 `git ls-files` 기준 + `.phase-evidence/`·`.claude/.verification/`·compound-log/HANDOFF·attestations 제외(`TREE_EXCLUDE`)
- merge-guard는 bucket `"pass"`만 인정 — `"skipping"`은 의도적 비증거 거부

## 2. 외부 자료 8건 검증 (실존, NOT FOUND 0)

| 참고 | 실존 | 루트 라이선스 | 비고 |
| --- | --- | --- | --- |
| microsoft/Loopsbench | ✓ (HTTP 200) | MIT | 의존성 단위·단위별 검증(partial→complete)·컨테이너·완료 단위 회귀 보존 — 기술 4요소 일치 |
| arXiv 2608.00267 (LoopsBench 논문) | ✓ (HF Papers 경유) | — | "From Harness Engineering to Loop Engineering…" — arxiv 직접 HTTP는 **미검증** |
| QoderAI/better-harness | ✓ (200) | MIT | defined vs applied vs verified 구분 개념 일치(문구만 상이) |
| harbor-framework/harbor | ✓ (200) | Apache-2.0 | 에이전트 평가 프레임워크, Terminal-Bench-2.0 하니스 |
| harbor-framework/terminal-bench | ✓ (200) | Apache-2.0 | 터미널 작업 연속 벤치마크 |
| langgraph interrupts | ✓ (소스 repo 경유) | — | 체크포인트·interrupt/Command(resume)·승인 패턴 — docs.langchain.com 직접 HTTP **미검증** |
| temporalio/samples-go | ✓ (200) | Apache-2.0 | Temporal Go SDK 샘플 |
| arXiv 2604.25850 (Agentic Harness Engineering) | ✓ (HF Papers 경유) | — | Observability-Driven Automatic Evolution… — 직접 HTTP **미검증** |

## 3. 우선순위 개선안 (중복 제거 반영)

| 순위 | 영역 | 현재 상태 | 개선 | 참고 | 복잡도 |
| --- | --- | --- | --- | --- | --- |
| P1 | 증거 연결 | 해시체인 존재, 시간·비용·정책버전·재시도 미기록 | **구현됨(2026-11-06)**: `record --meta key=value` 반복 옵션 + 테스트 2건(pass 2/2, 기존 스위트 회귀 0) | Better Harness | S |
| P2 | 실제 평가 | 선언 집계만 / 실행 이력=fixture | 평가 계획 고정·UNKNOWN 보존 PoC(fixture 확대) | terminal-bench/harbor | M |
| P3 | 중단·재시도 조건 | 3회만(prose) | 동일-실패 조기중단·회귀 차단 조건 명문화 | LoopsBench regression obligations | S |
| P4 | 호스트 격리·복구 | smoke만, 라이브 미검증 | host-verification-plan 이행 + PR-head CI 증거 | RUNTIME-VALIDATION | M |
| P5 | 그래프-증거 연결 | 선언 검증기 | phase-gate 증거와 대조 링크(UNKNOWN 차단) | LoopsBench | M |
| P6 | 병합·CI | 서버 측 미강제(2026-11-01) | ruleset 적용 확인 + merge-guard 주석 동기화 | — | S |

## 4. 글로벌 라벨
- **미검증**: arxiv·docs.langchain.com 직접 HTTP, CI 그린(4a1714f 이후), 서버 측 브랜치 보호 상태, attestation 저장소 내 실경로, 제안(P2–P6) 성능 효과
- **제한**: 전체 소스 완전 감사 아님 · 테스트 일부 미실행 · 비공개 저장소 링크 접근 필요
