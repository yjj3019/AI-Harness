# AI-Harness

장시간 안전한 Code Agent 워크플로를 위한 **AI Harness Engineering** 패키지입니다.

이 저장소는 Gemini 노트북 소스와 Anthropic, Geoffrey Huntley, Superpowers, Karpathy 스타일 CLAUDE.md, 다중 에이전트 오케스트레이션 시스템 등 외부 자료를 종합하여 만들었습니다.

> **English**: [README.en.md](./README.en.md)

## 왜 Harness Engineering인가?

코드 에이전트가 수 시간 자율 실행이 가능해지면서 제약 요인은 모델 지능이 아닐 “하네스(harness)”가 되었습니다. 하네스는 에이전트가 경로를 이탈하지 않고 안전하게 작업하도록 만드는 규칙, 피드백 루프, 도구, 컨텍스트 관리, 검증 시스템입니다.

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

[평가 사례](docs/report-editing-cases.json)는 사람 또는 별도 승인된 모델 평가용입니다. CI는 패키지 구조와 사례 정합성만 검사하며 재작성 품질이나 의미 동등성을 보증하지 않습니다.

## 선택형 문서 변환 계약

PDFMathTranslate 분석을 바탕으로 [문서 변환 계약](docs/document-jobs.md)과 [오프라인 manifest 검사기](scripts/document-job.js)를 추가했습니다. 파일 읽기·출력 쓰기·외부 텍스트 전송·캐시·자산/패키지 준비를 분리하며, 입력별 누락·부분 실패·수식 토큰 누락/중복·미검증 결과를 전체 성공으로 집계하지 않습니다.

검사기는 JSON 선언의 일관성만 확인합니다. 번역 엔진·실행기·권한 강제·실제 PDF/해시/시각 품질 검증은 포함하지 않습니다. 설치·유료 호출·PDF 업로드는 자동 실행하지 않습니다.

## 디렉토리 구조

```
AI-Harness/
├── CLAUDE.md                          # 프로젝트 헌법 및 인덱스
├── README.md                          # 이 파일 (한글, 기본)
├── README.en.md                       # 영문 버전
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

심슨즈 캐릭터 Ralph Wiggum의 이름을 띄 자율 반복 루프입니다. Geoffrey Huntley가 2025년에 제안한 간단한 bash 루프입니다:

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

1. `CLAUDE.md` 읽기.
2. `docs/compound-log.md` 검토.
3. `docs/PHASES.md`에 단계 정의, `docs/DETAIL_SPEC.md`에 요구사항 작성.
4. `/phase-harness <phase-id>`로 Phase 실행. 완료 판정은 `node .claude/workflows/phase-gate.js check <phase-id>`.
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
3. `.claude/workflows/phase-gate.js`와 `.claude/commands/phase-harness.md`를 복사합니다. 증거는 직접 쓰지 않고 `phase-gate.js`의 `run`·`record`로만 남깁니다. 손으로 쓴 JSON은 `check`에서 거부되고, 증거가 없으면 실패합니다.
   ```bash
   node .claude/workflows/phase-gate.js run 1 test -- npm test
   node .claude/workflows/phase-gate.js check 1
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

가장 빠른 시작은 이 저장소의 `docs/PHASES.md`, `docs/HANDOFF.md`, `.claude/workflows/phase-gate.js`, `.claude/commands/phase-harness.md`를 복사한 뒤 해당 프로젝트의 Phase만 채우는 것입니다. 증거 쓰기 제한까지 쓰려면 `.claude/agents/`, `.claude/hooks/`, `.claude/settings.json`도 함께 복사합니다.

## 추가 자료

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

신규 Phase는 `phase-gate.js run <id> test --require-test-summary -- <command>`를 사용합니다. Node TAP/pytest 결과의 테스트 수와 실패·스킵 수를 검사합니다. 인식 가능한 요약에서 테스트 0건·전체 스킵은 레거시 호출에서도 FAIL 처리됩니다. 엄격 모드에서 요약이 없으면 FAIL이며, `.claude/required-test-command.json`이 있을 경우 최초 테스트 실행 단계에서도 지정 명령만 허용합니다. 엄격 모드의 CI attestation 재실행 역시 테스트 수를 확인합니다. 테스트 내용이 실제 요구사항을 검증하는지는 독립 리뷰가 계속 확인해야 합니다. 자세한 수용 조건은 [성숙도 수용 기준](docs/maturity/ACCEPTANCE-2026-10-26.md)을 참고하세요.

## ToolBroker 멱등성/승인 참조 구현 (선택형)

[`toolbroker/`](toolbroker/README.md)에 **기본 거부형 시험용** 실행 경계를 추가했습니다. 승인 서명 없이는 DB 카운터 변경·로컬 HTTP POST가 불가능하며, 같은 요청의 재전송은 결과 재사용 또는 `UNKNOWN` 처리됩니다. 이는 실제 Claude/Codex 도구 전체를 차단하는 통합이 아니며, 운영 API·DB 연결이나 사용자의 자격증명을 요구하지 않습니다. Linux·Windows·macOS에서 `python -m unittest discover -s tests/toolbroker -v`로 독립 테스트를 실행합니다.

## 컨텍스트 제약 보존과 HANDOFF 검증

고위험/장시간 작업에서만 정본 계약을 선택적으로 정의합니다. 선언된 Phase는 출처·해시·필수 조건이 다른 컨텍스트 체크포인트를 거부합니다. HANDOFF에 기록한 지원 CI 운영체제가 실제 워크플로와 다르면 자동 검사에서 실패합니다. 내부 모델 압축을 자동 가로채거나 외부 쓰기 권한을 부여하는 기능은 아닙니다. 자세한 내용은 `docs/task-contracts/README.md`와 `docs/maturity/CONTEXT-ADOPTION-2026-10-26.md`를 참조하세요.
