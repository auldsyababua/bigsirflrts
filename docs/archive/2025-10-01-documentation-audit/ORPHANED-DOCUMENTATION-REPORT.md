# Orphaned Documentation Report

**Date:** 2025-10-01 **Related:**
[LINEAR-DOCUMENTATION-MAP.md](LINEAR-DOCUMENTATION-MAP.md) **Purpose:** Identify
documentation files with weak or missing Linear issue linkage

## Executive Summary

**Orphaned Documentation Found:** 4 files **Severity:** Low to Medium
**Recommended Action:** Link to appropriate Linear issues or deprecate

---

## Definition

**Orphaned Documentation** = Documentation files that exist in the repository
but have:

- No explicit Linear issue references
- Weak contextual linkage (only mentioned in passing)
- Unclear ownership or maintenance responsibility

**Why This Matters:**

- Orphaned docs risk becoming stale
- Unclear which Linear issues should track updates
- Difficult to determine if documentation is still relevant

---

## Orphaned Documentation Inventory

### 1. docs/erpnext/architecture/erpnext-migration-workflow.md

**Status:** ⚠️ Weak linkage **Size:** 1,580 lines **Purpose:** Comprehensive
migration workflow guide **Current Linkage:** Referenced in Linear Epic 10N-227
description as "source of truth"

**Analysis:**

- This is a **critical** document serving as the master workflow reference
- Epic 10N-227 mentions it but doesn't formally "own" it
- Updates to workflow should trigger Epic updates

**Recommendation:**

- **Action:** Update Epic 10N-227 to explicitly own this document
- **Add to Epic Description:**

  ```markdown
  ## Master Documentation

  - **Workflow Guide:**
    [erpnext-migration-workflow.md](../../docs/erpnext/architecture/erpnext-migration-workflow.md)
    - **Owner:** This Epic (10N-227)
    - **Update trigger:** Any workflow changes require Epic comment
  ```

**Priority:** High (critical document needs clear ownership)

---

### 2. docs/erpnext/ERPNext-Migration-Naming-Standards.md

**Status:** ⚠️ Weak linkage **Size:** 493 lines **Purpose:** All naming
conventions for ERPNext migration **Current Linkage:** Referenced in workflow
doc, no Linear issue ownership

**Analysis:**

- **Critical** standards document used across all phases
- No Linear issue explicitly owns this document
- Changes to naming standards affect multiple stories

**Recommendation:**

- **Action:** Create dedicated Linear story for naming standards
- **Suggested Story:**

  ```
  Title: ADR-007: ERPNext Migration Naming Standards
  Team: BigSirFLRTS
  Labels: documentation, standards, erpnext-migration
  Description:
  Defines all naming conventions for ERPNext migration project.

  **Document:** docs/erpnext/ERPNext-Migration-Naming-Standards.md

  This story tracks:
  - Naming standard updates
  - Violations found during implementation
  - Clarifications needed by developers
  ```

**Priority:** High (foundational standards need tracking)

---

### 3. docs/architecture/adr/ADR-006-erpnext-backend-adoption.md

**Status:** ⚠️ Weak linkage **Size:** 428 lines **Purpose:** Architecture
Decision Record for ERPNext adoption **Current Linkage:** Referenced in Epic
10N-227, but not "owned"

**Analysis:**

- Architecture Decision Record (ADR) format
- Epic 10N-227 references it but doesn't formally track it
- ADRs should have explicit Linear linkage for discussions

**Recommendation:**

- **Action:** Create Linear story for ADR-006 approval/tracking
- **Suggested Story:**

  ```
  Title: ADR-006: ERPNext Backend Adoption - Approval & Tracking
  Team: BigSirFLRTS
  Labels: architecture, adr, decision-record
  Parent: 10N-227 (ERPNext Backend Adoption Epic)
  Description:
  Track approval and implementation of ADR-006.

  **Document:** docs/architecture/adr/ADR-006-erpnext-backend-adoption.md

  **Status:** Draft - awaiting Product Owner approval

  **Approval Checklist:**
  - [ ] Technical Lead review
  - [ ] Product Owner approval
  - [ ] Cost analysis validated
  - [ ] Migration timeline approved
  ```

**Priority:** High (formal ADR approval process)

---

### 4. docs/architecture/linear-audit-erpnext-migration.md

**Status:** ✅ Linked but not explicitly **Size:** 324 lines **Purpose:** Linear
audit report showing ERPNext migration impact **Current Linkage:** Created as
part of Epic 10N-227 work, but no formal link

**Analysis:**

- Audit document created during Epic planning
- Natural parent is Epic 10N-227
- Should be referenced in Epic description

**Recommendation:**

- **Action:** Update Epic 10N-227 to reference this audit report
- **Add to Epic Description:**

  ```markdown
  ## Planning Documents

  - **Linear Audit:**
    [linear-audit-erpnext-migration.md](../../docs/architecture/linear-audit-erpnext-migration.md)
    - Date: 2025-10-01
    - Findings: 38 issues reviewed, 3 updated, 1 closed
  ```

**Priority:** Medium (useful context but not critical)

---

## Summary Statistics

| Severity   | Count | Documents                                                   |
| ---------- | ----- | ----------------------------------------------------------- |
| **High**   | 3     | erpnext-migration-workflow.md, naming-standards.md, ADR-006 |
| **Medium** | 1     | linear-audit-erpnext-migration.md                           |
| **Low**    | 0     | -                                                           |

---

## Implementation Checklist

### Immediate Actions (This Week)

- [ ] **Update Epic 10N-227** to reference:
  - erpnext-migration-workflow.md (as master workflow)
  - linear-audit-erpnext-migration.md (as planning doc)

- [ ] **Create Linear Story:** "ADR-007: ERPNext Migration Naming Standards"
  - Link to: docs/erpnext/ERPNext-Migration-Naming-Standards.md
  - Add to Epic 10N-227 as child story

- [ ] **Create Linear Story:** "ADR-006: ERPNext Backend Adoption - Approval &
      Tracking"
  - Link to: docs/architecture/adr/ADR-006-erpnext-backend-adoption.md
  - Add to Epic 10N-227 as child story
  - Mark as "awaiting approval"

---

## Long-Term Prevention

**Establish Documentation Ownership Rules:**

1. **All ADRs must have Linear stories** for approval tracking
2. **All standards documents must have Linear stories** for change tracking
3. **All workflow guides must be referenced in Epic descriptions**
4. **Template documents can remain orphaned** (intentionally not linked until
   used)

**Add to Git Hooks:**

- Pre-commit hook to check for Linear references in new docs (future
  enhancement)

---

## References

- [LINEAR-DOCUMENTATION-MAP.md](LINEAR-DOCUMENTATION-MAP.md) - Complete
  documentation inventory
- [ERPNext Migration Workflow](erpnext/architecture/erpnext-migration-workflow.md) -
  Master workflow guide
- [ADR-006](architecture/adr/ADR-006-erpnext-backend-adoption.md) - ERPNext
  adoption decision

---

**Report Completed:** 2025-10-01 **Next Review:** After Phase 1 completion (2
weeks)
