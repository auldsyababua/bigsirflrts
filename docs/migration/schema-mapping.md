# FLRTS → ERPNext Schema Mapping

**Status:** Not Started **Phase:** 1.5 **Agent:** Internal Team **Date
Created:** 2025-10-01 **Related Linear:** 10N-232

## Purpose

Translate existing FLRTS data structures into ERPNext DocTypes and fields so
future migration scripts have a definitive reference.

## Prerequisites

- [ ] Finalized list of ERPNext DocTypes (standard and custom)
- [ ] Inventory of FLRTS tables and key columns
- [ ] Decision on canonical location for site/location hierarchy

## Template

### Entity Mappings

| FLRTS Entity/Table | ERPNext DocType      | Notes                                    |
| ------------------ | -------------------- | ---------------------------------------- |
| locations          | Location / Territory | Add custom hierarchy field if needed     |
| contractors        | Supplier             | Capture contractor type via custom field |
| work_orders        | Maintenance Visit    | Map status + technician assignments      |

> Extend this table to cover every FLRTS entity involved in MVP flows.

### Field-Level Mapping

- FLRTS field name
- ERPNext field (DocType, fieldname)
- Transformation logic (case normalization, enum mapping, etc.)
- Required customizations

### Custom DocTypes Needed

- DocType name
- Purpose
- Key fields and child tables

### Data Transformation Notes

- Ordering dependencies
- Validation steps
- Post-migration verification queries

## Notes

No production data migration is scheduled yet; populate this document during
Phase 1.5 so we are ready once MVP validation justifies a real migration effort.
