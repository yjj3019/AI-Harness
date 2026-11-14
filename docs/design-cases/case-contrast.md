# Design Case — Contrast (명암비) (design-omniskill P5)

> 근거: design-skill-engine-2026-11-14 §3-5 (디자인 토큰 규약) — 명암비 ≥4.5:1 실측. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 미측정은 `unknown: true` 로만 표기.

## 1. 고정 입력

- 기준 문구: 본문·헤딩·배경 색상 정의 (고정 명세 — `docs/eval-set/eval-set.json` 등록 대상)
- 색상 대비 실측: WCAG 대비율 계산 (sRGB 실측값 기반, 소수 1자리)

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "contrast", "metric": "", "evidence": "대비율 실측표 경로" },
  { "item": "contrast::unknown", "unknown": true, "evidence": "색상 정의 없음 등 측정 불가 지점" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 미기록 (최초 사용 후 기록 예정 — `design-channel-check.js scorecard` 검사 통과 기준).

## 4. After + 재실측

- **상태**: 미기록 (사용 후 기록 예정).

## 5. 재실측 기록

- **상태**: 미기록 (사용 후 기록 예정 — 10회 반복 variants=1 규율 적용 대상).
