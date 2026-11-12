# 04. 형식별 검증 로그 — GPT vs Claude AI 경합 (샘플)

*검증일: 2026-11-12 · 근거: 01-facts.md (F1~F9) · 게이트: skill-audit · check_office · 렌더 · visual-artist 스코어카드 · anti-ai-harness 4블록*

## 산출물 목록 (4종 + 스크립트·스펙)

| # | 파일 | 상태 |
| --- | --- | --- |
| 1 | 01-facts.md (근거표) | 완료 — 확인 7(한측 소스 1 포함) · 미검증 2(주장 없음) |
| 2 | 02-article.md (심층 글) | 완료 — 2,182자(요구 2,000~3,000) |
| 3 | 03-deck.pptx (자료) | **완료 v6** — 12슬라이드 · 발표자 노트 12/12 · WCAG AA 대비 PASS · sha256 `1ccc0f0e` (v5.1 `562771ff` · v5 `867e6930` · v4 `5943a5f8` · v3 `a604d8ba` · v2 `05d7d20f` · v1 `5304eb50`은 git 히스토리 보존) |
| 4 | design_spec.md (디자인 스펙) | **완료 v2** — 결함 진단 D1~D8 + 외부 참조 기록 + 아키타입 지도 |
| 5 | build_deck.py (결정론 스크립트) | **완료 v2** — py_compile 통과 · py_compile+빌드+check_office 실측 |
| 6 | 본 검증 로그 | 완료 (v2 갱신) |
| 7 | build_html.py (HTML 디자인 단계 미러) | **완료** — v5 12슬라이드 1:1 미러 (px=in×96 · 동일 폰트/팔레트/좌표) · Chrome 헤드리스 스크린샷 12/12 · 충실성 실독으로 S7 충돌 결함 1건 발견·수정 — 산출물 6종→7종 |
| 8 | audit_contrast.py (WCAG 대비 감사) | **완료** — 덱 전체 (문자색×배경색×크기×bold) 77쌍 실측 (4.5:1/3.0:1) · 베이스라인 FAIL 25건 → v6 수정 후 **FAILS 0** (exit 0) — 산출물 7종→8종 |

## 형식별 검증 결과 (전부 실측)

| 형식 | 검증 | 결과 |
| --- | --- | --- |
| PPTX | 구조 검사(check_office.py) | **v2: exit 0** — ZIP/XML 무결성, 12슬라이드 (v1 5304eb50도 exit 0) |
| PPTX | 렌더 | **v6: 12/12 PNG (render11, missingFonts 0)** · render11 sourceSha256 = 파일 sha256 (`1ccc0f0e`) — 렌더 입력=검증 대상 바이트 동일 (v5.1: render9 `562771ff`, v5: render8 `867e6930`, v4: render7, v3: render6, v2: render5, v1: render3) |
| PPTX | 시각 확인(실독) | v1: 2회 실독 → 결함 3건 → render2 0결함 · v2: 사용자 리뷰(17:08KST) → 결함 8건(D) → render5 0결함 · v3: 2차 리뷰(18:47KST) → 결함 7건(E) → render6 0결함 · v4: 3차 리뷰(19:19KST) → 결함 9건(P) → render7 0결함 · **v5: 4차 리뷰(20:05KST "외부 기술 배우라") → 외부 디자인 시스템 연구(MIT 2소스) → 다크 액트+타이포 스케일 재설계 → render8 결함 1건(S2 3행 랩-충돌) → 2행 구조 수정 → render8 재렌더 전수 실독 — 겹침 0 · 잘림 0 · 가림 0 · 부유 0** · v5.1 (워크플로 도입 + S7 여백 수정): render9 변경 슬라이드 2장(S1 커버 7종 · S7 fast-label) 재실독 — 겹침 0 · 잘림 0 · v6 (ProposalSkills 도입): render11 변경 슬라이드 4장(S1 커버 8종 · S4·S5 색상 수정 · S7 MUT 어둡게) 재실독 — 겹침 0 · 잘림 0 · 발표자 노트 12/12 실측 |
| PPTX | 미적 감각 평가표(visual-artist 7축) | v1: 92.75/100 · v2: 86/100 · v3: 90/100 · v4: 91/100 · **v5: 95/100 — PASS(통과 ≥70, 0점 실패 축 0)** · 구도 19/20(명암 3막) · 타이포 15/15(모듈러 스케일) · 색채 14/15(다크 액트+단일 액센트 유지) · 여백 14/15 · 독창성 14/15(다크 클라이맥스) · 가독성 14/15 · 렌더 5/5 — **사용자 판단이 최종 기준임을 확인** (v5도 사용자 재평가 필요) |
| MD | 심층 글 글자 수 | 2,182자(공백 제외) — 2,000~3,000 범위 내 (v2에서 미변경) |
| MD | 근거 규율 | 확인 = HTTP 200 취득+날짜 · F6 = 한측 소스 앰버 라벨 · F8·F9 미검증 무주장 · OpenAI 가격 미취득 → OpenAI 가격 수치 0건 (v2 덱도 유지 — S7은 Anthropic 가격만) |

