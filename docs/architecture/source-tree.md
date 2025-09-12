# FLRTS Source Tree Documentation

## Directory Structure Overview

```
bigsirflrts/                           # Root project directory
├── .github/                           # GitHub configuration
│   ├── workflows/                     # CI/CD pipelines
│   │   ├── ci.yml                    # Continuous integration
│   │   ├── deploy.yml                # Deployment pipeline
│   │   └── security.yml              # Security scanning
│   └── ISSUE_TEMPLATE/                # Issue templates
│
├── packages/                          # Monorepo packages (npm workspaces)
│   ├── shared/                       # Shared code across all services
│   ├── flrts-nlp/                    # FLRTS NLP service (calls OpenProject API)
│   ├── openproject-config/           # OpenProject DATABASE_URL configuration for Supabase
│   ├── preference-service/           # User preferences (stored in Supabase flrts schema)
│   ├── web-ui/                       # Next.js web application
│   ├── cli/                          # Command-line interface
│   └── telegram-bot/                 # Telegram Mini App
│
├── infrastructure/                    # Infrastructure as Code
│   ├── docker/                       # Docker configurations
│   ├── cloudflare/                   # Cloudflare Tunnel configs
│   └── scripts/                      # Deployment scripts
│
├── scripts/                          # Build and utility scripts
├── tests/                            # Integration and E2E tests
├── docs/                             # Documentation
└── [Configuration Files]             # Root config files
```

## Detailed Package Structure

### packages/shared/
```
shared/
├── src/
│   ├── schemas/                      # Zod schemas (single source of truth)
│   │   ├── task.schema.ts           # ParsedTask, WorkPackage schemas
│   │   ├── user.schema.ts           # User, TeamMember schemas
│   │   ├── mining.schema.ts         # Mining-specific schemas
│   │   └── index.ts                 # Schema exports
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── api.types.ts             # API request/response types
│   │   ├── openproject.types.ts     # OpenProject API types
│   │   └── index.ts                 # Type exports
│   │
│   ├── utils/                        # Shared utilities
│   │   ├── timezone.ts               # Timezone conversion logic
│   │   ├── validation.ts            # Common validators
│   │   ├── errors.ts                # Error classes
│   │   └── logger.ts                # Logging configuration
│   │
│   └── constants/                    # Shared constants
│       ├── team.ts                  # Team member definitions
│       ├── timezones.ts             # Timezone mappings
│       └── operations.ts            # CRUD operation types
│
├── package.json                      # Package configuration
├── tsconfig.json                     # TypeScript configuration
└── jest.config.js                    # Test configuration
```

### packages/flrts-nlp/
```
flrts-nlp/
├── src/
│   ├── controllers/                  # HTTP request handlers
│   │   ├── parse.controller.ts      # Parse endpoint
│   │   ├── health.controller.ts     # Health check
│   │   └── websocket.controller.ts  # WebSocket handler
│   │
│   ├── services/                     # Business logic
│   │   ├── parsing.service.ts       # OpenAI integration for NLP
│   │   ├── openproject.service.ts   # OpenProject API client
│   │   ├── cache.service.ts         # Redis caching
│   │   ├── batch.service.ts         # Request batching
│   │   └── prompt.service.ts        # Prompt management
│   │
│   ├── prompts/                      # OpenAI prompt templates
│   │   ├── system.prompt.ts         # System message
│   │   ├── examples/                # Few-shot examples
│   │   └── templates.ts             # Dynamic templates
│   │
│   ├── middleware/                   # Express middleware
│   │   ├── auth.middleware.ts       # Authentication
│   │   ├── rateLimit.middleware.ts  # Rate limiting
│   │   ├── validation.middleware.ts # Request validation
│   │   └── error.middleware.ts      # Error handling
│   │
│   ├── config/                       # Service configuration
│   │   ├── openai.config.ts        # OpenAI settings
│   │   ├── redis.config.ts         # Redis connection
│   │   └── app.config.ts           # Application settings
│   │
│   ├── app.ts                       # Express app setup
│   └── index.ts                     # Service entry point
│
├── tests/
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── fixtures/                    # Test data
│
├── Dockerfile                        # Container definition
├── package.json
└── tsconfig.json
```

