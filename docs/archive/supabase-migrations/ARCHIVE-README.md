# Supabase PostgreSQL Migrations Archive

**Archived:** 2025-10-16
**Original Path:** `/database/`
**Breadcrumb ID:** ARCH-001
**Reason:** Supabase deprecated as primary backend per ADR-006 (2025-09-30)

## What Was Here

This directory contains the original Supabase PostgreSQL database schema migrations from when the project used Supabase as the primary backend. As of ADR-006 (2025-09-30), ERPNext on Frappe Cloud became the primary and only backend for BigSirFLRTS.

### File Inventory

| File | Size | Last Modified | Purpose |
|------|------|---------------|---------|
| migrations/001_initial_schema.sql | 5.7 KB | 2025-09-14 | Initial FLRTS schema (tasks, field_reports, equipment, etc.) |
| migrations/002_openproject_schema.sql | 3.7 KB | 2025-09-30 | OpenProject integration schema (work_packages, projects) |
| migrations/003_flrts_features.sql | 7.4 KB | 2025-09-25 | FLRTS features schema |
| migrations/004_monitoring_views.sql | 4.5 KB | 2025-09-25 | Monitoring and analytics views |
| seeds/development.sql | N/A | 2025-09-14 | Development seed data |
| seeds/test.sql | N/A | 2025-09-14 | Test seed data |
| README.md | N/A | 2025-09-17 | Database documentation |

**Total Size:** ~145 KB (migrations + seeds + README)

## Why Archived

### Primary Reason: Backend Migration (ADR-006)

On 2025-09-30, the BigSirFLRTS project migrated from Supabase + OpenProject to ERPNext on Frappe Cloud as the single backend system. This decision was documented in ADR-006.

**Key Points from .project-context.md:**
- Supabase hosting (PostgreSQL) deprecated for primary data storage
- Current use: Analytics/audit logging ONLY (not primary backend)
- Do NOT create new Supabase tables for primary data
- Use ERPNext API for all primary data operations

### Secondary Reason: OpenProject Shutdown

OpenProject hosting shut down September 30, 2025. Migration 002_openproject_schema.sql created tables to sync with OpenProject, which is now obsolete.

### Technology Stack Change

**Before (Deprecated):**
- Supabase PostgreSQL 15.8
- Public schema: FLRTS tables
- OpenProject schema: OpenProject integration tables
- sync-service package for Supabase ↔ OpenProject synchronization

