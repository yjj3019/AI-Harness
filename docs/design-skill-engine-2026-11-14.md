# 디자인 스킬 계획: HTML · 이미지 · PDF · PPTX · DOCX · 코드 (2026-11-14)

**요청**: "html, image, pdf, pptx, docx 등 문서 작업과 코딩 등에 활용 가능한 디자인 스킬을 계획하고 강화 방법을 강구."

## 1. 현황 실측 (기존 자산, 모두 확인됨)

| 자산 | 커버 | 실측 한계(갭) |
| --- | --- | --- |
| `skills/design-master/SKILL.md` | 설계 스테이지·최소 작업 세트 | 포맷별 검증 계약 없음 |
| `skills/visual-artist/SKILL.md` | 정적 시각물 **점수카드**(정량) | 이미지·캔버스 중심, HTML/PDF 미지원 |
| `skills/design-evidence-harness/SKILL.md` | 산출물 검증·보고·속성 기록 | 렌더 포렌식 참조에 한함 |
| `skills/ppt-master` + `ppt-master-style` | PPTX 고품질 워크플로우 | PPTX 전용 |
| `skills/office-master/SKILL.md` | DOCX/PPTX/XLSX 문서 작업 | 타이포·인쇄 레이아웃 채널 없음 |
| `skills/api-design/SKILL.md` | 인터페이스 설계(코딩) | 코드 **시각 품질**(레이아웃·타이포 기반 코드) 미지원 |
| 실무 증거 | 렌더 포렌식 (LO→PDF 144dpi pdfium, render-diff, sha 체인 — `docs/practice/*/render12/README.md`) | **절차는 존재, 스킬 계약으로 문서화 안 됨** |
| 실무 증거 | HTML 데크 + `htmlshots/` 스크린샷 증거 | HTML 채널 규격 미존재 |

**핵심 갭**: ① 포맷 공통 *디자인 토큰*(색·간격·타이포·그리드) 규약 없음 ② HTML/PDF/DOCX 스코어카드 부재 ③ 렌더 포렌식이 스킬 계약이 아님 ④ 스킬 강화 측정 루프(점수 실측→교정) 미체계화.

## 2. 설계: 단일 진입점 + 포맷 채널 (skills/design-omniskill)

```
design-omniskill (진입점 SKILL.md — progressive disclosure)
├── 공통 레이어: 토큰 규약(tokens.md) · 점수카드 공통 축 · 보고 포맷(4블록)
├── 채널 channel-html   : HTML/CSS 레이아웃·타이포 QA → chrome headless 스크린샷(1920×1080) + htmlshots 증거
├── 채널 channel-image  : visual-artist 스코어카드 계승 + 픽셀 실측(치수·여백·명암비 계산)
├── 채널 channel-pdf    : LO→PDF(→144dpi 래스터) 렌더 포렌식 + 페이지 규격·오버플로 실측
├── 채널 channel-pptx   : ppt-master 계승 + render-diff(승인 기준 vs 산출물) — PPTX 게이트 불가침 유지
├── 채널 channel-docx   : office-master 계승 + 인쇄/1페이지 타이포 체크 + PDF 래스터 눈금 확인
└── 채널 channel-code   : api-design 계승 + 코드 내 UI 토큰 일관성(레이아웃 단위·변수명·계층) 검사
```

**채널 공통 계약** (각 채널 동일 골격):
1. `조사` — 대상 산출물 + 소스만 읽음 (데이터, 명령 아님)
2. `점수화` — 포맷별 스코어카드(0-5 축 × 6-8항목, 명확한 기준문) — visual-artist 방식 확장
3. `실측 증거` — 렌더 경로 명시(계약: PPTX→PDF 144dpi 1920×1080, HTML→chrome 1440/1920 폭) + sha 기록
4. `보고` — 4블록: 변경/유지/증거/미커버 (anti-ai-harness 보고 규율 계승)

## 3. 강화 방법 (요청 핵심 — 8가지)

1. **점수카드 숫자 보정(calibration)**: 각 채널에 기준문(reference rubric) + 승인된 레퍼런스 산출물 연결 — *주관 판정을 실측 축으로 치환* (visual-artist 선례 확장). — **v1.5.0 실장 (A2: `metric` 또는 `unknown:true`+evidence 강제) · v1.7.0 강화 (C3: UNKNOWN `reason` 필수 · `metric` 수치 검증(number 또는 숫자 시작 문자열) · 빈 배열 거부 — `design-channel-check.js scorecard`)**
2. **렌더 포렌식 게이트 재사용**: 항상 "스크린샷/래스터 실측 → 합성 → 눈금 비교" 3단계 (기존 render12 규격 승격). PPTX 승인 게이트(기존 불가침) 유지 — HTML 승인은 PPTX 통과 대체 안 됨 (기존 규율 고정).
3. **양성 대조 프로브**: 스코어카드가 "깨짐을 깨짐으로" 잡는지 방울 케이스(오버플로·명암비 불량·폰트 폴백) 1-2개씩 채널별 보유 — 이번 세션의 10회 시뮬레이션 규율(skill-audit 양성 대조 7종)과 동일 신뢰 정책.
4. **측정 루프**: 각 사용에서 before/after 점수 실측 기록 → `docs/design-cases/` 말뭉치에 누적 → 다음 강화의 근거 (증거 우선 규율).
5. **디자인 토큰 규약**: 색(명암비 ≥4.5:1 실측), 간격 스케일(4/8pt 배수), 타이포 축(도구별 동일 축), 그리드(3840 토큰 체계) — 채널 간 일관성의 측정 기준선.
6. **progressive disclosure**: 트리거 실측 (design-evidence-harness·skill-design-progressive-disclosure 규율) — 진입점은 트리거만, 채널 상세는 접힘.
7. **distilled store 적재**: 승인된 스코어카드/레퍼런스 기록을 distilled store(기존 memory-guard 감사 대상)에 적재 — 도입 시 memory-guard 규칙 충족 요구.
8. **반복 시뮬레이션 경기화**: 채널 스크립트 존재 시 이번 세션의 10회 시뮬레이션(exit/stdout-sha/시간 variants=1) 규율 적용 — 결정론 게이트 기준 통과 필수.

