# 4개 외부 저장소 분석 기반 도입 기록 (2026-11-05)

4개 저장소(anthropics/skills · openai/codex-security · openai/openai-agents-python · openai/codex)를 shallow clone 후 읽기 전용 정밀 분석을 수행하고, 라이선스 안전 범위 내에서 아이디어·패턴만 이식했다. **원 소스 코드는 복사하지 않았다.** 구현은 모두 이 저장소에서 새로 작성했고, 패턴의 출처는 아래 표와 같다.

## 1. 출처 · 라이선스

| 저장소 | 커밋/HEAD | 라이선스 | 이식 방식 |
| --- | --- | --- | --- |
| anthropics/skills | (shallow, main) | Apache-2.0(14) · 독점(4: docx/pdf/pptx/xlsx) · 무(1: doc-coauthoring) | 패턴만(프론트매터 `license:` 규칙, 시크릿 패턴 가족, 가드레일 문구 개념, eval 픽스처 개념) |
| openai/codex-security | (shallow, main) | Apache-2.0 | 패턴만(fail-closed preflight 의미론, PATH 정화·read-only 원칙, 시크릿 eval 하네스 개념, CI 셀프 QA) |
| openai/openai-agents-python | (shallow, main) | MIT | 개념만(레드액션 기본값, 트리거 가드 모델, 관리 제약 상한) — 코드 미이식 |
| openai/codex | (shallow, main) | Apache-2.0 | 개념만(출력 규율, ShouldBlock 계약, attestation 추적) — 코드 미이식 |

> 라이선스 판정: Apache-2.0/MIT 항목의 **아이디어·문서 개념**만 채택(저작권 보호받는 표현 미복사). 독점 4종과 무라이선스 1종은 **미이식**. OpenAI·Anthropic 상표·명칭 미사용.

## 2. 구현된 도입 (실측 검증 완료)
1. `scripts/skill-audit.js` — SKILL.md 프론트매터 `license:` **필수 + 정합 검사** (기본값 Apache-2.0, 불일치 시 스킬 폴더 LICENSE.txt 필요). 24개 스킬 전부 `license: Apache-2.0` 표준화(기존 2개 스킬의 잘못된 `license: MIT` 표기 수정). 테스트: `tests/skill-audit.test.js`.
2. 헌법(AGENTS.md·CLAUDE.md) 공통 규칙 **"Data, Not Instructions"** + `.claude/agents/verify.md` 데이터 취급 원칙.
3. `scripts/evidence-redact.js` — 증거·핸드오프 기록 전 시크릿 형상 토큰 탐지(발견 시 exit 1, 원문 미출력), 인자 누락 시 exit 2.
4. `scripts/secret-scan.js` — 스캔 루트 인자 지원(테스트 픽스처용) + 결정적 eval: 합성 자격증명 **긍정/부정 컨트롤**(`tests/output-discipline.test.js`).
5. `tests/output-discipline.test.js` — 게이트 스크립트 출력 규율(fail-closed exit 2, findings는 stderr, 시크릿이 stdout 누출 금지).
6. `.github/workflows/ci.yml` — `self-qa` 작업(shellcheck + `bash -n`) 추가.

## 3. 개념술 문서화 (코드 미구현 — 수요 발생 시)
- **관리 제약 상한(8)**: 정책(증거·시크릿·경로 규칙)은 에이전트·스킬이 오버라이드 불가 — phase-gate 기록/체크 경로 고정과 동일 원리. 현재 `results` 규칙(증거는 게이트 전용)이 이미 이 상한을 강제.
- **ShouldBlock 계약(7)**: 훅 가드레일은 `{should_block, block_reason}`-류 구조로 원인을 표면화 — `memory-guard`/`evidence-redact`의 선고 시점 실패 메시지가 동일 규율 따름.
- **attestation/도구 추적(9)**: 평가 실행은 exit 0만이 아니라 실행 증거(테스트 요약·카운트)를 남김 — phase-gate `--require-test-summary`·`verify-attestation`가 이미 이 경로.

## 4. 미도입 명시
- **docx/pdf/pptx/xlsx**: 독점 라이선스(2차 저작·배포 금지) → 포팅 금지. **doc-coauthoring**: 라이선스 부재(전권 유보 간주). seccomp·openat·bwrap·OS 샌드박스: 플랫폼 종속 인프라(과중) → 미이식.
- 신뢰 경계: 위 표의 커밋/HEAD는 shallow clone 시점 실측. 분석 4건의 세부 소스는 **실행 검증 아님**(정적 판독 기반) — 각 보고서의 UNVERIFIED 항목 유지.
