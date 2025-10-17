# Deprecated Stack Tests (ARCHIVED)

**Archived:** 2025-10-16
**Superseded by:** ERPNext on Frappe Cloud (ADR-006)
**Issue:** 10N-338 - Test Suite Audit

## Reason

Per ADR-006, BigSirFLRTS migrated from self-hosted Supabase (PostgreSQL) to ERPNext on Frappe Cloud (MariaDB). These tests validate deprecated infrastructure and will pass even if ERPNext integration breaks, providing false confidence.

## What Was Archived

### Supabase-Specific Tests

- **`supabase-webhook-retry-backoff.test.ts`** - Tests Supabase native webhook retry mechanisms, exponential backoff, circuit breaker behavior. ERPNext uses different webhook patterns.

- **`sync-service-supabase.test.ts`** - Integration tests for sync-service connecting to Supabase PostgreSQL. Replaced by ERPNext API integration.

- **`edge-function-n8n-webhook.test.ts`** - Tests Supabase Edge Function webhooks for n8n automation integration. ERPNext uses custom Frappe app endpoints instead of Edge Functions.

- **`edge-functions.test.ts`** - Tests Supabase Edge Functions deployment, invocation, and error handling. Replaced by ERPNext server-side scripts and custom app methods.

### PostgreSQL-Specific Tests

- **`database-monitoring.test.ts`** - Tests PostgreSQL monitoring views (pg_stat_statements). ERPNext uses MariaDB, not PostgreSQL.

- **`performance-regression.test.ts`** - Tests PostgreSQL query performance benchmarks and regression detection. MariaDB performance characteristics differ significantly.

## Replacement

**Current Stack:**
- **Database:** MariaDB (Frappe Cloud managed)
- **Backend API:** ERPNext REST API (https://ops.10nz.tools/api/method/)
- **Webhooks:** ERPNext native webhooks + custom app endpoints (flrts_extensions)

**New Test Requirements:**
- ERPNext API integration tests
- MariaDB-specific monitoring (if needed)
- ERPNext webhook handling validation
- Custom DocType CRUD operations

## Why Not Update Instead of Archive?

These tests validate fundamentally different architectures:
- **Old:** Direct PostgreSQL connections, Supabase-specific APIs, PostgreSQL monitoring
- **New:** ERPNext REST API, MariaDB backend, Frappe Cloud managed services

Updating would require complete rewrites. Better to archive for historical reference and write new tests following current architecture.

## Impact on Test Suite

**Before Archival:** 56% of tests (14 files) referenced deprecated stack
**After Archival:** 6 files archived (Supabase/PostgreSQL-specific tests removed)
**Remaining:** 8 files still need review/update (see 10N-338 audit report)

## Related Work

- **Test Audit Report:** docs/.scratch/10n-338/test-audit-report.md
- **Architecture Decision:** docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md
- **Migration Epic:** 10N-233 - Refactor Docs & Tickets for Frappe Cloud Migration

## Notes

Do not run these tests against current production environment. They expect Supabase/PostgreSQL infrastructure that no longer exists.

For historical context on Supabase integration, see:
- docs/archive/supabase/
- docs/archive/openproject/

---

**Archival Date:** 2025-10-16
**Issue:** 10N-338
