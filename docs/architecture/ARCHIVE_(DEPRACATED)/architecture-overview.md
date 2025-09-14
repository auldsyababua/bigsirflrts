# FLRTS Technical Architecture Document

## Executive Summary

FLRTS (Fast Low-friction Repeatable Task System) is a containerized natural language processing layer built on top of OpenProject, deployed on Digital Ocean VMs with Docker containers. The architecture prioritizes rapid deployment, maintainability, and OpenProject integration while delivering sub-200ms response times for task creation operations. The system leverages OpenAI's GPT-4o for intent parsing, OpenProject's REST API v3 for work package management, Supabase PostgreSQL for application data, and provides web and Telegram interfaces via n8n workflow automation.

## Architecture Principles

1. **VM-First Design**: Reliable Digital Ocean VM deployment with proven performance characteristics
2. **OpenProject Integration**: Direct integration with OpenProject Community Edition without modification
3. **Container Orchestration**: Docker Compose for simple, maintainable service orchestration
4. **Zero-Trust Security**: Cloudflare Tunnel eliminates need for open ports or VPN access
5. **Managed Database**: Supabase provides secure, scalable PostgreSQL with Row Level Security
6. **Fail-Safe Defaults**: Graceful degradation when external services are unavailable
7. **Cost-Conscious**: Optimized for ~$75/month total infrastructure costs

## High-Level System Architecture

```mermaid
graph TB
    subgraph "User Interfaces"
        UI[Web UI]
        TG[Telegram Bot]
        N8N[n8n Webhooks]
    end
    
    subgraph "Cloudflare Security Layer"
        CF[Cloudflare Edge]
        TUNNEL[Cloudflare Tunnel]
        DDoS[DDoS Protection]
        WAF[Web Application Firewall]
    end
    
    subgraph "Digital Ocean VM (NYC3 - s-4vcpu-8gb)"
        subgraph "Docker Services"
            NGINX[Nginx Gateway]
            NLP[NLP Service]
            API[API Service]
            CACHE[Redis Cache]
        end
        
        subgraph "OpenProject Stack"
            OP[OpenProject Community]
            OPDB[OpenProject PostgreSQL]
        end
    end
    
    subgraph "External Managed Services"
        OPENAI[OpenAI GPT-4o]
        SUPA[Supabase PostgreSQL us-east-2]
        R2[Cloudflare R2 Storage]
    end
    
    UI --> CF
    TG --> CF
    N8N --> CF
    CF --> DDoS
    DDoS --> WAF
    WAF --> TUNNEL
    TUNNEL --> NGINX
    
    NGINX --> NLP
    NGINX --> API
    NGINX --> OP
    
    NLP --> OPENAI
    NLP --> CACHE
    API --> SUPA
    API --> OP
    
    OP --> OPDB
    OP --> R2
```

## Service Architecture

### 1. NLP Service (Node.js/TypeScript)
**Container**: `flrts/nlp-service:latest`
**Resource Allocation**: 1GB RAM, 0.5 vCPU
**Key Components**:
- OpenAI GPT-4o structured output client
- Single-prompt CRUD operation parsing
- Team member entity recognition and timezone conversion
- Redis caching for OpenAI response optimization
- Request rate limiting (5 concurrent parse requests per user)

**API Endpoints**:
- `POST /parse` - Parse natural language to OpenProject work package structure
- `POST /validate` - Validate parsed structure against OpenProject API schema
- `GET /health` - Container health check

### 2. API Service (Node.js/TypeScript)
**Container**: `flrts/api-service:latest`
**Resource Allocation**: 512MB RAM, 0.25 vCPU
**Key Components**:
- OpenProject API v3 client with authentication
- Supabase client with Row Level Security integration
- User preferences and team member management
- Audit logging and request correlation
- Error handling with fallback mechanisms

