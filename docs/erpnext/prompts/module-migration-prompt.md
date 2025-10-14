# Module Migration Prompt Template

**Status:** Not Started **Phase:** Phase 1.4 **Related Linear:**
[10N-231](https://linear.app/10netzero/issue/10N-231) **Date Created:**
2025-10-01

## Purpose

Standardized template prompt for migrating individual modules from OpenProject
to ERPNext. Use this template when auditing and planning migration of each
codebase module.

## Prerequisites

- [ ] Codebase audit completed (10N-231)
- [ ] ERPNext API validated
- [ ] Module dependencies mapped

## Template

### Module: [Module Name]

**Location:** [Directory path] **Current Backend:** OpenProject **Target
Backend:** ERPNext **Priority:** [High/Medium/Low]

---

## Discovery Questions

### 1. OpenProject Dependencies

- What OpenProject API calls does this module make?
- What OpenProject data models does it use?
- What OpenProject-specific features does it rely on?

### 2. Environment & Configuration

- What environment variables does it need?
- What configuration files does it use?
- What secrets/credentials does it require?

### 3. Data Access Patterns

- What database queries does it make?
- What database schema does it depend on?
- What relationships does it maintain?

### 4. Integration Points

- What other modules does it interact with?
- What external services does it call?
- What webhooks/events does it handle?

---

## Migration Checklist

### Phase 1: Analysis

- [ ] Document all OpenProject API calls
- [ ] Identify all data models used
- [ ] List all environment variables
- [ ] Map database schema dependencies
- [ ] Document integration points

### Phase 2: Mapping

- [ ] Map OpenProject API calls to ERPNext equivalents
- [ ] Map OpenProject data models to ERPNext DocTypes
- [ ] Map OpenProject fields to ERPNext fields
- [ ] Identify custom DocTypes needed
- [ ] Identify custom fields needed

### Phase 3: Implementation

- [ ] Create/update ERPNext client wrapper
- [ ] Update API client calls
- [ ] Update data model references
- [ ] Update environment variables
- [ ] Update configuration files

### Phase 4: Testing

- [ ] Update unit tests
- [ ] Update integration tests
- [ ] Test with ERPNext dev instance
- [ ] Validate data transformations
- [ ] Test error handling

### Phase 5: Deployment

- [ ] Add feature flag (ERPNext OFF by default)
- [ ] Deploy to dev environment
- [ ] Run smoke tests
- [ ] Monitor for errors
- [ ] Document rollback procedure

---

## Migration Complexity Assessment

**Effort Estimate:** [Hours/Days]

**Complexity:** [Low/Medium/High]

**Risk Level:** [Low/Medium/High]

**Blockers/Dependencies:**

- List any blocking issues
- List dependencies on other migrations

---

## Example: Sync Service Module

```markdown
### Module: Sync Service

**Location:** `packages/sync-service/` **Current Backend:** OpenProject **Target
Backend:** ERPNext

#### OpenProject Dependencies

- API calls: `GET /work_packages`, `PATCH /work_packages/:id`
- Data models: WorkPackage, Project, User
- Features: Custom fields, work package relationships

#### Environment Variables

- `OPENPROJECT_API_URL` → `ERPNEXT_API_URL`
- `OPENPROJECT_API_TOKEN` → `ERPNEXT_API_TOKEN`

#### ERPNext Mapping

- WorkPackage → Task DocType
- Project → Project DocType
- Custom fields → Custom fields in Task DocType

#### Complexity: Medium (3-5 days)
```

---

**Notes:**

- This template should be copied and filled out for each module
- Save completed templates in `docs/migration/modules/[module-name].md`
- Link completed templates to codebase audit report
