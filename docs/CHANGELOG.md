# CHANGELOG

이 저장소의 버전 기록. 규칙: `docs/VERSIONING.md`.

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
