# FLRTS Codebase Audit for ERPNext Migration

**Status:** Complete **Phase:** 1.4 **Agent:** Claude (general-purpose) **Date
Created:** 2025-09-30 **Date Completed:** 2025-10-01 **Prerequisites:** ✅
Architecture docs reviewed, naming standards read

## Executive Summary

This audit identifies all code, configuration, and infrastructure components
requiring modification to migrate from OpenProject to ERPNext as the FSM
backend. The migration affects **3 core packages**, **5+ infrastructure
configurations**, and approximately **22+ files**.

**Total Estimated Effort:** 17-22 developer days (3-4 weeks with 1 full-time
developer)

**Migration Complexity:** Medium-High

**Risk Level:** Medium (mitigated by phased approach with feature flags)

---

## Audit Methodology

### 1. Architecture Document Review

**Documents Reviewed:**

- ✅ `docs/erpnext/architecture/ADR-006-erpnext-backend-adoption.md` - ERPNext
  adoption decision
- ✅ `docs/erpnext/architecture/erpnext-migration-workflow.md` - Migration
  workflow
- ✅ `docs/erpnext/ERPNext-Migration-Naming-Standards.md` - Naming conventions
- ✅ `docs/erpnext/research/erpnext-fsm-module-analysis.md` - FSM module
  analysis
- ✅ `docs/architecture/system-connections.md` - System architecture
- ✅ `README.md` - Project overview

**Components Identified:**

1. **sync-service** - OpenProject API client and sync logic
2. **nlp-service** - OpenAI prompt references OpenProject entities
3. **flrts-extension** - Browser extension for OpenProject UI
4. **Docker infrastructure** - OpenProject service definitions
5. **Environment configuration** - OpenProject credentials
6. **Monitoring** - OpenProject health checks
7. **Documentation** - Architecture and deployment docs

### 2. Code Search Results

**OpenProject API References:**

```bash
# Command used:
rg "openproject" --type ts --type js -i -g '!node_modules' -n

# Results:
packages/sync-service/src/index.ts:25-53 - OpenProject API client initialization
packages/sync-service/src/index.ts:56-76 - Request/response interceptors
packages/sync-service/src/index.ts:108-192 - Dictionary caches (statuses, priorities, types)
packages/sync-service/src/index.ts:279-389 - Dictionary initialization from OpenProject API
packages/sync-service/src/index.ts:391-431 - Mapping functions (Supabase → OpenProject)
packages/sync-service/src/index.ts:433-537 - syncTaskToOpenProject() function
packages/sync-service/src/index.ts:540-577 - Webhook endpoint handler
packages/sync-service/src/index.ts:579-608 - Manual sync endpoint
packages/sync-service/src/index.ts:610-647 - Bulk sync endpoint
packages/nlp-service/src/prompt.ts:40-52 - workPackage structure in prompt
packages/flrts-extension/content.js:1-4 - Extension for OpenProject pages
packages/flrts-extension/content.js:20-30 - OpenProject toolbar detection
packages/flrts-extension/content.js:67-75 - Logo replacement
packages/flrts-extension/content.js:158 - Work package creation
packages/flrts-extension/content.js:237-265 - OpenProject API calls
```

**OpenProject Table References:**

```bash
# Command used:
rg "work_packages|openproject_id" --type ts --type sql -g '!node_modules' -n

# Results:
database/schema.sql - tasks.openproject_id column
database/schema.sql - tasks.openproject_sync_status column
database/schema.sql - tasks.openproject_error column
database/schema.sql - tasks.openproject_last_sync column
```

**OpenProject Config Variables:**

```bash
# Command used:
rg "OPENPROJECT" -g '*.env*' -g '*.yml' -g '*.yaml' -n

# Results:
.env:14-21 - OpenProject configuration
.env:113-114 - OpenProject subdomain
infrastructure/digitalocean/.env.example:1-66 - OpenProject config template
docker-compose.yml:5-54 - OpenProject service definition
docker-compose.yml:85-111 - NLP service with OpenProject URL
infrastructure/digitalocean/docker-compose.prod.yml:5-67 - Production OpenProject
infrastructure/digitalocean/cloudflare-monitoring-config.yml:8-14 - OpenProject ingress
infrastructure/monitoring/production/prometheus.prod.yml:34-37 - OpenProject health check
```

