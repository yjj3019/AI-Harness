# Compound Learning & Anti-Pattern Log

This file maintains a history of bugs, operational mistakes, and effective solutions. Agents MUST review this document before starting new tasks.

## Entries

### [2026-11-11] 외부 소스 도입 - 라이선스 안전 규율

- **Issue/Risk**: 외부 소스가 라이선스 미표기·불명확·바이러스성(예: canvas-design 프론트매터 `license: Complete terms in LICENSE.txt`처럼 라이선스 파일을 판독하기 전에는 판정 불가)일 때 원문을 복사하면 배포·라이선스 충돌이 발생할 수 있다.
- **Root Cause**: 프론트매터 문자열만 보고 라이선스를 '확인한 것처럼' 간주하기 쉽다.
- **Resolution/Pattern**: 출처·라이선스·조항 실측 → 아이디어·패턴만 취해 자체 구현 → 불명확하면 원문 복사 금지, **새 로직 재구현** → 도입 기록에 출처 + 라이선스 + 도입 방식(복사/아이디어만/재구현) 명시. 헌법 Primary Rules **License Safety**로 반영, `scripts/skill-audit.js`가 메타데이터 라이선스(기본 Apache-2.0)를 강제한다.

### [2026-11-11] 신규 스킬 반영 - 라우터 등록·점수 수식·기록 구조 점검

- **Issue/Risk**: 스킬을 '만들기만' 하면 skill-router에서 발각되지 않아 실제로 사용되지 않고, 7축 점수표는 축 배점(20/15·…)과 "체크 각 1점"이 맞물리지 않아 합계 100이 성립하지 않으며, 반영 기록 제목(Anti-AI)이 이후 확장(디자인/글쓰기/문서)을 담지 못한다.
- **Root Cause**: 반영(생성)과 통합(라우터·합산·목차)을 분리하지 않고, 최초 문서 제목을 재사용하면서 범위가 커져도 구조를 갱신하지 않았다.
- **Resolution/Pattern**: 신규 스킬 반영 체크리스트 — ① 라우팅 표에 등록 ② 점수/게이트 수식 합계 검산(배점 체크 분배 규칙 명시) ③ 기록 제목·목차를 현재 범위로 갱신 ④ 게이트 실측 후 보고.

### [2026-11-11] Harness·Loop 조사 반영 - 보유 규율 대조 후 기록만

- **Issue/Risk**: 하네스/루프 조사가 들어올 때 '무엇이 정말 새로운가'를 보유 규율과 대조하지 않으면 이미 있는 것(반복 상한 · verify 분리 · 승인 · 근거 우선 · HANDOFF)을 중복 도입하거나 반대로 틈새(kill-switch/Default-FAIL 훅, 완료 지표)인 것을 '보유'로 착각할 수 있다.
- **Root Cause**: 추천 목록의 기능 명세만 보고 이 저장소의 규율과 겹침 여부를 실측하지 않으면 판단이 문구에 끌린다.
- **Resolution/Pattern**: 보유 규율 컬럼과 대조 표로 '보유/틈새'를 나누고 실측(README 직접 취득) 2건만 채택 — 신규 스킬은 불필요(중복), 틈새는 구현 후보로 명시만. 설치·실행 없이 기록으로만 반영.

### [2026-11-11] 라이선스 제로 허용 강화 - 결정 사다리(채택 → 완전 재구현 → 제거)

- **Issue/Risk**: "문제 소지 라이선스"일 때 "재구현"만 규칙에 있으면, 재구현이 안전하지 않을 경우 소스에 위험 항목이 남을 수 있다. 라이선스 문제는 절대 발생해서는 안 된다(사용자 지시).
- **Root Cause**: 규율이 '복사 금지 → 재구현'까지였고 '최후 수단(제거)'이 명시되지 않음.
- **Resolution/Pattern**: 헌법 License Safety를 **zero tolerance 결정 사다리**로 강화 — ① 확실하고 문제없음 → 아이디어만 채택 ② 문제 소지 → 원소스 참고 완전 새 로직 재구현 ③ 그마저도 불가 → **소스에서 제거**. 도입 방식 분류에 '제거' 추가. 기록(§7) 동기화.

### [2026-11-11] 문서 파싱 정밀도 반영 - 구조 보존 + 부분 성공 보고 (kordoc 실측, MIT → 아이디어만)

- **Issue/Risk**: 문서 '읽기/추출'의 품질은 '열림'과 다르다 — 병합 셀이 깨지거나 실패 항목을 누락으로 감추면 파싱 결과가 사실과 다르게 보인다.
- **Root Cause**: 형식 게이트는 '생성/렌더' 중심이고 '추출(파싱)'의 구조 보존·실패 보고 기준이 없었다.
- **Resolution/Pattern**: kordoc(대표 벤치: HWPX 표 구조 100%)의 패턴을 **자체 기준**으로 옮겨 format-gate.md에 '파싱 정밀도' 절 신설 — 구조 보존(병합 셀)·소비자별 출력 분리·부분 성공 보고·스캔 계층 표기·회복적 파싱·벤치 관리. 설치·실행 없이 아이디어만.

### [2026-11-11] 4종 저장소 실측 반영 - 독자 라이선스·신뢰 라벨·credit 유지

- **Issue/Risk**: 포괄적인 '오픈소스'처럼 보여도 독자 라이선스(소스공개형 프리뷰, vork)나 미판정 소스가 있으면 복사·재배포 시 위반 가능성 — 라이선스 파일 원문 판독 없이 '오픈소스'로 단정하는 실수.
- **Root Cause**: README 문구('free'·'source-available')와 라이선스 종류는 다르다 — MIT/독자/GPL 구분은 LICENSE 원문 판독에만 근거해야 함.
- **Resolution/Pattern**: 4종 LICENSE 원문 직접 취득(MIT 2 · 독자 1 · 미판정 1) → 신뢰 라벨(확인/추정/가설)+credit 라벨을 형식 게이트 공통 항목으로 반영, 복사 0건(아이디어만).

### [2026-11-12] Craft gate - 미적 감각·문장은 외재화·강제 대상이다 (모델 능력 아님)

- **Issue/Risk**: 산출물 5개 버전 연속에서 사용자 리뷰가 "10/100 → 50 → 70 → AI 티/세련미 부족"으로만 상승 — 매 라운드 디자인 언어를 새롭고, "콘텐츠만 추가한 느낌"이 반복됐다.
- **Root Cause**: 미적 감각과 글쓰기 품질이 외재화·강제된 적이 없어서 매 라운드 즉흥 재발명(템플릿+패치)으로 수렴했다. 저장소에는 이미 크래프트 스택이 존재했으나(ppt-master: 액션 타이틀·고스트 덱·디자인 스펙 잠금 / visual-artist: 7축 100점 스코어카드·신선한 시선 재채점 / writer-master: 뷰포인트 퍼스트·7단계 편집·발행 게이트 / anti-ai-harness: anti-AI 패턴 체크리스트·4블록 보고서) 산출물 작성 과정에서 **로드조차 안 했다** — 존재하는 게이트를 우회하면 출력은 템플릿 분포로 회귀한다.
- **Resolution/Pattern**: 산출물급 작업에 크래프트 스택을 게이트로 강제한다 — ① 작성 전 design_spec(소스 오브 트루스) + 액션 타이틀(고스트 덱 테스트) ② 시각 산출물은 렌더 후 7축 스코어카드 ≥70 채점(0점 실패 축 있으면 FAIL) ③ 롱폼은 뷰포인트 퍼스트 문어체 편집 + anti-AI 패턴 체크 ④ 출하 전 4블록 보고서(변경/유지/근거/미검수). 'AI 티'의 원인은 모델의 감각이 아니라 **게이트 부재** — 이번 로그를 시작 전 필독 목록(compound-first)에 둔다. 실증: OpenShift Virtualization 실습 v6(액션 타이틀 10장, 스코어카드 90.5/100, 심층 글 2,164자 문어체 편집).

