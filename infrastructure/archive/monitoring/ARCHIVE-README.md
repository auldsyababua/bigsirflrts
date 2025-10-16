# Monitoring Infrastructure Archive

**Archived**: 2025-10-16
**Reason**: DigitalOcean/Supabase/N8N infrastructure deprecated

## What Was Here

Prometheus/Grafana monitoring stack for the legacy infrastructure:
- `local/` - Monitoring configuration and scripts
  - `prometheus.yml` - Prometheus scrape configuration
  - `prometheus.prod.yml` - Production Prometheus config
  - `grafana/` - Grafana dashboards
  - `webhook-health-check.sh` - Supabase → N8N webhook monitoring
  - `webhook-monitor.js` - Node.js webhook health monitor
  - `n8n-webhook-config.json` - N8N webhook configuration

## Monitored Services (Deprecated)

- **Supabase webhooks** - PostgreSQL database change notifications
- **N8N workflows** - Hosted at n8n-rrrs.sliplane.app
- **DigitalOcean containers** - OpenProject, PostgreSQL
- **System metrics** - Node exporter, cAdvisor

## Why Archived

Per ADR-006 (accepted 2025-09-30), infrastructure migrated to Frappe Cloud:
- **Old**: Self-hosted on DigitalOcean with custom monitoring
- **New**: Frappe Cloud managed platform with built-in observability

Frappe Cloud provides:
- Built-in monitoring dashboards
- Automated alerting
- Log aggregation
- Performance metrics
- No custom Prometheus/Grafana needed

## Related

- ADR-006: ERPNext/Frappe Cloud migration decision (2025-09-30)
- PR #149: Repository cleanup (2025-10-15)
- docs/archive/openproject/ - Related OpenProject deployment docs

## Last Active

Last modified: 2025-10-13
