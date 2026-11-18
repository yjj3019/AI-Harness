# PHASES.md - Phase Breakdown & Checklists

Define incremental development phases with explicit completion criteria. Phase IDs must be unique across case variants so that they map to separate files on every supported host.

**Requirements for every Phase**:
- Each Phase must be independently executable and human-testable.
- A person should be able to run the result of the Phase and confirm the checklist without relying on Agent self-report.
- Completion criteria must be observable (artifacts, logs, UI state, test output).

## Evidence

Phase records are written only through `.claude/workflows/phase-gate.js`; never hand-write gate records. The orchestrator may save report inputs under `.phase-evidence/` for `record`.

- `coding`, `verify`, `review`, `compound`: save the agent's report under `.phase-evidence/`, then run
  `node .claude/workflows/phase-gate.js record <id> <step> --status PASS|FAIL --report .phase-evidence/<file>.md`
- For a new Phase's verify PASS, add `--require-read-proof`. Claude Code uses a native `Read` event and the configured read tracker. Codex uses the read-only MCP Phase reader and a `PostToolUse` event attributed to the `verify` agent. Match the test log hash and active read epoch, then confirm `require_read_proof: true` in the resulting verify record. Report the Phase blocked if the host cannot produce the signal. The hook establishes an observed file-access signal in the configured host and keeps the existing local evidence trust boundary.
- `test`: for a new Phase, run `node .claude/workflows/phase-gate.js run <id> test --require-test-summary --require-bound-tree -- <command>`. The runner records the actual exit status and validates recognized Node TAP / pytest counts. Missing summary, zero tests, and all-skipped tests fail with the summary flag. Add a reviewed adapter for other runners; legacy no-summary commands retain compatibility but do not prove executed tests.
- Gate: `node .claude/workflows/phase-gate.js check <id> --require-bound-tree --require-strict-evidence` requires five valid steps, a matching tree snapshot, a verified test summary and the verify read-proof flag. Apply `--require-strict-evidence` to `attest` and `verify-attestation` for new phases. Phases listed in `.github/required-phases.json` enforce the strict settings by default for test, verify, check, attest and replay. Other phases retain legacy CLI compatibility. Review the checklist independently. Attestation flags record gate requirements and do not authenticate history.
- Tree snapshots reject inherited `GIT_*` environment variables, including empty values, except `GIT_PAGER`, `GIT_CONFIG_NOSYSTEM=1`, and `GIT_CONFIG_GLOBAL` set to the platform null device, rather than allowing Git routing or configuration overrides. Clear the rejected variables in a trusted invocation environment before running the gate. This does not isolate Git configuration files, concurrent writers, or the filesystem; previously recorded hashes do not prove their original Git environment was safe.
- Test runs and attestation replay default to a 150-minute timeout; `PHASE_GATE_TEST_TIMEOUT_MS` accepts integer milliseconds from 1 through 86400000. On timeout the gate requests termination of the Windows process tree or POSIX process group and records FAIL. Escaped descendants, abrupt gate termination and OS failures are outside this cleanup mechanism. Inventory verification allows an additional two minutes for each gate invocation. CI requires the reviewed Phase inventory, rejects missing required attestations, and replays up to 256 attestations in separate 180-minute matrix jobs. The required checks wait for the aggregate result. The full-run step has 150 minutes and its job 180 minutes. A timed-out job fails.
- The tree hash binds actual worktree bytes, including line endings. To prepare an attestation intended for LF CI, use a separate trusted LF checkout, stage the intended changes there and compare its worktree bytes with the staged blobs before testing. Do not normalize or overwrite unrelated user files. A clean CI checkout and an actual replay are still needed; matching staged bytes alone does not certify CI or untracked inputs.
- Generated `dashboard/status.json` is outside the tree hash because publishing an attestation changes its display data. `dashboard/index.html`, the generator and Phase definitions remain bound.
- The gate flushes each evidence JSON and attestation to a temporary file in the output directory before replacing the published file. A failed write or replacement leaves the previous JSON intact. The Phase chain still advances one record at a time.
- Tree hashes now include each regular file's POSIX execute bits. On Windows, tracked files use Git index mode (100755 or 100644), and untracked files are treated as non-executable. Normal matching Git checkouts can therefore agree across platforms, but Windows cannot observe changes to actual POSIX permissions; verify unusual modes on POSIX. Existing tree-bound records and attestations use the earlier hash and must be regenerated, not silently reused. Other permission bits are not bound.
- Phase `run`, `record`, `check` and `attest` acquire an exclusive lock in `.phase-evidence/`. A concurrent command fails before changing evidence. If the gate itself exits abruptly, inspect the lock's `owner.json` and confirm the owning operation and test processes have stopped before removing that specific lock. The gate does not break locks automatically.
- A test or attestation replay captures at most 64 MiB of combined stdout and stderr. Set `PHASE_GATE_MAX_OUTPUT_BYTES` to a positive integer to lower the limit. Excess output fails the run. The test log preserves the bounded capture and the gate's failure diagnostic.

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

### Phase evidence-baseline: Evidence chain verification baseline

**Goal**: Prove the evidence chain works end-to-end on this repository by recording each step of this defined Phase with the gate. Defining a Phase alone does not establish completion.

**Checklist** (requirements, not a live status display; do not tick after testing because this file is tree-bound):
- [ ] `docs/PHASES.md` contains a parseable `### Phase <id>:` section that the gate doctor accepts
- [ ] Test step runs a real suite via `--require-test-summary --require-bound-tree` with nonzero recognized test counts
- [ ] Verify/review/compound reports exist under `.phase-evidence/` and are recorded through `phase-gate.js record`
- [ ] `phase-gate.js check evidence-baseline --require-bound-tree --require-strict-evidence` exits 0
- [ ] `phase-gate.js attest evidence-baseline` writes documentation under `docs/attestations/`

**Completion Criteria**: `check` exit 0 with five recorded steps and a matching tree snapshot; evidence paths and command output are quoted in the compound report. This proves the chain mechanics, not model quality, host isolation, or that the tests cover every requirement.
