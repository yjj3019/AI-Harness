# PHASES.md - Phase Breakdown & Checklists

Define incremental development phases with explicit completion criteria.

**Requirements for every Phase**:
- Each Phase must be independently executable and human-testable.
- A person should be able to run the result of the Phase and confirm the checklist without relying on Agent self-report.
- Completion criteria must be observable (artifacts, logs, UI state, test output).

## Template

### Phase N: [Title]

**Goal**: Clear, minimal objective for this phase.

**Checklist**:
- [ ] Requirement A implemented
- [ ] Requirement B verified via objective tool
- [ ] No out-of-scope changes

**Completion Criteria**: All checklist items PASS via verify agent (evidence required).

---

## Example: API Log Analyzer

### Phase 1: UI Scaffolding
- [ ] Basic layout rendered
- [ ] No functional logic

### Phase 2: Log Ingestion
- [ ] Accept log URL
- [ ] Download and display sample

(Add subsequent phases as needed.)
