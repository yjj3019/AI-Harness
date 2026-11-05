# AI-Harness

장시간 안전한 Code Agent 워크플로를 위한 **AI Harness Engineering** 패키지입니다.

이 저장소는 Gemini 노트북 소스와 Anthropic, Geoffrey Huntley, Superpowers, Karpathy 스타일 CLAUDE.md, 다중 에이전트 오케스트레이션 시스템 등 외부 자료를 종합하여 만들었습니다.

> **English**: [README.en.md](./README.en.md)

## 왜 Harness Engineering인가?

코드 에이전트가 장시간 작업할 때는 모델의 능력뿐 아니라 이를 뒷받침하는 “하네스(harness)”도 중요합니다. 하네스는 에이전트가 경로를 이탈하지 않고 안전하게 작업하도록 만드는 규칙, 피드백 루프, 도구, 컨텍스트 관리, 검증 시스템입니다.

**정확한 정의**: 하네스는 Code Agent와 *직접 연관된* 도구·규칙·행동으로 구성됩니다.  
예: `CLAUDE.md` 규칙, 독립 검증 에이전트, 증거 게이트, compound learning log.  
IDE 안정성, 하드웨어, 사용자 마음가짐 등 일반적인 안전 조치는 포함하지 않습니다. Skill이나 MCP도 Agent 동작을 제약하거나 검증할 때만 하네스의 일부가 됩니다.

하네스 없이 자주 발생하는 실패:
- 조기 “완료” 선언 (증거 없는 done 선언)
- Context Anxiety (컨텍스트 용량 ~70% 초과 시 일관성 저하)
- 자기 평가 편향 (Self-assessment bias)
- 과잉 엔지니어링 및 범위 이탈
- 세션 간 진행 상태 손실

개발자 역할은 코드를 직접 쓰는 것에서 에이전트가 안전하게 동작할 수 있는 시스템을 설계하는 것으로 변화합니다.

## 핵심 원칙

1. **Index-Only Constitution** — `CLAUDE.md`는 ~100줄 이내로 유지. 상세 내용은 `docs/`로 분리.
2. **No One-Shot** — 명확한 완료 기준을 가진 Phase/Sprint로 분할.  
   각 Phase는 **독립적으로 실행 가능**하고 **사람이 직접 테스트**할 수 있어야 하며, 완료 기준은 관찰 가능한 증거(아티팩트, 로그, UI 상태, 테스트 출력)여야 합니다.
3. **Ralph Wiggum Loop** — `coding → test → verify → review → compound` 자율 사이클. FAIL 또는 [BLOCKING] 시 재시도 (최대 3회).
4. **독립 평가자** — 코딩과 평가를 독립된 컨텍스트 창에서 실행하여 자기 평가 편향 제거.
5. **객관적 검증** — Playwright MCP, DevTools, 로그, 테스트 러너 사용. 주관적 코드 읽기 금지.
6. **복리화 학습** — 모든 작업 전 `docs/compound-log.md` 읽기 강제.
7. **Context Reset & Hand-off** — 컨텍스트가 참히면 `docs/HANDOFF.md`로 상태를 넘기고 새 세션 시작.
8. **Surgical Changes & Simplicity** — 필요한 것만 수정. 최소 견고한 솔루션 선호 (Karpathy 스타일).

## 선택형 보고서 편집

보고서·PR 설명을 다듬을 때만 [evidence-preserving-editor](skills/evidence-preserving-editor/SKILL.md)를 명시적으로 사용할 수 있습니다. Humanizer에서 참고한 명료한 문장·중복 제거 원칙에 사실 보존을 우선합니다. 수치·skip·불확실성·검증 범위와 코드·명령·링크는 보존하며, 실행·권한·증거 게이트는 변경하지 않습니다. 전역 설치나 자동 실행은 하지 않습니다.

예: “evidence-preserving-editor 지침에 따라 이 보고서 문장만 편집하고, 검증 한계와 수치는 유지해줘.”

[평가 사례](docs/report-editing-cases.json)는 합성 fixture이며 사람 또는 별도 승인된 모델 평가용입니다. CI는 패키지 구조와 사례 정합성만 검사하며 재작성 품질이나 의미 동등성을 보증하지 않습니다.

### 로컬 비교 평가와 변이 테스트 (선택형)

[로컬 평가 PoC 안내](docs/local-evaluation-poc.md)는 외부 모델이나 추가 패키지 없이 사용하는 두 도구를 설명합니다.

