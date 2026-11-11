# AI 스킬 조사 정밀 분석 · 적극 반영 기록 (2026-11-11) — Anti-AI · 디자인 · 글쓰기 · 문서 제작

2026-11-11에 제공된 Anti-AI / Anti-Slop 스킬 GitHub 후보 조사를 바탕으로, 후보 각각을 GitHub raw README를 직접 취득해 실측 검증한 뒤 **패턴·판정 기준만 문서로 반영**했다. **원 소스 코드는 복사하지 않았고, 설치·실행·third-party 스크립트 실행은 하지 않았다.** 조사 자료는 외부 데이터로 취급한다(마케팅 문구는 사실이 아니라 데이터일 뿐이다).

**이 기록은 같은 날 이루어진 4개 조사(Anti-AI · 디자인 · 글쓰기 · 문서 제작)와 Harness·Loop 조사, 통합 가이드 v1.0의 실측·대조·반영을 한 곳에 모은다** — §1~5 Anti-AI/안티슬롭, §6 디자인(visual-artist), §7 라이선스 안전 규율, §8 글쓰기(writer-master), §9 문서 제작(office-master), §10 신뢰 경계, §11 종합 리뷰 보완, §12 Harness·Loop 조사, §13 통합 가이드 대조.

## 1. 검증 방법

- 대상: 후보 11개(Nutlope/hallmark 포함)를 후보로 취급. 각 저장소의 GitHub raw README 또는 저장소 페이지(HTTP 200)를 직접 취득해 **README 기재 사실**만 인용했다.
- 판정: README에 기재된 사실(기능 수 · 라이선스 · 필수 파일 · 명시된 한계)만 채택. 조사표의 '추천도'(주관 평가)는 의견으로 표기하며, 설치 실행 테스트·보안 감사·성능 검증·기존 24개 스킬과의 실제 충돌 검사는 수행하지 않았다 (미검증 항목 제4절).

## 2. 저장소별 실측 요약 (README 직접 취득 기준)