### [2026-11-12] 바이너리 검증 - '손상' 판정 전 탐침 자체를 검증하라 (양성 대조)

- **Issue/Risk**: 머지된 `03-deck.pptx`가 "corrupted(0슬라이드, 내용 누락)"로 3회 이상 재건·재시도되는 사고. 실제로는 커밋 blob이 시각 검증된 렌더 입력과 바이트 동일(sha256 일치)한 **완전체**였다 — 판정 자체를 뒤집는 오탐이었다.
- **Root Cause**: ① 탐침 스크립트의 한글 유니코드 이스케이프 오타(`\ud589`=호×, 실물 `U+D638` · `\uc740`=는×, 실물 `U+B294`)로 존재하는 텍스트가 '없음'으로 판정 — **양성 대조(이미 렌더 픽셀에서 보본 텍스트) 없이 탐침의 음성을 신뢰**. ② PS5.1 인라인 `-c` 문자열에서 정규식 `$`가 `\$`로 전파돼 '슬라이드 0개' 오판. ③ PS 파이프라인(`git show | Out-File`)이 바이너리를 깨뜨린 것을 blob 손상이라 오인.
- **Resolution/Pattern**: 바이너리 내용 검증은 (a) 탐침 코드를 `.py` 파일로 (PS 인라인 금지), (b) 실행 전 **양성 대조** — 렌더 이미지에서 직접 확인한 텍스트를 탐침이 반드시 True로 잡는지 먼저 확인, (c) blob 바이트는 PS 파이프가 아닌 python `subprocess.run([...], capture_output=True)`로 추출, (d) 최종 준거는 **시각 렌더 픽셀 + sha256(커밋 blob == 렌더 입력 sourceSha256)**. 'corrupted' 선언 전에 최소 2개 독립 경로(텍스트·해시·렌더)가 같은 결론을 내려야 함.

### [2026-11-12] Git 운영 - 머지 커밋에서의 `reset --hard HEAD~1`은 1-parent 회귀

- **Issue/Risk**: 실패 재시도 루프에서 `git reset --hard HEAD~1`을 3회 실행 → 로컬 main이 머지 커밋의 **첫 번째 부모(머지 전)**로 이동, 신규 실습 디렉터리 전체가 디스크에서 소멸(원격은 무사).
- **Root Cause**: 머지 커밋에서 `HEAD~1`은 첫 번째 부모(로컬 브랜치 측) = 머지 이전 상태. `--hard`는 그 상태로 워킹트리 전체를 덮음.
- **Resolution/Pattern**: 잘못된 커밋을 되돌릴 때는 ① `git reset --soft HEAD~1`(워킹트리 보존) 또는 ② **명시적 안전 SHA 피닝**(`git reset --hard <이미 검증한 SHA>`). `HEAD~1` 상대 참조 + `--hard` 조합 금지. 재시도 루프에 하드 리셋이 들어가면 루프 전 단행으로 검증 순서(빌드→탐침→해시→커밋→blob 확인)를 고정.

### [2026-11-12] 파일 정합성 - 온디스크 사본과 커밋 바이트는 별개 (재생성 후 즉시 재검증)

- **Issue/Risk**: 머지 후 정합성 점검에서 온디스크 `03-deck.pptx`(·OpenShift 바이너리 4종)가 커밋 바이트와 다름 — 파일이 외부에서 재생성돼 있었음.
- **Root Cause**: 로컬 파일 보호 프로세스가 렌더 검증 이후 커밋 전 사이에 사본을 다시 쓴 것으로 추정(정확한 시점·주체는 미검증).
- **Resolution/Pattern**: 바이너리 산출물은 **커밋 blob이 준거** — blob을 추출해 check_office·렌더·sha256 비교로 재검증하고, 워킹트리는 `git checkout --`로 복원. 로그에는 '파일 재생성 · 즉시 재검증' 중립 섹션으로만 기록(프로세스 명칭 기록 금지). 커밋 전 `git hash-object` → 커밋 후 `git rev-parse HEAD:<path>` 일치 확인을 바이너리 산출물 표준 절차로.

### [2026-11-12] CI 운영 - 플랫폼 디스패치 장애와 코드 실패는 다르게 판정

- **Issue/Risk**: 06:04Z부터 모든 CI 잡이 2~4초, 스텝 0개, 러너 미할당으로 전멸(동일 워크플로우는 40분 전 9/9 통과). fresh push 신규 런까지 동일 실패. `gh pr merge --admin`도 리포지토리 룰셋(필수 체크 9/9)에 하드 블로킹.
- **Root Cause**: GitHub 상태 페이지는 전무장(전일 21:21Z 해결된 Actions 대형 사고 이후 잔여 영향 추정 — 미검증). 저장소 코드·워크플로와 무관한 디스패치 계층 실패(0 스텝 = 코드 미실행).
- **Resolution/Pattern**: 실패 판정 시 `steps` 개수·러너 할당·동일 시점의 main push 런을 대조해 **플랫폼 실패인지 코드 실패인지** 먼저 분리. 플랫폼 실패면 게이트를 약화하지 않고(룰셋 우회 금지) 주기적 재시도로 대기, 전이력·근거를 검증 로그와 최종 보고에 기록.

### [2026-11-14] External review - Verify licenses by API, adopt ideas-only, probe positive controls

- **Issue/Risk**: Adopting external detector "pattern concepts" without license verification, or trusting a gate extension without planted-sample controls.
- **Root Cause**: A detector's effectiveness is only as trustworthy as (a) its source's license evidence and (b) positive controls whose fixture text matches the pattern's actual syntax.
- **Resolution/Pattern**: Every external repo review: GitHub API spdx_id 실측 + LICENSE 보조 실측 → decisions ideas-only/기록/미채택, code copy 0. Gate 확장 시 양성 대조 7종(정규식과 픽스처 문법 일치) + 자기 스킬 셋 clean + 기존 테스트 전부 통과를 동시에 검증. 양성 대조 문구가 패턴과 어긋나면(예: 'Never tell' vs 'do not tell') 대조가 silently miss — 픽스처를 패턴 구문에 맞게 고정.

### [2026-11-14] Simulation - 10x determinism runs expose a probe-shape blind spot and a latent CI fixture gap

