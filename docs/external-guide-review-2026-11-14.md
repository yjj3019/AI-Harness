# 외부 개선 제안 가이드 정밀 분석 반영 검토 — 2026-11-14 (v1.2.1)

- **분석 기준 (실측)**: main `4afa4e4` (2026-11-14, v1.2.0, PR #55 merge). 대조 시점 CI run `43604376652` — 9 job 전원 pass (node22 24s·node24 39s·isol 7s·portability macos 1m7s·windows 4m40s·self-qa 10s·toolbroker 53s·15s·29s).
- **성격**: 외부 가이드(총 15절: 2026-11-08 손님 가이드 + 프롬프트·디자인·모션 자료 + 24개·9개 저장소 조사 + 자기개선·디자인/코딩 제안, 2026-11-14 추가)의 제안 항목을 현재 저장소와 **전수 대조한 반영 검토서**. 이 문서 자체는 실측 보고이며, 미반영(제안) 항목은 제안 상태를 유지한다. 검증하지 않은 수치는 UNKNOWN으로 표기한다.

## 1. 절별 반영 상태 요약

| 절 | 제안 핵심 | 실측 대조 결과 | 반영 상태 |
| --- | --- | --- | --- |
| 1–2 | Evidence-Driven Runtime·Router/Worker·자기개선 루프·스킬 측정·외부 효과 차단 | phase-gate·task-graph·paired-evaluation·skill-eval·ToolBroker 존재. 장기 실행 데몬·실제 호스트 격리 실측은 없음 | P0 일부 반영 / P1+ **제안 유지 (미반영)** |
| 3–7 | 실행 아키텍처·P0~P3 우선순위·시나리오 H-01~H-10·측정 지표·3-PR 제안 | run-all.sh 게이트 8종·CI 9 job·test-summary·strict bound tree·merge-guard(권고) 실측 | P0 반영 / PR-A~C **제안 유지** |
| 8 | Claude Code 전달용 작업 의뢰문 | 지역 지시와 대조 — 문서 반영 완료 | **반영** |
| 9–10 | 근거 출처·기록 상태 | 근거 목록 대조 — 채택된 아이디어는 기존 문서에 출처 기재 | 기존 반영 |
| 11 | 프롬프트 20종·DeepSeek Super-Agent·RSI-Dojo·개발팀 프롬프트·Skills·모션 제작 | document-master·design-master·evidence-preserving-editor·super-agent-architecture-notes·document-job 존재. 실제 모델 A/B·토큰 절감 실측 없음 | 아이디어만 채택, 외부 복사 0건 (12·13·14절 source-adoption 장부) |
| 12 | 24개 저장소 전수 표·반영 후보 A~H·요청문 | 후보 A(HANDOFF)·B(usage-accounting)·C~H → 대조 결과 아래 2절 | A·B 반영 확인 / C~H **제안 유지** |
| 13 | 보안 감사 coverage·메모리 출처·브라우저 증거·9개 저장소 | security-master·memory-guard·browser-evidence 존재, coverage ledger·레지스터 계약은 제안 | 기존 기능 반영 / 신규 **제안 유지** |
| 14 | 자기개선·소스 채택 장부·Draft PR #49 | `scripts/source-adoption-check.js`·`docs/source-adoption-2026-11-14.json`·test 6건 반영 (PR #50/#51, v1.0.0) | **반영** (자기개선 루프 자동화는 제안 유지) |
| 15 | Complexity-aware Design × Coding Loop | coding-master·design-master·design-evidence-harness·paired-evaluation 존재 | 기존 기능 반영 / 신규 도구 도입 **제안 유지** |

## 2. P0 후보 A~H 실측 대조 (13.3 표의 A~H)

| 후보 | 가이드 제안 | 실측 확인 | 반영 |
| --- | --- | --- | --- |
| A | HANDOFF와 PHASES의 Phase 수 충돌 수정 | HANDOFF.md 19행(2026-11-11) "evidence-baseline 1개 정의 + 미완료" — PHASES.md 헤딩 4개(템플릿 1·예시 2·정의 1)와 정합, "0개" 문구 없음 (실측) | **이미 반영** |
| B | usage-accounting 입력 신뢰 범위 명확화 | docs/usage-accounting.md 16행 "Allowed string values ... are not scrubbed; duplicate-ID errors can echo the ..." (2026-11-11) | **이미 반영** |
| C | session-peer식 인계 상태 스키마 | task-graph-evidence·attestation-outcome·run-integrity 테스트 존재, 인계 상태 선언 검사 | 기존 기능 반영 / 신규 **제안 유지** |
| D | 브라우저 증거 프로토콜 | browser-evidence·design-evidence-harness 재사용 지침 존재 (선택형) | 기존 기능 반영 / 신규 **제안 유지** |
| E | 실패-가설-후보-평가 기록 | paired-evaluation·evaluation-accounting 존재 — 제출 선언 비교만 (실측) | 기존 기능 반영 / 자동 채택 **제안 유지** |
| F | 스킬 로딩·사실 보존 평가 | skill-eval·skill-audit 존재 — 실제 호스트 트리거 실측 없음 | 기존 기능 반영 / 신규 **제안 유지** |
| G | 브라우저/문서 변환 결과 일관성 | document-job manifest 검사만 (설계 제약) | 기존 기능 반영 |
| H | 결정론적 상태 보기 | dashboard/status.json 존재 (1.2.0 증분 갱신 포함) | **이미 반영** |

## 3. 검증 시나리오 H-01~H-10 대조

| 시나리오 | 대응 (실측) |
| --- | --- |
| H-01 존재하지 않는 Phase 완료 거부 | phase-gate.js check/verify 거부 경로 + attestation-output/phase-gate.test.js (통과) |
| H-02 테스트 0건·전체 skip 거부 | test-inventory·test-summary·strict tests (통과) |
| H-04~H-05 멱등·UNKNOWN | attestation-race·runtime-recovery·output-discipline·tree-replay (통과, fixture) |
| H-06~H-10 | hooks·bound-tree·merge-guard(권고)·paired-evaluation·context-contract — 존재하며 실측 실행됨. 운영 호스트 실측은 미실행 (UNKNOWN) |

## 4. 미반영 (제안 유지) — 실행 승인 대기

- Router/Worker 최소 PoC (P1-A), 스킬 trigger 3~5회 평가 (P1-B), 재현 기반 자기개선 자동화 (P1-C), 컨텍스트·토큰 실측 (P1-D), 콘텐츠 Task Profile (P2), 브라우저/영상 제작 평가, guardrail·memory-engineering·coverage ledger 신규 도입, 외부 프레임워크(Remotion·firecrawl 등) 도입, 24개·9개 저장소 코드 채택 0건 유지 (source-adoption 장부 기록).
- 가이드의 성능·정확도·비용 수치 전부 이 저장소 실측값 아님 — 인용 금지 (UNKNOWN 유지).

## 5. 이 저장소에 이미 반영된 근거 (변경 이력)

- phase-gate·CI 9 job·merge-guard(권고)·isolations·ToolBroker·usage-accounting·memory-guard·skill-audit·evaluation 제품군·source-adoption 장부·성능 실측 도구·eol 속성·증분 갱신·버저닝 규율 (v1.0.0~1.2.0, 전부 PR로 병합, CI 9/9 실측).
- 미검증: 운영 호스트(Claude/Codex) 권한 강제, 실제 모델 A/B, 토큰 절감률, 운영 격리 인증, 서버 측 병합 차단 (2026-11-01 GET 403 실측) — 전부 UNKNOWN.

## 6. 요약

- 2026-11-14 기준 **P0 전수 항목은 이미 반영**되어 있으며, 이번 v1.2.1은 그 대조 결과와 상태를 반영 기록으로 남긴다. 나머지는 제안 상태 유지 — 승인 결정 대기.
