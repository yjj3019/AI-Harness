# Design Case — Overflow (오버플로) (design-omniskill P5)

> 근거: design-skill-engine-2026-11-14 §3-4 (측정 루프) — 케이스는 before/after 스코어카드를 실측으로만 기록한다. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 주관 표현은 기록할 수 없음 — 미측정은 `unknown: true` + `reason` 로만 표기 (v1.7.0 C3 계약).

## 1. 고정 입력

- 오버플로 유발 문장/레이아웃 (고정 텍스트 말뭉치 — `docs/eval-set/eval-set.json` 등록 대상)
- 렌더 포렌식: 스크린샷/래스터 실측 → 합성 → 눈금 비교 3단계 (render-diff 규격)

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "overflow", "metric": "", "evidence": "clip 횟수 렌더 실측 경로" },
  { "item": "overflow::unknown", "unknown": true, "reason": "미측정 — 최초 사용 후 실측/사유 기록 예정", "evidence": "측정 불가 지점" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 사전 측정 없음 (최초 사용 — v1.7.0 C1 실사용 이전에는 측정 기록 0건).

## 4. After + 재실측

- **상태**: 기록 완료 (v1.7.0 C1 실사용, 2026-11-15) — 대상 `docs/practice/design-omniskill-v1.7.0-2026-11-15/onepager.html` 렌더.

| 폭 (계약) | scrollWidth | clientWidth | 가로 스크롤 | 뷰포트 이탈 요소 |
|---|---|---|---|---|
| 1440 | 1440 | 1440 | 없음 | 0 |
| 1920 | 1920 | 1920 | 없음 | 0 |

- clip 요소 0 (h1/h3/p/td/th/badge/code 전 요소 rect 확인, `r.right ≤ clientWidth`).

## 5. 재실측 기록

- **상태**: 최초 측정 기록 (2026-11-15, v1.7.0 C1). 방법: chromium (Playwright MCP headless) `documentElement.scrollWidth/clientWidth` + 전 요소 `getBoundingClientRect` 확인 · 렌더: `render-1440.png` (1440×955) · `render-1920.png` (1920×1080) sha 체인 report.md §1 · 스코어카드: `scorecard.json` overflow 행 (`0 clipped`).