- **Issue/Risk**: 전체 스위트 386테스트 중 정확히 1건 fail (`inventory guard counts files and rejects a shrunken suite`, 실패 테스트 이름 확인까지 3회의 스위트 런 소요). 같은 자리에서 감쪽같이 가려진 잠복 결함 발견: run-all.sh의 신규 스테이지 `node scripts/design-channel-check.js code scripts`가 fixture(`test-inventory.test.js`의 PRODUCTION_FILES)에 없음 → WSL 스텁 호스트에서는 127 트랩에 가려 보이지 않지만 **Ubuntu CI에서는 완료 분기가 MODULE_NOT_FOUND로 확정 실패**.
- **Root Cause**: (a) bash 탐지(`-c "exit 0"`)가 **실제 사용 형태(Windows 경로 인자 스폰)와 다름** — WSL 런처 스텁이 `-c`는 통과, 경로 인자는 백슬래시를 이스케이프로 변조해 `C:Usersuser...` → 127. 탐지와 사용 형태의 불일치 = 판별 검증이 실제 경로를 걷지 않은 것. (b) run-all.sh에 스테이지 추가 시 fixture 복사 목록을 갱신하는 규칙이 없었음.
- **Resolution/Pattern**: 탐지는 반드시 **실제 사용 형태 그대로** 측정 (임시 스크립트를 경로 인자로 스폰). run-all.sh가 스폰하는 모든 파일 리스트 ⊆ fixture PRODUCTION_FILES 교차검증을 커밋 전 게이트로 수행. 추가 파일=양성 대조·fixture 갱신·결정론 재실측 3종 셋.

### [2026-11-15] P1 build - probe() note param clobbered measured stdout; assert.match needs RegExp; merge-guard checks-file argv has no PR number

- **Issue/Risk**: Three latent defects found while wiring B1/B3: (1) `host-permission-matrix.js` net probe printed "curl ok (no status code captured)" — the `note` argument to `probe()` overwrites the detail with a static string, hiding the `-w %{http_code}` stdout the caller needs to parse; (2) a test asserted `assert.match(stdout, `^\\| win32/`)` with a **string**, which throws `ERR_INVALID_ARG_TYPE` instead of failing the assertion; (3) invoking merge-guard as `merge-guard.js 61 --checks-file …` silently ran **live mode** (argv[0] must be the PR number or `--checks-file`), producing a usage error that looks like a checks-file failure.
- **Root Cause**: (1) `probe()` conflates "human label" with "measured output" — when status is ok it returns `note || firstLineOfStdout`, so any probe whose value lives in stdout must omit the note; (2) `assert.match` (strict) requires a RegExp instance — template-literal strings are not auto-compiled; (3) `main()` dispatches on `argv[0]` only, so extra leading args route to the live path.
- **Resolution/Pattern**: (1) For value-bearing probes, pass no note and parse `detail` with an anchored regex; keep notes only for probes whose detail is a label. (2) Build RegExp with `new RegExp(...)` when the pattern is dynamic. (3) Documented argv shapes: live = `<pr-number>`; snapshot = `--checks-file <path> --expected-head <sha>` (no PR number) — both refuse (exit 2) by design, and the refusal messages are the measured evidence (B3 H-08).

### [2026-11-15] Local run-all on Windows - hooks gate takes 35+ min under concurrent load; log stays silent until gates flush

