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

## D12. 영상 채널 실험화 (v1.8.0, C2b 후속 3건)

- 선택: HTML 렌더→영상 채널을 design-omniskill 안의 **실험(experimental, PoC)** 채널로 확정한다: SKILL.md 라우트 테이블 + Trigger + description 1행 (실험, D4) + `channel-video.md` (렌더·결정성·프레임 대조 계약) + `scripts/render-video.js` (zero npm deps · playwright 선택 해석, 부재 → `{"status":"skip"}` exit 0 · 시스템 `msedge` · ffmpeg 선택 · stdout 단일 JSON).
- 버린 것 1: 게이트 연동. `render-video.js`는 `tests/run-all.sh` 게이트 블록에 **미포함**, CI 워크플로/merge-guard `REQUIRED_CHECKS` 미변경, 신규 job 0. 통과/실패 판정은 `design-channel-check.js` 실행에서만 나온다 (D4); 영상 채널 scorecard는 미정의.
- 버린 것 2: byte-level 결정성 약속. 10회 실측: dims/fps/codec **variants=1**이나 duration_s(4.68~5.00)·size·sha256(creation_time)는 전부 변이 → 계약은 불변(dims/fps/codec/requested duration)만 보장, byte-diff/duration_s를 판정 신호로 쓰는 것을 금지.
- 버린 것 3: CI 러너 실행. 스크립트는 로컬 전용(시스템 msedge/chrome 필요). CI 실행 + merge-guard 변경은 별도 결정(후속 후보 1).
- 근거 (2026-11-15 실측, `docs/practice/design-omniskill-video-channel-v1.8.0-2026-11-15/`): 결정성 10회 재녹화 (10/10 ok · 107.99 s · 불변 variants=1: 1440×900/25 fps/vp9/msedge 157.0.4341.46/playwright 1.65.1) · ref 1440×900 5회 emit **byte-identical** (29,895 B) · 프레임 대조: frame-0 페인트 변이 (unpainted 7.33 dB 2-run 재현 / painted 40.39 dB), 안정 프레임 t=1.0 s **40.17 dB** → 후보 임계값 ≥30 dB (리뷰 신호, 판정 아님) · PSNR 저장소 내 zero-dep (Node PNG 디코더 — GDI+ 독립 디코딩 교차 12/12 RGB 정확 일치) · SKIP 계약 exit 0 실측.
- 한계: ① 단일 호스트(Windows/Edge 157.0.4341.46)·단일 페이지·5 s 정적 대기 — 다른 OS/엔진·액션 시퀀스 미검증 [unverified]. ② 코덱은 playwright/브라우저 버전에 종속 (vp9 @ playwright 1.65.1 vs v1.7.0 PoC vp8) — 매 실행 JSON `codec` 필드로 기록. ③ frame 0은 페인트 전 상태일 수 있음(캡처 시작 = 컨텍스트 생성) — 실측값 그대로 보고, 암묵 교체 금지. ④ scorecard 미정의 (D4) — 승격 경로는 SKILL.md 개선 이력 규칙 (케이스 축적 → axis+양성 대조 정의 → 새 결정 기록).

## D13. 공개 저장소 민감도 감사 — 히스토리 rewrite 미수행 (v1.8.0, 사용자 결정 항목 ①)

- 선택: 공개 저장소(`yjj3019/AI-Harness`, visibility=PUBLIC 실측) 전 역사 민감도 감사를 수행하고 결과대로 조치한다 — object DB 2,121 objects 전수 스캔 + 7채널(커밋 메타·CI 로그 샘플·워크플로·릴리즈/LFS·GitHub 부가 메타) → **고위험(credential/토큰/내부 네트워크) 0건**. 판정 F1~F6 중 F1(실명+개인 이메일 49커밋, MEDIUM)은 **히스토리 rewrite 미수행**, F2/F3(로컬 PC 호스트명·CI 러너 식별자)는 현재 트리 적출 6건 (매트릭스 5 + scenario-replay 1), 감사 보고서 커밋(`docs/sensitivity-audit-2026-11-15.md` — 보고서 내 PII·proxy IP·로컬 경로도 적출).
- 버린 것: 전 역사 rewrite(filter-branch/rebase). 대가(공개 저장소 전 커밋 SHA 변경, 모든 클론·PR·태그 무효화, 기여자 분기 손상)가 이익보다 크다 — 노출된 것은 credential이 아니라 이름+이메일이고, 새 커밋은 이미 전부 noreply identity(실측: 최근 3커밋) → **새 노출 0**.
- 이유: ① noreply(`ID+username@users.noreply.github.com`)는 GitHub 공개 정형이고 numeric ID는 공개 정보 ② 필요 시 사용자 측 GitHub 설정("이메일 비공개 유지")으로 추가 차단 가능 — 저장소 밖 조치 ③ 재감사 트리거 3종 정의: (a) credential 의심 발견 즉시(패턴 재실행 + 해당 blob 전문 대조) (b) 새 바이너리 산출물 커밋 전(UTF-16 패스) (c) CI 로그에 환경변수 dump 단계 추가 시.
- 한계: ① 바이너리 스캔은 ASCII + UTF-16LE 2인코딩만 커버 — 기타 인코딩/암호화 바이너리는 미검증(현재 바이너리 33개 = 세션 생성 산출물이라 리스크 낮음, 단 **미증명**) ② CI 로그는 최신 1 job(P2 macos, 581,842 B) 샘플만 ③ 패턴 커버리지 갭 실증 — 러너 호스트명 1종은 문서 정독으로 발견(패턴이 아님 → 정독 병행 필수) ④ fork/star 소셜 메타·Actions 전 run 로그·Security 설정은 범위 밖(잔존 위험 낮음).
- 공개 CI 로그 잔존: F2/F3 원값은 공개 CI 로그에 유지된다(GitHub 인프라 — 재적출 불가·불요). 사용자 측 잔여 결정 = GitHub "이메일 비공개" 설정 (저장소 밖, 권고는 미수행 유지).
