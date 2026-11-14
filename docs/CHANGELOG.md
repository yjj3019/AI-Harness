# CHANGELOG

이 저장소의 버전 기록. 규칙: `docs/VERSIONING.md`.

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
