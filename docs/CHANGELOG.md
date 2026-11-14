# CHANGELOG

이 저장소의 버전 기록. 규칙: `docs/VERSIONING.md`.

## [1.4.0] - 2026-11-15

### 추가 (새 검사: 코드 내 미등록 외부 참조 자동 스캔 — 근거: 로컬 실측)
- **애매/미검증 지점 폐쇄**: `copied_files=[]` 선언 외 코드 내 github.com 참조는 기계 검증 수단이 없었다 → `scripts/source-adoption-check.js`에 `scanCodeReferences(manifest, root)` 추가 — 코드 디렉터리(`scripts`·`tests`·`.claude`·`.codex`·`.agents`)를 재귀 스캔해 github.com 참조를 전수 추출, 허용 대상(① 자기 저장소 `github.com/yjj3019/*` ② 장부 등록 source/license/credit ③ 테스트 픽스처 `a/b`·`unrelated/thing`) 외 미등록 외부 참조 발견 시 파일+URL 보고 + exit 1. docs/는 출처 기록 담당 — 스캔 제외.
- CLI 출력에 실측 문구 추가: `unregistered code references: 0` — 실제 저장소 전수 스캔 결과 **미등록 외부 참조 0건 실측** (기존 실측: 코드 참조 = 자기 저장소 + 픽스처 2건뿐).
- `tests/source-adoption-check.test.js`: 스캔 양성 대조 2건 추가 (허용 참조 통과 · 미등록 `evil/thing` 거부 — 픽스처 문자열은 리터럴 회피 동적 조합) — 로컬 tests **8/8 pass** / fail 0 실측.

## [1.3.1] - 2026-11-15

### 수정 (라이선스 감사 보완 — GitHub API 전수 대조 실측, 문제 0건)
- **장부 6건 실측 완료** (2026-11-15, `GET repos/{r}/license` HTTP 200 전원): cloudflare/security-audit-skill **MIT** · shadcn/improve **MIT** · walkinglabs/learn-harness-engineering **MIT** · anthropics/knowledge-work-plugins **Apache-2.0** · yang0/handraw-style **CUSTOM-ATTRIBUTION** ("MIT License (with Attribution Requirement)" 본문 1,606자 실측 — CUSTOM-ATTRIBUTION 분류 정합) · pbakaus/impeccable **Apache-2.0** — 장부 기존 라벨과 **전수 일치, 문제 0건**.
- `scripts/source-adoption-check.js` (새 로직): `verified_spdx` 필수 필드 + **라벨-실측 일치 강제** 검사 추가, CLI 정확성 문구 갱신 ("verified_spdx cross-checked with GitHub API on 2026-11-15").
- `docs/source-adoption-2026-11-14.json`: 6건 `verified_spdx` 기록 · `tests/source-adoption-check.test.js` 강화 (실측 대조·불일치 거부) — 로컬 tests 6/6 pass (실측).
- 외부 패키지 의존성 0건 실측 (require = `node:` 내장 331건 + 상대경로뿐, npm/package.json 0) — 재확인 완료.

## [1.3.0] - 2026-11-14

### 추가 (source-adoption 장부 validator 정식 반영 — 근거: 로컬 실측)
- `scripts/source-adoption-check.js` (read-only 소스 채택 선언 검증기) · `docs/source-adoption-2026-11-14.json` (라이선스 검사 완료 참조 소스 6건 장부) · `tests/source-adoption-check.test.js` (6 test) — Draft PR #49 내용을 main 반영. 로컬 실측: tests **6/6 pass** / fail 0, CLI 출력 "6 declarations consistent; license authenticity NOT verified" (라이선스 진위는 도구가 검증하지 않음 — 독립 확인 필요).
- `docs/external-guide-review-2026-11-14.md` 14절 "제안 (draft PR #49) 유지" → **반영** 재교정 — v1.2.2 교정과 최종 정합.

## [1.2.2] - 2026-11-14

### 문서 (검토서의 source-adoption "반영" 표기 오류 교정 — 실측 근거)
- `docs/external-guide-review-2026-11-14.md` 14절이 `scripts/source-adoption-check.js`·`docs/source-adoption-2026-11-14.json`·test를 "반영 (PR #50/#51, v1.0.0)"으로 기록했으나, **실측상 세 파일은 Draft PR #49(OPEN, 미병합, 브랜치 `audit/source-adoption-ledger-20261114`)에만 존재**하고 main에는 없다 (`git ls-files` 0건, main skill-audit.js adoption 문자열 0건, PR #50/#51은 AI 모델 경쟁 주제 — 2026-11-14 실측).
- 장부 기록 문서(`docs/external-patterns-14repo-2026-11-14.md`·`docs/maturity/CONTEXT-ADOPTION-2026-10-26.md`)는 main 반영 — 표·미반영 목록·요약을 실측 사실로 교정하고, validator는 제안(미병합) 상태로 재분류.

## [1.2.1] - 2026-11-14

### 문서 (외부 개선 제안 가이드 정밀 분석 반영 — 근거: `docs/external-guide-review-2026-11-14.md`)
- 외부 가이드(2026-11-08 작성 15절 + 추가 조사)의 P0 후보를 현재 main `4afa4e4`(v1.2.0)와 전수 대조 — **P0 3건(HANDOFF 정합성·usage-accounting 명확화·CI 9/9) 이미 반영 확인**, P1+은 미반영 상태로 제안 유지.
- `docs/HANDOFF.md`에 2026-11-14 상태(PR #55 merge·v1.2.0·CI 9/9·검토 반영) 1줄 추가.
- docs/usage-accounting.md 16행 "Allowed string values ... are not scrubbed" (2026-11-11) 실측 — 가이드 P0 후보 B의 명확화가 본문에 이미 존재함을 검토서에 기록.

## [1.2.0] - 2026-11-14

### 변경 (성능 실측 5건 적용 — 근거: `docs/perf-bench-2026-11-14.md` 실측)
- `tests/run-all.sh`: 게이트 블록 **병렬 실행**(순서 보존 출력) + `--fast`(기본 전체 수트 유지, 무거운 E2E 생략 진입점) 추가 (개선 1·2).
- `.gitattributes`: `.claude/agents/*.md`·`.claude/commands/*.md` `text eol=lf` 추가 (개선 3 — 로컬 CRLF 오탐 제거, 블롭은 이미 LF 실측).
- `scripts/skill-catalog/generate.js`·`scripts/dashboard-status.js`: 소스 대비 mtime 미변경 시 재생성 스킵 (`--force`로 강제) (개선 4).
- `scripts/perf-bench.js`: `--gates-only` 추가 — 기준 재실측 경로 (개선 5).

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
