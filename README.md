# BigSirFLRTS

Field Reports, Lists, Reminders, Tasks, and Sub-Tasks management system.

## Architecture

BigSirFLRTS runs on **ERPNext (Frappe Framework)** hosted on **Frappe Cloud**.

- **Platform**: Frappe Cloud Private Bench
- **Database**: MariaDB (Frappe Cloud managed)
- **Live Site**: <https://ops.10nz.tools>
- **Custom App**: flrts_extensions (Git push-to-deploy)
- **Telegram Bot**: AWS Lambda (webhook handler)
- **Orchestration**: n8n workflows
- **NLP**: OpenAI GPT-4o

**Architecture Details**: See
[Current Frappe Cloud Architecture](./docs/architecture/current-frappe-cloud-architecture.md)

**Historical Note**: Migrated from Supabase/PostgreSQL in September 2025 (see
[ADR-006](./docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md))

## Documentation

- **Repository Guidelines**: See [AGENTS.md](./AGENTS.md)
- **AI/Claude Instructions**: See [CLAUDE.md](./CLAUDE.md)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Linear Integration**: See
  [docs/setup/linear-integration.md](./docs/setup/linear-integration.md)
- **Deployment**: See [docs/deployment/](./docs/deployment/)
- **Migration Guide**: See
  [docs/MIGRATION-SUPABASE-TO-FRAPPE.md](./docs/MIGRATION-SUPABASE-TO-FRAPPE.md)

## Quick Start

```bash
# Install dependencies
npm ci

# Run tests
npm run test:mvp

# Start development
npm run dev
```

## Project Structure

- `/packages` - Service packages (NLP, extensions)
- `/tests` - Test suites (unit, integration, e2e)
- `/docs` - Documentation
- `/infrastructure` - Deployment and operations
- `/database` - Database schemas and migrations

For detailed setup and configuration, see the documentation in `/docs`.
