# 하네스 보강 방안: 부족 항목과 구체적 조치 (2026-11-15)

> 근거: 2026-11-15 실측 기준. 모든 "부족" 판단은 실측(파일 존재·게이트·CI·테스트 수·승인 상태)에서 도출한다.
> 수용 기준은 전부 **측정 가능한 항목**으로만 둔다 — "품질 향상" 같은 주관 표현은 수용 기준으로 쓰지 않는다.
> 구현 범위와 버전 상승은 승인(사용자) 후 확정한다. 계획 승인 ≠ 구현 승인 (기존 규율 유지).

> **진행 상태 (2026-11-15)**: **P0 (A1~A3) 완료 — v1.5.0 반영** (실측: tests 8/8 · 게이트 블록 306/306 · 10회 variants=1). **P1 (B1~B3) 완료 — v1.6.0 병합·태그 실측** (PR #62 merge run 43672554810 **9/9 success** · main 병합 후 run 43673128839 success · `git ls-remote --tags origin v1.6.0` 존재 확인; run 43667190047의 toolbroker/windows 8/9는 WinError 10053 네트워크 플레이크 — 재실행으로 9/9 확인). **P2 (C1~C4) 완료 — v1.7.0 병합·태그 완료 실측** (PR #64 merge run 43682070828 **9/9 success** · merge 커밋 `8d3436d` · `git ls-remote --tags origin v1.7.0` 존재 확인; 승인 2026-11-15 사용자 지시 "다음 단계 권장안으로 진행해줘"; C3·C4는 권장안으로 범위 추가). **v1.8.0 = 사용자 결정 항목(① 민감도 감사 ② 영상 채널 실험화) 별도 브랜치 — 본 계획 문서 범위 밖** (DECISIONS D12·D13).

## 0. 현재 완성도 요약 (실측)

| 영역 | 갖춰진 것 (실측) | 부족한 것 (실측) |
|---|---|---|
| 코딩 | 게이트 8종 · CI 9 job · tests 53파일 · 결정성 10회 variants=1 · mutation-probe | 평가셋 고정 없음 · 호스트 권한 매트릭스 없음 · H-01~H-10 재주입 실측 없음 |
| 문서 | handoff-lint · evidence-redact · 평가 케이스 9건 · 소스 채택 6건 실측 | 토큰 실측 없음 · 인계 스키마 구조화 없음 · 영상 PoC 없음 |
| 디자인 | 진입점 SKILL.md·tokens.md·채널 6종 존재 (git 추적 8파일 실측) · design-channel-check(양성 대조 4종) · practice 274파일 | **P2 운영 확정 대기 · P5 말뭉치 6케이스 없음 · 점수카드 calibration(주관→실측 축) 없음 · 렌더 포렌식 계약 전채널 적용 미실장** |

## 1. 우선순위: P0 (데이터·검증 골격 보강 — 새 로직, 승인 필요)

### A1. 평가셋 고정 (기존 제안 P1+ — 보강 격상) — ✅ **완료 (v1.5.0)**
- **부족 근거**: `docs/report-editing-cases.json`(cases 9건)은 파일로 존재하나 해시 고정·변경 게이트가 없음 (실측).
- **방안**: 평가 입력물(gold 문서·기준 raster·케이스 JSON)의 SHA-256 고정 파일(`docs/eval-set/`) 추가 + `scripts/eval-set-check.js` (고정 목록 대조, 위반 시 실패) + CI checks job에 게이트로 편입.
- **수용 기준**: `eval-set-check`가 손상/누락/변경 1건 탐지 시 exit 1 실측 · CI 9/9 유지.
- **완료 실측 (2026-11-15)**: `eval-set-check.js` + `eval-set.json` (1건 핀) · run-all.sh 게이트 9종 편입 · tests 2/2 pass · 게이트 블록 306/306.

### A2. 점수카드 calibration — 주관 판정을 실측 축으로 치환 — ✅ **완료 (v1.5.0)**
- **부족 근거**: 스코어카드 항목이 실측 수치 강제가 없어 주관 판정 여지가 남음 (design-skill-engine §3-1 계획만 존재, 실장 없음 — 실측).
- **방안**: 각 채널 스코어카드 항목을 「실측 수치 | 판정 근거 | UNKNOWN 명시」 3단 강제 포맷으로 규정 + `design-channel-check.js`에 `scorecard` 서브커맨드 추가 (실측 수치/UNKNOWN 미기재 항목 거부).
- **수용 기준**: 점수카드 검사 양성 대조 4종 추가(수치 있음·UNKNOWN·누락·위조) · 10회 variants=1 · tests 증분 실측.
- **완료 실측 (2026-11-15)**: `scorecard` 서브커맨드 (metric 비면 `unknown: true`+evidence 필수) · 양성 대조 4종 · 10회 반복 variants=1 실측 · design-channel tests 6/6 pass.

### A3. P5 말뭉치 + 교정 루프 (기존 P5 — 방안 구체화) — ✅ **완료 (v1.5.0)**
- **부족 근거**: `docs/design-cases/` 디렉터리 존재하나 케이스 0건 (실측: 파일 0).
- **방안**: 6케이스 기준(이전 렌더·오버플로·명암비·폰트 폴백·문서 보존·소스 채택)을 A1 평가셋에 고정하고, 케이스마다 before/after 스코어카드 + 렌더 증거를 기록 → 누적 시 교정 루프의 재실측 근거로 사용.
- **수용 기준**: 케이스당 ①고정 입력 ②before 스코어카드 ③after 스코어카드 ④재실측 기록 4종 필수 · 말뭉치 ≥6건 · 전부 실측 수치 보유.
- **완료 실측 (2026-11-15)**: 케이스 6건 작성 (4종 구조) — 실측 수치 기록은 최초 사용 후 갱신 (미기록 상태 명시).

## 2. 우선순위: P1 (실측 확장 — 데이터 수집/실측, 새 로직)

### B1. 호스트 권한 실측 매트릭스 (기존 제안 P1+ — 방안 구체화)
- **방안**: macos·linux·windows × 「읽기/쓰기/실행/네트워크」 실측 행렬을 CI 로그에서 수집해 표로 고정 (`docs/host-permission-matrix-*.md`), CI artifact로 재생성 · 신규 게이트는 **아님** (실측 기록 문서).
- **수용 기준**: 3호스트 × 게이트 스모크 실측 표 · CI pass 유지.
- **버전**: 문서(PATCH) + 생성기(있는 경우 MINOR).

### B2. 토큰 실측 (기존 P1-D)
- **방안**: 세션 로그에서 입력/출력 토큰 합계(최근 세션 n건)를 추출하는 읽기 전용 실측 스크립트(`scripts/token-meter.js` — 로그만 읽음, 실행 아님) → 스킬/기능별 토큰 표.
- **수용 기준**: 실측 표 n건 · 추출 수치만 기록, 미수집은 UNKNOWN 명시.
- **버전**: PATCH(실측 문서) + MINOR(스크립트).

### B3. H-01~H-10 개별 재주입 실측 (기존 제안)
- **방안**: 시나리오별(H-01~H-10) 실제 호스트에서 1회씩 재현 후 개별 실측 기록 — 실측 불가 시나리오는 개별로 UNKNOWN 명시.
- **수용 기준**: 시나리오별 실측 1행 — 재현 성공/실패/UNKNOWN 구분 기록.
- **버전**: PATCH(실측 기록).

## 3. 우선순위: P2 (PoC·운영 결정 — 승인 필요, 정의만)

### C1. 디자인 하네스 운영 확정 (P2) — ✅ **완료 (v1.7.0)**
- **방안**: `skills/design-omniskill`(추적 8파일 실측)을 운영 스킬로 확정 — 운영 확정 시: 채널별 트리거 실측 · skill-audit 29스킬 clean 유지 · PPTX render-diff 불가침 유지.
- **수용 기준**: 운영 확정 후 실제 사용 1회 이상 실측 + 스코어카드/렌더 증거 기록.
- **버전**: MINOR (운영 확정 + 검사 연동 시).
- **완료 실측 (2026-11-15)**: 실사용 1회 `docs/practice/design-omniskill-v1.7.0-2026-11-15/` — html check clean (exit 0) · WCAG 대조율 8짝 전부 ≥4.5:1 (가장 약한 accent 5.99:1) · overflow 0 (1440/1920 scrollWidth==clientWidth) · fonts.check 20/20 true · scorecard ok (8 items) · evidence html ok 2종 (EVIDENCE_CONTRACT 8필드) · skill-audit 29 skills clean · PPTX render-diff 불가침 (`git diff main...HEAD -- SKILL.md channel-pptx.md` = 빈, exit 0) · design-cases 3종(contrast/overflow/font-fallback) 실측 기록 (aspect-ratio/document-preservation/source-adoption = 미기록, report §5 Uncovered) · DECISIONS D11 기록. 한계: LLM 세션 트리거 활성화 미검증 [unverified] · 단일 Windows-chromium 렌더 (D4: MCP 렌더 = 산출물, 게이트 증거 아님).

### C2. 세션 인계 스키마·영상 PoC — ✅ **완료 (v1.7.0)**
- **방안**: 인계 = HANDOFF 확장 스키마(상태·스코어카드·평가셋 참조) 제안 문서 · 영상 = browser-evidence 기반 렌더→영상 PoC 1편.
- **수용 기준**: 인계 스키마 예시 검증 1건 · PoC 산출물 1개 + 렌더 증거.
- **버전**: MINOR.
- **완료 실측 (2026-11-15)**: (a) `docs/handoff-schema-proposal-2026-11-15.md` — `handoff-state/1` (state/scorecard_refs/eval_set_refs/measured/unknown/next_actions; 제안, 게이트 아님 — head는 시점 스냅샷, scorecard 교차검증 미포함). 예시 검증 1건: 정상 경로 `ok` exit 0 (scorecard_refs=6 · eval_set_refs=1 · measured=2 · unknown=1 · next_actions=2) + 부정 통제 4변이 전부 탐지 (version 불일치 · scorecard ref 부재 · unknown reason 부재 · next_actions 빈). (b) 렌더→영상 PoC 1편 `video-render-1440.webm` (1,023,537 B · sha256 70258f71… · 10.64 s · vp8 1440×900 25fps) + `video-poc.md` (D4 한계 표기 — 게이트 증거 아님; 영상 채널은 SKILL.md 미추가, 후속 후보 3건 기록).

### C3. 스코어카드 3-gap 강화 (권장안 추가 — P2 범위)
- **부족 근거 (실측, `scripts/design-channel-check.js` L85–95)**: ① L91 `unknown: true` 항목은 라벨 외 아무 검증도 없음 (UNKNOWN 사유 미기재 허용 — "UNKNOWN은 기록하지 말것" 원칙과 모순) ② L92 `metric`은 비어 있지 않은 문자열이면 통과 (수치가 아닌 문장 "좋음"도 허용) ③ L88–95 `items: []` 빈 배열 스코어카드가 통과 (항목 0개 = 평가 부재지만 clean 판정).
- **방안**: ① `unknown: true` → 비어 있지 않은 `reason` 문자열 필수 ② `metric` → number(유한) 또는 숫자로 시작하는 문자열(예: `"4.6:1"`, `"0 clipped"`, `"200"`) — 숫자 없는 순수 문장 거부 ③ `items` 빈 배열 → 거부 ("scorecard has no items"). 회귀: 기존 수치 metric+evidence 통과 대조는 그대로 통과 (UNKNOWN 대조는 `reason` 포함으로 갱신 — 새 계약의 의도된 변경).
- **수용 기준**: 신규 양성/음성 대조 5종(UNKNOWN 무사유 거부 · UNKNOWN 사유 있음 통과 · 비수치 metric 거부 · 단위/비율 metric 통과 · 빈 배열 거부) tests 반영 · 기존 4종 통제 회귀 통과 · 10회 variants=1 · 설계 문서(§3-1 계약)·design-cases 템플릿 갱신.
- **버전**: MINOR (검사 로직 변경).
- **완료 실측 (2026-11-15)**: `isNumericMetric` (finite number 또는 `/^\s*-?\d/` 문자열) + 빈 items 거부 + UNKNOWN reason 필수 구현. design-channel tests **7/7 pass** (신규 대조 5종: UNKNOWN 무사유 거부 /UNKNOWN item without reason/ · UNKNOWN+reason 통과 · "좋음" 거부 /metric must be a measured number/ · "4.5:1"/1920/"0 clipped" 통과 · `{items:[]}`·`[]` 거부 /no items/) · 기존 수치 대조 회귀 통과 (UNKNOWN 대조는 reason 포함 갱신 = 의도된 계약 변경) · **10회 variants=1** (10/10 exit=0, stdout-sha1(12)=39A5DB4B3FDD) · design-skill-engine §3-1 + design-cases 템플릿 갱신. 회귀 리스크 0 확인: run-all.sh 게이트에 scorecard JSON 입력 0건 (서브커맨드 on-demand) — 실존 gate 입력 없음.

### C4. darwin read 탐침 대상 변경: `/etc/hostname` → `/etc/hosts` (권장안 추가 — P2 범위)
- **부족 근거 (실측)**: `scripts/host-permission-matrix.js` L56 darwin read 탐침이 `cat /etc/hostname` — GitHub macos runner에 `/etc/hostname`이 존재하지 않아 CI darwin read 행이 DENIED¹(산출물 부재)로 고정 (docs/host-permission-matrix-2026-11-15.md 실측 행). 권한 실측이 아니라 대상 파일 부재가 측정값을 오염.
- **방안**: L56 → `cat /etc/hosts` (macos·linux 공용으로 존재하는 표준 파일; darwin/linux/win32 3호스트 전부에서 read 가능해야 하는 파일로 정합). 기존 darwin DENIED¹ 행은 **역사 기록으로 보존**, P2 CI에서 새 대상 재실측 후 행 동기화 (미검증은 UNKNOWN으로, 새 대상 재실측 전에는 백필 금지).
- **수용 기준**: P2 CI macos-latest run에서 darwin read = OK 실측 (또는 DENIED이면 그 사유 실측) · test 갱신 · 매트릭스 문서에 탐침 변경 기록 + 재실측 행 반영.
- **버전**: MINOR (스크립트 로직 변경).
- **완료 실측 (2026-11-15, CI 재실측 대기)**: `host-permission-matrix.js` L56 → `cat /etc/hosts` (macos·linux·win32 공통 존재 파일; win32는 이미 hosts 사용) · 로컬 실행 win32/x64 read=ok write=ok exec=ok net=ok(200) · host-permission-matrix tests **6/6 pass** (신규: "read probe targets a standard file present on every runner image" — win32:hosts/darwin:etc/hosts/linux:os-release 고정) · 매트릭스 문서 "C4 탐침 대상 변경 기록" 섹션 추가 (기존 DENIED¹ 4행 역사 보존 · 재실측 = **UNKNOWN — P2 CI macos-latest 재실측 후 머지 전 동기화**).

## 4. 실행 원칙 (전체 공통)

1. 항목별로 「방안 → 구현 → 실측 → 게이트 → 기록」 순서 — 증거 우선 규율 유지.
2. 10회 시뮬레이션 variants=1 규율은 신규 검사 전부에 적용.
3. 주관 품질("더 예쁘게")은 수용 기준이 될 수 없음 — 전부 실측 수치/UNKNOWN으로 환산.
4. 미승인 항목은 이 문서에 유지 (삭제하지 않음) — 결정 대기 목록.