- **Issue/Risk**: `bash tests/run-all.sh` showed no output for 35+ minutes (gate phase buffers per-gate output until flush), risking a false "hung" diagnosis while a determinism loop and a 5-file `node --test` ran concurrently.
- **Root Cause**: The gate phase runs 9 gates in parallel with order-preserving output (buffered), and the hooks gate spawns many short-lived Git Bash child processes per case (306 cases); on Windows Git Bash each spawn is slow, and CPU contention from concurrent work stretches it well past the nominal 22–26 min total. The parent bash's own CPU time stays low (~12s) because it mostly waits on children.
- **Resolution/Pattern**: To check liveness without trusting log silence: list `bash.exe` processes and watch (a) the `hooks.test.sh` parent still accumulating CPU and (b) **fresh child bash/hook processes appearing with new start times** (e.g. `evidence-guard.sh` spawning). No new children + flat CPU = actually stuck. Avoid heavy concurrent work during the gate phase; a full run-all under load measured ~70 min here (410 pass/6 skip/0 fail, hooks 306/306, ALL CHECKS PASSED) versus 22–26 min unloaded. Also: `jq` is a hard run-all prerequisite on Windows — `choco install jq` (the same route CI's Windows job uses) when `ERROR: missing required tool 'jq'` appears.

### [2026-11-15] CI triage - toolbroker/windows single-test flake (WinError 10053); darwin read probe "denied" is a missing-file artifact

- **Issue/Risk**: PR #62 run 43667190047: 8/9 green, `toolbroker / windows-latest` failed in ~19s with `FAILED (errors=1)` — `test_slow_drip_has_absolute_deadline_and_releases_slot` (ServerLimitTests) raised `ConnectionAbortedError: [WinError 10053]` in the **test-side** `sock.recv()` after the slow-drip server enforced its absolute deadline. Also, the new B1 matrix showed `read=denied` on macos-latest, which superficially looks like a host permission denial.
- **Root Cause**: (1) Socket tests that race a clean close against a TCP RST are timing-sensitive: on one Windows runner the RST reached the test socket instead of a clean EOF. Flake diagnosis rested on three facts: toolbroker code/tests/CI job were byte-identical to the v1.5.0 run that passed 26/26 on the same windows-latest image 2h earlier; ubuntu+macos legs of the same PR run passed; local Windows re-run passed 26/26. (2) The darwin read probe targets `/etc/hostname`, which does not exist on macOS (`cat: /etc/hostname: No such file or directory` — measured in the artifact probe details), so `denied` means missing probe target, not a denied permission.
- **Resolution/Pattern**: (1) For a single-test socket error on one OS leg: confirm (a) code unchanged in the run, (b) other OS legs green, (c) local re-run green — then rerun only the failed job (`gh run rerun <id> --failed`) instead of patching; if it fails twice, inspect the test's close-vs-RST timing assumptions. (2) Any `denied` in a single-target read probe must be read together with the probe detail (error body) before concluding "host denies reads"; the detail is co-published in the matrix doc/artifact by design. Candidate future fix: a darwin read target that exists on macOS (e.g. `/etc/hosts`). (3) Environment (this PC): GitHub Actions log/artifact downloads fail with a direct-dial timeout because a corporate PAC (registry `AutoConfigURL`) routes non-GitHub traffic through a corporate egress proxy while direct Azure blob IPs are blackholed; setting `HTTPS_PROXY`/`HTTP_PROXY` to that PAC proxy makes `gh` log and artifact downloads work (curl on Windows does not honor the PAC, so it needs the explicit proxy too).

### [2026-11-15] P2 build - Playwright MCP video pipeline: ffmpeg helper, remote video.path(), no fs in vm sandbox

- **Issue/Risk**: C2b 렌더→영상 PoC에서 3중 장애: (1) `recordVideo` 컨텍스트 생성 실패 — DSH 커스텀 playwright-core(1.64.0-alpha)의 ffmpeg-1011 헬퍼가 기본 `ms-playwright` 경로에 없음 (브라우저는 커스텀 `b\browser@…` 레이아웃에만 존재); (2) `video.path()`가 "Path is not available when connecting remotely" — MCP 원격 연결 모드는 원본 경로를 노출하지 않음; (3) MCP `browser_run_code_unsafe`는 vm 샌드박스에서 실행되어 `require('fs')`도 `await import('node:fs')`도 불가.
- **Root Cause**: (1) DSH 빌드의 브라우저만 비기본 경로에 설치되고 ffmpeg 헬퍼는 기본 경로로만 지연 설치됨; (2) 원격 모드에서는 video의 원본 경로를 의도적으로 감추고 `saveAs()`만 지원하는 API 설계; (3) vm 컨텍스트에 CJS require도 ESM dynamic import 콜백도 없다.
- **Resolution/Pattern**: (1) MCP 서버와 **같은 npx 캐치의 playwright-core** `cli.js install ffmpeg` 실행 (playwright-core 버전 == 빌드 리비전 일치 보장) 후 `ffmpeg -version`으로 검증. (2) `path()` 없이 `saveAs(final)` 호출 + recordVideo dir에 쓰인 원본을 외부에서(size+sha256) 대조 후 원본 제거 — 동일성 검증 없이 rename 금지. (3) 파일시스템 작업은 vm 밖(호스트 셸)에서 수행, MCP 코드는 브라우저 오케스트레이션만. 영상 메타(길이/해상도/fps)는 설치된 ffmpeg 바이너리로 실측, API 추측 금지. (참고: html 편집 후 렌더/녹화 최종본을 반드시 재확정 — C1에서 sha 체인 불일치 1회 교훈 재확인.)

### [2026-11-16] Tree binding - inherited Git routing and practical environment compatibility

- **Issue/Risk**: Git environment overrides can redirect snapshot enumeration. Rejecting every `GIT_*` variable also rejected the ordinary `GIT_PAGER` inherited by this host, causing 29 regression test failures in the first targeted run.
- **Root Cause**: Git subprocesses inherited routing and configuration overrides, while the initial blanket rejection did not distinguish the pager variable from tree-affecting overrides.
- **Resolution/Pattern**: Fail closed on inherited `GIT_*` variables with narrowly scoped pager and config-disabling exceptions; test alternate index, repository and configuration environment overrides before test execution. Independent review also identified the real multi-phase fixture's config isolation variables, so that fixture uses the platform null device rather than an arbitrary global config path. This does not isolate Git configuration files, concurrent mutation or validate old evidence. Actual Codex read-signal integration remains unverified.
- **Windows detail**: Git for Windows rejected Node's `os.devNull` spelling as a configuration file; the `NUL` spelling was verified locally and the real multi-phase fixture passed after the platform-specific correction. POSIX hosts remain unverified locally.

### [2026-11-16] Claude read signal - test real host before Phase rerun

- **Issue/Risk**: Codex shell reads cannot satisfy the existing verify read tracker, while a registered hook alone does not show that a host emits the required event.
- **Root Cause**: The hook requires a `Read` event attributed to the `verify` subagent; host-specific tool events cannot be inferred from configuration.
- **Resolution/Pattern**: In a disposable Git fixture, Claude Code 2.1.325 used a real verify subagent Read on a gate-generated test log. The hook produced a matching signal, and the fixture gate recorded verify PASS with `require_read_proof: true`. This verifies that fixture's Claude path, not Codex integration, host isolation, or review comprehension.

### [2026-11-16] Phase run - passing tests with changed tree are not Phase PASS

- **Issue/Risk**: The full Windows suite reported 415 passed, 6 skipped and 0 failed, but the Phase gate recorded FAIL because its initial and final tree snapshots differed. Five tracked practice binaries appeared modified after the run; their timestamps were old and the responsible actor was not established.
- **Root Cause**: Unverified. The aggregate tree hash does not identify changed files or when they changed. Git status before and after provides a candidate set, not proof of causation.
- **Resolution/Pattern**: Preserve changed binaries and failed evidence, do not equate test exit 0 with Phase success, and compare snapshots when rerunning. Do not restore or overwrite user files to force a matching hash.

### [2026-11-16] Read hooks - fixture success can fail on the real host under resource pressure

- **Issue/Risk**: A real Claude verify subagent read the successful test log, but strict verify could not record PASS because no read signal was generated.
- **Root Cause**: Claude hook event output showed the actual `PostToolUse:Read` hooks were cancelled; one reported Git Bash `fork: Resource temporarily unavailable`. The specific resource exhaustion mechanism was not established.
- **Resolution/Pattern**: Keep the valid bound test evidence and the Phase incomplete. Do not synthesize hook events. A failed strict record rotates the read token, so a later attempt needs a fresh real verify Read. Fixture success alone does not prove the production invocation will succeed under different load.
- **Follow-up**: A fresh actual verify-subagent Read with a per-invocation 60-second hook setting produced successful hook events and a matching phase/token/log-hash signal. Strict verify was recorded with `require_read_proof: true`. This shows a successful configured invocation, not a controlled proof that the 10-second timeout caused earlier cancellations or a permanent repair of the default host configuration.

### [2026-11-25] Phase evidence-baseline (run 11) - Attestation tree, review rubric, hook guard limits, pilot grading

- **Issue/Risk**: (1) A tree-bound attestation made on a CRLF or otherwise different worktree does not match the committed tree. (2) The first review flagged public tool names and model IDs as sensitive. (3) The new `.env` shell-read guard is lexical, so it blocks harmless commands (`grep .env`, `cp .env.example .env`) and does not bound writes on every host. (4) A pilot can look better if the grader changes after the run.
- **Root Cause**: (1) The tree hash covers raw bytes, and `core.autocrlf` rewrites them. (2) The reviewer read the sensitive-info rule too broadly. The rule covers DRM product names, internal environment details, credentials and user paths. (3) Lexical matching cannot tell intent, so it fails closed and accepts false positives. Hosts differ: the Codex sandbox blocked writes outside the workspace, but native Windows Claude Code did not. (4) The grader and its hash were not frozen before the real run.
- **Resolution/Pattern**: (1) Before the gate test, set `core.autocrlf=false`, delete the worktree files and check them out again, then confirm with `git ls-files --eol` that they are LF. Run the full suite once in the background (about 33 minutes here) with `PHASE_GATE_TEST_TIMEOUT_MS` raised, and edit no bound file afterwards. (2) Resolve a rubric disagreement by asking the user. Record the decision and its scope in the review report, then have the reviewer re-evaluate; never self-approve. (3) Treat lexical hook guards as guardrails, not boundaries, and test the host write boundary on each host. (4) Freeze the grader and its hash before the real run. Report post-hoc re-grades separately and label them as such.

### [2026-11-26] Phase evidence-baseline (run 12) - Fixture file lists, in-Phase log cleanup, ToolBroker recovery limits, CI-only suites

- **Issue/Risk**: (1) Adding a file to a script's input list (the evidence-redact stage in `tests/run-all.sh`) broke the test-inventory fixture, and the failure surfaced only after a roughly 40-minute gate run (475 passed, 9 skipped, 0 failed after one retry). (2) The 30-entry log limit needed a cleanup, and doing it after attestation would invalidate the evidence. (3) ToolBroker requests stranded as IN_FLIGHT or UNKNOWN have no automatic recovery, and the operator who reconciles one is not recorded. (4) The Python ToolBroker tests do not appear in the gate log.
- **Root Cause**: (1) `tests/test-inventory.test.js` copies a fixed `PRODUCTION_FILES` list into an isolated root, so any new file dependency of a copied script is missing there. (2) The archive and index are bound to the tree hash. (3) Both are by design: a resend could duplicate an external effect, and the schema has no operator column. (4) `tests/run-all.sh` does not run them; CI does.
- **Resolution/Pattern**: (1) When a shared script gains a file dependency, update `PRODUCTION_FILES` in the same commit; search for other fixture lists first and run the inventory test alone before the full gate. (2) Move the oldest entries to the archive verbatim, add an index note and delete nothing, inside the same Phase as the other changes. (3) Recovery is operator-only: reconcile with a confirmed provider result (no resend) and purge COMPLETED rows older than twice the approval lifetime. Without a schema change there is no audit trail of who acted. (4) Run the Python ToolBroker tests locally and say so in the verify report.

### [2026-11-26] Phase evidence-baseline (run 13) - Merge before attestation, pending review findings, HANDOFF state, first signed key

- **Issue/Risk**: (1) A long-lived feature branch that regenerates a tree-bound attestation went stale whenever main moved. (2) A reviewer marked the unsigned attestation [BLOCKING] although the Phase order produces it after review. (3) After merging main, `docs/HANDOFF.md` kept both sides and claimed both "latest" and "not merged". (4) The first signed attestation has no public key on main to be verified against.
- **Root Cause**: (1) Every merge of main after attestation changes the tree, which voids it, and the attestation JSON conflicts because both sides regenerate it. (2) The review ran before a step that by design comes later, so the finding was structurally pending, not a defect. (3) `HANDOFF.md` is excluded from the tree hash, so a textual merge raises no test failure. (4) Trust has to start somewhere: the PR introduces the key.
- **Resolution/Pattern**: (1) Merge the new main into the branch before the Phase run, resolve the attestation conflict by taking main's file and regenerating it (never hand-edit), and treat any later merge of main as voiding the attestation. Result here: 479 passed, 9 skipped, 0 failed of 488. (2) When the Phase order makes a finding pending, record it as a pre-push gate (check, signed attest, local signature verification) and say so in the review report. (3) `HANDOFF.md` may be corrected after the test without new evidence; after a merge, rewrite the State block to one current state rather than keeping both sides. (4) CI trusts the first public key once with a warning because main has none; every later PR is verified against the key already on main.

### [2026-11-27] Phase evidence-baseline (run 14) - Key rotation timing, attest last, gate-recorded statuses, tree-bound docs

- **Issue/Risk**: (1) The signing private key was unavailable after the long test had passed. A new key pair was generated after explicit user approval and the not-yet-introduced public key was replaced in the PR branch, which changed the tree and voided the earlier evidence; test, verify, review, compound, check and attest all had to be repeated. (2) A signed attestation is stale if main moves between attest and merge. (3) A subagent report was read as if it were a verdict, and a review status of APPROVED was offered where the gate wants PASS or FAIL. (4) Review nits about a tree-bound file (the changelog) tempted an edit after the test.
- **Root Cause**: (1) Key availability was not checked before the expensive test, and the public key is part of the tree hash. (2) The attestation binds one tree, and a merge of main produces a different one. (3) Subagent reports are model output; only the gate writes records, and it accepts only PASS/FAIL for review. (4) Any edit to a tree-bound file after the test changes the tree.
- **Resolution/Pattern**: (1) Before the long test, confirm the signing key is usable; if a rotation is needed, get user approval and replace the public key first, then run the full Phase once. (2) Make the signed attest the last step: merge main beforehand, confirm main has not moved before attest, merge right after, and treat any later main merge as voiding it. (3) Treat subagent reports as inputs to inspect, and record review statuses as PASS or FAIL through the gate (APPROVED is rejected). (4) After the test, edit no tree-bound file; defer review nits about such files to the next Phase. HANDOFF.md, outside the tree hash, may still be corrected.

### [2026-11-27] Phase evidence-baseline (run 15) - Deployment shape before key controls, removing a control, host re-encryption, gate statuses

- **Issue/Risk**: (1) The owner made the attestation signature optional in CI after the signing key proved unusable. (2) After that change the verifier found two policy sentences that still required signatures; fixing them changed the tree and voided the test evidence, forcing a full rerun. (3) A host file-encryption agent re-encrypted tracked Office/PDF files during the long test, and the gate recorded FAIL ("code changed during test"). (4) Reports offered statuses other than PASS or FAIL. (5) The log Entries section exceeds the 30-entry limit.
- **Root Cause**: (1) The key-based control was added without asking how many machines and maintainers exist: with a single maintainer the private key cannot live on two machines, and a second key would not match the committed public key, because base-commit trust allows only one introduction. (2) The old requirement was not searched for across all documents when the control was removed; contradictory policy text is a defect. (3) The host agent rewrites files outside the harness's control; the gate correctly refused a changed tree. (4) The gate accepts only PASS or FAIL as record statuses. (5) Cleanup cannot happen inside a Phase because the archive and index are tree-bound.
- **Resolution/Pattern**: (1) Ask about the deployment shape (machines, maintainers) before adding a key-based control, and make the decision with the owner. (2) When removing or relaxing a control, grep every document, script and test for the old requirement before the test step, and diff the wording. (3) Restore the affected files from the index, check their headers, and rerun; the gate refusing was correct and its evidence must not be forced. (4) Record only PASS or FAIL. (5) Open: archive the oldest entries to `docs/compound-log.archive.md` and regenerate the index in the next change, outside a Phase.

### [2026-11-28] Phase evidence-baseline runs 16-18 - Test fixtures, duplicated guards, evidence cost

- **Issue/Risk**: (1) Full-suite test run failed twice on fixture subprocesses with fixed 30s/15s timeouts on a slow machine under a ~45 minute load. (2) A reviewer found the narrowed signing-key regex was applied only to the Claude hook, not the Codex hook. (3) Each edit to a bound file after the test voided the evidence and forced a ~45 minute rerun. (4) A moved-archive entry set could not be checked for byte-identity against main by the read-only verifier and reviewer.
- **Root Cause**: (1) Fixed timeouts tuned for a fast machine, not for load. (2) A guard exists in two host copies and no test or drift check covers the Codex key regex (open NIT: hooks.test.sh and the drift check skip it). (3) Review fixes were applied piecemeal after the test. (4) No documented byte-identity diff step for archive moves.
- **Resolution/Pattern**: (1) The same failure repeating twice is the stop signal: find the root cause instead of a third retry; raise fixture timeouts to 120000 ms with assertions unchanged so a real hang still fails. (2) When a guard has two host copies, change both and add a test or drift check for the shared regex; close the open NIT. (3) Batch all review-requested fixes into a single edit before the final test run. (4) Diff a moved archive entry set against main for byte-identity (orchestrator, with write/git access) before attesting.

### [2026-11-28] Phase evidence-baseline runs 19-20 - Policy numbers, key removal, chained commands, branch cleanup

- **Issue/Risk**: (1) A policy document stated the number of required checks using a count copied from a merge guard's output (checks present on a PR head); the server ruleset says 10, and a reviewer caught it. (2) An unused attestation key file was to be removed. (3) A chained shell command (`git add a b missing && git commit`) aborted at the failing `git add`, skipped the commit, and later steps still ran. (4) Remote branch cleanup risked deleting work: squash merges do not show as merged into main.
- **Root Cause**: (1) A tool's observation was treated as the authoritative rule. (2) Removing a trust-bearing file without tracing who reads it can silently change fail-closed behavior. (3) The chain stopped at the first failure while the report was written as if the commit happened. (4) Branch merge state and PR state are different facts.
- **Resolution/Pattern**: (1) Read the authoritative source (the ruleset API) before stating a count in a policy doc; a guard's count is an observation, not the rule. (2) Trace every code path first (unsigned attestation never reads the key, a signed one with no key fails closed, keygen re-introduction is trusted once), then keep the path in the trust set and CODEOWNERS so it cannot be quietly re-added. (3) After a chained commit, check `git status` and `git log` before recording a report that says committed; stage explicit paths separately from the commit. (4) Classify branches by merged-into-main and by merged PR state, delete the merged ones in one push, and keep a branch whose PR was closed unmerged until the owner decides.

### [2026-11-28] Phase evidence-baseline run 21 - Conditional updates, duplicated guards, history rewrite, deferred nits

- **Issue/Risk**: (1) A conditional state update (IN_FLIGHT to COMPLETED) ignored its row count, so a concurrent reconcile was silently overwritten in the caller's view. (2) A guard regex duplicated in two host hooks had no test per copy and no drift check that fails on an empty extraction. (3) A chained `git add && git commit` aborted on one path (an already staged deletion) while later steps continued, so evidence nearly named a commit that did not exist. (4) Rewriting published history risked checking out protected binary files, a branch ruleset had to be disabled and restored, and host pull-request refs could not be removed by the owner. (5) Review nits were left open on purpose, because an edit after the test voids the evidence.
- **Root Cause**: (1) The UPDATE result was assumed to be success. (2) Each host copy is a separate artifact, and an extractor that returns nothing compares equal to another empty result. (3) `&&` stops at the first failure, and the report was written from the plan, not from the repository state. (4) `filter-branch` materializes a working tree, a ruleset change has no built-in record of the prior state, and pull-request refs belong to the host. (5) Any edit to a bound file changes the tree hash.
- **Resolution/Pattern**: (1) Check the affected row count on every conditional transition; on zero rows re-read and return the ledger's authoritative result, never the caller's assumption. (2) Add one test per guard copy plus a drift check that also asserts the extracted line is non-empty. (3) Stage explicit paths in a separate step, then verify with `git log` and `git status` that the commit exists before recording evidence. (4) Use plumbing (temporary index, `commit-tree`) instead of `filter-branch`; save the ruleset before disabling it and compare before and after restoring; treat host pull-request refs as unremovable by the owner and say so. (5) After the test, leave tree-bound nits open, record them as deferred in the review report, and fix them in the next Phase.

## Template for New Entries

### [YYYY-MM-DD] Phase X - [Category]

- **Issue/Risk**: Description of problem or mistake encountered.
- **Root Cause**: Why it happened.
- **Resolution/Pattern**: Effective fix or rule to avoid repeating it.


## 2026-11-16: Portable evidence and replay limits

- Compare staged Git blobs with raw checkout bytes before binding evidence; Windows checkout conversion can invalidate an otherwise equivalent snapshot. Preserve user-modified artifacts separately.
- The isolated LF snapshot passed the strict full test and genuine default-hook read proof; the inventory replay exit and output were lost during session transition and must not be reported as a pass. Capture long-running replay output and exit status durably in future.
- A single GitHub Actions job has a finite budget; sequential replay of multiple individually bounded attestations can still exceed it. The current CI arrangement fails closed but does not solve this scaling limitation. A default hook success does not prove reliability under process exhaustion.

## 2026-11-17: Workflow provenance and tree modes

- A GitHub Actions app identity and a required job name do not establish which workflow produced a check. Resolve its check suite to the reviewed workflow and head, and reject missing or ambiguous provenance. Actual PR and fork compatibility remains unverified.
- Binding POSIX executable bits changes the tree hash format and makes earlier attestations stale. Windows now uses tracked Git index modes to allow matching ordinary POSIX checkouts, but cannot observe actual POSIX permission changes. Regenerate evidence with genuine required read proof. Cross-platform matching and mode-only POSIX behavior remain unverified on this Windows host.
- Descendant cleanup, multi-attestation CI scaling, Codex read-proof integration, and current-tree attestation replay remain unresolved. Do not infer completion from passing fixture tests.
- Live read-only PR #69 check (2026-11-17): the new provenance lookup returned all nine required jobs and correctly refused the failed Node 22 job. GitHub job metadata identifies `Verify phase attestations` as the failing step; log download timed out, so the underlying cause and fork compatibility remain unverified.
- Attestation replay now uses separate CI matrix jobs and an aggregate dependency; local fixtures verify discovery, replay failure and skipped/failing aggregate rejection. The revised workflow has not run on GitHub. The gate requests Windows tree or POSIX group termination on timeout; a local Windows child/grandchild fixture passed, but escaping processes and gate death remain outside the mechanism.
- The first Windows full regression exposed an unregistered example repository URL in a new test. The source-adoption checker reproduced it; the fixture now uses this repository's own identity. The first run was stopped after the failure, so it is not a completed regression result.
- After correcting the fixture, Windows full regression exited 0: 430 tests, 423 passed, 7 skipped, 0 failed; hooks 306/306 (`.phase-evidence/full-test-final-20261117.log`). This does not prove Phase read-proof, POSIX behavior or the revised GitHub workflow. Linux Node was unavailable and TLS validation of the official download endpoint failed; no insecure workaround was used.

## 2026-11-18: Source audit remediation

- Keep attestation presence separate from verification. Generate reports from the current complete input list so deletions invalidate stale output. Use the same Phase ID parser for the gate, inventory, and dashboard.
- Bind CI evidence to the jobs for one workflow run attempt. Serialize operations on the same Phase, cap child output before it reaches disk, and preserve stdout/stderr ordering so test counters retain their context.
- The isolated LF candidate passed the strict Linux test step with 430 of 433 Node tests passing, zero failures, and 306 of 306 hooks passing. ToolBroker passed 27 of 27 on Windows and on Linux with loopback excluded from proxying. The Linux bound check stopped at the missing verify record. The previous attestation remains stale and must not be reused for the candidate.
- When the bound runner lacks a native Read event, use a real verifier on an isolated checkout with the same bound tree, raw test log, test record and active read token. Transfer the unchanged hook output and run strict verify on the original evidence. The bound check then identifies the first remaining Phase step.

## 2026-11-18: Priority evidence enforcement and portability

- A discovered-file inventory can omit a required Phase. Require the versioned inventory in CI and merge readiness, and compare PR candidates with the base policy.
- Compare Phase IDs case-insensitively before using them as filenames. Exclude only the generated dashboard status that depends on later evidence. Retain the dashboard code and Phase definitions in the tested tree.
- Enforce strict test summaries and Read-proof flags through the gate. Preserve the legacy attest validation path and challenge the final tree before publication. The first Linux run caught four legacy diagnostic regressions and an unregistered test fixture reference. The full rerun passed after both causes were corrected.
- A Windows Git archive used with the host's CRLF settings produced 213 blob mismatches after re-indexing in Linux. Transferring Git objects and checking out on the target host yielded 379 of 379 raw file and executable-mode matches.
- The current Phase passed all five strict checks with a genuine Claude Read, and the required attestation replay passed in a separate clean checkout. Linux run and replay each recorded 436 of 439 tests passing, zero failures, and 306 of 306 hooks passing. All three Linux-skipped cases passed on Windows in addition to the 59 focused cases. The candidate still needs an actual GitHub workflow run to validate hosted and fork behavior.

## 2026-11-18: Workflow freshness and JSON publication

- Query the target workflow's run list before trusting job checks. A queued run may be visible before its jobs exist. Recheck the same workflow list before issuing readiness.
- Write, flush and close sibling temporary files before replacing stored JSON. Inject failures during writing and replacement to verify that the previous evidence and attestation bytes survive. Keep Phase chain advancement separate from per-file replacement.
- Share strict attestation flag requirements with the dashboard. Verify deadline descriptions against both ToolBroker transport paths.
- All five strict Phase checks passed with a genuine Claude Read. A separate clean checkout replayed the required attestation, with 438 of 441 tests and all 306 hooks passing. All three Linux skips passed on Windows. Hosted GitHub behavior remains unverified.

## 2026-11-18: Effective hosted rules and Codex read permissions

- The classic branch protection endpoint returned 404 while an active ruleset enforced nine GitHub Actions checks and PRs on `main`. Check effective branch rules and the PR merge state before judging server-side enforcement.
- The hosted Node 22 job for PR #69 passed its test step and reported an attestation tree mismatch. The current merge guard rejected the failed run. Positive hosted evidence for the refreshed candidate requires a run on its own PR head.
- Codex native subagent lifecycle events established the `verify` role. The initial shell and MCP attempts returned no read result because of their respective policy denials. A role lifecycle event alone does not establish a successful read.
- A local read-only MCP tool with truthful readOnlyHint metadata produced an actual Codex PostToolUse event carrying the verify role. Bind the recorder to that tool, its agent and tool IDs, current epoch hash and original test bytes. A separate budget keeps the final summary visible for long logs. The full Phase and clean replay passed.

## 2026-11-18: Nested Codex startup and fork run metadata

- Check native tool startup from the affected working directory. Resolve the Git worktree for both the MCP reader and hook, then require the event cwd to remain inside it. Add a doctor probe and real nested verify run.
- When GitHub omits PR associations, bind checks to their selected suite and attempt. Read the PR base and merge SHA from successful GitHub step metadata and check the current merge ref. This uses the jobs API and keeps the unavailable-log path out of merge readiness.
- All strict Phase steps and independent replay passed. The actual current same-repository GitHub PR still points to the prior failing run. Hosted validation of the new candidate and a real fork remains pending.

## 2026-11-20: Hook trust and cross-platform test fixtures

- Project trust and individual hook trust are separate. Check `/hooks` and require a genuine verify-agent MCP read before recording strict proof; doctor configuration success alone does not establish trust or host event delivery.
- A Windows-created archive can carry CRLF workflow YAML into a Linux fixture. Normalize extracted shell script line endings and compare forced CRLF against an explicit LF baseline; a mutation without normalization must fail the regression test.
- Candidate `237b68c` passed strict bound testing and independent replay with 443 of 446 tests and all 306 hooks passing; the three Linux skips passed in focused Windows runs. Hosted PR checks remain a separate requirement.

## 2026-11-21: Canary and evaluation oracle controls

- A denied stderr redirect prevented the target write from being attempted, producing a false denial claim. Put diagnostics in a verified writable location, inspect the actual target error, and check both allowed and denied fixture states. One `bwrap` result does not validate native agent tools or network egress.
- A coding evaluation with only mixed-input and empty-input examples accepted a constant-for-nonempty counterexample. Challenge each oracle with plausible wrong implementations and retain independent positive-only, negative-only and multiple-value checks. A public holdout is not sequestered; hashes written after a run cannot prove preregistration.
- Adding pinned eval inputs also changes what a reduced test-inventory fixture must copy. Run its real completion branch after changing the manifest; a manifest-only check can pass while that fixture fails.
- A Windows Git archive can transform many baseline files to CRLF, even if changed-file hashes match. Prepare an LF candidate from a Git bundle and compare all unchanged tracked blobs and modes as well as changed clean blobs before treating a Linux run as CI-representative.
- A blocked shell process and an unchanged canary file do not establish write denial if no write was attempted; another MCP tool may still access the fixture. Check actual tool events, policy denials and effects independently, and do not equate a permission rule with an active OS sandbox.
- A cross-host synthetic model response obtained outside the repository does not show that its project rules were loaded. Test discovery and permissions separately; challenge revised shared instructions for newly introduced assumptions and keep unvalidated rules out of the shared core.

## 2026-11-21: PR merge candidate attestation recovery

- Prepare a clean checkout of the exact PR merge candidate. Check the raw tracked bytes against Git blobs and run the verifier's HEAD, index, worktree and untracked-file checks separately. If Git for Windows reports dubious ownership under the verification identity, scope the safe-directory argument to that exact checkout and command. Pass Git index data to the digest process when nested Git spawning is blocked.
- Check project trust and hook execution separately. A successful MCP log read can occur without the recorder running. Check the genuine verify-role event against the exact test log SHA-256 and active epoch before recording strict verification. The gate rotates the epoch when recording the verdict.
- On PR #71 the Windows bound run passed 439 of 446 tests, with zero failures and all 306 hooks passing. All five strict gate steps passed. The fresh attestation binds the tested tree. Hosted CI separately evaluates the current PR merge candidate.

## 2026-11-22: Phase evidence-baseline - environment, test inventory and hook portability

- **Git env overrides fail closed**: this host exports `GIT_ASKPASS`, `GIT_EDITOR` and `GIT_TERMINAL_PROMPT`, so 117 of 449 Node tests failed with "Git environment overrides are not supported" (extends the 2026-11-16 `GIT_PAGER` entry). Cause: the gate rejects inherited tree-affecting `GIT_*` variables by design. Read the error text before suspecting code; run with `env -u GIT_ASKPASS -u GIT_EDITOR -u GIT_TERMINAL_PROMPT`. Result after unsetting: 449 tests, 439 passed, 0 failed, 10 skipped.
- **Inventory fixture**: a new stage or file dependency in `tests/run-all.sh` or `tests/hooks.test.sh` must also be listed in `PRODUCTION_FILES` of `tests/test-inventory.test.js`, because that test copies `run-all.sh` into a temp tree and runs it. Hit twice in one session (evidence-redact script/docs, then `.codex/hooks/read-tracker.sh` and `.codex/hooks.json`). Re-run the inventory test after every such change.
- **Last line without newline**: `while read -r line` drops a final line lacking a trailing newline when input comes from `printf '%s'`. A new guard loop silently never ran; 16 tests caught it only because expected-deny cases existed. Use `while IFS= read -r l || [ -n "$l" ]`.
- **Path spelling in Git Bash**: one location can appear as `/tmp/x` or `/c/Users/.../Temp/x` depending on `TMPDIR` and native-exe argument conversion. Compare canonical paths (`cygpath -m` then `-u`) before any containment check; `read-tracker.sh` failed to record reads until canonicalized.
- **Guard scans heredocs**: the lexical Bash guard inspects heredoc text, so writing fixture strings containing denied commands through a heredoc in the Bash tool was blocked by the guard itself. Create such fixtures with the Write tool.
- **Bash 3.2**: `${var,,}` is Bash 4 only and breaks stock macOS bash 3.2. Use `shopt -s nocasematch` or `tr`. Review caught it; CI on macos-latest may mask it if Homebrew bash is first on PATH.
- **Unisolatable test must fail**: a test that prints "skip" and does not count when it cannot hide `jq` from PATH proves nothing on the platform that cannot isolate it. Make the unisolatable case FAIL. The Linux symlink-directory fallback was not executed on this host (symlinked bash does not load in Git Bash; no WSL/Docker) and stays unverified until CI.
- **Evidence provenance**: attestation and strict evidence for the final tree used a portable Node v26.13.1 zip (SHA-256 verified against SHASUMS256.txt) because the host had no Node. The orchestrator ran the test step directly because the subagent Bash timeout (10 min) is shorter than the full suite.
- **Adoption ledger pins**: license links in `docs/source-adoption-2026-11-14.json` (schema 2) now name a commit SHA and carry `license_commit` and `license_sha256` of the LICENSE text read there, because a `main` or `master` blob URL changes when upstream edits the file. All six licenses were re-read on 2026-11-22 and matched the recorded labels. The offline validator checks shapes only; the hash is not compared with the live file in CI.
- **Windows jq emits CRLF**: `jq -r` output ends lines with `\r` on Windows, so shell loop keys never matched and a generated ledger came out with empty URLs; pipe through `tr -d '\r'` and keep the original recoverable (`git checkout -- file`) before overwriting a tracked file.
- **Live license check**: `scripts/source-adoption-check.js --verify-live` (opt-in, not in CI or run-all) re-reads each pinned LICENSE from raw.githubusercontent.com and compares its sha256; mismatch exits 1 and an unreachable source exits 2, never a pass. On 2026-11-22 all six entries matched. Review left three [NIT]s unfixed: no fetch timeout or size cap, the exit-code mapping is untested, and the offline success line hard-codes a date.
- **Linux measurement (run 5, host mcp-country, Ubuntu, Node 24, bash 5.3)**: the run-4 attestation failed to replay there ("code changed after the attestation") because the tree hash is over raw bytes and the Windows worktree was CRLF (autocrlf=true). Converting the 210 CRLF tracked files to LF made the trees equal. The same run exposed a test defect: the jq-missing cases exited 127 because the stripped PATH lost bash too; `nojq_ready` now requires bash to run and jq to be absent. Lesson: replay evidence on a second OS before calling it portable; a "removed from PATH" test must prove the shell still runs. Recording `coding` resets later steps: record coding first, then run test.
- **Run 6**: the review-5 NITs are fixed (streamed 1 MiB cap with early cancel, rejection handler, `tc` loop variable, merge-policy wording). shellcheck 0.11.0 (pip `shellcheck-py` in a temp venv on the Linux host) passes the CI commands on run-all.sh, both hook directories and hooks.test.sh. Process lesson: a gate run started in a detached subshell keeps the phase lock after the shell tool returns; read `.phase-evidence/phase-<id>.lock/owner.json` and check that PID before starting a second run, and wait for the test JSON instead of re-launching.
- **Run 7**: the tree hash includes untracked-but-not-ignored files. The user's local-only `SESSION_LOG.md` was inside the run-6 tree, so a clean CI checkout would not have matched the attestation (confirmed by moving the file out and seeing `check` fail). The file was moved out of the worktree, the evidence regenerated on the exact commit tree, and the file restored afterwards. Lesson: before committing an attestation, run `check` and `verify-attestation` on a tree that contains only what will be committed.
- **Run 8 (PR #72 macOS CI)**: `portability / macos-latest` failed `no-jq subagent-auto` and `codex-subagent-auto` (want 2, got 0; hooks 348/350) although Windows and the Ubuntu host passed. Cause: with jq absent, evidence-guard.sh classified the caller with an external `grep`; with no grep on PATH the pipeline returned 127, which the `! grep` test read as "main session" and allowed subagent writes (fail-open). Fix: a bash `case` glob in both hook copies, plus a regression test whose PATH holds only bash and cat (skip only on Git Bash via `uname -s`, FAIL on other platforms). Reproduced on Linux against the previous hook (352/353) before fixing. Lessons: a fail-closed branch must not depend on external tools; local OS coverage is not CI coverage; a verify PASS needs Read-tool reads of the artifacts after the latest test run (grep does not count).
- **Three-model review (Opus, Codex, Grok; run 9)**: the three reviewers agreed on the families of weakness; the unverified ones were probed with real hook payloads before acting, and six bypasses were confirmed (`git -C dir reset --hard`, `.phase-ev*` in Write paths and Bash, trailing dot or space, `.js`-less `phase-gate`, glob `cat .phase-ev*`). Fixes: bash-only guard decisions, a closed gate trust set, `--require-pinned-command`, `evidence_chain_sha256`, tree-hash rejection of gitlinks and non-UTF-8 paths, an exact frozen `TREE_EXCLUDE`, executed/skipped counts in `run-all`, `skills/` license scanning (25 ledger entries) and secret-scan breadth. Lessons: (1) a reviewer's claim becomes a finding only after a probe reproduces it; (2) a guard test that only uses the plain spelling proves nothing about aliases; (3) `read` on a `|`-delimited case string breaks when the payload itself contains `|` (put the free-text field last); (4) a test file must not contain literal credential shapes, or the repo's own secret-scan flags it; (5) a nested `node --test` inherits `NODE_TEST_CONTEXT` and prints no summary unless that variable is removed; (6) Grok in headless mode needs explicit read-only allow rules, `--permission-mode plan` produces no analysis.
- **Guard iterations (run 9)**: three verify passes and two review passes reshaped the new guard. Mechanical lessons: a JS `String.replace` replacement containing `$'` inserts the text after the match and duplicated a hook file (use a replacer function or splice lines); an inline `>` or `&` inside bash `[[ =~ ]]` is a syntax error (keep regexes in variables); GNU `\>` is a word boundary, not a literal (use `[>]`); replacing a range of a script silently drops lines inside it (the dot-glob check vanished once and the existing test caught it); run the review before treating verify evidence as final, since a later review pass changes the tree. Design lessons: lexical command checks must not anchor to a word start (absolute and `$VAR/` prefixes), must read backslashes as slashes (PowerShell) and must treat `1>`, `&>` and `>>` as writes while ignoring `2>&1` and `/dev/null`.
- **Open, unverified**: hosted CI run of shellcheck (the apt version may differ from 0.11.0) and hosted ubuntu replay; the PowerShell guard is lexical (`-rec`, `-Recurse:$true` and `${HOME}` are now covered, but variables, aliases and splatting still evade it); the `license_sha256` live comparison is opt-in and not run in CI.
