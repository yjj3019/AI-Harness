# CHANGELOG

이 저장소의 버전 기록. 규칙: `docs/VERSIONING.md`.

## [1.1.1] - 2026-11-14

### 수정
- `scripts/perf-bench.js`: 쓰기 생성기 측정을 임시 복사본(`scripts/` 포함) 기준으로 수정 — 1차 실측에서 `skill-catalog/generate.js`의 `__dirname` 기반 출력으로 원본 `docs/skill-catalog.md` 1건이 덮어쓴 것을 확인, 복원 완료 (정정: `docs/perf-bench-2026-11-14.md`). 측정값은 유효.

## [1.1.0] - 2026-11-14

### 추가 (성능 실측: `docs/perf-bench-2026-11-14.md`)
- 성능 실측 도구 `scripts/perf-bench.js` 신규 추가 (표준 라이브러리 전용, CI 호출과 동일 형태, 쓰기 생성기는 임시 복사본에서 측정).
- 실측 결과: 게이트 6종 병렬 -54% (순차 5,763ms → 2,642ms), node 스폰 1회 ≈2.3s가 게이트 비용 지배, suite(8~9분)는 상위 8개 E2E가 지배 — 개선 가능성 5건 도출.

## [1.0.1] - 2026-11-14

### 변경 (시뮬레이션 12케이스 근거: `docs/versioning-sim-2026-11-14.md`)
- 버전 상승 기록(VERSION/CHANGELOG)은 변경 PR의 피처 커밋에 포함 — 독립 도구성 커밋 생성 금지 (문제점 #1 해결).
- 병렬 브랜치 경합: 같은 버전 예약 중복 허용, 태그는 최저 미사용 버전 (문제점 #2 해결).
- PATCH 예에 "(신규 테스트 추가 포함)" 명시 — "새 검사 추가"(MINOR)와 경계 확정 (문제점 #3 해결).
- 절차에 태그 존재 확인(`git ls-remote --tags origin vX.Y.Z`) 단계 추가 (문제점 #4 해결).

## [1.0.0] - 2026-11-14

### 도입
- 버저닝 체계 신설 (`VERSION` 파일 · `docs/VERSIONING.md` · 이 파일).
- 기준: PATCH=수정/문서/감사 보완 · MINOR=기능 추가 · MAJOR=호환 파괴·헌법 변경 (상세 `docs/VERSIONING.md`).

### 포함된 변경 (이 버전에 접힌 머지)
- 라이선스 전수 실측 기록 (PR #50, `b59fd9d`) — 외부 출처 22종 GitHub API spdx_id 실측(2026-11-14) 표기: external-patterns.md 라이선스 열, autoloop-patterns.md MIT, coding-master/design-master/ppt-master 참조 라이선스 표기, karpathy-skills(null)·senior-agent-skills(부재)·tigerless-labs(NOASSERTION)은 "아이디어만" 명시. skill-audit 29종 clean · CI 9/9 pass.
