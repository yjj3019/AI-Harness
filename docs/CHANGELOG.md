# CHANGELOG

이 저장소의 버전 기록. 규칙: `docs/VERSIONING.md`.

## 작업 트리 — MIT 전환·CI 취소 규칙 (미병합)

- 2026-11-24: 저장소 라이선스를 Apache-2.0에서 MIT로 바꿨다(소유자 결정, `docs/DECISIONS.md` D8). `LICENSE`를 MIT 본문과 `Copyright (c) 2026 yjj3019`로 교체했고, 스킬 29개의 `license:`를 `MIT`로 맞췄다. `scripts/skill-audit.js`의 기본 라이선스와 `tests/skill-audit.test.js`를 MIT 기준으로 바꿨다. 동봉 LICENSE가 있는 스킬(`design-evidence-harness`)은 그대로 둔다.
- `ci.yml`에 `concurrency`를 추가했다: 같은 PR의 이전 실행은 새 push가 오면 취소하고, main push는 취소하지 않는다.
- 과거 도입 기록의 'Apache-2.0'은 외부 출처의 라이선스라 고치지 않았다.
- `scripts/secret-scan.js`: 알려진 암호화 파일 헤더로 시작하는 파일은 확장자와 무관하게 실패한다(암호화된 파일 커밋 차단). `tests/gate-hardening.test.js`에 시험을 추가했다.
- `tests/run-all.sh`: `GIT_ASKPASS`·`GIT_EDITOR`·`GIT_TERMINAL_PROMPT` 세 변수만 시작 시 비운다. Claude Code가 셸 호출마다 내보내서 게이트가 fail-closed로 거부하고, 게이트 테스트가 매번 실패했다(같은 28개 테스트: 변수가 있으면 통과 12·실패 15, 비우면 통과 26·실패 0·skip 2). 게이트의 거부 규칙과 나머지 `GIT_*` 거부는 그대로다.
- `.claude/hooks/block-destructive.sh`와 `.codex/hooks/block-destructive.sh`: `.env`·`.env.<이름>` 경로를 인수로 받는 읽기·복사 명령(`cat`, `type`, `Get-Content`, `grep`, `cp`, `source` 등)을 차단한다(`.env.example`·`.sample`·`.template`는 허용). `Read` 거부 규칙은 셸을 덮지 않는 호스트가 있어 방어를 한 겹 더한 것이다. 문자열 검사라 변수·별칭·와일드카드로 우회될 수 있어 가드레일일 뿐 경계가 아니다. `tests/hooks.test.sh`에 두 훅 대상 24건씩(차단 15·허용 9) 시험을 추가했다.
- `docs/practice/host-pilot-2026-11-25/`: Claude Code·Codex CLI 쌍대 평가 3차 기록(합성 입력만). 지침 파일은 통과율을 바꾸지 않았고, 훅은 되돌리기 강제 명령과 `.env` 노출을 막았으며, Claude Code(Windows 네이티브)는 작업 폴더 밖 쓰기를 막지 못했다. 품질 보증이나 격리 증거가 아니다.

## 작업 트리 — ruleset 갱신 (미병합)

- 2026-11-23: 서버 ruleset `main-required-ci`(26772795)의 필수 검사에 `attestation summary`를 추가했다(9개에서 10개). 코드 오너 리뷰 요구는 켜지 않았다(소유자 한 명). 결과와 이유는 `docs/merge-policy.md`에 적었다.

## 작업 트리 — 3모델 리뷰(Opus·Codex·Grok) 개선 (미병합, 브랜치 `fix/three-model-review-20261122`)

