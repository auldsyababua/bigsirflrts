# System Connections & Health (Supabase-Only)

This project runs with a single Supabase PostgreSQL database for all services (ADR‑002) and n8n in single‑instance mode (ADR‑001). No local Postgres containers are used in production.

## Current Topology (Production)
- OpenProject → Supabase PostgreSQL
  - Conn: `DATABASE_URL` via Supabase pooler (port 5432), `schema=openproject`
  - Deploy: `infrastructure/digitalocean/docker-compose.supabase.yml`
  - Migrations: `openproject-migrate` init container (db:migrate db:seed)
  - Health: `curl -f http://localhost:8080/health_checks/default` → 200
- OpenProject → Memcached
  - Conn: `OPENPROJECT_CACHE__MEMCACHE__SERVER=memcached:11211`
  - Status: container running on droplet
- Cloudflare Tunnel → OpenProject
  - Exposes 127.0.0.1:8080 securely at `https://ops.10nz.tools`
  - Env: `CLOUDFLARE_TUNNEL_TOKEN` (see root `.env*`)
- n8n (single‑instance)
  - Mode: single‑instance per ADR‑001; uses Supabase when self‑hosted
  - Current: remote/cloud deployment in `.env.n8n` (not on the OpenProject VM)
- NLP service (packages/nlp-service)
  - Dev‑only locally; not deployed on VM; depends on OpenAI + Supabase
- Telegram
  - Canonical: Supabase Edge Function `supabase/functions/telegram-webhook`
  - Deployment helper: `supabase/deploy-telegram-webhook.sh`
  - Dockerized bot: removed; no local Telegram container in production

## Environment Variables (by component)
- OpenProject (on VM)
  - `SECRET_KEY_BASE`, `DATABASE_URL` (Supabase pooler, `schema=openproject`), `RAILS_ENV=production`
  - Optional R2: `OPENPROJECT_FOG__*` (not required if using local storage)
- Cloudflared (on VM)
  - `CLOUDFLARE_TUNNEL_TOKEN`
- n8n (remote or self‑hosted)
  - `N8N_HOST`, `WEBHOOK_URL`; DB `DB_POSTGRESDB_*` → Supabase if self‑hosted
- Supabase (root .env files)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Tip: Use root `.env*` files (.env, .env.supabase, .env.n8n, .env.digitalocean, .env.openai, .env.telegram) as the first source of truth for credentials.

## Validation Commands (Production VM)
- App health: `curl -sf http://localhost:8080/health_checks/default`
- Logs: `docker logs openproject --tail 100`
- Tunnel: `docker logs cloudflared --tail 100`
- DB sanity (Supabase): `psql "$DATABASE_URL" -t -c "select current_database(), current_schema();"`

## Known Good State (snapshot)
- OpenProject: healthy, running on Supabase with migrations applied (init container)
- Memcached: running
- Cloudflared: running; ops.10nz.tools reachable
- Local Postgres: none (removed)

## Gaps / Next Work
- Telegram bot container path missing; align with Supabase Function or add service source
- R2 storage: optional; configure in compose if needed
- Monitoring: optional stack available; deploy via monitoring guide if required
- Container naming standardization (see INFRA‑002) for local/dev stacks

## Source of Truth
- ADR‑001: `docs/architecture/adr/ADR-001-n8n-deployment-mode.md`
- ADR‑002: `docs/architecture/adr/ADR-002-openproject-migration-pattern.md`