**API Endpoints**:
- `POST /workpackages` - Create OpenProject work package
- `GET /workpackages` - List work packages with filters
- `GET /projects` - Fetch available OpenProject projects
- `GET /users` - Retrieve team members from OpenProject
- `GET /preferences/:userId` - Get user preferences (Supabase)
- `PUT /preferences/:userId` - Update user preferences

### 3. Nginx Gateway
**Container**: `nginx:alpine`
**Resource Allocation**: 256MB RAM, 0.125 vCPU
**Key Components**:
- Reverse proxy for all internal services
- SSL termination (managed by Cloudflare)
- Request routing and load balancing
- Static file serving for web UI
- Health check aggregation endpoint

### 4. OpenProject Community Edition
**Container**: `openproject/community:14`
**Resource Allocation**: 4GB RAM, 2 vCPU
**Key Components**:
- Work package and project management
- User authentication and RBAC
- REST API v3 for external integrations
- File attachment handling via R2 S3 API
- PostgreSQL 15 database

**Performance Configuration**:
```yaml
OPENPROJECT_WEB_WORKERS: "2"         # 2 workers for 4 vCPU VM
OPENPROJECT_WEB_MIN_THREADS: "4"     # 4 threads per worker
OPENPROJECT_WEB_MAX_THREADS: "8"     # Max 8 threads per worker
OPENPROJECT_WEB_TIMEOUT: "30"        # 30 second timeout
```

### 5. Redis Cache
**Container**: `redis:7-alpine`
**Resource Allocation**: 256MB RAM, 0.125 vCPU
**Key Components**:
- OpenAI response caching (TTL: 5 minutes)
- Session storage for web UI
- LRU eviction policy for memory management
- Persistence disabled (cache-only usage)

## Data Models

### Core Schemas (Zod TypeScript)

```typescript
// Parsed Task Schema for OpenProject API v3 Integration
const ParsedTaskSchema = z.object({
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LIST']),
  workPackage: z.object({
    subject: z.string().min(1).max(255),
    description: z.string().optional(),
    assignee: z.object({
      href: z.string().url() // /api/v3/users/{id}
    }).optional(),
    project: z.object({
      href: z.string().url() // /api/v3/projects/{id}
    }),
    type: z.object({
      href: z.string().url() // /api/v3/types/{id}
    }),
    startDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    priority: z.object({
      href: z.string().url() // /api/v3/priorities/{id}
    }).optional(),
    customFields: z.array(z.object({
      href: z.string().url(),
      value: z.any()
    })).optional()
  }),
  metadata: z.object({
    confidence: z.number().min(0).max(1),
    timezone: z.string(), // IANA timezone (e.g., America/Los_Angeles)
    originalInput: z.string(),
    parseTime: z.number(),
    requestId: z.string().uuid()
  })
});

// Team Member Schema (Supabase Table)
const TeamMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()),
  timezone: z.enum([
    'America/Los_Angeles',  // PST
    'America/Chicago',      // CST
    'America/New_York'      // EST
  ]),
  openproject_user_id: z.string(),
  default_project_ids: z.array(z.string()),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Mining Operation Context (Custom Fields)
const MiningContextSchema = z.object({
  facility_id: z.string(),
  equipment_type: z.enum(['ASIC', 'GPU', 'Infrastructure', 'Network', 'Cooling']),
  maintenance_type: z.enum(['Preventive', 'Corrective', 'Emergency', 'Upgrade']),
  downtime_impact: z.enum(['None', 'Partial', 'Full']),
  estimated_hours: z.number().positive().optional(),
  priority_multiplier: z.number().min(0.5).max(2.0).default(1.0)
});
```

## Deployment Architecture

### Digital Ocean VM Configuration

**Production Specification** (Based on Research):
- **Droplet**: s-4vcpu-8gb (NYC3 region for optimal Supabase latency)
- **CPU**: 4 vCPU cores
- **Memory**: 8GB RAM
- **Storage**: 160GB SSD
- **Network**: 5TB monthly transfer
- **Cost**: $48/month

