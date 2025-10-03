# FLRTS → ERPNext Schema Mapping

> ⚠️ **SUPERSEDED BY ADR-006** - This document describes migration from
> OpenProject/Supabase to ERPNext. Following the
> [Frappe Cloud migration decision](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md),
> the OpenProject backend has been retired. This document is retained for
> historical reference only.

**Status:** Not Started **Phase:** 1.5 **Agent:** Internal Team **Date
Created:** 2025-10-01 **Last Updated:** 2025-10-01 **Related Linear:** 10N-232

> ⚠️ Reference plan only—real data migration remains out of scope until MVP
> validation passes. Capture mappings now so scripts can be written quickly
> later.

## Purpose

Document how each FLRTS data entity will map into ERPNext DocTypes (standard or
custom), including field-level transformations and required customizations.

## Prerequisites

- [ ] ERPNext FSM analysis (10N-230) completed
- [ ] Inventory of FLRTS schema/tables gathered
- [ ] Custom DocType requirements identified (Site Location, Visit Tasks, etc.)
- [ ] Decision on canonical site/location modeling

## Entity Mapping Template

```markdown
### [Entity Name]

**FLRTS Table:** `table_name` **ERPNext DocType:** `DocType Name`
(standard/custom) **Migration Priority:** [High/Medium/Low]

#### Field Mappings

| FLRTS Field | Type | ERPNext Field | Type   | Transformation           |
| ----------- | ---- | ------------- | ------ | ------------------------ |
| id          | UUID | name          | Data   | Naming Series / autoname |
| status      | text | status        | Select | Map via lookup table     |
| ...         | ...  | ...           | ...    | ...                      |

#### Custom Fields Needed

- `custom_field_name` (Type) – Rationale

#### Relationships

- Parent: [DocType]
- Children: [DocType]
- Links: [DocType]

#### Transformation Notes

- Enumerations, date normalisation, timezone conversions, etc.

#### Migration Complexity

- **Effort:** [Low/Medium/High]
- **Risk:** [Low/Medium/High]
- **Notes:** [Any blockers]
```

## Core Entities (to be filled during Phase 1.5)

1. **Sites / Locations** – Decide between custom Site Location DocType vs
   Territory + Address hybrid.
2. **Work Orders / Maintenance Visits** – Include contractor, site, task/part
   child tables.
3. **Tasks / Checklists** – Map to child DocTypes (`Maintenance Visit Task`).
4. **Contractors / Suppliers** – Extend Supplier DocType with
   contractor-specific fields.
5. **Personnel / Employees** – Link existing users to Employee with
   Telegram/timezone metadata.
6. **Attachments / Logs** – Determine storage (File DocType vs Cloudflare R2
   references).

## Custom DocTypes Required

List custom DocTypes once designed:

1. **Site Location** – Tree-based site hierarchy.
2. **Maintenance Visit Task** – Child table for checklists.
3. **Maintenance Visit Part** – Child table for parts usage.
4. _Add others as needed._

## Standard ERPNext DocTypes Utilised

- **Maintenance Visit** – Core work order DocType.
- **Issue** – Intake for unplanned work.
- **Supplier** – Contractors.
- **Item / Serial No** – Equipment + parts.
- **Employee / Sales Person** – Internal technicians.

Document any required custom fields alongside each DocType.

## Data Transformation Considerations

- Normalize statuses and priorities to ERPNext workflow states.
- Ensure timestamps include timezone conversions to UTC.
- Map OpenProject IDs to ERPNext naming series and store legacy references
  (`legacy_id`) for traceability.
- Plan for incremental loads (created_at / updated_at columns) even if migration
  is big bang.

## Migration Complexity Snapshot

- **Entities:** _TBD_
- **Custom DocTypes:** _TBD_
- **Custom Fields:** _TBD_
- **High-Risk Transformations:** _TBD_

## Validation Checklist

- [ ] Every FLRTS table has a corresponding ERPNext DocType mapping
- [ ] Field-level transformations defined for each entity
- [ ] Custom DocTypes and fields documented
- [ ] Data transformation scripts outlined
- [ ] Dependencies and migration order agreed
- [ ] Risks logged and mitigations drafted

## References

- ERPNext DocType documentation
- `docs/erpnext/research/erpnext-fsm-module-analysis.md`
- `docs/erpnext/research/erpnext-doctype-patterns.md`
- ERPNext Naming Standards
  (`docs/erpnext/ERPNext-Migration-Naming-Standards.md`)
