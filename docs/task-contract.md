# Optional request/task contract

This standalone validator checks the shape of an explicitly supplied JSON task description. It is independent of the Phase context contract and is not integrated into any workflow or automatic gate. It does not execute the task, interpret commands, create outputs, enforce restrictions or limits, verify outcomes, authenticate a requester, or grant or assert approval. Actual authorization and enforcement remain the responsibility of humans and host/tool controls. Text can contain claims or instructions; validation does not make them true, safe, observable, or approved. Do not place secrets in a contract merely because it validates.

## Format (schema 1)

```json
{
  "schema": 1,
  "goal": "Improve reporting",
  "scope": ["Update the report"],
  "non_goals": ["Do not deploy"],
  "deliverables": ["Updated report"],
  "success_criteria": ["Report includes the totals for each month"],
  "restrictions": ["Do not access the network"],
  "risk": "Source totals may be stale",
  "execution_limits": { "max_steps": 10, "max_duration_seconds": 300 }
}
```

All fields shown are required and no other fields are allowed at either object level, including approval fields. `schema` is the number 1. `goal` and `risk` are nonblank strings of at most 2,000 UTF-16 code units each. Each of the five arrays contains 1–50 nonblank strings, each at most 2,000 UTF-16 code units. Write success criteria as observable checks; the validator cannot judge observability or truth. To state that there are no non-goals, restrictions, or known risks, explicitly describe that in the appropriate field rather than omitting it. The two execution limits are safe integers: `max_steps` 1–1,000 and `max_duration_seconds` 1–86,400. These are declarations, not timers or counters enforced by this tool.

## Usage

`node scripts/task-contract.js validate path/to/contract.json`

A valid contract prints `{"ok":true}` and exits 0. Invalid or unreadable input prints a JSON object with `ok:false` and an error and exits 2. Incorrect invocation prints usage to stderr and exits 1. JSON is parsed using standard JavaScript JSON semantics, including last-value-wins for duplicate member names; avoid duplicates. Input must be UTF-8 without a BOM, at most 262,144 bytes and resolve to a regular file. Symbolic links to regular files are followed. File checks and bounded reads do not provide filesystem isolation or protect against concurrent replacement; filesystem behavior may vary. The validator reads the specified file only and does not write or run its contents.
