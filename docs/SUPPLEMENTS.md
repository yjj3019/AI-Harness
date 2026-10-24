# SUPPLEMENTS.md - 분석 결과와 보강 저장소 맵

기준일: 2026-10-24. 외부 저장소 정보는 해당일에 각 GitHub 페이지 원문에서 확인한 내용이다. 페이지에 표시되지 않은 항목은 [unverified]로 표기한다. 별점·릴리스 같은 변동값은 적지 않는다.

## 1. 현황 요약

이 저장소는 문서 중심의 하네스다. 원칙(증거 필수, 독립 평가자, Phase 분할, 핸드오프)은 `CLAUDE.md`와 `docs/`에 잘 정리되어 있다. 부족한 부분은 원칙을 실제로 강제하는 수단이다. 에이전트 정의가 로드되지 않았고, 훅·권한 설정이 없고, 증거 게이트는 누구나 통과시킬 수 있다.

## 2. 확인된 결함

| # | 결함 | 근거 | 상태 |
|---|------|------|------|
| 1 | 에이전트 5종에 `---` 구분자가 없음 | 공식 문서: 파일 첫 줄이 `---`가 아니면 frontmatter 없음으로 처리하고 조용히 건너뜀 | 이번 변경에서 수정 |
| 2 | `.claude/settings.json`·hooks·permissions 없음 | 파일 목록 확인 | 안전 훅 1종과 설정 추가. Default-FAIL 게이트는 미적용 |
| 3 | `phase-harness.js`의 재시도가 실제 재시도가 아님 | 코드 주석이 실제 하네스라면 코딩 에이전트를 다시 호출하겠지만 여기서는 단순히 반복만 한다고 밝힘. 같은 증거 파일을 세 번 다시 읽음 | 미적용 (4번과 함께 수정 필요) |
| 4 | 증거 JSON을 누구나 쓸 수 있음 | `{"status":"PASS"}`만 있으면 통과. verify·review 에이전트에는 Write 도구가 없어 JSON을 쓰는 주체가 평가자가 아님 | 미적용 |
| 5 | `/phase-harness`가 문서에만 있음 | `.claude/commands/` 없음 | 미적용 |
| 6 | compound 항목 서식 불일치 | `compound.md`의 `### [날짜] Phase X` 형식과 `compound-log.md`의 Date/Category/Rule 형식이 다름 | 미적용 |
| 7 | `PHASES.md` 템플릿의 `Phase N`이 유효 Phase로 인식됨 | 러너 정규식이 `### Phase <토큰>` 전체에 매치 | 미적용 |
| 8 | `.gitignore`·LICENSE·CI 없음 | 파일 목록 확인 | `.gitignore`만 추가. LICENSE는 소유자 결정 사항 |
| 9 | `test` 에이전트의 `tools`에 MCP 도구가 없음 | 문서는 Playwright MCP를 전제하나 `tools`는 Read, Bash, WebSearch, WebFetch뿐 | 미적용 |

3번은 코드를 읽어 확인했다. 저장소 스크립트는 실행하지 않았다.

## 3. 보강 저장소

