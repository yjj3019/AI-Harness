# Super-agent Architecture Notes (Optional Adaptation)

**Status**: Research synthesis and optional design notes. Not a runtime, not an automatic integration, and not a replacement for the existing Phase evidence gates, Ralph Wiggum loop, or host-enforced permissions.

Source inspiration: DeepSeek Harness team write-up “Exploring Super-agent Design: Towards a More Autonomous Agent System” (Oct/Nov 2026) and related prototype discussions (dsh-superagent-prototype). Also draws on autonomous team design prompts and multi-agent isolation patterns observed in the broader ecosystem.

## Why this matters for AI-Harness

AI-Harness already separates roles (coding / test / verify / review / compound), requires observable evidence, and treats context as something that degrades. The Super-agent design addresses a related bottleneck: **human attention** limits how many concurrent agent sessions a person can usefully follow (commonly cited as 3–5). A single long-lived coordinating layer plus context-isolated workers can improve continuity and throughput while still fitting inside evidence and approval boundaries.

No single ReAct loop supplies all four traits below. They come from the surrounding architecture.

## Four traits (adapted)

| Trait | Meaning in AI-Harness terms | How to approximate |
|-------|-----------------------------|--------------------|
| **Continuous** | Users interact where they already work (chat, PR comments, issues) and experience one agent, not isolated sessions. | Long-lived coordinator that owns human-facing replies and global sequence. Workers never speak directly to humans. |
| **Productive** | Multiple complex tasks run in parallel; next instruction can be accepted before the previous finishes. | Context-isolated workers (separate sessions / worktrees) dispatched by the coordinator. Cap concurrency. |
| **Proactive** | Monitors events, acts on what is worth handling, stays quiet otherwise. | Event filters before model judgment. Workers subscribe to their own threads so follow-ups can skip the coordinator when appropriate. |
| **Persistent** | Always online, recovers from anomalies, connected to real environments. | Separate Watchdog (timer-driven health check + auto-recovery). Compute / state / execution environment kept separable. |

## Two-level architecture (core pattern)

```
Human channels (IM, GitHub, group chat)
          ↓ events / messages
     ┌──────────────────────────┐
     │  Long-lived Router     │  ← lighter model often sufficient
     │  - human interaction   │  ← global sequence & coordination
     │  - memory / state      │  ← may omit Bash/tools
     │  - dispatch only       │
     └──────────────────────────┘
          ↓ dispatch (new tasks)
     ┌──────────────────────────┐
     │  Isolated Workers      │  ← full tools, strong model
     │  (1..N, capped)        │  ← own context / worktree / sandbox
     │  - execute tasks       │  ← report status back to Router
     │  - never talk to humans│
     └──────────────────────────┘
          ↑ replies / results (via Router)
```

**Router** responsibilities:
- Own all human-facing communication and global sequence.
- Maintain continuity across channels (same task can continue from chat to PR comment).
- Dispatch new work to workers; do not execute the work itself.
- Prefer a lighter/faster model when possible.

**Worker** responsibilities:
- Isolated context and (where authorized) own git worktree or sandbox.
- Full tool set for the task.
- Report structured status, diffs, test results, and uncertainties back to the Router.
- Never reply directly to humans.

**Thread pass-through** (important optimization): Once a worker is assigned to a task/thread, subsequent events on that same thread can be delivered directly to the worker, bypassing the Router. This reduces latency and context pressure.

## Separation of concerns

Keep these apart (inspired by the design):
- **Compute** — the model loop (can be cloud or local).
- **State / memory** — durable across sessions (database, files, or the existing compound-log + HANDOFF pattern).
- **Environments** — real working directories, sandboxes, or BYOM (bring-your-own-machine) daemons that only come online when needed.

## Watchdog

A separate, timer-driven process or session that:
- Checks that workers are making progress (not just alive).
- Detects anomalies (hung sessions, repeated failures, missing heartbeats).
- Triggers recovery (restart worker, escalate to human, or mark UNKNOWN and stop dependent work).

This aligns with the existing UNKNOWN handling rule in `docs/deepseek-team-workflow.md` and the host verification plan.

## Mapping to existing AI-Harness mechanisms

| Super-agent idea | AI-Harness counterpart / constraint |
|------------------|--------------------------------------|
| Router continuity | Orchestrator session + `docs/HANDOFF.md` + compound-log |
| Isolated workers | Subagents / separate sessions; prefer git worktrees for concurrent edits |
| Evidence | Still required. Workers produce artifacts; Router (or a dedicated verifier) records via `phase-gate.js`. No hand-written evidence. |
| Approval boundary | External effects, merges, dependency installs, destructive actions still need explicit human approval. Router does not bypass this. |
| Phase gates | A Super-agent task can still map to a Phase. Completion is still `phase-gate.js check` exit 0. |
| Safety rules | Accuracy and safety over speed. No destructive bash without confirmation. No secret leakage. |

## Practical adoption checklist (opt-in)

1. Define a clear brief and acceptance criteria before dispatch (reuse task-contract patterns).
2. Prefer git worktrees for workers that will edit overlapping areas.
3. Cap concurrent workers.
4. Require structured status reports (files changed, commands run, observed results, uncertainties).
5. Route all human replies through one voice (the Router).
6. Record Phase evidence only through the existing gate.
7. Treat any ambiguous tool result after a side-effect may have started as UNKNOWN; stop and inspect.
8. Use a Watchdog only where you have authorized always-on infrastructure and monitoring.

## What this does **not** claim

- It does not install or enable any always-on daemon, Team mode, or new runtime.
- It does not weaken evidence requirements, approval boundaries, or host permissions.
- Performance numbers cited in external write-ups (e.g., ~40% median speedup) are from those authors’ preliminary tests and are not re-measured here.
- Prototype code (dsh-superagent-prototype) is research code; inspect and license-check before any reuse.

## Related existing documents

- `docs/deepseek-team-workflow.md` — Subagent vs Team collaboration procedure with Phase evidence separation.
- `docs/task-contract.md`, `docs/task-graph.md` — declarative contracts and dependency analysis.
- `.claude/agents/` — role definitions that can be specialized further into router vs worker style.
- `docs/HANDOFF.md` and `docs/compound-log.md` — continuity mechanisms already present.

When explicitly requested, the optional skill `skills/super-agent-router/SKILL.md` can be used to help design a concrete Router/Worker split for a given task set while staying inside the above boundaries.
