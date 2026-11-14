# AI-Harness

**AI Harness Engineering** package for safe, long-running Code Agent workflows.

This repository synthesizes a complete harness methodology for Claude Code (and compatible agents). It combines lessons from original Gemini notebook sources with external research and production practices from Anthropic, Geoffrey Huntley, Jesse Vincent (Superpowers), Andrej Karpathy-inspired guidelines, and multi-agent orchestration systems.

> **한글**: [README.md](./README.md)

Cursor/plugins adoption: [pinned-source review, 2026-10-28](docs/cursor-plugins-review-2026-10-28.md). `node scripts/package-lint.js` checks agent/command/skill metadata and simple relative file links, also through `bash tests/run-all.sh`. `phase-gate.js doctor` checks exact hook events, matchers, commands and repository-contained executable files. These checks cover this repository's single-line metadata and hook template; they do not validate all YAML syntax or certify live host permissions.

The optional [design evidence harness](skills/design-evidence-harness/SKILL.md) adapts the MIT-licensed huashu-design workflow for visual artifacts while preserving the requested format and reporting unavailable checks. Ask the agent explicitly to read the file; repository `skills/` does not automatically register a Claude Code skill. Codex's explicit-only policy applies only when this skill is discovered from a supported skill location. No upstream assets, runtime, or exporter are installed, and package checks do not certify design quality.
- [Design Master](skills/design-master/SKILL.md) — Highest-quality UI, brand, and visual-system workflow (art direction, anti-slop, visual QA).
- [Document Master](skills/document-master/SKILL.md) — Highest-quality document writing workflow (audience, Diátaxis, sourced claims, plain language).
- [Coding Master](skills/coding-master/SKILL.md) — Highest-quality coding workflow (spec-first, TDD, incremental slices, multi-axis review, evidence-based completion).
- [Debugging Master](skills/debugging-master/SKILL.md) — Highest-quality debugging workflow (reproduce-first, hypothesis-driven, regression test).
- [Security Master](skills/security-master/SKILL.md) — Highest-quality security workflow (input validation, secret handling, evidence-based findings).
- [Observability Master](skills/observability-master/SKILL.md) — Highest-quality observability workflow (logs, metrics, traces; no secrets in telemetry).
- [Performance Master](skills/performance-master/SKILL.md) — Highest-quality performance workflow (measure-first, before/after evidence).
- [Skill Router](skills/skill-router/SKILL.md) — Routes intent to the correct master skill.
- [Skill Eval](skills/skill-eval/SKILL.md) — Trigger and outcome evaluation for skills.
- [Skill Composition](skills/skill-composition/SKILL.md) — Guidance for combining multiple skills.
- [Browser Evidence](skills/browser-evidence/SKILL.md) — Browser and E2E evidence capture.
- [Skill Audit](skills/skill-audit/SKILL.md) — Security audit for external skills.
- [Compound Feedback](skills/compound-feedback/SKILL.md) — Records skill outcomes into the compound log.
- [API Design](skills/api-design/SKILL.md) — Contract-first API and interface design.
- [Deterministic Kernel](skills/deterministic-kernel/SKILL.md) — Deterministic state transitions (decide + log replay).
- [Card Handoff](skills/card-handoff/SKILL.md) — Ask with a card, resume the same context.
- [Event Boundary](skills/event-boundary/SKILL.md) — Events are data; rules control routing.
- [Recipe + Skill](skills/recipe-skill/SKILL.md) — Pair a trigger with a processing manual.

- [Skill Catalog](docs/skill-catalog.md) — Auto-generated skill list (`node scripts/skill-catalog/generate.js`).
- [Dashboard](dashboard/index.html) — Static phase evidence dashboard.







## Why Harness Engineering?

As coding agents become capable of multi-hour autonomous work, the limiting factor is no longer raw model intelligence. It is the **harness** — the scaffolding of rules, feedback loops, tools, context management, and verification that keeps the agent on track.

**Precise definition**: A harness consists of tools, rules, and actions that are *directly associated* with the Code Agent to keep it stable over long runs. Examples include rules in CLAUDE.md, independent verification agents, evidence gates, and compound learning logs. It does **not** include every possible safety measure (stable IDE, hardware, user mindset, etc.). A Skill or MCP becomes part of the harness only when used specifically to constrain or verify Agent behavior.

Common failure modes without a harness:
- Premature "victory" declarations (done claims without evidence)
- Context Anxiety (degraded consistency above ~70% context window)
- Self-assessment bias (agents praise their own work)
- Over-engineering and scope creep
- Loss of progress across sessions

Harness Engineering shifts the developer role from writing code lines to designing the system that makes agents reliable.

## Core Principles