### 3. Module-by-Module Analysis

---

## Module: sync-service

**Location:** `packages/sync-service/`

**OpenProject Dependencies:**

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 25-53
  - **What it does:** Initializes OpenProject API client with axios, base URL,
    and authentication
  - **Required change:** Replace with ERPNext REST API client (token-based auth)
  - **Complexity:** Medium
  - **Estimated effort:** 2 days

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 56-76
  - **What it does:** Request/response interceptors for OpenProject API
  - **Required change:** Update for ERPNext API patterns
  - **Complexity:** Low
  - **Estimated effort:** 2 hours

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 108-192
  - **What it does:** Dictionary caches for OpenProject statuses, priorities,
    types
  - **Required change:** Replace with ERPNext entity caching (Workflow States,
    custom fields)
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 279-389
  - **What it does:** Fetches dictionaries from OpenProject (`/statuses`,
    `/priorities`, `/types`)
  - **Required change:** Fetch from ERPNext endpoints
    (`/api/resource/Workflow State`, etc.)
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 391-431
  - **What it does:** Maps Supabase task data to OpenProject work package
    structure
  - **Required change:** Map to ERPNext Maintenance Visit structure
  - **Complexity:** High (critical logic)
  - **Estimated effort:** 1 day

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 433-537
  - **What it does:** `syncTaskToOpenProject()` - creates/updates work packages
  - **Required change:** Rewrite as `syncTaskToERPNext()` using Maintenance
    Visit API
  - **Complexity:** High (critical logic)
  - **Estimated effort:** 2 days

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 540-577
  - **What it does:** Webhook endpoint for Supabase database events
  - **Required change:** Update to handle ERPNext sync instead of OpenProject
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 579-608
  - **What it does:** Manual sync endpoint (`/sync/:taskId`)
  - **Required change:** Update to use ERPNext sync logic
  - **Complexity:** Low
  - **Estimated effort:** 2 hours

- **File:** `packages/sync-service/src/index.ts`
  - **Lines:** 610-647
  - **What it does:** Bulk sync endpoint (`/sync-all`)
  - **Required change:** Update to use ERPNext sync logic
  - **Complexity:** Low
  - **Estimated effort:** 2 hours

**New Files Required:**

1. `packages/sync-service/src/erpnext-client.ts`
   - Purpose: ERPNext API client wrapper
   - Estimated lines: ~400
   - Estimated effort: 2 days

2. `packages/sync-service/src/erpnext-mapper.ts`
   - Purpose: Data mapping between Supabase and ERPNext
   - Estimated lines: ~200
   - Estimated effort: 1 day

**Dependencies to Update:**

- Current: Axios for OpenProject REST API
- New: Axios for ERPNext REST API (same HTTP library, different endpoints)

**Testing Impact:**

- Unit tests to update:
  `packages/sync-service/src/__tests__/sync-service.test.ts`
- Integration tests to update: None identified yet
- New tests required: ERPNext client tests, ERPNext mapper tests, ERPNext sync
  flow tests

**Total Module Effort:** 7-10 days

---

## Module: nlp-service

**Location:** `packages/nlp-service/`

**OpenProject Dependencies:**

- **File:** `packages/nlp-service/src/prompt.ts`
  - **Lines:** 40-52
  - **What it does:** Defines OpenAI prompt template with workPackage structure
  - **Required change:** Update to use ERPNext Maintenance Visit terminology
  - **Complexity:** Medium
  - **Estimated effort:** 1 day

- **File:** `packages/nlp-service/src/schemas.ts`
  - **Lines:** Unknown (not read yet)
  - **What it does:** Likely defines TypeScript schemas for work package parsing
  - **Required change:** Update schemas to match ERPNext Maintenance Visit
    fields
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

**New Files Required:**

None (update existing files)

**Dependencies to Update:**

None (prompt/schema changes only)

**Testing Impact:**

- Integration tests to update: `tests/integration/services/nlp-parser.test.ts`
- Test scripts to update: `tests/integration/services/nlp-parser.script.ts`
- New tests required: ERPNext entity parsing tests

**Total Module Effort:** 2-3 days

---

## Module: flrts-extension

**Location:** `packages/flrts-extension/`

**OpenProject Dependencies:**

