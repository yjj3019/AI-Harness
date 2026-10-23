# AI Harness Engineering Architecture & Specification

Comprehensive synthesis of all provided Gemini notebook sources on AI Harness Engineering.

## 1. Overview & Purpose

Harness Engineering is an engineering methodology for designing safety mechanisms, environments, tools, constraints, and feedback loops. Its main goal is to enable a Code Agent (e.g., Claude Code) to execute complex, long-running tasks safely and accurately without derailment, hallucinations, or over-engineering.

**Goal**: Shift developer roles from manual coding to Agent System Scaffolding and Feedback Loop Design.

## 2. Evolutionary Stages of Code Agent Engineering

| Stage | Period | Core Approach | Key Challenge |
|-------|--------|---------------|---------------|
| Prompt Engineering | ~2020 | One-shot Q&A, prompt optimization | Clarity & persona |
| Context Engineering | 2023 | Structured context, RAG/MCP, pollution prevention | Optimal context placement |
| Harness Engineering | 2025~ | Safety mechanisms, boundary rules, autonomous feedback loops | Long-running autonomy reliability |
| Agentic Engineering | 2026~ | Quality/architecture guarantees, hidden bug & over-engineering control | Final software quality |

## 3. Core Architecture Components

```
                     ┌─────────────────────────────────────┐
                     │            CLAUDE.md                 │
                     │ (Project Constitution & Index File)  │
                     └───────────────┬───────────────────────────┘
                                        │
           ┌───────────────────────────┼─────────────────────────┐
           ▼                            ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  Phase Management    │    │ Multi-Agent Loop     │    │ Dynamic Tools/MCP    │
│  (Phase 1 ~ 5)       │    │ (coding -> test ->   │    │ (Playwright /        │
│  docs/DETAIL_SPEC.md │    │  verify -> review -> │    │  DevTools / Skills)  │
│  docs/PHASES.md      │    │  compound)           │    │                      │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
                                        │
                                        ▼
                            ┌──────────────────────┐
                            │  docs/compound-log   │
                            │  (Compounded Memory) │
                            └──────────────────────┘
```

### 3.1 Top-Level Guidance (CLAUDE.md / AGENTS.md)

- Index-only design: Keep ~100 lines. Detailed content lives in `docs/`.
- Prevents Context Anxiety and context pollution.
- Strict behavioral rules: scope control, no automatic execution, simplicity first.

### 3.2 Context Window Management & Resets

- Context Window = capacity; Context = loaded data.
- Context Anxiety appears above ~70% usage (forgetting rules, premature termination).
- Mitigation: `/compact` or Context Reset via `docs/HANDOFF.md` to a fresh session.
- Model differences: Sonnet more sensitive; Opus handles larger contexts better.

### 3.3 Feedback Loop (Ralph Wiggum Loop)

5-step autonomous cycle:

1. **Coding**: Implement minimum required code for the current Phase.
2. **Test**: Execute objective tests (npm test, Playwright, DevTools MCP).
3. **Verify**: Check physical artifacts against Phase checklist → PASS/FAIL.
4. **Review**: Static analysis → [BLOCKING] / [NIT].
5. **Compound**: Extract lessons into `docs/compound-log.md`.

If FAIL or [BLOCKING], loop back to Coding (max 3 retries).

### 3.4 Multi-Agent Isolation (Independent Evaluator)

- LLMs exhibit self-assessment bias.
- Separate Context Windows for coding vs. evaluation agents.
- Agents: coding, test, verify, review, compound.

### 3.5 Objective Verification Tools

Never rely on subjective code reading. Use:

- Playwright MCP
- Chrome DevTools MCP
- Linter / CI outputs
- Browser snapshots / console logs

### 3.6 Incremental Phase / Sprint Strategy

- Reject One-Shot for complex work.
- Break into Phases with explicit completion criteria and checklists.

### 3.7 Compounded Intelligence

Agents must read `docs/compound-log.md` before starting any task to avoid repeating past mistakes.

## 4. Notable Frameworks & Practices

- **Andrej Karpathy's Simplify Harness**: 65-line CLAUDE.md emphasizing Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution.
- **Superpowers**: Brainstorming → Planning → TDD → Implementation → Debugging → Review → Verification; modular skills, PLANS.md, ARCHITECTURE.md.
- **G-Stack**: 30+ specialized roles (PM, EM, Designer, QA).
- **Oh My Opencode / Oh My Claudecode**: Plan-Build-Review-Fix-Verify-Iterate with autonomous verification and Ralph Wiggum loop.
- **Hands off**: Skill for writing session context to disk and initiating clean hand-off.

## 5. Practical Example: Phase-Based Web App (API Log Analyzer)

- Phase 1: UI scaffolding (no functionality).
- Phase 2: Log URL reception, download, sample output.
- Phase 3: Parsing engine + paginated data table.
- Phase 4: Latency statistics and performance metrics.
- Phase 5: Chart visualization and dashboard integration.

Execution: `/phase-harness 1`, `/phase-harness 2`, etc.

## 5.1 Office Document (PPT) Creation Workflow

Document-driven phase approach for high-quality PPT generation with Claude Code + Anthropic pptx skill.

**Key sequence**: Brain.md → UpgradeBrain.md → Phase.md → PageDetail.md → PageLayout.md → sample.ppt (3 slides) → full PPT.

See full guide: [docs/ppt-harness-workflow.md](./ppt-harness-workflow.md).

This pattern directly applies the No One-Shot and sample-first verification principles to non-code deliverables.

## 6. Future Outlook

- Engineer role shifts from writing code lines to designing Harness Scaffolding and Feedback Loops.
- Autonomous harness generation: Agents will self-define HARNESS.md, constraints, and monitoring based on project nature.

## 7. File Role Summary

| File / Component | Primary Purpose | Key Guidelines |
|------------------|-----------------|----------------|
| CLAUDE.md | Top-level constitution & index | Keep ~100 lines; index to docs/ |
| docs/DETAIL_SPEC.md | Functional requirements & PRD | Detailed technical requirements |
| docs/PHASES.md | Step-by-step roadmap | Phase checklists & completion criteria |
| docs/ppt-harness-workflow.md | PPT / office document creation | Document-driven phases + sample verification |
| docs/HANDOFF.md | Session migration state | Used for Context Reset |
| docs/compound-log.md | Accumulated learnings & errors | Must be reviewed before every task |
| .claude/agents/ | Independent Subagents | Isolated contexts for unbiased assessment |
