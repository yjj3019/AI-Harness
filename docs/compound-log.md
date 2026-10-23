# Compound Learning & Anti-Pattern Log

This file maintains a history of bugs, operational mistakes, and effective solutions. Agents MUST review this document before starting new tasks.

## [Initial Setup] Harness Architecture Active

- **Date**: 2026-10-23
- **Category**: System Setup
- **Rule**: Always run independent Subagents to verify code rather than relying on self-assessment.
- **Issue/Risk**: Self-congratulatory bias in single-agent workflows.
- **Root Cause**: LLMs naturally evaluate their own output positively.
- **Resolution/Pattern**: Isolate coding and evaluation into separate context windows (coding → test → verify → review → compound).

## Template for New Entries

### [YYYY-MM-DD] Phase X - [Category]

- **Issue/Risk**: Description of problem or mistake encountered.
- **Root Cause**: Why it happened.
- **Resolution/Pattern**: Effective fix or rule to avoid repeating it.
