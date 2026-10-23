# CLAUDE.md - AI Harness Constitution

Notice to Code Agent: This is the top-level index file. Follow all instructions strictly. Do not execute unrequested scope. Keep modifications surgical.

## 1. Primary Rules

- **Scope Control**: Work strictly within the requested scope. Do not refactor unrelated files.
- **Think Before Coding**: Analyze assumptions, dependencies, and risks prior to editing.
- **Simplicity First**: Write minimal, robust code to solve the immediate problem. No over-engineering.
- **Execution Safety**: Do NOT run applications or open servers automatically unless explicitly asked.
- **Context Window Reset**: If context becomes congested or response degrades, summarize progress in `docs/HANDOFF.md` and request a fresh session.

## 2. Document Map & Index

Refer to these detailed documents in `docs/` rather than bloating this top-level file:

- Requirements & Specification: `docs/DETAIL_SPEC.md`
- Phase Breakdown: `docs/PHASES.md`
- Compound Learning Log: `docs/compound-log.md`
- Session Hand-off State: `docs/HANDOFF.md`
- Full Architecture: `docs/architecture-spec.md`

## 3. Verify Loop Subagents

The system uses 5 independent Subagents located in `.claude/agents/`:

- `coding.md`: Implementation of phase requirements.
- `test.md`: Automated testing via Playwright / DevTools MCP.
- `verify.md`: Functional criteria check against phase checklists (PASS/FAIL).
- `review.md`: Static code analysis and bug inspection ([BLOCKING], [NIT]).
- `compound.md`: Record lessons learned into `docs/compound-log.md`.

## 4. Feedback & Self-Correction Loop (Ralph Wiggum Loop)

Run implementation using the workflow: coding → test → verify → review → compound

If test, verify, or review returns FAIL or [BLOCKING], automatically return to coding to fix issues.

Maximum retry budget: 3 iterations.

Always check `docs/compound-log.md` before starting any task.
