# ERPNext Data Migration Strategy

> ⚠️ **SUPERSEDED BY ADR-006** - This document describes migration from
> OpenProject/Supabase to ERPNext. Following the
> [Frappe Cloud migration decision](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md),
> the OpenProject backend has been retired. This document is retained for
> historical reference only.

**Status:** Not Started **Phase:** 1.5 **Agent:** Internal Team **Date
Created:** 2025-10-01 **Last Updated:** 2025-10-01 **Related Linear:** 10N-232

> ⚠️ No production cutover is planned yet—this document captures strategy and
> lessons learned from exploratory trials so we can execute quickly once MVP
> validation demands it.

## Purpose

Define the approach for moving FLRTS data from OpenProject/Supabase into
ERPNext, including decision criteria, validation steps, rollback plan, and
testing guidelines.

## Prerequisites

- [ ] `docs/migration/schema-mapping.md` completed with field-level mappings
- [ ] ERPNext production topology provisioned and smoke-tested
- [ ] Backup/snapshot procedures rehearsed
- [ ] Migration scripts prototyped in staging
- [ ] Test migration run completed successfully with sign-off

## Migration Approach

### Decision: Big Bang vs Incremental

Document the decision once Phase 1.5 analysis completes.

#### Option 1: Big Bang Migration

- **Pros:** Clean cutover, simpler synchronization story, clear rollback point.
- **Cons:** Requires downtime window; higher blast radius if errors occur.

#### Option 2: Incremental (Dual-Write/Phased)

- **Pros:** Lower risk; allows parallel validation.
- **Cons:** Requires temporary dual-write logic and conflict resolution; more
  operational overhead.

### Selected Approach

- _To be decided during Phase 1.5 execution._

## Migration Waves & Entity Order

1. Sites / Locations (no downstream dependencies)
2. Contractors / Suppliers (links to Sites)
3. Personnel / Technicians (Users, Employees)
4. Work Orders (Maintenance Visits + child tables)
5. Attachments and auxiliary data (photos, logs) if scoped

## Validation Requirements

- Pre/post record counts for every DocType
- Referential integrity spot checks (Link fields resolve)
- Business rule verification (statuses, assignments, SLAs)
- Performance smoke tests (API latency, report responsiveness)

## Rollback Procedures

1. Capture Supabase + ERPNext backups immediately prior to run
2. If validation fails, restore ERPNext backup and point integrations back to
   legacy services
3. Document incident in Linear and schedule root-cause review
4. Communicate status to stakeholders (Telegram + email template)

## Testing Strategy

- Run migrations in staging with production-sized anonymized data
- Automate repeatable scripts (bench commands, Python utilities)
- Record timing metrics and bottlenecks
- Require sign-off from product + operations before scheduling production window

## Cutover Checklist

- [ ] Final schema mapping reviewed
- [ ] Migration scripts merged and tagged
- [ ] Downtime window communicated
- [ ] Backups verified
- [ ] Monitoring/alerting adjusted for ERPNext endpoints
- [ ] Support plan staffed during migration window

## Risk Assessment

- **Data integrity:** Mitigate via validated scripts and backups.
- **Downtime overrun:** Dry-run timings, add 50% buffer.
- **Permission misconfiguration:** Include post-migration QA scripts to test
  role access.
- **API contract drift:** Freeze upstream OpenProject writes during cutover.

## References

- `docs/migration/schema-mapping.md`
- ERPNext Data Import Tool documentation
- Frappe backup/restore guides
- Linear issue [10N-232](https://linear.app/10netzero/issue/10N-232)
