# System Connections & Health (Frappe Cloud Architecture)

> ⚠️ **MIGRATION NOTICE**: Replaced OpenProject/Supabase topology with ERPNext
> on Frappe Cloud per [ADR-006](adr/ADR-006-erpnext-frappe-cloud-migration.md).
> n8n remains in single‑instance mode (ADR‑001).

## Current Topology (Production)

### ERPNext Backend (Frappe Cloud)

- **Platform**: Frappe Cloud Private Bench
- **Database**: Managed MariaDB (Frappe Cloud provisioned)
- **Cache/Queue**: Managed Redis (Frappe Cloud provisioned)
- **Background Workers**: Managed by Frappe Cloud scheduler
- **Public Access**: `https://ops.10nz.tools` (Cloudflare DNS-only → Frappe
  Cloud ingress)
- **Custom Apps**: flrts_extensions (Git push-to-deploy)
- **File Storage**: Native ERPNext attachments (optional R2 via marketplace app)
- **API Access**: ERPNext REST API + webhooks
- **Health**: Frappe Cloud dashboard monitoring + built-in uptime checks

### Supporting Services

- **n8n** (single‑instance per ADR‑001)
  - Mode: single‑instance; optionally self‑hosted on DigitalOcean or n8n.cloud
  - Integration: calls ERPNext REST API for task/service call operations
  - Config: `.env.n8n` (webhook URL, ERPNext API credentials)
- **NLP service** (packages/nlp-service)
  - Dev‑only locally; not deployed on VM
  - Dependencies: OpenAI API + ERPNext REST API (replaces Supabase logging)
- **Telegram Bot**
  - Webhook handler: Supabase Edge Function
    `supabase/functions/telegram-webhook` (if retained) or direct ERPNext
    webhook
  - Deployment: `supabase/deploy-telegram-webhook.sh` (if Supabase Edge
    Functions remain active)
- **Monitoring** (optional)
  - Frappe Cloud built-in: logs, metrics, uptime monitoring
  - External: Prometheus/Grafana on DigitalOcean (if custom observability
    needed)

## Environment Variables (by component)

- **ERPNext (Frappe Cloud)**
  - Managed via Frappe Cloud dashboard (no direct .env access)
  - API credentials: `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` (for external
    integrations)
  - Site URL: `FRAPPE_SITE_URL=https://ops.10nz.tools`
- **n8n** (remote or self‑hosted)
  - `N8N_HOST`, `WEBHOOK_URL`
  - ERPNext integration: `ERPNEXT_API_KEY`, `ERPNEXT_SITE_URL`
  - Database: `DB_POSTGRESDB_*` (if self‑hosted) or n8n.cloud managed
- **Supporting Services** (root .env files)
  - Telegram: `TELEGRAM_BOT_TOKEN`
  - OpenAI: `OPENAI_API_KEY`
  - Monitoring: service-specific credentials

Tip: Use root `.env*` files (.env, .env.n8n, .env.digitalocean, .env.openai,
.env.telegram) as the first source of truth for credentials. ERPNext backend
credentials managed in Frappe Cloud dashboard.

## Validation Commands

### ERPNext (Frappe Cloud)

- **Site Health**: Check Frappe Cloud dashboard status page
- **API Health**:
  `curl -sf https://ops.10nz.tools/api/method/frappe.auth.get_logged_user`
- **Logs**: Access via Frappe Cloud dashboard → Logs tab
- **SSH Access** (Private Bench plans):
  `ssh <bench-name>@<frappe-cloud-hostname>`
- **Bench Commands** (via SSH):
  - `bench version` - Check installed apps and versions
  - `bench doctor` - System health check
  - `bench mariadb` - Database console access

### Supporting Services (if self-hosted on DigitalOcean)

- **n8n Status**: `docker ps | grep n8n` (if self-hosted)
- **Monitoring**: Access Grafana at configured subdomain

## Known Good State (as of October 2, 2025)

- **ERPNext**: Deployed on Frappe Cloud with flrts_extensions app
- **Database**: Managed MariaDB with native ERPNext schema
- **DNS**: ops.10nz.tools → Frappe Cloud (DNS-only routing via Cloudflare)
- **API Access**: ERPNext REST API endpoints functional
- **File Storage**: Native ERPNext attachments (replaces R2 for backend)
- **Monitoring**: Frappe Cloud built-in monitoring active

## Next Work / Integration TODOs

- Complete application code refactor (Category 3 - deferred to separate issue)
- Integrate n8n workflows with ERPNext REST API
- Update Telegram webhook to call ERPNext endpoints
- Migrate existing task data from OpenProject to ERPNext (if needed)
- Validate flrts_extensions custom DocTypes functionality
- Set up external monitoring (optional) for n8n and Telegram integrations

## Source of Truth

- ADR‑001: `docs/architecture/adr/ADR-001-n8n-deployment-mode.md`
- ADR‑006: `docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md`
- Deployment Guide: `docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md`
