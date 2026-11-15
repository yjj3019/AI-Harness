# DECISIONS.md - 설계 결정 기록

기준일: 2026-10-24. 결정마다 선택한 것, 버린 것, 이유를 적는다. 측정하지 않은 주장은 [unverified]로 표시한다.

## D1. 증거 쓰기 가드의 위치

- 선택: `.claude/settings.json`의 PreToolUse 훅 `evidence-guard.sh auto`. 훅 입력의 `agent_type`이 있을 때만 제한한다.
- 버린 것: 에이전트 frontmatter 훅. 워크스페이스 신뢰를 수락하기 전에는 통째로 건너뛰어진다 (실측: 디버그 로그와 쓰기 미차단 확인).
- 이유: `settings.json` 훅은 신뢰와 무관하게 발동하고, 임의의 서브에이전트(`general-purpose` 포함)까지 덮는다.
- 비용: 메인 세션은 제한하지 않는다. 오케스트레이터가 보고서를 `.phase-evidence/`에 저장해야 하기 때문이다.

## D2. 코드 상태 바인딩과 독립 재검증

- 선택: test 증거에 코드 트리 해시와 argv를 기록하고, `attest`로 커밋 가능한 파일을 만들어 CI가 같은 명령을 다시 실행한다.
- 버린 것 1: 증거 디렉터리를 커밋. 로그와 해시가 매번 바뀌어 PR이 지저분해지고 위조 검토 지점도 흐려진다.
- 버린 것 2: HMAC 서명. 키를 메인 세션이 읽을 수 있어 신뢰 경계를 옮기지 못한다.
- 이유: 로컬 증거가 위조돼도 CI 재실행과 PR에 남는 명령은 속이지 못한다.
- 한계: 기록된 명령이 `true`면 CI도 통과한다. 완화로 `.claude/required-test-command.json`을 커밋하면 `verify-attestation`이 그 명령과 다른 attestation을 거부한다. 일회성은 `verify-attestation <id> -- <기대 명령>`으로도 고정한다. 파일 자체의 리뷰는 사람이 해야 한다.

## D3. 평가자의 증거 열람 확인

- 선택: `read-tracker.sh`(PostToolUse Read)가 verify 에이전트가 연 `.phase-evidence/` 파일의 경로와 해시를 기록하고, `record verify --status PASS`가 테스트 로그의 기록을 요구한다.
- 버린 것: cwc의 PreToolUse 거부 방식. 우리 구조에서 PASS를 쓰는 주체는 평가자가 아니라 오케스트레이터라서, 쓰기 시점이 아니라 기록 시점에 걸어야 한다.
- 근거: 훅 입력에 `agent_type`이 들어 있음을 공식 문서에서 확인했고, 실제 세션에서 verify 에이전트의 Read가 기록되는 것을 확인했다.
- 한계: Read 호출의 증명일 뿐 이해의 증명은 아니다. `read-tracker.sh`가 등록되지 않은 프로젝트에서는 강제되지 않는다.

## D4. 브라우저 검증

- 선택: Playwright MCP는 `.mcp.json.example`(0.0.83 고정)로 두고 활성화는 사용자가 한다. `test` 에이전트 `tools`에는 검토한 22개만 넣고 린트가 위험 도구를 거부한다.
- 버린 것 1: 와일드카드 `mcp__playwright__*`. 임의 코드 실행(`browser_run_code_unsafe`, `browser_evaluate`), 저장소 쓰기, 라우팅, 업로드가 따라온다.
- 버린 것 2: MCP 관찰을 증거로 인정. 기록 주체가 러너뿐이어야 하므로, 통과 기준이 되는 UI 검사는 프로젝트 테스트 스크립트로 쓰고 러너로 실행한다.
- 이유: MCP 도구 이름은 패키지 README에서 확인했다. 활성화는 외부 코드를 실행하므로 승인 사항이다.

## D5. 무인 실행 격리

- 선택: Claude Code 내장 샌드박스 설정을 쓰는 예시(`.claude/settings.unattended.example.json`). `failIfUnavailable`로 격리 없이 시작하지 않게 한다.
- 버린 것: 별도 sandbox-runtime 도입. 내장 기능과 겹치고 Beta라 API가 바뀔 수 있다.
- 근거: bubblewrap과 socat을 설치한 컨테이너에서 프로젝트 밖 쓰기는 `Read-only file system`, 허용 목록 밖 네트워크는 403으로 차단됐다. 미설치 환경에서는 설정대로 기동을 거부했다.
- 한계: 이 시험은 리눅스 컨테이너 한 곳의 결과다. Windows 네이티브에서는 샌드박스가 동작하지 않는다 (공식 문서).

## D6. 계획 단계 도구와 관측 대시보드

- 선택: 번들하지 않는다. 프로젝트 유형별로 사용자가 고른다 (신규 기능은 spec-kit, 기존 코드 개선은 OpenSpec, 범용 스킬 묶음은 superpowers).
- 버린 것: 이 저장소에 미리 포함. 하나를 고르면 나머지와 Phase 구조가 겹치고, 외부 코드를 설치하게 된다.
- 관측(disler 저장소)은 서버, SQLite, 대시보드, API 키가 필요하고 라이선스를 확인하지 못했다 [unverified]. 무인 장시간 실행이 실제로 생길 때 다시 검토한다.

