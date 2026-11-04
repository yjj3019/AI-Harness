---
name: security-master
description: >
  Highest-quality security hardening and review workflow.
  Covers input validation, authentication/authorization, secret handling,
  dependency risk, and OWASP-aligned checks. Evidence-based findings only.
  Use for any code that handles untrusted input, auth, secrets, or external integrations.
---

# Security Master

**Goal**: Treat every external input as hostile and every secret as sacred. Findings must be evidence-based.

Synthesized from the strongest open patterns (2026):
- addyosmani/agent-skills `security-and-hardening`
- Cloudflare `security-audit-skill` (verified findings pattern)
- Trail of Bits differential-review / security skills
- OWASP Top 10 practices

Does not vendor upstream code. Apply this skill’s gates on top of any external security skill.

## Core principles

1. **Untrusted by default** — All external input, user data, and third-party responses are hostile until validated.

2. **Secrets never in code or logs** — No hardcoded credentials, tokens, or full PII in source, commits, or telemetry.

3. **Least privilege** — Authorization checks are mandatory. Prefer explicit allow over implicit allow.

4. **Evidence-based findings** — Every reported issue must include the location, the risk, and the evidence that supports it. No speculative severity.

5. **Dependency awareness** — Flag known-vulnerable or unexpectedly high-risk dependencies. Do not silently upgrade.

6. **Phase evidence rules** — Inside a Phase, never hand-write evidence files. Use the phase gate.

## Stages

1. **Scope** — Identify surfaces that accept untrusted data, manage sessions, handle secrets, or call external systems.
2. **Review** — Check against the axes in `references/security-axes.md`.
3. **Evidence** — For each finding: file:line, description, why it matters, suggested mitigation.
4. **Verify** — Re-check that proposed mitigations do not introduce new issues. Capture evidence of checks run.
5. **Handoff** — Findings list (or explicit “no issues found” with axes checked) + residual risks.

Detailed checks: `references/security-axes.md`.

## Rules that override convenience

- No silent dependency installs or upgrades.
- No secrets in logs, comments, or example code that will be committed.
- Findings without location and evidence are not accepted.
- Do not claim “secure” without having reviewed the relevant surfaces.

## Recommended external skills (optional)

| Need | Skill | Install |
|------|-------|---------|
| Security hardening | addyosmani/agent-skills | `npx skills add addyosmani/agent-skills --skill security-and-hardening` |
| Audit with verified findings | cloudflare/security-audit-skill | project-specific |

Apply this skill’s gates and evidence rules on top of any external tool.

See also: `skills/coding-master/SKILL.md`, `skills/debugging-master/SKILL.md`.
