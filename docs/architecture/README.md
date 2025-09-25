# FLRTS Technical Architecture Documentation

## Document Structure

This architecture documentation provides comprehensive technical guidance for
building and maintaining the FLRTS system integrated with OpenProject.

### 📐 [Architecture Overview](./architecture-overview.md)

- Executive summary and principles
- High-level system architecture diagram
- Service descriptions and responsibilities
- Data models and API specifications
- Deployment and security architecture
- Monitoring and observability strategy

### 🛠️ [Implementation Guide](./implementation-guide.md)

- Detailed repository structure
- Service implementation patterns
- Code examples for core functionality
- API gateway configuration
- Database schemas and migrations
- Testing strategies
- CI/CD pipeline setup
- Performance optimizations

### 💻 [Technology Stack](./tech-stack.md)

- Core technology choices and rationale
- Framework and library selections
- Version management strategy
- Performance targets
- License compliance
- Cost analysis
- Future technology roadmap

### 📁 [Source Tree Documentation](./source-tree.md)

- Complete directory structure
- Package organization
- File naming conventions
- Import path aliases
- Critical files identification
- Development workflow files

### 📝 [Coding Standards](./coding-standards.md)

- TypeScript best practices
- API design patterns
- Testing standards
- React/Next.js guidelines
- Security requirements
- Git commit conventions
- Performance guidelines
- Documentation standards

## Quick Reference

### Key Architectural Decisions

| Decision             | Choice                    | Rationale                                              |
| -------------------- | ------------------------- | ------------------------------------------------------ |
| **Backend Platform** | OpenProject API v3        | Enterprise features, custom fields, team collaboration |
| **NLP Engine**       | OpenAI GPT-4o             | Quality, ease of integration, rapid development        |
| **Architecture**     | Microservices in Monorepo | Service isolation with coordinated deployment          |
| **Primary Language** | TypeScript                | Type safety across full stack                          |
| **Database**         | SQLite → PostgreSQL       | Simple start, clear migration path                     |
| **Deployment**       | Docker + Kubernetes       | Industry standard, scalable                            |

### Service Endpoints

| Service             | Port | Purpose                        |
| ------------------- | ---- | ------------------------------ |
| NLP Service         | 3000 | Natural language parsing       |
| OpenProject Gateway | 3001 | OpenProject API integration    |
| Preference Service  | 3002 | User preferences and analytics |
| Web UI              | 3003 | Next.js application            |
| Telegram Bot        | 3004 | Telegram Mini App              |

### Development Commands

```bash
# Setup development environment
npm install
npm run setup

# Start all services
docker-compose up

# Run tests
npm test
npm run test:integration
npm run test:e2e

# Build for production
npm run build
docker-compose -f docker-compose.supabase.yml build

## Supabase-Only Architecture Links

- ADRs
  - [ADR-001: n8n Deployment Mode](./adr/ADR-001-n8n-deployment-mode.md)
  - [ADR-002: OpenProject Migration Pattern](./adr/ADR-002-openproject-migration-pattern.md)
  - [ADR-003: Supabase Connection Pooling](./adr/ADR-003-supabase-connection-pooling.md)
  - [ADR-005: MVP Scope Reduction](./adr/ADR-005-mvp-scope-reduction.md)
- [System Connections & Health](./system-connections.md)

# Deploy to production
npm run deploy:prod
```

## Architecture Principles

1. **API-First Design**: All functionality exposed through documented REST APIs
2. **Schema-Driven Development**: Zod schemas define contracts between services
3. **Fail-Safe Defaults**: System degrades gracefully when external services
   unavailable
4. **Security by Design**: Zero-trust architecture with encrypted communication
5. **Observable Systems**: Comprehensive logging, metrics, and distributed
   tracing

## Reading Guide

### For Different Roles

**Backend Developers**

1. Start with [Implementation Guide](./implementation-guide.md) for service
   patterns
2. Review [Coding Standards](./coding-standards.md) for best practices
3. Reference [Source Tree](./source-tree.md) for file organization

**Frontend Developers**

1. Review [Source Tree](./source-tree.md) Web UI section
2. Study [Coding Standards](./coding-standards.md) React/Next.js section
3. Check [Tech Stack](./tech-stack.md) for UI libraries

**DevOps Engineers**

1. Focus on [Architecture Overview](./architecture-overview.md) Deployment
   section
2. Review [Implementation Guide](./implementation-guide.md) CI/CD pipeline
3. Study monitoring setup in [Architecture Overview](./architecture-overview.md)

**Architects & Tech Leads**

1. Start with [Architecture Overview](./architecture-overview.md)
2. Review [Tech Stack](./tech-stack.md) for technology decisions
3. Evaluate future roadmap in [Tech Stack](./tech-stack.md)

## Integration Points

### OpenProject API

- REST API v3 for work package management
- Custom fields for mining-specific metadata
- OAuth 2.0 for authentication
- Webhook support for real-time updates

### External Services

- **OpenAI GPT-4o**: Natural language parsing
- **Google Cloud Speech**: Voice recognition
- **Redis**: Caching and session management
- **Telegram Bot API**: Mobile interface

## Performance Targets

| Metric        | Target          | Measurement          |
| ------------- | --------------- | -------------------- |
| API Response  | < 200ms p95     | Prometheus metrics   |
| Parse Time    | < 2s            | OpenAI response time |
| Task Creation | < 5s end-to-end | User experience      |
| Availability  | 99.9%           | Uptime monitoring    |

## Security Considerations

- All services communicate over TLS 1.3
- API authentication via OpenProject tokens
- Rate limiting on all public endpoints
- Input validation with Zod schemas
- Audit logging for all operations
- GDPR-compliant data handling

## Maintenance and Updates

### Version Strategy

- Semantic versioning for all packages
- API versioning via URL path (/v1, /v2)
- Database migrations with version control
- Blue-green deployments for zero downtime

### Monitoring

- Prometheus for metrics collection
- Grafana for visualization
- OpenTelemetry for distributed tracing
- Sentry for error tracking

## Contact and Support

For architecture questions or decisions requiring review:

- Create an issue in the GitHub repository
- Tag with `architecture` label
- Include context and proposed changes
- Request review from tech lead

## Related Documentation

- [Product Requirements Document (PRD)](../prd/)
- [Project Brief](../brief.md)
- [API Documentation](../api/) (generated)
- [User Guide](../user-guide/) (future)
