# Skill Design: Progressive Disclosure and Trigger Testing

**Status**: Guidance for writing SKILL.md files that Claude (and compatible agents) actually load and use reliably. Optional. Does not change any gate, hook, or runtime behavior.

Source inspiration: Anthropic’s Agent Skills progressive disclosure model and field notes on “Build Skills Claude Actually Uses” (3-level loading + test loops).

## The 3-level loading model

A skill is a folder. The only required file is `SKILL.md`.

| Level | What loads | When | Approximate cost | Purpose |
|-------|------------|------|------------------|---------|
| 1. Frontmatter | `name` + `description` (YAML) | Always, at startup | ~30–100 tokens per skill | Routing / trigger decision. Claude uses this to decide whether the skill is relevant. |
| 2. Body | Full Markdown instructions in `SKILL.md` | When the skill is judged relevant (or explicitly invoked) | Keep under ~5k tokens / ~500 lines | The procedure itself. |
| 3. Resources | Files in `references/`, `assets/`, or scripts | On demand, when a step points to them | Only what is actually read; script source never enters context | Deep knowledge, templates, deterministic helpers. |

**Key rule**: The description decides whether the skill ever loads. Instructions that live only in the body do not help triggering. Put “Use when …” and concrete trigger phrases in the `description`.

## Minimal viable SKILL.md

```markdown
---
name: example-skill
description: Short, concrete description of what it does and when to use it. Use when the user asks to "do X", "check Y", or "apply Z guidelines".
---

# Example Skill

1. Confirm the request matches the description.
2. Do the minimal steps.
3. Report what was observed vs inferred.
```

## Design rules that improve reliability

- **Description quality is the activation surface.** Make it specific, include example user phrases, and keep it under ~1,024 characters.
- **Body stays procedural and short.** Push long reference material into `references/`.
- **Deterministic work goes into scripts.** Judgment in Markdown; exact scanning, parsing, or formatting in code that the agent runs.
- **Composability**: The skill should work alongside other skills and the project’s `CLAUDE.md` / Phase gates. Do not assume it is the only instruction source.
- **Portability**: Prefer patterns that work across Claude Code, Codex, and other Agent Skills-compatible hosts when possible.
- **No invented experience**: Do not claim the skill was measured or that it reduces tokens/speed unless you have local evidence.

## Test loop (recommended before shipping a skill)

1. **Trigger test** (10–20 diverse queries that should and should not fire the skill). Target ~90% of the relevant ones actually loading the skill. Adjust the description until this is reliable.
2. **Consistency test**: Run the same request 3–5 times. The skill should behave the same way each time (same files read, same structure of output, same refusal points).
3. **Negative cases**: Confirm it stays quiet on unrelated requests.
4. **Fix loop**: If it fails to trigger or behaves inconsistently, edit the description or body and re-test. Do not add more prose until the trigger is stable.

A first working skill can often be validated in 15–30 minutes with this loop.

## Mapping to AI-Harness principles

- Skills remain guidance, not sandboxes or permission enforcers.
- Evidence requirements, Phase gates, and approval boundaries in `CLAUDE.md` still take precedence.
- When a skill is used inside a Phase, its outputs still need to be recorded via `phase-gate.js` if they constitute Phase evidence.
- Prefer explicit invocation (“read skills/xxx/SKILL.md and apply it”) for high-stakes work rather than relying solely on automatic triggering.

## Existing skills in this repository

Review and optionally refine the descriptions of:
- `skills/evidence-first-harness/SKILL.md`
- `skills/design-evidence-harness/SKILL.md`
- `skills/evidence-preserving-editor/SKILL.md`
- `skills/super-agent-router/SKILL.md` (added with these notes)

The repository’s `skills/` path is not automatically registered as a native Claude Code skills directory in all setups. Callers should still name the file explicitly when they want guaranteed loading.

## References (external, for further reading)

- Anthropic: The Complete Guide to Building Skills for Claude (progressive disclosure chapters).
- Field notes on trigger testing and 3-level loading (the attached “Build Skills Claude Actually Uses” diagram).

## Codex and multi-host notes

The 3-level progressive disclosure model (frontmatter always, body on relevance, resources on demand) is shared with Codex via the open Agent Skills standard.

- Codex discovers skills in `.agents/skills/` (repo) and `$HOME/.agents/skills` (user).
- Claude Code uses `.claude/skills/`.
- Keep `name` and `description` high-quality; the description is the activation surface on both hosts.
- Optional host-specific metadata (e.g. `agents/openai.yaml` for Codex invocation policy) can live alongside the portable `SKILL.md`.
- Test the trigger loop on the host you use most; automatic invocation quality can differ.

For dual-host repositories, keep portable skill bodies and document host-specific discovery in `docs/codex-adaptation-notes.md`.
