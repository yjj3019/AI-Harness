# Optional offline task graph validator

This opt-in tool validates a declared dependency graph and reports a deterministic snapshot for valid graphs; invalid-input errors may follow input order. It does not execute tasks, orchestrate workers, access declared scopes, authorize actions, enforce permissions, provide isolation, verify statuses, or retry anything. It is not a security or completion gate. A valid graph is not proof that any task passed or that any host effect did or did not occur.

Run `node scripts/task-graph.js path/to/input.json`. It reads only the specified input file (at most 1 MiB plus one byte to detect overflow) and writes JSON to stdout; it creates no files and makes no network calls. The opened descriptor must be a regular file; nonblocking open avoids waiting for FIFO writers where supported. Symlinks are followed. Supply a trusted local file: this is not a sandbox and does not enforce host permissions or bound read time; filesystem operations and special-device opens can still block. Input must be UTF-8 without BOM. Output may reveal task IDs and dependencies; use synthetic or appropriately approved data.

## Schema, version 1

All properties below are required, with no additional properties. The root is `{ "version": 1, "tasks": [...] }`, with 1–256 tasks. Each task has:

- `id`: unique, case-sensitive ASCII identifier, 1–64 characters; starts alphanumeric, followed by alphanumerics, `.`, `_`, or `-`.
- `dependencies`: 0–256 unique task IDs. Every ID must exist and the directed graph must be acyclic.
- `role`: identifier with the same syntax as `id`; purely descriptive.
- `readScopes`, `writeScopes`: arrays of 0–256 unique nonempty strings of at most 256 Unicode code points (as counted by JavaScript's Unicode regex, including lone surrogate code points) without ASCII control characters. These are opaque declarations, not paths to be opened or enforced; distinct labels may overlap.
- `retryCap`: integer 0–10, the maximum number of retries *after* the first attempt.
- `attempts`: integer 0–11 and at most `retryCap + 1`.
- `status`: `PENDING`, `PASS`, `FAIL`, or `UNKNOWN`. `PENDING` requires zero attempts; `PASS` and `FAIL` require at least one. `UNKNOWN` may have zero attempts when execution is unverified.
- `effect`: `NONE` or `EXTERNAL`, a declaration, not verified effect evidence.

JSON object member names should be unique; as with JavaScript's JSON parser, duplicate names are resolved to the last value. Do not use this tool where that ambiguity is unacceptable. Arrays and IDs are case-sensitive. Graph size, labels, and retry budgets are bounded, but the parser is not a hardened hostile-input security boundary.

Example:

```json
{"version":1,"tasks":[
  {"id":"inspect","dependencies":[],"role":"reader","readScopes":["synthetic input"],"writeScopes":[],"retryCap":0,"attempts":1,"status":"PASS","effect":"NONE"},
  {"id":"summarize","dependencies":["inspect"],"role":"reviewer","readScopes":["notes"],"writeScopes":[],"retryCap":1,"attempts":0,"status":"PENDING","effect":"NONE"}
]}
```

## Results

`verdict: PASS` means schema and graph consistency checks passed, not task success. `FAIL` means invalid JSON, invalid declared schema, missing reference, inconsistent PASS dependency, or cycle; exit 1. Unreadable input yields `UNKNOWN`, exit 2. Usage errors also exit 2. Valid graphs exit 0 and list nodes sorted by ID; each includes the declared `status`, derived `state`, `reason`, and sorted direct `unmet` dependencies. `DONE` means declared PASS, not independently observed success. For other nodes, `UNKNOWN` blocks pending reconciliation; any direct prerequisite not declared PASS blocks; a pending node with passed prerequisites is READY. A declared failed `NONE` node is READY only while the retry budget remains; an `EXTERNAL` failure is always BLOCKED pending reconciliation, irrespective of the budget. Exhausted failures are BLOCKED. No recommendation triggers execution. A PASS node with any direct dependency not declared PASS is inconsistent and makes the graph FAIL; applying this check to every PASS node also enforces the condition transitively. READY is not a guarantee of safe parallelism: the tool does not detect overlapping scopes or other conflicts by default.

### Optional exact-label advisory

Run `node scripts/task-graph.js --scope-warnings path/to/input.json` (the flag must precede the input). On PASS only, the result adds `scopeWarnings: { warnings, total, truncated }`; default output is unchanged. Programmatic callers may pass `{ scopeWarnings: true }` as the second argument to `analyze`. Each warning has `tasks: [firstId, secondId]`, `label`, and `modes`. Only distinct READY task pairs are compared, in sorted ID order, then labels in JavaScript string sort order. A matching label yields one record with any applicable modes in this order: `write/write`, `write/read`, `read/write`; mode sides correspond to the two task IDs. Read/read alone is omitted. Labels are opaque and compared exactly, case-sensitively, without path interpretation or normalization. The first 256 records are retained; `total` counts all matching pair/label records, and `truncated` indicates omitted records. The advisory may expose scope labels in output.

This is a limited advisory, not a conflict detector or authorization: distinct labels can overlap, declarations may be incomplete or wrong, and other hazards exist. **No warnings, including an empty list, do not imply safe parallelism.** It does not alter readiness, verdicts, or execution.

This tool cannot determine whether an unknown external effect happened and never retries one. Reconciliation and any subsequent action require separate human judgment and appropriate authorization and host enforcement. A BLOCKED or UNKNOWN node is not a FAIL verdict; a declared FAIL is not transformed into a PASS by eligibility for another attempt.

Run tests with `node --test tests/task-graph.test.js`. Mocked filesystem tests cover this module's specified file-access path, not all possible runtime behavior or host-level containment.
