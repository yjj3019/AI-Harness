# Local fixture baseline — 2026-11-02

This is a narrow observation, not execution of the full pilot in `docs/harness-evaluation-pilot.md`, a live-host authorization test, a model comparison, or a production security verdict. No external provider, real credentials, production database, deployment, or paid service was used. The ToolBroker test suite uses disposable SQLite state and authorized local loopback fixture servers; loopback is an explicit exception to the pilot's proposed default-deny network policy. No OS-level enforcement of the pilot's complete boundary was independently established.

| Scope / observation | Command | Result on Windows | Limit |
| --- | --- | --- | --- |
| ToolBroker fixture suite | `python -m unittest discover -s tests/toolbroker -p 'test_*.py' -v` | 25 tests passed, 0 failed, 0 skipped; 7.770 s | Includes loopback after-effect timeout/UNKNOWN, no automatic resend, and local approval denial. Does not certify live providers, native agent tools, network isolation, or exactly-once effects. |
| Synthetic summary parser suite | `node --test --test-reporter=tap tests/test-summary.test.js` | 27 tests passed, 0 failed, 0 skipped | Includes mixed passing/failing recognized summaries in either order, and an all-skipped pytest summary followed by a pass. Only these parser inputs were tested; fabricated TAP, silent unreported commands and completeness of external monitoring are outside the result. |

## Relation to the proposed scenarios

- **S13:** the loopback fixture establishes the named test's local provider-write/timeout ordering and durable UNKNOWN behavior, not end-to-end OS confinement or the full pilot's independently monitored negative assertions. Pilot verdict: **UNKNOWN**, pending pre-registration and the stated monitoring and authorization.
- **S15:** the parser tests cover selected synthetic mixed-summary cases in both orders and relevant passing/failing controls. They do not establish that every real runner emits an identifiable block or that reports cannot be forged. Full scenario verdict: **UNKNOWN**; parser regression result above is PASS for its specified test scope only.
- **S14/S16:** not executed as a separate pilot. Existing gate behavior distinguishes FAIL from UNKNOWN and legacy mode permits an unbound run; do not count those tests as satisfying the pilot's full scenario criteria without a reviewed mapping.

Counts above are test counts, not a paired baseline/candidate experiment. No model tokens, model costs, comparative speedup, task completion rate, or Graph benefit was measured. All future scenario executions require appropriate host enforcement, explicitly scoped authorization, independently reviewed evidence and separate result records.