- 훅 `evidence-guard.sh`(Claude·Codex) 재작성: 허용/거부 판정이 bash 내장(`[[ =~ ]]`, `case`)만 쓰므로 PATH에 grep·sed가 없어도 거부가 허용으로 바뀌지 않는다. 직접 입력으로 확인한 우회를 모두 막았다: `.phase-ev*` 같은 글롭(Write 경로와 Bash 명령), 끝의 점·공백(`.phase-evidence.`, `.phase-evidence `), 8.3 짧은 이름, `.js` 없는 `phase-gate` 호출, PowerShell 도구, MCP 도구(`mcp__*`). 경로가 비었거나 realpath가 실패하면 차단한다.
- 게이트 신뢰 집합(`phase-gate.js`와 보조 모듈, 훅, `settings*.json`, 명령 고정 파일, `tests/run-all.sh`, `.github/workflows`, `required-phases.json`, `CODEOWNERS`, 병합·재실행 스크립트)을 서브에이전트가 고칠 수 없게 했다(메인 세션은 허용). `.github/CODEOWNERS`가 같은 집합을 나열한다. 서버의 코드 오너 리뷰 강제는 관리자 설정이다.
- `block-destructive.sh`(두 벌): `git -C dir reset --hard`가 push 파서를 거치지 않아 통과하던 것을 막았고, push·reset·curl|sh·디스크 쓰기 판정을 외부 grep 대신 bash 정규식으로 바꿨다. Codex `hooks.json`은 `GIT_DIR` 등을 비우고 `git rev-parse`를 실행하며 실패하면 `exit 2`.
- `.claude/settings.json`·`.codex/hooks.json` matcher와 doctor 기대값에 `PowerShell`과 `mcp__.*` 추가. doctor는 `.claude/settings.local.json`과 `~/.claude/settings.json`의 `disableAllHooks: true`를 실패로 보고한다.
- `phase-gate.js`: attestation이 최종 증거 레코드의 다이제스트(`evidence_chain_sha256`)를 담고, strict 검증은 이 필드를 요구하며 증거가 있는 머신에서는 로컬 체인이 attest한 체인과 같아야 한다. `verify-attestation --require-pinned-command`(CI가 사용)는 `.claude/required-test-command.json`이 없으면 실패한다. 트리 해시는 gitlink(서브모듈) 항목과 UTF-8이 아닌 경로에서 실패하고, 실행 권한은 한 비트(0700과 0755 동일, Windows와 동일)로 본다. 새 명령 `unlock <phase>`는 소유 프로세스가 사라진 잠금만 지운다.
- CI(`ci.yml`): replay에 `--require-pinned-command`; `checks`와 `portability`는 `if: always()`로 항상 실행되고 `attestation summary`가 성공이 아니면 건너뛰지 않고 실패한다; toolbroker 잡은 실행 20건 이상·건너뜀 제외 20건 이상을 요구한다; `self-qa`에 타임아웃과 `hooks.test.sh` shellcheck를 추가했다. `scripts/verify-attestation-inventory.js --ci-parity`는 CI와 같은 phase 선택과 replay를 로컬에서 한다.
- 테스트 품질: `tests/run-all.sh`는 테스트 파일 48개 이상(정확한 인벤토리 하한)을 요구하고, `node --test` 출력을 `scripts/test-summary-gate.js`로 검사해 실행 400건 이상·건너뜀 20건 이하를 요구한다(빈 테스트 파일이나 스스로 건너뛰는 스위트는 더 이상 통과하지 못한다). `scripts/tree-exclude-check.js`는 `TREE_EXCLUDE`의 개수가 아니라 정확한 패턴 5개를 고정한다. 새 테스트: `tests/gate-hardening.test.js`(11), 훅 테스트 447건(Linux 기준), 드리프트 테스트에 게이트 test 명령의 `--require-bound-tree` 검사.
- 훅(리뷰 반영): 8.3 짧은 이름 컴포넌트(`WORKFL~1`, `SETTIN~1.JSO` 등)를 쓰는 서브에이전트 쓰기를 모두 거부하고, 신뢰 집합에 `test-summary-gate.js`·`secret-scan.js`·`source-adoption-check.js`를 넣었으며, Bash·PowerShell 명령이 신뢰 집합 경로를 이름으로 지목하면서 쓰기 연산(리다이렉트, `sed -i`, `tee`, `cp`, `mv`, `rm`, `git apply/checkout`, `Set-Content` 등)을 하면 거부한다(읽기·실행·diff는 허용). 이것은 어휘 검사라 변수·간접 쓰기는 못 막는다. `fresh-implementation` 방식은 UNVERIFIED 출처에 금지된다(CLAUDE.md의 사다리보다 엄격한 의도된 제한).
- 라이선스·비밀: `source-adoption-check.js`가 `skills/`·`toolbroker`·`dashboard`도 스캔하고, 장부는 `skills/`가 인용하는 외부 저장소 19곳을 reference-only로 추가했다(총 25건, 커밋 고정·LICENSE sha256, 무라이선스 `adityaarakeri/senior-agent-skills`는 UNVERIFIED로 라이선스 항목 없이 등록하고 설치 명령을 `coding-master`에서 뺐다). UNVERIFIED는 복사·fresh-implementation이 불가하다. `secret-scan.js`는 `.env`, `.pem`, `.toml`, `id_rsa` 등도 읽고 SKIP을 경로 단위로 적용한다.
- 문서: 아키텍처 명세에 "What an attestation proves" 표, CLAUDE.md·README의 "서브에이전트는 쓸 수 없다/수기 JSON은 거부된다" 표현을 사실에 맞게 고쳤고, compound 에이전트의 로그 로테이션을 Phase 밖(오케스트레이터가 attest 후 별도 변경)으로 옮겼으며, test 에이전트 명령에 `--require-bound-tree`를 넣었다. `docs/merge-policy.md`에 2026-11-22 ruleset 조회 결과와 남은 관리자 설정을 적었다.

## 작업 트리 — 평가 파일럿 (미병합)

- 기존 고정 평가 목록에 합성 개발 사례 6건, 공개 holdout 후보 4건과 파일럿 프로토콜 2건을 추가했다. 해시는 LF 정규화된 입력을 고정하며 사전등록 시점, 실행 결과, 독립성 또는 보호 경계의 증거가 아니다.

## 작업 트리 — 하네스 결함 보완 (미병합, 브랜치 `fix/harness-gaps-20261121`)

- 훅: `jq`가 없어도 메인 세션의 Write/Edit가 막히지 않는다(서브에이전트와 Bash는 계속 fail-closed). `block-destructive.sh`는 PowerShell/cmd 재귀 삭제(`Remove-Item`·`del`·`rd` 등)를 넓은 대상에서 막고 `Bash|PowerShell`에 등록된다. `read-tracker.sh`는 Git Bash의 경로 표기(`/tmp` 대 `/c/Users/...`)를 정규화한다. `.codex/hooks.json` 매처에 `apply_patch`를 넣었다.
- `scripts/skill-audit.js`: 동봉된 LICENSE의 라이선스가 frontmatter에 없으면 실패한다. `design-evidence-harness`는 `Apache-2.0 AND MIT`로 표기한다.
- 채택 장부(`docs/source-adoption-2026-11-14.json`, schema 2): 라이선스 링크를 브랜치가 아닌 커밋 SHA로 고정하고 그 시점 LICENSE 본문의 sha256을 기록한다(`license_commit`, `license_sha256`). 2026-11-22에 6건의 LICENSE 원문을 다시 읽어 표기와 일치함을 확인했다.
- `scripts/source-adoption-check.js --verify-live`(선택, CI·run-all 미포함): 고정된 LICENSE를 raw.githubusercontent.com에서 다시 받아 장부의 sha256과 비교한다. 불일치는 종료 코드 1, 접속 불가는 2(통과로 보지 않음). 2026-11-22 실측에서 6건 모두 일치했다. `docs/merge-policy.md`에는 Windows 재실행이 CI 단계가 아니라 로컬 실측이라는 한계를 적었다.
- CLAUDE.md/AGENTS.md: strict 완료 명령 문서화, 재시도 예산 문구 정합, `docs/compound-log-active.md`(요약본) 우선 읽기. `tests/instruction-skill-drift.test.js`가 CLAUDE.md 스킬 목록과 `skills/`의 어긋남을 잡는다.
- 테스트·CI: 훅 테스트 확장(jq 없음, 복사본 일치, PowerShell 규칙), `run-all.sh`에 evidence-redact 단계 추가, CI self-qa에 훅 shellcheck 추가.
- 리눅스 실측(2026-11-22, Ubuntu·Node 24·bash 5.3, `mcp-country` 호스트): `tests/hooks.test.sh`의 jq 없음 케이스가 PATH에서 jq 디렉터리를 빼면 bash까지 사라져 종료 코드 127로 실패하던 결함을 고쳤다(`nojq_ready`가 bash 실행 가능과 jq 부재를 함께 확인하고, 아니면 링크 디렉터리로 대체한다). 수정 후 리눅스 전체 스위트 훅 350/350 통과.
- 훅 `evidence-guard.sh`(Claude·Codex): jq가 없을 때 호출자 분류(`agent_id`/`agent_type` 포함 여부)를 외부 `grep` 대신 bash 패턴 매칭으로 한다. macOS CI에서 PATH에 grep이 없으면 서브에이전트 쓰기가 통과(fail-open)하는 것이 확인되어 고쳤고, jq와 grep이 모두 없는 PATH를 만드는 회귀 케이스를 추가했다(구 훅으로 실패, 새 훅으로 통과를 Linux에서 실측).
- `--verify-live`: 요청당 15초 타임아웃과 1 MiB 응답 상한을 추가하고(content-length 선검사, 스트림은 상한을 넘는 즉시 취소해 전체를 버퍼링하지 않으며, 초과는 unreachable), `runLive`의 예기치 않은 거부는 종료 코드 2로 처리하고, 종료 코드 매핑(`runLive`: 0 일치, 1 불일치, 2 접속 불가·상한 초과)을 테스트로 고정했다. 오프라인 성공 문구에서 하드코딩된 날짜를 제거했다.
- attestation 트리 해시는 작업 트리 바이트를 그대로 해시하므로 Windows `core.autocrlf=true`의 CRLF 작업 트리는 LF 리눅스 체크아웃과 해시가 다르다(리눅스 재실행이 "code changed after the attestation"으로 실패하는 것을 실측). attestation은 추적 파일을 LF로 둔 트리에서 만들어야 CI 재실행과 일치한다.
- `docs/HANDOFF.md`를 State/Open/Next로 압축했다(이전 연대기는 history 파일로 이동).