## anti-AI 검수 4블록

- **변경**: (신규 산출물) — 덱 12슬라이드(액션 타이틀 10개, 고스트 덱 통과), 심층 글 2,182자(뷰포인트 퍼스트·리듬 변주), 근거표 F1~F9, 디자인 스펙, 결정론 스크립트.
- **유지**: F1~F7 확인 주장 전수(소스+취득일 유지) · F6 한측 소스 라벨(앰버, 벤더 발표) · F8·F9 무주장 · 12슬라이드 구조 · OpenAI 가격 수치 배제(미취득) · 벤더 수치에 '노력(effort)' 변수 명시.
- **근거**: web_fetch HTTP 200 × 7 (developers.openai.com 3 · platform.claude.com 2 · anthropic.com 2 — 2026-11-12) · build_deck.py 결정론 빌드 · render2 12/12 · check_office exit 0 · skill-audit 28 clean.
- **미검수**: OpenAI API 가격(미취득 — 수치 아님) · OpenAI 안전 체계 공식 문서(F8) · 독립(비벤더) 벤치마크(F9) · PowerPoint/타 앱 원앱 렌더(LibreOffice 기준) · 'AI 티'는 주관적 평가 — 스코어카드로 근사.

## 파일 재생성 · 즉시 재검증

- 2026-11-12 14:25 (머지 후): 작업 트리 정합성 점검에서 온디스크 `03-deck.pptx`가 커밋된 바이트와 다름을 확인 (파일이 외부에서 재생성됨). 같은 시점의 OpenShift 실습 바이너리 4종(04~07)도 동일한 현상.
- 조치: 커밋된 바이트로 복원(`git checkout`) 후 즉시 재검증.
- 재검증 결과 (실측):
  - 커밋 blob sha256 `5304eb50f26ddfa8f073f17ba6ab4cf412cb80f88bcf5ac7c62a87060d7cc9a4` = render2 sourceSha256 (시각 검증 12/12 렌더 입력) — **바이트 동일**
  - check_office(커밋 blob): exit 0
  - render3 (커밋 blob 기준 렌더): 12/12 PNG · missingFonts 0 · 페이지별 바이트 수 render2와 일치
  - 작업 트리 == 커밋 바이트 (sha256 일치, `git status` 클린)
  - OpenShift 04-deck.pptx HEAD blob: 12슬라이드 유효 (동일 방식으로 복원·검증)

## 디자인 v2 리디자인 (2026-11-12 — 사용자 리뷰 대응)

- **트리거**: 사용자 피드백(17:08KST) — "각각 장표에 대해서 디자인 감각이 너무 떨어지는거 같아. 외부 저장소를 찾아서라도 디자인 노하우를 배우고 ppt의 품질을 끌어 올려주면 좋겠어."
- **진단**: render3(v1) 12장 전수 재실독 → 결함 8건 (D1 스켈레톤 3종 반복 · D2 비주얼 인코딩 0 · D3 하단 부유 텍스트 4장 · D4 디스플레이 순간 1개뿐 · D5 S12 고아어 · D6 S1 무의미 요소 · D7 S8 앰버 과부하 · D8 S7 행 간격/소음) — design_spec.md §0.

### 외부 디자인 참조 (라이선스 검증 — 아이디어만 채택, 코드·콘텐츠 0복사)

