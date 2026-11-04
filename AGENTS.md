# AGENTS.md — AI Harness Constitution (Codex / multi-host)

Notice to Code Agent: This is the top-level instruction file for Codex and other AGENTS.md-compatible hosts. Follow all instructions strictly. Do not execute unrequested scope. Keep modifications surgical.

This repository also maintains `CLAUDE.md` for Claude Code. Core rules are kept aligned; host-specific discovery and tooling differ. Prefer the principles below over host-specific syntax.

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

Refer to these detailed documents in `docs/` rather than bloating this file:

- Requirements & Specification: `docs/DETAIL_SPEC.md`
- Phase Breakdown: `docs/PHASES.md`
- Compound Learning Log: `docs/compound-log.md`
- Session Hand-off State: `docs/HANDOFF.md`
- Full Architecture: `docs/architecture-spec.md`
- Super-agent architecture notes: `docs/super-agent-architecture-notes.md`
- Skill progressive disclosure guidance: `docs/skill-design-progressive-disclosure.md`
- Design skills supplements (PPT, diagrams, visual QA): `docs/design-skills-supplements.md`
- Optional PPT Master style workflow: `skills/ppt-master-style/SKILL.md`


- Codex / multi-host adaptation notes: `docs/codex-adaptation-notes.md`
- Multi-host balancing guide: `docs/multi-host-balancing.md`

- Usage Scenarios: `docs/usage-scenarios.md`
- Design Decisions: `docs/DECISIONS.md`

## 3. Verification Loop (host-agnostic)

Prefer independent roles when the host supports subagents or separate contexts:

1. Implement the phase.
2. Run objective tests and capture output.
3. Verify against checklist using evidence only (PASS/FAIL).
4. Static review for blocking issues.
5. Record lessons in `docs/compound-log.md`.

If verification fails, return to implementation. Maximum 3 iterations.

Evidence for Phases is recorded only through `.claude/workflows/phase-gate.js` (or equivalent host procedure). Never hand-write evidence files. A Phase is complete only when the gate check exits 0.

Always check `docs/compound-log.md` before starting any task.

After a Phase fully passes, update `docs/HANDOFF.md` and prefer a new session for the next Phase.

## 4. Skills

Reusable procedures live as SKILL.md folders. Codex discovers skills under `.agents/skills/` (or user-level equivalents). Claude Code uses `.claude/skills/`. The portable skills in this repository are under `skills/`; copy or link them into the host-specific path when needed. See `docs/codex-adaptation-notes.md` and `docs/skill-design-progressive-disclosure.md`.