| 영역 | 저장소 | 라이선스 | 확인한 내용 | 적용 방식 |
|------|--------|----------|-------------|-----------|
| Default-FAIL 게이트 | [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents) | Apache-2.0 | `verify-gate.sh`·`track-read.sh`·`commit-on-stop.sh`, 읽기 전용 `evaluator.md`. README가 이벤트 데모이며 유지보수하지 않고, 훅이 의도적으로 단순해 운영용으로는 빈틈을 메워야 한다고 밝힘 | 코드를 읽고 이식. 그대로 의존하지 않음 |
| 훅 구현 사례 | [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | [unverified] | 훅 이벤트 13종, builder/validator 에이전트 쌍, 린트 실패 시 차단하는 PostToolUse 검증기 | 패턴 참고. 정규식 차단은 가드레일일 뿐이라는 점은 이번 훅도 동일 |
| 관측 | [disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | [unverified] | 훅 → HTTP → Bun 서버 → SQLite → Vue 대시보드. uv와 Bun 필요, `ANTHROPIC_API_KEY` 요구 | 장시간 자율 실행을 돌릴 때만 도입 |
| 계획 단계 | [obra/superpowers](https://github.com/obra/superpowers) | MIT | brainstorming·writing-plans·TDD·systematic-debugging·verification-before-completion 등 스킬. 플러그인 설치 | `external-patterns.md` Pattern 1의 구현체 |
| 계획 단계(스펙) | [github/spec-kit](https://github.com/github/spec-kit) | MIT | constitution·specify·plan·tasks·implement 명령. Claude 통합 클래스 존재. 출력 위치 [unverified] | 신규 기능 중심 프로젝트에 적합 |
| 계획 단계(스펙) | [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | MIT | 제안 → 스펙 → 태스크 → 아카이브. `openspec init --tools claude`, 출력은 `.claude/skills/`·`.claude/commands/opsx/`. 기존 코드베이스 대상 가이드 있음 | 기존 코드 개선(Scenario 6)에 적합. 기본 텔레메트리 켜짐, 끌 수 있음 |
| 반복 실행 | [snarktank/ralph](https://github.com/snarktank/ralph) | MIT | `prd.json`의 `passes` 필드, 반복마다 새 인스턴스, `--tool claude` 지원, 모든 스토리 통과 시 종료 | `phase-harness.js`의 빈 재시도 루프를 대체할 때 참고 |
| 브라우저 검증 | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Apache-2.0 | `claude mcp add playwright npx @playwright/mcp@latest`. 접근성 스냅샷·콘솔·네트워크 도구. 프로젝트 스스로 보안 경계가 아니라고 밝힘 | `test` 에이전트의 `tools`에 MCP 도구를 명시해야 사용 가능 [unverified] |
| 샌드박스 | [anthropics/sandbox-runtime](https://github.com/anthropics/sandbox-runtime) | Apache-2.0 | Beta 리서치 프리뷰. 파일시스템·네트워크 제한. Linux는 bubblewrap, Windows는 alpha | 무인 장시간 실행 전에 검토. API가 바뀔 수 있음 |
| 서브에이전트 카탈로그 | [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | MIT | QA·코드 리뷰·보안 감사·디버깅 에이전트. 읽기 전용 리뷰어는 `Read, Grep, Glob` | `review` 에이전트 세분화 시 참고 |
| 코드량 억제 | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | MIT | `skills/ponytail/SKILL.md` 단일 프롬프트. 벤치마크 수치는 저자 측정값 | 이미 `external-patterns.md` Pattern 6에 반영됨 |
| 비밀 스캔 | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | MIT | pre-commit 훅과 GitHub Action 제공. README가 기능 개발은 끝났고 보안 패치만 낸다고 밝히며 후속 프로젝트로 이전 중 | 도입 시 후속 프로젝트 상태를 함께 확인 |

미확인: Anthropic 공식 `ralph-wiggum` 플러그인. README가 언급하지만 해당 페이지가 robots 정책으로 읽히지 않아 확인하지 못했다. 우회하지 않았다.

외부 플러그인·훅은 설치하면 코드가 실행된다. 설치 전에 소스를 읽고, 공식 저장소에서만 받는다.

## 4. 적용 순서

README 주의점대로 한 번에 다 넣지 않는다.

1. 이번 변경 반영: 에이전트 프런트매터, `settings.json`, 안전 훅. 새 세션에서 `/agents`에 5종이 보이는지 확인한다.
2. 증거 게이트 강화: 평가자 출력을 오케스트레이터가 JSON으로 기록하고, 아티팩트 경로 존재 여부를 러너가 검사한다. cwc의 읽기 추적 패턴을 참고한다.
3. 러너 정리: 재시도가 에이전트를 실제로 호출하게 하거나, 검사기임을 이름과 문서에 명시한다. snarktank/ralph를 참고한다.
4. 계획 단계 도입: 프로젝트 유형에 따라 superpowers, spec-kit, OpenSpec 중 하나만 고른다.
5. `test` 에이전트에 Playwright MCP 연결.
6. 무인 실행이 필요해지면 sandbox-runtime과 관측 대시보드를 검토한다.

## 5. 이번 변경 범위

- `.claude/agents/*.md` 5개: `---` 구분자 추가. 본문과 `tools`는 그대로.
- `.claude/hooks/block-destructive.sh`: 광범위 `rm -rf`, `git push --force`, `git reset --hard`, 다운로드 파이프 실행, `chmod -R 777`, 디스크 직접 쓰기 차단. 합성 입력 23건(차단 11, 허용 10, 비정상 입력 2)으로 검증했다. 실제 Claude Code 세션에서의 로드는 확인하지 못했다.
- `.claude/settings.json`: 위 훅 연결, `.env` 읽기 거부.
- `.gitignore`: `.phase-evidence/`, 로컬 설정, 비밀 파일.
