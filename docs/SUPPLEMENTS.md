# SUPPLEMENTS.md - 분석 결과와 보강 저장소 맵

기준일: 2026-10-24. 외부 저장소 정보는 해당일에 각 GitHub 페이지 원문에서 확인한 내용이다. 페이지에 표시되지 않은 항목은 [unverified]로 표기한다. 별점·릴리스 같은 변동값은 적지 않는다.

## 1. 현황 요약

이 저장소는 문서 중심의 하네스다. 원칙(증거 필수, 독립 평가자, Phase 분할, 핸드오프)은 `CLAUDE.md`와 `docs/`에 잘 정리되어 있다. 분석 시점의 부족한 부분은 원칙을 실제로 강제하는 수단이었다. 에이전트 정의가 로드되지 않았고, 훅·권한 설정이 없고, 증거 게이트는 누구나 통과시킬 수 있었다. 현재 상태는 2장의 상태 열을 본다.

## 2. 확인된 결함

| # | 결함 | 근거 | 상태 |
|---|------|------|------|
| 1 | 에이전트 5종에 `---` 구분자가 없음 | 공식 문서: 파일 첫 줄이 `---`가 아니면 frontmatter 없음으로 처리하고 조용히 건너뜀 | 수정 (1차) |
| 2 | `.claude/settings.json`·hooks·permissions 없음 | 파일 목록 확인 | 수정. 안전 훅과 설정(1차), 증거 쓰기 제한 훅(2차), 쓰기 제한을 `settings.json`으로 이전하고 읽기 추적 게이트 추가(3차) |
| 3 | `phase-harness.js`의 재시도가 실제 재시도가 아님 | 코드 주석이 실제 하네스라면 코딩 에이전트를 다시 호출하겠지만 여기서는 단순히 반복만 한다고 밝힘. 같은 증거 파일을 세 번 다시 읽음 | 수정. `phase-gate.js`로 교체하고 검사기임을 명시. 재시도는 `/phase-harness`가 맡음 |
| 4 | 증거 JSON을 누구나 쓸 수 있음 | `{"status":"PASS"}`만 있으면 통과. verify·review 에이전트에는 Write 도구가 없어 JSON을 쓰는 주체가 평가자가 아님 | 수정. CLI 기록, 해시 연쇄, 에이전트별 쓰기 제한. 한계는 아래 신뢰 모델 참조 |
| 5 | `/phase-harness`가 문서에만 있음 | `.claude/commands/` 없음 | 수정 (`.claude/commands/phase-harness.md`) |
| 6 | compound 항목 서식 불일치 | `compound.md`의 `### [날짜] Phase X` 형식과 `compound-log.md`의 Date/Category/Rule 형식이 다름 | 수정. 서식 통일, 30항목 초과 시 승격·보관 규칙 추가 |
| 7 | `PHASES.md` 템플릿의 `Phase N`이 유효 Phase로 인식됨 | 러너 정규식이 `### Phase <토큰>` 전체에 매치 | 수정. 템플릿·예시를 코드 펜스로 감싸고 러너가 펜스를 제외 |
| 8 | `.gitignore`·LICENSE·CI 없음 | 파일 목록 확인 | `.gitignore`, 테스트, CI 추가. LICENSE는 소유자가 Apache-2.0을 선택해 추가 (저작권 표기는 템플릿 그대로, 4장 2번) |
| 9 | `test` 에이전트의 `tools`에 MCP 도구가 없음 | 문서는 Playwright MCP를 전제하나 `tools`는 Read, Bash, WebSearch, WebFetch뿐 | 수정. WebSearch·WebFetch 제거, 증거 실행 경로 명시, 버전 고정 `.mcp.json.example`, 검토한 Playwright 도구만 `tools`에 허용(3차). MCP 활성화는 승인 후 (4장 1번) |

3번은 교체 전 코드를 읽어 확인했다. 교체 전 스크립트는 실행하지 않았다.

