# 렌더→영상 채널 PoC 확정 (v1.8.0 C2b, 2026-11-15)

> **D4 한계 (우선 표기)**: 이 문서와 산출물은 **게이트 증거가 아닌 산출물+실측**이다 (DECISIONS.md D4). 통과/실패 판정은 `scripts/design-channel-check.js` 실행에서만 나온다. 영상 채널은 **실험(experimental) 채널**이며, `skills/design-omniskill/channel-video.md`에 계약이 정의되어 있다.

## 1. 목적·범위

`video-poc.md`(v1.7.0 C2) §5 후속 후보 3건을 v1.8.0에서 처리:

1. **SKILL.md 영상 채널 행** — `skills/design-omniskill/SKILL.md` 라우트 테이블+트리거+설명에 실험 채널 행 추가, `channel-video.md` 신설.
2. **스크립트화 + 결정성** — `scripts/render-video.js`(저장소 내, zero npm deps)로 MCP 의존 탈피, 10회 재녹화 결정성 실측.
3. **프레임 대조** — viewport-matched 렌더 PNG와 영상 프레임의 PSNR 실측.

비게이트 불변: `render-video.js`는 `tests/run-all.sh` 게이트 블록에 **미포함**, CI 워크플로/merge-guard `REQUIRED_CHECKS` **미변경**. 저장소 의존성(package.json) 추가 **없음**.

## 2. 환경 (실측)

| 항목 | 값 |
|---|---|
| 호스트 | 로컬 Windows PC (이 세션의 개발 PC) |
| 브라우저 | Microsoft Edge 157.0.4341.46 (`channel: "msedge"`, `--version` 실측) |
| playwright | 1.65.1 — 저장소 밖 머신 로컬 디렉터리 설치(`PLAYWRIGHT_MODULE` env로 해석, 로컬 절대경로는 적출) |
| ffmpeg | ms-playwright 캐시: `ffmpeg-1011`(기존, vp8 시대 — vp9 디코더/`psnr` 필터/PNG 디코더 부재 실측) + `ffmpeg-1013`(본 세션 설치, 1.6 MiB, cdn.playwright.dev) |
| 입력 | `docs/practice/design-omniskill-v1.7.0-2026-11-15/onepager.html` — 커밋드 blob sha256 `696ecd00…d08` (LF, 5,335 B). Windows 워크트리 체크아웃은 CRLF (5,481 B, sha256 `6fe35ac1…`) — CRLF→LF 변환이 커밋드 blob과 **byte-identical** 확인, line ending은 브라우저 무관 |

환경 준비 기록 (파이프라인이 아닌 사전 조건, `video-poc.md` §2 ffmpeg-1011 기록과 동종): playwright 1.65.1은 `ffmpeg-1013` 빌드를 요구 → `npx playwright install ffmpeg` 1회 실행. 그 외 설치/다운로드 없음.

minimal ffmpeg 빌드 제한 (실측): `psnr` 필터 없음 (`No such filter: 'psnr'`), PNG 디코더 없음, `-update` 옵션 없음, vp8-시대 빌드(1011)는 vp9 디코더 없음. → PSNR은 저장소 내 zero-dep 경로로 계산 (§5.3).

## 3. scripts/render-video.js 계약

- **zero npm deps**: 저장소 package.json 변경 없음. playwright 선택 해석 순서: `--playwright <module>` → env `PLAYWRIGHT_MODULE` → repo root 기준 `require.resolve("playwright")`.
- **SKIP 계약**: playwright 부재 시 `{"status":"skip","reason":...}` 출력 + **exit 0** (비게이트 — 게이트 대상 호스트에 영향 0). 실측: `{"status":"skip","reason":"playwright not found (set PLAYWRIGHT_MODULE or --playwright <module>)"}` exit 0.
- **브라우저**: 시스템 설치 채널 `msedge`(기본)/`chrome`. 브라우저 다운로드 없음.
- **ffmpeg**: 선택 (메타/프레임 추출/프로브 전용). 해석 순서: PATH → env `FFMPEG_BIN` → ms-playwright 캐시 (최신 빌드 우선 — vp8→vp9 코덱 세대 대응).
- **출력**: stdout 1개 JSON (size/sha256/duration/fps/codec/creation_time/browser·playwright 버전/ref·frame·PSNR).

