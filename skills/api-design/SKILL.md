---
name: api-design
description: Design or review API and interface contracts. Covers request/response shapes, error semantics, versioning, and compatibility.  Use when adding or changing an endpoint, RPC, or public function that others depend on.
---

# API Design

**Goal**: Make interfaces predictable and safe to evolve. Contracts before implementation.

## Core principles

1. **Contract first** — Define the request, response, and error shapes before writing the handler.
2. **Explicit errors** — Error responses have a stable code or type. Do not rely on free-text messages for control flow.
3. **Compatibility** — Adding fields is safer than removing or renaming. Document breaking changes.
4. **Validation at the boundary** — Validate inputs at the edge. Do not trust internal callers with unvalidated data that crossed a boundary.
5. **Evidence required** — Completion claims need the contract (schema, types, or example) and a test that exercises success and at least one error path.

## Stages

1. **Define** — Write the contract (types, OpenAPI fragment, or clear examples).
2. **Validate** — List success and failure cases.
3. **Implement** — Handler matches the contract. No extra undocumented fields in error paths.
4. **Test** — Tests cover the happy path and at least one error case.
5. **Handoff** — Contract + test evidence + any compatibility notes.

## Rules

- Do not change a public field or error code without noting the impact.
- Error messages may be human-readable; machine consumers must use a stable code.
- This skill complements `coding-master`. Load both when the work is both interface and implementation.
- Phase evidence rules still apply inside a Phase.

See `references/contract-checklist.md`.