1. **Index-Only Constitution** — `CLAUDE.md` stays lean (~100 lines). Detailed specs live in `docs/`.
2. **No One-Shot** — Break work into explicit Phases/Sprints with completion criteria.  
   Each Phase must be **independently executable** and **human-testable**. Completion criteria must be observable (artifacts, logs, UI state, test output).
3. **Ralph Wiggum Loop** — Autonomous cycle: `coding → test → verify → review → compound`. Auto-retry on FAIL or [BLOCKING] (max 3 iterations).
4. **Independent Evaluators** — Coding and evaluation run in isolated context windows to eliminate self-bias.
5. **Objective Verification** — Use Playwright MCP, DevTools, logs, and test runners — never subjective code reading.
6. **Compound Learning** — Agents must read `docs/compound-log.md` before every task.
7. **Context Reset & Hand-off** — When context fills, summarize state into `docs/HANDOFF.md` and start a fresh session.
8. **Surgical Changes & Simplicity** — Touch only what is required. Prefer the minimum robust solution (Karpathy-inspired).

## Directory Structure

```
AI-Harness/
├── AGENTS.md                          # Shared constitution for Codex / multi-host
├── CLAUDE.md                          # Claude Code (prefer @AGENTS.md import)
├── README.md                          # Korean (default)
├── README.en.md                       # This file (English)
├── skills/                            # Portable Agent Skills (SKILL.md)
├── docs/
│   ├── architecture-spec.md            # Full synthesis
│   ├── external-patterns.md            # Universal patterns from external harnesses
│   ├── usage-scenarios.md              # Scenario guides
│   ├── ppt-harness-workflow.md         # Office document (PPT) harness
│   ├── DETAIL_SPEC.md                  # Requirements template
│   ├── PHASES.md                       # Phase checklists
│   ├── HANDOFF.md                      # Session hand-off state
│   ├── compound-log.md                 # Accumulated lessons
│   ├── DECISIONS.md                    # Design decisions (Korean)
│   └── SUPPLEMENTS.md                  # Gap analysis, defects, supplementary repo map (Korean)
├── tests/                              # Hook, gate and package regressions (counts in runner output)
├── .github/workflows/ci.yml            # Runs the checks in CI
├── .gitattributes                      # LF for .sh/.js, so a Windows checkout matches CI
├── .mcp.json.example                   # Playwright MCP example (copy to .mcp.json to enable)
├── .claude/settings.unattended.example.json  # Sandbox settings example for unattended runs
└── .claude/
    ├── settings.json                   # Hooks and permissions
    ├── required-test-command.json      # The only command an attestation may pin
    ├── agents/
    │   ├── coding.md
    │   ├── test.md
    │   ├── verify.md
    │   ├── review.md
    │   └── compound.md
    ├── commands/
    │   └── phase-harness.md            # /phase-harness <id> loop orchestrator
    ├── hooks/
    │   ├── block-destructive.sh        # Blocks destructive commands
    │   ├── evidence-guard.sh           # Stops subagents from writing evidence (registered in settings.json)
    │   └── read-tracker.sh             # Records which evidence files the verify agent opened
    └── workflows/
        └── phase-gate.js               # Evidence recorder and checker
```

## The Ralph Wiggum Loop

Named after the persistently optimistic Simpsons character. Coined by Geoffrey Huntley (2025) as a simple bash loop:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

Anthropic later packaged it as the official `ralph-wiggum` Claude Code plugin and added built-in primitives (`/loop`, `/goal`, `/batch`).

**Key insight**: Progress lives in files and git history, not in the model's context. Each iteration can start fresh. The loop continues until objective completion criteria are met.

In this harness the loop is structured as five specialized subagents:

| Step | Agent | Responsibility | Failure Action |
|------|-------|----------------|----------------|
| 1 | coding | Implement current Phase | — |
| 2 | test | Objective dynamic tests (Playwright, CLI) | FAIL → coding |
| 3 | verify | Checklist vs artifacts | FAIL → coding |
| 4 | review | Static analysis ([BLOCKING]/[NIT]) | [BLOCKING] → coding |
| 5 | compound | Append lessons to compound-log.md | — |

Maximum 3 retries per phase.

## Related Patterns & Frameworks

### Anthropic Effective Harnesses
- **Initializer + Coding Agent** (Nov 2025): First session scaffolds the environment (feature list, progress file, git). Subsequent sessions make one incremental feature and leave clear artifacts.
- **Generator-Evaluator** (2026): GAN-inspired separation. Planner expands specs, Generator builds, Evaluator independently grades (often with Playwright). External evaluation outperforms self-evaluation.

