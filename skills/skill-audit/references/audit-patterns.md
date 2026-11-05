# Skill Audit Patterns

## Automatic reject
- “Ignore previous instructions” or equivalent
- Requests to send API keys, tokens, or .env contents to an external URL
- Obfuscated or base64-encoded commands that are not explained
- Scripts that curl | bash or equivalent without clear purpose

## Needs review
- Broad shell or network permissions without a narrow justification
- Instructions to modify system files or global config
- External downloads of additional code at runtime

## Generally acceptable
- Clear, task-scoped instructions
- References to local files only
- Explicit “do not” rules that match the harness (no secrets in logs, etc.)
- Well-known upstream source with a visible license
