# Supabase-Era Documentation Archive

**Archived:** October 2025 **Reason:** Migration to Frappe Cloud (ADR-006,
September 2025)

This directory contains documentation from the Supabase/PostgreSQL architecture
era (January 2025 - September 2025).

## Migration Context

In September 2025, BigSirFLRTS migrated from:

- ❌ Supabase PostgreSQL → ✅ Frappe Cloud MariaDB
- ❌ Supabase Edge Functions → ✅ AWS Lambda + n8n workflows
- ❌ OpenProject → ✅ ERPNext on Frappe Cloud

**Migration Decision:** See
docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md

## Current Architecture

**Live Production:** https://ops.10nz.tools (ERPNext on Frappe Cloud)

For current architecture documentation, see:

- docs/architecture/current-frappe-cloud-architecture.md (canonical reference)
- docs/prd/prd.md (updated for Frappe Cloud)
- docs/architecture/tech-stack.md (updated stack)

## Archived Files

This archive contains:

### Architecture Decision Records

- ADR-003-supabase-connection-pooling.md - Supabase connection strategy
  (superseded by Frappe Cloud managed MariaDB)

### Deployment Documentation

- (Files moved during cleanup - see git history for full list)

### Setup Guides

- (Files moved during cleanup - see git history for full list)

## Why Archive Instead of Delete?

These documents provide valuable historical context:

- Understanding past architectural decisions
- Reference for migration lessons learned
- Audit trail for technology choices

**Warning:** Do not use these documents for current development. They describe a
deprecated architecture.
