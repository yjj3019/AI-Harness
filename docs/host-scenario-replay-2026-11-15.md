# H-01~H-10 시나리오 재주입 실측 (2026-11-15)

> harness-reinforcement-plan **B3** 산출물 — 외부 가이드(`docs/external-guide-review-2026-11-14.md` §3) 시나리오별
> **운영 호스트(本机 Windows, node v26.13.0)에서 1회씩 재현**한 실측 기록.
> 판정 3종: **재현 성공** (기대 거부가 실제로 거부함을 실측) / **재현 실패** (거부되지 않음) / **UNKNOWN** (이 호스트에서 실측 불가 — 이유 명시).

| ID | 시나리오 | 실측 명령·입력 | 결과 (2026-11-15 실측) | 판정 |
|---|---|---|---|---|
| H-01 | 존재하지 않는 Phase 완료 거부 | `node .claude/workflows/phase-gate.js check no-such-phase-xyz` | exit 1 · `ERROR: invalid phase 'no-such-phase-xyz'. Valid phases: evidence-baseline` | 재현 성공 (거부 확인) |
| H-02 | 테스트 0건·전체 skip 거부 | `inspectTestSummary` (`.claude/workflows/test-summary.js` 라이브러리 — CLI 없음) 4입력: zero-tests / all-skipped / "no tests ran" 문구 / 유효 3pass | ok=false ×3 (`zero…or all-skipped spec tests` · `test output states zero tests`) + 양성 대조 유효 입력 ok=true · run-all test-inventory `test files: 46 (floor 15)` 실측 | 재현 성공 (거부 확인) |
| H-03 | (외부 가이드에 ID만 존재) | — | 저장소 내 H-03 정의·테스트 없음 (external-guide-review §3 표는 H-02 → H-04~H-05로 도약, 실측) | UNKNOWN (대상 미정의) |
| H-04 | 멱등 — attestation-race·runtime-recovery | `node --test tests/attestation-race.test.js tests/runtime-recovery.test.js` (5파일 통합 실행의 일부) | 5파일 통합 **34/34 pass, fail 0, exit 0** (duration 168s) — attestation-race·runtime-recovery 포함 | 재현 성공 |
| H-05 | 멱등·UNKNOWN — output-discipline·tree-replay | `node --test tests/output-discipline.test.js tests/attestation-tree-replay.test.js` (동일 통합 실행) | 동일 34/34 pass, fail 0, exit 0 | 재현 성공 |
| H-06 | hooks | `bash tests/hooks.test.sh` (run-all 게이트 블록, 로컬 전체 실행) | `hooks: 306/306 passed` — 로컬 run-all ALL CHECKS PASSED (exit 0, 2026-11-15) | 재현 성공 |
| H-07 | bound-tree — strict-bound-tree | `node --test tests/strict-bound-tree.test.js` (동일 통합 실행) | 동일 34/34 pass, fail 0, exit 0 | 재현 성공 |
| H-08 | merge-guard (권고) | ① 라이브 `node scripts/merge-guard.js 61` (이미 병합된 PR #61) ② `--checks-file <임의 JSON> --expected-head <sha>` | ① exit 2 `NOT VERIFIED: PR is not open or head/base/draft identity is unavailable` ② exit 2 `captured check files are untrusted and are not accepted as readiness evidence` | 재현 성공 (모드 2종 모두 거부 확인) |
| H-09 | paired-evaluation | — | 라이브 모델 2종 비교 필요 — 본 호스트에서 실행 불가 (모델 호출 권한·비용) | UNKNOWN (라이브 모델 필요) |
| H-10 | context-contract | ① `node scripts/context-contract.js verify evidence-baseline` ② `verify no-such-phase-xyz` ③ 무인자 ④ throwaway PHASE_GATE_ROOT 픽스처 (유효·변조·누락 checkpoint) | ①② `{"ok":true,"enabled":false}` exit 0 (저장소에 등록된 계약 0건 — `docs/task-contracts/` README만 존재, 실측 → 가드 inactive) ③ exit 1 usage ④ 유효→`ok:true,enabled:true,constraint_count:1` · 변조→`ok:false "checkpoint altered, dropped or elevated a trusted constraint"` · 누락→`ok:false "checkpoint lost or added a required constraint"` | 재현 성공 (enabled 3경로 + inactive 경로) |

## 요약 (실측 기준)

- 재현 성공: H-01·H-02·H-04·H-05·H-06·H-07·H-08·H-10 = **8건**
- 재현 실패: 0건
- UNKNOWN: H-03 (대상 미정의) · H-09 (라이브 모델 필요) = **2건** — 이유 개별 명시 (규율: 미수집·미실측은 UNKNOWN으로만 기록)

## 부록: 재현 환경

- 호스트: Windows 10.0.26300 (DESKTOP-TG975V0) · node v26.13.0 · Git Bash (Hooks)
- 시점: 2026-11-15T00:45~02:15 UTC (개별 행은 위 명령의 실제 실행 시각; H-06은 02:13 UTC 종료의 로컬 전체 run-all에서)
- H-02·H-10 ④의 픽스처는 `$TMP` 일회용 디렉터리에서 생성→검증→삭제 (저장소 쓰기 없음)
