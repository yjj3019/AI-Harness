# Maturity acceptance matrix — 2026-10-26

Status: proposed scenarios; mark pass only when actual evidence exists.

| ID | Scenario | Acceptance requirement | Status |
| --- | --- | --- | --- |
| S01 | exit 0 and zero tests | runner refuses to mark PASS | Implemented in output inspector |
| S02 | all skipped | runner refuses to mark PASS | Implemented in output inspector |
| S03 | shell/path bypass | authorized OS/sandbox rejects unauthorized changes | NOT VERIFIED |
| S04 | unapproved push, merge, deploy | host/tool policy rejects actions | PARTIAL: fixture ToolBroker denies unsigned fixture writes; Claude/Codex native tools and GitHub protections remain NOT VERIFIED |
| S05 | Linux, Windows, macOS | real matrix CI passes | VERIFIED on PR head `efcb7cff`: Ubuntu/Windows/macOS 66/66 tests each, hook tests 93/93 each; [run 40263485411](https://github.com/yjj3019/AI-Harness/actions/runs/40263485411) |
| S06 | stale instructions | independent evaluation finds zero harmful rewrites | NOT RUN |
| S07 | skeptic review | tests include relevant held-out counterexamples | NOT RUN |
| S08 | crash and resume | no duplicate externally visible side effect | NOT RUN |
| S09 | Claude/Codex actual runs | same fixtures, verified outcomes, no invented PASS | NOT RUN |
| S10 | long-running bounded loop | enforced retries and costs, crash inject | NOT RUN |
| S11 | A/B model upgrade | repeatable measured non-regression | NOT RUN |
| S12 | graph/Second Brain | measured gain against native code/doc search | NOT RUN |

## Priorities

1. Strict test count evidence and pinned command *before* validating a Phase.
2. Multi-OS CI; do not report unsupported hosts as supported without evidence.
3. Human-owned tool authorization and OS-level sandboxing; a regex hook is not a security boundary.
4. Actual Claude and Codex end-to-end runs; keep synthetic tests separate.
5. Graph/Second Brain only when measured against a simpler baseline.

CI syntax or a passed unit test does not establish 90+ operational maturity. No repo setting, credential, production system or deployment is changed by this document.

## CI evidence (baseline for this matrix)

At 2026-10-26, the three CI jobs for PR head `efcb7cffa151c6f097b24b9a81e3de1357b0b699` passed: each host reported 66 passing Node tests, zero failed/skipped, 93/93 hook checks. This is a reproducible CI result, **not** live Claude/Codex, sandbox security, or unattended deployment certification. Later commits require new CI results before merge.

## Security reference implementation (opt-in)

`toolbroker/` is a fixture-only, deny-default broker. Its isolated DB action uses one SQLite transaction for the request key, effect and result. Its loopback-only HTTP fixture persists a send claim before the request and treats lost responses as `UNKNOWN`, requiring reconciliation without automatic retry. `tests/toolbroker/test_broker.py` measures these narrow properties.

**These tests do not establish S04 for general GitHub push/merge, shell commands, externally hosted APIs or the real Claude/Codex runtime.** The Agent must not control the broker process, allowlist, secret or ledger. `main` branch protection is not enabled by these files.