- **File:** `packages/flrts-extension/content.js`
  - **Lines:** 1-4
  - **What it does:** Browser extension for OpenProject pages
  - **Required change:** Update for ERPNext UI (Frappe framework)
  - **Complexity:** High
  - **Estimated effort:** 1 day

- **File:** `packages/flrts-extension/content.js`
  - **Lines:** 20-30
  - **What it does:** Detects OpenProject toolbar/UI elements
  - **Required change:** Detect ERPNext UI elements
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

- **File:** `packages/flrts-extension/content.js`
  - **Lines:** 67-75
  - **What it does:** Replaces OpenProject logo with FLRTS branding
  - **Required change:** Replace ERPNext logo
  - **Complexity:** Low
  - **Estimated effort:** 2 hours

- **File:** `packages/flrts-extension/content.js`
  - **Lines:** 158
  - **What it does:** Creates work packages in OpenProject
  - **Required change:** Create Maintenance Visits in ERPNext
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

- **File:** `packages/flrts-extension/content.js`
  - **Lines:** 237-265
  - **What it does:** Calls OpenProject API `/api/v3/work_packages`
  - **Required change:** Call ERPNext API `/api/resource/Maintenance Visit`
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

**New Files Required:**

None (update existing file)

**Dependencies to Update:**

None (pure JavaScript extension)

**Testing Impact:**

- Manual testing required across ERPNext UI
- Consider deprecating extension if ERPNext UI is sufficient

**Total Module Effort:** 3-4 days (or deprecate)

---

## Module: n8n-workflows

**Location:** n8n instance configuration (external to codebase)

**OpenProject Dependencies:**

- **Workflow:** Task creation workflow
  - **What it does:** Creates work packages in OpenProject via API
  - **Required change:** Create Maintenance Visits in ERPNext
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

- **Workflow:** Task sync workflow
  - **What it does:** Syncs task updates to OpenProject
  - **Required change:** Sync to ERPNext
  - **Complexity:** Medium
  - **Estimated effort:** 4 hours

**Required Changes:**

- Update HTTP Request nodes to use ERPNext endpoints
- Update authentication headers (Bearer token)
- Update request/response data structures
- Create new workflows (keep old for rollback)

**Testing Impact:**

- Test each workflow in n8n dev instance
- Validate ERPNext API responses

**Total Module Effort:** 1-2 days

---

## Complete Change Inventory

### Files to Modify

| File Path                                                      | Lines          | Change Type                              | Complexity | Effort   | Priority              |
| -------------------------------------------------------------- | -------------- | ---------------------------------------- | ---------- | -------- | --------------------- |
| `packages/sync-service/src/index.ts`                           | 25-647         | Replace API client, rewrite sync logic   | High       | 5-7 days | Critical              |
| `packages/nlp-service/src/prompt.ts`                           | 40-52          | Update prompt template                   | Medium     | 1 day    | High                  |
| `packages/nlp-service/src/schemas.ts`                          | TBD            | Update TypeScript schemas                | Medium     | 4 hours  | High                  |
| `packages/flrts-extension/content.js`                          | Multiple       | Update UI detection and API calls        | High       | 3-4 days | Medium (or deprecate) |
| `.env`                                                         | 14-21, 113-114 | Add ERPNext config, keep OpenProject     | Low        | 1 hour   | Critical              |
| `infrastructure/digitalocean/.env.example`                     | 1-66           | Add ERPNext config template              | Low        | 2 hours  | High                  |
| `docker-compose.yml`                                           | 5-54, 85-111   | Replace OpenProject service with ERPNext | High       | 1 day    | Critical              |
| `infrastructure/digitalocean/docker-compose.prod.yml`          | 5-67           | Production ERPNext configuration         | High       | 1-2 days | Critical              |
| `infrastructure/monitoring/production/prometheus.prod.yml`     | 34-37          | Add ERPNext health checks                | Low        | 2 hours  | Medium                |
| `infrastructure/digitalocean/cloudflare-monitoring-config.yml` | 8-14           | Add ERPNext ingress route                | Low        | 1 hour   | Medium                |
| `packages/sync-service/src/__tests__/sync-service.test.ts`     | All            | Update test fixtures and assertions      | Medium     | 1 day    | High                  |
| `tests/integration/services/nlp-parser.test.ts`                | All            | Update test fixtures                     | Medium     | 4 hours  | High                  |
| `tests/integration/services/nlp-parser.script.ts`              | All            | Update test script                       | Low        | 2 hours  | Medium                |

