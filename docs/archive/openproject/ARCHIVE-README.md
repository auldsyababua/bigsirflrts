# OpenProject Research Archive

**Archived**: 2025-10-16
**Reason**: OpenProject hosting shut down Sept 30, 2025

## What Was Here

Database schema investigation and analysis work for OpenProject integration:
- `db-schema-investigation/` - PostgreSQL schema analysis from OpenProject deployment
  - Database audit reports
  - SQL query results (public schema, openproject schema)
  - Table categorization and mapping

## Why Archived

Per ADR-006 (accepted 2025-09-30), the project migrated from OpenProject to ERPNext on Frappe Cloud:
- **Old**: Self-hosted OpenProject on DigitalOcean
- **New**: Frappe Cloud hosted ERPNext (fully managed)

This research was conducted for the OpenProject PostgreSQL database structure, which is no longer relevant to the current ERPNext/MariaDB architecture.

## Related

- ADR-006: ERPNext/Frappe Cloud migration decision (2025-09-30)
- 10N-233: Refactor Docs & Tickets for Frappe Cloud Migration
- docs/erpnext/research/ - Current ERPNext schema research

## Last Active

Last modified: 2025-10-03
