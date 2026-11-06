# PHASES.md - Phase Breakdown & Checklists

Define incremental development phases with explicit completion criteria.

**Requirements for every Phase**:
- Each Phase must be independently executable and human-testable.
- A person should be able to run the result of the Phase and confirm the checklist without relying on Agent self-report.
- Completion criteria must be observable (artifacts, logs, UI state, test output).

## Evidence

Evidence is recorded only through `.claude/workflows/phase-gate.js`. Never write `.phase-evidence/*` by hand.

- `coding`, `verify`, `review`, `compound`: save the agent's report under `.phase-evidence/`, then run
  `node .claude/workflows/phase-gate.js record <id> <step> --status PASS|FAIL --report .phase-evidence/<file>.md`
- `test`: for a new Phase, run `node .claude/workflows/phase-gate.js run <id> test --require-test-summary --require-bound-tree -- <command>`. The runner records the actual exit status and validates recognized Node TAP / pytest counts. Missing summary, zero tests, and all-skipped tests fail with the summary flag. Add a reviewed adapter for other runners; legacy no-summary commands retain compatibility but do not prove executed tests.
- Gate: `node .claude/workflows/phase-gate.js check <id> --require-bound-tree` requires five valid steps and a present, matching tree snapshot. The flag is per invocation; omitting it permits legacy unbound checks when Git is unavailable. It cannot prove historical snapshot completeness or authenticate evidence, and endpoint snapshots are not isolation.

Each `.phase-evidence/phase-<id>-<step>.json` holds the status, the SHA-256 of its report or log, and the SHA-256 of the previous step's file. A step cannot be recorded until the previous step is PASS. Recording a step clears the steps after it, so a changed result must be re-tested and re-verified.

## Typed context contract (optional)

For long/high-risk work, track reviewed constraints in docs/task-contracts/phase-<id>.json. When a contract exists, phase-gate.js run and check reject a missing or mismatched .phase-evidence/phase-<id>-context.json. See docs/task-contracts/README.md. CLI validation does not automatically intercept Claude/Codex internal compaction or change external tool permissions.

## Loop interruption & retry conditions (policy; enforced by the evidence chain, not by a runner)

The premise of every Phase loop is: coding → test → verify → review → compound, with evidence recorded only through `phase-gate.js`. The gate never retries on its own; humans (or the host loop) rerun. These conditions say when rerunning is allowed and when the loop must stop.

| 상황 | 처리 |
| --- | --- |
| 테스트 실패 원인이 확인됨 | 수정 후 제한된 횟수로 재시도 (전체 최대 3회 반복, `CLAUDE.md`) |
| 동일 실패가 반복됨 (같은 단계·같은 이유) | 조기 중단하고 원인을 보고; `record --status FAIL --meta reason=...`로 사유 기록 |
| 증거 부족 | `UNKNOWN`으로 유지 (테스트 실행 없음·전부 skip = 미실행, 통과 아님) |
| 외부 쓰기 결과 불확실 | 자동 재시도 금지 → `OUTCOME_UNKNOWN_RECONCILE` 원칙(toolbroker), 결과 대조 후 재개 |
| 이전에 통과한 단계가 바뀜 | 회귀 → `check`의 chain break가 FAIL로 차단, 재테스트·재검증 후에만 재개 |
| 시간/작업 예산 소진 | 미완료 상태와 남은 작업을 기록하고 종료 (거짓 PASS 금지) |

- 재시도 메타데이터(정책/스킬 버전·시도 횟수·소요 시간)는 `record --meta key=value`로 증거에 남긴다(P1).
- PASS/FAIL은 실제 실행·관측 결과로만 기재; 계획·fixture 통과·선언으로 PASS를 가장하지 않는다.

## Template

Copy into the Phases section below. Code fences are ignored by the runner, so this template is never treated as a real Phase.

```markdown
### Phase <id>: <Title>

**Goal**: Clear, minimal objective for this phase.

**Checklist**:
- [ ] Requirement A implemented
- [ ] Requirement B verified via objective tool
- [ ] No out-of-scope changes

**Completion Criteria**: All checklist items PASS via verify agent (evidence required).
```

## Example: API Log Analyzer

```markdown
### Phase 1: UI Scaffolding
- [ ] Basic layout rendered
- [ ] No functional logic

### Phase 2: Log Ingestion
- [ ] Accept log URL
- [ ] Download and display sample
```

## Phases

(none defined. Add `### Phase <id>: <Title>` sections here.)