### Superpowers (obra/superpowers)
The most widely adopted agent skills framework. Enforces:
- Brainstorming → Design sign-off
- Writing plans (small verifiable tasks)
- TDD (tests must fail before implementation)
- Subagent-driven development with review between tasks
- Systematic debugging and verification-before-completion

### Karpathy-Inspired Guidelines
A minimal `CLAUDE.md` (originally ~65 lines) that became extremely popular:
1. Think Before Coding — surface assumptions and ambiguity
2. Simplicity First — minimum code that solves the problem
3. Surgical Changes — touch only what is required
4. Goal-Driven Execution — define and verify success criteria

### Multi-Agent Orchestration
Systems such as Oh My Claudecode / Oh My Opencode provide higher-level orchestration (Team, Autopilot, Ralph, Ultrawork modes) on top of individual harness patterns.

## Quick Start

**Multi-host**: Shared core rules live in `AGENTS.md`. Claude Code is recommended to import it via `@AGENTS.md` at the top of `CLAUDE.md`. See [docs/multi-host-balancing.md](docs/multi-host-balancing.md) for the balancing strategy.

1. Read `AGENTS.md` (or `CLAUDE.md` on Claude Code).
2. Review `docs/compound-log.md`.
3. Define phases in `docs/PHASES.md` and requirements in `docs/DETAIL_SPEC.md`.
4. Run a phase with `/phase-harness <phase-id>`. Completion is decided by `node .claude/workflows/phase-gate.js check <phase-id>`.
5. When context degrades, write state to `docs/HANDOFF.md` and start a fresh session.

## Applying These Patterns to Other Projects

Recommended adoption order when transplanting this harness into a new project.

### Minimal Adoption (under 1 hour)

1. Place a `CLAUDE.md` at the project root that states only:
   - Read `docs/compound-log.md` before any task
   - Evidence is required before claiming completion
   - Each Phase must be independently executable and human-testable
2. Create `docs/PHASES.md` with phases sized so a person can run and verify each one.
3. Copy `.claude/workflows/phase-gate.js` and `.claude/commands/phase-harness.md`. Never write evidence by hand; record it only with `phase-gate.js run` and `record`. Hand-written JSON is rejected by `check`, and missing evidence fails.
   ```bash
   node .claude/workflows/phase-gate.js run 1 test -- npm test
   node .claude/workflows/phase-gate.js check 1
   ```

### Add a Default-FAIL Contract (recommended)

Keep a file that starts every item as `false`:

```json
{
  "US-001": { "passes": false },
  "US-002": { "passes": false }
}
```

- The agent may set an item to `true` only after opening evidence.
- The verification agent runs in a separate context with no Write/Edit tools.

### Forced Lifecycle (Superpowers style)

When starting a new feature, enforce this order:

1. **Clarify intent** — questions that surface real requirements (no code yet)
2. **Write a plan** — 2–5 minute tasks with exact file paths and acceptance criteria
3. **TDD** — write a failing test first
4. **Independent review** — separate context from the implementation agent
5. **Verify before claiming done** — run the actual command and confirm output

### Priority by Project Type

| Type | Apply first | Reason |
|------|-------------|--------|
| Web / app | Default-FAIL + fresh-context evaluator + Playwright evidence | Agents miss broken UI |
| Backend / API | TDD + test-runner backpressure | Compilers and tests give strong feedback |
| Docs / PPT | 3-slide sample gate + conclusion-style titles + visual QA | Full generation before approval is expensive |
| Long autonomous runs | Agent-maintained handoff + small stories | Context reset is mandatory |

### Caveats

- Do not adopt everything at once. “No evidence = FAIL” and “keep phases small” already deliver most of the value.
- Re-simplify as models improve. Periodically ask whether a rule is still load-bearing.
- Do not store project-specific scenarios in the harness repository. Keep only mechanisms; put project content in the project.

Fastest start: copy `docs/PHASES.md`, `docs/HANDOFF.md`, `.claude/workflows/phase-gate.js`, and `.claude/commands/phase-harness.md` from this repository, then fill in only the phases for the target project. To get the evidence write restrictions as well, also copy `.claude/agents/`, `.claude/hooks/`, and `.claude/settings.json`.

## Further Reading
- [Design skills supplements](docs/design-skills-supplements.md) — Curated external PPT, diagram, and visual QA skills with adoption guidance.
- [PPT Master style workflow](skills/ppt-master-style/SKILL.md) — Staged, gated native-PPTX workflow adapted from ppt-master.
- [PPT Master](skills/ppt-master/SKILL.md) — Highest-quality native PPTX workflow (action titles, design-spec lock, visual QA).




