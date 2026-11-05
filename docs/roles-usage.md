# 역할별 사용법 — AI-Harness 5개 서브에이전트 / Role Usage Guide (KOR/ENG)

한국어 섹션 뒤에 동일 내용의 English 섹션이 이어집니다.
(The Korean section is followed by the identical English section.)

---

## 🇰🇷 한국어

### 시작하기
```
/phase-harness <id>    # Phase 실행 (coding → test → verify → review → compound 전체 루프)
node .claude/workflows/phase-gate.js doctor   # 환경 사전 점검 (jq·bash·git·realpath)
```

### 5개 역할 개요

| 역할 | 목적 | 주요 도구 | 호출 순서 | 산출물 |
| --- | --- | --- | --- | --- |
| **coding** | 명세 분석 후 최소 발자국으로 구현 | Read, Write, Edit, Glob, Grep, Bash | 1 | 구현 코드 + 완료 보고 |
| **test** | 증거 러너로 동적 테스트 실행 | Read, Bash, Playwright MCP(선택) | 2 | `TEST_PASS`/`TEST_FAIL` + 로그 |
| **verify** | 증거만으로 기준 충족 독립 검증 | Read, Glob, Grep, Bash | 3 | `Status: PASS|FAIL` + Evidence Reviewed |
| **review** | 정적 분석·버그·보안·과설계 검토 | Read, Grep, Glob | 4 | `APPROVED`/`REJECTED` + [BLOCKING]/[NIT] |
| **compound** | 교훈 축적(경험 로그) | Read, Write, Edit | 5 | `docs/compound-log.md` 항목 추가 |

### 역할별 사용법

**coding**
- 시작 전 `CLAUDE.md`·`docs/compound-log.md` 필독 → 반복 실패 방지.
- 명세·호출부·테스트와 충돌 시 양쪽 위치를 보고하고 임의 재작업 금지.
- 최대 3회 수정 반복(verify/review 실패 시 coding 복귀).

**test**
- 테스트는 **반드시 증거 러너로만 실행**:
  `node .claude/workflows/phase-gate.js run <id> test --require-test-summary -- <command>`
  (exit 0=통과, 2=실패. `.phase-evidence/` 직접 쓰기 금지.)
- 브라우저 도구는 `.mcp.json` 활성 시에만 제공됨 — 없으면 브라우저 검증 주장 금지.

**verify**
- 개발자 보고·주석을 신뢰하지 말고 **관측 가능한 증거**(테스트 로그·산출물)만으로 판정.
- PASS 조건: 테스트 요약 확인(실행/실패/skip 수) — **0개 테스트·전체 skip은 PASS 불가**.
- read-tracker(Read 증거 기록)는 파일 접근 신호일 뿐, 내용 이해를 증명하지 않음.

**review**
- [BLOCKING](치명적 오류·보안·회귀)은 coding 복귀 트리거, [NIT](사소한 스타일)는 비차단.
- 청구된 수정이 diff/로그에서 확인 안 되면 미해결 처리.

**compound**
- `docs/compound-log.md`에 **[날짜] Phase X - [분류]** 형식(Issue/Risk · Root Cause · Resolution/Pattern)으로 추가.
- 과거 항목 수정·삭제 금지(30개 초과 시 배치 정리, 오래된 항목은 archive로 이동).

### 게이트 명령 요약
```
phase-gate.js record <id> <step> --status PASS --report <file>   # 단계 기록
phase-gate.js run     <id> test --require-test-summary -- <cmd>  # 테스트 실행(증거 기록)
phase-gate.js check   <id> --require-bound-tree                  # Phase 완료 검사
phase-gate.js attest  <id>                                      # 인증 스냅샷 생성(CI 재검증용)
phase-gate.js verify-attestation <id>                            # 인증 재검증
```
Phase 완료 = `check` exit 0. 증거 파일은 절대 손으로 쓰지 말고 게이트를 통해서만 기록합니다.

---

## 🇺🇸 English

### Getting started
```
/phase-harness <id>    # Run a Phase (full coding → test → verify → review → compound loop)
node .claude/workflows/phase-gate.js doctor   # Environment preflight (jq, bash, git, realpath)
```

### The five roles at a glance

| Role | Purpose | Key tools | Order | Output |
| --- | --- | --- | --- | --- |
| **coding** | Implement the spec with minimal footprint | Read, Write, Edit, Glob, Grep, Bash | 1 | Code + completion report |
| **test** | Run dynamic tests through the evidence runner | Read, Bash, Playwright MCP (optional) | 2 | `TEST_PASS` / `TEST_FAIL` + log |
| **verify** | Independently judge criteria from evidence only | Read, Glob, Grep, Bash | 3 | `Status: PASS|FAIL` + Evidence Reviewed |
| **review** | Static analysis: bugs, security, over-engineering | Read, Grep, Glob | 4 | `APPROVED` / `REJECTED` + [BLOCKING]/[NIT] |
| **compound** | Accumulate lessons into the experience log | Read, Write, Edit | 5 | New `docs/compound-log.md` entry |

### Per-role usage

**coding**
- Read `CLAUDE.md` and `docs/compound-log.md` first to avoid repeating past mistakes.
- On conflicts between instructions, callers, and tests, report both locations; do not rework working code blindly.
- Up to 3 fix iterations (return here when verify/review fails).

**test**
- Run tests **only through the evidence runner**:
  `node .claude/workflows/phase-gate.js run <id> test --require-test-summary -- <command>`
  (exit 0 = pass, 2 = fail. Never write under `.phase-evidence/`.)
- Browser tools exist only when Playwright MCP is enabled (`.mcp.json`); otherwise do not claim browser verification.

**verify**
- Never trust the developer's claims or comments; judge by **observable evidence** (test logs, artifacts).
- PASS requires checked test summaries (executed/failed/skipped counts) — zero tests or all-required-skipped cannot earn PASS.
- The read-tracker's read record is only a file-access signal; it does not prove understanding.

**review**
- [BLOCKING] (critical errors, security, regression) loops back to coding; [NIT] does not block completion.
- A claimed fix not confirmed in the diff/log is treated as unresolved.

**compound**
- Append entries to `docs/compound-log.md` as **[YYYY-MM-DD] Phase X - [Category]** (Issue/Risk · Root Cause · Resolution/Pattern).
- Never edit or delete past entries (batch-clean above 30; archive old ones).

### Gate command cheat sheet
```
phase-gate.js record <id> <step> --status PASS --report <file>   # record a step
phase-gate.js run     <id> test --require-test-summary -- <cmd>  # run tests (records evidence)
phase-gate.js check   <id> --require-bound-tree                  # phase completeness check
phase-gate.js attest  <id>                                      # attestation snapshot (CI re-verifies)
phase-gate.js verify-attestation <id>                            # re-verify attestation
```
A Phase is complete only when `check` exits 0. Evidence is recorded only through the gate — never by hand.
