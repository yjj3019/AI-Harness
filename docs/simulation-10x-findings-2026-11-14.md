# 10회 시뮬레이션 발견 기록: 기능별 10회 반복 → 문제 도출 → 수정 (2026-11-14)

> 방법 (결정론 규율, deepseek-harness 관점 채택 · 아이디어만): 기능당 **10회 반복 실행**, 회차마다
> exit code / stdout-sha1(12) / stderr-sha1(12) 수집, **variants=1** (전 회차 동일) 통과 기준.
> 양성 대조(positive control)는 새 패턴마다 필수 (skill-audit 7형태, design-channel 4테스트).

## 1. 기능별 10회 시뮬레이션 결과

| 기능 | 범위 | 10회 결과 | variants | 판정 |
| --- | --- | --- | --- | --- |
| skill-audit (`scripts/skill-audit.js`) | 스킬 29종 정적 감사 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| secret-scan | 비밀 스캔 (28→29 스킬 포함) | exit-set 1개 (일관) | 1 | ✅ 안정 |
| package-lint | 패키지 규율 린트 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| handoff-lint | HANDOFF.md drift 검사 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| tree-exclude-check | 트리 제외 패턴 검사 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| dashboard-status | status.json 생성기 | exit-set 1개 (일관) | 1 | ✅ 안정 — 단 **Finding #1** (drift) |
| skill-catalog/generate | 스킬 카탈로그 생성기 | exit-set 1개 (일관) | 1 | ✅ 안정 — 단 **Finding #1** (스탬프) |
| wf/test-summary 사용 | 테스트 요약 워크플로우 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| wf/phase-gate 사용 | 페이즈 게이트 사용 경로 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| memory-guard (빈 스토어) | 빈 distilled store 검토 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| skills 스캔 10회 | 스킬 트리 반복 스캔 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| design-channel html 검사 | `design-channel-check.js html` | exit-set 1개 (일관) | 1 | ✅ 안정 (양성 대조 4종 포함) |
| design-channel code 검사 | `design-channel-check.js code scripts` (22파일) | exit-set 1개 (일관) | 1 | ✅ 안정 |
| design-channel evidence 검사 | evidence 계약 검증 | exit-set 1개 (일관) | 1 | ✅ 안정 |
| design-channel 양성 대조 | 테스트 4종 | tests 4/4 통과 | 1 | ✅ 안정 |
| **전체 스위트 10회** (현행 커밋 29b8991 + 미커밋) | `node --test tests/` (386 테스트) | **exit=1 고정 · 동일 테스트 1건 fail · 10/10 동일 예상** | **1 (단일 원인)** | ⚠️ **Finding #2 → 수정** |

## 2. Finding #1 — 생성기 drift (dashboard-status / skill-catalog)

- **현상**: `dashboard/status.json` 커밋 상태(HEAD 2항목)와 생성기 산출(3항목, `evidence-baseline` "Evidence chain verification baseline" 추가) 불일치(+6행). `docs/skill-catalog.md` 스탬프 "Generated: 2026-11-11"이 같은 날 재생성 시 현재 날짜(2026-11-14)로 갱신.
- **판정**: 생성기 버그 아님 (동일 입력→동일 출력 결정론, 10회 variants=1). **커밋 시 재생성 후 정렬**이 유지 규율.
- **수정**: 커밋 직전 `node scripts/skill-catalog/generate.js` + `node scripts/dashboard-status.js` 재생성 → 커밋 상태 === 생성기 상태 정렬. cross-day re-dirty(스탬프)는 문서화된 성질로 기록 (재생성 시점 날짜 스탬프 고정).

## 3. Finding #2 — 스위트 fail 1/386: inventory 테스트의 WSL bash 스텁 트랩 (환경, 제품 버그 아님)

