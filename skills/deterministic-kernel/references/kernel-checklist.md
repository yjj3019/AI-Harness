# Deterministic Kernel Checklist

## Decision
- All state changes go through decide
- Time, secrets, and environment are arguments
- No direct clock, random, or file reads inside decide

## Log
- Facts are append-only
- View can be rebuilt by replaying the log
- Sequence numbers are contiguous

## Boundary
- External events carry data only
- Agent, path, and permissions come from trusted rules
- Replay test or invariant check recorded
