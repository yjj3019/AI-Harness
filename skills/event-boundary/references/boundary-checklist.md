# Event Boundary Checklist

## Routing
- Agent, cwd, and permissions come from rules
- Event payload does not override routing fields

## Data handling
- Only required fields extracted from the payload
- Raw text not interpolated into commands or paths

## Verification
- Side-effect actions re-check the source system
- Matched rule is recorded