- **현상**: 전체 스위트 386테스트 중 정확히 1건 실패: `inventory guard counts files and rejects a shrunken suite` (`tests/test-inventory.test.js:57`). fail 1건 외 375 pass · 10 skip · **10회 반복 시 동일 테스트 동일 fail 예상 (variants=1)** — flake 아님.
- **원인 (실측 증거)**:
  - 스위트 내부의 bash 탐지(`tests/helpers/bash-probe.js`)는 `bash -c "exit 0"`로 판별 → Windows PATH의 `bash` = **WSL 런처 스텁** (`C:\Windows\system32\bash.exe`)가 exit 0 반환 → skip되지 않고 테스트가 실제 실행됨.
  - 실제 실행 시 테스트는 **Windows 경로 인자**(`C:\Users\...\inventory-XXX\tests\run-all.sh`)로 bash를 호출 → WSL 스텁이 인자의 백슬래시를 이스케이프로 해석해 `C:UsersuserAppDataLocalTempprobe-runall-test.sh`로 변조 → `No such file or directory` **status 127** → 두 분기(성공 분기 status 2, 완료 분기 status 0) 모두 도달 불가 → 항상 fail.
  - 동일 호스트 실측: `PROBE -c: {"status":0}` / `SCRIPT RUN: {"status":127,"err":"/bin/bash: C:UsersuserAppDataLocalTempprobe-runall-test.sh: No such file or directory"}` — 스텁 판별과 실제 사용 형태가 모순 → **탐지 방식이 실제 사용 형태(경로 인자 스폰)와 불일치**가 근본 원인.
- **Fix A** (`tests/helpers/bash-probe.js`): 임시 스크립트 파일을 만들고 **경로 인자로** 실행해 판별 (실제 사용 형태와 동일) → WSL 스텁 호스트는 clean skip (11 skip으로 전환), 네이티브 bash(CI Ubuntu)는 통과 유지.

## 4. Finding #3 — 잠복 CI 결함: fixture 누락 (Ubuntu에서 확정 red)

- **현상**: `tests/run-all.sh` 55-56행에 신규 스테이지 `node scripts/design-channel-check.js code scripts` 추가 (P6) — 그러나 `tests/test-inventory.test.js`의 `PRODUCTION_FILES`(fixture에 복사되는 운용 파일 목록)에 `scripts/design-channel-check.js` **미포함**.
- **판정**: bash가 정상인 호스트(Ubuntu CI)에서는 성공 분기(floor 검사) 통과 후 **완료 분기에서 MODULE_NOT_FOUND** → `ALL CHECKS PASSED` 불가 → **머지 시 CI red 확정**. 이번 커밋에 그대로 올리면 18:00 재시도 머지가 깨지는 진짜 결함 (Windows 호스트에서는 127 트랩이 완료 분기 이전에 막혀 가려져 있음).
- **Fix B** (`tests/test-inventory.test.js`): `PRODUCTION_FILES`에 `"scripts/design-channel-check.js"` 추가 → fixture 완료 분기 성립.
- **검증**: run-all.sh가 spawn하는 모든 파일 리스트 ⊆ PRODUCTION_FILES 교차검증 스크립트 실행 (본 문서 §5).

## 5. 수정 목록

| Fix | 파일 | 내용 | 검증 |
| --- | --- | --- | --- |
| A | `tests/helpers/bash-probe.js` | 탐지를 경로 인자 스폰(임시 스크립트)으로 변경 — WSL 스텁 호스트는 skip | 단일 테스트 재실행 → skipped 1, exit 0 |
| B | `tests/test-inventory.test.js` | `PRODUCTION_FILES`에 `scripts/design-channel-check.js` 추가 | 교차검증 스크립트: run-all.sh 소비 파일 전부 포함 확인 |
| C | `skills/design-omniskill/SKILL.md` | hermes-agent 개선 이력 규칙 추가 (§6 외부 매핑 실반영): 사용 후 스코어카드 차이가 규칙·토큰과 어긋나면 design-cases 기록 + 규칙 반영 | skill-audit 29 clean 유지 |
| D | `docs/design-cases/README.md` (P5 골격) | 사후 6케이스 첫 사례 기록 슬롯 확정 | 사후 문서 링크 확인 |

## 6. 사후 검증 (실측 완료)

- [x] 스위트 10회 완주 로그: **10/10 동일 fail (variants=1) 확정** — log `_tmp_suite10.log` 10행 전부 `exit=1 · fail 1 (동일 테스트)`
- [x] Fix A/B 적용 후 bash-probe 직접 측정: `bashWorks(path-arg)=false` → 단일 테스트 `skipped 1, fail 0, exit 0`
- [x] 교차검증: run-all.sh 완료 분기 spawn 대상 28파일 전부 `PRODUCTION_FILES` 포함 (**CLOSURE OK**)
- [x] 생성기 재생성 → status.json HEAD 2항목 → 3항목 정렬, skill-catalog 스탬프 2026-11-14 (커밋에 포함)
- [x] 사후 스위트 반복 3회차 (PID 26468, `_tmp_suite3.log`) → **3/3 exit=0 · fail 0 · pass 377 · skip 13 · variants=1 확정**
- [x] 커밋/푸시 후 원격 head 확인