## [3.0.0] - 2026-11-17 (작업 트리, 미병합)

### 변경 (게이트 호환성)
- Codex Phase 읽기 도구와 훅은 저장소 하위 폴더에서도 Git으로 작업 트리 루트를 찾는다. `doctor --host codex`가 프로젝트 등록과 읽기 도구 시작을 확인한다.
- GitHub가 fork PR 연결 정보를 생략하면 merge ref와 실제 CI 시도의 PR 기록을 대조한다.
- Merge guard는 체크가 생성되기 전에도 최신 워크플로 실행을 확인하고 판정 직전에 실행 목록을 다시 조회한다.
- Phase 증거와 attestation JSON은 기록을 완료한 임시 파일로 교체한다. 대시보드도 필수 Phase의 엄격 검증 플래그를 확인한다.
- ToolBroker 문서를 요청 수신과 공급자 HTTP 교환에 적용되는 절대 시간 제한에 맞췄다.
- 필수 Phase 목록을 버전 관리하고 CI와 merge guard가 목록의 attestation 재실행을 확인한다. PR 후보는 base 정책의 필수 Phase를 유지해야 한다.
- 대소문자만 다른 Phase ID를 거부한다. attestation 발급 뒤 갱신되는 생성본 `dashboard/status.json`은 트리 해시에서 제외한다.
- 필수 Phase와 `--require-strict-evidence`를 지정한 검사는 테스트 요약과 verify 읽기 증명을 요구한다. attestation에 두 설정을 기록하고 재실행 전에 확인한다.
- Merge guard는 같은 PR과 head에 해당하는 검토 대상 워크플로의 최신 실행 및 현재 시도에 속한 결과를 확인한다.
- 트리 해시에 POSIX 실행 비트를 포함한다. 기존 증거·attestation과 호환되지 않으며 플랫폼별 새 증거가 필요하다.
- 머지 검사는 GitHub check suite의 워크플로 경로와 head를 확인한다. 실제 PR #69에서 조회와 실패 거부를 확인했으며 fork 호환성은 미검증이다.
- attestation별 CI 재실행을 독립 matrix 작업으로 나누고 모든 결과의 집계 통과를 기존 checks 작업의 선행 조건으로 둔다. 새 워크플로의 실제 GitHub 실행은 미검증이다.
- 시간 초과 시 Windows 프로세스 트리 또는 POSIX 프로세스 그룹 종료를 요청한다. Windows의 일반 자식·손자 fixture는 통과했으나 그룹을 이탈한 프로세스와 비정상 게이트 종료는 보호하지 않는다. Codex 읽기 증명 및 현재 트리 attestation 재발급은 미해결이다.

## [2.0.0] - 2026-11-16 (작업 트리, 미병합)

### 변경 (게이트 호환성)
- 기본 테스트·attestation 재실행 제한을 30분에서 150분으로 조정하고 유효한 `PHASE_GATE_TEST_TIMEOUT_MS` 범위를 1~86400000ms로 제한했다. Windows LF worktree 실제 전체 실행이 118.6분이어서 120분은 여유가 부족했다. inventory 검증의 바깥 제한은 실제 내부 제한보다 2분 길다. CI의 전체 실행 step은 150분, checks 잡은 기본 전체 실행 1회+재실행 1회를 고려해 360분, portability 잡은 설정 여유를 포함해 180분으로 조정했다. 여러 attestation은 전체 잡 예산을 초과할 수 있고 시간 초과 후 하위 프로세스 정리는 보장되지 않는다.
- Claude `Read` 훅 기본 제한을 10초에서 60초로 조정했다. 실제 호스트에서 새 기본 설정으로 읽기 기록 1회 성공을 확인했지만 모든 자원 부족 상황을 보장하지는 않는다.
- Windows FIFO 스킵 사유를 명시하고 Phase 체크리스트가 실시간 상태 표시가 아닌 요구조건임을 명확히 했다.
- 트리 해시가 실제 줄바꿈 바이트를 포함하므로 LF CI용 attestation은 별도 LF worktree에서 준비하도록 절차를 명시했다. 사용자 파일을 제자리에서 정규화하지 않는다.
- Phase 트리 스냅샷은 인덱스·저장소·설정 경로를 바꿀 수 있는 상속된 `GIT_*` 환경변수를 값 출력 없이 거부한다. 예외는 `GIT_PAGER`, `GIT_CONFIG_NOSYSTEM=1`, 플랫폼 null 장치를 가리키는 `GIT_CONFIG_GLOBAL`이다. 기존에 거부 대상 환경변수로 실행하던 호출은 신뢰할 수 있는 환경에서 해당 변수를 제거해야 한다.
- 이 검사는 Git 설정 파일이나 동시 변경을 격리하지 않으며 과거 증거의 환경을 소급 검증하지 않는다. Codex 읽기 신호와 실제 Phase 완료는 별도 미해결이다.
- HANDOFF의 현재 작업 트리 상태와 기존 시점 기록을 구분했다.
- 설정 격리 예외 추가 전 로컬 Windows / Node v26.13.0: strict-bound-tree·tree-enumeration-failure·attestation-race·attestation-tree-replay 테스트 33개 통과, 실패·skip 0. 전체 회귀와 CI는 미실행.
- 설정 격리 예외 수정 후 Windows 대상 검증: strict-bound-tree·verify-attestation-inventory 22개 통과, 실패·skip 0 (이후 빈 환경변수 테스트 추가).

