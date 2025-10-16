# DigitalOcean Monitoring Infrastructure (ARCHIVED)

**Archived:** 2025-10-16
**Superseded by:** ADR-006 — ERPNext on Frappe Cloud

## Reason

ERPNext now runs on Frappe Cloud Private Bench with managed services and built-in monitoring. The DigitalOcean-based monitoring stack (Prometheus, Grafana, Jaeger) and Cloudflare Tunnel configuration for OpenProject are deprecated.

## What Was Archived

### Production Monitoring (`production-monitoring/`)
- Prometheus configuration for DigitalOcean (`prometheus.prod.yml`)
- n8n monitoring service (`n8n-monitor.js`)
- Grafana dashboards and configuration
- Docker configuration for monitoring services

### Tunnel Scripts (`tunnel-scripts/`)
- `setup-monitoring-tunnel.sh` - Cloudflare Tunnel setup for monitoring services
- `deploy-monitoring.sh` - Deployment script for monitoring stack on DigitalOcean
- `test-monitoring-stack.sh` - Integration tests for monitoring infrastructure

### Removed
- `scripts/deploy-monitoring-remote.sh` - Broken symlink to non-existent deployment script

## Replacement

- **Architecture Decision:** docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md
- **Monitoring:** Frappe Cloud built-in monitoring, logs, and metrics
- **Observability:** ADR-007 OpenTelemetry standard for Lambda functions
- **Live Production Site:** https://ops.10nz.tools

## Notes

Do not use these files for new work. The self-hosted DigitalOcean infrastructure has been retired. For historical context, also see:
- docs/archive/infrastructure/openproject-docker/ (OpenProject deployment)
- docs/archive/infrastructure/supabase-config/ (Supabase configuration)
- docs/qa/gates/completed/1.8-migrate-monitoring-digitalocean.yml (migration completion record)

---

**Archival Date:** 2025-10-16
