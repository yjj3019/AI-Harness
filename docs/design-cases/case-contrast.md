# Design Case — Contrast (명암비) (design-omniskill P5)

> 근거: design-skill-engine-2026-11-14 §3-5 (디자인 토큰 규약) — 명암비 ≥4.5:1 실측. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 미측정은 `unknown: true` + `reason` 로만 표기 (v1.7.0 C3 계약).

## 1. 고정 입력

- 기준 문구: 본문·헤딩·배경 색상 정의 (고정 명세 — `docs/eval-set/eval-set.json` 등록 대상)
- 색상 대비 실측: WCAG 대비율 계산 (sRGB 실측값 기반, 소수 1자리)

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "contrast", "metric": "", "evidence": "대비율 실측표 경로" },
  { "item": "contrast::unknown", "unknown": true, "reason": "미측정 — 최초 사용 후 실측/사유 기록 예정", "evidence": "색상 정의 없음 등 측정 불가 지점" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 사전 측정 없음 (최초 사용 — v1.7.0 C1 실사용 이전에는 측정 기록 0건).

## 4. After + 재실측

- **상태**: 기록 완료 (v1.7.0 C1 실사용, 2026-11-15) — 대상 `docs/practice/design-omniskill-v1.7.0-2026-11-15/onepager.html` 렌더.
- WCAG 대비율 (sRGB #값, node 상대휘도 공식 계산 실측):

| 짝 | 값 | AA 4.5:1 |
|---|---|---|
| 본문 #19191f / #ffffff | 17.50:1 | 통과 |
| 본문 #19191f / 카드 #eef2ff | 15.65:1 | 통과 |
| weak #4b4b57 / #ffffff | 8.60:1 | 통과 |
| weak #4b4b57 / 카드 #eef2ff | 7.69:1 | 통과 (가장 약한 weak) |
| primary #1d4ed8 / #ffffff | 6.70:1 | 통과 |
| primary #1d4ed8 / 카드 #eef2ff | 5.99:1 | 통과 (가장 약한 accent) |
| #ffffff / primary #1d4ed8 | 6.70:1 | 통과 |
| #19191f / 테두리 #d9d9e3 | 12.49:1 | 통과 (테두리) |

## 5. 재실측 기록

- **상태**: 최초 측정 기록 (2026-11-15, v1.7.0 C1). 방법: WCAG 상대휘도 공식 node 계산 (입력: sRGB hex 상수) · 렌더: `render-1440.png` sha256 `0d0a32c9…579d6` · `render-1920.png` sha256 `714aef15…76a32` (입력 `onepager.html` sha256 `696ecd00…d08`) · 스코어카드: `scorecard.json` contrast 행 3종 (전부 numeric metric, `design-channel-check.js scorecard` ok). 동일 입력 재계산 시 동일 값 (결정론 계산 — 10회 variants=1 규율은 스크립트 실행 대상).