**Performance Justification**:
- NYC3 to Supabase us-east-2: 2-5ms latency
- OpenProject minimum requirements: 2 vCPU, 4GB RAM
- Additional headroom for NLP service and caching

### Docker Compose Architecture

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - nlp-service
      - api-service
      - openproject

  nlp-service:
    image: flrts/nlp-service:latest
    restart: unless-stopped
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - MAX_CONCURRENT_REQUESTS=5
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - redis

  api-service:
    image: flrts/api-service:latest
    restart: unless-stopped
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - OPENPROJECT_URL=http://openproject:8080
      - OPENPROJECT_API_KEY=${OPENPROJECT_API_KEY}
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - openproject
      - supabase-proxy

  openproject:
    image: openproject/community:14
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://openproject:${OPENPROJECT_DB_PASSWORD}@openproject-db:5432/openproject
      - SECRET_KEY_BASE=${OPENPROJECT_SECRET_KEY}
      - OPENPROJECT_HOST__NAME=${DOMAIN_NAME}
      - OPENPROJECT_HTTPS=false  # Terminated at Cloudflare
      
      # File Storage (Cloudflare R2 via S3 API)
      - OPENPROJECT_ATTACHMENTS__STORAGE=fog
      - OPENPROJECT_FOG_DIRECTORY=openproject-files
      - OPENPROJECT_FOG_CREDENTIALS_PROVIDER=aws
      - OPENPROJECT_FOG_CREDENTIALS_AWS_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - OPENPROJECT_FOG_CREDENTIALS_AWS_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - OPENPROJECT_FOG_CREDENTIALS_REGION=auto
      - OPENPROJECT_FOG_CREDENTIALS_ENDPOINT=${R2_ENDPOINT}
      
      # Performance Tuning
      - OPENPROJECT_WEB_WORKERS=2
      - OPENPROJECT_WEB_MIN_THREADS=4
      - OPENPROJECT_WEB_MAX_THREADS=8
      - OPENPROJECT_WEB_TIMEOUT=30
    volumes:
      - openproject-data:/var/openproject/assets
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health_checks/default"]
      interval: 60s
      timeout: 30s
      retries: 3
      start_period: 300s
    depends_on:
      - openproject-db

  openproject-db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=openproject
      - POSTGRES_USER=openproject
      - POSTGRES_PASSWORD=${OPENPROJECT_DB_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - openproject-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openproject -d openproject"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  openproject-data:
  openproject-db-data:
  redis-data:

networks:
  default:
    driver: bridge
```

### Container Resource Allocation

| Service | Memory | CPU | Justification |
|---------|--------|-----|---------------|
| OpenProject | 4GB | 2.0 | Primary application, handles web UI and API |
| OpenProject DB | 2GB | 1.0 | PostgreSQL with moderate concurrent users |
| NLP Service | 1GB | 0.5 | OpenAI API calls and caching |
| API Service | 512MB | 0.25 | Lightweight proxy and data transformation |
| Nginx | 256MB | 0.125 | Static files and reverse proxy |
| Redis | 256MB | 0.125 | Cache-only, no persistence |
| **Total** | **8GB** | **4.0** | Matches VM specification exactly |

## Network Architecture & Security

### Cloudflare Tunnel Configuration

**Zero-Trust Access Pattern**:
- No open ports on Digital Ocean VM
- All traffic routed through Cloudflare's global network
- DDoS protection and WAF at edge
- Automatic SSL certificate management

**Tunnel Setup**:
```yaml
# cloudflared configuration
tunnel: <tunnel-uuid>
credentials-file: /etc/cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: flrts.your-domain.com
    service: http://nginx:80
  - hostname: openproject.your-domain.com
    service: http://openproject:8080
  - service: http_status:404
```

**Docker Integration**:
```yaml
# Add to docker-compose.yml
cloudflared:
  image: cloudflare/cloudflared:latest
  restart: unless-stopped
  command: tunnel --no-autoupdate run
  environment:
    - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
  networks:
    - default
```

### Security Architecture

**Defense in Depth Strategy**:

1. **Perimeter Security** (Cloudflare)
   - DDoS protection (L3/L4/L7)
   - Web Application Firewall (WAF)
   - Rate limiting and bot management
   - Geographic access controls

2. **Network Security** (VM + Docker)
   - No exposed ports (Cloudflare Tunnel only)
   - Docker network isolation
   - Container-to-container communication via internal network
   - Automatic security updates enabled

3. **Application Security** (OpenProject + FLRTS)
   - OpenProject's built-in RBAC system
   - API key-based authentication
   - Request correlation and audit logging
   - Input validation with Zod schemas

4. **Data Security** (Supabase + PostgreSQL)
   - Row Level Security (RLS) policies
   - Encrypted connections (TLS 1.3)
   - Encrypted at rest (Supabase managed)
   - Regular automated backups

**Authentication & Authorization Flow**:

```mermaid
sequenceDiagram
    participant User
    participant FLRTS
    participant OpenProject
    participant Supabase
    
    User->>FLRTS: Parse Request + OpenProject API Key
    FLRTS->>OpenProject: Validate API Key & Get User Context
    OpenProject->>FLRTS: User Info + Permissions
    FLRTS->>Supabase: Query User Preferences (RLS Applied)
    Supabase->>FLRTS: User-Specific Data
    FLRTS->>OpenAI: Parse with Context
    OpenAI->>FLRTS: Structured Output
    FLRTS->>OpenProject: Create Work Package
    OpenProject->>FLRTS: Work Package Created
    FLRTS->>User: Confirmation Response
```

### Database Strategy

**OpenProject Database** (Container):
- PostgreSQL 15 dedicated to OpenProject
- Contains projects, work packages, users, permissions
- Managed entirely by OpenProject (no direct access)
- Daily automated backups via Digital Ocean

**Application Database** (Supabase):
- Team member preferences and timezone data
- Usage analytics and audit logs  
- n8n workflow configurations
- Parsed task cache and user sessions

**Row Level Security Policies** (Supabase):
```sql
-- Team members can only see their own preferences
CREATE POLICY "Users can view own preferences" ON team_members
  FOR SELECT USING (auth.uid()::text = openproject_user_id);

-- Audit logs are append-only and user-scoped
CREATE POLICY "Users can insert own audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
```

## Integration Patterns

### n8n Webhook Architecture

**Workflow Trigger Patterns**:

1. **Telegram Bot Integration**:
   ```javascript
   // n8n Webhook Node → NLP Service
   {
     "trigger": "telegram",
     "user_id": "telegram_user_123",
     "message": "Hey Taylor, check server logs by 3pm",
     "context": {
       "chat_id": "-1001234567890",
       "message_id": 456
     }
   }
   ```

2. **Email Integration**:
   ```javascript
   // Email Parser → n8n → FLRTS
   {
     "trigger": "email",
     "user_id": "email_user_456", 
     "message": "Colin needs mining reports by EOD",
     "context": {
       "from": "joel@company.com",
       "subject": "Task Assignment"
     }
   }
   ```

3. **Slack/Discord Integration**:
   ```javascript
   // Webhook → n8n → FLRTS
   {
     "trigger": "slack",
     "user_id": "slack_U123456",
     "message": "@taylor server maintenance tonight",
     "context": {
       "channel": "C1234567890",
       "thread_ts": "1234567890.123456"
     }
   }
   ```

### API Rate Limiting & Throttling

**Per-Service Limits**:
- OpenAI API: 500 tokens/minute per user
- OpenProject API: 60 requests/minute per user (aligned with OP limits)
- FLRTS Parse Endpoint: 5 concurrent requests per user
- Supabase: Connection pooling with 10 max connections per service

**Circuit Breaker Pattern**:
```typescript
// Implemented in NLP Service
const circuitBreaker = new CircuitBreaker(openaiClient.parse, {
  timeout: 10000,        // 10 second timeout
  errorThresholdPercentage: 50,  // Open circuit at 50% error rate
  resetTimeout: 30000    // Try again after 30 seconds
});
```

## Monitoring & Observability

### Health Monitoring Strategy

**Container Health Checks**:
```yaml
# Comprehensive health check matrix
Services:
  nginx: HTTP 200 on /health (aggregated status)
  nlp-service: HTTP 200 on /health + OpenAI connectivity
  api-service: HTTP 200 on /health + Supabase connectivity  
  openproject: HTTP 200 on /health_checks/default
  openproject-db: pg_isready command
  redis: redis-cli ping command
```

**Health Check Aggregation**:
```nginx
# Nginx health endpoint
location /health {
  access_log off;
  add_header Content-Type application/json;
  return 200 '{"status":"ok","timestamp":"$time_iso8601","services":{"nlp":"$upstream_status_nlp","api":"$upstream_status_api","openproject":"$upstream_status_op"}}';
}
```

### Application Metrics

**Key Performance Indicators**:
- **Parse Accuracy**: % of successful OpenAI→OpenProject conversions
- **Response Time**: 95th percentile end-to-end latency
- **Error Rate**: % of requests resulting in 5xx errors  
- **OpenAI Usage**: Token consumption and cost tracking
- **Work Package Creation**: Success rate and volume

**Docker Logging Configuration**:
```yaml
logging:
  driver: "json-file" 
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service,version"
```

**Structured Log Format**:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO",
  "service": "nlp-service",
  "version": "1.0.0",
  "request_id": "req_123456789",
  "user_id": "user_openproject_42",
  "action": "parse_complete",
  "duration_ms": 1247,
  "openai_tokens": 156,
  "confidence": 0.94,
  "metadata": {
    "operation": "CREATE",
    "project_id": "123",
    "assignee": "taylor"
  }
}
```

### Alerting Strategy

**Critical Alerts** (Immediate Response):
- Any service container stops or becomes unhealthy
- OpenProject API authentication failures
- Supabase connection errors
- Disk usage >90%
- Memory usage >95%

**Warning Alerts** (24-hour Response):
- High OpenAI response times (>3s average)
- Parse accuracy <90% over 1-hour window
- Error rate >5% for any service
- Unusual traffic patterns or potential abuse

**Monitoring Integration**:
- **Docker Stats**: Built-in container resource monitoring
- **Uptime Robot**: External service availability monitoring  
- **Supabase Dashboard**: Database performance and query analytics
- **Cloudflare Analytics**: Traffic patterns and security events

## Cost Structure & Total Cost of Ownership

### Infrastructure Costs (Monthly)

| Component | Service | Cost |
|-----------|---------|------|
| **Compute** | Digital Ocean s-4vcpu-8gb | $48.00 |
| **Database** | Supabase Pro Plan | $25.00 |
| **Storage** | Cloudflare R2 (estimated) | $2.00 |
| **Network** | Cloudflare Tunnel (Free tier) | $0.00 |
| **DNS** | Cloudflare DNS (Free tier) | $0.00 |
| **SSL** | Cloudflare SSL (Free tier) | $0.00 |
| **Monitoring** | Uptime Robot (Free tier) | $0.00 |
| **Total Infrastructure** | | **$75.00** |

### Operational Costs (Monthly)

| Component | Estimated Usage | Cost |
|-----------|-----------------|------|
| **OpenAI API** | 50,000 tokens/month | $5.00 |
| **Additional R2 Storage** | 10GB growth/month | $0.15 |
| **Domain Registration** | Annual cost amortized | $1.00 |
| **Total Operational** | | **$6.15** |

**Total Monthly Cost**: ~$81/month
**Annual Cost**: ~$975/year

### Scaling Cost Projections

**At 100 Daily Tasks** (Current):
- OpenAI: ~$5/month (current estimate)
- Infrastructure: $75/month
- **Total: $80/month**

**At 500 Daily Tasks** (5x Growth):
- OpenAI: ~$25/month
- Infrastructure: $75/month (same VM handles this easily)
- **Total: $100/month**

**At 2000 Daily Tasks** (20x Growth):
- OpenAI: ~$100/month
- Infrastructure: $90/month (upgrade to s-8vcpu-16gb)
- **Total: $190/month**

## Technology Stack Summary

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| **Deployment** | Digital Ocean Droplet | s-4vcpu-8gb | Proven performance, optimal Supabase latency |
| **Container Orchestration** | Docker Compose | 3.8 | Simple, reliable, perfect for single-VM deployment |
| **Project Management** | OpenProject Community | 14.x | Open-source, API-driven, no licensing costs |
| **Application Database** | Supabase PostgreSQL | Latest | Managed service, RLS security, excellent developer experience |
| **OpenProject Database** | PostgreSQL | 15 | Required by OpenProject, containerized |
| **Cache Layer** | Redis | 7-alpine | Fast caching, minimal resource usage |
| **File Storage** | Cloudflare R2 | Latest | S3-compatible, cost-effective for attachments |
| **Reverse Proxy** | Nginx | Alpine | Lightweight, reliable, battle-tested |
| **Secure Access** | Cloudflare Tunnel | Latest | Zero-trust networking, no VPN or open ports needed |
| **Runtime** | Node.js | 20 LTS | Long-term support, excellent TypeScript ecosystem |
| **API Framework** | Express.js | Latest | Minimal, fast, well-documented |
| **Schema Validation** | Zod | Latest | Runtime type safety, OpenProject API compatibility |
| **AI Integration** | OpenAI GPT-4o | Latest | Structured output, reliable parsing, cost-effective |
| **Workflow Automation** | n8n | Latest | Visual workflow builder, extensive integrations |
| **SSL/Security** | Cloudflare | Latest | Managed certificates, DDoS protection, WAF |

## Disaster Recovery & Business Continuity

### Backup Strategy

**Automated Daily Backups**:
1. **OpenProject Database**: Digital Ocean automated snapshots + pg_dump
2. **Supabase**: Automatic point-in-time recovery (managed)
3. **Configuration**: Git repository with all Docker configs
4. **File Storage**: Cloudflare R2 built-in durability (99.999999999%)

**Recovery Time Objectives**:
- **RTO** (Recovery Time): 30 minutes for full system restoration
- **RPO** (Recovery Point): Maximum 24 hours of data loss
- **Service Restoration**: New VM deployment from backup in <1 hour

### Operational Runbooks

**System Recovery Process**:
1. Deploy new Digital Ocean VM from snapshot
2. Install Docker and restore configuration from Git
3. Run `docker-compose up -d` with restored environment variables  
4. Verify all health checks pass
5. Update Cloudflare Tunnel configuration if needed

**Zero-Downtime Deployment Strategy**:
- Use Docker image tags for versioning
- Rolling updates with health check validation
- Immediate rollback capability via previous image tags
- Database migrations run automatically on container startup

## Conclusion

This architecture provides a robust, cost-effective foundation for the FLRTS system that:

- **Eliminates the impossible**: Removes all references to Cloudflare Workers deployment
- **Embraces OpenProject**: Full integration with OpenProject Community Edition
- **Ensures Security**: Zero-trust architecture with Cloudflare Tunnel
- **Optimizes Costs**: ~$75/month total infrastructure costs
- **Scales Pragmatically**: Clear upgrade paths for increased usage
- **Maintains Simplicity**: Docker Compose over complex orchestration
- **Provides Reliability**: Multiple layers of redundancy and monitoring

The system is designed for rapid deployment, easy maintenance, and linear cost scaling as the mining operation grows.