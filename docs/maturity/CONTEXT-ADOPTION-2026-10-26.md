# Context and memory adoption review — 2026-10-26

## Chosen option

Keep existing Phase evidence, test runners, independent review and compound log. Add an **opt-in typed context checkpoint** for consequential tasks, and a **CI-backed HANDOFF platform consistency check**. Do not install full Mem0, knowledge graphs, or an autonomous forgetting service until a reproducible task-level benefit is observed.

## Primary evidence

- [Benchmarks Are Surprisingly Compaction-Friendly](https://arxiv.org/abs/2610.31778): task constraints, especially negative/process restrictions, can be lost across compactions even when benchmark results hold up.
- [Compaction Laundering](https://arxiv.org/abs/2610.29869): flattening user/tool role provenance can lead to fake authority surviving a summary.
- [Mem0](https://arxiv.org/abs/2504.19413): 90% token-cost and 91% p95 reductions are study-specific LOCOMO comparisons with full-context; not transferable results for AI-Harness.
- [CoALA](https://arxiv.org/abs/2309.02427): working/episodic/semantic/procedural is a memory taxonomy, not proof a five-layer plugin improves model outcomes.

## What changed in this PR

| Metric | Baseline | Candidate capability |
| --- | --- | --- |
| Enforce hard constraints before Phase test | No typed checkpoint validation | Phase run/check reject missing or stale declared contract checkpoint |
| Preserve negative restrictions | Model instruction and HANDOFF prose | Byte-hash comparison and exact text/origin matching |
| Detect forged user origin in tool output | No structured Phase context verifier | Typed observations reject authority elevation in verified checkpoint |
| Detect incorrect platform listing in HANDOFF | Manual review, existing obsolete Ubuntu-only wording | CI-derived platform inventory lint with regression cases |
| Memory DB, forgetting, auto-compaction | Not implemented | Still not implemented: intentionally deferred |

## Measurement gates

- Structural constraint fidelity on validated synthetic samples: require **100% rejection of altered, missing or duplicated authoritative constraints**.
- Provenance-laundering cases: require **0 observations promoted to privileged roles** in checkpoint verification.
- HANDOFF drift fixtures: require **all wrong platform and obsolete status cases rejected**.
- Regression: preexisting test coverage must not be degraded; Windows/macOS/Linux CI pass on the actual PR head.
- Task success and token-cost effects: **unmeasured** without controlled Claude Code/Codex runs (do not claim 90% cost savings).

## Boundaries

This is a scoped, structural gate rather than a model-run guarantee. Permission enforcement and API/DB exactly-once writes remain unresolved and should not be deferred merely because the context validator passed. A hash is not a signature; the contract is authoritative only when its Git changes are reviewed. Require real-agent A/B evaluation before increasing the agent-reliability score.
