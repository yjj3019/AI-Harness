# Design Case — Document Preservation (문서 보존) (design-omniskill P5)

> 근거: docs/report-editing-cases.json (9건) — required_claims·protected_spans 보존. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 미측정은 `unknown: true` 로만 표기.

## 1. 고정 입력

- 평가 입력: `docs/report-editing-cases.json` (핀 고정 — `docs/eval-set/eval-set.json`, sha256 게이트 적용)

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "preservation", "metric": "", "evidence": "보존 서술 대조 실측 경로" },
  { "item": "preservation::unknown", "unknown": true, "evidence": "비교 대상 없는 지점" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 미기록 (최초 사용 후 기록 예정 — `design-channel-check.js scorecard` 검사 통과 기준).

## 4. After + 재실측

- **상태**: 미기록 (사용 후 기록 예정).

## 5. 재실측 기록

- **상태**: 미기록 (사용 후 기록 예정 — 10회 반복 variants=1 규율 적용 대상).
