# Design Case — Aspect Ratio (이전 렌더) (design-omniskill P5)

> 근거: design-skill-engine-2026-11-14 §3-4 (측정 루프) — 케이스는 before/after 스코어카드를 실측으로만 기록한다. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 주관 표현("더 좋아 보임")은 기록할 수 없음 — 미측정은 `unknown: true` 로만 표기.

## 1. 고정 입력

- 렌더 렌더 규격: 동일 페이지 지오메트리 이전 렌더 (참조 raster, `docs/design-cases/` 고정 입력 후보 — `docs/eval-set/eval-set.json` 등록 대상)
- 입력 문서: 평가 입력은 `docs/eval-set/eval-set.json` 핀 고정 대상

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "aspect-ratio", "metric": "", "evidence": "이전/이후 렌더 경로" },
  { "item": "aspect-ratio::unknown", "unknown": true, "evidence": "측정 불가 지점" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 미기록 (최초 사용 후 기록 예정 — `design-channel-check.js scorecard` 검사 통과 기준).

## 4. After + 재실측

- **상태**: 미기록 (사용 후 기록 예정).

## 5. 재실측 기록

- **상태**: 미기록 (사용 후 기록 예정 — 10회 반복 variants=1 규율 적용 대상).
