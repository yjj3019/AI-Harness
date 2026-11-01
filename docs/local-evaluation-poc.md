# Local evaluation and mutation PoC

These optional tools use Node built-ins and do not call external models or install StrykerJS. They do not modify a phase gate or prove model quality, authorization, security, or a complete test suite. GitHub CI is a separate, currently unresolved concern.

## Blind review packet

See `docs/report-editing-evaluation.md` for input shape, usage, confidentiality, provenance and the seed limitation. The packet is a preparation aid only. Independently collect actual authorized outputs, review manually, and keep output, packet, mapping, rubric, condition, budget and verdict evidence. Missing outputs or compromised blinding are inconclusive. Never treat examples or self-reported actions as execution evidence.

## Fixed test-summary mutation probe

Run manually from the repository root:

```sh
node scripts/mutation-probe.js
```

The probe first runs an unmodified copy of `tests/test-summary.test.js`, then runs separate copies of three fixed mutations in `.claude/workflows/test-summary.js`: accepting zero/all-skipped, incomplete counts, and ignoring a bad summary block. It compares copied and original hashes and removes its temporary directory. A nonzero exit means a baseline/runner error or a surviving mutant; distinguish JSON classifications `killed`, `survived`, and `error`. A kill requires a Node TAP assertion failure, not just a nonzero exit. The classifier expects flat TAP: nested subtest failures can be reported conservatively as `error` instead of `killed`. The probe uses the current test file, not a trusted inventory of test quality; forged TAP, incidental assertions and shared environmental faults are possible. Timeout is applied to the spawned process, not guaranteed descendant cleanup. Disposable directories are not a security sandbox; use only trusted local tests.

This is a small, deterministic manual alternative for evaluating whether a larger StrykerJS experiment is justified; it does not run StrykerJS and has no CI integration. It covers only three parser mutations, not the tree-comparison, command-identity, or chain-validation branches of `phase-gate.js`. A broader PoC needs isolated copies, explicit baseline and valid mutant classification; do not infer protection of those branches from this result.
