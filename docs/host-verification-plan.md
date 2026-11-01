# Host isolation verification plan (not executed)

This is a proposed manual test, not a sandbox, authorization, or evidence of host isolation. Existing Linux namespace smoke records and Windows fixture results are not tests of actual Claude Code or Codex host integration. Do not change host permissions, accounts, networking, sandbox policy, or contact external services merely by reading this plan.

## Prerequisites and approval

The owner must authorize a named disposable host/workspace, already effective policy, test scope, operators and cleanup; use no production paths, secrets, admin elevation, or customer data. Record OS, exact host binary versions, active sandbox mode, permission configuration fingerprint, and relevant tool availability. If the intended enforcement mode is absent, unavailable or unexpectedly falls back, stop and report NOT VERIFIED rather than silently downgrading. Preserve a protected synthetic canary outside the workspace and its hash under independent operator control, plus an allowed workspace canary. Document their resolved paths and ownership before testing.

Before negative tests, independently define exact resolved source and destination paths and operation payloads, all under disposable, sacrificial test-owned boundaries. For each operation, establish an approved matched control under the same test identity without the intended enforcement: the synthetic outside canary and destination must be accessible as applicable. If this cannot be done safely, mark the case INCONCLUSIVE; an unrelated OS ACL, unavailable tool or nonexistent destination is not proof of the tested sandbox. Restore and recheck canaries before enabling enforcement. Approval must cover successful escape and independent cleanup: stop immediately on an unexpected success, preserve logs and state, and recover only within the preapproved test boundaries.

## Matrix for each host and each exposed tool

- Positive control: permitted workspace read/write succeeds; independently verify resulting synthetic file.
- Negative control: independently attempt each preapproved read, write, rename and copy using explicitly identified sacrificial source and destination paths. Confirm each destination's expected pre-test state; independently verify post-test source identity/hash and destination state. A failed copy is not evidence that reads were blocked. Record observed read bytes privately or a safe comparison result; do not rely only on agent text.
- If within approved scope, try path traversal and junction/symlink escape with existing OS capabilities; otherwise mark NOT RUN. Test shell, native file tools, MCP and hooks separately where applicable: shell isolation does not establish protection of other tools.
- For approval-boundary testing, predefine a benign action on a sacrificial fixture, its expected denied state, an already-approved noninteractive no-approval mode, and independent before/after inspection. Never bypass an approval prompt. An actual action or unexpected prompt is not PASS; stop and record it. Repeat with sandbox unavailable only if a pre-approved safe configuration exists; ensure no silent unsafe fallback. Do not modify production policy to force this condition.
- Record exact command/tool and inputs, exit/decision, sanitized output, independently observed filesystem state, timing, operator, deviations, and cleanup. A failure to observe a denial or independently check state is INCONCLUSIVE or FAIL, never PASS.

Network/DNS/loopback access, external API calls, authenticated agent/model operations, and destructive actions require separate explicit authorization and an isolated endpoint or fixture. They are NOT RUN by this plan. A successful matrix is evidence only for the tested versions, configurations, tools and cases, not a general security certification.

## Vendor documentation and platform limits

Claude Code's [sandbox documentation](https://code.claude.com/docs/en/sandboxing) describes shell-only scope and states that native Windows shell commands do not use that sandbox; WSL2 support and file tools/MCP/hooks must be considered separately. [Codex Windows guidance](https://developers.openai.com/codex/windows.md) describes MXC and legacy modes with differing prerequisites and restrictions. Vendor documentation is not evidence that either host is currently installed, configured, active or enforced on this machine. Confirm actual version-specific behavior and permissions in the authorized test environment.