### packages/openproject-config/
```
openproject-config/
├── src/
│   ├── env/                          # Environment configuration
│   │   ├── database.config.ts       # DATABASE_URL for Supabase Session Mode
│   │   ├── ssl.config.ts            # SSL/TLS configuration (required)
│   │   ├── r2.config.ts             # Cloudflare R2 object storage
│   │   └── connection.validator.ts  # Connection validation
│   │
│   ├── deployment/                   # Deployment helpers
│   │   ├── docker-compose.yml       # OpenProject with Supabase DB
│   │   └── health-check.ts          # Database connectivity check
│   │
│   └── index.ts                     # Configuration exports
│
├── templates/                        # Configuration templates
│   ├── .env.openproject            # OpenProject environment template
│   └── README.md                    # Setup instructions
│
└── package.json
```

### packages/web-ui/ (Next.js 14 App Router)
```
web-ui/
├── app/                              # App Router structure
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home page
│   ├── api/                         # API routes
│   │   ├── parse/route.ts          # NLP parsing endpoint
│   │   ├── tasks/route.ts          # Task CRUD via OpenProject API
│   │   └── preferences/route.ts    # User preferences (Supabase)
│   ├── tasks/                       # Task pages
│   │   ├── page.tsx                # Task list
│   │   └── [id]/page.tsx          # Task detail
│   └── settings/                    # Settings pages
│       └── page.tsx
│
├── components/                       # React components
│   ├── ui/                         # Base UI components
│   │   ├── command-bar.tsx        # Universal input
│   │   ├── confirmation-dialog.tsx # Parse confirmation
│   │   └── voice-input.tsx        # Voice recording
│   ├── features/                   # Feature components
│   │   ├── task-list.tsx
│   │   ├── parse-preview.tsx
│   │   └── timezone-display.tsx
│   └── layouts/                    # Layout components
│       ├── header.tsx
│       └── sidebar.tsx
│
├── lib/                             # Utilities
│   ├── api.ts                      # API client
│   ├── hooks/                      # Custom React hooks
│   │   ├── useParser.ts
│   │   └── useVoice.ts
│   └── utils/                      # Helper functions
│
├── styles/                          # Styling
│   └── globals.css                 # Global styles
│
├── public/                          # Static assets
├── next.config.js                   # Next.js config
└── package.json
```

### packages/cli/
```
cli/
├── src/
│   ├── commands/                    # CLI commands
│   │   ├── parse.command.ts       # Parse command
│   │   ├── create.command.ts      # Create task
│   │   ├── list.command.ts        # List tasks
│   │   └── config.command.ts      # Configuration
│   │
│   ├── utils/                      # CLI utilities
│   │   ├── config.ts              # Config management
│   │   ├── output.ts              # Output formatting
│   │   └── prompts.ts             # Interactive prompts
│   │
│   └── index.ts                    # CLI entry point
│
├── bin/                            # Executable
│   └── flrts.js                   # CLI binary
│
└── package.json
```

### packages/telegram-bot/
```
telegram-bot/
├── src/
│   ├── bot/                        # Bot logic
│   │   ├── handlers/              # Message handlers
│   │   │   ├── text.handler.ts
│   │   │   ├── voice.handler.ts
│   │   │   └── command.handler.ts
│   │   ├── scenes/                # Conversation flows
│   │   └── middleware/            # Bot middleware
│   │
│   ├── webapp/                     # Mini App
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   │
│   └── index.ts                   # Bot entry point
│
├── Dockerfile
└── package.json
```

## Infrastructure Files

