# 렌더→영상 PoC (v1.7.0 C2b, 2026-11-15)

> **D4 한계 (우선 표기)**: 이 문서와 산출물(`video-render-1440.webm`)은 **게이트 증거가 아닌 산출물+실측**이다 (DECISIONS.md D4). 통과/실패 판정은 `scripts/design-channel-check.js` 실행에서만 나온다. 본 PoC는 design-omniskill의 **영상 채널 후보**를 탐색한 기록이며, `skills/design-omniskill/`은 이번 범위에서 수정하지 않았다 (C1 불가침 유지: `git diff main...HEAD` 대상 2파일 = 빈).

## 1. 목적

- C2의 "렌더→영상" 파이프라인 가능성 확인 1편: HTML 렌더 결과를 WebM 영상 산출물로 변환하고, 산출물의 속성(길이·해상도·코덱·해시)을 실측 가능함을 보인다.
- 범위: 1편 · 단일 페이지 · 스크립트 동작(스크롤+호버) 1회.

## 2. 방법

| 단계 | 내용 |
|---|---|
| 1 | Playwright MCP (`@playwright/mcp@0.0.83`, playwright-core `1.64.0-alpha-1790635538000` DSH 빌드, `--headless --isolated`)에서 **새 컨텍스트** 생성: `recordVideo: { dir: <본 디렉터리>, size: {1440×900} }`, 뷰포트 1440×900 |
| 2 | `file:///…/onepager.html` 로뎈 (`waitUntil: load`) — 입력은 C1 최종 산출물 (sha256 `696ecd00…d08`) |
| 3 | 스크립트 동작: 1.5s 대기 → smooth scroll 350px → 1.8s → 2번째 `.card` 호버 → 1.5s → smooth scroll 최하단 → 2.2s → 최상단 → 1.8s |
| 4 | 컨텍스트 닫기 → 원본 WebM(`page@…webm`) → `saveAs`/동일 복사본으로 `video-render-1440.webm` 확정 (원본 sha256 == 확정본 sha256 확인 후 원본 제거) |
| 5 | ffmpeg로 영상 메타 실측 |

- 환경 준비 기록 (파이프라인이 아닌 사전 조건): 최초 실행에서 `ffmpeg-1011` 부재로 실패 → `playwright-core cli.js install ffmpeg`로 `ffmpeg-win64.exe` (n7.0.1-playwright-build-1011) 설치 후 재실행 성공.

## 3. 산출물 + 실측

| 항목 | 값 |
|---|---|
| 파일 | `video-render-1440.webm` (본 디렉터리) |
| 크기 | 1,023,537 byte |
| sha256 | `70258f711b5b8e30646b5367e3e07bc9e591d29337ac95b0aed35b81984826e9` |
| 길이 | 10.64 s |
| 영상 스트림 | vp8 (libvpx), yuv420p, 1440×900, 25 fps |
| 비트레이트 | 769 kb/s |

- 입력 불변: `onepager.html` sha256 `696ecd00…d08` — C1 렌더 PNG/render 체인과 동일한 입력.
- 판정(탐색 기준): 파이프라인 동작 확인 — 영상 생성 1편, 이름 확정, 속성 실측 가능. 게이트 판정 아님 (D4).

## 4. 한계

- MCP 세션 렌더 (D4): 게이트 증거가 될 수 없음. CI 재현을 위해서는 스크립트(스킬 산출물)로 전환해야 하며, 이번 범위에서 실행하지 않았다.
- 단일 호스트(Windows) chromium, 단일 페이지, 10.64s. 영상 품질/용량 계약 없음.
- determinism 미검증: 동일 입력 재녹화 시 sha256 동등 여부는 UNKNOWN (비디오 인코딩 시계/프레임 경계 영향 예상 — 미측정).
- SKILL.md에는 영상 채널이 존재하지 않음 — 본 PoC는 채널 신설 근거로만 사용 가능.

## 5. 후속 후보 (승인 필요, 이번 범위 밖)

1. 영상 채널 행을 `skills/design-omniskill/SKILL.md`에 추가 (트리거/채널 라우트 확장) — C1 불가침과 충돌하므로 별도 결정.
2. MCP 의존 탈피: `playwright` 스크립트(저장소 내)로 동일 파이프라인 재현 → CI에서 결정성 실측(10회 variants=1 규율 적용 대상).
3. 프레임 대조 회귀: 렌더 PNG(본 디렉터리)와 영상 첫 프레임의 차이 실측.
