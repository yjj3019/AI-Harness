---
name: card-handoff
description: Pause work and ask the user with a structured card, then resume the same session. Use when an agent needs a decision (delete, spend, external message, irreversible action)  and should not continue or restart from scratch after the answer.
license: Apache-2.0
---

# Card Handoff

**Goal**: Ask only when needed, wait without consuming tokens, and resume the same context.

Pattern adapted from agent-autoloop’s card flow. Does not vendor upstream code.

## When to use a card

- Irreversible or costly actions (delete data, restart service, spend money, send external messages).
- Missing information that only the user knows.
- Explicit `askFirst` items defined by the user.

## Card contents

A card should include:

1. What was already done.
2. What is blocked.
3. The exact question or choices.
4. What will happen after the answer (resume steps only).

## Process

1. Detect that a decision is required.
2. Emit a card (or structured ask) with the four items above.
3. Stop. Do not keep the process running or retry on a timer while waiting.
4. On answer, resume the same session or context. Do not open a new session that redoes completed work.
5. Record the answer and the continuation result.

## Rules

- Do not ask the same open question twice if a card is already pending.
- Do not restart the entire task after an answer. Continue from the blocked point.
- Temporary debug or partial work must be noted in the card so it is not lost.
- Phase evidence rules still apply. A card is not Phase evidence by itself.

See `references/card-examples.md`.
