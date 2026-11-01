# Local evaluation accounting

This independent, opt-in utility validates and counts supplied records for the proposed [pilot](harness-evaluation-pilot.md). It does not run tasks, contact a network, authorize actions, authenticate records, verify preregistration or evidence, determine correctness, enforce isolation, or establish safety or live behavior. A caller must preserve independent preregistration and evidence; this schema alone cannot establish when either was created. Use synthetic or appropriately approved data and avoid sensitive references.

Run manually with Node.js: `node scripts/evaluation-accounting.js record.json`. Output is JSON on stdout; invalid input produces an error on stderr and a nonzero exit. Nothing is written by the utility. Tests: `node --test tests/evaluation-accounting.test.js`. No dependencies or integration with existing gates are required.

## Input contract, version 1

The CLI opens the input nonblocking where supported and checks the opened descriptor is a regular file before reading; directories and FIFOs are rejected. This avoids waiting for a FIFO writer on POSIX, but is not a general I/O timeout or protection against slow filesystems, special-device open behavior, concurrent file changes, or untrusted paths. Symlinks to regular files are followed. The file is UTF-8 JSON without a BOM, at most 1,048,576 bytes. Each array has at most 10,000 entries. All objects have exactly the shown fields; identifiers and reason strings are nonempty trimmed strings of at most 200 UTF-16 code units. Duplicate JSON object member names are rejected, including escaped spellings of the same name. Nesting is limited to 20 levels. Arrays may be empty. Example:

```json
{
  "version": 1,
  "na_reasons": ["outside preregistered scope"],
  "planned": [
    {"task_id":"T1", "condition":"baseline", "retry_allowed":true},
    {"task_id":"T1", "condition":"candidate", "retry_allowed":false}
  ],
  "results": [
    {"task_id":"T1", "condition":"baseline", "verdict":"UNKNOWN", "na_reason":null, "attempted":true, "completed":false, "attempts":[{"id":"a1", "status":"INVALID"}]},
    {"task_id":"T1", "condition":"candidate", "verdict":"NA", "na_reason":"outside preregistered scope", "attempted":false, "completed":false, "attempts":[]}
  ]
}
```

`planned` defines distinct task-condition pairs and preregisters whether retry is permitted. `na_reasons` is a unique list of reasons preregistered for the evaluation; pair-specific eligibility and actual preregistration must be checked externally. Each planned pair has exactly one result and no unplanned results are accepted. Verdicts are `PASS`, `FAIL`, `UNKNOWN`, or `NA` (the pilot's N/A). `NA` requires an exact listed reason and no attempts; all other verdicts require `na_reason: null`.

Attempts remain nested under the pair and have unique IDs within that pair. Their status is `SKIPPED` (execution did not start), `STARTED` (started but no usable final outcome), `INVALID` (started but invalid/unusable), or `COMPLETED` (usable final outcome, irrespective of verdict). `attempted` must equal whether any attempt started, and `completed` whether the last attempt completed. Multiple entries require `retry_allowed: true`. Any `STARTED` attempt requires an UNKNOWN verdict even if a later attempt completes: this schema cannot represent independent reconciliation. A non-UNKNOWN result cannot leave a skipped or invalid attempt unresolved by a later completed attempt. PASS and FAIL require a completed attempt; UNKNOWN can also be completed if the outcome is usable but evidence remains ambiguous. An empty attempt list represents not run, which must be UNKNOWN or NA. Actual resolution and retry appropriateness require independent review.

## Report

`counts` contains planned, each verdict, eligible (`PASS + FAIL + UNKNOWN`), attempted and completed **pairs**, and all nested attempts (including skipped). Planned equals eligible plus NA. `rates.pass` is PASS / eligible and `rates.completion` is completed / eligible; both contain numerator, denominator, and value. Zero denominators produce `null`, never a fabricated zero rate. UNKNOWN remains in eligible and is reported explicitly. The original input retains individual records; this report does not include evidence, costs or other pilot measures. Missing evidence is not represented as zero and must be recorded separately; do not infer overall performance, authorization or truth from these counts.
