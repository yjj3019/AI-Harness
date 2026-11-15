# Design Case — Font Fallback (폰트 폴백) (design-omniskill P5)

> 근거: design-skill-engine-2026-11-14 §3-5 (타이포 축) — 폰트 폴백 스택 부재 시 렌더 파손 감지. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 미측정은 `unknown: true` + `reason` 로만 표기 (v1.7.0 C3 계약).

## 1. 고정 입력

- 폰트 폴백 문구: 한글/특수문자 텍스트 + 렌더 raster (`docs/eval-set/eval-set.json` 등록 대상)
- 폴백 스택 정의: 외부 폰트 미적재 환경에서 렌더 실측 (폴백 서체 렌더 비교)

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "font-fallback", "metric": "", "evidence": "폴백 렌더 raster 경로" },
  { "item": "font-fallback::unknown", "unknown": true, "reason": "미측정 — 최초 사용 후 실측/사유 기록 예정", "evidence": "측정 불가 지점" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 사전 측정 없음 (최초 사용 — v1.7.0 C1 실사용 이전에는 측정 기록 0건).

## 4. After + 재실측

- **상태**: 기록 완료 (v1.7.0 C1 실사용, 2026-11-15) — 대상 `docs/practice/design-omniskill-v1.7.0-2026-11-15/onepager.html` 렌더.
- 폴백 스택: sans `"Segoe UI","Noto Sans KR","Malgun Gothic",system-ui,sans-serif` (5-chain) · mono `"Cascadia Code","Consolas","Noto Sans KR",monospace` (4-chain) — 2 family (축 준수).
- 글리프 커버리지 (`document.fonts.check` API 실측): 샘플 4종(한글 "디자인 하네스 보강 방안"·라틴 "AI-Harness v1.7.0 P2"·숫자 "1440 1920 39A5DB4B3FDD"·혼합 "C1 design-omniskill 운영 확정") × family 5종 = **20/20 true** · body 계산 스택 한글 true → tofu 0.
- 크기 축: 14/16/20/32px 전부 on-axis (짝수, 10-96) — `design-channel-check.js html` 스캔 off-axis 0.

## 5. 재실측 기록

- **상태**: 최초 측정 기록 (2026-11-15, v1.7.0 C1). 방법: chromium `document.fonts.check` API + computed style 실측 (Windows 호스트 — 다른 OS 글리프 차이 UNKNOWN) · 렌더 sha 체인 report.md §1 · 스코어카드: `scorecard.json` type-families 행 (`2`).
