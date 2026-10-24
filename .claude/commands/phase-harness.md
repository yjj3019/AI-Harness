---
description: Run one Phase through coding, test, verify, review, compound with recorded evidence
argument-hint: <phase-id>
disable-model-invocation: true
---

Run Phase `$ARGUMENTS` of this project through the evidence-gated loop.

## Your role

You are the orchestrator. You coordinate subagents and record evidence. You do not implement code yourself. You never write `.phase-evidence/*.json` by hand: evidence is created only by `node .claude/workflows/phase-gate.js`. Never record PASS from a subagent's self-report. Record the verdict text the subagent returned.

## Setup

0. Run `node .claude/workflows/phase-gate.js doctor`. If it reports a problem, stop and tell the user: the guards fail open without their tools.
1. Run `node .claude/workflows/phase-gate.js list`. If `$ARGUMENTS` is not listed, stop and tell the user.
2. Read `CLAUDE.md`, `docs/compound-log.md`, `docs/DETAIL_SPEC.md`, `docs/HANDOFF.md`, and the Phase section in `docs/PHASES.md`.
3. Find the test command for this Phase (checklist or DETAIL_SPEC). If there is none, ask the user once and wait.

## Loop (at most 3 attempts)

Per attempt, in order. `<id>` is the Phase id and `<n>` the attempt number.

1. **coding**: invoke the `coding` subagent with the Phase goal, the checklist, and the defects from the previous attempt. Save its report with Write to `.phase-evidence/<id>-coding-<n>.md`, then run
   `node .claude/workflows/phase-gate.js record <id> coding --status PASS --report .phase-evidence/<id>-coding-<n>.md`.
   If it says it could not finish, record `--status FAIL` and stop the loop.
2. **test**: invoke the `test` subagent and tell it to run
   `node .claude/workflows/phase-gate.js run <id> test -- <test command>`.
   Exit 2 means the test failed and the failure is already recorded. Start the next attempt with the log tail as the defect.
3. **verify**: invoke the `verify` subagent with the checklist and the evidence paths. Save its verdict to `.phase-evidence/<id>-verify-<n>.md`. Record PASS only if the verdict says `Status: PASS`. Otherwise record FAIL (with the report) and start the next attempt with its defect list.
4. **review**: invoke the `review` subagent. Save its verdict to `.phase-evidence/<id>-review-<n>.md`. APPROVED with no `[BLOCKING]` item is PASS. REJECTED or any `[BLOCKING]` item is FAIL: record it and start the next attempt.
5. **compound**: invoke the `compound` subagent. Save its summary to `.phase-evidence/<id>-compound-<n>.md` and record PASS.
6. **gate**: run `node .claude/workflows/phase-gate.js check <id>`. Exit 0 ends the loop. Any other result counts as a failed attempt; read stderr for the failing step.

Recording a step clears the later steps, so a new coding result is always re-tested and re-verified.

## Finish

- Gate exit 0: if the project has CI and git, run `node .claude/workflows/phase-gate.js attest <id>` so the user can commit `docs/attestations/phase-<id>.json`; CI then re-runs the test command independently. Update `docs/HANDOFF.md` (last completed phase, key decisions, open issues, artifacts, next actions). Tell the user the Phase passed with evidence and recommend a fresh session for the next Phase. Do not commit or push unless asked.
- Three attempts without a passing gate: stop. Report the failing step, the last defect list, and what you need from the user. Do not edit evidence to make the gate pass.
