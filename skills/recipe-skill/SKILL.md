---
name: recipe-skill
description: Package a repeatable workflow as a recipe: a rule (or trigger) plus a SKILL.md. Use when turning a successful one-off task into something that can run again  with clear permissions and verification steps.
---

# Recipe + Skill

**Goal**: Make a workflow reusable by pairing a trigger/rule with a processing manual.

Pattern adapted from agent-autoloop’s recipe structure (rules.json + SKILL.md + README). Does not vendor upstream code.

## What a recipe contains

1. **Trigger** — When it runs (cron, event type, or manual).
2. **SKILL.md** — How to do the work, how to know it is done, and how to verify.
3. **Permissions note** — Why the recipe needs the access it requests.
4. **Example config** — Minimal rule or settings snippet.

## Process

1. Complete the task once manually and note the steps that mattered.
2. Write a SKILL.md that captures done criteria and verification. Do not include session-ending instructions.
3. Define the trigger separately (do not hard-code it only inside the skill body).
4. Add a short permissions rationale.
5. Store the recipe under `examples/recipes/<name>/` or equivalent.
6. Test the trigger path once and record the result.

## Rules

- The skill describes the work. The rule describes when and where.
- Include “how to know it is done” and “how to verify”.
- Do not put secrets in the recipe. Reference a config location instead.
- Phase evidence rules still apply when the recipe runs inside a Phase.

See `references/recipe-template.md`.
