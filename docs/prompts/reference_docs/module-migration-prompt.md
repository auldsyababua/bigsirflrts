# ERPNext Module Development Prompt Template

**Status:** Active **Phase:** 1.4 **Agent:** Perplexity/WebSearch **Date Created:** 2025-10-01 **Last Updated:** 2025-10-02 **Related Linear:** 10N-231

## Purpose

Provide a reusable prompt/checklist for guiding agents or developers when building ERPNext modules or workflows for the FLRTS application on Frappe Cloud.

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

### Development Checklist

- [ ] Define ERPNext DocTypes or identify standard DocTypes to extend
- [ ] Implement custom fields and child tables as needed
- [ ] Configure ERPNext REST API authentication (API key/secret)
- [ ] Port validation and business rules using ERPNext server scripts or custom app code
- [ ] Update tests and seed data for ERPNext environment
- [ ] Document configuration changes in docs/erpnext/
- [ ] Flag follow-up Linear issues for deferred work

### Acceptance Criteria

- All ERPNext workflows tested end-to-end in dev environment
- Documentation updated (docs/erpnext/, README, runbooks, dashboards)
- Frappe Cloud deployment verified via Git push-to-deploy
- API integration tested with ERPNext REST endpoints

## Notes

Tailor the prompt per module; include screenshots or sample payloads when they help clarify edge cases. For ERPNext-specific patterns, see:

- [ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)
- [ADR-006: ERPNext Hosting Migration to Frappe Cloud](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
- [Frappe Cloud Deployment Guide](../deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