- **블라인드 패킷 준비**: [offline-review.js](scripts/offline-review.js)는 미리 준비한 두 후보의 JSON 출력으로 사례별 A/B 검토 패킷과 별도 비공개 대응표를 만듭니다. 자동 채점이나 모델 호출은 하지 않습니다. 배정 seed와 방식은 비공개 대응표에 기록되며 동일 입력과 seed로 배정을 재현할 수 있습니다. 후보 출처·의미 보존·비용·행동 증거와 독립 평가·블라인드 유지는 별도로 확인하고 [평가 프로토콜](docs/report-editing-evaluation.md)을 따르세요.
- **표적 변이 PoC**: `node scripts/mutation-probe.js`는 테스트 요약 파서의 세 변이를, `node scripts/gate-mutation-probe.js`는 게이트의 트리 비교·명령 고정·해시 체인 변이를 임시 복사본에서 검사합니다. StrykerJS 설치 없이 수동 실행하며 전체 게이트나 보안을 인증하지 않습니다. 임시 디렉터리는 샌드박스가 아닙니다.

두 도구 모두 실제 모델의 효과나 운영 환경을 검증한 결과가 아닙니다. [호스트 격리 검증 계획](docs/host-verification-plan.md)은 사전 승인·대조군·복구를 요구하는 미실행 계획입니다. 사용 전 안내 문서의 개인정보·권한·검증 한계를 확인하세요.

### 선택형 작업 계약·그래프·평가 집계

외부 프레임워크 없이 사용할 수 있는 독립형 도구입니다. [작업 계약](docs/task-contract.md)은 목표·범위·산출물·제약의 형식만 검증하고, [작업 그래프](docs/task-graph.md)는 선언된 의존성과 상태를 분석하며 선택적으로 동일 범위 라벨의 충돌을 경고합니다. [평가 집계](docs/evaluation-accounting.md)는 미검증·미완료 결과를 포함해 분모를 계산하며, [쌍별 평가 진단](docs/paired-evaluation.md)은 선언된 baseline·candidate 결과를 케이스별로 집계합니다. 이 진단의 결과는 입력 선언의 산술적 분류일 뿐 실제 성능 개선이나 후보 채택을 증명하지 않습니다. 어느 도구도 작업을 실행하거나 권한·격리·예산을 강제하지 않으며 입력의 진실성이나 독립적 검증을 보증하지 않습니다. 기존 Phase 게이트에 자동 통합되지 않습니다. [DeepSeek Harness 협업 절차](docs/deepseek-team-workflow.md)는 Team·Subagent의 작업 상태와 독립 Phase 증거를 구별하는 선택형 가이드입니다.

제공된 13개 저장소의 기능·루트 라이선스·적용 한계는 [하네스 최적화 검토](docs/harness-optimization-review-2026-11-02.md)에 고정 커밋별로 정리했습니다. 자동 최적화 도구를 설치하거나 외부 모델을 실행한 결과는 아닙니다.

## 선택형 디자인 검증 스킬

