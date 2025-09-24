# BigSirFLRTS

Field Reports, Lists, Reminders, Tasks, and Sub-Tasks management system.

## Documentation

- **Repository Guidelines**: See [AGENTS.md](./AGENTS.md)
- **AI/Claude Instructions**: See [CLAUDE.md](./CLAUDE.md)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Linear Integration**: See
  [docs/setup/linear-integration.md](./docs/setup/linear-integration.md)
- **Deployment**: See [docs/deployment/](./docs/deployment/)

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
