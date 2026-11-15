# 공개 저장소 민감도 감사 (2026-11-15)

> **사용자 결정 항목 ①** 해소 산출물 (v1.8.0). `yjj3019/AI-Harness`는 **공개 저장소**(실측: `visibility: PUBLIC`)이므로, 트리 + **전 역사** + GitHub 부가 채널까지 노출을 실측하고 조치한다.
> 실측 기준: **미검증 수치는 기록하지 않는다** (UNKNOWN은 원인 명시).

## 1. 감사 범위

| 채널 | 대상 | 실측 방법 |
|---|---|---|
| ① object DB | **2,121 objects** (커밋·트리·블롭·태그, 전 리프) | `git cat-file --batch-all-objects --batch` 단일 파이프 스캔 (batch-check 총 수 2,121과 정확히 일치 — 누락 0) |
| ② 공개 노출 집합 | refs/remotes + refs/tags 도달 가능 객체 **2,098** | `git rev-list --objects` (로컬 전용 23개 객체는 공개 아님 — 아래 F-로컬) |
| ③ 커밋 메타데이터 | author/committer 이름·이메일·메시지 | object DB 스캔에 포함 (커밋 객체 본문) + `git log --all` 대조 |
| ④ CI 로그 | 공개 저장소 = 로그 공개. 최신 P2 macos job 로그 **581,842 B** 샘플 | 로컬 다운로드 로그 패턴 스캔 |
| ⑤ 워크플로 | `.github/workflows` 전 파일 | env dump/proxy/token 단계 grep |
| ⑥ 릴리즈/LFS | release 자산 · LFS 포인터 | `gh release list` (0건) · `.gitattributes` (행종료만, LFS 없음) |
| ⑦ GitHub 부가 메타 | description·topics·homepage·issues·wiki·PR 본문 | `gh repo view` · `gh issue list` (0건) · `gh pr view 60~64` (본문 스캔) |

## 2. 방법

- **패스 1 (ASCII)**: 24종 패턴 — credential 토큰 형식 (`ghp_/gho/ghu/ghs/ghr_`, `github_pat_`, `sk-`, `AKIA`, `xox*`, `AIza*`, `Bearer`, `-----BEGIN … PRIVATE KEY-----`), 내부 주소 (사내 프록시 IP·포트 — 본 보고서에서 적출, dotted private IP 10/192.168/172.16-31, `.pac`/`FindProxyForURL`), 머신 식별자 (`DESKTOP-*`, `ip-*.`, 러너 호스트명, `C:\Users\*`), PII (email, KR 전화번호), credential 키워드 (password/passwd/api_key/secret/token).
- **패스 2 (UTF-16LE)**: 바이너리 블롭 **33개** (Office·디자인 산출물) 대상 19종 핵심 패턴 — Office 내문은 UTF-16이라 ASCII 패스로 놓칠 수 있어 추가.
- keyword 계열 히트는 **전부 수동 분류** (도구 자체 패턴 정의 / 테스트 합성값 / 문서 기술) — 원시 카운트를 판정으로 사용하지 않음.
- 스캐너는 일회용 감사 도구(저장소 미커밋). 상시 게이트는 기존 `scripts/secret-scan.js`(현재 트리)가 담당 — 이번 감사와의 관계: secret-scan은 현재 트리의 토큰형 패턴만, 이 감사는 **전 역사 + PII/머신 식별자 + GitHub 채널**까지.

## 3. 결과 — 고위험(credential/토큰/내부 네트워크): **0건**

| 패턴군 | 대상 | 히트 |
|---|---|---|
| `ghp_/gho/ghu/ghs/ghr_*`, `github_pat_*` | 2,121 objects | **0** |
| `sk-*`, `AKIA*`, `xox*`, `AIza*`, `Bearer <cred>` | " | **0** |
| `-----BEGIN … PRIVATE KEY-----` 블록 | " | **0** (CI 로그의 "PRIVATE KEY" 4건은 blinding 스크립트 주석 텍스트 — §5 F6) |
| 사내 프록시 IP·포트 (적출) · PAC 참조 | " | **0** |
| dotted private IP (10.x / 192.168.x / 172.16-31.x) | " | **0** |
| UTF-16LE 패스 (바이너리 33개) | 19종 핵심 패턴 | **0** |
| 워크플로 env dump / proxy / token 단계 | `.github/workflows` | **0** |
| 릴리즈 자산 / LFS | — | **0 / 없음** |
| GitHub: description="AI-Harness" · topics 없음 · homepage 없음 · issues 0건 · wiki 미초기화(404) · PR 본문 60~64 | — | **클린** |

## 4. 판정 (severity = 공개 저장소 노출 관점)

