# Offline paired evaluation (proposed diagnostic)

This opt-in utility validates caller-supplied declarations and reports a proposed diagnostic policy. It is not evidence, approval, a real gate, or a claim of actual improvement, statistical significance, independent held-out evaluation, or authenticity. For JSON input, the utility itself does not run a model or benchmark, execute commands, contact a network, verify identifiers, or perform external effects. Programmatic callers must not pass untrusted objects: cloning can invoke getters with arbitrary side effects. It neither establishes isolation nor enforces authorization. Independently preserve and check the evaluation plan, records, provenance, and review; a declaration cannot prove it was immutable or made in advance.

From `ai-harness`, run `node scripts/paired-evaluation.js record.json`; output is JSON on stdout. Invalid input, unreadable files and non-regular files yield a generic error and nonzero exit. It opens the supplied file read-only, uses nonblocking open where supported, checks the opened descriptor is a regular file, and reads at most 1,048,577 bytes. Filesystem races and platform behavior are not a sandbox. The program writes no files. Run focused tests with `node --test tests/paired-evaluation.test.js tests/evaluation-accounting.test.js`.

## Input

The input is UTF-8 JSON with no BOM, at most 1 MiB; duplicate members (including escaped equivalents) and excessive nesting are rejected by the existing accounting parser. All objects have exactly the listed properties:

```json
{
  "version": 1,
  "baseline": "old",
  "candidate": "new",
  "context": {
    "baseline": {"benchmark":"b1", "case_set":"c1", "rubric":"r1", "scorer":"s1", "environment":"e1"},
    "candidate": {"benchmark":"b1", "case_set":"c1", "rubric":"r1", "scorer":"s1", "environment":"e1"}
  },
  "accounting": {
    "version": 1, "na_reasons": [],
    "planned": [
      {"task_id":"T1", "condition":"old", "retry_allowed":false},
      {"task_id":"T1", "condition":"new", "retry_allowed":false}
    ],
    "results": [
      {"task_id":"T1", "condition":"old", "verdict":"FAIL", "na_reason":null, "attempted":true, "completed":true, "attempts":[{"id":"a", "status":"COMPLETED"}]},
      {"task_id":"T1", "condition":"new", "verdict":"PASS", "na_reason":null, "attempted":true, "completed":true, "attempts":[{"id":"a", "status":"COMPLETED"}]}
    ]
  }
}
```

Conditions must differ and each condition is a nonempty trimmed string of at most 200 UTF-16 code units. All five context fields must be explicitly supplied for both sides, each as either such a string or `null` (UNKNOWN). The reserved ambiguous strings `UNKNOWN`, `N/A`, `NA`, `TBD`, `NONE`, and `UNSPECIFIED` are rejected case-insensitively after trimming; use `null` instead. Strings must still be trimmed. The reserved list is not an exhaustive detector of unknown or misleading labels. Other identifiers are opaque declarations, not verified hashes: there is no way for this utility to ensure they are truthful, and equality is an assertion of unchanged context, not proof of immutability or actual comparability. A null on either side or unequal present values produce an inconclusive diagnostic even when all pairs otherwise favor the candidate.

The embedded record is validated first using [`evaluation-accounting`](evaluation-accounting.md), including its planned/result and attempt rules. Its original rules and limits apply. Additionally at least one task is required; every task must have exactly the two declared conditions, and no other condition is allowed. Missing results, duplicates and malformed attempts are errors, not missing cases silently omitted from comparison. Empty planned tasks are invalid; consequently the defensive no-pairs inconclusive branch is not reachable for valid input.

## Output and policy

The JSON contains only `outcome`, aggregate `counts`, `mismatched_context`, and `missing_context_fields`, never declared identifiers, task IDs, reasons, or attempts. `missing_context_fields` lists fields with null on either side (including both sides); `mismatched_context` lists only fields whose values are both present and unequal. `pairs` counts all planned matched tasks. Four separate cells use baseline/candidate order: `pass_pass`, `fail_pass`, `pass_fail`, and `fail_fail`. These are counts of **unverified declarations**, not verified results or proof of comparability. They remain visible even when context identifiers mismatch; in that case they must not be interpreted as comparable performance evidence. Any pair containing UNKNOWN or NA is counted once in `incomparable_pairs`; `UNKNOWN_conditions` and `NA_conditions` count individual condition verdicts, so both can occur in one pair. The four cells plus incomparable pairs sum to `pairs`. No rates or division are computed.

Missing context, context mismatch, any incomparable pair, or no pairs gives `INCONCLUSIVE`; otherwise any `pass_fail` gives `DECLARED_REGRESSIONS_PRESENT`, at least one `fail_pass` with no `pass_fail` gives `DECLARED_GAINS_ONLY`, and neither gives `DECLARED_NO_DIFFERENCE`. In particular, all FAIL/FAIL gives `DECLARED_NO_DIFFERENCE` with a nonzero `fail_fail` count: it is **not success**, and both conditions failed by declaration. These labels are only arithmetic classifications of supplied records, not proof of measured quality or authorization to promote a candidate. There is no promotion, including when context matches.

Programmatic use: `const { parse, report } = require('./scripts/paired-evaluation');` then `report(parse(buffer))`. Call `parse` on input bytes to obtain the JSON-specific size, duplicate-key and UTF-8 protections; `report` accepts a pre-parsed object and applies the schema and accounting validations. The report snapshots the supplied object before validating and classifying it, and does not deliberately mutate the input. Cloning programmatic objects may invoke getters and reject proxies or other unsupported values; it is not a sandbox or hostile-object boundary. Prefer JSON bytes from trusted sources. The standalone accounting API has its own input-trust limits.
