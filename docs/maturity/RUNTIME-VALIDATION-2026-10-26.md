# Linux namespace and Phase recovery execution proof

Verified scope: **OS subprocess isolation + controlled manual recovery from a killed test worker.** This is NOT a live Claude Code/Codex sandbox or automatic agent recovery certification.

## Isolation (Linux only)

`bash tests/runtime-isolation-linux.sh` builds a temporary chroot in private mount and network namespaces, attempts to make system library binds read-only and binds one scratch work directory. It is a bounded smoke test, not certification of all nested mounts or a production host policy. It asserts:

- A permitted workspace write succeeds.
- A host-protected canary is invisible and remains unmodified; a link toward the host path cannot escape.
- The system-library bind subtree is checked for read-only mount flags; this does not prove every filesystem write path is blocked.
- The chosen direct IPv4 socket connection reports no route (ENETUNREACH/EHOSTUNREACH). No matched outside-namespace connectivity control is performed, so this alone does not establish that the namespace caused the denial.
- When namespace creation is prohibited, execution fails closed with ISOLATION_BLOCKED, rather than falling back to an unisolated shell.

It uses a sanitized subprocess environment and no third-party packages. An unprivileged namespace is preferred; the GitHub Linux runner can use sudo to create namespaces if supported. The script is a **smoke test**. It does not prove protection against a compromised privileged host, user namespace/kernel exploits, side-channel leakage, or the Claude Code sandbox configuration.

## Forced termination and controlled resumption

`tests/runtime-recovery.test.js` creates a throwaway Git repository, records coding evidence, and starts the real phase-gate with a test worker that writes a local marker and requests its own forceful termination. The parent observes a nonzero exit; the exact termination status is platform-dependent.

Acceptance conditions:

1. The parent phase gate records FAIL, retaining its actual process exit failure.
2. `phase-gate check` refuses completion and does not automatically rerun an uncertain side effect.
3. A distinct, explicitly invoked process runs a real Node TAP test, records independent step evidence, and passes the Phase check.
4. `attest` plus `verify-attestation` succeeds; the marker remains at one attempt rather than incrementing.

**Boundaries:** this is **manual recovery**, not a durable task queue. The idempotency marker is an isolated fixture, not guaranteed exactly-once semantics for payments, messages, GitHub, production databases, or plugins. The fixture runs on Windows as well as POSIX hosts, but worker self-termination does not verify external kill semantics, POSIX signal behavior on Windows, immediate process-tree cleanup, host reboot, or forcibly killing the orchestrator.

## What is not validated

- Claude Code or Codex model processes, subscriptions, credentials, and their actual sandbox policies.
- Broker-side permissions, remote write approval, or production process containment.
- Persistence through host reboot, failed external side effects, lease/fencing, or automated restart.
- Full adversarial security review of privilege escalation and filesystem race conditions.

Successful CI should be reported only as the specific tests it ran. Never promote this proof directly to a full S03, S04, S08, or S09 production-ready PASS in the maturity scorecard.

## Evidence

Run this code only against ephemeral fixtures. Every test generates and deletes its own directories. The isolated smoke test was executed in a separate Linux container during development with observed outputs `DENIED_READ_ONLY 30`, `NET_ERRNO 101`, `SANDBOX_CHECK_PASS`, and `HOST_POST_CHECK_PASS`. The GitHub Actions proof must be recorded for the exact PR head before merging.
