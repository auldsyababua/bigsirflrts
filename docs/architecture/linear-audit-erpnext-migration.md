# Linear Audit Report: ERPNext Migration Impact

**Date:** 2025-10-01  
**Related ADR:**
[ADR-006: ERPNext Backend Adoption](adr/ADR-006-erpnext-backend-adoption.md)  
**Migration Workflow:**
[erpnext-migration-workflow.md](erpnext-migration-workflow.md)

## Executive Summary

This audit identifies all Linear issues in the 10netzero organization that
require updates due to the architectural decision to replace OpenProject with
ERPNext as the FSM backend platform (ADR-006).

**Total Issues Audited:** 38 issues in BigSirFLRTS project  
**Issues Requiring Action:** 11 issues  
**Issues Already Updated:** 1 issue (10N-159)  
**New Epic Required:** Yes - ERPNext Backend Adoption

---

## 1. Issues to Close/Supersede

### 10N-159: OpenProject Schema Migration ✅ ALREADY UPDATED

- **Status:** In Progress → Should be Closed
- **Action:** Mark as "Closed - Superseded"
- **Reason:** OpenProject schema migration is no longer relevant. ERPNext
  adoption supersedes this work.
- **Current State:** Issue description already updated with supersession notice
  and links to ADR-006
- **Recommendation:** Change status from "In Progress" to "Closed" or
  "Cancelled"

**Related Module 2 Issues (All Completed - Archive Only):**

- 10N-219: OpenProject Sync Service improvements (Done)
- 10N-167: Hardcoded OpenProject project ID (Done)
- 10N-168: Retry/backoff/idempotency on OpenProject API (Done)
- 10N-169: Environment-coupled dictionary IDs (Done)
- 10N-170: Secret prefix logging (Done)
- 10N-171: API-only principle vs DB triggers (Done)

**Note:** These Module 2 issues are already marked "Done" and represent
completed work on the OpenProject integration. They should remain as historical
record but can be tagged with "superseded-by-erpnext" label.

---

## 2. Issues to Update (Change "OpenProject" to "ERPNext")

### 10N-155: Story 2.1: Telegram Task Creation (MVP)

- **Current Title:** "Story 2.1: Telegram Task Creation (MVP)"
- **Current Description:** References "OpenProject API" and creating tasks in
  OpenProject
- **Required Changes:**
  - Update description: Change "Tasks created in OpenProject via API" to "Tasks
    created in ERPNext via API"
  - Update acceptance criteria: "Telegram bot receives natural language messages
    and creates tasks in **ERPNext**"
  - Update technical requirements: "n8n workflow: Telegram Webhook → OpenAI →
    **ERPNext API** → Telegram Response"
  - Update related issues: "Depends on Story 3.1 (**ERPNext API**)"
- **Status:** Todo
- **Priority:** Urgent

### 10N-156: Story 2.5: Telegram Command Parser (Simplified for MVP)

- **Current Title:** "Story 2.5: Telegram Command Parser (Simplified for MVP)"
- **Current Description:** No direct OpenProject references (parser is
  backend-agnostic)
- **Required Changes:** None - This issue is about command parsing, not backend
  integration
- **Status:** Todo
- **Priority:** Urgent
- **Note:** No changes needed - command parser works with any backend

### 10N-157: Story 3.1: OpenProject API Workflows (MVP - CREATE Only)

- **Current Title:** "Story 3.1: OpenProject API Workflows (MVP - CREATE Only)"
- **New Title:** "Story 3.1: ERPNext API Workflows (MVP - CREATE Only)"
- **Required Changes:**
  - **Title:** Change "OpenProject" to "ERPNext"
  - **Overview:** Change "OpenProject REST API v3" to "ERPNext REST API"
  - **User Story:** Change "create tasks in OpenProject" to "create work orders
    in ERPNext"
  - **Technical Requirements:** Replace OpenProject endpoint with ERPNext
    endpoint:

    ```javascript
    // OLD: POST /api/v3/work_packages
    // NEW: POST /api/resource/Work Order
    ```

  - **Update code examples** to use ERPNext API format
  - **Update environment variables:**
    - `OPENPROJECT_BASE_URL` → `ERPNEXT_BASE_URL`
    - `OPENPROJECT_API_KEY` → `ERPNEXT_API_KEY`

