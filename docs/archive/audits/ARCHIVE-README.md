# Audit Results Archive

**Archived:** 2025-10-02 **Reason:** Pre-migration infrastructure audits
superseded by Frappe Cloud architecture (ADR-006) **Parent Issue:**
[10N-234](https://linear.app/10netzero/issue/10N-234)

## Contents

This directory contains JSON audit reports and connection diagrams from the
**pre-Frappe Cloud migration** infrastructure audit conducted in September 2025.

### Archived Files

- `openproject-audit.json` - OpenProject container and configuration audit
- `supabase-audit.json` - Supabase integration audit (connection pooling,
  schemas, webhooks)
- `infrastructure-audit.json` - Infrastructure-wide audit (Docker, networking,
  monitoring)
- `infrastructure-connections.md` - Visual diagram of pre-migration service
  connections
- `frontend-api-audit.json` - Frontend API integration audit
- `n8n-audit.json` - n8n workflow automation audit
- `nlp-audit.json` - NLP service audit
- `telegram-audit.json` - Telegram bot webhook audit

## What These Audits Covered

These audits were performed as part of **10N-233 Stage 1** to inventory all
references to OpenProject, Supabase, and Cloudflare Tunnel infrastructure before
the Frappe Cloud migration.

### Key Findings

1. **OpenProject-Supabase incompatibility** - MariaDB/MySQL requirement vs.
   PostgreSQL-only platform
2. **Operational overhead** - Manual Docker container management, tunnel token
   rotation, backup scripting
3. **Architecture complexity** - Cloudflare Tunnel + Supabase connection
   pooler + self-hosted monitoring stack

These findings informed the decision to migrate to Frappe Cloud (see ADR-006).

## Why Deprecated

Per [ADR-006](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md),
the infrastructure described in these audits has been replaced by:

- **Hosting:** Frappe Cloud managed infrastructure (ops.10nz.tools)
- **Database:** Frappe Cloud managed MariaDB (no Supabase)
- **Access:** DNS-only Cloudflare (no tunnel)
- **Monitoring:** Frappe Cloud built-in metrics

The audit findings are no longer actionable against current production
infrastructure.

## Current Audit Approach

Post-migration audits focus on:

- **Frappe Cloud bench configuration** - Custom app deployments, security
  settings
- **ERPNext schema audits** - DocType definitions, permissions, workflows
- **API integration audits** - REST API usage, authentication patterns
- **Performance audits** - Query optimization, caching, background jobs

See `docs/erpnext/` for current audit methodologies.

## Historical Context

These audits are preserved for:

- Understanding pre-migration architecture complexity
- Reference during post-migration troubleshooting
- Audit trail for infrastructure decisions
- Comparative analysis (before/after migration)

---

**Note:** Data in these files reflects infrastructure state as of
September 2025. Use for historical reference only.