## D7. 공식 ralph-wiggum 플러그인

- 선택: 의존하지 않는다.
- 이유: 문서와 GitHub 페이지가 모두 robots 정책으로 읽히지 않았고, 우회하지 않았다. 내용을 모른 채 도입하지 않는다 [unverified].
- 이 저장소의 `/phase-harness`가 같은 목적(반복, 증거 게이트, 최대 3회)을 이미 충족한다.

## D8. LICENSE

- 선택: Apache-2.0 (소유자 결정). `LICENSE`의 부록은 라이선스 적용 방법을 보여 주는 예시이므로 템플릿을 프로젝트 저작권 고지로 간주하거나 직접 수정하지 않는다. 프로젝트 저작권 표기의 위치와 내용은 권리자가 별도로 결정한다.
- 이유: 특허 조항이 있고, 참고한 cwc와 playwright-mcp와 같은 계열이다.

## D9. 플랫폼 경로 정규화

- 선택: 증거 경로를 다루는 훅이 POSIX(`/home/x`), 네이티브 Windows(`C:\x`), Windows 슬래시 형태(`C:/x`)를 모두 정규화한다. 변환은 `cygpath -u` → `wslpath -u` → 원문 순서로 시도하고, `realpath -e`가 없는 BSD/macOS를 위해 플래그 없는 `realpath` 폴백도 둔다.
- 버린 것: Windows를 미지원으로 선언하고 `doctor`가 실패하게 두는 것. 실측에서 Git Bash로 훅이 정상 동작했으므로, 배제는 사용자 환경을 잘못 판정한 것이다.
- 근거: 5차 실측. `bash -x` 추적에서 MSYS가 `/tmp/...`를 `C:/...`로 바꾸고, 훅이 `/*`만 절대경로로 인정해 `$root/C:/...`를 만든 뒤 realpath가 실패했다. 그 결과 `verify PASS`가 영구 거부됐다. 정규화 후 E2E 3건이 통과했다.
- 한계: `cygpath`도 `wslpath`도 없는 셸에서는 여전히 해석하지 못한다(fail-open이므로 verify PASS 거부로 나타난다).

## D10. E2E 시뮬레이션을 기본 검사에 포함

- 선택: `tests/e2e.test.js`가 임시 프로젝트에서 5단계 루프, 실패 후 재시도, 실제 `read-tracker.sh` 연동을 실행한다. `node --test`가 함께 돌리므로 CI와 로컬이 같은 경로를 쓴다.
- 버린 것 1: bash로 작성한 E2E. Node는 이미 테스트 러너이고 Windows·리눅스에서 같은 코드로 돈다.
- 버린 것 2: 실제 `claude -p` 호출. CI에 모델 자격 증명이 필요하고 비결정적이다. 오케스트레이터 계약(명령 순서와 기록 형식)은 스크립트로 재현할 수 있다.
- 근거: 단위 테스트 30건은 배선을 검증하지 못했고, 실제로 Windows 경로 결함을 잡지 못했다. E2E는 훅을 실제로 호출해 그 결함을 재현한다.

## D11. design-omniskill 운영 확정 (v1.7.0 C1)

- 선택: 진입점 스킬 `skills/design-omniskill`을 운영으로 확정한다. 확정 기준은 "실사용 1회 + 실측 기록"이다: P2 one-pager(HTML)를 실제로 만들어 `design-channel-check.js`로 검사하고, 렌더·대조율·오버플로·글리프 커버리지를 실측해 `docs/design-cases/`에 기록한다. 산출물+실측은 `docs/practice/design-omniskill-v1.7.0-2026-11-15/`에 커밋한다.
- 버린 것 1: 게이트 연동. 렌더/렌더-diff를 `tests/run-all.sh` 기본 게이트에 넣는 것은 이 결정과 별개이며, 이번 범위에서는 SKILL.md·channel-pptx.md를 그대로 둔다(실측: `git diff main...HEAD` 대상 2파일 = 빈, exit 0).
- 버린 것 2: LLM 세션 트리거 활성화 실측. SKILL.md의 정적 규칙(트리거/채널 라우트)을 실제 LLM 세션에서 발동하는지 확인하지 않았다 [unverified].
- 근거 (2026-11-15 실측): `design-channel-check.js html` = clean (exit 0) · WCAG 대조율 8짝 전부 ≥4.5:1 (가장 약한 accent 5.99:1) · overflow 0 (1440/1920 둘 다 scrollWidth==clientWidth) · `scorecard` ok (8 items, C3 계약 적용) · `evidence html` ok 2종 (EVIDENCE_CONTRACT 8필드) · `skill-audit` 29 skills clean · design-cases 3종(contrast/overflow/font-fallback) 실측 기록.
- 한계: ① MCP(Playwright) 렌더 산출물은 D4에 따라 게이트 증거가 아닌 산출물+실측이다. ② 렌더는 Windows 호스트 chromium 한 환경뿐이다(다른 OS/엔진 미검증). ③ grid-12col 좌표는 미측정(scorecard에서 `unknown: true` + reason 표기). ④ aspect-ratio·document-preservation·source-adoption 케이스는 미기록(운영 확정 범위 밖).
