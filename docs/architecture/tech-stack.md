# FLRTS Technology Stack

## Core Technologies

### Runtime & Language
- **Node.js 20 LTS** - JavaScript runtime with native TypeScript support
- **TypeScript 5.3** - Type safety and modern JavaScript features
- **Bun** (alternative) - Fast all-in-one JavaScript runtime for development

### Frameworks

#### Backend Services
- **Express.js 4.18** - Minimalist web framework for REST APIs
- **Fastify** (alternative) - High-performance alternative to Express
- **Socket.io 4.6** - Real-time bidirectional communication

#### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI component library
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **shadcn/ui** - Accessible component library

#### CLI & Bot
- **Commander.js** - CLI framework
- **Telegraf 4.15** - Telegram bot framework
- **Ink 3** - React for CLI interfaces

### AI & NLP

#### Primary
- **OpenAI SDK 4.x** - GPT-4o integration
- **Google Cloud Speech-to-Text** - Voice recognition
- **Langchain.js** (future) - LLM orchestration

#### Alternatives Evaluated
- **SpaCy** (via Python bridge) - Local NLP processing
- **Ollama** - Local LLM deployment
- **Whisper** - Local speech recognition

### Data Layer

#### Databases
- **Supabase PostgreSQL 16+** - Single database instance shared by all services
  - OpenProject connects directly via DATABASE_URL (Session Mode, port 5432)
  - FLRTS stores metadata only (conversations, preferences)
  - Business data in separate schema
  - **NO SYNCHRONIZATION NEEDED** - Single source of truth
- **Redis 7** - Caching and session management (containerized)
- **SQLite 3** - Local development only

#### ORMs & Query Builders
- **Prisma 5** - Type-safe database client (FLRTS metadata)
- **Drizzle ORM** (alternative) - Lightweight TypeScript ORM
- **Knex.js** - SQL query builder for migrations
- **OpenProject ORM** - Rails ActiveRecord (internal to OpenProject)

### Validation & Schemas
- **Zod 3.22** - Runtime type validation
- **OpenAPI 3.1** - API documentation
- **JSON Schema** - Configuration validation

### External APIs
- **OpenProject REST API v3** - FLRTS interacts via API, not database
- **OpenAI API** - Natural language processing for FLRTS
- **Google Cloud APIs** - Speech services (future)
- **Telegram Bot API** - Messaging interface
- **Supabase API** - FLRTS metadata operations only
- **n8n Cloud API** - Workflow automation and webhooks

### Infrastructure

#### Containerization
- **Docker 24** - Container runtime
- **Docker Compose 2.23** - Single-VM multi-container orchestration

#### Networking & Security
- **Cloudflare Tunnel** - Zero-trust secure access (no open ports)
- **Nginx 1.25** - Internal reverse proxy and static serving
- **Docker Networks** - Container-to-container communication

#### Message Queue
- **Bull 4.12** - Redis-based queue for job processing
- **BullMQ** (alternative) - Modern rewrite of Bull
- **RabbitMQ** (future) - Advanced message broker

### Development Tools

#### Build Tools
- **Vite 5** - Fast build tool for web UI
- **esbuild** - Fast JavaScript bundler
- **Turbo** - Monorepo build system

#### Code Quality
- **ESLint 8** - JavaScript linting
- **Prettier 3** - Code formatting
- **Husky 8** - Git hooks
- **lint-staged** - Run linters on staged files

#### Testing
- **Jest 29** - Unit testing framework
- **Supertest** - API integration testing
- **Playwright** - E2E browser testing
- **Vitest** (alternative) - Fast unit testing

#### Documentation
- **TypeDoc** - TypeScript documentation generator
- **Swagger UI** - Interactive API documentation
- **Mermaid** - Diagram generation
- **Docusaurus** (future) - Documentation website

### Monitoring & Observability

#### Metrics
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **OpenTelemetry** - Distributed tracing

#### Logging
- **Winston** - Node.js logging
- **Pino** (alternative) - Fast JSON logger
- **ELK Stack** (production) - Log aggregation

#### Error Tracking
- **Sentry** - Error monitoring
- **Rollbar** (alternative) - Error tracking

### Security

#### Authentication
- **Passport.js** - Authentication middleware
- **JWT** - Token-based auth
- **OAuth 2.0** - OpenProject integration

#### Security Tools
- **Helmet.js** - Security headers
- **bcrypt** - Password hashing
- **rate-limiter-flexible** - Rate limiting
- **CORS** - Cross-origin resource sharing