```
node scripts/render-video.js --page <html> --out <webm> \
     [--viewport 1440x900] [--duration 5] [--channel msedge] \
     [--ref-out <png>] [--frame-out <png>] [--frame-time 0] \
     [--playwright <module>] [--headed]
```

## 4. 결정성 10회 (실측)

명령: `node scripts/render-video.js --page <onepager> --out run<N>.webm --duration 5` (`PLAYWRIGHT_MODULE` 설정, 순차 10회, 총 107.99 s, 10/10 status=ok). 전체 JSON: `determinism-10run.json` (sha256 `1aa17cc7…`).

**불변 (variants = 1):**

| 지표 | 값 |
|---|---|
| width × height | 1440 × 900 |
| fps | 25 |
| codec | vp9 |
| requested_duration_s | 5 |
| browser channel/version | msedge / 157.0.4341.46 |
| playwright version | 1.65.1 |

**관측 변이 (계약상 미보장):**

| 지표 | 관측 |
|---|---|
| duration_s (컨테이너) | 4.68–5.00 s, 10개 각이 (노미널 5 s 대기 대비 컨테이너 기록 시차) |
| size | 485,244–514,721 B, 10개 각이 (485,726 B 클러스터 4회 포함 — 동일 크기라도 sha는 각이) |
| sha256 | 10개 각이 (creation_time 매 실행 상이 → byte-level 결정성 미보장, 계약대로) |

판정: dims/fps/codec **variants=1** (계약 충족). byte-diff/duration_s는 판정 신호로 사용 금지 (channel-video.md 결정성 계약).

## 5. 프레임 대조 (실측)

### 5.1 정규 실행 (canonical)

`canonical-run.json` (sha256 `4c821afe…`): `video-5s.webm` 613,418 B, sha256 `af6a5962…`, vp9 1440×900 25 fps, duration_s 5.0, creation_time `2026-11-15T07:10:03.201000Z`, msedge 157.0.4341.46 / playwright 1.65.1.

- `ref-1440x900.png` 29,895 B, sha256 `341f9eee…` — **5회 emit 실행 전-run byte-identical** (스크린샷 결정성 실측).
- v1.7.0 PoC 산출물 무결성 재확인: `video-render-1440.webm` sha256 `70258f71…` 재해시 일치 (본 세션 실측).

### 5.2 프레임 0 — 페인트 타이밍 변이 (중요 실측)

영상 캡처는 **컨텍스트 생성 시점**(goto/첫 페인트 이전)부터 시작 → 프레임 0은 페인트 전 상태일 수 있다. 2개 변이가 실측으로 재현:

| 변이 | 내용 | 파일 | PSNR vs ref |
|---|---|---|---|
| A: unpainted | 콘텐츠 하단(바디 배경 미페인트)이 암색 밴드 | `frame0.png` 149,354 B, sha256 `677419e8…` (2-run byte-identical 재현) | **7.33 dB** |
| B: painted | ref와 동일한 배경 | (rvt6 run) 261,064 B, sha256 `4d6a0190…` | **40.39 dB** |

→ 프레임 0 PSNR은 페인트 상태에 크게 의존. 후보 신호는 **안정 `--frame-time`** 사용, 프레임 0은 실측값 그대로 보고 (암묵 교체 금지 — channel-video.md 계약).

### 5.3 안정 프레임 (t=1.0 s) + PSNR 방법

