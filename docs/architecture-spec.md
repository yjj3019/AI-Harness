# AI Harness Engineering Architecture & Specification

Comprehensive synthesis of all provided Gemini notebook sources on AI Harness Engineering.

## 1. Overview & Purpose

Harness Engineering is an engineering methodology for designing safety mechanisms, environments, tools, constraints, and feedback loops. Its main goal is to enable a Code Agent (e.g., Claude Code) to execute complex, long-running tasks safely and accurately without derailment, hallucinations, or over-engineering.

**Precise definition**: A harness consists of tools, rules, and actions that are *directly associated* with the Code Agent to keep it stable over long runs. Examples include rules in CLAUDE.md (AGENTS.md), independent verification agents, evidence gates, and compound learning logs. It does **not** include every possible safety measure (stable IDE, hardware, user mindset, etc.). A Skill or MCP becomes part of the harness only when used specifically to constrain or verify Agent behavior.

**Goal**: Shift developer roles from manual coding to Agent System Scaffolding and Feedback Loop Design.

**Common failure modes addressed**:
- Premature “done” claims without evidence
- Context Anxiety (quality drop when context usage is high)
- Self-assessment bias
- Scope creep and over-engineering
- Loss of progress across sessions

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
                     └──────────────┬────────────────────────────┘
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
- Evidence required: completion claims must be backed by observable artifacts or logs.

### 3.2 Context Window Management & Resets

- Context Window = capacity; Context = loaded data.
- Context Anxiety appears above ~70% usage (forgetting rules, premature termination).
- Mitigation: `/compact` or **mandatory Context Reset** via `docs/HANDOFF.md` at Phase boundaries and when quality degrades.
- After a Phase fully passes, update HANDOFF.md and prefer a fresh session for the next Phase.
- Model differences: Sonnet more sensitive; Opus handles larger contexts better.

### 3.3 Feedback Loop (Ralph Wiggum Loop)

5-step autonomous cycle:

1. **Coding**: Implement minimum required code for the current Phase.
2. **Test**: Execute objective tests (npm test, Playwright, DevTools MCP) → TEST_PASS / TEST_FAIL + logs.
3. **Verify**: Check physical artifacts against Phase checklist using evidence only → PASS/FAIL.
4. **Review**: Static analysis → [BLOCKING] / [NIT].
5. **Compound**: Extract lessons into `docs/compound-log.md`.

If FAIL or [BLOCKING], loop back to Coding (max 3 retries).

### 3.4 Multi-Agent Isolation (Independent Evaluator)

- LLMs exhibit self-assessment bias.
- Separate Context Windows for coding vs. evaluation agents.
- Agents: coding, test, verify, review, compound.
- verify and review must not rely on the coding agent's self-report.

### 3.5 Objective Verification Tools & Evidence Gates

Never rely on subjective code reading or self-claims. Require:

- Playwright MCP / Chrome DevTools MCP outputs
- Linter / CI / test runner exit codes and logs
- Browser snapshots / console logs
- Physical artifacts (files, build outputs) that can be inspected

A step may only proceed when the previous step has produced clear evidence of success.

### 3.6 Incremental Phase / Sprint Strategy

- Reject One-Shot for complex work.
- Break into Phases with explicit completion criteria and checklists.
- Prefer a fresh session after each completed Phase (via HANDOFF.md).

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
| CLAUDE.md | Top-level constitution & index | Keep ~100 lines; index to docs/; evidence required |
| docs/DETAIL_SPEC.md | Functional requirements & PRD | Detailed technical requirements |
| docs/PHASES.md | Step-by-step roadmap | Phase checklists & completion criteria |
| docs/ppt-harness-workflow.md | PPT / office document creation | Document-driven phases + sample verification |
| docs/HANDOFF.md | Session migration state | Mandatory at Phase boundaries for Context Reset |
| docs/compound-log.md | Accumulated learnings & errors | Must be reviewed before every task |
| .claude/agents/ | Independent Subagents | Isolated contexts; evidence-based PASS/FAIL |
| .claude/workflows/phase-gate.js | Evidence recorder and gate | `list`, `run <id> test -- <cmd>`, `record <id> <step>`, `check <id>`. Evidence JSON carries status, artifact SHA-256, a hash link to the previous step and, for the test step, argv and a code tree hash (`check` fails if the code changed afterwards). `attest` writes `docs/attestations/phase-<id>.json`; CI runs `verify-attestation` to recompute the tree and re-run the test command. Hand-written evidence is rejected. Exit codes: 0=ok, 1=usage or invalid input, 2=evidence invalid or test failed. |
| .claude/commands/phase-harness.md | Loop orchestrator | `/phase-harness <id>` runs coding → test → verify → review → compound (max 3 attempts) and records evidence only through phase-gate.js. |
| .claude/hooks/ + .claude/settings.json | Guardrails | `block-destructive.sh` (Bash), `evidence-guard.sh auto` (subagents may not write `.phase-evidence/`; registered in settings.json because agent frontmatter hooks are skipped until the workspace is trusted) and `read-tracker.sh` (records evidence files the verify agent opened; verify PASS needs the test log in that record). |
| tests/ | Regression checks | `bash tests/run-all.sh` runs syntax, frontmatter, hook and phase-gate tests. CI runs the same script. |

