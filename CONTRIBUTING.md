# Contributing

Please read AGENTS.md (Repository Guidelines) first — it defines structure,
style, and commands used across this repo.

## BMAD Method Workflow

- Read `.bmad-core/core-config.yaml` and the devLoadAlwaysFiles it lists before
  starting.
- Follow BMAD tasks/checklists in `.bmad-core/tasks` and `.bmad-core/checklists`
  (e.g., `qa-gate.md`, `test-design.md`).
- Document changes per sharded docs: `docs/architecture/` and `docs/stories/`
  (ADRs under `docs/architecture/adr/`).
- For architecture-affecting work, reference and align with `ADR-006` (ERPNext
  Frappe Cloud migration) and `ADR-001` (n8n single-instance).

## Quick Start

- Prereqs: Node >= 18, npm 9+, Docker (optional for local stack).
- Install: `npm ci`
- Env: never commit secrets. For tests, copy `tests/.env.template` to
  `tests/.env` and fill required values. For services, create a local `.env`
  with ERPNext/OpenAI/AWS credentials.
- Smoke check: `npm run lint && npm run format:check && npm run test:mvp`

## Run & Develop

- NLP service: `npm run nlp:dev` (TSX + nodemon), build with
  `npm run nlp:build`, run with `npm run nlp:start`.
- Tests: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`
  (Playwright). Tag criticals `@P0`; validate with `npm run test:mvp`.
- Lint/format: `npm run lint`, `npm run lint:fix`, `npm run format`.

## Architecture Invariants (Read ADRs)

- ERPNext backend: hosted on Frappe Cloud with managed MariaDB. See:
  - `docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md`
  - `docs/architecture/adr/ADR-001-n8n-deployment-mode.md`
- n8n runs single‑instance (not queue/Redis) for current scale. Only propose
  queue mode if >50 concurrent executions or >500 webhooks/hour.
- Custom apps (flrts_extensions) deploy via Git push-to-deploy workflow.

## Local Stack (Optional)

- ERPNext development: Use Frappe Cloud development branch or local
  frappe_docker setup (requires MariaDB).
- Root `docker-compose.yml` offers broader stack for complementary services
  (n8n, monitoring, etc.).

## Code & Files

- Follow ESLint/Prettier (see AGENTS.md). Use `rg` for searches, exclude
  `node_modules`, `package-lock.json`, and archives.
- Create new files only when necessary; prefer updating existing
  modules/configs. Avoid duplicate scripts or “\_v2” files.

## Environment & Secrets Discovery

- Check root env files before prompting for creds: `.env`, `.env.*` (e.g.,
  `.env.digitalocean`, `.env.n8n`, `.env.telegram`, `.env.openai`).
- Use ripgrep to locate values: `rg -n "FRAPPE_|N8N_API_KEY|TELEGRAM_" .env*`
- Never print secrets in PRs/logs; reference the file/variable names instead.

## Commits & PRs

- Conventional Commits: `feat:`, `fix(scope):`, `docs:`, `refactor:`, etc.
- PR checklist:
  - Describe change and link issues/ADRs if architecture-related.
  - Attach BMAD QA Gate evidence (refer to `.bmad-core/tasks/qa-gate.md` and
    `docs/qa/gates/*`).
  - Tests updated/added; `npm run test:mvp` green.
  - `npm run lint && npm run format:check` green.
  - No secrets; docs updated when behavior or architecture changes.

## Pre‑Merge Sanity

- ERPNext backend connections point to Frappe Cloud, n8n single-instance, no
  Redis/queue added unintentionally.
- Performance notes: include rationale if touching execution throughput or
  webhook volume.
