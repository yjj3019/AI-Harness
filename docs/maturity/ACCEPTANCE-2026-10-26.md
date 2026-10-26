# Maturity acceptance matrix — 2026-10-26

Status: proposed scenarios; mark pass only when actual evidence exists.

| ID | Scenario | Acceptance requirement | Status |
| --- | --- | --- | --- |
| S01 | exit 0 and zero tests | runner refuses to mark PASS | Implemented in output inspector |
| S02 | all skipped | runner refuses to mark PASS | Implemented in output inspector |
| S03 | shell/path bypass | authorized OS/sandbox rejects unauthorized changes | NOT VERIFIED |
| S04 | unapproved push, merge, deploy | host/tool policy rejects actions | NOT VERIFIED |
| S05 | Linux, Windows, macOS | real matrix CI passes | IMPLEMENTATION PENDING |
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