- `frame1.png` 304,961 B, sha256 `15e29430…` — 추출: `ffmpeg-1013 -hide_banner -y -ss 1 -i video-5s.webm -frames:v 1 frame1.png`.
- **PSNR = 40.17 dB** (ref vs frame1), frame0 변이 B와 일치하는 ~40 dB 안정 베이스라인 (2-run 재현).
- **후보 임계값: ≥ 30 dB candidate-pass** — 실측 40.17/40.39 dB 안정 베이스라인에서 설정. 리뷰 신호일 뿐 판정이 아님 (D4). 7.33 dB 측정은 신호가 페인트 상태 이탈을 포착함을 보여주는 실질적 하측 관측.
- **PSNR 방법 (저장소 내 zero-dep)**: ffmpeg로 PNG를 디코딩할 수 없으므로 Node PNG 디코더(IHDR/IDAT·zlib, 8-bit, non-interlaced, color type 0/2/3/4/6)로 양측을 디코딩 후 8-bit 채널별 dB 평균 (ffmpeg `psnr`의 rgb24 "average" 의미와 동일). 스크립트 내 계산과 독립 one-shot 계산이 7.33 dB로 일치 (교차 확인).
- **디코더 검증**: 독립 디코더 GDI+ (System.Drawing) 대비 샘플 12점(6점×2 이미지) RGB 정확 일치 — Node 디코더 신뢰.

## 6. 산출물 (본 디렉터리)

| 파일 | 크기 (B) | sha256 |
|---|---|---|
| `video-5s.webm` | 613,418 | `af6a5962e6b7b4ec3a3a0183f482f1095f95c06c0532f1dfcc68243a342e790a` |
| `ref-1440x900.png` | 29,895 | `341f9eee950edc19706f91a5839b34864322c2cb44b17d92fc42ede006617c3d` |
| `frame0.png` (변이 A, unpainted) | 149,354 | `677419e84ae48f32147161da444ca87237d82ada4dcf6b82949ce0c7e3da7cc4` |
| `frame1.png` (t=1.0 s) | 304,961 | `15e29430caadea4cab154c71e9df0d507c96a047409ae6bfe53000e734e7091c` |
| `canonical-run.json` | 1,243 | `4c821afe8a18995c59a68509b9d7aa92c9c042d0e77ca1175283881e58071cb7` |
| `determinism-10run.json` | 4,755 | `1aa17cc7d795dd9d9c96585eee18ecc9157aa0afa813662a7c2df778bcee1942` |

> 경로 표기: 두 JSON의 `page`/`out`/`ref`/`frame`/`metadata_source`·`host` 필드의 로컬 절대경로는 감사 기준(F2/F5)에 따라 저장소 상대 표기·라벨로 적출했다. 그 외 필드(size/sha256/duration/버전 등)는 실행 시점 원값을 보존한다.

## 7. 한계

- 단일 호스트(Windows/Edge), 단일 페이지, 5 s 정적 대기. 스크롤/호버 액션 스크립팅은 범위 외 (v1.7.0 PoC의 액션 시퀀스는 재현하지 않음).
- 코덱은 playwright/브라우저 버전에 종속: 본 실측 vp9 (playwright 1.65.1) vs v1.7.0 PoC vp8 (playwright-core alpha 빌드). 매 실행 기록 (JSON `codec` 필드).
- 컨테이너 `duration_s`가 노미널 대기보다 짧은 관측 (4.68–5.00 vs 5) — muxer 클러스터 정렬 시차로 추정 (미검증 추정, 측정값만 보고).
- minimal ffmpeg 빌드 의존 환경에서는 PSNR이 저장소 내 zero-dep 경로 전용. 전체 ffmpeg (PATH)가 있으면 프로브/추출도 동일 사용.
- 영상 채널은 실험: scorecard 미정의 (D4). 승격 경로는 `SKILL.md` 개선 이력 규칙 (case 축적 → axis+양성 대조 정의 → 새 결정 기록).
- CI 미실행: 스크립트는 비게이트이며 CI 러너 실행은 범위 외 (후속 후보).

## 8. 후속 후보 (승인 필요, 이번 범위 밖)

1. CI 러너에서의 영상 렌더 실행 (선택적 job) — CI/merge-guard 변경 필요 → 별도 결정.
2. 영상 채널 scorecard 승격 (실험 → 정식 채널) — 케이스 축적 후.
3. 액션 스크립팅 (--actions 스펙: 스크롤/호버 시퀀스) — v1.7.0 PoC 동등 재현.