## [1.9.0] - 2026-11-15

### 변경 (호환성 — 중복 JSON 키 거부)
- `scripts/task-graph.js`, `scripts/context-contract.js`: JSON.parse 성공 후 디코딩된 키 기준으로 중복 멤버 이름(`\u` 이스케이프 동등 키 포함)을 거부 (fail-closed). 이전에는 마지막 값이 적용되어 앞선 제한(constraints 등)이 조용히 사라질 수 있었다.
- 회귀 테스트 2건 추가 (`tests/task-graph.test.js`, `tests/context-contract.test.js`) — 수정 제거 시 실패(음성 대조) 확인. 관련 4개 테스트 파일 55/55 통과.
- **호환성 변경**: 중복 키를 가진 기존 계약·그래프 파일은 거부된다. 중첩 1000단계 초과도 거부. `analyze()` 직접 호출은 이미 파싱된 객체라 검출 불가(문서화).
- `docs/task-graph.md`, `docs/task-contracts/README.md` 문구를 1.9.0 동작으로 갱신.

## [1.8.1] - 2026-11-15

### 수정 (문서 동기화 + 테스트 시한폭탄 수정 — 게이트 코드 변경 없음)
- `docs/VERSIONING.md` 현재 버전/이력: 1.6.0에 멈춰 있던 항목을 1.8.1로 갱신, 누락된 1.3.0·1.3.1·1.4.0·1.7.0·1.8.0 추가.
- `tests/token-meter.test.js`: `--limit` 테스트가 서브에이전트 로그 파일의 mtime을 고정하지 않아, 실제 시계가 픽스처 날짜(2026-11-15T12:00Z)를 지나면 UUID1이 "newest"가 되어 실패(CI 4잡 실측: node22/24·macOS·Windows). 해당 파일 mtime 고정. 수정 전 로컬 재현(1 fail) → 수정 후 통과.
- `docs/task-contracts/README.md`: 중복 JSON 키 시 마지막 값 적용(검출 안 됨) 주의 문구 추가 (`docs/task-graph.md`와 동일 한계).

## [1.8.0] - 2026-11-15

### 추가 (사용자 결정 항목 2건 — 공개 저장소 민감도 감사 + C2b 후속 3건 (영상 채널 실험화) — 근거: 로컬 실측, CI 행은 병합 전 갱신)
- **사용자 결정 항목 ① 공개 저장소 민감도 감사** (`docs/sensitivity-audit-2026-11-15.md`, DECISIONS D13): 공개 저장소 `yjj3019/AI-Harness` (visibility=PUBLIC 실측) 전 역사 + 7채널 감사 — ① object DB **2,121 objects** 전수 (`git cat-file --batch-all-objects --batch` 단일 파이프, batch-check 총수와 0 불일치 — 누락 0) ② 공개 노출 집합 2,098 (로컬 전용 23개는 미노출) ③ 커밋 메타데이터 ④ CI 로그 (P2 macos job 581,842 B 샘플) ⑤ 워크플로 전 파일 ⑥ 릴리즈/LFS (0건/LFS 없음) ⑦ GitHub 부가 메타 (description="AI-Harness" · topics/homepage 없음 · issues 0 · wiki 미초기화 · PR 본문 60~64). 방법: 24종 ASCII 패턴 + 19종 UTF-16LE (바이너리 33개) + keyword 히트 전수 수동 분류. **고위험(credential/토큰/내부 네트워크): 0건 실측**. 판정 F1~F6: F1 실명+개인 이메일 49커밋 (gmail 34 + hanmail 15) **MEDIUM** — 히스토리 rewrite **미수행** (D13; 새 커밋 전부 noreply 실측 → 새 노출 0) · F2 로컬 PC 호스트명 **LOW-MEDIUM** — 현재 트리 적출 · F3 CI 러너 식별자 **LOW** — 현재 트리 적출 (공개 CI 로그 잔존 = GitHub 인프라) · F4 noreply 정형 **INFO** · F5 `C:\Users\*` 합성값 **NONE** · F6 CI 로그 "PRIVATE KEY" 4행 = blinding 주석 **NONE**. 한계: 바이너리 2인코딩만 커버 (기타 인코딩 미검증) · CI 로그 1 job 샘플 · 패턴 커버리지 갭 실증 (러너 호스트명 1종은 문서 정독으로 발견).
- **사용자 결정 항목 ② C2b 후속 3건 — 영상 채널 실험화** (video-poc.md §5 후속 후보 → `docs/practice/design-omniskill-video-channel-v1.8.0-2026-11-15/`, DECISIONS D12):
  - **SKILL.md 영상 채널 행**: 라우트 테이블 + Trigger + description (실험 PoC — **D4: 산출물+실측만, 게이트 증거 아님**) + `skills/design-omniskill/channel-video.md` 신설 (렌더 계약 · 결정성 계약 · 프레임 대조 · Checks · scorecard = 미정의 (D4) · 승격 경로). PPTX render-diff 게이트 + SKILL.md PPTX 규칙 불가침 (P2 선례 유지).
  - **`scripts/render-video.js` (zero npm deps)**: 저장소 package.json 변경 없음. playwright 선택 해석 (`--playwright <module>` → env `PLAYWRIGHT_MODULE` → repo `require.resolve`; 부재 → `{"status":"skip",...}` **exit 0** 실측 — **비게이트, `tests/run-all.sh` 게이트 블록 미포함**) · 시스템 브라우저 `msedge` (다운로드 없음) · ffmpeg 선택 (PATH → `FFMPEG_BIN` → ms-playwright 캐시, 최신 빌드 우선 — vp8→vp9 세대 대응) · stdout 단일 JSON. CI 워크플로/merge-guard `REQUIRED_CHECKS` 미변경.
  - **결정성 10회 실측** (순차 재녹화 107.99 s, 10/10 ok): 불변 **variants=1** (1440×900 · 25 fps · vp9 · requested 5 s · msedge 157.0.4341.46 · playwright 1.65.1) · 관측 변이 (계약상 미보장): duration_s 4.68~5.00 (10개 각이) · size 485,244~514,721 B (10개 각이) · sha256/creation_time 10개 각이 → **byte-level 결정성 미보장**, byte-diff/duration_s를 판정 신호로 사용 금지 (channel-video.md 계약).
  - **프레임 대조 실측**: viewport-matched ref (`--ref-out`) **5회 emit byte-identical** (29,895 B, sha256 `341f9eee…`) · frame-0 = 페인트 전 상태 가능 (캡처 시작 = 컨텍스트 생성) — 2변이 재현: unpainted **7.33 dB** (2-run byte-identical) / painted **40.39 dB** · 안정 프레임 t=1.0 s **40.17 dB** → 후보 임계값 **≥30 dB candidate-pass** (리뷰 신호, 판정 아님 — D4; 프레임 0은 실측값 그대로 보고, 암묵 교체 금지) · PSNR = 저장소 내 zero-dep (Node PNG 디코더 — GDI+ 독립 디코딩 교차 12/12 RGB 정확 일치) · minimal ffmpeg 빌드 제한 (psnr 필터·PNG 디코더·`-update` 부재) 실측 기록.
  - **practice 산출물 7파일** (sha256 전부 실측, 로컬 절대경로 적출 — F2/F5 기준): `video-5s.webm` 613,418 B `af6a5962…` (vp9 1440×900 25 fps) · `ref-1440x900.png` · `frame0.png` (변이 A) · `frame1.png` (t=1.0 s) · `canonical-run.json` · `determinism-10run.json` · `report.md`.

