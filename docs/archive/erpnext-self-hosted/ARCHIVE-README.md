# Self-Hosted ERPNext Archive

**Archived:** 2025-10-02 **Reason:** Frappe Cloud Migration (ADR-006) **Parent
Issue:** [10N-234](https://linear.app/10netzero/issue/10N-234)

## What Was Deprecated

This directory contains Docker Compose configurations and deployment planning
for **self-hosted ERPNext on DigitalOcean** infrastructure. This deployment
model was superseded by the Frappe Cloud migration decision.

### Archived Files

- `docker-compose.erpnext.yml` - Docker Compose configuration for self-hosted
  ERPNext stack
- `ERPNEXT-DEPLOYMENT-PLAN.md` - Deployment guide for replacing OpenProject with
  self-hosted ERPNext

### What This Configuration Did

- **Self-hosted ERPNext stack** on DigitalOcean droplet
- **Database:** Supabase PostgreSQL (external managed database)
- **Access:** Cloudflare Tunnel for zero-trust access at ops.10nz.tools
- **Storage:** Cloudflare R2 for attachment storage
- **Network:** Custom Docker bridge network (`ops_network`)
- **Services:** ERPNext backend, frontend, Redis cache/queue, Socketio,
  scheduler

### Architecture Pattern

```
Internet → Cloudflare → Tunnel → erpnext-frontend:8080 → erpnext-backend:8000
                                                        → Redis (cache + queue)
                                                        → Supabase PostgreSQL
```

## Why It Was Deprecated

Per [ADR-006](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md),
the project adopted **Frappe Cloud Private Bench** as the production platform,
eliminating the need for self-hosted infrastructure management.

**Superseding decision:**

- **Old:** Self-hosted ERPNext + Supabase PostgreSQL + Cloudflare Tunnel +
  DigitalOcean droplet
- **New:** Frappe Cloud hosted ERPNext (fully managed platform)

**Key advantages of Frappe Cloud over self-hosted:**

1. **Zero infrastructure management** - No Docker, networking, or server
   maintenance
2. **Managed database** - MariaDB provisioned and backed up automatically by
   Frappe Cloud
3. **Simplified deployment** - Git push-to-deploy workflow (no Docker Compose)
4. **Built-in scaling** - Frappe Cloud handles resource allocation
5. **Integrated monitoring** - Platform-level observability and alerting
6. **Professional support** - Frappe Cloud SLA vs. self-managed troubleshooting

## Replacement Approach

### Database

- **Old:** Self-managed Supabase PostgreSQL connection
- **New:** Frappe Cloud managed MariaDB (automatically provisioned)

### Access

- **Old:** Cloudflare Tunnel + Docker network routing
- **New:** DNS-only Cloudflare, Frappe Cloud handles SSL/routing

### Deployment

- **Old:** Docker Compose on DigitalOcean droplet
- **New:** Git push to Frappe Cloud bench (CI/CD automated)

### File Storage

- **Old:** Cloudflare R2 via S3-compatible config in Docker env
- **New:** Native ERPNext attachments (optional R2 via marketplace app)

### Networking

- **Old:** Custom Docker bridge network (`ops_network`)
- **New:** No custom networking needed (Frappe Cloud managed)

## Migration Path

For teams considering Frappe Cloud over self-hosted ERPNext:

1. **Provision Frappe Cloud bench** - See
   `docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md`
2. **Deploy custom apps** - Push `flrts_extensions` via Git
3. **Configure domain** - Point DNS to Frappe Cloud (no tunnel needed)
4. **Migrate data** - Export from self-hosted, import to Frappe Cloud
5. **Decommission droplet** - Tear down DigitalOcean infrastructure

## Historical Context

This configuration was intended to replace OpenProject while maintaining
DigitalOcean hosting. The decision to adopt Frappe Cloud (ADR-006) superseded
this approach before production deployment.

**Related decisions:**

- ADR-006: ERPNext Hosting Migration to Frappe Cloud (supersedes self-hosted
  approach)
- Original plan: Replace OpenProject with self-hosted ERPNext (abandoned)

## ops_network Note

The `ops_network` Docker bridge network defined in this configuration is **no
longer needed** after archival. If referenced in other active Docker Compose
files, those references should be removed or updated to use default networks.

## Related Archives

- `docs/archive/openproject/` - OpenProject deployment guides
- `docs/archive/supabase/` - Supabase connection pooler configs
- `docs/archive/tunnel/` - Cloudflare Tunnel configurations
- `docs/archive/scripts/` - Deployment automation scripts

---

**Note:** This archive represents a deployment approach that was **planned but
not implemented** in production. It is retained for historical reference and to
document the architectural evolution from OpenProject → self-hosted ERPNext →
Frappe Cloud.
