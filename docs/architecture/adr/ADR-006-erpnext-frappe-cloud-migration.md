# Architecture Decision Record: Migrate ERPNext Hosting to Frappe Cloud

## Status

PROPOSED

## Context

Our current ERPNext stack runs on a self-managed DigitalOcean droplet using
`frappe_docker`, Supabase (PostgreSQL) as the database, and a Cloudflare Tunnel
for ingress. While workable, this architecture has created several critical
issues:

- **Database incompatibility:** ERPNext and the Frappe framework require
  MariaDB/MySQL. Supabase only offers PostgreSQL, causing schema creation and
  migration failures (`tabDocType` missing, etc.).
- **Operational overhead:** We maintain Docker containers, database upgrades,
  Redis, workers, tunnel tokens, backups, and observability manually.
- **Tunnel complexity:** External access depends on Cloudflare Tunnel health;
  recent failures blocked the MVP rollout.
- **Focus drain:** Engineering time is being spent on infra firefighting instead
  of ERPNext customization (flrts_extensions, Telegram automation, FSM flows).

## Decision Drivers

1. **Platform compatibility:** Use a hosting platform that supports ERPNext’s
   native MariaDB requirement.
2. **Operational simplicity:** Reduce the number of services we maintain.
3. **Custom app support:** Ensure `flrts_extensions` and future custom apps can
   be deployed easily.
4. **MVP velocity:** Deliver the ERPNext-based MVP without infrastructure
   blockers.
5. **Security and reliability:** Prefer managed backups, SSL, and monitoring.

## Decision

Adopt **Frappe Cloud** as the hosting platform for BigSirFLRTS’s ERPNext
environment.

- Deploy ERPNext v15+ on a Frappe Cloud **Private Bench** (requires $25/mo plan
  or higher).
- Install our custom `flrts_extensions` app using the Git-based “push to deploy”
  workflow.
- Use Frappe Cloud’s managed MariaDB, Redis, background workers, scheduler, and
  HTTPS provisioning.
- Configure `ops.10nz.tools` directly via Frappe Cloud’s custom domain feature
  (Cloudflare DNS in “DNS only” mode; no tunnel).
- Expose Telegram webhooks and other integrations through Frappe’s native REST
  endpoints and webhooks.
- Rely on Frappe Cloud’s built-in monitoring/logging for MVP; add external
  observability later if needed.

## Architecture Changes

### Before (Self-Hosted on DigitalOcean)

```
Users → Cloudflare Tunnel → flrts-cloudflared → nginx (erpnext-frontend)
      → gunicorn (erpnext-backend) ↔ MariaDB (Supabase Postgres attempt)
                             ↔ Redis (queues, cache)
                             ↔ Custom apps, Telegram webhooks
```

### After (Managed on Frappe Cloud)

```
Users → DNS (Cloudflare “DNS only”) → Frappe Cloud ingress
      → Managed ERPNext site (nginx + gunicorn)
      ↔ Managed MariaDB & Redis (Frappe Cloud)
      ↔ Custom app (flrts_extensions)
      ↔ External services (Telegram, n8n if needed, OpenAI) via HTTPS APIs
```

### Simplified Component Interactions

1. **Frappe Cloud** hosts ERPNext, MariaDB, Redis, background workers, and
   scheduler.
2. **Custom domain** terminates TLS at Frappe Cloud; no tunnel container.
3. **Automation/integrations** use Frappe webhooks or whitelisted endpoints.
4. Optional services (n8n, OpenAI) remain external and call the ERPNext API.

## Consequences

### Positive

- **Compatibility restored:** ERPNext runs on managed MariaDB without hacks.
- **Lower maintenance:** No Docker, Supabase, or Cloudflare Tunnel to manage.
- **Faster delivery:** Platform handles upgrades, backups, and workers; team can
  focus on FSM features.
- **Custom app ready:** Private Bench allows Git-based deployment of
  flrts_extensions and future apps.
- **Built-in monitoring/backups:** Frappe Cloud provides logs, metrics, and
  automated backups with PITR.

### Negative

- **Less control:** No root access; can’t install arbitrary system packages or
  run unrelated services on the same box.
- **Plan dependency:** Private Bench (for custom apps + SSH) requires at least
  the $25/mo plan.
- **DNS change:** Must disable Cloudflare proxying (orange cloud) for the custom
  domain.

### Neutral / Follow-up

- **External workflows:** Reassess need for n8n once ERPNext automation is in
  place.
- **File storage:** MVP can use native file storage; optional Cloudflare R2
  integration can be added later via marketplace app.
- **Observability:** Base MVP uses Frappe Cloud tools; can integrate Prometheus
  or other platforms later if needed.

## Implementation Impact

1. **Provision Frappe Cloud Private Bench** and select hosting region.
2. **Create ERPNext site** on Frappe Cloud with custom domain `ops.10nz.tools`.
3. **Deploy flrts_extensions** via Git “push to deploy” workflow.
4. **Migrate data** from the DigitalOcean bench using `bench backup` → restore
   on Frappe Cloud.
5. **Update integrations:** point Telegram webhooks, n8n flows (if retained),
   and OpenAI calls to the new public endpoint.
6. **Retire legacy infra:** decommission Supabase DB, Cloudflare Tunnel,
   DigitalOcean ERPNext containers once new site passes verification.
7. **Update documentation & Linear issues** to reflect the new architecture.

## Alternatives Considered

### Alternative 1: Keep self-hosting but switch to managed MariaDB

- Migrate from Supabase to a managed MariaDB (DigitalOcean, Planetscale) while
  keeping the existing Docker stack.
- **Rejected:** Still leaves us with Docker/migration overhead, tunnel
  maintenance, and manual backups/logging. Higher operational burden.

### Alternative 2: Stand up custom MariaDB on the droplet

- Install MariaDB alongside frappe_docker and manage it ourselves.
- **Rejected:** Reintroduces maintenance tasks (patching, backups, tuning) we’re
  trying to eliminate.

### Alternative 3: Fork ERPNext to support PostgreSQL

- Continue trying to run ERPNext on Supabase by modifying Frappe ORM/migrations
  to work with Postgres.
- **Rejected:** Long-term maintenance burden, diverges from upstream, high risk
  of incompatibility with future ERPNext updates.

## References

- Frappe Cloud pricing & Private Bench requirements
- Frappe Cloud documentation on custom domains, SSH, backups, monitoring
- Observed failures running ERPNext on Supabase (missing `tabDocType`, unable to
  create DB)
- Internal research on observability and automation
