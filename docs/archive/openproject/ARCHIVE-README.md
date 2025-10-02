# OpenProject Archive

## What Was Archived

This directory contains deployment and operational documentation for the
**OpenProject-based task management system** that was used as the FLRTS backend
from January 2025 through September 2025.

### Files

- **DEPLOYMENT_GUIDE.md** - Full DigitalOcean deployment instructions for
  OpenProject Community Edition with Supabase PostgreSQL
- **MONITORING_DEPLOYMENT_GUIDE.md** - Monitoring stack (Prometheus, Grafana,
  Jaeger) deployment for OpenProject infrastructure
- **.env.example** - Environment variable template for OpenProject + Supabase +
  Cloudflare Tunnel deployment
- **wrangler.toml** - Cloudflare Wrangler configuration for OpenProject Workers
  at ops.10nz.tools

## Why It Was Deprecated

**Decision Date:** September 30, 2025 **Decision Record:**
[ADR-006 - ERPNext Hosting Migration to Frappe Cloud](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)

### Key Reasons

1. **Database Incompatibility**: OpenProject requires MariaDB/MySQL; Supabase
   offers PostgreSQL only, causing schema creation failures.
2. **Operational Overhead**: Self-hosting required manual management of Docker
   containers, database upgrades, Redis, tunnel tokens, backups.
3. **Focus Drain**: Engineering time spent on infrastructure firefighting
   instead of feature development.
4. **Platform Limitations**: OpenProject's project management model didn't align
   with field service management (FSM) workflows needed for mining operations.

## Replacement Approach

**New Backend:** ERPNext Field Service Management on Frappe Cloud

### Architecture Changes

| Component       | Old (OpenProject)                          | New (ERPNext)                              |
| --------------- | ------------------------------------------ | ------------------------------------------ |
| **Hosting**     | Self-managed DigitalOcean droplet          | Managed Frappe Cloud Private Bench         |
| **Database**    | Supabase PostgreSQL (incompatible)         | Managed MariaDB (Frappe Cloud provisioned) |
| **Access**      | Cloudflare Tunnel                          | Direct DNS routing (Cloudflare DNS-only)   |
| **Deployment**  | Docker Compose + manual configuration      | Git push-to-deploy workflow                |
| **Monitoring**  | Self-managed Prometheus/Grafana            | Frappe Cloud built-in + optional external  |
| **Backups**     | Manual backup scripts                      | Managed backups with PITR                  |
| **Custom Apps** | OpenProject plugins (limited extensibility | Custom Frappe apps (flrts_extensions)      |

## Current Documentation

For active deployment and operations documentation, see:

- **Deployment**:
  [docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md](../../deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
- **Architecture**:
  [docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
- **Infrastructure**:
  [infrastructure/README.md](../../../infrastructure/README.md)

## Historical Context

These files are preserved for:

- Understanding architectural evolution
- Reference during post-migration troubleshooting
- Audit trail for infrastructure decisions
- Onboarding context for new team members

**Note:** Instructions in these files are no longer executable against current
infrastructure. Use for historical reference only.
