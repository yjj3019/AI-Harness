# AI-Harness

장시간 안전한 Code Agent 워크플로를 위한 **AI Harness Engineering** 패키지입니다.

이 저장소는 Gemini 노트북 소스와 Anthropic, Geoffrey Huntley, Superpowers, Karpathy 스타일 CLAUDE.md, 다중 에이전트 오케스트레이션 시스템 등 외부 자료를 종합하여 만들었습니다.

> **English**: [README.en.md](./README.en.md)

## 왜 Harness Engineering인가?

코드 에이전트가 수 시간 자율 실행이 가능해지면서 제약 요인은 모델 지능이 아닐 “하네스(harness)”가 되었습니다. 하네스는 에이전트가 경로를 이탈하지 않고 안전하게 작업하도록 만드는 규칙, 피드백 루프, 도구, 컨텍스트 관리, 검증 시스템입니다.

하네스 없이 자주 발생하는 실패:
- 조기 “완료” 선언
- Context Anxiety (컨텍스트 용량 ~70% 초과 시 일관성 저하)
- 자기 평가 편향 (Self-assessment bias)
- 과잉 엔지니어링 및 범위 이탈
- 세션 간 진행 상태 손실

개발자 역할은 코드를 직접 쓰는 것에서 에이전트가 안전하게 동작할 수 있는 시스템을 설계하는 것으로 변화합니다.

## 핵심 원칙

1. **Index-Only Constitution** — `CLAUDE.md`는 ~100줄 이내로 유지. 상세 내용은 `docs/`로 분리.
2. **No One-Shot** — 명확한 완료 기준을 가진 Phase/Sprint로 분할.
3. **Ralph Wiggum Loop** — `coding → test → verify → review → compound` 자율 사이클. FAIL 또는 [BLOCKING] 시 재시도 (최대 3회).
4. **독립 평가자** — 코딩과 평가를 독립된 컨텍스트 창에서 실행하여 자기 평가 편향 제거.
5. **객관적 검증** — Playwright MCP, DevTools, 로그, 테스트 러너 사용. 주관적 코드 읽기 금지.
6. **복리화 학습** — 모든 작업 전 `docs/compound-log.md` 읽기 강제.
7. **Context Reset & Hand-off** — 컨텍스트가 참히면 `docs/HANDOFF.md`로 상태를 넘기고 새 세션 시작.
8. **Surgical Changes & Simplicity** — 필요한 것만 수정. 최소 견고한 솔루션 선호 (Karpathy 스타일).

## 디렉토리 구조

```
AI-Harness/
├── CLAUDE.md                          # 프로젝트 헌법 및 인덱스
├── README.md                          # 이 파일 (한글, 기본)
├── README.en.md                       # 영문 버전
├── docs/
│   ├── architecture-spec.md            # 전체 종합 명세
│   ├── ppt-harness-workflow.md         # PPT/오피스 문서 제작 하네스
│   ├── DETAIL_SPEC.md                 # 요구사항 템플릿
│   ├── PHASES.md                      # 단계별 체크리스트
│   ├── HANDOFF.md                     # 세션 핸드오프 상태
│   └── compound-log.md                # 축적 교훈 로그
└── .claude/
    ├── agents/
    │   ├── coding.md
    │   ├── test.md
    │   ├── verify.md
    │   ├── review.md
    │   └── compound.md
    └── workflows/
        └── phase-harness.js            # 루프 러너 스켈레톤
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
4. 에이전트 오케스트레이션 또는 `.claude/workflows/phase-harness.js` 스켈레톤으로 Phase 실행.
5. 컨텍스트가 저하되면 `docs/HANDOFF.md`에 상태를 기록하고 새 세션 시작.

## 추가 자료

- [docs/architecture-spec.md](./docs/architecture-spec.md) — 전체 종합 문서
- [docs/ppt-harness-workflow.md](./docs/ppt-harness-workflow.md) — Claude Code로 PPT/오피스 문서 제작하는 단계별 하네스 워크플로
- Anthropic: [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic: [Harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps)
- Geoffrey Huntley — Ralph technique
- obra/superpowers
- Karpathy-inspired CLAUDE.md 컬렉션

---

*compound log를 읽는 에이전트는 시간이 지날수록 더 스마트해집니다.*
