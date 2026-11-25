# Host verification record schema and runbook

> This template is for a future operator-approved run. The [verification plan](host-verification-plan.md) links the observations from the limited 2026-11-23 trials. Their approval and findings apply only to those fixtures and operations.

Companion to `docs/host-verification-plan.md`. The plan defines what to test; this document defines how a run is recorded so that a record is auditable, version-pinned, and re-runnable.

## Record schema

One record per host per run, stored at `docs/attestations/host-verification/<YYYY-MM-DD>-<host-name>.md`. Every field is required; a field that could not be measured is recorded as `UNKNOWN` with the reason, never left empty or filled from plan text.

| Field | Required content |
|---|---|
| date | UTC start and end of the run |
| authorization | What the owner authorized: named disposable host, test scope, operators, cleanup. What is explicitly out of scope |
| operator(s) | Named operator(s) and the approver |
| host | OS name + version, exact host binary versions (for example the host product version strings) |
| sandbox mode | Active sandbox/permission mode and a sanitized configuration fingerprint (no secrets, no PII, no private endpoint addresses) |
| boundary | Test-owned workspace path; protected outside canary path + its pre-test hash; allowed workspace canary path; resolved paths and ownership |
| tool availability | Relevant tools (shell, file tools, MCP, hooks) present/absent, and how each fact was measured |
| matrix results | Per matrix case: exact command/tool and inputs, exit/decision, sanitized output, independently observed filesystem state, timing, verdict PASS/FAIL/INCONCLUSIVE/NOT RUN |
| deviations | Any deviation from the plan, including any unexpected success and the stop taken |
| evidence | Sanitized logs and hashes; where any private detail is held and who holds it |
| cleanup | Canary restoration and recheck, removal of test-owned artifacts, and who confirmed each |
| validity | This record is valid only for the recorded host versions, configuration fingerprint, tools, and cases. After any host version, policy, or tool change, the affected cases revert to NOT VERIFIED until re-executed |

## Runbook (executed only after owner authorization)

1. Obtain written owner authorization for the named disposable host, scope, operators, and cleanup. Record it.
2. Record host OS, exact binary versions, sandbox mode, and the sanitized configuration fingerprint.
3. Independently establish the protected canary and its hash under operator control; record both canaries' resolved paths and ownership.
4. Run the positive control; verify the resulting synthetic file independently.
5. Run each negative control with its preapproved matched control; after each, independently verify source identity/hash and destination state.
6. On any unexpected success: stop immediately, preserve logs and state, and recover only within the preapproved test boundaries.
7. Fill the record from observed measurements only; plan text is never evidence.
8. Restore and recheck canaries, remove test-owned artifacts, store the record, and report the residual NOT VERIFIED surface.
