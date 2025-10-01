# FLRTS → ERPNext Schema Mapping

**Status:** Not Started **Phase:** Phase 1.5 **Related Linear:**
[10N-232](https://linear.app/10netzero/issue/10N-232) **Date Created:**
2025-10-01

## Purpose

Map FLRTS database schema (currently using OpenProject via Supabase) to ERPNext
DocTypes. This document defines how existing FLRTS data structures will be
represented in ERPNext's DocType-based system.

## Prerequisites

- [ ] ERPNext FSM module analysis completed (10N-230)
- [ ] Current FLRTS schema documented
- [ ] ERPNext standard DocTypes reviewed
- [ ] Custom DocType requirements identified

## Entity Mappings

### Template for Each Entity

```markdown
### [Entity Name]

**FLRTS Table:** `table_name` **ERPNext DocType:** `DocType Name`
(standard/custom) **Migration Priority:** [High/Medium/Low]

#### Field Mappings

| FLRTS Field | Type    | ERPNext Field | Type | Transformation |
| ----------- | ------- | ------------- | ---- | -------------- |
| id          | UUID    | name          | Data | Auto-generate  |
| name        | VARCHAR | title         | Data | Direct copy    |
| ...         | ...     | ...           | ...  | ...            |

#### Custom Fields Needed

- `custom_field_name` (Type) - Description

#### Relationships

- Parent: [DocType]
- Children: [DocType list]
- Links: [DocType list]

#### Data Transformation Logic

Describe any complex transformations needed.

#### Migration Complexity

- **Effort:** [Low/Medium/High]
- **Risk:** [Low/Medium/High]
- **Notes:** [Any special considerations]
```

---

## Core Entity Mappings

### Sites/Locations

_To be filled during Phase 1.5 execution_

### Work Orders

_To be filled during Phase 1.5 execution_

### Tasks/Sub-Tasks

_To be filled during Phase 1.5 execution_

### Contractors/Suppliers

_To be filled during Phase 1.5 execution_

### Field Reports

_To be filled during Phase 1.5 execution_

---

## Custom DocTypes Required

List of custom DocTypes that need to be created:

1. **FLRTS [Entity Name]**
   - Purpose: [Description]
   - Parent DocType: [If applicable]
   - Fields: [Brief list]

---

## Standard ERPNext DocTypes Used

List of standard ERPNext DocTypes that will be used:

1. **Task**
   - Usage: [How FLRTS will use this]
   - Custom Fields Needed: [List]

2. **Project**
   - Usage: [How FLRTS will use this]
   - Custom Fields Needed: [List]

---

## Data Migration Complexity Assessment

### Overall Complexity

**Total Entities:** [Count] **Custom DocTypes Needed:** [Count] **Custom Fields
Needed:** [Count] **Complex Transformations:** [Count]

### Migration Order

1. [Entity] - No dependencies
2. [Entity] - Depends on #1
3. [Entity] - Depends on #1, #2

### Estimated Effort

- Schema design: [Hours/Days]
- Custom DocType creation: [Hours/Days]
- Data migration scripts: [Hours/Days]
- Testing and validation: [Hours/Days]

**Total:** [Hours/Days]

---

## Risk Assessment

### High Risk Items

- [Item] - [Mitigation strategy]

### Medium Risk Items

- [Item] - [Mitigation strategy]

---

## Validation Checklist

- [ ] All FLRTS entities mapped
- [ ] All field mappings defined
- [ ] Custom DocTypes designed
- [ ] Custom fields identified
- [ ] Transformation logic documented
- [ ] Migration complexity assessed
- [ ] Risks identified and mitigated

---

## References

- [ERPNext DocType documentation](https://docs.erpnext.com)
- [FLRTS current schema](../../database/schema/)
- [ERPNext Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)
