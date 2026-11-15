# 토큰 실측 보고 — 2026-11-15 (B2 — 세션 로그 읽기 전용 추출)

- **성격**: `docs/harness-reinforcement-plan-2026-11-15.md` §2 B2 실행 결과. 모든 수치는 `scripts/token-meter.js`가 세션 로그에서 **읽기 전용**으로 추출한 값이며, 미수집 항목은 UNKNOWN으로 표기한다. 이 문서의 수치는 외부 인용이 아닌 이 호스트 로그 실측값이다.
- **실측 시점**: 2026-11-15T00:40:03Z (Asia/Seoul 2026-11-15 09:40). 라이브(작성 중) 세션이 존재해 재실행 시 수치가 달라질 수 있음 — 시점값이다.
- **대상 호스트 로그** (실측 위치):
  - claude: `~/.claude/projects/<slug>/<uuid>.jsonl` + `<slug>/<uuid>/subagents/*.jsonl` (검출 50세션)
  - codex: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` (검출 205세션)
  - DSH(DeepSeek Harness): 스토어가 Chromium LevelDB(`AppData/Roaming/@deepseek-ai/dsh-desktop`)로 평문 로그가 아님 → **UNKNOWN** (텍스트 형식 미확인, 파싱 미시도)

## 1. 도구

- `scripts/token-meter.js` — **읽기 전용** (로그 읽기만, 로그에 기록된 명령 실행 아님, 로그 수정 아님, stdout 외 어디에도 쓰지 않음).
- 사용법: `node scripts/token-meter.js [--host claude|codex|all] [--limit N] [--root DIR] [--json]` (기본: all, 20, 홈 디렉터리).
- 종료 코드: 0 = 리포트 생성(세션 0건 포함) · 2 = 잘못된 인자/읽기 불가 루트.
- 테스트: `tests/token-meter.test.js` — **8/8 pass** (실측 2026-11-15: fixture 기반 클로드/코덱스 형태 재현, 부재 필드 UNKNOWN, 포크 계승 "carried", 읽기 전용 검증).

### 로그 의미 (실측 — 추정이 아님)

| 호스트 | 카운터 관계 | total 정의 | 근거 |
| --- | --- | --- | --- |
| claude | input / cache_read / cache_write / output **독립 카운터** (캐시 필드가 input에 포함되지 않음) | 4항 합 | assistant 라인 `message.usage` 필드 구조 실측 |
| codex | `cached_input_tokens ⊆ input_tokens`, `reasoning_output_tokens ⊆ output_tokens` | `input + output` | 로그 자체 `total_tokens` = input+output 다수 일치(18/20) + 0-DELTA 이벤트 표본 |

- codex rollout 파일은 **포크/계속 세션**에서 이전 사용량을 이어받을 수 있음: 최종 누적 total > 파일 자체 델타 합 → `carried`. 컨텍트 컴팩션 리셋은 델타 합 > 누적 total → `divergent`. (둘 다 실측 사례 존재, 아래)
- claude `cost-state` 라인 = 호스트 자체 누적 회계(modelUsage 합). 마지막 cost-state가 파일 최종 라인보다 이르면 정당하게 `divergent`.
- **스킬/기능별 분배: UNKNOWN** — 두 로그 형식 모두 스킬별 토큰 사용량 필드가 없어 추출 불가 (추정 불가 유지).

## 2. 실측 표 — 최근 20세션/호스트 (2026-11-15T00:40:03Z)

### claude (검출 50세션 중 최근 20)

| session (slug/id) | mtime (UTC) | calls | input | cache_read | cache_write | output | total | xcheck |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| …-myway-eval--vfb-n4w/a27d4dac-… | 2026-11-14 06:00 | 2 | 6 | 12294 | 7840 | 1259 | 21399 | match |
| …-myway-eval-t0gl9fbw/33711ec5-… | 2026-11-14 05:59 | 2 | 6 | 12301 | 7847 | 1778 | 21932 | match |
| …-myway-eval-1hzr2xjb/4b0984bf-… | 2026-11-14 05:37 | 4 | 12 | 32223 | 10490 | 2739 | 45464 | divergent |
| …-myway-eval-naz22l5v/d9b7f134-… | 2026-11-14 05:36 | 4 | 12 | 32271 | 11142 | 2603 | 46028 | divergent |
| …-myway-eval-a727p4tn/33d7c513-… | 2026-11-14 04:51 | 2 | 6 | 12261 | 6968 | 766 | 20001 | match |
| …-myway-eval-wovc4376/fbdbc793-… | 2026-11-14 04:51 | 2 | 6 | 12247 | 6898 | 1245 | 20396 | match |
| …-myway-eval-vuzwc42j/98134aaa-… | 2026-11-14 04:51 | 2 | 6 | 11237 | 7958 | 1291 | 20492 | match |
| ProposalSkills/920ef3eb-… | 2026-11-13 07:02 | 1586 | 3481 | 622947705 | 6379627 | 2961635 | 632292448 | unknown |
| Temp-myway-eval-4ms7atzc/1d2d06fd-… | 2026-11-12 03:47 | 3 | 6 | 106949 | 38540 | 968 | 146463 | match |
| Temp-myway-eval-e9jeruf7/33986b75-… | 2026-11-12 02:05 | 2 | 4 | 59569 | 33607 | 1860 | 95040 | match |
| Temp-myway-eval-t0u6vv2n/b2c10745-… | 2026-11-12 02:04 | 4 | 8 | 117964 | 72582 | 1064 | 191618 | divergent |
| Temp-myway-eval-r1qmr4yv/eefe2728-… | 2026-11-12 01:51 | 2 | 4 | 59582 | 34478 | 946 | 95010 | match |
| Temp-myway-eval-g5-ecc2b/981cd576-… | 2026-11-12 01:51 | 2 | 4 | 59511 | 33475 | 1866 | 94856 | match |
| Temp-myway-eval-vd0x2ls2/11d13eeb-… | 2026-11-12 01:50 | 3 | 6 | 104655 | 41611 | 1548 | 147820 | divergent |
| Temp-myway-eval-3gl0l161/92cb91b2-… | 2026-11-12 01:49 | 2 | 4 | 58968 | 33733 | 814 | 93519 | match |
| Temp-myway-eval-ean-rzyj/7c47d907-… | 2026-11-12 01:49 | 2 | 4 | 59503 | 33801 | 306 | 93614 | match |
| Temp-myway-eval-8260afuy/5bfab2ce-… | 2026-11-12 01:48 | 2 | 4 | 59555 | 37275 | 168 | 97002 | match |
| Temp-myway-eval-2jdkbqfo/0fb04454-… | 2026-11-12 01:20 | 2 | 4 | 59565 | 33787 | 431 | 93787 | match |
| ProposalSkills/147800aa-… | 2026-11-11 16:35 | 13 | 26 | 626420 | 157564 | 7896 | 791906 | divergent |
| Temp-myway-eval-zvxdisuw/628a7c77-… | 2026-11-11 09:04 | 2 | 4 | 59538 | 33760 | 316 | 93618 | match |
| **TOTAL** | - | **1643** | **3613** | **624504318** | **7022983** | **2991499** | **634522413** | - |

### codex (검출 205세션 중 최근 20)

| session | mtime (UTC) | calls | input | cache_read | output | total | xcheck |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2026/11/12/rollout-…17-14-38-01a1ced2-… | 2026-11-15 00:39 | 2887 | 606835820 | 600423680 | 1555923 | 608391743 | divergent |
| 2026/11/11/rollout-…11-27-10-01a1c86e-… | 2026-11-14 14:06 | 2175 | 515380773 | 510438144 | 871583 | 516252356 | divergent |
| 2026/11/14/rollout-…23-02-34-01a1da5d-… | 2026-11-14 14:02 | 3 | 29473 | 20992 | 245 | 29718 | match |
| 2026/11/14/rollout-…23-02-06-01a1da5d-… | 2026-11-14 14:02 | 5 | 137322 | 116096 | 1029 | 138351 | match |
| 2026/11/14/rollout-…21-26-28-01a1da05-… | 2026-11-14 12:26 | 47 | 14157045 | 14087808 | 10334 | 14167379 | match |
| 2026/11/14/rollout-…21-25-54-01a1da05-… | 2026-11-14 12:25 | 25 | 7306240 | 7267712 | 15946 | 7322186 | match |
| 2026/11/14/rollout-…21-25-19-01a1da04-… | 2026-11-14 12:25 | 43 | 12480114 | 12450688 | 23817 | 12503931 | match |
| 2026/11/14/rollout-…19-48-30-01a1d9ac-… | 2026-11-14 10:48 | 1 | 19502 | 12288 | 119 | 19621 | match |
| 2026/11/14/rollout-…19-47-57-01a1d9ab-… | 2026-11-14 10:47 | 1 | 19473 | 12288 | 80 | 19553 | match |
| 2026/11/14/rollout-…19-47-35-01a1d9ab-… | 2026-11-14 10:47 | 1 | 20648 | 13440 | 109 | 20757 | match |
| 2026/11/14/rollout-…19-46-55-01a1d9aa-… | 2026-11-14 10:46 | 1 | 19482 | 12288 | 189 | 19671 | match |
| 2026/11/14/rollout-…19-44-56-01a1d9a8-… | 2026-11-14 10:44 | 15 | 3473825 | 3454208 | 6776 | 3480601 | match |
| 2026/11/14/rollout-…19-44-17-01a1d9a8-… | 2026-11-14 10:44 | 23 | 5300438 | 5280000 | 11832 | 5312270 | match |
| 2026/11/14/rollout-…19-43-35-01a1d9a7-… | 2026-11-14 10:43 | 25 | 5839396 | 5810048 | 8673 | 5848069 | match |
| 2026/11/14/rollout-…19-34-38-01a1d99f-… | 2026-11-14 10:34 | 1 | 20732 | 13440 | 142 | 20874 | match |
| 2026/11/14/rollout-…19-18-44-01a1d990-… | 2026-11-14 10:18 | 1 | 20505 | 13440 | 454 | 20959 | match |
| 2026/11/14/rollout-…19-17-43-01a1d990-… | 2026-11-14 10:17 | 1 | 19037 | 17024 | 341 | 19378 | match |
| 2026/11/14/rollout-…19-17-41-01a1d990-… | 2026-11-14 10:17 | 1 | 21698 | 18176 | 123 | 21821 | match |
| 2026/11/14/rollout-…19-17-41-01a1d990-… | 2026-11-14 10:17 | 1 | 19019 | 17024 | 316 | 19335 | match |
| 2026/11/14/rollout-…19-16-45-01a1d98f-… | 2026-11-14 10:16 | 1 | 20577 | 18176 | 132 | 20709 | match |
| **TOTAL** | - | **5258** | **1171141119** | **1159496960** | **2508163** | **1173649282** | - |

- codex cache_write는 20세션 전부 0 (필드 존재, 값 0 — 미수집이 아님).
- xcheck 분포: claude match=14 · divergent=5 · unknown=1 / codex match=18 · divergent=2.
  - claude divergent 5건 전부 **cost-state < 라인 합** 방향 (마지막 cost-state가 파일 최종 라인 이전 — stale 상태, 합리적).
  - codex divergent 2건 = 델타 합 > 최종 누적 (컴팩션 리셋; 1건은 실측 시점에 작성 중인 라이브 세션).
  - claude unknown 1건 (920ef3eb) = 파일에 cost-state 라인 자체가 없음 (미수집 → UNKNOWN).

### grand total (선정 40세션)

- calls=6901 · input=1171144732 · cache_read=1784001278 · cache_write=7022983 · output=5499662 · total=1808171695 · unknown_fields=0
- **스킬/기능별 토큰 분배: UNKNOWN** (로그에 해당 필드 없음 — 추측 불가).
- 비용($): claude cost-state의 costUSD는 호스트 자체 회계이긴 하나 모델별 단가 추정에 의존 → 이 문서에 비용 환산치 기록 안 함 (UNKNOWN 유지).

## 3. 한계 (UNKNOWN으로 유지)

1. 스킬/기능별 분배 UNKNOWN (위).
2. DSH 세션 토큰 UNKNOWN (LevelDB 스토어, 평문 로그 아님).
3. 이 표는 **이 호스트(Windows, user)**의 로그만 대상. GitHub runner·WSL(Fedora)·기타 호스트 로그는 미수집 → UNKNOWN.
4. 라이브 세션 시점 의존: 재실행 시 01a1ced2 파일 수치 증가 확인 (실측: 2869→2873→2877→2887 calls, 분간격).
5. 캐시 비율·단가·절감률 등 파생 지표는 이 문서 범위 외 (필요 시 별도 실측).
