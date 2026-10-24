# CLAUDE.md - AI Harness Constitution

Notice to Code Agent: This is the top-level index file. Follow all instructions strictly. Do not execute unrequested scope. Keep modifications surgical.

## 1. Primary Rules

- **Scope Control**: Work strictly within the requested scope. Do not refactor unrelated files.
- **Think Before Coding**: Analyze assumptions, dependencies, and risks prior to editing.
- **Simplicity First**: Write minimal, robust code to solve the immediate problem. No over-engineering.
- **Execution Safety**: Do NOT run applications or open servers automatically unless explicitly asked.
- **Evidence Required**: Do not claim completion without observable evidence (test logs, artifacts, PASS/FAIL verdicts).
- **Context Window Reset**: After each Phase completes, or if context degrades, update `docs/HANDOFF.md` and start a fresh session.
- **Compound First**: Always read `docs/compound-log.md` before starting any task or workflow.

## 2. Document Map & Index

Refer to these detailed documents in `docs/` rather than bloating this top-level file:

- Requirements & Specification: `docs/DETAIL_SPEC.md`
- Phase Breakdown: `docs/PHASES.md`
- Compound Learning Log: `docs/compound-log.md`
- Session Hand-off State: `docs/HANDOFF.md`
- Full Architecture: `docs/architecture-spec.md`
- External Pattern Synthesis: `docs/external-patterns.md`
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
