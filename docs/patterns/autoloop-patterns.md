# Patterns Adapted from agent-autoloop

Source: https://github.com/KKKKhazix/agent-autoloop  
Adapted as optional skills. Does not vendor upstream code.

| Pattern | Skill | Purpose |
|---------|-------|---------|
| Deterministic kernel | `skills/deterministic-kernel/SKILL.md` | Single decide function, injected time, log replay |
| Card handoff | `skills/card-handoff/SKILL.md` | Pause for user decision, resume same context |
| Event boundary | `skills/event-boundary/SKILL.md` | Events are data; rules control routing and permissions |
| Recipe + Skill | `skills/recipe-skill/SKILL.md` | Pair a trigger with a processing manual |

These skills do not replace Phase gates or evidence rules. Apply them when designing automation or reviewing event-driven flows.
