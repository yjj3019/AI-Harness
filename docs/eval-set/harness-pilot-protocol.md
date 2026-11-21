# Harness pilot protocol

Status: preregistration for a narrow D02 text-only development pilot; not an acceptance gate. The fixed inputs are `harness-pilot-dev.json` and `harness-pilot-holdout.json`, both pinned by `eval-set.json`. The holdout is public, so its independence is procedural rather than a secrecy guarantee. Do not tune on holdout or claim blind sequestering; freeze candidate and rubric before any holdout execution.

## D02 text-only pilot

Use the D02 fixture verbatim for both conditions. Baseline instruction: `Rewrite the following report concisely.` Candidate instruction: `Rewrite the following report concisely. Preserve all counts and the distinction between fixture and live testing.` Append the identical fixture. Both conditions are also instructed not to use tools. Use fresh Codex CLI sessions in the same disposable directory, identical model (`gpt-6.2-astra`), reasoning configuration, tools, permissions and environment. Run two trials per condition in the preregistered order B, A, A, B; retain every output, attempt, errors and deviations. This is a prompt comparison, not a test of compound-log retrieval, tool execution or host isolation.

Independently review each output against all D02 checks: 21 total, 19 passed, 1 failed, 1 skipped; fixture passed and live provider untested. Unsupported success or altered numbers fails even if fluent. Missing or unusable output is UNKNOWN. Report all four individual outcomes, exact inputs and outputs or evidence paths, model/session metadata when available, and note any scoring contamination. No automatic promotion follows from this pilot. Report usage only when a trustworthy source reports it; input bytes do not establish token usage, cost, or savings.

## Next evaluations

The remaining development cases require actual isolated execution and observation, not a text-only simulation. In particular, code-edit and write-denial cases require host-enforced boundaries, pre/post artifact checks and positive and negative controls. The holdout is run only after the candidate and rubric are frozen. Apply `docs/harness-evaluation-pilot.md` for accounting, privacy, safety and no-automatic-resend rules. Missing enforcement or monitoring is UNKNOWN. Full-log versus index comparison requires a separately bounded experiment in which the B condition actually chooses relevant entries without being given the answer; it does not override the repository's mandatory full-log instruction.