[design-evidence-harness](skills/design-evidence-harness/SKILL.md)는 사용자가 명시적으로 요청할 때 적용하는 디자인·산출물 검증 절차입니다. 기존 브랜드와 요청한 산출물 형식을 우선하고, HTML 상호작용·편집 가능한 PPTX·차트·동영상 등은 해당 형식에 맞게 검증합니다. 검사할 수 없는 항목은 미검증으로 보고합니다. 원본 [huashu-design](https://github.com/alchaincyf/huashu-design/tree/4fc7bfdbd5ec3fa2d43ce7a6433de60976a5e4b1)의 MIT 고지를 포함하며 원본 자산·스크립트는 가져오지 않았습니다.
- [Design Master](skills/design-master/SKILL.md) — 최고 품질 UI·브랜드·시각 시스템 워크플로 (아트 디렉션, 안티슬롭, 시각 QA).
- [Document Master](skills/document-master/SKILL.md) — 최고 품질 문서 작성 워크플로 (독자·작업, Diátaxis, 출처, 평문).
- [Coding Master](skills/coding-master/SKILL.md) — 최고 품질 코딩 워크플로 (스펙 우선, TDD, 증분 슬라이스, 다축 리뷰, 증거 기반 완료).
- [Debugging Master](skills/debugging-master/SKILL.md) — 최고 품질 디버깅 워크플로 (재현 우선, 가설 주도, 회귀 테스트).
- [Security Master](skills/security-master/SKILL.md) — 최고 품질 보안 워크플로 (입력 검증, 비밀 관리, 증거 기반 발견).
- [Observability Master](skills/observability-master/SKILL.md) — 최고 품질 관측성 워크플로 (로그·메트릭·트레이스, 비밀 로깅 금지).
- [Performance Master](skills/performance-master/SKILL.md) — 최고 품질 성능 워크플로 (측정 우선, before/after 증거).
- [Skill Router](skills/skill-router/SKILL.md) — 의도별 마스터 스킬 라우팅.
- [Skill Eval](skills/skill-eval/SKILL.md) — 스킬 트리거 및 효과 평가.
- [Skill Composition](skills/skill-composition/SKILL.md) — 여러 스킬 조합 가이드.
- [Browser Evidence](skills/browser-evidence/SKILL.md) — 브라우저·E2E 증거 캡처.
- [Skill Audit](skills/skill-audit/SKILL.md) — 외부 스킬 보안 감사.
- [Compound Feedback](skills/compound-feedback/SKILL.md) — 스킬 사용 결과 compound-log 기록.
- [API Design](skills/api-design/SKILL.md) — 계약 우선 API·인터페이스 설계.
- [Deterministic Kernel](skills/deterministic-kernel/SKILL.md) — 결정적 상태 전이 (decide + log replay).
- [Card Handoff](skills/card-handoff/SKILL.md) — 카드로 판단 요청 후 동일 컨텍스트 재개.
- [Event Boundary](skills/event-boundary/SKILL.md) — 이벤트는 데이터, 라우팅은 규칙.
- [Recipe + Skill](skills/recipe-skill/SKILL.md) — 트리거와 처리 매뉴얼 쌍.

- [Skill Catalog](docs/skill-catalog.md) — 스킬 목록 자동 생성 (`node scripts/skill-catalog/generate.js`).
- [Dashboard](dashboard/index.html) — Phase 증거 정적 대시보드.







예: “`skills/design-evidence-harness/SKILL.md`를 읽고 이 PPTX의 편집성과 화면별 레이아웃을 검증해줘.” 저장소의 `skills/`는 Claude Code의 네이티브 스킬 자동 등록 경로가 아니므로 이 예처럼 파일을 명시해 호출합니다. Codex가 해당 스킬을 지원 경로에서 읽는 경우에만 자동 호출 비활성화 설정이 적용됩니다. 별도 호스트에 수동으로 설치한 경우의 자동 호출 여부는 해당 호스트 설정에 따릅니다.
- [Design Master](skills/design-master/SKILL.md) — 최고 품질 UI·브랜드·시각 시스템 워크플로 (아트 디렉션, 안티슬롭, 시각 QA).
- [Document Master](skills/document-master/SKILL.md) — 최고 품질 문서 작성 워크플로 (독자·작업, Diátaxis, 출처, 평문).
- [Coding Master](skills/coding-master/SKILL.md) — 최고 품질 코딩 워크플로 (스펙 우선, TDD, 증분 슬라이스, 다축 리뷰, 증거 기반 완료).
- [Debugging Master](skills/debugging-master/SKILL.md) — 최고 품질 디버깅 워크플로 (재현 우선, 가설 주도, 회귀 테스트).
- [Security Master](skills/security-master/SKILL.md) — 최고 품질 보안 워크플로 (입력 검증, 비밀 관리, 증거 기반 발견).
- [Observability Master](skills/observability-master/SKILL.md) — 최고 품질 관측성 워크플로 (로그·메트릭·트레이스, 비밀 로깅 금지).
- [Performance Master](skills/performance-master/SKILL.md) — 최고 품질 성능 워크플로 (측정 우선, before/after 증거).
- [Skill Router](skills/skill-router/SKILL.md) — 의도별 마스터 스킬 라우팅.
- [Skill Eval](skills/skill-eval/SKILL.md) — 스킬 트리거 및 효과 평가.
- [Skill Composition](skills/skill-composition/SKILL.md) — 여러 스킬 조합 가이드.
- [Browser Evidence](skills/browser-evidence/SKILL.md) — 브라우저·E2E 증거 캡처.
- [Skill Audit](skills/skill-audit/SKILL.md) — 외부 스킬 보안 감사.
- [Compound Feedback](skills/compound-feedback/SKILL.md) — 스킬 사용 결과 compound-log 기록.
- [API Design](skills/api-design/SKILL.md) — 계약 우선 API·인터페이스 설계.
- [Deterministic Kernel](skills/deterministic-kernel/SKILL.md) — 결정적 상태 전이 (decide + log replay).
- [Card Handoff](skills/card-handoff/SKILL.md) — 카드로 판단 요청 후 동일 컨텍스트 재개.
- [Event Boundary](skills/event-boundary/SKILL.md) — 이벤트는 데이터, 라우팅은 규칙.
- [Recipe + Skill](skills/recipe-skill/SKILL.md) — 트리거와 처리 매뉴얼 쌍.

- [Skill Catalog](docs/skill-catalog.md) — 스킬 목록 자동 생성 (`node scripts/skill-catalog/generate.js`).
- [Dashboard](dashboard/index.html) — Phase 증거 정적 대시보드.







이 스킬은 지침이며 렌더러나 권한 강제가 아닙니다. 로컬 패키지 검사는 실제 시각 품질·모델 동작을 인증하지 않습니다.

## 선택형 문서 변환 계약

PDFMathTranslate 분석을 바탕으로 [문서 변환 계약](docs/document-jobs.md)과 [오프라인 manifest 검사기](scripts/document-job.js)를 추가했습니다. 파일 읽기·출력 쓰기·외부 텍스트 전송·캐시·자산/패키지 준비를 분리하며, 입력별 누락·부분 실패·수식 토큰 누락/중복·미검증 결과를 전체 성공으로 집계하지 않습니다.

검사기는 JSON 선언의 일관성만 확인합니다. 번역 엔진·실행기·권한 강제·실제 PDF/해시/시각 품질 검증은 포함하지 않습니다. 설치·유료 호출·PDF 업로드는 자동 실행하지 않습니다.

## 디렉토리 구조

```
AI-Harness/
├── AGENTS.md                          # Codex / multi-host 공유 헌법 (핵심 규칙)
├── CLAUDE.md                          # Claude Code용 (AGENTS.md import 권장)
├── README.md                          # 이 파일 (한글, 기본)
├── README.en.md                       # 영문 버전
├── skills/                            # 포터블 Agent Skills (SKILL.md)
├── docs/
│   ├── architecture-spec.md            # 전체 종합 명세
│   ├── external-patterns.md            # 외부 저장소에서 추출한 보편 패턴
│   ├── usage-scenarios.md              # 시나리오별 적용 가이드
│   ├── ppt-harness-workflow.md         # PPT/오피스 문서 제작 하네스
│   ├── DETAIL_SPEC.md                  # 요구사항 템플릿
│   ├── PHASES.md                       # 단계별 체크리스트
│   ├── HANDOFF.md                      # 세션 핸드오프 상태
│   ├── compound-log.md                 # 축적 교훈 로그
│   ├── DECISIONS.md                    # 설계 결정 기록
│   └── SUPPLEMENTS.md                  # 현황 분석, 결함, 보강 저장소 맵
├── tests/                              # 훅·게이트·패키지 회귀 (현재 건수는 실행 출력 참조)
├── .github/workflows/ci.yml            # 위 검증을 CI에서 실행
├── .gitattributes                      # .sh·.js는 LF 고정 (Windows 체크아웃에서도 CI와 동일)
├── .mcp.json.example                   # Playwright MCP 예시 (활성화는 .mcp.json으로 복사)
├── .claude/settings.unattended.example.json  # 무인 실행용 샌드박스 설정 예시
└── .claude/
    ├── settings.json                   # 훅·권한
    ├── required-test-command.json      # attestation이 쓸 수 있는 테스트 명령 고정
    ├── agents/
    │   ├── coding.md
    │   ├── test.md
    │   ├── verify.md
    │   ├── review.md
    │   └── compound.md
    ├── commands/
    │   └── phase-harness.md            # /phase-harness <id> 루프 오케스트레이터
    ├── hooks/
    │   ├── block-destructive.sh        # 파괴적 명령 차단
    │   ├── evidence-guard.sh           # 서브에이전트의 증거 쓰기 제한 (settings.json에 등록)
    │   └── read-tracker.sh             # verify 에이전트의 증거 열람 기록
    └── workflows/
        └── phase-gate.js               # 증거 기록·검사
```

## Ralph Wiggum Loop

심슨즈 캐릭터 Ralph Wiggum의 이름을 딴 자율 반복 루프입니다. Geoffrey Huntley가 2025년에 제안한 간단한 bash 루프입니다:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

Anthropic은 이를 공식 `ralph-wiggum` Claude Code 플러그인으로 포장했고, `/loop`, `/goal`, `/batch` 등 내장 프리미티브를 추가했습니다.

**핵심**: 진행 상태는 모델 컨텍스트가 아니라 파일과 git 히스토리에 남습니다. 각 반복은 새로운 컨텍스트로 시작할 수 있습니다.

이 하네스에서는 5개 전문 서브에이전트로 구성됩니다:

| 단계 | 에이전트 | 역할 | 실패 시 |
|------|----------|------|---------|
| 1 | coding | 현재 Phase 구현 | — |
| 2 | test | 객관적 동적 테스트 (Playwright, CLI) | FAIL → coding |
| 3 | verify | 체크리스트 vs 아티팩트 검증 | FAIL → coding |
| 4 | review | 정적 분석 ([BLOCKING]/[NIT]) | [BLOCKING] → coding |
| 5 | compound | 교훈을 compound-log.md에 추가 | — |

Phase당 최대 3회 재시도.

## 관련 패턴 및 프레임워크

### Anthropic Effective Harnesses
- **Initializer + Coding Agent** (2025.11): 첫 세션에서 환경을 스캐폴딩(feature list, progress 파일, git). 이후 세션은 한 기능씩 증분 진행 후 명확한 아티팩트를 남김.
- **Generator-Evaluator** (2026): GAN 영감. Planner가 스펙 확장, Generator가 구현, Evaluator가 독립적으로 평가 (Playwright 활용). 외부 평가가 자기 평가보다 우수.

### Superpowers (obra/superpowers)
가장 널리 사용되는 에이전트 스킬 프레임워크. 강제 워크플로:
- 브레인스토밍 → 디자인 확인
- 작은 검증 가능 태스크로 계획 작성
- TDD (구현 전 테스트 실패 확인)
- 서브에이전트 기반 개발 + 각 태스크 사이 리뷰
- 체계적 디버깅 및 완료 전 검증

### Karpathy 스타일 가이드라인
최소한 `CLAUDE.md`(원래 ~65줄)가 매우 큰 인기를 끌었습니다:
1. Think Before Coding — 가정과 모호성 명시
2. Simplicity First — 문제를 풀 최소 코드
3. Surgical Changes — 필요한 부분만 수정
4. Goal-Driven Execution — 성공 기준 정의 후 검증

### 다중 에이전트 오케스트레이션
Oh My Claudecode / Oh My Opencode 등은 개별 하네스 패턴 위에 Team, Autopilot, Ralph, Ultrawork 모드 등 고위 오케스트레이션을 제공합니다.

## 빠른 시작

**Multi-host**: 공유 핵심 규칙은 `AGENTS.md`에 있습니다. Claude Code는 `CLAUDE.md`에서 `@AGENTS.md`를 우선 로드하도록 권장합니다. 자세한 균형 맞추기는 [docs/multi-host-balancing.md](docs/multi-host-balancing.md)를 참고하세요.

1. `AGENTS.md` (또는 Claude Code면 `CLAUDE.md`) 읽기.
2. `docs/compound-log.md` 검토.
3. `docs/PHASES.md`에 단계 정의, `docs/DETAIL_SPEC.md`에 요구사항 작성.
4. `/phase-harness <phase-id>`로 Phase 실행. 완료 판정은 `node .claude/workflows/phase-gate.js check <phase-id> --require-bound-tree`.
5. 컨텍스트가 저하되면 `docs/HANDOFF.md`에 상태를 기록하고 새 세션 시작.

## 다른 프로젝트에 적용하는 방법

이 저장소의 패턴을 새 프로젝트에 이식할 때 권장 순서입니다.

### 최소 적용 (1시간 내)

1. 프로젝트 루트에 `CLAUDE.md`를 두고 다음만 명시합니다.
   - 작업 전 `docs/compound-log.md` 읽기
   - 완료 주장 전에 증거 필요
   - Phase는 독립적으로 실행·사람이 확인 가능해야 함
2. `docs/PHASES.md`를 만들고 각 Phase를 다음 기준으로 작성합니다.
   - 한 번에 사람이 직접 돌려볼 수 있는 크기
   - 체크리스트 항목이 관찰 가능한 증거로 확인 가능
3. 이식 시 `.claude/workflows/phase-gate.js`, `.claude/workflows/test-summary.js`, `scripts/context-contract.js`, `.claude/commands/phase-harness.md`와 필요한 에이전트·설정을 함께 검토합니다. 증거는 직접 쓰지 않고 `phase-gate.js`의 `run`·`record`로 남깁니다. `check`는 누락되거나 검증 조건에 맞지 않는 증거를 거부하지만, 해시 체인은 같은 권한을 가진 작성자에 대한 인증이나 OS 격리가 아닙니다.
   ```bash
   node .claude/workflows/phase-gate.js run 1 test --require-test-summary --require-bound-tree -- npm test
   node .claude/workflows/phase-gate.js check 1 --require-bound-tree
   ```

### Default-FAIL 계약 추가 (권장)

기능/스토리별로 기본값을 `false`로 두는 파일을 만듭니다.

```json
{
  "US-001": { "passes": false },
  "US-002": { "passes": false }
}
```

- 에이전트가 이 파일을 `true`로 바꾸려면 먼저 증거 파일을 열어야 합니다.
- 검증 에이전트는 Write/Edit 권한이 없는 별도 컨텍스트에서 실행합니다.

### Forced Lifecycle (Superpowers 방식)

새 기능을 시작할 때 순서를 강제합니다.

1. **의도 확인** — 질문으로 요구사항을 구체화 (코드 작성 전)
2. **계획 작성** — 2~5분 단위 태스크 + 정확한 파일 경로 + 수락 기준
3. **TDD** — 실패하는 테스트 먼저 작성
4. **독립 리뷰** — 구현 에이전트와 분리된 컨텍스트
5. **검증 후 완료 선언** — 실제 명령 실행 결과를 확인한 뒤에만 “완료”

### 프로젝트 유형별 우선순위

| 유형 | 우선 적용 | 이유 |
|------|-----------|------|
| 웹/앱 | Default-FAIL + Fresh-context evaluator + Playwright 증거 | UI 깨짐을 스스로 못 봄 |
| 백엔드/API | TDD + 테스트 러너 backpressure | 컴파일러·테스트가 강한 되먹임 |
| 문서/PPT | 샘플 3장 게이트 + 결론형 타이틀 + 시각 QA | 한 번에 전체 생성 시 수정 비용 큼 |
| 장기 자율 실행 | Agent-maintained handoff + 작은 스토리 | 컨텍스트 리셋이 필수 |

### 주의점

- 한 번에 다 넣지 마세요. 먼저 “증거 없으면 FAIL”과 “Phase를 작게”만 적용해도 효과가 큽니다.
- 모델이 좋아질수록 하네스를 줄이세요. 주기적으로 “이 규칙이 아직 필요한가?”를 확인합니다.
- 특정 시나리오 문서는 넣지 마세요. 메커니즘만 남기고 프로젝트별 내용은 해당 프로젝트 안에 둡니다.

다른 프로젝트에 이식할 때는 `docs/PHASES.md`, `docs/HANDOFF.md`, 게이트와 위에 명시한 의존 모듈, 명령·에이전트·훅 설정을 함께 검토하고 대상 환경에서 검증하세요. 훅과 지침은 실수 방지 장치이며 실제 호스트 권한이나 샌드박스를 대체하지 않습니다.

## 추가 자료

- [Design skills supplements](docs/design-skills-supplements.md) — PPT/다이어그램/시각 QA를 위한 외부 고품질 스킬·저장소 큐레이션과 채택 가이드.
- [PPT Master style workflow](skills/ppt-master-style/SKILL.md) — ppt-master 스타일의 단계·게이트·네이티브 PPTX 워크플로 적응.
- [PPT Master](skills/ppt-master/SKILL.md) — 최고 품질 네이티브 PPTX 워크플로 (액션 타이틀, 디자인 스펙 락, 시각 QA).




- [Multi-host balancing guide](docs/multi-host-balancing.md) — AGENTS.md를 공유 코어로 두고 Claude/Codex/기타 호스트 균형 맞추기.


- [AGENTS.md](AGENTS.md) — Codex 및 multi-host용 헌법 (CLAUDE.md와 핵심 규칙 정렬).
- [Codex adaptation notes](docs/codex-adaptation-notes.md) — AGENTS.md vs CLAUDE.md, 스킬 경로, Phase 증거 이식 가이드.


- [Super-agent architecture notes](docs/super-agent-architecture-notes.md) — DeepSeek Harness Router/Worker, event-driven, Watchdog 패턴의 AI-Harness 적응 노트 (선택형, 증거 게이트 유지).
- [Skill progressive disclosure guidance](docs/skill-design-progressive-disclosure.md) — SKILL.md 3단계 로딩과 트리거 테스트 루프.


- [Cursor plugins 비교·적용 분석](docs/cursor-plugins-review-2026-10-28.md) — 고정 커밋의 구조·검증·호스트 이식성과 채택/제외 이유. `node scripts/package-lint.js`는 정의·단순 상대 링크를 검사하며 `bash tests/run-all.sh`에도 포함됩니다. `phase-gate.js doctor`는 필수 훅의 정확한 이벤트·matcher·명령과 저장소 안 실행 파일을 확인합니다. 전체 YAML 문법이나 실제 호스트 권한 강제를 인증하지는 않습니다.

- [docs/architecture-spec.md](./docs/architecture-spec.md) — 전체 종합 문서 (하네스 정의, 실패 모드, 참고 자료 포함)
- [docs/external-patterns.md](./docs/external-patterns.md) — 외부 저장소에서 추출한 보편 패턴 (Superpowers, Anthropic cwc, Ralph, Huntley, Ponytail, Karpathy)
- [docs/SUPPLEMENTS.md](./docs/SUPPLEMENTS.md) — 현황 분석, 확인된 결함, 보강 저장소 맵과 적용 순서
- [docs/usage-scenarios.md](./docs/usage-scenarios.md) — 시나리오별 적용 가이드 (웹, API, PPT, 장기 실행, 버그 수정, 개선)
- [docs/ppt-harness-workflow.md](./docs/ppt-harness-workflow.md) — Claude Code로 PPT/오피스 문서 제작하는 단계별 하네스 워크플로 (영문)
- OpenAI: [Harness Engineering](https://openai.com/index/harness-engineering/)
- Anthropic: [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic: [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- obra/superpowers
- Geoffrey Huntley — Ralph technique
- Karpathy-inspired CLAUDE.md 컬렉션

---

*compound log를 읽는 에이전트는 시간이 지날수록 더 스마트해집니다.*

## 2026-10-26 외부 자료·스킬 통합 검토

논문·AI 에이전트 Harness 운영 사례·지식 그래프/Second Brain 오픈소스를 실제 저장소의 기존 게이트와 대조한 결과는 [통합 적용 검토](docs/agent-harness-integration-2026-10-26.md)에 있습니다. 추가된 [선택형 evidence-first-harness 스킬](skills/evidence-first-harness/SKILL.md)은 지침 충돌·증거·반례·권한·선택형 지식 그래프를 점검하는 읽기 중심 절차이며, 현재 `/phase-harness`와 훅·CLI를 대체하거나 자동으로 설치하지 않습니다. [수동 회귀 케이스](tests/fixtures/instruction-conflict-regressions.md)로 모델/호스트 업데이트 전후 행동을 비교할 수 있습니다. 실제 모델 품질·비용 향상은 이 문서 변경만으로 검증되지 않습니다.

## 엄격한 테스트 증거 검사

신규 Phase는 `phase-gate.js run <id> test --require-test-summary --require-bound-tree -- <command>`와 `phase-gate.js check <id> --require-bound-tree`를 사용합니다. 바인딩 옵션은 호출별 요구이며 검증자도 check에 독립적으로 지정해야 합니다. 옵션 없는 기존 호출은 Git을 확인할 수 없을 때 미바인딩 증거를 경고와 함께 허용할 수 있습니다. 기존 해시만으로 과거 실행이 엄격 모드였거나 스냅샷이 완전했다고 증명할 수 없습니다. 과거 스냅샷의 완전성이 중요하면 현재 규칙으로 테스트를 다시 실행하고 attestation도 재발급하세요. Attest와 재실행 검증은 바인딩된 트리를 요구하지만, 기존 해시의 과거 읽기 완전성을 복구하지는 않습니다. 스냅샷 비교는 OS 격리가 아니며 ignored 입력, 파일 모드와 검사 사이에 복원된 변경 등을 보장하지 않습니다. Node TAP/pytest 결과의 테스트 수와 실패·스킵 수를 검사합니다. 인식 가능한 요약에서 테스트 0건·전체 스킵은 레거시 호출에서도 FAIL 처리됩니다. 엄격 모드에서 요약이 없으면 FAIL이며, `.claude/required-test-command.json`이 있을 경우 최초 테스트 실행 단계에서도 지정 명령만 허용합니다. 엄격 모드의 CI attestation 재실행 역시 테스트 수를 확인합니다. 테스트 내용이 실제 요구사항을 검증하는지는 독립 리뷰가 계속 확인해야 합니다. 자세한 수용 조건은 [성숙도 수용 기준](docs/maturity/ACCEPTANCE-2026-10-26.md)을 참고하세요.

### 필수 attestation 목록 검사 (선택형)

현재 CI는 발견된 attestation을 재실행하지만, Phase가 없으면 0개를 검사할 수 있습니다. 특정 Phase가 필수라면 신뢰할 수 있는 관리자가 보관한 비어 있지 않은 JSON ID 배열(예: `["1", "2"]`)을 명시해 `node scripts/verify-attestation-inventory.js <manifest.json>`을 실행할 수 있습니다. 목록의 모든 Phase가 정의되고 파일이 존재해야 하며 각 attestation 재검증이 성공해야 합니다. 이 도구는 현재 CI에 자동 연결되지 않습니다. PR 작성자가 바꿀 수 없는 별도 정책·필수 워크플로와 검증기 보호가 필요하며, 이 저장소만으로 GitHub 보호가 적용됐다고 주장할 수 없습니다. 현재 저장소의 명령 pin은 `bash tests/run-all.sh`이지만 pin이 없거나 변경되면 attestation이 명령을 선택할 수 있습니다. pin이 있어도 저장소 코드를 상속된 환경에서 실제 실행합니다. 검증기·pin·Phase 정의도 보호하고, replay를 별도 승인된 격리 환경에서 수행하세요. 순차 검증 중 뒤의 실패는 앞선 실행의 효과를 되돌리지 않습니다.

재실행 없이 목록과 파일 존재만 미리 확인하려면 `node scripts/verify-attestation-inventory.js --preflight <manifest.json>`을 사용하세요. 이 모드는 동일한 manifest·Phase ID·일반 파일 존재 조건을 검사하지만 gate나 attestation 명령을 실행하지 않으며 파일 내용, 유효성 또는 신뢰성을 검증하지 않습니다. 출력의 present/unverified와 종료 코드 0은 검증 성공이 아닌 존재 확인만 뜻합니다. 파일을 순차적으로 검사하고 심볼릭 링크를 따라가므로 동시점 스냅샷, 내용의 읽기 가능성이나 검사 후 존재를 보장하지 않습니다. 신뢰할 수 있는 로컬 입력에만 사용하세요. 기본 호출은 여전히 실제 재검증을 수행합니다.

## ToolBroker 멱등성/승인 참조 구현 (선택형)

[`toolbroker/`](toolbroker/README.md)에 **기본 거부형 시험용** 실행 경계를 추가했습니다. 승인 서명 없이는 DB 카운터 변경·로컬 HTTP POST가 불가능하며, 같은 요청의 재전송은 결과 재사용 또는 `UNKNOWN` 처리됩니다. 이는 실제 Claude/Codex 도구 전체를 차단하는 통합이 아니며, 운영 API·DB 연결이나 사용자의 자격증명을 요구하지 않습니다. Linux·Windows·macOS에서 `python -m unittest discover -s tests/toolbroker -v`로 독립 테스트를 실행합니다.

## 컨텍스트 제약 보존과 HANDOFF 검증

고위험/장시간 작업에서만 정본 계약을 선택적으로 정의합니다. 선언된 Phase는 출처·해시·필수 조건이 다른 컨텍스트 체크포인트를 거부합니다. HANDOFF에 기록한 지원 CI 운영체제가 실제 워크플로와 다르면 자동 검사에서 실패합니다. 내부 모델 압축을 자동 가로채거나 외부 쓰기 권한을 부여하는 기능은 아닙니다. 자세한 내용은 `docs/task-contracts/README.md`와 `docs/maturity/CONTEXT-ADOPTION-2026-10-26.md`를 참조하세요.


## Testing: prerequisites and known limits (measured 2026-11-05)

- Prerequisites: Node.js >= 20, bash, and **jq**. 	ests/run-all.sh now fails fast with a clear
  message when any of them is missing instead of failing late mid-run.
- Heavy suites: the gate/verify family contains single tests of 75–137s (largest measured 136.8s),
  so a full 
ode --test tests/*.test.js run takes roughly 20 minutes. Budget CI accordingly or
  split those suites.
- Batch-only flakes on Windows: spawning ash resolves to WSL bash, and under full parallel
  load WSL startup contention can exceed short per-spawn timeouts (relaxed to 20s in
  evaluation-accounting tests). If flakes appear in CI on Windows, pin HARNESS_BASH to a fast
  native bash or run suites with reduced --test-concurrency.

- Distilled memory stores (dreaming/memory-distill): `node scripts/memory-guard.js <store>` fails on broken links, missing `_index.md` and secret-shaped tokens and warns on undated facts (TTL policy) and email-like PII; covered by tests/memory-guard.test.js.


## 최근 갱신 (2026-11-05) — 테스트 격리 하드닝 · 시크릿 스캔 확장 · memory-guard

- **커밋 `7ffc1d0`** — 테스트 격리 하드닝: bash/jq가 실제로 구동 가능하지 않은 환경(WSL 런처 스텁 등)에서 bash 훅·doctor 계열 스위트를 명확한 이유와 함께 **skip** 처리(`tests/helpers/bash-probe.js`, `bashWorks()/jqReason()` 캐시 프로브). 병렬 부하에서 플레이크를 내던 3s 스폰 타임아웃을 20s로 완화(`evaluation-accounting`, `task-graph`). `tests/run-all.sh`는 node/jq/bash 부재 시 **즉시 오류**(exit 2). `tests/skill-audit.test.js` 추가.
- **커밋 `1e217a9`** — **memory-guard**: 증류(dreaming) 메모리 저장소용 결정적 검증기 `scripts/memory-guard.js` — `_index.md` 필수·링크 유효성·secret 형상 토큰(error)·미기재 `date:`/이메일형 PII(warn). 테스트 `tests/memory-guard.test.js` (3건).
- **시크릿 스캔 확장**: `ghp_`/`github_pat_`/`glpat-`/Slack(`xox*`)/OpenAI(`sk-`)/Google(`AIza`)/`npm_` 패턴 추가 — 실측 **clean**.
- **전체 스위트 실측**: **pass 319 / fail 0 / skipped 10** (게이트·검증 계열 최장 단일 테스트 136.8s; 분할은 attestation drift로 판정 불가 → 원형 유지).
- 전제조건: Node.js ≥ 20, bash, **jq** (`tests/run-all.sh`가 부재 시 즉시 실패). Windows 배치 플레이크 완화: `HARNESS_BASH` 고정 또는 `--test-concurrency` 축소.
