# design-omniskill 실사용 보고서 — v1.7.0 P2 요약 원페이지 (HTML 채널) (2026-11-15)

> harness-reinforcement-plan **C1** (design-omniskill 운영 확정)의 "실사용 1회 이상 실측" 산출물.
> 진입점 `skills/design-omniskill/SKILL.md` → 라우팅 → `channel-html.md` 채널 규격(tokens.md 기준)으로 수행.
> 모든 수치는 2026-11-15 본 호스트(Windows, chromium via Playwright MCP headless) 실측. 미측정은 UNKNOWN(reason과 함께).

## 1. 산출물과 렌더

- 산출물: `onepager.html` (AI-Harness v1.7.0 P2 요약 원페이지)
- 렌더 계약 (channel-html.md): 폭 1440/1920, 출력 바이너리·치수·sha256·오버플로 확인 기록.
- 렌더 엔진: chromium (Playwright MCP, headless, isolated profile) — **D4 규율: MCP 렌더는 관찰/산출물이며 게이트 판정 증거가 아님. 본 페이지는 산출물+실측 기록이고, 통과/거부 판정은 `design-channel-check.js` 실행 결과로만 기록.**

| 렌더 | 치수 | 바이트 | sha256 |
|---|---|---|---|
| `render-1440.png` | 1440×955 (fullPage, 콘텐츠 955 > 뷰포트 900) | 30212 | `0d0a32c9f8bda06fb057e8e2619d007aa44a0e381aa2d0cf8448ae8f1da579d6` |
| `render-1920.png` | 1920×1080 (뷰포트 1080 ≥ 콘텐츠 955) | 32752 | `714aef151049c322d2349bf376d4db1dc2877a64fba65fe64d3f3632e7176a32` |

- 입력 체인: `onepager.html` sha256 = `696ecd0069c88b91faf22e1206a25bb346fd94dbccdc75c3258eb870e4235d08` (입력 → 래스터 sha 체인).

## 2. 실측 (스코어카드 각 행의 원본)

### 2.1 Overflow (오버플로)

| 폭 | scrollWidth | clientWidth | 가로 스크롤 | 뷰포트 이탈 요소 |
|---|---|---|---|---|
| 1440 | 1440 | 1440 | 없음 (false) | 0 (h1/h3/p/td/th/badge/code 전부 rect 확인) |
| 1920 | 1920 | 1920 | 없음 (false) | 0 |

### 2.2 Contrast (명암비 — WCAG 공식 실측, node 계산)

| 짝 | 전경 | 배경 | 비율 | 판정 (AA 4.5:1) |
|---|---|---|---|---|
| 본문/백 | #19191f | #ffffff | 17.50 | 통과 |
| 본문/카드 | #19191f | #eef2ff | 15.65 | 통과 |
| weak/백 | #4b4b57 | #ffffff | 8.60 | 통과 |
| weak/카드 | #4b4b57 | #eef2ff | 7.69 | 통과 (가장 약한 weak) |
| primary/백 | #1d4ed8 | #ffffff | 6.70 | 통과 |
| primary/카드 | #1d4ed8 | #eef2ff | 5.99 | 통과 (가장 약한 accent) |
| white/primary | #ffffff | #1d4ed8 | 6.70 | 통과 |
| ink/line | #19191f | #d9d9e3 | 12.49 | 통과 (테두리, 본문 아님) |

### 2.3 Type (타이포)

- 축: sans 1종 체인 + mono 1종 체인 = **2 family** (tokens.md "2-3 families max" 준수).
  - sans: `"Segoe UI", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif` (5-chain)
  - mono: `"Cascadia Code", "Consolas", "Noto Sans KR", monospace` (4-chain)
- 크기: 14/16/20/32px — 전부 짝수·10-96 범위 (on-axis). `design-channel-check.js html` 스캔 off-axis 0.
- 글리프 커버리지: `document.fonts.check` API 실측 — 샘플 4종(한글·라틴·숫자·혼합) × family 5종 = **20/20 true** + body 계산 스택 한글 true. tofu 0.
- line-height: body 1.5 (≥1.4), h1 1.25 (≥1.2 display).

### 2.4 Spacing/Type static scan

- `node scripts/design-channel-check.js html onepager.html` → **clean (exit 0, 0 findings)** — off-scale gap 0, off-axis font-size 0, single-family 0, inline layout style 0, missing alt 0 (img 없음).

## 3. Scorecard (C3 계약 — `design-channel-check.js scorecard` ok 실측, 8 items)

`scorecard.json` (본 디렉터리) — numeric metric 7행 + UNKNOWN(reason) 1행(`grid-12col`).