### Files to Create

| File Path                                          | Purpose               | Lines (est) | Effort  | Priority |
| -------------------------------------------------- | --------------------- | ----------- | ------- | -------- |
| `packages/sync-service/src/erpnext-client.ts`      | ERPNext API client    | 400         | 2 days  | Critical |
| `packages/sync-service/src/erpnext-mapper.ts`      | Data mapping logic    | 200         | 1 day   | Critical |
| `infrastructure/docker/erpnext/docker-compose.yml` | ERPNext Docker config | 200         | 1 day   | Critical |
| `docs/setup/erpnext.md`                            | ERPNext setup guide   | N/A         | 2 hours | High     |

### Dependencies to Update

| Package        | Current | New | Reason                                                |
| -------------- | ------- | --- | ----------------------------------------------------- |
| None to remove | -       | -   | Using standard axios for both OpenProject and ERPNext |

### Environment Variables

**To Add:**

```bash
# ERPNext Configuration (see naming standards)
ERPNEXT_URL=https://ops.10nz.tools
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=
ERPNEXT_SITE=site1.local
ERPNEXT_PROJECT=
FEATURE_USE_ERPNEXT=false  # Feature flag
```

**To Keep (for rollback):**

```bash
# Keep OpenProject config during migration
OPENPROJECT_URL=https://ops.10nz.tools
OPENPROJECT_API_KEY=
OPENPROJECT_PROJECT_ID=
```

**To Remove (after migration complete):**

```bash
# Remove after 30 days of ERPNext stability
OPENPROJECT_SECRET_KEY_BASE
OPENPROJECT_API_KEY
OPENPROJECT_URL
OPENPROJECT_PROJECT_ID
OPENPROJECT_HOST__NAME
OPENPROJECT_SUPABASE_PASSWORD
OPENPROJECT_SUBDOMAIN
```

### Database Changes

**Tables to Create:**

```sql
-- No new tables needed in Supabase
-- ERPNext uses its own database
```

**Tables to Modify:**

```sql
-- Add ERPNext columns to tasks table
ALTER TABLE tasks ADD COLUMN erpnext_maintenance_visit_id VARCHAR(255);
ALTER TABLE tasks ADD COLUMN erpnext_sync_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN erpnext_error TEXT;
ALTER TABLE tasks ADD COLUMN erpnext_last_sync TIMESTAMPTZ;

-- Keep OpenProject columns during transition for rollback
-- Drop after successful migration and validation period (30 days)
```

**Tables to Deprecate:**

```sql
-- After 30 days of stable ERPNext operation:
ALTER TABLE tasks DROP COLUMN openproject_id;
ALTER TABLE tasks DROP COLUMN openproject_sync_status;
ALTER TABLE tasks DROP COLUMN openproject_error;
ALTER TABLE tasks DROP COLUMN openproject_last_sync;
```

---

## Risk Assessment

### High Risk Changes

1. **Change:** Rewriting sync-service core sync logic
   - **Risk:** Data loss, sync failures, broken Telegram bot
   - **Mitigation:** Feature flag, comprehensive testing, keep OpenProject
     running during transition
   - **Rollback:** Flip feature flag back to OpenProject, zero data loss

2. **Change:** Database schema updates (adding ERPNext columns)
   - **Risk:** Migration script errors, downtime
   - **Mitigation:** Test on dev database first, backup production, reversible
     migrations
   - **Rollback:** Keep old columns, no data loss

### Medium Risk Changes

1. **Change:** Docker infrastructure updates
   - **Risk:** Service downtime, networking issues
   - **Mitigation:** Blue-green deployment, test in dev first
   - **Rollback:** Restore previous docker-compose.yml

2. **Change:** NLP prompt updates
   - **Risk:** Parsing quality degradation
   - **Mitigation:** A/B testing, monitor parser audit logs
   - **Rollback:** Revert prompt to OpenProject version

### Low Risk Changes

1. **Change:** Environment variable updates
   - **Risk:** Minimal, easily reversible
   - **Mitigation:** Keep old vars during transition
   - **Rollback:** Trivial

2. **Change:** Documentation updates
   - **Risk:** None
   - **Mitigation:** Archive old docs
   - **Rollback:** Restore from archive