- [docs/architecture-spec.md](./docs/architecture-spec.md) — Full synthesis (includes precise harness definition, failure modes, and references)
- [docs/external-patterns.md](./docs/external-patterns.md) — Universal patterns extracted from Superpowers, Anthropic cwc, Ralph, Huntley, Ponytail, and Karpathy
- [docs/SUPPLEMENTS.md](./docs/SUPPLEMENTS.md) — Gap analysis, confirmed defects, supplementary repository map and adoption order (Korean)
- [docs/usage-scenarios.md](./docs/usage-scenarios.md) — Scenario guides (web, API, PPT, long run, bug fix, improvement)
- [docs/ppt-harness-workflow.md](./docs/ppt-harness-workflow.md) — Staged harness workflow for PPT/office document creation with Claude Code
- OpenAI: [Harness Engineering](https://openai.com/index/harness-engineering/)
- Anthropic: [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic: [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- obra/superpowers
- Geoffrey Huntley — Ralph technique
- Karpathy-inspired CLAUDE.md collections

---

*Built as a living harness. Agents that read the compound log get smarter over time.*

## Research adoption (2026-10-26)

The [evidence-first harness integration review](docs/agent-harness-integration-2026-10-26.md) identifies narrowly adoptable patterns from recent papers, agent workflows, and graph/second-brain repositories. The [optional skill](skills/evidence-first-harness/SKILL.md) is a scoped audit guide, not an installed runtime or replacement for the existing phase gate. [Manual adversarial cases](tests/fixtures/instruction-conflict-regressions.md) distinguish static file validation from live model behavior. No speed, quality, or cost improvement is claimed without a controlled host trial.

## Strict test-evidence mode

New phases should run `phase-gate.js run <id> test --require-test-summary -- <command>`. The gate validates Node TAP/pytest counts, rejects zero/all-skipped recognized summaries, and enforces the committed pinned test command on the first run. Strict CI attestation replays re-check the counts. Legacy commands with unrecognized output retain compatibility but cannot prove test coverage. The [maturity acceptance matrix](docs/maturity/ACCEPTANCE-2026-10-26.md) distinguishes implemented checks from unverified live-agent and sandbox scenarios.

## Typed constraint preservation and handoff drift

Opt-in Phase contracts are checked against typed, full-text local checkpoints before test runs and Phase completion. CI cross-checks the HANDOFF platform list. These checks do not intercept the model's private compaction, authenticate approval, or replace tool-level authorization. See `docs/task-contracts/README.md`.


## Recent updates (2026-11-05) — test isolation hardening, secret-scan expansion, memory-guard

- **Commit `7ffc1d0`** — test isolation hardening: on hosts where bash/jq are not actually runnable (e.g. a WSL launcher stub), bash-hook and doctor suites now **skip** with an explicit reason via `tests/helpers/bash-probe.js` (cached `bashWorks()`/`jqReason()` probes). Short 3s spawn timeouts that flaked under parallel load were relaxed to 20s (`evaluation-accounting`, `task-graph`). `tests/run-all.sh` fails fast (exit 2) when node/jq/bash are missing. Added `tests/skill-audit.test.js`.
- **Commit `1e217a9`** — **memory-guard**: deterministic validator `scripts/memory-guard.js` for distilled (dreaming) memory stores — requires `_index.md`, validates links, fails on secret-shaped tokens, warns on undated facts (`date:`) and email-like PII. Covered by `tests/memory-guard.test.js` (3 tests).
- **Secret-scan expansion**: added `ghp_`/`github_pat_`/`glpat-`/Slack (`xox*`)/OpenAI (`sk-`)/Google (`AIza`)/`npm_` patterns — measured **clean**.
- **Full suite (measured)**: **pass 319 / fail 0 / skipped 10**. Heaviest single gate/verify test is 136.8s; splitting it proved impossible without breaking attestation semantics, so it stays unified.
- Prerequisites: Node.js >= 20, bash, **jq** (enforced up front by `tests/run-all.sh`). Windows batch-flake mitigations: pin `HARNESS_BASH` to a native bash or lower `--test-concurrency`.


## Recent updates (2026-11-06) — memory guard hardening, static gates listed

- `scripts/memory-guard.js`: external URLs (`https://`/`mailto:`/`//`) and anchors (#anchor) are no longer reported as broken links — stores may legitimately reference the web. Regression test added (fail 0).
- Static gates indexed: skill security/metadata audit `scripts/skill-audit.js` (license required, Apache-2.0 consistency), distilled-store reviewer `scripts/memory-guard.js`, evidence redaction `scripts/evidence-redact.js`, secret scan `scripts/secret-scan.js`, design channel checks `scripts/design-channel-check.js` (same listing in AGENTS.md/CLAUDE.md).
- 100-round simulation (secret-scan + skill-audit x100) measured **ALL_OK** (200/200 exit 0) — zero variance for the deterministic gates.