| # | 판정 | 위치 | severity | 조치 |
|---|---|---|---|---|
| F1 | **실명 + 개인 이메일** — 49 커밋 (gmail 34 + hanmail 15, union 49), 2026-10-24 → 2026-11-06, author 이름 = 실명 (기호 2종, 적출), 개인 이메일 2종 (gmail 1 + hanmail 1, 적출 — 값은 해당 49커밋 히스토리에 존재하므로 본 보고서는 재인용하지 않음) | 커밋 메타데이터 (히스토리) | **MEDIUM** | rewrite **미수행** — §6 결정. 현재 identity는 noreply (실측: `zerocol <26319398+yjj3019@users.noreply.github.com>`, 최근 3커밋 전부 noreply)로 새 노출 없음 |
| F2 | **로컬 PC 호스트명 + OS 빌드** — `DESKTOP-…` (5 히트: 매트릭스 문서 win32 로컬 행 4블롭 + `docs/host-scenario-replay-2026-11-15.md` 호스트 행 1) | 매트릭스 L27 + scenario-replay L28 | **LOW-MEDIUM** | **v1.8.0 적출** (현재 트리, 2파일) — "로컬 개발 PC"로 일반화. 측정 값·시각·run ID 원본 보존 |
| F3 | **CI 러너 식별자** — 러너 내부 IP 1건 · 러너 호스트명 3종 (5 히트) | 같은 문서 L28-31 | **LOW** (GitHub 인프라 식별자, 사용자 데이터 아님) | **v1.8.0 적출** — "ubuntu/windows/macos-latest CI 러너" 라벨. 잔존: 공개 CI 로그에는 원본 유지 (GitHub 인프라, 재적출 불가·불요) |
| F4 | `zerocol <26319398+yjj3019@users.noreply.github.com>` — GitHub numeric ID 포함 | 커밋 메타데이터 (248 히트: 공개 234 + 로컬전용 14) | **INFO** | noreply 정형(`ID+username@users.noreply.github.com`)이며 numeric ID는 GitHub 공개 정보 → 조치 없음 |
| F5 | `C:\Users\*` 경로 | 테스트 **합성값** (`synthetic-user`) 2종 + 문서 축약 표기 (`C:\Users\...`) | **NONE** | 실제 사용자 절대경로 0건 → 조치 없음 |
| F6 | CI 로그 "PRIVATE KEY" 4행 | P2 macos job 로그 | **NONE** | 리뷰 blinding 스크립트의 주석 텍스트("# Reviewer packet and private key created. …") — 실 키 출력 아님 (키 = 로컬 32B 랜덤, 로그 미출력 설계) |

### F-로컬 (공개 아님, 기록만)
- 로컬 전용(리모트 리프 미도달) 객체 23개 중 7개 커밋에 noreply 이메일 14 히트 — **미노출**이라 조치 대상 아님.

## 5. 조치 (이 PR, v1.8.0)

| 조치 | 대상 | before → after |
|---|---|---|
| 적출 1 | 매트릭스 문서 win32 로컬 행 | `win32/x64 (DESKTOP-…, node v26.13.0, Windows 10.0.26300)` → `win32/x64 (로컬 개발 PC, node v26.13.0)` |
| 적출 2~5 | 매트릭스 문서 CI 4행 | `ip-10-0-…` / `runnervmm…` / `chi22-…` / `sjc22-…` (값 적출 — 원문은 과거 블롭에 존재) → `<os>-latest CI 러너` 라벨 (측정 값·시각 원본) |
| 적출 6 | scenario-replay 문서 호스트 행 | `Windows 10.0.26300 (DESKTOP-…)` → `Windows (로컬 개발 PC)` |
| 보고서 | `docs/sensitivity-audit-2026-11-15.md` | 신규 (본 문서) |

적출은 **현재 트리**에만 적용된다. F1(히스토리 메타데이터)과 F2/F3의 과거 블롭, 공개 CI 로그는 본 PR으로 변경되지 않는다.

## 6. 결정 (D13)

- **히스토리 rewrite: 미수행 (권장 유지)**. 근거: ① 노출된 것은 credential이 아니라 **이름+이메일 49커밋** — rewrite의 대가(공개 저장소 전 커밋 SHA 변경, 모든 클론·PR·태그 무효화, 기여자 분기 손상)가 이익보다 큼. ② 새 커밋은 이미 noreply identity로 작성됨(실측 확인) → **새 노출은 0**. ③ 필요 시 사용자 측 GitHub 설정("이메일 비공개 유지")으로 추가 차단 가능 (저장소 밖 조치).
- **재감사 트리거**: ① credential 의심 발견 즉시(패턴 재실행 + 해당 blob 전문 대조) ② 새 바이너리 산출물 커밋 전(UTF-16 패스) ③ CI 로그에 환경변수 dump 단계 추가 시.
- **한계 (UNKNOWN 명시)**:
  - 바이너리 스캔은 ASCII + UTF-16LE 두 인코딩만 커버 — 그 외 인코딩/암호화 바이너리에 숨겨진 문자열은 미검증 (현재 바이너리 33개 = 세션에서 생성된 Office·디자인 산출물이므로 리스크 낮음, 단 **미증명**).
  - CI 로그는 **최신 1 job(P2 macos, 581,842 B)** 샘플만 실측 — 전 run 로그 전수 스캔은 미실시 (워크플로 소스에 env dump 단계가 0건이라 위험 낮음).
  - 러너 호스트명 1종(`runnervmm…`)은 패턴 세트로 잡아낸 것이 아니라 **문서 정독**으로 발견 — 패턴 세트의 커버리지 한계 실증 (문서 정독을 반드시 병행할 것).
  - F2의 5히트 분포는 초판에서 전부 매트릭스 문서로 표기했으나, 커밋 전 스캐너 원본 재대조로 **1히트가 scenario-replay 문서**에 속하는 것으로 확인 — 적출 6 추가, F2 행 정정. 위 `runnervmm…` 사례(패턴 자체가 탐지 실패)와 구분되는 **분류 단계 누락** 사례.
  - GitHub 측: fork·star·watcher 등 소셜 메타와 Actions **전 run 로그**, Dependabot/Security 설정은 감사 범위 밖 (부족 위험 낮음).
