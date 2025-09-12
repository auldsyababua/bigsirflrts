# FLRTS Project Documentation Architecture & Agent System Overview

This document defines the canonical documentation architecture, agent roles, automated workflows, and CI/CD integration rules for the FLRTS (Field Reports, Lists, Reminders, Tasks, and Sub‑Tasks) system. The FLRTS platform integrates OpenProject, Supabase, Telegram, and n8n workflows and is developed using a research‑first, agent‑assisted methodology with automated documentation hygiene.

---

## Project Context

- FLRTS is a comprehensive field management platform comprising:
  - Field reports, lists, reminders, tasks, and sub‑tasks
  - Integrations with OpenProject, Supabase, Telegram, and n8n
- Development is driven by specialized agents with strict research and documentation standards.

---

## Documentation Architecture Standards

All documentation must be organized into the following locations. These locations are enforced for CI/CD and project hygiene.

### Standardized Locations (ENFORCE THESE)

- /docs/setup/
  - Installation, configuration, and environment setup guides.
- /docs/architecture/
  - ADRs (Architecture Decision Records), system design, and technical decisions.
- /docs/integrations/
  - Third‑party service setup (OpenProject, Supabase, n8n, etc.).
- /docs/processes/
  - Team workflows, development/deployment procedures, agent guidelines.
- /docs/archive/
  - Historical docs (outdated but preserved for audit). Do not delete—archive here.
- /tests/docs/
  - Testing strategies, test plans, coverage reports, and QA-related documentation.
- /scratch/
  - Temporary files. Must be deleted after use. Never commit long-term content here.

Recommended index structure:

```text
/docs/
  setup/
  architecture/
  integrations/
  processes/
  archive/
/tests/
  docs/
/scratch/
```

### Anti‑Patterns to Avoid

- ❌ Random setup files like OPENPROJECT-SETUP.md in project root
- ❌ Duplicate integration docs scattered throughout the project
- ❌ One‑off documentation without clear ownership
- ❌ Creating new docs instead of updating existing canonical ones

---

## Agent System Overview

### Development Agents

- James (Dev)
  - Implements stories.
  - MUST perform research using mcp__ref__ and mcp__exasearch__ before coding.
- John (PM)
  - Creates PRDs; validates technical feasibility with research.
- Quinn (QA)
  - Reviews code quality, creates QA gate files, triggers cleanup.
- Morgan (Cleanup)
  - Maintains project hygiene, consolidates documentation per standards.

### Automated Workflows

1. Story Implementation
   - Dev completes work and updates the story file with deviations and decisions.
2. QA Review
   - QA creates a gate file. If status is PASS/WAIVED → auto‑trigger cleanup.
3. Cleanup
   - Morgan consolidates docs into canonical locations → returns to QA for verification.
4. Completion
   - Clean, standardized project ready for the next development cycle.

---

## Key Principles for CI/CD Integration

### Research‑First Development

- Agents MUST use mcp__ref__ (documentation search) before implementing anything.
- Do not guess syntax, APIs, or configurations.
- Exa‑search must be used for debugging and best‑practices validation.

### Documentation Lifecycle

- UPDATE existing docs rather than creating new ones.
- CONSOLIDATE redundant information into canonical sources.
- ARCHIVE historical docs, do not delete them.
- STANDARDIZE locations according to this document.

### Quality Gates

- QA creates gate files in /docs/qa/gates/.
- Gate statuses: PASS | CONCERNS | FAIL | WAIVED.
- Successful gates (PASS or WAIVED) trigger automatic cleanup.
- All actions must be documented in story files.

---

## Story File Management

Story files are authoritative and must preserve auditability.

### Story Structure (DO NOT MODIFY THESE SECTIONS)

- Story description, acceptance criteria, dev notes
- Tasks/Subtasks (only mark [x] when complete)

### Agent‑Specific Sections (AGENTS UPDATE THESE)

- Dev Agent Record: Implementation status, deviations, technical decisions
- QA Results: Quality assessment, gate decisions, cleanup verification
- Change Log: Chronological development history

---

## Integration Points for CI/CD

### File Locations to Monitor

- Stories: /docs/stories/*.md
- Gate files: /docs/qa/gates/*.yml
- Architecture: /docs/architecture/*.md
- Setup guides: /docs/setup/*.md

### Automation Triggers

- Story status changes to "Ready for Review"
- QA gate files created with PASS status
- Documentation updates in standardized locations

### Quality Metrics

- Story completion rates
- Gate pass/fail ratios
- Documentation organization compliance
- Research protocol adherence

---

## Expected CI/CD Integration Behavior

1. Respect agent boundaries — do not modify story sections reserved for specific agents.
2. Follow documentation standards — consolidate instead of create.
3. Trigger cleanup — integrate with the automated hygiene system.
4. Preserve audit trails — maintain story file change logs.
5. Support research protocols — agents require access to MCP tools for proper implementation.

---

## Compliance Checklist (For PRs and CI)

- [ ] Documentation changes live under the correct standardized path
- [ ] Redundant or outdated docs have been consolidated or moved to /docs/archive/
- [ ] Story files updated in agent‑specific sections only
- [ ] QA gate written/updated under /docs/qa/gates/
- [ ] Research evidence (mcp__ref__ and exa‑search) linked or summarized in the story or PR notes

---

## Notes for Maintainers

- Prefer updating and consolidating existing documents over creating new ones.
- If a new document is essential, reference it from relevant existing indexes and story files.
- Archive, do not delete: move superseded content to /docs/archive/ with a short header explaining why it was archived and the link to the current canonical source.

This architecture prevents documentation sprawl, maintains clean project structure, and ensures future developers can easily understand and extend the FLRTS system.