- **Status:** Todo
- **Priority:** Urgent (Critical dependency)

### 10N-158: Story 3.2: OpenAI Context Injection (MVP - Hardcoded)

- **Current Title:** "Story 3.2: OpenAI Context Injection (MVP - Hardcoded)"
- **Current Description:** No direct OpenProject references (NLP parsing is
  backend-agnostic)
- **Required Changes:** None - This issue is about OpenAI parsing, not backend
  integration
- **Status:** Todo
- **Priority:** Urgent
- **Note:** No changes needed - OpenAI context injection works with any backend

---

## 3. New Epic to Create

### Epic: ERPNext Backend Adoption

**Title:** ERPNext Backend Adoption

**Description:**

```markdown
Replace OpenProject with ERPNext as FSM backend platform.

## Background

After investigating OpenProject schema migration (10N-159), discovered
OpenProject is not designed for field service operations. ERPNext provides
native FSM features, better extensibility, and same PostgreSQL/Supabase
compatibility.

## Related ADR

[ADR-006: ERPNext Backend Adoption](https://github.com/auldsyababua/bigsirflrts/blob/main/docs/architecture/adr/ADR-006-erpnext-backend-adoption.md)

## Migration Phases

### Phase 1: Research & Validation (1-2 weeks)

- Deploy ERPNext dev instance
- Connect ERPNext to Supabase PostgreSQL
- Test ERPNext FSM module features
- Validate ERPNext API integration (Telegram/n8n POCs)
- Create schema mapping document (FLRTS → ERPNext)

### Phase 2: Schema Migration Planning (1 week)

- Audit production data for migration
- Write data migration scripts
- Test migration on copy of production data

### Phase 3: Integration Code Updates (2 weeks)

- Update sync-service for ERPNext API
- Update Telegram bot for ERPNext integration
- Update n8n workflows for ERPNext webhooks
- Create ERPNext API client library

### Phase 4: Custom UI Development (3 weeks) [Optional]

- Design FLRTS dashboard UI
- Build site management views
- Build work order views
- Build contractor management views

### Phase 5: Production Deployment (1 week)

- Deploy ERPNext production instance
- Run production data migration
- Switch production traffic to ERPNext
- Deprecate OpenProject instance
- Monitor and optimize

## Success Criteria

- ERPNext deployed and integrated
- All FLRTS features working on ERPNext backend
- Telegram bot creates ERPNext work orders
- n8n workflows use ERPNext webhooks
- Custom dashboard (if built) uses ERPNext API
- Zero data loss during migration

## Timeline

**Total Estimated Time:** 8-12 weeks to full production

## Superseded Issues

- 10N-159: OpenProject Schema Migration
```

**Child Stories for Phase 1 (Research & Validation):**

1. **Deploy ERPNext dev instance**
   - Set up ERPNext using Docker on test environment
   - Configure FSM module
   - Create test data (sites, contractors, work orders)

2. **Connect ERPNext to Supabase PostgreSQL**
   - Configure ERPNext to use Supabase as database
   - Test connection and data persistence
   - Validate schema creation

3. **Test ERPNext FSM module features**
   - Test locations/sites management
   - Test suppliers/contractors tracking
   - Test work order creation and management
   - Test user roles and permissions

4. **Validate ERPNext API integration**
   - Create Telegram bot POC that creates ERPNext work orders
   - Create n8n workflow POC triggered by ERPNext webhooks
   - Measure API response times
   - Test authentication and error handling

5. **Create schema mapping document**
   - Map FLRTS tables to ERPNext DocTypes
   - Document data migration strategy
   - Identify gaps requiring custom DocTypes
   - Create data migration scripts (draft)

---

## 4. Issues That Reference OpenProject But Don't Need Changes

### Infrastructure Issues (Completed Work - Historical Record)

- **10N-164:** Default SECRET_KEY_BASE and admin password (Done) - Security fix
  for OpenProject deployment
- **10N-167:** Hardcoded OpenProject project ID (Done) - Fixed in Module 2
- **10N-168:** Retry/backoff/idempotency on OpenProject API (Done) - Fixed in
  Module 2