3차 실측 (헤드리스 `claude -p`, 이 저장소 폴더에서 실행)
- 에이전트 frontmatter 훅은 워크스페이스 신뢰 수락 전에 통째로 건너뛰어진다. 디버그 로그에 `Skipping frontmatter hooks for agent 'test': the folder ... is not trusted`가 찍혔고, 쓰기 시도는 차단되지 않았다. 그래서 가드를 `settings.json`으로 옮겼다.
- `settings.json` 훅은 서브에이전트 호출에도 발동하고 훅 입력에 `agent_type`이 들어 있다. `test`와 `general-purpose` 서브에이전트의 `.phase-evidence/` 쓰기가 차단되는 것을 로그로 확인했다. `coding` 에이전트는 프로브 명령을 실행하지 않고 끝나서 실측이 비었고, 같은 분기를 단위 테스트로 확인했다.
- Actions CI는 `d18b6b7` push에서 통과했다 (12초).

### 증거 게이트의 신뢰 모델

- 신뢰 경계는 오케스트레이터(메인 세션)다. 서브에이전트는 `.phase-evidence/`를 쓰지 못한다. 가드는 `.claude/settings.json`에 등록된 `evidence-guard.sh auto`이며, 훅 입력의 `agent_type`이 있을 때만 제한한다. test 에이전트는 `phase-gate.js run`만, 나머지는 `.phase-evidence/`와 `phase-gate.js` 모두 금지다.
- 테스트 증거는 `phase-gate.js run`이 명령을 직접 실행해 실제 종료 코드, 명령(argv), 코드 트리 해시를 기록한다. `check`는 테스트 이후 코드가 바뀌었으면 거부한다.
- 평가자 증거는 오케스트레이터가 평가자 응답 원문을 저장해 기록한다. verify PASS는 verify 에이전트가 테스트 로그를 Read한 기록(`read-tracker.sh`가 경로와 해시를 남김)이 없으면 거부된다.
- 해시 연쇄로 기록 이후의 수정을 `check`가 탐지한다. 손으로 쓴 JSON은 스키마 검사에서 거부된다.
- `attest`가 코드 트리 해시와 테스트 명령을 `docs/attestations/phase-<id>.json`에 남기고, 커밋한다. CI의 `verify-attestation`이 트리를 다시 계산하고 그 명령을 직접 재실행한다. 로컬 증거는 gitignore 대상이라 CI에 없으므로, 독립 검증은 이 파일이 맡는다.
- 한계
  - 메인 세션이 마음먹으면 위조할 수 있다. 위조해도 PR에 남는 attestation의 명령과 CI 재실행 결과는 속이지 못한다. 단, 기록된 명령 자체가 `true` 같은 것이면 CI도 통과하므로 PR 리뷰나 `verify-attestation <id> -- <기대 명령>`으로 명령을 고정해야 한다.
  - 훅은 패턴 매칭이라 우회될 수 있다. 읽기 추적은 Read 호출을 증명할 뿐 내용을 이해했다는 증명이 아니다.
  - 트리 해시는 git이 있어야 계산된다. git이 없으면 `check`가 경고만 하고 코드 바인딩이 빠진다.
  - 읽기 추적은 `read-tracker.sh`가 `settings.json`에 등록된 프로젝트에서만 강제된다. 최소 이식(러너와 커맨드만 복사)에서는 꺼진다.

## 3. 보강 저장소

