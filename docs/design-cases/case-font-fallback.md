# Design Case — Font Fallback (폰트 폴백) (design-omniskill P5)

> 근거: design-skill-engine-2026-11-14 §3-5 (타이포 축) — 폰트 폴백 스택 부재 시 렌더 파손 감지. 케이스 구조 필수 4종: ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록. 미측정은 `unknown: true` 로만 표기.

## 1. 고정 입력

- 폰트 폴백 문구: 한글/특수문자 텍스트 + 렌더 raster (`docs/eval-set/eval-set.json` 등록 대상)
- 폴백 스택 정의: 외부 폰트 미적재 환경에서 렌더 실측 (폴백 서체 렌더 비교)

## 2. Scorecard (구조)

```json
{ "items": [
  { "item": "font-fallback", "metric": "", "evidence": "폴백 렌더 raster 경로" },
  { "item": "font-fallback::unknown", "unknown": true, "evidence": "측정 불가 지점" }
] }
```

## 3. Before (사용 전 — 실측)

- **상태**: 미기록 (최초 사용 후 기록 예정 — `design-channel-check.js scorecard` 검사 통과 기준).

## 4. After + 재실측

- **상태**: 미기록 (사용 후 기록 예정).

## 5. 재실측 기록

- **상태**: 미기록 (사용 후 기록 예정 — 10회 반복 variants=1 규율 적용 대상).