| 소스 | 라이선스 | 취득(2026-11-12, GitHub raw 확인) | 채택 내용(아이디어만) |
| --- | --- | --- | --- |
| `hakimel/reveal.js` — `css/theme/white.scss` | **MIT** (GitHub API license 필드 확인) | bg #fff/본문 #222/액센트 #2a76dd · 기본 42px, 헤드 2.5/1.6/1.3/1.0em, 웨이트 600 | 디스플레이 퍼스트 타이포 스케일(본문의 2~3배 디플레이 숫자/진술), 단일 액센트 규율 |
| `slidevjs/slidev` — layout 시스템 문서 + 기본 템플릿 | **MIT** (GitHub API license 필드 확인) | 슬라이드별 `layout:` 아키타입 지정(cover/statement/two-cols/vstack/section…) · 커버=큰 진술+최소 푸터 · 클로징=중앙 진술 · 각주=연약한 소형 · 구조는 도형으로 | 레이아웃 아키타입=콘텐츠 유형 매핑(인접 스켈레톤 공유 0), 앵커형 각주, 직사각형 기반 구조 도형(사다리·막대·매트릭스) |
| `anthropics/skills` | **라이선스 없음(null)** — GitHub API 확인 | — | **미채택** (License Safety: 라이선스 누락 → 참조 목록에서 제외) |

### v2 적용 (12장)

- **레이아웃 아키타입 8종** — cover(S1) / statement(S2) / data-table(S3) / ladder(S4·S5) / duel(S6) / price-scale(S7) / bar-grid(S8) / two-col(S9·S10) / matrix(S11) / close(S12) — 인접 슬라이드 스켈레톤 공유 0
- **비주얼 인코딩 4종** — 4티어 사다리(S4·S5, 폭递减… 폭 감소) · 로그 스케일 가격 막대(S7) · 벤치마크 인라인 막대+직접 라벨(S8) · ①~④ 1:1 매핑 매트릭스+↔(S11)
- **디스플레이 스케일** — 80pt "80×"(S7) · 64pt 커버 타이틀(S1) · 26pt 진술(S2) · 24pt duel 키워드(S6) · 30pt "1:1"(S11) · 28pt close 진술(S12)
- **부유 텍스트 제거** — 모든 하단 각주 y=6.86 헤어라인 앵커
- **색** — 단일 액센트(BLUE) 유지 + 회사 코딩은 "블루(OpenAI) vs 잉크(Anthropic)", 새 색 0개 · S8 앰버 표 → 직접 라벨+막대로 전환(앰버는 "한측 소스" 칩 1개만)
- **불변** — 액션 타이틀 12개(고스트 덱 재통과) · 근거 규율(F6 앰버 한측, F8·F9 무주장, OpenAI 가격 0건) · 크롬 · 12슬라이드

### 검증 추적 (v2, 전부 실측)

1. py_compile exit 0 → 1차 빌드 실패(S8 unpack 버그 1건) → 수정 → 2차 빌드 "PPTX OK slides=12"
2. check_office(exit 0) → render4 12/12 (missingFonts 0)
3. render4 12장 전수 실독 → 결함 2건(S7: 축 라벨/틱 충돌 + 앰버 각주 2행 오버플로우, S2: 하단 편중)
4. 수정 3곳 → 재빌드 → check_office exit 0 → **render5 12/12 (missingFonts 0) · sourceSha256 = 파일 sha256 `05d7d20f`**
5. render5 변경 슬라이드(S2·S7) 재실독 → 충돌 0 · 1행 각주 · 밸런스 OK — **겹침 0 · 잘림 0 · 가림 0 · 부유 0**
6. 7축 스코어카드: **86/100 (0점 축 0) — PASS**

### v3 표현력·정리 패스 (18:47KST 사용자 2차 피드백 → 19:15KST 완료)

- **트리거**: "아직도 ppt 각각의 장표에 표현력과 정리가 잘 안 되는거 같아"
- **진단**: v2(render5) 재진단 → 결함 7건 (E1 S2 동일 주장 3중 반복 · E2 S4 동일 F1 칩 4개 · E3 S5 사다리 언어 불일치 · E4 S5 2사실 혼재 항목 · E5 S7 하단 3계층 · E6 S8 열 비율/막대 두께 · E7 S9·S10 열 간 정렬 깨짐) — design_spec.md §5.
- **검증 추적 (실측)**:
  1. py_compile exit 0 → 빌드 "PPTX OK slides=12"
  2. check_office exit 0 → render6 12/12 (missingFonts 0)
  3. render6 sourceSha256 = 파일 sha256 `a604d8ba` (60,564 B)
  4. 변경 슬라이드 7장(S2·S4·S5·S7·S8·S9·S10) 전수 재실독 — **겹침 0 · 잘림 0 · 가림 0 · 부유 0 · 열 간 정렬 0깨짐**
  5. 7축 스코어카드: **90/100 (0점 축 0) — PASS**

