# 성능 실측 보고서 (2026-11-14) — AI-Harness 게이트·CI 수트

**도구**: `scripts/perf-bench.js` (신규 작성, 표준 라이브러리만 사용. 측정 전용, 쓰기 부작용 생성기 2종은 임시 복사본에서 측정 — 원본 트리 불변).
**환경 (실측)**: Windows 11, Node v26.13.0, Intel i7-14700, bash = `C:\Program Files\Git\bin\bash.exe`, jq **부재** (해당 단계는 측정에서 제외). 원시 기록: `docs/practice/perf-bench-2026-11-14/perf-bench-raw.json`, 테스트별 프로파일: `docs/practice/perf-bench-2026-11-14/node-test-spec.log`.

## 1. 측정 결과 (wall time, ms — warmup 1회 후 min/median)

| 단계 (tests/run-all.sh 호출과 동일 형태) | median | min | 비고 |
|---|---|---|---|
| 참조: node 콜드스타트 (`node -e ""`) | 2,287 | 1,692 | 프로세스 1회 스폰 비용 |
| 참조: bash 콜드스타트 (`bash -c ":"`) | 533 | 473 | |
| 참조: 원시 스캔 (skills/docs/scripts/tests/.claude/dashboard 479파일·8.8MB 순회) | 1,649 | 1,378 | 파일 I/O+스폰 혼합 |
| 참조: coreutils 1회 (ls / head / grep 각각) | 1,593 / 1,550 / 1,964 | — | Git Bash 도구 1회 ≈ 1.5~2s |
| syntax: node --check (5프로세스) | 6,599 | 6,308 | |
| syntax: bash -n (7파일) | 3,966 | 3,039 | |
| gate: skill-audit | 1,344 | 1,217 | exit 0 |
| gate: secret-scan | 1,597 | 1,352 | exit 0 |
| gate: tree-exclude | 1,269 | 1,123 | exit 0 |
| gate: handoff-lint | 1,441 | 1,319 | exit 0 |
| gate: package-lint | 1,380 | 1,240 | exit 0 |
| gate: design-channel | 1,418 | 1,266 | exit 0 |
| gate: agents-lint (bash) | 16,416 | 15,126 | **exit 1 — 로컬 요인 (아래 P3)** |
| gate: hooks-test (bash) | 664 | 644 | **exit 1 — 로컬 요인 (아래 P3)** |
| suite: phase-gate (`node --test` 51파일) | 541,267 | 491,752 | **수트 전체의 압도적 지배 (≥92%)** |
| 생성기: skill-catalog generate (임시 복사본) | 1,535 | 1,511 | exit 0 |
| 생성기: dashboard-status (임시 복사본) | 1,510 | 1,482 | exit 0 |
| 실험: 핵심 게이트 6종 **병렬** 동시 실행 | **2,642** | 2,617 | 순차 합계 5,763 → **-54%** |

수트 내 테스트 단위 (spec 프로파일 실측, 377개): 상위 8개 테스트 합 ≈ 486s ≈ 수트 전체와 동급 (120,162 / 81,209 / 67,584 / 60,426 / 52,138 / 43,052 / 33,000 / 28,433ms). 벤치 외 대조 (원격 실측 2026-11-14): 동일 트리의 CI ubuntu 수트는 27~44s (run 43583100216).

## 2. 관찰 — 병목 실측

- **P1 — 프로세스 스폰 비용이 게이트 순수 작업보다 큼**: 빈 node 2.3s, 빈 bash 0.5s, coreutils 1.5~2s인 반면, 게이트는 1.2~1.6s → 게이트 로직 자체는 수백 ms 미만 (스캔 1.6s 참조와 동급). 로컬 개별 비용 ≈ "스폰 + 파일 순회"가 거의 전부.
- **P2 — suite (node --test) 8~9분이 수트의 ≥92%** (541,267ms median; 순차 단계 합계 36,096ms의 ~15배). 무거운 E2E(phase-gate 재실현·트리 스냅샷·임시 저장소) 다수가 개별 30~120s (실측 상위 8개 ≈ 486s).
- **P3 — 로컬 전용 오탐 2건 (성능 아님, 측정 시 발견)**: agents-lint exit 1 — 원인 실측: `.claude/agents/*.md` 첫 줄 바이트 `2D 2D 2D 0D 0A`(CRLF, .gitattributes는 `*.md` 미지정)로 `head -n 1` = `"---\r"` ≠ `"---"` + jq 부재. CI는 동일 트리 9/9 pass (원격 실측) → 저장소 결함이 아니라 로컬 체크아웃·환경 요인.
- **P4 — 생성기 2종도 스폰 지배**: 1.5s 중 스폰+스캔이 대부분 (입력 479파일 순회 1.6s 참조).

## 3. 개선 가능성 5건 (근거: 위 실측 — 검증 없이 주장 없음)

1. **게이트 단계 병렬화 (P1 근거)**: 6게이트 순차 5,763ms → 동시 실행 **2,642ms 실측 (-54%)**. 로컬 수트(또는 run-all 게이트 블록)를 병렬 배치로 → 예상 절감 ≈ 3s/회 (실측 병렬값 기준). CI는 이미 job 단위 병렬이라 적용 대상은 로컬.
2. **무거운 E2E 분리 진입점 (P2 근거)**: 상위 8개 테스트 ≈ 수트 전체 (실측) → 빠른 로컬 경로(`node --test -g` 필터 또는 경량/무거움 분리) 제공 시 로컬 수트 예상 ≈ 8분 → 게이트 블록 수준(수 실측 값 2.6~36s) 으로. CI는 무거운 셋을 그대로 유지.
3. **로컬 오탑 제거 (P3 근거)**: `.gitattributes`에 `.claude/agents/*.md`(및 frontmatter 대상) `text eol=lf` 추가 → CRLF 오탑 원인(0D 0A 실측) 제거. jq는 run-all 전제에 이미 명시 — 로컬 설치 안내만 해당.
4. **생성기 증분화 (P4 근거)**: 소스(mtime) 대비 미변경 시 재생성 스킵 → 1.5s/회 → 스킵 시 ≈ 0.3s 이하 (스폰 2.3s 이하 계수와 동급. 스킵 경로는 mtime 비교 1회만 실행).
5. **실측 기준선 유지 (P1 근거)**: `scripts/perf-bench.js` 유지 + 이 보고서를 기준선으로, 변경 시 재실측·비교.

> 적용 범위: 보고서+실측 도구는 별도 판정 대기 (신규 스크립트 추가 = 버전 규율상 MINOR). 원본 트리에는 측정 이외 변경 없음 (git status로 실측 확인).
