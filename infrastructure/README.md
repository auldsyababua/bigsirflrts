# FLRTS Infrastructure

> ⚠️ **MIGRATION NOTICE**: OpenProject infrastructure has been replaced by
> ERPNext on Frappe Cloud. See
> [ADR-006](../docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
> for rationale.

## Overview

This directory contains infrastructure configuration for the FLRTS ERPNext
deployment on Frappe Cloud and supporting services (n8n, monitoring).

## Directory Structure

```
infrastructure/
├── digitalocean/               # Digital Ocean configurations (n8n, monitoring)
│   ├── docker-compose.erpnext.yml # ERPNext development stack (archived; use Frappe Cloud)
│   ├── docker-compose.monitoring.prod.yml # Production monitoring stack
│   ├── .env.production             # Environment variables template
│   └── DEPLOYMENT_GUIDE.md        # Deployment documentation
├── docker/                     # Local development Docker configurations
│   ├── docker-compose.yml     # Main development compose
│   └── docker-compose.monitoring.yml # Local monitoring stack
├── monitoring/                 # Consolidated monitoring configurations
│   ├── local/                # Development monitoring configs
│   ├── production/           # Production monitoring configs
│   └── shared/               # Shared monitoring components
├── scripts/                    # Infrastructure operation scripts
│   ├── generate-secure-env.sh # Secure environment generation
│   ├── health-check.sh       # Health check utilities
│   └── run-resilience-tests.sh # Resilience testing
└── README.md                  # This file
```

### Note on Script Organization

- **Infrastructure Scripts** (`/infrastructure/scripts/`):
  Infrastructure-specific operations like deployment, health checks, and
  resilience testing
- **Utility Scripts** (`/scripts/`): General-purpose tools for Cloudflare,
  Linear, and other integrations (see `/scripts/README.md`)

### Backward Compatibility

Symlinks are maintained for moved resources:

- `/monitoring` → `/infrastructure/monitoring/local` (for legacy references)
- `/scripts/deploy-monitoring-remote.sh` →
  `/infrastructure/scripts/deploy-monitoring-remote.sh`

## Current Deployment Architecture

### ERPNext Backend (Frappe Cloud)

- **Platform**: Frappe Cloud Private Bench
- **Hosting**: Managed MariaDB, Redis, background workers, scheduler
- **Custom Apps**: flrts_extensions deployed via Git push-to-deploy
- **Domain**: ops.10nz.tools (Cloudflare DNS-only routing)
- **Deployment Guide**:
  [docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md](../docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md)

### Supporting Services (Digital Ocean)

- **n8n**: Workflow orchestration (single-instance mode per ADR-001)
- **Monitoring**: Prometheus + Grafana for observability
- **Region**: NYC3
- **Access**: SSH via configured keys

## Quick Start

### 1. ERPNext Site Access

- Access Frappe Cloud dashboard to manage the ERPNext site
- SSH access available on Private Bench plans ($25/mo+)
- Custom app deployment via `git push frappe main`

### 2. Supporting Services

```bash
# SSH to Digital Ocean monitoring instance (if applicable)
ssh root@<monitoring-droplet-ip>

# Check n8n status
docker ps | grep n8n

# View monitoring dashboard
# Access via Cloudflare DNS at configured subdomain
```

### 3. Local Development

```bash
# Option 1: Use Frappe Cloud development branch
# Create branch via Frappe Cloud dashboard

# Option 2: Local frappe_docker setup (requires MariaDB)
cd infrastructure/digitalocean
docker compose -f docker-compose.erpnext.yml up -d
```

## Key Configuration

### Frappe Cloud Integration

- **API Access**: ERPNext REST API + webhooks
- **Custom DocTypes**: Deployed via flrts_extensions app
- **File Storage**: Native ERPNext attachments (optional R2 via marketplace app)
- **Backups**: Managed by Frappe Cloud with PITR

### Environment Variables

Template for supporting services (n8n, monitoring):

- N8N_WEBHOOK_URL
- FRAPPE_API_KEY (for ERPNext integration)
- TELEGRAM_BOT_TOKEN
- OPENAI_API_KEY
- Monitoring credentials

## Migration Notes

**Historical OpenProject infrastructure has been retired.** See archived configs
in `docs/archive/openproject/` and `docs/archive/tunnel/`. Key changes:

- **Database**: MariaDB (Frappe Cloud managed) replaces Supabase PostgreSQL
- **Access**: Direct DNS routing replaces Cloudflare Tunnel
- **Deployment**: Git push-to-deploy replaces Docker Compose self-hosting
- **Monitoring**: Frappe Cloud built-in tools supplement custom monitoring

## Cost Summary (Current)

- **Frappe Cloud Private Bench**: $25+/month (includes MariaDB, Redis, backups)
- **Digital Ocean (n8n/monitoring)**: ~$10-20/month (if retained)
- **Cloudflare**: Free (DNS-only; no tunnel)
- **Total**: ~$35-45/month

## Support

For issues or questions:

1. Check
   [FRAPPE_CLOUD_DEPLOYMENT.md](../docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
   for ERPNext deployment
2. Review
   [ADR-006](../docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
   for architecture decisions
3. Check Frappe Cloud dashboard logs for ERPNext errors
4. Contact team lead for Frappe Cloud access
