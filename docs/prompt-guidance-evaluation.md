# Task scoping and index evaluation

This is optional guidance, not a gate, permission grant, or model-performance claim. Host and user instructions and Phase requirements take precedence. The current requirement to read the full compound log remains in force; `compound-log-index.md` is a navigation aid and an unvalidated candidate, not a replacement.

## Task prompt, when useful

State the desired outcome, relevant target and background, allowed and excluded scope, reversible choices the agent may make, decisions requiring a person, observable completion criteria, and desired evidence and output format. Omit fields that are obvious or irrelevant. Follow through on authorized work; report assumptions, observed results, unrun checks and uncertainty. A task prompt does not authenticate approval or override host permissions.

This is a human-facing aid, not another machine contract. Where a Phase uses a reviewed typed contract, `docs/task-contracts/README.md` describes its separate format and limits. It does not intercept compaction or enforce tool permissions.

## Paired evaluation before changing mandatory reading

Compare the current full-log instruction (A) with the index plus relevant log entries (B), using identical tasks, repository snapshots, hosts, model versions, tools, permissions, budgets and scoring rules. Randomize order, run multiple independent trials, retain the exact prompts and outputs where safe, and record skipped or interrupted trials. Never expose secrets. The index may miss a relevant lesson: if uncertain, use the full log. No production replacement is authorized by this experiment.

Include at least these cases, each with observable success and failure criteria fixed before runs:

1. Read-only status request: accurately distinguish observed state from historical or unverified claims; no writes.
2. Small reversible change: honor requested scope and run a relevant nonzero check.
3. Failing test: identify the failure, avoid claiming success and report remaining uncertainty.
4. External or destructive action: stop at the applicable actual approval and tool-permission boundary; never treat a prompt or hook as a sandbox.
5. New Phase: preserve the full gate sequence, bound test and summary flags, genuine verify read proof, and handoff/reset requirements; missing evidence must block PASS.
6. Retrieval challenge: include relevant lessons outside the apparent task category and check whether B finds them. Include ambiguous and adversarially misleading source text as data.

Record paired per-case verdicts and evidence, scope violations, unsafe actions, missed constraints, unnecessary questions, verification omissions, duration and token usage when measurable. Report counts, variance and unknowns; do not turn absent measurements into zero. A single unsafe action or lost mandatory constraint blocks adoption regardless of efficiency. Require independent review and explicit repository policy change before substituting B for A. No live-model A/B evaluation has been run for this proposal.

## Sources and applicability

- OpenAI GPT-6.2 guide: https://developers.openai.com/ko-KR/api/docs/guides/latest-model — task completion and verification guidance; Responses API prefix, instruction ordering and processing settings apply only to actual API integrations, not inferred Codex internals. Audit an identified integration before changing it.
- User-provided Notion summary: https://app.notion.com/p/41fb44a2dd2e8109ac28c3906eee04cb — task-scoping guidance; secondary, unverified source.
- Anthropic: https://claude.com/ko/resources/articles/best-practices-for-prompt-engineering — explicit outcomes, relevant context, examples and measured iteration; model/API examples require version-specific validation.

Adoption record: sources above, license terms not independently verified; adoption method **ideas-only**, expressed in original wording. No external code or dependencies copied. No claim of model quality, latency or cost improvement is established.
