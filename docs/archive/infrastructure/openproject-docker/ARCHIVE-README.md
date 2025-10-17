# OpenProject Docker Infrastructure (ARCHIVED)

**Archived:** 2025-10-16 **Superseded by:** ADR-006 — ERPNext on Frappe Cloud

## Reason

ERPNext now runs on Frappe Cloud Private Bench with managed services. The
OpenProject Docker-based stack is deprecated and retained for historical
reference only.

## What Was Archived

- OpenProject + Supabase Docker Compose configurations
- Database connection test scripts
- OpenProject startup scripts
- Custom CSS configurations

## Replacement

- **Architecture Decision:**
  docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md
- **Deployment Guide:** docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md
- **Operations Playbook:** docs/infrastructure/frappe-cloud-operations.md
- **Live Production Site:** https://ops.10nz.tools

## Notes

Do not use these files for new work. For historical context, also see:

- docs/archive/openproject/ (deployment docs)
- docs/archive/supabase/ (supabase integration)
- docs/archive/tunnel/ (cloudflare tunnel configs)

---

**Archival Date:** 2025-10-16
