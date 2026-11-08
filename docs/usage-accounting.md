# Usage accounting (offline totals over declared records)

Optional, standalone accounting for token, call, elapsed-time and cost records.
It is **not** a gate, a runner, or proof that any number reports real provider usage.

```
node scripts/usage-accounting.js <record.json>
```

## What it does

- Sums counters per **source** (`provider` vs `estimate`). A provider total never absorbs an estimate and the reverse is also refused, so a mixed record cannot present one blend as real usage.
- Keeps **retries nested**: `top_level` covers declared tasks only, `including_retries` adds every retry. Retries are never folded into the parent entry.
- Reports absent values as **`null`**, never `0`. Every missing field also increments `unknown_fields`, so a caller cannot read a total as complete.
- Reports `cost.currency` as `null` when no cost was supplied and `"MIXED"` when several currencies appear. Mixing currencies would fabricate a comparable number.
- Rejects unknown keys, so prompt text, secrets or customer data cannot be stored. Only `id`, `source`, `usage`, `elapsed_ms`, `cost` and `retries` are accepted.

## Record shape

```json
{ "version": 1,
  "entries": [
    { "id": "task-1", "source": "provider",
      "usage": { "input_tokens": 100, "output_tokens": 50,
                 "cache_read_tokens": 0, "cache_write_tokens": 0, "calls": 1 },
      "elapsed_ms": 1200,
      "cost": { "amount": 0.02, "currency": "USD" },
      "retries": [] } ] }
```

Any counter, `elapsed_ms` or `cost` may be `null` to mean "not provided".

## Limits

- Byte size is not token count. This module never converts one into the other, and a local estimate is labelled `estimate`, never `provider`.
- The values are **caller declarations**. Nothing here verifies them against a provider bill, a model call, or a host counter.
- A subscription CLI session that spends fewer tokens is not a cash saving; cost is only reported when a caller supplies it.
- No integration with `phase-gate`, `test-summary`, attestations or CI. Existing evidence is untouched.
- Exit codes: `0` success, `1` invalid record, `2` usage or unreadable input.