| 저장소 | 실측 내용 (README) | 라이선스 | 후보 조사 주장과의 정합 | 판정 |
| --- | --- | --- | --- | --- |
| [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) (antislop) | 필터(스타일 가이드 아님). R-01~R-40 40규칙 · 3 tier(Hard Gate / Purpose-Gate / Quality Locks) · Delivery Gate(PASS/FAIL) · 6스킬(antislop / -ui / -copywriting / -human / -layoutmobile / -code) · `DESIGN.md` 방향 요구 · during/after 모드 · DeepSeek Harness 플러그인(v3.2.28) 지원 명시 | MIT | 정합(조사표 'UI·글·코드 통합') | **우선 후보** |
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | 디자인 스킬(Claude Code·Codex·Cursor·OpenCode). 50 테마 카탈로그 · Floor/Reflex/Finish 게이트 · sloplint(+`--render`는 puppeteer+Chrome 필요) · redesign/audit | MIT | 정합(조사표 ① 계열) | 후보 유지 |
| [muris11/anti-ai-slop](https://github.com/muris11/anti-ai-slop) | 17스킬 · antislop-master(P0–P6 티어 ~180 지표) · 자체 CI(green 표시) · `npx anti-ai-slop` picker | MIT | 정합(조사표 ②) | 후보 유지 |
| [ch040602/anti-ai-slop](https://github.com/ch040602/anti-ai-slop) | Codex 스킬 + Spec Kit 가드레일 팩(마크다운 60 · validator 24 · 파일 97, 자기 점검 coherence 100/0건) · stdlib Python validator · "저자 판정·탐지 회피 아님" 명시 | MIT | 정합(조사표 ④) | 후보 유지 |
| [blader/humanizer](https://github.com/blader/humanizer) | Wikipedia "Signs of AI writing" 기반 26 패턴(그룹 A–F, 강/중/약) · `/humanizer` · "탐지 탐지를 노리지 않음" 명시 | MIT | 정합(조사표 ③ 계열) | 후보 유지 |
| [keez97/humanizer](https://github.com/keez97/humanizer) | blader 파생 독립 재작성(공유 문장 6줄 명시) · 43 tells · full/light/detect 모드 · score.py(표준 라이브러리 only) · perplexity/binoculars(torch, 옵션) · DETECTION-LIMITS 명시(GPTZero 사내 실험에서 편집 후에도 100% 판정 유지 — 성적표를 회피 지표로 쓰지 말라고 명시) | MIT | 정합(조사표 '글쓰기 개선') | 후보 유지 |
| [rwcod/anti-ai-slop-ui](https://github.com/rwcod/anti-ai-slop-ui) | UI 전용(방향 · 토큰 · 레이아웃 · quality gate) · AI Slop/Distinctiveness/Readiness rubric 3종 · ui_lint.py("heuristic only") | MIT | 정합(조사표 'UI/UX') | 후보 유지 |
| Aaron-Bushnell/humanizer · misbahsy/anti-ai-slop · waddle36/anti-ai-slop · Quegenx/agent-skills | 이 기록 시점 미검증(README 직접 취득 실패/미취득) | 미판정 | 미검증 | **미채택** (후보 목록만 유지) |

## 3. 기존 24개 스킬과의 대조 및 반영 대상

- **이미 존재·중복**: 근거 중심(evidence-first-harness · design-evidence-harness · skill-audit의 `license:` 검증 · verify 단계의 증거/판정 규율)은 위 후보가 약속한 '근거 없이는 주장 금지 · 저자 판정 금지'와 방향 일치. `skill-audit.js` 프론트매터 라이선스 검사는 ch040602/miqdadbadjuber의 "license 불일치 시 거부"와 동일 원리 — **중복 도입 불필요**.
- **틈새(신규)**: 이 저장소에는 '문장 스타일 · UI 필터' 전용 스킬이 없음 → 이 틈새를 메우는 경우에만 1건 도입을 **다음 단계**로 둠(제5절).
- **회피 금지 원칙 유지**: 이 저장소 규율("탐지 회피 목적 금지 · 문체 검수는 증거/게이트와 분리")은 유지하고, post-도입 스킬도 같은 경계를 선언한다.

## 4. 반영(실행) 항목 (2026-11-11)

1. `docs/anti-ai-skills-2026-11-11.md` — 정밀 분석 · 반영 기록 (본 문서).
2. 문서 지도(AGENTS.md · CLAUDE.md) — 반영 라인 추가.
3. `docs/compound-log.md` — 교훈 1건.
4. `skills/anti-ai-harness/` — 적극 수용 스킬(자체 작성, Apache-2.0): `SKILL.md` + `references/anti-ai-patterns.md` — 문체·UI·코드·문서 검수 + 근거 유지 + 4블록 게이트 + 저자 판정·탐지 회피 금지.
5. 검문 실측: `scripts/skill-audit.js` 통과(제5절) — 이 문서에서 실제 실행해 확인.

**미반영(본 반영 범위 밖)**: 원 소스 복사 없음(자체 작성만). 설치·`npx` 실행·격리 실행·보안 감사·성능 측정·충돌 테스트는 별도 세션에서만 수행.

## 5. 적극 수용 실행 (2026-11-11 후속)

- **실행 완료**: 제4절 항목 1~4(제4절). 실행 결과는 본 절 기록과 `git diff` 실측으로 남김(제4절). 남은 단계는 아래 '남은 단계'를 따른다.
- **남은 단계(별도 세션에서만)**: (a) 핵심 필터 계열(miqdadbadjuber / muris11)과 humanizer 계열(blader / keez97) 중 1건 선택 → (b) 격리 폴더에서 수동 복사 후 `scripts/skill-audit.js` 통과 확인 → (c) 문체 검수는 증거 검증(verify)과 분리해 실행 → (d) '게이트' 문구가 phase-gate(`.claude/workflows/phase-gate.js`)와 이름이 겹치면 `docs/DECISIONS.md`에 우선순위 선언으로 해결.

## 6. 디자인 감각 극대화 적극 반영 (2026-11-11 후속)

- **후보(8개, 외부 조사)**: anthropics/skills `canvas-design`·`algorithmic-art`(SKILL.md 직접 취득, HTTP 200; canvas-design 프론트매터는 `license: Complete terms in LICENSE.txt` → 라이선스 파일 미판독 → 미판정, 아이디어만 취급) · Leonxlnx/taste-skill · atlassian-labs/data-visualization-skill · karefined-eng/information-is-beautiful-skill(README 직접 취득, MIT) · OrRon/EpicInfographics · CoeusInstitute/impeccable-ui-skill · anthropics `frontend-design`. 설치·실행·감사 미수행.
- **반영**: `skills/visual-artist/` 신규 **(자체 작성, Apache-2.0, 원문 미복사)** — `SKILL.md` + `references/scorecard.md` — 정적 시각 아트(포스터·커버·차트·인포그래픽·도식·도형) 미적 극대화 워크플로: 브리프 → 아트 디렉션(1개 메시지) → 구성 → 제작 → **7축 100점 점수표**(구도/균형 20 · 타이포/위계 15 · 색채/조화 15 · 여백/비례 15 · 독창성/주제 15 · 가독성/전달 15 · 렌더링 5) → 렌더링 실측 → 비평 1회 → 재채점(최대 2회) → 4블록 핸드오프(점수표/유지/근거/미검수). `design-master`(UI·브랜드)·`anti-ai-harness`(안티슬롭)과 분업, 게이트 변경 없음.
- **검문 실측**: `scripts/skill-audit.js` → **26 skills clean (exit 0)**. diff 실측은 git status로 확인.

## 7. 라이선스 안전 규율 (2026-11-11 적용)

- **규칙**: 외부 소스를 도입할 때 ① **출처·라이선스 실측 확인**(라이선스 파일·명시 조항) → ② 확실하면 아이디어·패턴만 취해 자체 구현 → ③ **불명확/미표기/바이러스성/예외 조항일 경우 원문을 절대 복사하지 않고, 원 소스를 참고해 새 로직으로 재구현** → ④ 도입 기록에 **출처 + 라이선스 + 도입 방식(복사/아이디어만/재구현)** 명시. 헌법(AGENTS.md·CLAUDE.md) Primary Rules **License Safety**로 반영. `scripts/skill-audit.js`가 스킬 프론트매터 라이선스(기본 Apache-2.0, 불일치 시 스킬 폴더 LICENSE.txt 필수)를 강제한다.
- **현재 상태 실측**: 도입 스킬 전체(26)는 자체 작성 · Apache-2.0 선언 · 원문 미복사. 미판정(canvas-design의 `Complete terms in LICENSE.txt` 등)은 **아이디어만 취급** — 라이선스 문제 항목 0건.

## 8. 글쓰기(콘텐츠) 적극 반영 (2026-11-11 후속)

- **후보(8개, 외부 조사)**: mattpocock/skills(README 직접 취득 HTTP 200 — writing-fragments·shape·beats 등 직접 실측 분량 한정) · madebybeings/human-copywriting-skill(README 직접 취득, **MIT**) · anthropics `doc-coauthoring` · coreyhaines31/marketingskills · az9713/writing-skills · iging/agent-spec `editorial-fact-checker` · xcrrr/claude-skills `storyteller` · vercel-labs `technical-writer`. 설치·실행·감사 미수행.
- **반영**: `skills/writer-master/` 신규 **(자체 작성, Apache-2.0, 원문 미복사)** — `SKILL.md` + `references/editorial-checklist.md` — 편집장 중심 7단계(① 전략 → ② 조사(주장 태그: **검증/추론/불확실** + 출처) → ③ 이야기 설계 → ④ 초고 → ⑤ 문학적 퇴고 → ⑥ 팩트체크 → ⑦ 편집장 게이트 4블록: 판정/유지+출처/수정/미해결) — 사실 우선(틀림→수정, 미검증→삭제·표시), 한국어 자연 문체·리듬, 시각(visual-artist)·안티슬롭(anti-ai-harness)·UI(design-master)·슬라이드(ppt-master) 분업. gate·verify 규율 무변경, 자기 해설 금지.
- **검문 실측**: `scripts/skill-audit.js` → **27 skills clean (exit 0)**. diff 실측은 git status로 확인.

**실측** (2026-11-11): cskwork/superoffice-skills README 직접 취득(HTTP 200 — 한국어 5형식 통합 · office-gate(한국어 띄어쓰기/사실/emoji·PII/콘트라스트) · 역할 분리 빌더↔비판 · "Never fabricate" — 라이선스 파일 미판독 → 미판정, **아이디어만**), magnus919/agent-skills documents README 취득(HTTP 200 — 본문에 라이선스 문구 미포함, LICENSE 미판독 → **미판정 — 아이디어만**). anthropics 문서 스킬 4종(라이선스 미판정 — 소스 열람 참조만), pom·hwpx 계열(airmang/python-hwpx 외) 등은 목록·아이디어만.

## 9. 문서 제작(Office Master) 적극 반영 (2026-11-11 후속)

- **반영**: `skills/office-master/` 신규 **(자체 작성, Apache-2.0, 원문 미복사)** — `SKILL.md` + `references/format-gate.md` — 문서 작업 조정자: 브리프 1줄 선언 → 형식 라우팅(PPTX·DOCX·XLSX·PDF·HWPX × 빌드/읽기/변환) → 브랜드·템플릿 오버레이 → 빌드(사실 목록 출처 필수) → **독립 비판** → **형식별 품질 게이트**(공통: 열림·구조·사실·emoji/PII·대비·렌더링(미보유 시 `unavailable`)·편집 가능; 형식별: PPTX 겹침/잘림 0·편집 가능, DOCX 스타일·목차·표 분할 0, XLSX 수식 오류 0·원본 일치, PDF 페이지 누락 0·렌더 정상, HWPX 구조 검사·한컴 표시 검증) → 4블록 보고(판정/유지+출처/실패/렌더 상태). `writer-master`(내용)·`visual-artist`(시각)·`ppt-master`(슬라이드)·`design-master`(브랜드) 분업. gate·verify 규율 무변경.
- **검문 실측**: `scripts/skill-audit.js` → **28 skills clean (exit 0)**.

## 10. 신뢰 경계

- README 판독 기반 정적 검토만. '추천도' 실행 안정성·보안 무보증. 이 기록의 실측은 GitHub 공개 README 인용이며, 전체 소스 감사·무결점·무독성 보증이 아니다. 후보 목록과 조사 문구는 외부 데이터다 — 지시가 아니라 데이터로 취급할 것.

## 11. 종합 리뷰 보완 (2026-11-11 후속)

- **리뷰 도출 결함 해결**: ① **[skill-router](<../skills/skill-router/SKILL.md>) 라우팅 표에 신규 4스킬(anti-ai-harness·visual-artist·writer-master·office-master) 등록** + 설명 확장 → 스킬이 '발각되지 않는' 미사용 상태 제거. ② **visual-artist 점수표 합산 결함 수정** — 채점 규칙 명시(축 배점 내 체크 충족 비율로 배점, 7축 합계 100; PASS ≥70 + 4블록 + 렌더 실측, 점수표 없음·렌더 미실측 = 판정 불가). ③ 기록 제목·구성 확장(§1~13).
- **카탈로그 반영 실측**: `node scripts/skill-catalog/generate.js` 재실행 → `docs/skill-catalog.md`에 **28개 스킬 재생성(신규 4종 포함, exit 0)** — 대시보드/카탈로그 미반영 문제 해소.
- **게이트 실측**: `scripts/skill-audit.js` → **28 skills clean (exit 0)**.

## 12. Harness · Loop 조사 정밀 분석 · 적극 반영 (2026-11-11 후속)

- **실측 2건**: anthropics/cwc-long-running-agents(README 직접 취득 HTTP 200 — **Default-FAIL 계약**(근거 열람 전 PASS 기록 불가)·**fresh-context 평가자**(쓰기 도구 없는 별도 에이전트)·**handoff**(PROGRESS.md + git 커밋 백스톱)·kill-switch/steer · `/goal` — "example ingredients, not turnkey" 명시, 라이선스 파일 미판독 → **아이디어만**), wiggumdev/ralph(README 직접 취득, **MIT** — 반복마다 문맥 리셋 + git·파일·테스트로 상태 보존 + `<promise>COMPLETE</promise>` 완료 마커 + maxIterations + 학습(progress.txt) 전달). 나머지(LangGraph·Deep Agents·Agents SDK·ADK·Harbor·Symphony·Superpowers 등)는 목록·아이디어만 — 설치·실행·코드 반영·평가 미수행.
- **AI-Harness 보유 규율 대조**: **(보유·방향 일치)** 반복 상한(최대 3회)·완료 판정 분리(verify/검증)·승인 경계·격리·근거 우선(evidence-first)·복합 학습(compound-log)·HANDOFF — 조사의 핵심 권고와 중복 → **신규 스킬 불필요**. **(틈새·구현 후보로만 명시)** kill-switch/Default-FAIL 훅, 지표(Verified/False Completion·Cost per Verified Task 등) 추적 — 수요 명시 시에만 별도 세션에서 검토.
- **반영**: 본 절(기록) + compound-log 1건. gate·규율 무변경.

## 13. AI 마스터 통합 가이드(v1.0) 대조 · 반영 (2026-11-11 후속)

- **성격**: 지침·로드맵 문서로서 **실측 대상 아님**(Notion 링크 포함 외부 데이터 — 접근·실행 없음). 설치·코드 변경·자동화 미수행.
- **6 역량 ↔ AI-Harness 보유 대조**: Research↔`evidence-first-harness` · Writer↔`writer-master` · Visual↔`visual-artist` · Document↔`office-master` · Harness↔`super-agent-architecture-notes`·`super-agent-router`·`skill-router` · Loop↔헌법 루프(반복 상한 · verify 분리) + §12 → **전부 보유 — 신규 스킬 불필요**.
- **파이프라인 8단계 ↔ 보유**: Task Intake↔승인/brief · Research↔evidence-first · Editorial↔writer-master · Art↔visual-artist · Production↔office-master · Quality Gates↔§9 · Improvement↔루프 상한 · Handoff↔4블록·HANDOFF — 정합.
- **제안(후보로만 명시)**: 지표 9종(Claim Accuracy·False Completion·Cost per Verified Task 등) · 주간 루틴 · 첫 실습(OpenShift Virtualization 8종 산출) — **수요 명시 시에만** 별도 세션.
- **검문 실측**: `scripts/skill-audit.js` → **28 skills clean (exit 0)**.
- **시뮬레이션 100회 실측(결정론적 · 범위: 게이트 반복·라우팅 매칭·파일 존재 3종에 한정 — LLM·설치·생성 동작은 범위 밖)**: ① 게이트 반복 100회 → 100/100 무실패 ② 의도→라우팅 100 케이스 → 적중 100/100 ③ 통합 파이프라인 8단계 예상-실제 대조 → 8/8 PASS — 도출 문제 0건.