| 영역 | 저장소 | 라이선스 | 확인한 내용 | 적용 방식 |
|------|--------|----------|-------------|-----------|
| Default-FAIL 게이트 | [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents) | Apache-2.0 | `verify-gate.sh`·`track-read.sh`·`commit-on-stop.sh`, 읽기 전용 `evaluator.md`. README가 이벤트 데모이며 유지보수하지 않고, 훅이 의도적으로 단순해 운영용으로는 빈틈을 메워야 한다고 밝힘 | 코드를 읽고 이식. 그대로 의존하지 않음 |
| 훅 구현 사례 | [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | [unverified] | 훅 이벤트 13종, builder/validator 에이전트 쌍, 린트 실패 시 차단하는 PostToolUse 검증기 | 패턴 참고. 정규식 차단은 가드레일일 뿐이라는 점은 이번 훅도 동일 |
| 관측 | [disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | [unverified] | 훅 → HTTP → Bun 서버 → SQLite → Vue 대시보드. uv와 Bun 필요, `ANTHROPIC_API_KEY` 요구 | 장시간 자율 실행을 돌릴 때만 도입 |
| 계획 단계 | [obra/superpowers](https://github.com/obra/superpowers) | MIT | brainstorming·writing-plans·TDD·systematic-debugging·verification-before-completion 등 스킬. 플러그인 설치 | `external-patterns.md` Pattern 1의 구현체 |
| 계획 단계(스펙) | [github/spec-kit](https://github.com/github/spec-kit) | MIT | constitution·specify·plan·tasks·implement 명령. Claude 통합 클래스 존재. 출력 위치 [unverified] | 신규 기능 중심 프로젝트에 적합 |
| 계획 단계(스펙) | [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | MIT | 제안 → 스펙 → 태스크 → 아카이브. `openspec init --tools claude`, 출력은 `.claude/skills/`·`.claude/commands/opsx/`. 기존 코드베이스 대상 가이드 있음 | 기존 코드 개선(Scenario 6)에 적합. 기본 텔레메트리 켜짐, 끌 수 있음 |
| 반복 실행 | [snarktank/ralph](https://github.com/snarktank/ralph) | MIT | `prd.json`의 `passes` 필드, 반복마다 새 인스턴스, `--tool claude` 지원, 모든 스토리 통과 시 종료 | 무인 반복(헤드리스) 실행이 필요할 때 `/phase-harness`를 대체하는 방식으로 참고 |
| 브라우저 검증 | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Apache-2.0 | `claude mcp add playwright npx @playwright/mcp@latest`. 접근성 스냅샷·콘솔·네트워크 도구. 프로젝트 스스로 보안 경계가 아니라고 밝힘 | `.mcp.json.example`(0.0.83 고정)을 `.mcp.json`으로 복사해 활성화하고 `test` 에이전트 `tools`에 도구를 추가. 도구 이름은 패키지 README에서 확인했고 `mcp__playwright__<도구>` 형식을 쓴다 |
| 샌드박스 | [anthropics/sandbox-runtime](https://github.com/anthropics/sandbox-runtime) | Apache-2.0 | Beta 리서치 프리뷰. 파일시스템·네트워크 제한. Linux는 bubblewrap, Windows는 alpha | 무인 실행은 Claude Code 내장 샌드박스(`sandbox` 설정)를 쓰는 쪽으로 정리했다. `.claude/settings.unattended.example.json` 참조. 별도 sandbox-runtime은 도입하지 않음 |
| 서브에이전트 카탈로그 | [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | MIT | QA·코드 리뷰·보안 감사·디버깅 에이전트. 읽기 전용 리뷰어는 `Read, Grep, Glob` | `review` 에이전트 세분화 시 참고 |
| 코드량 억제 | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | MIT | `skills/ponytail/SKILL.md` 단일 프롬프트. 벤치마크 수치는 저자 측정값 | 이미 `external-patterns.md` Pattern 6에 반영됨 |
| 비밀 스캔 | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | MIT | pre-commit 훅과 GitHub Action 제공. README가 기능 개발은 끝났고 보안 패치만 낸다고 밝히며 후속 프로젝트로 이전 중 | 도입 시 후속 프로젝트 상태를 함께 확인 |

미확인: Anthropic 공식 `ralph-wiggum` 플러그인. README가 언급하지만 해당 페이지가 robots 정책으로 읽히지 않아 확인하지 못했다. 우회하지 않았다.

외부 플러그인·훅은 설치하면 코드가 실행된다. 설치 전에 소스를 읽고, 공식 저장소에서만 받는다.

## 4. 남은 작업

결정 근거는 `docs/DECISIONS.md`에 있다.

1. Playwright MCP 활성화: `.mcp.json.example`을 `.mcp.json`으로 복사한다. `test` 에이전트의 허용 도구는 반영되어 있다. 외부 코드를 실행하므로 소유자 승인 후 진행한다.
2. LICENSE 저작권 표기: `LICENSE` 끝의 `Copyright [yyyy] [name of copyright owner]`는 템플릿 그대로다. 소유자가 연도와 이름을 채운다.
3. Actions에서 `verify-attestation` 단계 확인: 이 저장소에는 attestation 파일이 없어 반복문이 비어 있다. 대상 프로젝트에서 처음 `attest`를 커밋할 때 실제로 실행된다.
4. 종단 시험은 한 번 통과했다. 임시 복제본에 장난감 Phase를 두고 헤드리스로 `/phase-harness 1`을 돌려 5단계가 모두 PASS했고, 이어서 `check`, `attest`, `verify-attestation`도 통과했다. 실제 프로젝트의 실패·재시도 경로(최대 3회)는 아직 돌려 보지 못했다 [unverified].
5. 계획 단계 도구(superpowers, spec-kit, OpenSpec)와 관측 대시보드는 번들하지 않기로 했다. 프로젝트별로 필요할 때 고른다.
6. 공식 `ralph-wiggum` 플러그인: 문서와 GitHub 페이지가 모두 robots 정책으로 읽히지 않아 미확인이다. 우회하지 않았다.

## 5. 변경 이력

1차 (커밋 `2ce9a67`)
- `.claude/agents/*.md` 5개: `---` 구분자 추가.
- `.claude/hooks/block-destructive.sh`와 `.claude/settings.json`: 광범위 `rm -rf`, force push, `reset --hard`, 다운로드 파이프 실행, `chmod -R 777`, 디스크 직접 쓰기 차단과 `.env` 읽기 거부. 합성 입력 23건으로 검증했다.
- `.gitignore`와 이 문서.

2차
- `PHASES.md`: 템플릿·예시를 코드 펜스로 감싸고 증거 사용법 추가.
- `compound-log.md`, `compound.md`: 서식 통일, 30항목 초과 시 승격·보관 규칙.
- `.claude/workflows/phase-gate.js`: `phase-harness.js`를 대체. `list`·`run`·`record`·`check`, 증거 스키마와 해시 연쇄.
- `.claude/hooks/evidence-guard.sh`와 coding·verify·compound·test 에이전트 frontmatter 훅: `.phase-evidence/` 쓰기 제한.
- `.claude/commands/phase-harness.md`: 재시도 오케스트레이터.
- `test` 에이전트: WebSearch·WebFetch 제거, 증거 실행 경로 명시. `.mcp.json.example` (`@playwright/mcp@0.0.83` 고정).
- `tests/`와 `.github/workflows/ci.yml`: 훅 테스트 43건, 프런트매터 린트, `phase-gate` 단위 테스트 15건. 로컬에서 `bash tests/run-all.sh`로 실행한다. CI 워크플로는 이 시점에는 GitHub에서 실행해 보지 못했고, 3차에서 통과를 확인했다.

3차
- 실측: 에이전트 frontmatter 훅 미발동 확인, `settings.json` 훅의 서브에이전트 발동 확인, Actions CI 통과 확인, 내장 샌드박스 격리 확인.
- `evidence-guard.sh auto`를 `settings.json`에 등록하고 에이전트 frontmatter 훅은 제거. 린트가 등록 여부를 검사한다.
- `phase-gate.js`: test 증거에 argv와 코드 트리 해시 기록, `check`가 코드 변경 거부, `attest`·`verify-attestation` 추가, verify PASS에 읽기 기록 요구.
- `read-tracker.sh`(PostToolUse Read)와 `settings.json` 등록.
- CI에 attestation 재검증 단계, `/phase-harness` 종료 단계에 `attest`.
- `test` 에이전트에 검토한 Playwright 도구 22개 허용. 위험 도구는 린트가 거부한다.
- `.claude/settings.unattended.example.json`, `docs/DECISIONS.md`.
- 시험: 훅 58건, `phase-gate` 25건, 프런트매터·설정 린트. 가드마다 되돌려 실패하는지 확인했다.