### Verify read-signal limits

When read tracking is armed, a fresh phase-specific generation rejects read signals already logged before a test rerun or verify verdict. Incomplete older test evidence without a generation must be rerun before recording verify PASS. This is a best-effort signal for sequential workflows, not proof that all bytes or the final summary were read or understood. The post-read hook hashes the current file rather than the returned content; a delayed hook can associate an earlier read with a newer generation. Concurrent runs and records are not isolated, and hook registration is not a security boundary. A rejected verify-record command does not invalidate a previously completed evidence chain; only a successfully recorded verdict or a test rerun replaces its downstream evidence.

### Test summary limits

Test counts are inferred from selected TAP, Node spec and pytest output formats, including supported quiet summaries; the text is not authenticated and can be printed by unrelated commands. Silent runs (for example very quiet pytest), collection-only output and unsupported summary formats can be hidden alongside a recognized passing block. Strict summary mode alone does not prove every command ran meaningful tests. Strict attestation replay captures stdout and stderr into one temporary file, like the original run, then reads the entire output into memory; disk and memory use are not bounded, and abrupt termination can leave temporary output; Windows temporary-file confidentiality depends on inherited directory ACLs. Observed writes to a shared descriptor do not ensure deterministic ordering across processes or protect inherited descriptors. Use controlled runner-level evidence and resource limits for stronger assurance.

### Test tree comparison limits

The test run compares the tree hashes before and after execution and records FAIL for a persistent difference, or if only one hash is available. Filesystem inspection/read errors other than a missing path at initial lstat abort the operation; a tracked deletion still remains an omission for compatibility, as can a file disappearing before lstat. A Git enumeration failure aborts when a separate probe confirms a worktree; a failed discovery probe remains ambiguous and maps to unavailable for compatibility. Legacy unbound runs remain possible if both snapshots are unavailable; chain check warns for unbound or older evidence with no tree field but fails if a previously bound tree cannot be compared. `--require-bound-tree` on both run and check rejects unavailable snapshots for those invocations; it is not persisted policy and cannot prove historical strict execution. Attestation requires Git and a bound tree. Successful hash bytes and evidence format are unchanged: existing evidence cannot establish that its historical snapshot did not silently omit a read failure. Rerun and re-attest when that provenance matters. This is accidental drift detection, not isolation or proof of the exact executed bytes: transient changes restored before the second snapshot, ignored/excluded inputs, file modes, submodule contents, concurrent writes, background work and other races are not fully covered. Use an immutable isolated workspace and controlled inputs when stronger assurance is required.

## 8. Foundational References

- OpenAI Harness Engineering (2026): https://openai.com/index/harness-engineering/
- Anthropic Harness Design for long-running apps (2026): https://www.anthropic.com/engineering/harness-design-long-running-apps
- Anthropic Effective Harnesses for Long-Running Agents (2025): https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Andrej Karpathy Simplify principles (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution) — applied as behavioral rules in CLAUDE.md.

## 9. External Pattern Synthesis

Reusable patterns from established harness repositories are documented in `docs/external-patterns.md`:

- Forced lifecycle (obra/superpowers)
- Default-FAIL contract + fresh-context evaluator (anthropics/cwc-long-running-agents)
- Small stories + append-only learnings (snarktank/ralph)
- Agent backpressure (Geoffrey Huntley)
- Lazy senior / YAGNI decision order (DietrichGebert/ponytail)
- Karpathy behavioral guidelines with operational detail (multica-ai/andrej-karpathy-skills)

These are mapped to the existing components of this repository (evidence gates, independent agents, HANDOFF, compound-log).