### 변경 (문서)
- `docs/DECISIONS.md` D12 (영상 채널 실험화 — 선택/버린 것 3/근거/한계 4) + D13 (민감도 감사 — 히스토리 rewrite 미수행 + 재감사 트리거 3종).
- `docs/host-permission-matrix-2026-11-15.md` 적출 5건 (F2/F3: 로컬 PC 호스트명 → "로컬 개발 PC", CI 러너 4행 → `<os>-latest CI 러너` 라벨 — 측정 값·시각 원본 보존) + `docs/host-scenario-replay-2026-11-15.md` 적출 1건 (F2: 호스트 행 — 커밋 전 스캐너 원본 재대조로 추가 발견, 감사 문서 한계 섹션에 기록) + 적출 주석 (감사 문서 참조).
- `docs/harness-reinforcement-plan-2026-11-15.md` 진행 상태: P2 → "v1.7.0 병합·태그 완료" 실측 (PR #64 · run 43682070828 9/9 · merge `8d3436d` · 태그 존재 `git ls-remote` 실측) + v1.8.0 = 사용자 결정 항목 별도 브랜치로 표기.
- `docs/HANDOFF.md` 현재 상태 v1.8.0.

### 검증 (로컬, 2026-11-15)
- 결정성 10회 재녹화 + ref 5회 emit + PSNR 3점 (7.33/40.39/40.17 dB) + SKIP 계약 (playwright 부재 → `{"status":"skip"}` exit 0) — 전부 로컬 실측 (practice `report.md` §3~§5).
- `bash tests/run-all.sh --fast` (Windows, Git-Bash, ~35분): **ALL CHECKS PASSED (fast)** (exit 0) — test files 46 (floor 15) · 게이트 9종: skill-audit 29 clean · secret-scan clean · tree-exclude 4/4 · handoff-lint ok (3 플랫폼) · agents-lint 6 files 0 problems · package-lint 35 checked 0 errors · design-channel code clean (28 files) · eval-set 1 pinned match · **hooks 306/306 passed**.
- 최종 트리 재검증 (문서 편집 후, 위 run의 게이트 시작 시점 트리 대비): handoff-lint ok · secret-scan clean · tree-exclude 4/4 · skill-audit 29 clean (4/4 exit 0 실측).
- CI: PR #65 1차 run (head `24d7be1`) 43693832844 **9/9 success** (checks node 22/24 · isolation linux · portability macos/windows · self-qa shellcheck · toolbroker ubuntu/windows/macos) — 본 행 갱신 커밋의 재실행도 전원 pass 확인 후 병합.

## [1.7.0] - 2026-11-15

### 추가 (하네스 보강 P2 묶음 — design-omniskill 운영 확정 · 인계 스키마 · 영상 PoC · scorecard 강화 · darwin 탐침 교정 — 근거: 로컬 실측, CI 행은 병합 전 갱신)
- **C1 design-omniskill 운영 확정** (DECISIONS D11): 실사용 1회 `docs/practice/design-omniskill-v1.7.0-2026-11-15/` (onepager.html + render 1440/1920 PNG + scorecard.json 8 items + evidence 2종 + report.md) — 실측: `design-channel-check.js html` clean (exit 0) · WCAG 대조율 8짝 전부 ≥4.5:1 (가장 약한 accent 5.99:1) · overflow 0 (1440/1920 scrollWidth==clientWidth) · `document.fonts.check` 20/20 true (2 family) · scorecard ok (8 items) · evidence html ok 2종 (EVIDENCE_CONTRACT 8필드) · `skill-audit` 29 skills clean · PPTX render-diff 불가침 (`git diff main...HEAD -- skills/design-omniskill/SKILL.md channel-pptx.md` = 빈, exit 0). design-cases 3종(contrast/overflow/font-fallback) 실측 기록 충당; aspect-ratio·document-preservation·source-adoption = 미기록 (report §5 Uncovered — 운영 확정 범위 밖). 한계: MCP 렌더 = 산출물+실측 (게이트 증거 아님, D4) · 단일 Windows-chromium · LLM 세션 트리거 활성화 미검증 [unverified] · grid-12col 미측정 (unknown+reason).
- **C2a 인계 확장 스키마 제안** `docs/handoff-schema-proposal-2026-11-15.md` — `handoff-state/1` (state.version/head · scorecard_refs[{path,role}] · eval_set_refs · measured[{fact,value,source}] · unknown[{item,reason}] = C3 계약 · next_actions non-empty; 제안, 게이트 아님 — head는 시점 스냅샷, scorecard 교차검증 미포함). 예시 검증 1건 실측: 정상 경로 `HANDOFF-SCHEMA-VALIDATE ok` (exit 0, scorecard_refs=6 · eval_set_refs=1 · measured=2 · unknown=1 · next_actions=2) + 부정 통제 4변이 전부 탐지 (state.version 불일치 · scorecard ref 경로 부재 · unknown reason 부재 · next_actions 빈).
- **C2b 렌더→영상 PoC 1편**: `video-render-1440.webm` (1,023,537 B · sha256 `70258f711b5b8e30646b5367e3e07bc9e591d29337ac95b0aed35b81984826e9` · 10.64 s · vp8 yuv420p 1440×900 25fps · 769 kb/s) + `video-poc.md` — Playwright MCP `recordVideo` (새 컨텍스트, file:// one-pager, 스크립트 스크롤+호버) · D4 한계 표기 (게이트 증거 아님) · SKILL.md 영상 채널 미추가 (후속 후보 3건 기록: 채널 행 신설 · 스크립트화+CI 결정성 · 프레임 대조).
- **C3 scorecard 3-gap 강화** (`scripts/design-channel-check.js`): ① `unknown: true` → 비어 있지 않은 `reason` 필수 ② `metric` → finite number 또는 `/^\s*-?\d/` 문자열 (단위/비율 "4.6:1"·"0 clipped" 허용, 순수 문장 거부) ③ 빈 `items` 배열 거부 — design-channel tests **7/7 pass** (신규 대조 5종: UNKNOWN 무사유 거부 · UNKNOWN+reason 통과 · "좋음" metric 거부 · 단위/비율 metric 통과 · `{items:[]}`·`[]` 거부) + 기존 수치 대조 회귀 통과 · **10회 variants=1** (10/10 exit=0, stdout-sha1(12)=39A5DB4B3FDD) · design-skill-engine §3-1 계약 + design-cases 템플릿 갱신. 회귀 리스크 0 근거: run-all.sh 게이트의 scorecard JSON 입력 0건 (scorecard 서브커맨드는 on-demand).
- **C4 darwin read 탐침 교정** (`scripts/host-permission-matrix.js`): L56 `/etc/hostname` → `/etc/hosts` (macos 러너에서 hostname 부재 → 파일 부재가 권한 실측 오염; 3호스트 공통 존재 파일) — 로컬 win32/x64 read=ok write=ok exec=ok net=ok(200) · tests **6/6 pass** (탐침 대상 고정 대조: win32:hosts/darwin:etc/hosts/linux:os-release) · 매트릭스 문서 "C4 탐침 대상 변경 기록" 추가 (기존 DENIED¹ 4행 역사 보존; 새 대상 재실측 = **UNKNOWN — P2 CI macos-latest run 실측 후 병합 전 동기화**).

### 변경 (문서)
- `docs/DECISIONS.md` D11 (design-omniskill 운영 확정 — 선택/버린 것 2/이유/한계 4).
- `docs/design-cases/` 3종 실측 충당 + 6종 템플릿 계약 갱신 (미측정 = `unknown:true`+`reason`, v1.7.0 C3).
- `docs/design-skill-engine-2026-11-14.md` §3-1 "v1.7.0 강화 (C3)" · P5 로드맵 행 갱신.
- `docs/host-permission-matrix-2026-11-15.md` read-probe 행 갱신 + C4 변경 기록 섹션.
- `docs/harness-reinforcement-plan-2026-11-15.md` P2 C1~C4 완료 실측 반영.
- `docs/HANDOFF.md` 현재 상태 v1.7.0.

### 검증 (로컬, 2026-11-15)
- 대상 `node --test`: design-channel-check **7/7** · host-permission-matrix **6/6** (fail 0).
- `bash tests/run-all.sh --fast` (Windows, Git-Bash): **ALL CHECKS PASSED (fast)** (exit 0, ~40분) — 게이트 9종: skill-audit 29 clean · secret-scan clean · tree-exclude 4/4 · handoff-lint ok · agents-lint 6 files 0 problems · package-lint 35 checked 0 errors · design-channel code clean (27 files) · eval-set 1 pinned match · **hooks 306/306 passed**.
- 최종 트리 재검증 (문서 편집 후, 위 run의 게이트 시작 시점 트리 대비): handoff-lint ok · secret-scan clean · tree-exclude 4/4 재실행 통과 (scripts·tests·hooks는 run 시작 후 미변경 — run 증거 유효).
- CI (P2): PR #64 run **43682070828** (head `1a64264`) **9/9 success** (checks/node 22·node 24 · self-qa/shellcheck · portability/windows-latest·macos-latest · toolbroker/windows·macos·ubuntu · isolation/linux-namespace) — macos-latest run에서 **darwin read=ok 재실측** (C4 — matrix 문서 5행 동기화, run 05:41:14Z).

## [1.6.0] - 2026-11-15

### 추가 (하네스 보강 P1 묶음 — 호스트 권한 실측 · 토큰 실측 · H-01~H-10 재주입 실측 — 근거: 로컬 실측, CI 행은 병합 전 갱신)
- **B1 호스트 권한 실측 매트릭스** (게이트 아님 — 실측 기록): `scripts/host-permission-matrix.js` (read/write/exec/net 4탐침, 상태 ok/denied/unknown, exit 0 고정) + `tests/host-permission-matrix.test.js` (5 test, portable) + `docs/host-permission-matrix-2026-11-15.md` (win32/x64 행 실측: read=ok write=ok exec=ok net=ok(200) @ 2026-11-15T00:49:07Z). CI는 **step·artifact만 추가** (checks ubuntu-latest + portability windows/macos, `upload-artifact@cf430e03… # v7` — job 집합 불변, merge-guard `REQUIRED_CHECKS` 9종 보존, YAML 파싱 검증 실측). CI 2행은 CI 실행 후 갱신 예정.
- **B2 토큰 실측**: `scripts/token-meter.js` (읽기 전용 — claude `~/.claude/projects/**.jsonl` + subagents, codex `~/.codex/sessions/**/rollout-*.jsonl`; 호스트별 최근 N, MAX 256MiB/2M행, cost-state·total-token cross-check: match/carried/divergent/unknown) + `tests/token-meter.test.js` (8 test) + `docs/token-meter-2026-11-15.md` (실측: claude 20/50세션 calls=1643 · codex 20/205세션 calls=5258 · 총 calls=6901 total=1,808,171,695 @ 2026-11-15T00:40:03Z — 시점 실측, live 세션 성장 반영). 스킬/기능 귀속·DSH·WSL 토큰 = UNKNOWN 명시.
- **B3 H-01~H-10 재주입 실측**: `docs/host-scenario-replay-2026-11-15.md` — 시나리오별 1행 (재현 성공 8 · 재현 실패 0 · UNKNOWN 2: H-03 대상 미정의, H-09 라이브 모델 필요). H-10은 enabled 3경로(유효·변조·누락 checkpoint) + inactive 경로를 throwaway fixture로 실측.
- 신규 검사 2종 10회 결정성 실측: token-meter variants=1 (8/8×10) · host-permission-matrix variants=1 (5/5×10).

### 변경 (CI)
- `.github/workflows/ci.yml`: checks·portability job에 host-permission-matrix 측정 step + artifact upload 추가 (신규 job 0 — merge-guard 필수 체크 9종 allowlist 유지).

### 검증 (로컬, 2026-11-15)
- `bash tests/run-all.sh` (Windows, node v26.13.0): **ALL CHECKS PASSED** (exit 0) — 게이트 9종 (skill-audit 29 clean · secret-scan clean · tree-exclude 4/4 · handoff-lint ok · agents-lint 6/0 · package-lint 35 · design-channel 27 clean · eval-set 1 match · **hooks 306/306**) + node tests **416 = 410 pass / 6 skip(Windows 사유 스킵) / 0 fail** (46 파일, duration 2440s — 동시 부하 포함).

## [1.5.0] - 2026-11-15

### 추가 (하네스 보강 P0 묶음 — 평가셋 고정 · 점수카드 실측 강제 · 말뭉치 6케이스 — 근거: 로컬 실측)
- `scripts/eval-set-check.js` + `docs/eval-set/eval-set.json` (A1 평가셋 고정 게이트 — `../report-editing-cases.json` sha256 핀 고정 1건) — `tests/run-all.sh` 게이트 블록에 `eval-set` 편입 (게이트 9종). 실측: eval-set tests 2/2 pass · 게이트 블록 통과 (hooks 306/306).
- `scripts/design-channel-check.js` `scorecard` 서브커맨드 (A2 점수카드 실측 강제 — metric 비면 `unknown: true`+evidence 필수, 위반 시 exit 1) — 양성 대조 4종 (수치 있음·unknown·증거 없음·깨진 JSON) — design-channel tests 6/6 pass · 10회 반복 variants=1 실측.
- `docs/design-cases/` 케이스 6건 (A3: aspect-ratio·overflow·contrast·font-fallback·document-preservation·source-adoption — 고정 입력·before·after·재실측 4종 구조, 실측 기록은 최초 사용 후) — 케이스 6건 존재 (파일 6개 실측).
- `docs/harness-reinforcement-plan-2026-11-15.md` (보강 방안 문서 최초 추가 — P0(A1~A3) 완료 반영, P1~P2 대기).

### 수정 (eval-set 게이트 해시 플랫폼 독립화 — CRLF/LF 정규화)
- `scripts/eval-set-check.js`: 평가 입력 해시를 줄바꿈(LF/CRLF/CR) 정규화 후 계산으로 변경, `docs/eval-set/eval-set.json` 핀을 LF 다이제스트로 재고정 — CI 우분투/맥(LF 체크아웃) `sha256 mismatch 1a784d0f511c…` 실측 → 원인: 기존 핀이 Windows CRLF 체크아웃 기준으로 잘못 고정 (blob(LF) sha256 `1a784d0f511c1403ea2b77561c8d6091fee0a62e509664eae338984f7bf4ee5a` = CI 실측값과 일치) → eval-set tests 3/3 pass · LF/CRLF/CR 10회 반복 variants=1 실측.

## [1.4.0] - 2026-11-15

### 추가 (새 검사: 코드 내 미등록 외부 참조 자동 스캔 — 근거: 로컬 실측)
- **애매/미검증 지점 폐쇄**: `copied_files=[]` 선언 외 코드 내 github.com 참조는 기계 검증 수단이 없었다 → `scripts/source-adoption-check.js`에 `scanCodeReferences(manifest, root)` 추가 — 코드 디렉터리(`scripts`·`tests`·`.claude`·`.codex`·`.agents`)를 재귀 스캔해 github.com 참조를 전수 추출, 허용 대상(① 자기 저장소 `github.com/yjj3019/*` ② 장부 등록 source/license/credit ③ 테스트 픽스처 `a/b`·`unrelated/thing`) 외 미등록 외부 참조 발견 시 파일+URL 보고 + exit 1. docs/는 출처 기록 담당 — 스캔 제외.
- CLI 출력에 실측 문구 추가: `unregistered code references: 0` — 실제 저장소 전수 스캔 결과 **미등록 외부 참조 0건 실측** (기존 실측: 코드 참조 = 자기 저장소 + 픽스처 2건뿐).
- `tests/source-adoption-check.test.js`: 스캔 양성 대조 2건 추가 (허용 참조 통과 · 미등록 `evil/thing` 거부 — 픽스처 문자열은 리터럴 회피 동적 조합) — 로컬 tests **8/8 pass** / fail 0 실측.

## [1.3.1] - 2026-11-15

### 수정 (라이선스 감사 보완 — GitHub API 전수 대조 실측, 문제 0건)
- **장부 6건 실측 완료** (2026-11-15, `GET repos/{r}/license` HTTP 200 전원): cloudflare/security-audit-skill **MIT** · shadcn/improve **MIT** · walkinglabs/learn-harness-engineering **MIT** · anthropics/knowledge-work-plugins **Apache-2.0** · yang0/handraw-style **CUSTOM-ATTRIBUTION** ("MIT License (with Attribution Requirement)" 본문 1,606자 실측 — CUSTOM-ATTRIBUTION 분류 정합) · pbakaus/impeccable **Apache-2.0** — 장부 기존 라벨과 **전수 일치, 문제 0건**.
- `scripts/source-adoption-check.js` (새 로직): `verified_spdx` 필수 필드 + **라벨-실측 일치 강제** 검사 추가, CLI 정확성 문구 갱신 ("verified_spdx cross-checked with GitHub API on 2026-11-15").
- `docs/source-adoption-2026-11-14.json`: 6건 `verified_spdx` 기록 · `tests/source-adoption-check.test.js` 강화 (실측 대조·불일치 거부) — 로컬 tests 6/6 pass (실측).
- 외부 패키지 의존성 0건 실측 (require = `node:` 내장 331건 + 상대경로뿐, npm/package.json 0) — 재확인 완료.

## [1.3.0] - 2026-11-14

### 추가 (source-adoption 장부 validator 정식 반영 — 근거: 로컬 실측)
- `scripts/source-adoption-check.js` (read-only 소스 채택 선언 검증기) · `docs/source-adoption-2026-11-14.json` (라이선스 검사 완료 참조 소스 6건 장부) · `tests/source-adoption-check.test.js` (6 test) — Draft PR #49 내용을 main 반영. 로컬 실측: tests **6/6 pass** / fail 0, CLI 출력 "6 declarations consistent; license authenticity NOT verified" (라이선스 진위는 도구가 검증하지 않음 — 독립 확인 필요).
- `docs/external-guide-review-2026-11-14.md` 14절 "제안 (draft PR #49) 유지" → **반영** 재교정 — v1.2.2 교정과 최종 정합.

## [1.2.2] - 2026-11-14

### 문서 (검토서의 source-adoption "반영" 표기 오류 교정 — 실측 근거)
- `docs/external-guide-review-2026-11-14.md` 14절이 `scripts/source-adoption-check.js`·`docs/source-adoption-2026-11-14.json`·test를 "반영 (PR #50/#51, v1.0.0)"으로 기록했으나, **실측상 세 파일은 Draft PR #49(OPEN, 미병합, 브랜치 `audit/source-adoption-ledger-20261114`)에만 존재**하고 main에는 없다 (`git ls-files` 0건, main skill-audit.js adoption 문자열 0건, PR #50/#51은 AI 모델 경쟁 주제 — 2026-11-14 실측).
- 장부 기록 문서(`docs/external-patterns-14repo-2026-11-14.md`·`docs/maturity/CONTEXT-ADOPTION-2026-10-26.md`)는 main 반영 — 표·미반영 목록·요약을 실측 사실로 교정하고, validator는 제안(미병합) 상태로 재분류.

## [1.2.1] - 2026-11-14

### 문서 (외부 개선 제안 가이드 정밀 분석 반영 — 근거: `docs/external-guide-review-2026-11-14.md`)
- 외부 가이드(2026-11-08 작성 15절 + 추가 조사)의 P0 후보를 현재 main `4afa4e4`(v1.2.0)와 전수 대조 — **P0 3건(HANDOFF 정합성·usage-accounting 명확화·CI 9/9) 이미 반영 확인**, P1+은 미반영 상태로 제안 유지.
- `docs/HANDOFF.md`에 2026-11-14 상태(PR #55 merge·v1.2.0·CI 9/9·검토 반영) 1줄 추가.
- docs/usage-accounting.md 16행 "Allowed string values ... are not scrubbed" (2026-11-11) 실측 — 가이드 P0 후보 B의 명확화가 본문에 이미 존재함을 검토서에 기록.

## [1.2.0] - 2026-11-14

### 변경 (성능 실측 5건 적용 — 근거: `docs/perf-bench-2026-11-14.md` 실측)
- `tests/run-all.sh`: 게이트 블록 **병렬 실행**(순서 보존 출력) + `--fast`(기본 전체 수트 유지, 무거운 E2E 생략 진입점) 추가 (개선 1·2).
- `.gitattributes`: `.claude/agents/*.md`·`.claude/commands/*.md` `text eol=lf` 추가 (개선 3 — 로컬 CRLF 오탐 제거, 블롭은 이미 LF 실측).
- `scripts/skill-catalog/generate.js`·`scripts/dashboard-status.js`: 소스 대비 mtime 미변경 시 재생성 스킵 (`--force`로 강제) (개선 4).
- `scripts/perf-bench.js`: `--gates-only` 추가 — 기준 재실측 경로 (개선 5).

## [1.1.1] - 2026-11-14

### 수정
- `scripts/perf-bench.js`: 쓰기 생성기 측정을 임시 복사본(`scripts/` 포함) 기준으로 수정 — 1차 실측에서 `skill-catalog/generate.js`의 `__dirname` 기반 출력으로 원본 `docs/skill-catalog.md` 1건이 덮어쓴 것을 확인, 복원 완료 (정정: `docs/perf-bench-2026-11-14.md`). 측정값은 유효.

## [1.1.0] - 2026-11-14

### 추가 (성능 실측: `docs/perf-bench-2026-11-14.md`)
- 성능 실측 도구 `scripts/perf-bench.js` 신규 추가 (표준 라이브러리 전용, CI 호출과 동일 형태, 쓰기 생성기는 임시 복사본에서 측정).
- 실측 결과: 게이트 6종 병렬 -54% (순차 5,763ms → 2,642ms), node 스폰 1회 ≈2.3s가 게이트 비용 지배, suite(8~9분)는 상위 8개 E2E가 지배 — 개선 가능성 5건 도출.

## [1.0.1] - 2026-11-14

### 변경 (시뮬레이션 12케이스 근거: `docs/versioning-sim-2026-11-14.md`)
- 버전 상승 기록(VERSION/CHANGELOG)은 변경 PR의 피처 커밋에 포함 — 독립 도구성 커밋 생성 금지 (문제점 #1 해결).
- 병렬 브랜치 경합: 같은 버전 예약 중복 허용, 태그는 최저 미사용 버전 (문제점 #2 해결).
- PATCH 예에 "(신규 테스트 추가 포함)" 명시 — "새 검사 추가"(MINOR)와 경계 확정 (문제점 #3 해결).
- 절차에 태그 존재 확인(`git ls-remote --tags origin vX.Y.Z`) 단계 추가 (문제점 #4 해결).

## [1.0.0] - 2026-11-14

### 도입
- 버저닝 체계 신설 (`VERSION` 파일 · `docs/VERSIONING.md` · 이 파일).
- 기준: PATCH=수정/문서/감사 보완 · MINOR=기능 추가 · MAJOR=호환 파괴·헌법 변경 (상세 `docs/VERSIONING.md`).

### 포함된 변경 (이 버전에 접힌 머지)
- 라이선스 전수 실측 기록 (PR #50, `b59fd9d`) — 외부 출처 22종 GitHub API spdx_id 실측(2026-11-14) 표기: external-patterns.md 라이선스 열, autoloop-patterns.md MIT, coding-master/design-master/ppt-master 참조 라이선스 표기, karpathy-skills(null)·senior-agent-skills(부재)·tigerless-labs(NOASSERTION)은 "아이디어만" 명시. skill-audit 29종 clean · CI 9/9 pass.
