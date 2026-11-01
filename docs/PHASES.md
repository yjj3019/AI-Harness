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
