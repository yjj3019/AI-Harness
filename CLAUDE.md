# CLAUDE.md - AI Harness Constitution

> Prefer loading the shared core first: `@AGENTS.md`
> (Claude Code reads the import, then this file). Core rules below are kept aligned with AGENTS.md.

# CLAUDE.md - AI Harness Constitution

Notice to Code Agent: This is the top-level index file. Follow all instructions strictly. Do not execute unrequested scope. Keep modifications surgical.

## 1. Primary Rules

- **Scope Control**: Work strictly within the requested scope. Do not refactor unrelated files.
- **Think Before Coding**: Analyze assumptions, dependencies, and risks prior to editing.
- **Simplicity First**: Write minimal, robust code to solve the immediate problem. No over-engineering.
- **Execution Safety**: Do NOT run applications or open servers automatically unless explicitly asked.
- **Evidence Required**: Do not claim completion without observable evidence (test logs, artifacts, PASS/FAIL verdicts).
- **Instruction Drift**: When an instruction file conflicts with verified current code or tests, cite both, check user/security/host precedence, and reconcile the owning document. Do not rewrite working code solely to satisfy stale prose.
- **Meaningful Verification**: Exit code 0 alone is not enough: verify that required tests ran, not zero tests or all skipped, and independently challenge consequential results.
- **Approval Boundary**: Prompts and shell hooks are not sandboxes. Require actual human approval and enforceable host/tool permissions for external or destructive effects.
- **Context Window Reset**: After each Phase completes, or if context degrades, update `docs/HANDOFF.md` and start a fresh session.
- **Compound First**: Always read `docs/compound-log.md` before starting any task or workflow.

## 2. Document Map & Index
- Codex / multi-host instructions: `AGENTS.md` (aligned principles; see `docs/codex-adaptation-notes.md`)


Refer to these detailed documents in `docs/` rather than bloating this top-level file:

- Requirements & Specification: `docs/DETAIL_SPEC.md`
- Phase Breakdown: `docs/PHASES.md`
- Compound Learning Log: `docs/compound-log.md`
- Session Hand-off State: `docs/HANDOFF.md` (checked by `scripts/handoff-lint.js`)
- Merge policy and its enforcement gap: `docs/merge-policy.md`, `scripts/merge-guard.js`
- Typed Task Contract: `docs/task-contracts/README.md` and `scripts/context-contract.js`
- Full Architecture: `docs/architecture-spec.md`
- External Pattern Synthesis: `docs/external-patterns.md`
- Cursor plugins comparison and package checks: `docs/cursor-plugins-review-2026-10-28.md`, `scripts/package-lint.js`
- Evidence-first research adoption and optional skill: `docs/agent-harness-integration-2026-10-26.md`, `skills/evidence-first-harness/SKILL.md`
- Optional document conversion contract (manifest-only, no engine/permission enforcement): `docs/document-jobs.md`, `scripts/document-job.js`
- Optional report editing (explicit opt-in, no gate changes): `skills/evidence-preserving-editor/SKILL.md`; evaluation cases: `docs/report-editing-cases.json`
- Optional visual design and artifact verification (explicit opt-in): `skills/design-evidence-harness/SKILL.md`
- Highest-quality design workflow: `skills/design-master/SKILL.md`

- Optional Super-agent architecture notes (Router/Worker, event-driven, Watchdog adaptation): `docs/super-agent-architecture-notes.md`, optional skill `skills/super-agent-router/SKILL.md`
- Skill progressive disclosure and trigger testing guidance: `docs/skill-design-progressive-disclosure.md`
- Design skills supplements (PPT, diagrams, visual QA): `docs/design-skills-supplements.md`
- Optional PPT Master style workflow: `skills/ppt-master-style/SKILL.md`
- Highest-quality PPT workflow: `skills/ppt-master/SKILL.md`



- Usage Scenarios: `docs/usage-scenarios.md`
- PPT / Office Harness: `docs/ppt-harness-workflow.md`
- Gaps & Supplementary Repos: `docs/SUPPLEMENTS.md`
- Design Decisions: `docs/DECISIONS.md`

## 3. Verify Loop Subagents

The system uses 5 independent Subagents located in `.claude/agents/`:

- `coding.md`: Implementation of phase requirements.
- `test.md`: Automated testing via Playwright / DevTools MCP.
- `verify.md`: Functional criteria check against phase checklists using evidence only (PASS/FAIL).
- `review.md`: Static code analysis and bug inspection ([BLOCKING], [NIT]).
- `compound.md`: Record lessons learned into `docs/compound-log.md`.

## 4. Feedback & Self-Correction Loop (Ralph Wiggum Loop)

Run implementation using the workflow: coding → test → verify → review → compound

If test, verify, or review returns FAIL or [BLOCKING], automatically return to coding to fix issues.

Maximum retry budget: 3 iterations.

Run a Phase with `/phase-harness <id>`. Evidence is recorded only through `.claude/workflows/phase-gate.js`; never write `.phase-evidence/*` by hand, and subagents cannot. A Phase is complete only when `node .claude/workflows/phase-gate.js check <id>` exits 0. After it passes, `phase-gate.js attest <id>` writes the attestation that CI re-verifies.

Always check `docs/compound-log.md` before starting any task.

After a Phase fully passes, update `docs/HANDOFF.md` and prefer a new session for the next Phase.