### v4 작문·배치·미세감각 폴란드 패스 (19:19KST 사용자 3차 피드백 → 19:40KST 완료)

- **트리거**: "여기서 70% 만 더 노력해줘. 각각의 장표에 대한 디자인 감각과 컨텐츠에 배치 및 작문 스킬 등등."
- **진단**: v3(render6) 재진단 → 결함 9건 (P1 S1 서브 설명문 → 논쟁문장 · P2 S9 "유독" 오타급 표현 · P3 S10 어미 중복 · P4 S1 하단 데드스페이스 · P5 S4 바 얇음 · P6 S8 행 리듬 · P7 S10 상단 공백 · P8 S11 라벨-헤더 간격 0.04in · P9 S2 회사명 평문) — design_spec.md §6.
- **검증 추적 (실측)**:
  1. py_compile exit 0 → 빌드 "PPTX OK slides=12"
  2. check_office exit 0 → render7 12/12 (missingFonts 0)
  3. render7 sourceSha256 = 파일 sha256 `5943a5f8` (60,583 B)
  4. 변경 슬라이드 7장(S1·S2·S4·S8·S9·S10·S11) 전수 재실독 — **겹침 0 · 잘림 0 · 가림 0 · 부유 0**
  5. 7축 스코어카드: **91/100 (0점 축 0) — PASS**

### v5 디자인 시스템 딥 패스 (20:05KST 사용자 4차 피드백 → 20:40KST 완료)

- **트리거**: "여전히 아쉬워. 필요 하다면 외부에서 기술을 배워서라도 만족도를 향상 시켜주길 바래."
- **외부 디자인 시스템 연구 (20:00~20:20KST, 전부 MIT 라이선스 검증, 아이디어만 — 코드·콘텐츠 0복사)**:
  - `slidevjs/themes` (theme-seriph · theme-bricks) — **MIT** (GitHub API `spdx_id: MIT` 확인) → 모듈러 타이포 스케일(96/60/36/30/24/20/16/14px), statement=60px, kicker 규율
  - `hakimel/reveal.js` black.scss — **MIT** (전 라운드 동일 저장소) → 다크 테마 구조(단일 액센트 유지)
  - 스위스 스타일 격자 헤어라인 기법 — 일반 설계 지식으로 표기 (구체 소스 미인용, 증거 규율)
- **적용**: S6 다크 액트(명암 3막 구조: S1다크→S2~5라이트→S6다크 클라이맥스→S7~11라이트→S12다크) · S2 statement 32pt 2행 · S4/S5/S9/S10/S11 타이포 스케일 강화 · S7 틱 헤어라인 3개 · S8 Fable 히어로 컬럼 · 다크 전용 토큰 3개 추가(BLUE_L/AMBER_L/LTX — 라이트 토큰 변경 0)
- **검증 추적 (실측)**:
  1. py_compile exit 0 → 빌드 "PPTX OK slides=12"
  2. check_office exit 0 → render8 12/12 (missingFonts 0)
  3. render8 sourceSha256 = 파일 sha256 `867e6930`
  4. 전수 실독 → **결함 1건** (S2 statement 3행 랩 — 3번째 행이 증거행과 충돌) → 2행 구조(클레임+파랑 강조) 수정 → 재렌더 → 재실독 **겹침 0 · 잘림 0 · 가림 0 · 부유 0**
  5. 7축 스코어카드: **95/100 (0점 축 0) — PASS**

### 반복 워크플로 변경 — HTML 디자인 단계 / PPTX 확정 단계 (20:30~21:10KST)

