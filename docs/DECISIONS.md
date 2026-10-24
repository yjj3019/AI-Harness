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
- 한계: 기록된 명령이 `true`면 CI도 통과한다. `verify-attestation <id> -- <기대 명령>`으로 고정하거나 리뷰한다.

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

- 상태: 미결정. 저작권자가 선택할 사항이다. 선택 후 파일만 추가하면 된다.