### DevOps

#### CI/CD
- **GitHub Actions** - CI/CD pipelines
- **Dependabot** - Dependency updates
- **Renovate** (alternative) - Automated updates

#### Configuration
- **dotenv** - Environment variables
- **node-config** - Configuration management
- **Vault** (future) - Secret management

### Package Management
- **npm 10** - Package manager
- **npm workspaces** - Monorepo management
- **pnpm** (alternative) - Fast, disk-efficient package manager

## Technology Decision Matrix

| Category | Primary Choice | Rationale | Alternatives |
|----------|---------------|-----------|--------------|
| Runtime | Node.js 20 LTS | Stability, TypeScript support, ecosystem | Bun (speed), Deno (security) |
| Web Framework | Express.js | Maturity, middleware ecosystem | Fastify (performance), Koa (modern) |
| Database | Supabase PostgreSQL 16+ | Single instance, no sync complexity, direct OpenProject support | Self-hosted PostgreSQL |
| Object Storage | Cloudflare R2 | S3-compatible, cost-effective | AWS S3, MinIO |
| Cache | Redis | Performance, pub/sub support | Memcached, KeyDB |
| Queue | Bull | Redis integration, reliability | BullMQ, RabbitMQ |
| AI/NLP | OpenAI GPT-4o | Quality, ease of integration | Local LLMs, Azure OpenAI |
| Frontend | Next.js 14 | Full-stack, performance | Remix, Astro |
| CSS | Tailwind CSS | Rapid development, consistency | CSS Modules, styled-components |
| Testing | Jest | Comprehensive, wide support | Vitest, Mocha |
| Container | Docker | Industry standard | Podman, containerd |
| Monitoring | Prometheus + Grafana | Open source, powerful | DataDog, New Relic |

## Version Management Strategy

### Dependency Updates
- **Security patches**: Applied immediately
- **Minor updates**: Monthly review and update
- **Major updates**: Quarterly evaluation

### Node.js Version Policy
- Use latest LTS version
- Update within 3 months of new LTS release
- Maintain compatibility with previous LTS

### API Versioning
- Semantic versioning for all packages
- API endpoints versioned via URL path (/v1, /v2)
- Deprecation notices 3 months before removal

## Performance Targets

| Metric | Target | Current | Tools |
|--------|--------|---------|-------|
| API Response Time | < 200ms p95 | - | Express + Redis cache |
| OpenAI Parse Time | < 2s | - | GPT-4o with streaming |
| Database Query | < 50ms | - | Indexed SQLite/PostgreSQL |
| Frontend Load | < 1s FCP | - | Next.js with SSG |
| WebSocket Latency | < 100ms | - | Socket.io with sticky sessions |
| Memory Usage | < 512MB per service | - | Node.js with --max-old-space-size |

## License Compliance

All dependencies are compatible with MIT license:
- ✅ Production dependencies: MIT, Apache 2.0, BSD
- ✅ No GPL or AGPL dependencies in production
- ✅ OpenProject integration via API (no license conflict)

## Cost Analysis

### Monthly Operating Costs (Estimated)

| Service | Usage | Cost |
|---------|-------|------|
| OpenAI GPT-4o | 50 tasks/day × 500 tokens | $5-10 |
| Google Speech API | 100 minutes/month (future) | $2-5 |
| Digital Ocean VM | s-4vcpu-8gb (4GB RAM minimum) | $48 |
| Supabase PostgreSQL | Pro tier (single instance for all) | $25 |
| Cloudflare R2 | 100GB storage + bandwidth | $5 |
| Redis (containerized) | Included in VM | $0 |
| **Total** | | **$85-93/month** |

### Development Costs

| Resource | Time | Cost |
|----------|------|------|
| Initial Development | 12 weeks | Internal |
| npm packages | All open source | $0 |
| Development tools | VS Code, GitHub | $0 |
| Testing infrastructure | GitHub Actions free tier | $0 |

## Future Technology Considerations

### Near-term (3-6 months)
- **Bun runtime** for 2-3x performance improvement
- **Drizzle ORM** for better TypeScript integration
- **tRPC** for type-safe API communication

### Medium-term (6-12 months)
- **Local LLM** option via Ollama
- **Vector database** (Pinecone/Weaviate) for semantic search
- **GraphQL** API alongside REST

### Long-term (12+ months)
- **Rust** services for performance-critical paths
- **WebAssembly** for client-side NLP
- **Kubernetes** operators for auto-scaling