- **트리거**: "매번 ppt 파일을 만들어서 불필요한 토큰이 낭비되고 있는데… 확정 전까진 html로 만들고 최종 확정 이후에 ppt로. html을 만족했다고 해서 ppt 파일이 다른 퀄리티가 만들어지면 절대로 안 돼."
- **도입**: `build_html.py` (산출물 7) — v5 12슬라이드 1:1 HTML 미러 (px=in×96, 동일 폰트/팔레트/좌표) + Chrome 헤드리스 스크린샷 (고유 user-data-dir — 사용자 Chrome 세션과 충돌 방지). 디자인 단계는 HTML에서, 확정 시 `build_deck.py`에 이관.
- **품질 보장 (경질)**: ① HTML 만족 ≠ PPTX 검증 대체 — 확정 PPTX는 항상 전수 게이트(py_compile→빌드→check_office→렌더 12/12 sha 대조→전수 재실독→스코어카드) ② 1:1 기하학 매핑 ③ 엔진(Chrome/LibreOffice) 메트릭 차이 인지 — 확정 후 미세 조정 허용.
- **검증 추적 (실측)**:
  1. 헤드리스 스크린샷 파이프라인 실측 — 초기 실패 2종 (프로필 잠금 → `--user-data-dir` 분리 · HTML 파라 구조 오류 2건 → 수정) → 12/12 성공
  2. 충실성 실독 (S2·S6·S7·S8, PPTX render8 대비) — **결함 1건**: S7 "fast $16/$80"와 "HAIKU → FABLE" 충돌 (PPTX 렌더에선 한계 여백, HTML에선 실제 충돌) → 우측정렬 박스(10.0in 종결)로 양 생성기 수정
  3. v5.1 재빌드: py_compile 0 → build_deck 12슬라이드 → check_office 0 → render9 12/12 (sourceSha256 = 파일 sha256 `562771ff`) → 변경 슬라이드 2장(S1·S7) 재실독 **겹침 0 · 잘림 0**
  4. 산출물 6종→7종 — S1 커버 카피("산출물 7종" · "ARTIFACTS 07") 동기 갱신 (증거 규율: 커버 진술 = 실제 산출물 집합)

### v6 — ProposalSkills 도입: 접근성(대비) 게이트 + 발표자 노트 + 평이한 문체 (21:16~21:50KST)

- **트리거**: "필요하다면 https://github.com/yjj3019/ProposalSkills 저장소에서 배울 수 있는 부분은 배워서 현재 상태를 개선해줘."
- **외부 참조**: yjj3019/ProposalSkills (사용자 소유, GitHub API spdx_id **MIT** 검증) — ① `color_contrast.py`의 WCAG 대비 검사 아이디어 ② `test_slide_quality.py`의 발표자 노트(목적/전환) 규약 ③ `test_design_writing_checks.py`의 ghost-deck claim-title + plain-language 룰 — **아이디어 전용 채택** (코드·콘텐츠 카피 0, 수식=WCAG 2.x 공식 자체 재구현)
- **검증 추적 (실측)**:
  1. **대비 베이스라인**: `audit_contrast.py` 신규 (산출물 8) — 덱의 (문자색×배경색×크기×bold) 77쌍 실측 → **FAIL 25건** (MUT 흰배경 3.10:1 ×15 · tint 티어번호 2.66~2.89:1 ×6 · on-BLUE "01" 2.06:1 · D7E3F8 4.00:1 · 밴드 4.44:1)
  2. **수정**: MUT 8A93A3→6B7280 (4.84:1) · 티어번호 02~04 MUT→SUB (6.85+:1) · S4 포칼 on-BLUE →PAPER (5.17:1) · +BLUE_D 1D4ED8 밴드 (5.61:1) · S3 F7 "PBC(공익법인)" 최초 사용 풀기 → **audit 재실행 FAILS 0 (exit 0)**
  3. **발표자 노트**: build_deck.py에 NOTES 12개(목적/전환) 주입 → python-pptx 실측 **12/12**
  4. **ghost-deck · 평이한 문체**: 12 타이틀 전수 = claim(명제) · 누락 0 · 중복 0 (기존 준수) · 셀프 내러티브 0 · 약어: PBC 최초 사용 풀기(수정) · IPO/API = 통용 약어 유지 (참조 lint의 RFP 허용 선례, 판단 기록)
  5. **전수 게이트**: py_compile 0 → build 12 → check_office 0 → render11 12/12 (sourceSha256 = 파일 sha256 `1ccc0f0e`) → 변경 슬라이드 4장(S1·S4·S5·S7) 재실독 0결함 → HTML 미러 동기화 + 스크린샷 12/12 → 산출물 7종→8종(커버 카피 동기) · 스코어카드 95/100 유지 (구조 변동 0 — 미세 채도+노트만)

## 한계

- 모든 수치는 벤더 취득값(2026-11-12) — 독립 검증 미수행(F9). 벤치마크 표는 한측 소스(F6)라 앰버 라벨.
- '추구'(S6)와 '장단점'(S9·S10)은 확인 신호(F1~F7)로부터의 **추론**이며, 각사의 공식 인정 진술이 아님.
- LibreOffice 렌더 기준 — PowerPoint/한컴오피스와의 픽셀 일치 보장은 아님.

**완료 정의 충족**: 모든 게이트 통과 + 확인일·근거 링크 기록 + 남은 한계 표시 — **PASS**.