### infrastructure/docker/
```
docker/
├── docker-compose.yml              # Development environment
├── docker-compose.prod.yml         # Production overrides
├── nginx/
│   ├── nginx.conf                 # Main config
│   └── sites/                     # Site configs
└── redis/
    └── redis.conf                  # Redis config
```

### infrastructure/cloudflare/
```
cloudflare/
├── tunnel-config.yml               # Cloudflare Tunnel configuration
├── dns-records.yml                 # DNS record definitions
└── access-policies.yml             # Zero Trust access policies
```

### infrastructure/scripts/
```
scripts/
├── deploy.sh                       # VM deployment script
├── backup.sh                       # Database backup script
├── health-check.sh                 # Service health monitoring
└── update.sh                       # System update automation
```

## Configuration Files (Root)

```
bigsirflrts/
├── package.json                    # Root package.json for workspaces
├── tsconfig.json                   # Base TypeScript config
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── .gitignore                     # Git ignore rules
├── .env.example                   # Environment variables template
├── turbo.json                     # Turborepo configuration
├── docker-compose.yml             # Local development setup
└── README.md                      # Project documentation
```

## File Naming Conventions

### TypeScript/JavaScript Files
- **Components**: PascalCase (e.g., `CommandBar.tsx`)
- **Utilities**: camelCase (e.g., `parseInput.ts`)
- **Services**: camelCase with .service suffix (e.g., `parsing.service.ts`)
- **Controllers**: camelCase with .controller suffix
- **Schemas**: camelCase with .schema suffix
- **Tests**: Same as source with .test or .spec suffix

### Configuration Files
- **Environment**: `.env`, `.env.local`, `.env.production`
- **Docker**: `Dockerfile`, `docker-compose.yml`
- **Config**: `{service}.config.ts` or `config/{service}.ts`

## Import Path Aliases

### TypeScript Path Mappings
```json
{
  "compilerOptions": {
    "paths": {
      "@flrts/shared/*": ["../shared/src/*"],
      "@/*": ["./src/*"],
      "@components/*": ["./components/*"],
      "@lib/*": ["./lib/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

### Usage Examples
```typescript
// Instead of: import { ParsedTask } from '../../../shared/src/schemas';
import { ParsedTask } from '@flrts/shared/schemas';

// Instead of: import { CommandBar } from '../../components/ui/command-bar';
import { CommandBar } from '@components/ui/command-bar';
```

## Build Outputs

```
bigsirflrts/
├── dist/                          # Compiled JavaScript (git-ignored)
├── .next/                         # Next.js build output
├── node_modules/                  # Dependencies (git-ignored)
└── coverage/                      # Test coverage reports
```

## Development Workflow Files

```
bigsirflrts/
├── .husky/                        # Git hooks
│   ├── pre-commit                # Lint staged files
│   └── pre-push                  # Run tests
│
├── .vscode/                       # VS Code settings
│   ├── settings.json             # Workspace settings
│   ├── extensions.json           # Recommended extensions
│   └── launch.json              # Debug configurations
│
└── .github/                       # GitHub specific
    ├── CODEOWNERS               # Code ownership
    ├── CONTRIBUTING.md          # Contribution guide
    └── PULL_REQUEST_TEMPLATE.md # PR template
```

## Critical Files

### Must Not Modify Without Review
- `packages/shared/src/schemas/*` - Data contracts
- `packages/openproject-config/src/env/database.config.ts` - Database connection (Session Mode required!)
- `.github/workflows/deploy.yml` - Deployment pipeline
- `infrastructure/docker/docker-compose.yml` - Service orchestration

### Frequently Modified
- `packages/flrts-nlp/src/prompts/*` - Prompt tuning
- `packages/web-ui/components/*` - UI updates
- `tests/fixtures/*` - Test data

### Auto-Generated (Do Not Edit)
- `*.d.ts` - TypeScript declarations
- `package-lock.json` - npm lock file
- `.next/` - Next.js build
- `coverage/` - Test coverage