- **10N-169:** Environment-coupled dictionary IDs (Done) - Fixed in Module 2
- **10N-170:** Secret prefix logging (Done) - Fixed in Module 2
- **10N-171:** API-only principle vs DB triggers (Done) - Fixed in Module 2
- **10N-219:** OpenProject Sync Service improvements (Done) - Master issue for
  Module 2

**Reason:** These are completed issues documenting work done on OpenProject.
They serve as historical record and should not be modified. Consider adding
"superseded-by-erpnext" label for context.

### Deployment/Documentation Issues

- **10N-92:** Fix OpenProject schema migration issue (Duplicate) - Duplicate of
  10N-159
- **10N-94:** Import Story 1.1: Deploy OpenProject via Docker Compose (Done) -
  Historical deployment record
- **10N-102:** QA Gate PASS_WITH_CAVEAT: Story 1.1 (Done) - QA validation record
- **10N-111:** ADR-003: OpenProject Database Migration Pattern (Done) -
  Architecture decision record
- **10N-112:** ADR-004: Supabase Direct Connection (Done) - Architecture
  decision record
- **10N-147:** Epic 1.1: Deploy OpenProject via Docker Compose (Done) -
  Completed epic
- **10N-149:** Epic 1.3: n8n Production Deployment (Done) - n8n deployment
  (backend-agnostic)
- **10N-154:** QA Gate PASS: Story 1.9 - OpenProject Schema Migration
  (Backlog) - QA gate for superseded work

**Reason:** These are completed deployment and documentation issues. They
represent historical work and decisions. Should remain unchanged as historical
record.

---

## 5. Summary Statistics

### Issues by Action Required

| Action                             | Count | Issue IDs                                                                                                                           |
| ---------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Close/Supersede**                | 1     | 10N-159                                                                                                                             |
| **Update Description**             | 2     | 10N-155, 10N-157                                                                                                                    |
| **No Changes (Backend-Agnostic)**  | 2     | 10N-156, 10N-158                                                                                                                    |
| **No Changes (Historical Record)** | 13    | 10N-164, 10N-167, 10N-168, 10N-169, 10N-170, 10N-171, 10N-219, 10N-92, 10N-94, 10N-102, 10N-111, 10N-112, 10N-147, 10N-149, 10N-154 |
| **New Epic to Create**             | 1     | ERPNext Backend Adoption                                                                                                            |
| **New Stories to Create**          | 5     | Phase 1 research stories                                                                                                            |

### Total Impact

- **Total Issues Reviewed:** 38
- **Issues Requiring Updates:** 3 (10N-159, 10N-155, 10N-157)
- **Issues Already Updated:** 1 (10N-159 description updated, status needs
  change)
- **New Issues to Create:** 6 (1 epic + 5 Phase 1 stories)
- **Historical Issues (No Changes):** 15

---

## 6. Implementation Checklist

### Immediate Actions (This Week)

- [ ] **10N-159:** Change status from "In Progress" to "Closed" or "Cancelled"
- [ ] **10N-155:** Update description to reference ERPNext instead of
      OpenProject
- [ ] **10N-157:** Update title and description to reference ERPNext API
- [ ] **Create Epic:** ERPNext Backend Adoption (use description above)
- [ ] **Create 5 Phase 1 Stories:** Research & Validation tasks

### Phase 1 Preparation (Next Week)

- [ ] Get ADR-006 approved by Product Owner and Technical Lead
- [ ] Create `feature/erpnext-adoption` branch
- [ ] Commit ADR-006 and migration workflow to Git
- [ ] Begin ERPNext dev instance deployment

---

## 7. References

- [ADR-006: ERPNext Backend Adoption](adr/ADR-006-erpnext-backend-adoption.md)
- [ERPNext Migration Workflow](erpnext-migration-workflow.md)
- [Linear Project: BigSirFLRTS](https://linear.app/10netzero/project/bigsirflrts-9d089be4-a284-4879-9b67-f472abecf998)

---

**Audit Completed:** 2025-10-01  
**Next Review:** After Phase 1 completion (2 weeks)