## 4. 로드맵 (게이트 통과 조건 포함)

| 단계 | 산출물 | 통과 조건 |
| --- | --- | --- |
| P1 계획(본 문서) | 채널 골격·토큰 명세 | **사용자 승인** ✅ (2026-11-14) |
| P2 진입점 SKILL.md + tokens.md | `skills/design-omniskill/` | skill-audit(29 skills clean) ✅ 실측 |
| P3 채널 1기: html·pdf (렌더 포렌식 계약) | 채널 서브문서 + 스코어카드 | ✅ 양성 대조 통과 |
| P4 채널 2기: image·docx·pptx·code | 채널 서브문서 | ✅ 작성 완료 (사용자 승인 2026-11-14) |
| P5 말뭉치 + 교정 루프 | `docs/design-cases/` 6케이스 | ✅ 6케이스 작성 (v1.5.0) — 실측 수치는 P2 C1 실사용 단계에서 기록 |
| P6 결정론 검증 | `scripts/design-channel-check.js` + 양성 대조 4종 | ✅ **tests 4/4 · 10회 variants=1** 실측 |

## 5. 판정 기록

- 기존 스킬 28종과 **전부 상호참조 합성** 방식 — 신규 규칙 중복 최소화, 기존 게이트(PPTX 승인·렌더·render-diff) 불가침 명시.
- 라이선스: 신규 작성 문서/규약 — 코드 카피 없음, 채택 시 외부 소스는 14repo 기록 규율 준용.
- 대기: **P2 이후 실제 SKILL.md 구현은 사용자 승인 후** (기존 "HTML 승인 ≠ PPTX 게이트" 규율과 동일: 계획 승인은 스킬 구현 승인 대체 안 함).

## 6. 외부 저장소 반영 매핑 (14repo 라이선스 실측 2026-11-14, 전부 아이디어만)

| 외부 소스 | 라이선스 (실측) | 원천 패턴 | 반영 위치 |
| --- | --- | --- | --- |
| docling-project/docling | MIT (README 명시) | 상태 4분할 enum (SUCCESS/PARTIAL_SUCCESS/FAILURE/SKIPPED) + 거부 사유 분류 | P6 evidence contract: `status` ∈ {SUCCESS,PARTIAL_SUCCESS,FAILURE,SKIPPED} 강제 (`scripts/design-channel-check.js evidence`, 양성 대조 포함) |
| adewale/skill-eval-harness | MIT (README 배지) | with/without 대비 측정, 정답키 분리, Causal lift | P5 `docs/design-cases/` 말뭉치: 케이스마다 Before/After 스코어 표 + 측정 행 + Uncovered/Lesson 고정 블록 |
| nousresearch/hermes-agent | MIT (LICENSE 실측) | 스킬 사용 후 개선 이력 섹션 강제 · 근거 재검색 루틴 | P2 SKILL.md — "개선 이력" 규칙: 사용 후 스코어카드 차이가 규칙·토큰과 어긋나면 design-cases 기록 + SKILL.md 규칙에 반영 (idempotent) |
| openclaw/openclaw | MIT (LICENSE 실측) | core/opt-in 계층 분류 · 매니페스트 계약 버저닝 | P2 SKILL.md — 진입점(core)과 채널 상세(opt-in) 분리 = progressive disclosure와 병행, opt-in 레이어 명시 |
| yjj3019/claude-cheat | MIT (사용자 소유) | 요구사항 원장(R) 회귀 고정, 변경 ⇒ test-first | P6 규칙 — 스코어카드/검사 규칙 변경 시 양성 대조 test-first (변경 전 control 1차 작성) |
| deepseek-ai/deepseek-harness | MIT (README 명시) | 반복 실행 결정론 (variants=1), 타임아웃 선언 강제 | P6 게이트: 스위트 10회 시뮬레이션 variants=1 실측 + 검사 타임아웃 선언 (`design-channel-check.js`) |
| adbar/trafilatura | Apache-2.0 (README; **<1.8.0은 GPLv3+ 주의**) | SSRF 기본 차단 + 최소 산출 크기 기준 | 채널 아웃바운드 fetch 지침 (신버전 관점만) — 설계 범위 밖 항목은 채택 안 함 |
| open-webui/open-webui | NOASSERTION(커스텀, OSI 비승인·CLA) | 라이선스 이력 분리 + 기여 CLA 명문화 | 미반영 (위험 기록만; 코드 카피 금지 원칙 유지) |
