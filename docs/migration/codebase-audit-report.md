# FLRTS Codebase Audit for ERPNext Migration

**Status:** Not Started **Phase:** 1.4 **Agent:** Claude (general-purpose)
**Date Created:** 2025-09-30 **Prerequisites:** Architecture docs reviewed,
naming standards read

## Audit Methodology

### 1. Architecture Document Review

**Documents Reviewed:**

- [ ] `docs/architecture/` - All architecture docs
- [ ] `docs/modules/` - Module specifications (if exists)
- [ ] `README.md` - Project overview

**Components Identified:**

<!-- Agent: List all components that touch OpenProject -->

### 2. Code Search Results

**OpenProject API References:**

```bash
# Command used:
rg "openproject" --type ts --type js -g '!node_modules' -n

# Results:
# Agent: Paste all findings with file:line references
```

**OpenProject Table References:**

```bash
# Command used:
rg "work_packages|projects" --type ts --type sql -g '!node_modules' -n

# Results:
# Agent: Paste findings
```

**OpenProject Config Variables:**

```bash
# Command used:
rg "OPENPROJECT" --type env --type yaml -n

# Results:
# Agent: Paste findings
```

### 3. Module-by-Module Analysis

## Module: sync-service

**Location:** `packages/sync-service/`

**OpenProject Dependencies:**

- File: `packages/sync-service/src/index.ts`
  - Lines: 45-67
  - What it does: Initializes OpenProject API client
  - Required change: Replace with ERPNextClient
  - Complexity: Medium
  - Estimated effort: 4 hours

- File: `packages/sync-service/src/config.ts`
  - Lines: 12-15
  - What it does: Loads OPENPROJECT\_\* env vars
  - Required change: Add ERPNEXT\_\* vars, keep old for rollback
  - Complexity: Low
  - Estimated effort: 30 minutes

**New Files Required:**

1. `packages/sync-service/src/erpnext-sync.ts`
   - Purpose: ERPNext-specific sync logic
   - Estimated lines: ~300
   - Estimated effort: 8 hours

**Dependencies to Update:**

- Remove: `@openproject/api-client` (if exists)
- Add: `@flrts/erpnext-client`

**Testing Impact:**

- Unit tests to update: <!-- List files -->
- Integration tests to update: <!-- List files -->
- New tests required: <!-- List test scenarios -->

## Module: telegram-bot

**Location:** `packages/telegram-bot/` or similar

**OpenProject Dependencies:**

<!-- Agent: Follow same pattern as above -->

**New Files Required:**

**Dependencies to Update:**

**Testing Impact:**

## Module: n8n-workflows

**Location:** n8n instance configuration

**OpenProject Dependencies:**

<!-- Agent: Document n8n workflows that use OpenProject -->

**Required Changes:**

<!-- Agent: List workflow changes needed -->

## Module: [Other Modules]

<!-- Agent: Continue for each module found -->

## Complete Change Inventory

### Files to Modify

| File Path                            | Lines | Change Type        | Complexity | Effort | Priority |
| ------------------------------------ | ----- | ------------------ | ---------- | ------ | -------- |
| `packages/sync-service/src/index.ts` | 45-67 | Replace API client | Medium     | 4h     | High     |

### Files to Create

| File Path                              | Purpose    | Lines (est) | Effort | Priority |
| -------------------------------------- | ---------- | ----------- | ------ | -------- |
| `packages/erpnext-client/src/index.ts` | API client | 500         | 16h    | Critical |

### Dependencies to Update

| Package                   | Current | New                     | Reason                  |
| ------------------------- | ------- | ----------------------- | ----------------------- |
| `@openproject/api-client` | Remove  | -                       | Replacing with ERPNext  |
| -                         | -       | `@flrts/erpnext-client` | New ERPNext integration |

### Environment Variables

**To Add:**

```bash
# ERPNext Configuration (see naming standards)
ERPNEXT_API_URL=https://erpnext-dev.10nz.tools
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=
USE_ERPNEXT=false
```

**To Keep (for rollback):**

```bash
# Keep OpenProject config during migration
OPENPROJECT_URL=https://ops.10nz.tools
OPENPROJECT_API_KEY=
```

**To Remove (after migration complete):**

```bash
# Remove after 30 days of ERPNext stability
OPENPROJECT_URL
OPENPROJECT_API_KEY
```

### Database Changes

**Tables to Create:**

```sql
-- Supabase cache tables (see naming standards)
CREATE TABLE erpnext_work_orders_cache (...);
CREATE TABLE erpnext_sync_log (...);
```

**Tables to Modify:**

<!-- List any schema changes needed -->

**Tables to Deprecate:**

<!-- List tables to remove after migration -->

## Risk Assessment

### High Risk Changes

1. **Change:** <!-- Description -->
   - **Risk:** <!-- What could go wrong -->
   - **Mitigation:** <!-- How to reduce risk -->
   - **Rollback:** <!-- How to undo -->

### Medium Risk Changes

### Low Risk Changes

## Migration Sequence

### Phase 1: Foundation (No breaking changes)

**Order of Operations:**

1. Create ERPNext API client (`packages/erpnext-client/`)
2. Add ERPNEXT\_\* env vars (with USE_ERPNEXT=false)
3. Create integration tests
4. Deploy with feature flag OFF

**Can Rollback:** Yes, easily

### Phase 2: Integration Updates (Feature flagged)

**Order of Operations:**

1. Update sync-service with dual-mode support
2. Update telegram-bot with dual-mode support
3. Update n8n workflows (create new, keep old)
4. Test with feature flag ON in dev
5. Monitor dev for 1 week

**Can Rollback:** Yes, flip feature flag

### Phase 3: Production Cutover

**Order of Operations:**

1. Final testing in dev
2. Backup production data
3. Deploy code to production (flag OFF)
4. Flip feature flag in production
5. Monitor closely
6. Remove OpenProject code after 30 days

**Can Rollback:** Yes, until old code removed

## Total Effort Estimate

| Category               | Hours  |
| ---------------------- | ------ |
| API Client Development | 16     |
| sync-service Migration | 12     |
| telegram-bot Migration | 8      |
| n8n Workflows          | 6      |
| Testing                | 12     |
| Documentation          | 6      |
| **Total**              | **60** |

**Timeline:** Approximately 2-3 weeks with 1 developer

## Dependencies & Blockers

**Must Complete Before Code Changes:**

- [ ] ERPNext dev instance deployed
- [ ] ERPNext schema understood (Phase 1.1)
- [ ] Custom DocTypes designed (Phase 2.1)
- [ ] Naming standards reviewed

**External Dependencies:**

- ERPNext API documentation
- Supabase branch for testing
- n8n instance access

## Agent Checklist

Before considering this audit complete:

- [ ] All modules reviewed
- [ ] All OpenProject references found and documented
- [ ] Change inventory complete with effort estimates
- [ ] Risk assessment complete
- [ ] Migration sequence defined
- [ ] All findings follow naming standards
- [ ] Migration prompt template created (see below)

## Next Steps

1. Create migration prompt template (`docs/prompts/module-migration-prompt.md`)
2. Review findings with user
3. Create Linear stories for each module migration
4. Proceed to Phase 1.5 (ERPNext deployment)
