# Supabase Integration Archive

**Archived:** 2025-10-02 **Reason:** Frappe Cloud Migration (ADR-006) **Parent
Issue:** [10N-234](https://linear.app/10netzero/issue/10N-234)

## What Was Deprecated

This directory contains Docker Compose configurations and related files for the
**OpenProject + Supabase PostgreSQL** integration that was part of the
pre-Frappe Cloud architecture.

### Archived Files

- `docker-compose.supabase.yml` - OpenProject connected to Supabase PostgreSQL
  with Cloudflare Tunnel
- **qa-evidence-story-1.4/** - QA test evidence for Story 1.4 (Supabase
  integration tests, webhook validation)

### What This Configuration Did

- Connected OpenProject to Supabase's managed PostgreSQL (direct connection via
  IPv4 add-on)
- Used schema separation (`openproject` schema) within shared Supabase database
- Integrated Cloudflare R2 for attachment storage
- Exposed OpenProject via Cloudflare Tunnel (localhost-only binding)

## Why It Was Deprecated

Per [ADR-006](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md),
the project migrated from:

- **Old:** Self-hosted OpenProject + Supabase PostgreSQL + Cloudflare Tunnel
- **New:** Frappe Cloud hosted ERPNext (fully managed platform)

**Key decision factors:**

1. **Operational overhead** - Frappe Cloud eliminates infrastructure management
2. **Native ERPNext features** - Better alignment with field operations workflow
3. **Managed services** - Database, backups, scaling handled by Frappe Cloud
4. **Simplified architecture** - No need for tunnel setup or connection pooling

## Replacement Approach

### Database

- **Old:** Supabase PostgreSQL with schema separation
- **New:** Frappe Cloud managed MariaDB (provisioned automatically)

### Access

- **Old:** Cloudflare Tunnel for zero-trust access
- **New:** DNS-only Cloudflare (no tunnel), Frappe Cloud handles SSL/access

### Deployment

- **Old:** Docker Compose on DigitalOcean droplet
- **New:** Git push-to-deploy via Frappe Cloud CI/CD

### File Storage

- **Old:** Cloudflare R2 via OpenProject fog adapter
- **New:** Native ERPNext attachments (optional R2 via marketplace app)

## Migration Path

For teams transitioning from this stack:

1. **Export OpenProject data** - Use OpenProject's built-in export features
2. **Provision Frappe Cloud bench** - See
   `docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md`
3. **Deploy flrts_extensions** - Custom ERPNext app via Git push
4. **Migrate data** - Manual import or scripted migration (see `docs/erpnext/`)
5. **Update DNS** - Point `ops.10nz.tools` to Frappe Cloud
6. **Decommission infrastructure** - Tear down DigitalOcean droplet

## Historical Context

This configuration was documented in:

- `infrastructure/digitalocean/DEPLOYMENT_GUIDE.md` (archived)
- `infrastructure/digitalocean/MONITORING_DEPLOYMENT_GUIDE.md` (archived)
- ADR-006 (retained as decision record)

## Related Archives

- `docs/archive/openproject/` - OpenProject deployment guides
- `docs/archive/tunnel/` - Cloudflare Tunnel configurations
- `docs/archive/scripts/` - Deployment automation scripts

---

**Note:** This archive is retained for historical reference and troubleshooting
legacy infrastructure. It is not maintained and should not be used for new
deployments.