## 4. 렌더 증거 계약 검증

- `evidence-1440.json` / `evidence-1920.json` → `node scripts/design-channel-check.js evidence html` **ok / ok** (EVIDENCE_CONTRACT: status·engine·input·output·width·height·sha256).

## 5. Report (4블록)

- **Changed**: v1.7.0 P2 산출물 요약 원페이지 신규 작성 (본 디렉터리 7파일). 기존 산출물·게이트 수정 없음.
- **Kept**: PPTX 승인 게이트·render-diff 게이트 문구 원문 유지 (`skills/design-omniskill/SKILL.md` L39, `channel-pptx.md` — 본 브랜치 diff 0 확인 예정/확인됨 항목 참조) · tokens.md 스케일(4px 배수)·타이포 축(2 family) 준수 · `design-channel-check.js` 판정 로직 미변경(C3 변경은 scorecard 서브커맨드만, html 검사 미변경).
- **Evidence**: 위 §1-§4 전부 (렌더 2종 sha 체인 · 명암비 8쌍 계산 · overflow 2폭 · fonts.check 20/20 · static scan clean · scorecard/evidence 계약 검증 ok).
- **Uncovered**: ① `grid-12col` — 12열 좌표 수준 정렬 미측정 (컨테이너 max-width 1200 + 2열 grid만 확인, 열 좌표 대조 불시행) ② 프린트 레이아웃(8열) 미적용(스크린 산출물) ③ 렌더는 Windows 호스트 chromium 단일 환경 — 다른 OS 글리프/반영 차이 미측정 ④ `aspect-ratio`·`document-preservation`·`source-adoption` 케이스는 본 산출물로 검증 불가(해당 산출물 유형 미사용) — 미기록 유지.

## 6. 채널별 트리거 실측 (C1 수용 기준)

샘플 요청 6종 → `SKILL.md` Trigger·Route table 규칙에 대한 라우팅 판정 (규칙 적용 실측, 2026-11-15):

| # | 샘플 요청 | Trigger 적중 | 라우팅 채널 | 근거 (SKILL.md) |
|---|---|---|---|---|
| 1 | "이 회의 결과를 A4 2페이지 보고 docx로 만들어줘" (레이아웃 포함) | O (디자인 산출물) | `channel-docx.md` | Route table: DOCX 행 |
| 2 | "landing 페이지 HTML 만들고 스크린샷으로 확인해줘" | O | `channel-html.md` (본 보고서 실사용) | Route table: HTML page/deck 행 |
| 3 | "인포그래픽 이미지 1920×1080으로 하나 그려줘" (visual-artist 전용 아님) | O | `channel-image.md` | Route table: Static image 행 (visual-artist 스코어카드 계승) |
| 4 | "영업용 PPTX 데크 만들고 승인 받은 레이아웃과 렌더 diff 해줘" | O | `channel-pptx.md` (ppt-master + render-diff) | Route table: PPTX 행 — PPTX 게이트 불가침 |
| 5 | "PDF로 수출하되 표가 잘림 없이" | O | `channel-pdf.md` | Route table: PDF 행 (LO→PDF→144dpi 래스터) |
| 6 | "이 React 카드 컴포넌트 간격·색 토큰 일관성만 봐줘" | O | `channel-code.md` | Route table: Code with UI layout 행 |

- 부정 트리거 (Trigger "Not for" 확인): "순수 텍스트 초안 작성"(document-master/writer-master 영역)·"PPTX만 만드는 플로우"(ppt-master)·"비주얼 레이아웃 없는 API 계약"(api-design) → 라우팅 **O 아님** (진입점 미적용).
- 한계: 본 실측은 **정적 규칙 적용 판정**이며, 실제 LLM 세션의 트리거 활성화(프롬프트→스킬 선택) 실측은 아님 — 후자는 스킬 운영 호스트별 특성(UNKNOWN, 미검증).

## 7. PPTX render-diff 불가침 확인 (C1 수용 기준)

- `git diff main...HEAD -- skills/design-omniskill/SKILL.md skills/design-omniskill/channel-pptx.md` → **빈 diff** (본 브랜치에서 두 파일 미변경 — 실행 로그 참조).
- SKILL.md L39 원문 유지: "The PPTX approval gate and the existing render-diff gate stay untouched. A channel pass never substitutes a gate."

## 8. skill-audit (C1 수용 기준)

- `node scripts/skill-audit.js` 실행 결과 기록: **29 스킬 clean** (실행 로그 — final report 참조). design-omniskill 8파일 추적 상태 유지.