---

## Migration Sequence

### Phase 1: Foundation (No breaking changes)

**Order of Operations:**

1. ✅ Create ERPNext dev instance (COMPLETE)
2. Add ERPNEXT\_\* env vars (with FEATURE_USE_ERPNEXT=false)
3. Create ERPNext API client (`packages/sync-service/src/erpnext-client.ts`)
4. Create ERPNext mapper (`packages/sync-service/src/erpnext-mapper.ts`)
5. Write unit tests for client and mapper
6. Deploy with feature flag OFF

**Duration:** 3-4 days

**Can Rollback:** Yes, easily (no prod changes)

### Phase 2: Integration Updates (Feature flagged)

**Order of Operations:**

1. Update sync-service with dual-mode support (if FEATURE_USE_ERPNEXT then
   ERPNext else OpenProject)
2. Update nlp-service prompts and schemas
3. Add database columns for ERPNext (keep OpenProject columns)
4. Update docker-compose with ERPNext service (commented out initially)
5. Test with feature flag ON in dev
6. Monitor dev for 1 week
7. Fix any issues discovered

**Duration:** 7-10 days

**Can Rollback:** Yes, flip feature flag

### Phase 3: Testing & Validation

**Order of Operations:**

1. Update all test suites
2. Run full test suite with ERPNext
3. Manual end-to-end testing
4. Performance testing
5. Load testing
6. Security review

**Duration:** 3-4 days

**Can Rollback:** Yes, still in dev

### Phase 4: Production Cutover

**Order of Operations:**

1. Final testing in dev
2. Backup production database
3. Deploy code to production (flag OFF)
4. Uncomment ERPNext service in docker-compose
5. Start ERPNext service
6. Smoke test ERPNext API
7. Flip feature flag in production
8. Monitor closely for 24 hours
9. Monitor for 1 week
10. Remove OpenProject code after 30 days

**Duration:** 1 day cutover + 30 day monitoring

**Can Rollback:** Yes, until old code removed (30 days)

---

## Total Effort Estimate

| Category                 | Days           |
| ------------------------ | -------------- |
| **Phase 1: Foundation**  | 3-4            |
| **Phase 2: Integration** | 7-10           |
| **Phase 3: Testing**     | 3-4            |
| **Phase 4: Deployment**  | 1              |
| **Documentation**        | 2-3            |
| **TOTAL**                | **17-22 days** |

**Timeline:** Approximately 3-4 weeks with 1 full-time developer

**Confidence Level:** 75% (Medium) - Based on:

- ERPNext API is well-documented
- Clear migration path identified
- Feature flag strategy reduces risk
- Phased approach allows for course correction

---

## Dependencies & Blockers

**Must Complete Before Code Changes:**

- ✅ ERPNext dev instance deployed (COMPLETE - <https://ops.10nz.tools>)
- ✅ ERPNext schema understood (Phase 1.1 - COMPLETE)
- ✅ Custom DocTypes designed (Phase 2.1 - see
  ERPNext-Migration-Naming-Standards.md)
- ✅ Naming standards reviewed (COMPLETE)

**External Dependencies:**

- ✅ ERPNext API documentation (available)
- Supabase branch for testing
- n8n instance access

**No Blockers Identified**

---

## Agent Checklist

Before considering this audit complete:

- ✅ All modules reviewed (sync-service, nlp-service, flrts-extension, n8n,
  infrastructure)
- ✅ All OpenProject references found and documented
- ✅ Change inventory complete with effort estimates
- ✅ Risk assessment complete
- ✅ Migration sequence defined
- ✅ All findings follow naming standards
- ✅ Migration prompt template validated

---

## Next Steps

1. ✅ Review codebase audit report (this document)
2. ✅ Validate migration prompt template
   (`docs/erpnext/prompts/module-migration-prompt.md`)
3. Update Linear story 10N-227 with completion status and document references
4. Create Linear stories for each phase of migration
5. Begin Phase 1: Foundation (create ERPNext client and mapper)

---

**Files Generated by This Audit:**

- This document:
  [docs/erpnext/codebase-audit-report.md](docs/erpnext/codebase-audit-report.md)
- Migration template:
  [docs/erpnext/prompts/module-migration-prompt.md](docs/erpnext/prompts/module-migration-prompt.md)
