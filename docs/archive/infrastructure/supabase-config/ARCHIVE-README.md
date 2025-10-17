# Supabase Infrastructure Configuration (ARCHIVED)

**Archived:** 2025-10-16 **Superseded by:** ADR-006 — ERPNext on Frappe Cloud

## Reason

ERPNext on Frappe Cloud uses managed MariaDB instead of Supabase PostgreSQL.
Supabase edge functions and configuration are deprecated.

## What Was Archived

- Supabase config.toml
- Supabase Edge Functions (telegram-webhook, parse-request)

## Replacement

- **Database:** Managed MariaDB (Frappe Cloud provisioned)
- **Webhooks:** ERPNext custom app endpoints (flrts_extensions)
- **Architecture:**
  docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md

## Notes

Do not use these files for new work. For historical context, also see:

- docs/archive/supabase/ (supabase integration docs)
- docs/archive/openproject/ (openproject deployment docs)

---

**Archival Date:** 2025-10-16