**After (Current):**
- ERPNext on Frappe Cloud (https://ops.10nz.tools)
- MariaDB (Frappe Cloud provisioned)
- Direct ERPNext API calls
- No sync-service needed

## Last Active

**Last Modified:** 2025-09-30 (002_openproject_schema.sql)
**Last Meaningful Change:** 2025-09-30 (OpenProject sync improvements, 10N-219)
**Final Commit:** feat(module-2): OpenProject sync improvements (10N-219) (#32)

**Timeline:**
- 2025-09-14: Initial schema creation
- 2025-09-17: Database README documentation
- 2025-09-24: Monitoring schema deployment
- 2025-09-25: FLRTS features and monitoring views
- 2025-09-30: Final OpenProject schema updates (last activity before migration)

## Related

### Architecture Decision Records
- **ADR-006:** ERPNext/Frappe Cloud migration (2025-09-30)
  - Location: `docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md`
  - Decision: Migrate from OpenProject/Supabase to ERPNext as single backend

### Related Migrations
- **sync-service archived:** packages/archive/sync-service/ (2025-10-16, 10N-339)
  - Reason: Supabase ↔ OpenProject sync no longer needed
- **OpenProject configs archived:** docs/archive/openproject/ (various)
  - Reason: OpenProject hosting shut down

### Related Issues
- **10N-219:** OpenProject sync improvements (last development on this backend)
- **10N-233:** Refactor docs & tickets for Frappe Cloud migration (parent epic)
- **10N-339:** Archive sync-service (cleanup after migration)

### Migration Documentation
- Migration mapping: `docs/.scratch/deep-audit/migration-mapping.md`
- Forensic audit: `docs/.scratch/deep-audit/forensic-audit-report.md`

## Recovery

If you need to restore these files for historical reference or data migration:

### View Git History
```bash
git log --all -- database/
git log --all --patch -- database/migrations/001_initial_schema.sql
```

### Restore from Git
```bash
# Restore entire directory
git checkout <commit-hash> -- database/

# Restore specific migration
git checkout <commit-hash> -- database/migrations/002_openproject_schema.sql
```

### Find Last Working Commit (Before Archive)
```bash
# Find commit just before archival
git log --all --oneline -- database/ | head -1

# Example output: 36f8b74 chore: archive obsolete infrastructure
# Restore from commit before that one
```

### Use Cases for Recovery
- **Data Migration:** Need to reference old schema for ERPNext DocType mapping
- **Historical Analysis:** Understand what FLRTS features existed in Supabase
- **Audit Trail:** Review sync logic between Supabase and OpenProject
- **Documentation:** Create migration guide from old schema to ERPNext

## Migration Notes

### Current Supabase Usage

**Important:** Supabase is NOT completely removed from the project. It is retained for:
- Analytics/audit logging ONLY
- NOT for primary data storage
- Do NOT create new tables for core functionality

### ERPNext Replacement Mapping

If you need to migrate data or understand the ERPNext equivalent:

| Supabase Schema | ERPNext DocType | Notes |
|----------------|-----------------|-------|
| tasks table | Task DocType | Standard ERPNext Task with custom fields |
| field_reports table | Custom DocType | See flrts_extensions for custom app |
| equipment table | Item / Serial No | ERPNext asset management |
| work_packages (OpenProject) | Project / Task | Native ERPNext project management |

### Research Documents

For ERPNext DocType selection and migration analysis:
- `docs/erpnext/research/` - ERPNext module analysis
- `docs/research/erpnext-schema-philosophy.md` - Schema design differences
- `docs/research/erpnext-feature-mapping.md` - Feature equivalents

## Contents Inventory (Detailed)

### migrations/001_initial_schema.sql (5.7 KB)
- Created: 2025-09-14
- Purpose: Initial FLRTS database schema
- Tables: tasks, field_reports, equipment, maintenance_logs, etc.
- Features: UUID primary keys, timestamps, RLS policies

### migrations/002_openproject_schema.sql (3.7 KB)
- Created: 2025-09-30
- Purpose: OpenProject integration schema
- Tables: work_packages, projects, openproject_sync_status
- Features: Foreign keys to public schema, sync tracking

### migrations/003_flrts_features.sql (7.4 KB)
- Created: 2025-09-25
- Purpose: FLRTS-specific feature tables
- Tables: reminders, lists, sub_tasks, attachments
- Features: Recursive sub-task relationships, reminder scheduling

### migrations/004_monitoring_views.sql (4.5 KB)
- Created: 2025-09-25
- Purpose: Monitoring and analytics views
- Views: task_metrics, sync_health, equipment_status
- Features: Real-time metrics, sync monitoring

### seeds/development.sql
- Created: 2025-09-14
- Purpose: Development environment seed data
- Contents: Sample tasks, field reports, test users
- Usage: Local development and testing

### seeds/test.sql
- Created: 2025-09-14
- Purpose: Test environment seed data
- Contents: Minimal test fixtures
- Usage: CI/CD test suite

### README.md
- Created: 2025-09-17
- Purpose: Database documentation
- Contents: Schema overview, migration guide, connection info
- Status: References deprecated architecture

## Breadcrumb

**ARCH-001:** database/ → docs/archive/supabase-migrations/

**Sub-items:**
- ARCH-001a: migrations/001_initial_schema.sql
- ARCH-001b: migrations/002_openproject_schema.sql
- ARCH-001c: migrations/003_flrts_features.sql
- ARCH-001d: migrations/004_monitoring_views.sql
- ARCH-001e: seeds/development.sql
- ARCH-001f: seeds/test.sql
- ARCH-001g: README.md

---

**Archived by:** Action Agent
**Archive Date:** 2025-10-16
**Archive Commit:** chore/directory-cleanup branch
**Migration Reference:** docs/.scratch/deep-audit/migration-mapping.md
