---
name: evidence-first-harness
description: Assess or improve an agent coding workflow with evidence-backed contracts, instruction-drift triage, critical review, and proportionate tool/memory adoption. Use for explicit harness or skills audits, not every coding task.
license: Apache-2.0
---

# Evidence-First Harness Assessment (Optional)

이 스킬은 Claude Code·Codex 등에서 선택적으로 읽는 **검토 절차**다. 새로운 런타임/모델/클라우드 루틴을 설치하거나, 기존 `/phase-harness`를 대체하지 않는다.

## Entry

1. 목표·저장소·호스트를 확인하고 현재 코드, 테스트, `CLAUDE.md`/`AGENTS.md`/기존 스킬, 훅·권한을 실제로 읽는다.
2. 기존 구현과 중복인 규칙은 제외한다. 실측 없는 속도·토큰 절감이나 GitHub stars를 도입 근거로 쓰지 않는다.
3. 큰 작업이라면 범위·제외 범위·산출물·완료 기준·승인 필요 동작을 간결한 계약으로 기록한다. 단순 작업은 바로 수행한다.

## Stale instruction triage

- 충돌을 *문서 위치 / 실제 코드 / 관련 테스트 / 최신 근거 / 위험*으로 기록한다.
- 호스트·사용자·보안 정책과 정본 규칙이 우선이며, 실행 가능한 코드가 항상 모든 지침보다 우선인 것은 아니다.
- 문서만 오래됐다면 정상 코드를 고치는 대신 지침 소유 문서의 정정을 제안한다. 확정 불가한 부분은 `UNVERIFIED`.

## Execution and independent check

- 현행 검증 게이트를 먼저 재사용한다. 검증자는 diff와 실제 출력에서 실패 사례를 찾고, 중요한 반례를 하나 점검한다.
- 종료 코드만으로 완료하지 않는다. 필요한 실행/실패/skip 수, 최종 결과, 실제 요구 범위를 확인한다. 필수 검사 0건/전체 skip은 충족이 아니다.
- 동일 원인으로 두 번 실패하면 무의미한 재시도를 멈추고 접근을 재평가한다(phase 전체 최대 3회). 확인하지 않은 외부 side effect 재시도 금지.
- 메일·게시·배포·삭제·구매·merge·credential 변경은 실제 실행에 대한 명시 승인과 해당 호스트의 도구 수준 정책이 필요하다. prompt가 샌드박스가 되지 않는다.

## Knowledge/graph adoption

- 먼저 내장 검색으로 충분한지 확인한다. 코드 지식 그래프는 `grep` 기준선과 실제 결과를 비교하는 read-only PoC 후 선택한다.
- raw 원본/파생 wiki, 출처/추론, 최신/교체됨 상태를 분리한다. 기밀을 공개 저장소나 미승인 외부 서비스에 넣지 않는다.
- 교훈은 확인된 원인에서 테스트·검사·정본 규칙으로 발전시킨다. 에이전트가 임의로 전역 메모리나 권한을 수정하지 않는다.

## Report

`Observed / Inferred / Unverified / Changes / Checks (command, scope, outcome) / Risks / Next action`을 구분한다. 별도 모델 검토가 없으면 실행했다고 주장하지 않는다.

상세 근거 및 채택 조건: [통합 검토](../../docs/agent-harness-integration-2026-10-26.md). 행동 평가용 수동 케이스: [지침 충돌 fixture](../../tests/fixtures/instruction-conflict-regressions.md).
