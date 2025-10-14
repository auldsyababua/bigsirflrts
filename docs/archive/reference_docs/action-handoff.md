# Action Agent Handoff Checklist (Reference)

Use this template when closing out an assignment. Keep the note concise but make
sure every item below is addressed before you ping the Planning Agent.

## Required Sections

- **Status**: Issue identifiers, branch, merge state, remaining tasks.
- **Validations**: Commands/tests run (`npm test`, `tsc --noEmit`, mock API
  calls, `./scripts/security-review.sh`), including key output snippets.
- **Documentation**: Links or paths for updated docs with function-level
  references (avoid raw line numbers).
- **Lessons Learned**: 3–5 bullets recorded in Linear (`Issue -> Impact -> Fix`)
  with `docs/.scratch/...` citations.
- **Follow-ups**: New Linear issues or TODOs (e.g., workflow naming standards,
  refactors) plus owners/priority.
- **Checks**: Confirmation that mandatory GitHub checks, especially
  `Claude AI Code Review`, completed successfully (include run IDs when
  helpful).

## Quick Reminders

1. Attach proof of API envelope validation (curl output or spec quotes) whenever
   HTTP clients change.
2. Summarize DocType research outcomes when ERPNext schema is touched (why
   alternatives were rejected).
3. Call out retry/timeout configuration (codes covered, base delay, max
   attempts) for network work.
4. State secret masking pattern used and reference the unit tests guarding it.
5. Confirm scratch directories were archived after moving validated work into
   production.

Keep this reference synchronized with prompts; update it whenever recurring
lessons shift so every agent handoff reinforces the latest standards.
