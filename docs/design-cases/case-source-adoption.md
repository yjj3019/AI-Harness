# Design Case — Source Adoption (소스 채택) (design-omniskill P5)

> 근거: docs/source-adoption-2026-11-14.json (6건, 라이선스 실측 완료) — 채택 소스의 출처·라이선스·방식 기록. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 미측정은 `unknown: true` 로만 표기.

## 1. 고정 입력

- 평가 입력: `docs/source-adoption-2026-11-14.json` (장부 — 사용 예정 소스 6건의 출처·라이선스 실측)
- 라이선스 실측: `scripts/source-adoption-check.js` (장부 정합 + 코드 참조 스캔 게이트)

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "source-adoption", "metric": "", "evidence": "장부·스캔 실측 기록 경로" },
  { "item": "source-adoption::unknown", "unknown": true, "evidence": "실측 불가 지점 (UNKNOWN 명시)" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 미기록 (최초 사용 후 기록 예정 — `design-channel-check.js scorecard` 검사 통과 기준).

## 4. After + 재실측

- **상태**: 미기록 (사용 후 기록 예정).

## 5. 재실측 기록

- **상태**: 미기록 (사용 후 기록 예정 — 10회 반복 variants=1 규율 적용 대상).
