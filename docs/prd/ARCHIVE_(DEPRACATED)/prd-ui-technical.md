# FLRTS PRD - UI Design Goals & Technical Assumptions

## User Interface Design Goals

### Overall UX Vision

The interface prioritizes speed and minimal friction above all else. Every interaction should feel like talking to a highly competent assistant who understands context, handles complexity behind the scenes, and never requires users to think about system mechanics. The UI disappears into the workflow - field operators can create tasks while wearing gloves, executives can delegate during calls, and everyone can work in their preferred environment without switching contexts.

### Key Interaction Paradigms

- **Conversational First**: All interactions begin with natural language - no forms, dropdowns, or date pickers as primary input
- **Confirmation-Before-Action**: Every parsed command shows a preview in structured format before execution
- **Progressive Disclosure**: Simple commands work immediately, advanced options appear only when needed
- **Multi-Modal Input**: Text, voice, slash commands, and @mentions all work interchangeably
- **Context-Aware Defaults**: System learns patterns (Taylor usually gets maintenance tasks, Colin gets technical items)

### Core Screens and Views

- **Universal Input Bar**: Persistent command bar accessible via hotkey from anywhere in OpenProject
- **Parse Confirmation Dialog**: Shows interpreted JSON with ability to edit before submission
- **Quick Task List**: Minimalist view of assigned tasks with natural language filtering
- **Voice Input Overlay**: Large-button interface for field operations with visual feedback
- **Telegram Mini App**: Chat-based interface with inline previews and quick actions
- **Bulk Operations View**: Table for reviewing/editing multiple parsed tasks before batch creation
- **Settings Panel**: Timezone preferences, voice settings, and OpenProject project mappings

### Accessibility: WCAG AA

- High contrast mode for bright outdoor environments at mining facilities
- Voice-first navigation for hands-free operation
- Keyboard shortcuts for all actions
- Screen reader compatible confirmation dialogs

### Branding

- Maintain OpenProject's visual consistency when embedded
- FLRTS-specific elements use industrial design language reflecting mining operations
- Monospace fonts for parsed output to ensure clarity
- Status indicators use traffic light colors consistent with mining safety standards

### Target Device and Platforms: Web Responsive

- Desktop: Full functionality with keyboard shortcuts and multi-panel views
- Tablet: Optimized for field supervisors with larger touch targets
- Mobile: Telegram Mini App for on-the-go task creation
- CLI: Terminal interface for technical team members

## Technical Assumptions

### Repository Structure: Monorepo

All FLRTS components (API service, web UI, Telegram bot, CLI) maintained in single repository for coordinated deployments and shared TypeScript types.

### Service Architecture

**Docker Compose Multi-Service Architecture** - Services deployed on Digital Ocean VM:

- **NLP Service**: Handles OpenAI integration and parsing logic (Node.js/TypeScript)
- **API Service**: Manages OpenProject API and Supabase communication (Node.js/TypeScript)  
- **OpenProject Community Edition**: Full project management platform (Docker container)
- **PostgreSQL**: Database for OpenProject (Docker container)
- **Redis Cache**: Caching layer for OpenAI responses (Docker container)
- **Nginx Gateway**: Reverse proxy and SSL termination (Docker container)
- **Cloudflare Tunnel**: Zero-trust secure access (Docker container)

### Testing Requirements

**Full Testing Pyramid**:

- **Unit Tests**: Core parsing logic, timezone conversions, API transformations (Jest, 80% coverage)
- **Integration Tests**: OpenProject API interactions, end-to-end parsing flows (Supertest)
- **E2E Tests**: Critical user journeys in each interface (Playwright for web, custom for Telegram)
- **Manual Testing Helpers**: Synthetic data generator, OpenProject sandbox reset scripts

### Additional Technical Assumptions and Requests

- **OpenAI Integration**: Single GPT-4o API call for all parsing using comprehensive prompt engineering
- **Schema Validation**: Zod for TypeScript runtime validation across all service boundaries
- **OpenProject API**: Target v3 REST API with pagination support for large result sets
- **Database**:
  - **OpenProject Database**: PostgreSQL 15 (dedicated container)
  - **Application Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: OpenProject API tokens for service-to-service, OAuth for end users
- **Deployment**: Docker Compose on Digital Ocean Droplet (s-4vcpu-8gb, $48/month)
- **Secure Access**: Cloudflare Tunnel for zero-trust networking (no open ports)
- **Monitoring**: OpenTelemetry for distributed tracing, Prometheus metrics for SLA tracking
- **Rate Limiting**: Redis-based rate limiter to protect OpenAI API quota
- **Speech-to-Text**: Google Cloud Speech-to-Text API for voice input (best accuracy for technical terms)
- **Timezone Library**: Moment.js with timezone support for reliable conversions
- **State Management**: Zustand for React client state, avoiding Redux complexity
- **API Documentation**: OpenAPI/Swagger spec auto-generated from TypeScript types
- **CI/CD**: GitHub Actions for testing, building, and deploying to production
- **Feature Flags**: LaunchDarkly or similar for gradual rollout of NLP improvements
