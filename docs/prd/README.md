# FLRTS Product Requirements Document (PRD)

## Document Structure

This PRD is organized into modular sections for better maintainability and
review:

### 📋 [PRD Overview](./prd-overview.md)

- Goals and Background Context
- Functional Requirements (FR1-FR15)
- Non-Functional Requirements (NFR1-NFR10)
- Change Log

### 🎨 [UI & Technical Design](./prd-ui-technical.md)

- User Interface Design Goals
- Core Screens and Interaction Paradigms
- Technical Architecture Assumptions
- Repository and Service Structure

### 📚 [Epics and User Stories](./prd-epics.md)

- Epic List (4 major deliverables)
- Detailed User Stories with Acceptance Criteria
- Story Sequencing and Dependencies
- AI Agent-Sized Work Units

### ✅ [Completion and Next Steps](./prd-completion.md)

- PRD Checklist Results
- Risk Assessment
- Next Steps for UX and Architecture
- Success Metrics and Timeline

## Quick Summary

**Product**: FLRTS (Fast Low-friction Repeatable Task System) **Purpose**:
Natural language task management layer for ERPNext FSM **Key Innovation**:
Conversational task creation with automatic timezone handling **Target Users**:
Distributed bitcoin mining operations team **Timeline**: 12-week MVP across 4
epics **Tech Stack**: TypeScript, OpenAI GPT-4o, ERPNext REST API, Frappe Cloud

## Key Decision: ERPNext on Frappe Cloud (Target Architecture)

This PRD describes the **target architecture** using **ERPNext Field Service
Management** (hosted on Frappe Cloud). **Migration status: Phase 1 complete**
(config layer, stub client), **Phase 2 pending** (live API integration).
OpenProject remains the default and functional backend.

Target ERPNext benefits:

- Industry-standard FSM workflows (service calls, maintenance, installations)
- Custom DocTypes for mining-specific metadata
- Managed MariaDB, Redis, and background workers
- Mature REST API and webhooks
- Git-based deployment for custom apps (flrts_extensions)

See [ADR-006](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md) for
migration roadmap and 10N-243 for Phase 1 completion details.

## Reading Order for Stakeholders

1. **Executives**: Start with [PRD Overview](./prd-overview.md) Goals section
2. **Technical Team**: Review [UI & Technical Design](./prd-ui-technical.md)
   Technical Assumptions
3. **Project Managers**: Focus on [Epics and User Stories](./prd-epics.md)
4. **QA Team**: Reference acceptance criteria in
   [Epics and User Stories](./prd-epics.md)
5. **UX Designers**: Begin with [UI & Technical Design](./prd-ui-technical.md)
   UI Goals

## Version Control

| Version | Date       | Changes                            | Author        |
| ------- | ---------- | ---------------------------------- | ------------- |
| 1.0     | 2025-01-05 | Initial PRD creation               | Product Owner |
| 1.1     | 2025-01-05 | Updated to OpenProject from tududi | Product Owner |

## Contact

For questions or clarifications about this PRD, please reference the
[Next Steps](./prd-completion.md) section for stakeholder actions.
