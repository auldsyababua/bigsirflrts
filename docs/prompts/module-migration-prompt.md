# Module Migration Prompt Template

**Status:** Not Started **Phase:** 1.4 **Agent:** Perplexity/WebSearch **Date Created:** 2025-10-01 **Related Linear:** 10N-231

## Purpose

Provide a reusable prompt/checklist for guiding agents or developers when migrating an OpenProject module or workflow into ERPNext.

## Prerequisites

- [ ] Codebase audit (10N-231) complete with module inventory
- [ ] ERPNext API access verified
- [ ] Relevant source module identified in Git

## Template

### Module Overview

- Module name
- Repository or path
- Current business owner/SME

### Discovery Questions

1. What external services or APIs does the module depend on?
2. Which database tables, DocTypes, or models are touched?
3. What environment variables or secrets are required?
4. Are there background jobs, webhooks, or scheduled tasks?
5. What telemetry or logging is emitted today?

### Migration Checklist

- [ ] Map OpenProject entities to ERPNext DocTypes or custom fields
- [ ] Update API client calls and authentication
- [ ] Port validation and business rules (client + server)
- [ ] Update tests and seed data
- [ ] Document configuration changes
- [ ] Flag follow-up Linear issues for deferred work

### Acceptance Criteria

- All migrated flows tested end-to-end in dev
- Documentation updated (README, runbooks, dashboards)
- Rollback considerations captured if applicable

## Notes

Tailor the prompt per module; include screenshots or sample payloads when they help clarify edge cases.
