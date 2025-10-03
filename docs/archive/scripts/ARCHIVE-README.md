# Archived Scripts

**Archived:** 2025-10-02 **Reason:** Superseded by Frappe Cloud migration
([ADR-006](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md))

## Contents

### Cloudflare Tunnel Scripts

- `setup-tunnel.sh` - Cloudflare Tunnel configuration automation
- `setup-cloudflare.sh` - Cloudflare DNS and tunnel orchestration

**Why Deprecated:** Frappe Cloud provides managed hosting with built-in SSL/CDN
via Cloudflare integration. Custom tunnel setup is no longer required.

### OpenProject Administration

- `fix_admin_password.rb` - OpenProject admin password reset utility

**Why Deprecated:** OpenProject backend replaced by ERPNext on Frappe Cloud.
Admin access now managed through Frappe Cloud dashboard.

### Monitoring Deployment

- `deploy-monitoring-remote.sh` - Remote monitoring stack deployment (referenced
  cloudflared)

**Why Deprecated:** Self-hosted monitoring infrastructure replaced by Frappe
Cloud's native monitoring and observability tools.

## Replacement Approach

- **Hosting:** Frappe Cloud managed infrastructure (ops.10nz.tools)
- **SSL/CDN:** Automatic via Frappe Cloud Cloudflare integration
- **Admin Access:** Frappe Cloud dashboard → Site Management
- **Monitoring:** Frappe Cloud built-in metrics + custom app telemetry

See [FRAPPE_CLOUD_DEPLOYMENT.md](../../deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
for current deployment procedures.
