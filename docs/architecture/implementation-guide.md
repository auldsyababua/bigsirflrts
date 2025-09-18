# FLRTS Implementation Architecture Guide

## Repository Structure

```
bigsirflrts/
├── packages/                    # Monorepo packages (npm workspaces)
│   ├── shared/                 # Shared types and utilities
│   │   ├── src/
│   │   │   ├── schemas/       # Zod schemas
│   │   │   ├── types/         # TypeScript types
│   │   │   └── utils/         # Common utilities
│   │   └── package.json
│   │
│   ├── nlp-service/           # NLP parsing service
│   │   ├── src/
│   │   │   ├── controllers/   # Request handlers
│   │   │   ├── services/      # Business logic
│   │   │   ├── prompts/       # OpenAI prompts
│   │   │   └── index.ts       # Service entry
│   │   └── Dockerfile
│   │
│   ├── openproject-gateway/   # OpenProject integration
│   │   ├── src/
│   │   │   ├── client/        # OpenProject API client
│   │   │   ├── mappers/       # Data transformations
│   │   │   └── index.ts
│   │   └── Dockerfile
│   │
│   ├── web-ui/                # Next.js web interface
│   │   ├── app/              # App router pages
│   │   ├── components/       # React components
│   │   └── package.json
│   │
│   ├── cli/                  # CLI tool
│   │   ├── src/
│   │   │   ├── commands/     # CLI commands
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── telegram-bot/         # Telegram Mini App
│       ├── src/
│       │   ├── bot/          # Bot logic
│       │   ├── webapp/       # Mini App UI
│       │   └── index.ts
│       └── Dockerfile
│
├── infrastructure/            # Infrastructure as Code
│   ├── docker/
│   │   └── docker-compose.yml
│   ├── kubernetes/
│   │   ├── base/
│   │   └── overlays/
│   └── terraform/
│       └── modules/
│
├── scripts/                   # Build and deployment scripts
│   ├── setup.sh
│   ├── deploy.sh
│   └── test-e2e.sh
│
├── docs/                     # Documentation
│   ├── architecture/
│   ├── prd/
│   └── api/
│
└── tests/                    # E2E and integration tests
    ├── integration/
    └── e2e/
```

## Service Implementation Details

### NLP Service Architecture

```typescript
// packages/nlp-service/src/services/ParsingService.ts
import { OpenAI } from 'openai';
import { ParsedTaskSchema } from '@flrts/shared/schemas';

export class ParsingService {
  private openai: OpenAI;
  private promptTemplate: PromptTemplate;

  async parseInput(input: string, context: UserContext): Promise<ParsedTask> {
    // 1. Enhance input with context
    const enhancedPrompt = this.promptTemplate.build({
      input,
      timezone: context.timezone,
      teamMembers: context.teamMembers,
      recentPatterns: context.patterns,
    });

    // 2. Call OpenAI with function calling
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: enhancedPrompt }],
      functions: [
        {
          name: 'parse_task',
          parameters: ParsedTaskSchema.shape,
        },
      ],
      function_call: { name: 'parse_task' },
    });

    // 3. Validate and return
    const parsed = JSON.parse(
      completion.choices[0].message.function_call.arguments
    );
    return ParsedTaskSchema.parse(parsed);
  }
}
```

### OpenProject Gateway Patterns

```typescript
// packages/openproject-gateway/src/client/OpenProjectClient.ts
export class OpenProjectClient {
  private axios: AxiosInstance;
  private rateLimiter: RateLimiter;

  async createWorkPackage(data: WorkPackageInput): Promise<WorkPackage> {
    await this.rateLimiter.acquire();

    const payload = {
      subject: data.subject,
      description: { raw: data.description },
      _links: {
        type: { href: `/api/v3/types/${data.typeId}` },
        assignee: { href: `/api/v3/users/${data.assigneeId}` },
        project: { href: `/api/v3/projects/${data.projectId}` },
      },
      dueDate: data.dueDate,
      customFields: this.mapCustomFields(data.customFields),
    };

    const response = await this.axios.post('/api/v3/work_packages', payload);
    return this.mapWorkPackage(response.data);
  }

  async bulkCreate(items: WorkPackageInput[]): Promise<WorkPackage[]> {
    // Use OpenProject's bulk operation endpoint
    const operations = items.map((item) => ({
      method: 'POST',
      href: '/api/v3/work_packages',
      body: this.mapToPayload(item),
    }));

    const response = await this.axios.post('/api/v3/bulk', operations);
    return response.data.results.map(this.mapWorkPackage);
  }
}
```

### Timezone Handling Strategy

```typescript
// packages/shared/src/utils/TimezoneConverter.ts
import { DateTime } from 'luxon';

export class TimezoneConverter {
  private static readonly TEAM_TIMEZONES = {
    Colin: 'America/Los_Angeles', // PST
    Bernie: 'America/Los_Angeles',
    Ari: 'America/Los_Angeles',
    Taylor: 'America/Chicago', // CST
    Company: 'America/Chicago',
    Joel: 'America/New_York', // EST
    Bryan: 'America/New_York',
  };

  static convertToAssigneeTime(
    dateStr: string,
    assignee: string,
    sourceTimezone?: string
  ): string {
    const targetZone = this.TEAM_TIMEZONES[assignee];
    const sourceZone = sourceTimezone || 'America/Chicago'; // Company default

    return DateTime.fromISO(dateStr, { zone: sourceZone })
      .setZone(targetZone)
      .toISO();
  }

  static convertToUTC(dateStr: string, timezone: string): string {
    return DateTime.fromISO(dateStr, { zone: timezone }).toUTC().toISO();
  }
}
```

## API Gateway Configuration

```nginx
# infrastructure/docker/nginx.conf
upstream nlp_service {
    least_conn;
    server nlp-service-1:3000 weight=5;
    server nlp-service-2:3000 weight=5;
    server nlp-service-3:3000 weight=5;
}

upstream openproject_gateway {
    server openproject-gateway-1:3001;
    server openproject-gateway-2:3001;
}

server {
    listen 443 ssl http2;
    server_name api.flrts.company;

    # SSL configuration
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # NLP endpoints
    location /api/v1/parse {
        proxy_pass http://nlp_service;
        proxy_set_header X-Request-ID $request_id;
    }

    # OpenProject endpoints
    location /api/v1/workpackages {
        proxy_pass http://openproject_gateway;
        proxy_set_header X-Request-ID $request_id;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://nlp_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Database Design

### SQLite Schema (Development/MVP)

```sql
-- User preferences and patterns
CREATE TABLE user_preferences (
    user_id TEXT PRIMARY KEY,
    timezone TEXT NOT NULL,
    default_project_id TEXT,
    shortcuts JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Template storage
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    pattern TEXT NOT NULL,
    parsed_structure JSON NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id)
);

-- Usage analytics (privacy-compliant)
CREATE TABLE usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parsing cache
CREATE TABLE parse_cache (
    input_hash TEXT PRIMARY KEY,
    parsed_result JSON NOT NULL,
    confidence REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Indexes for performance
CREATE INDEX idx_templates_user ON templates(user_id);
CREATE INDEX idx_events_user_type ON usage_events(user_id, event_type);
CREATE INDEX idx_cache_expires ON parse_cache(expires_at);
```

### Migration to PostgreSQL (Production)

```sql
-- PostgreSQL schema with advanced features
CREATE SCHEMA flrts;

-- Use JSONB for better performance
CREATE TABLE flrts.user_preferences (
    user_id UUID PRIMARY KEY,
    timezone TEXT NOT NULL,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned table for high-volume events
CREATE TABLE flrts.usage_events (
    id BIGSERIAL,
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE flrts.usage_events_2025_01
    PARTITION OF flrts.usage_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## Testing Strategy

### Unit Testing Structure

```typescript
// packages/nlp-service/src/services/__tests__/ParsingService.test.ts
describe('ParsingService', () => {
  let service: ParsingService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    service = new ParsingService(mockOpenAI);
  });

  describe('parseInput', () => {
    it('should parse simple task creation', async () => {
      const input = 'Create task for @Taylor to check pumps by 3pm';
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              function_call: {
                arguments: JSON.stringify({
                  operation: 'CREATE',
                  workPackage: {
                    subject: 'Check pumps',
                    assigneeId: 'taylor-id',
                    dueDate: '2025-01-05T15:00:00-06:00',
                  },
                }),
              },
            },
          },
        ],
      });

      const result = await service.parseInput(input, defaultContext);

      expect(result.operation).toBe('CREATE');
      expect(result.workPackage.assigneeId).toBe('taylor-id');
    });

    it('should handle timezone conversion', async () => {
      // Test PST to CST conversion
      const input = 'Task for @Joel due at 2pm Colin time';
      // ... test implementation
    });
  });
});
```

### Integration Testing

```typescript
// tests/integration/nlp-to-openproject.test.ts
describe('NLP to OpenProject Integration', () => {
  let nlpService: INLPService;
  let opGateway: IOpenProjectGateway;

  beforeAll(async () => {
    // Start test containers
    await startTestContainers();
    nlpService = await createNLPService();
    opGateway = await createOPGateway();
  });

  it('should create task from natural language', async () => {
    // 1. Parse natural language
    const parsed = await nlpService.parse(
      'Create urgent task for Taylor to restart miner-07'
    );

    // 2. Create in OpenProject
    const workPackage = await opGateway.create(parsed.workPackage);

    // 3. Verify
    expect(workPackage.id).toBeDefined();
    expect(workPackage.subject).toBe('Restart miner-07');
    expect(workPackage.priority).toBe('High');
  });
});
```

## Deployment Pipeline

### CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy FLRTS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker images
        run: |
          docker build -t flrts/nlp-service ./packages/nlp-service
          docker build -t flrts/op-gateway ./packages/openproject-gateway
          docker build -t flrts/telegram-bot ./packages/telegram-bot

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push flrts/nlp-service
          docker push flrts/op-gateway
          docker push flrts/telegram-bot

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          ssh ${{ secrets.PROD_HOST }} 'cd /opt/flrts && docker-compose pull && docker-compose up -d'
```

## Performance Optimization

### Caching Strategy

```typescript
// Redis caching implementation
class CacheService {
  private redis: Redis;

  async getCachedParse(input: string): Promise<ParsedTask | null> {
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    const cached = await this.redis.get(`parse:${hash}`);

    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if still valid (24 hour cache)
      if (Date.now() - parsed.timestamp < 86400000) {
        return parsed.data;
      }
    }
    return null;
  }

  async setCachedParse(input: string, result: ParsedTask): Promise<void> {
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    await this.redis.setex(
      `parse:${hash}`,
      86400, // 24 hours
      JSON.stringify({ data: result, timestamp: Date.now() })
    );
  }
}
```

### Request Batching

```typescript
// Batch multiple parse requests to OpenAI
class BatchProcessor {
  private queue: ParseRequest[] = [];
  private timer: NodeJS.Timeout;

  async addRequest(request: ParseRequest): Promise<ParsedTask> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...request, resolve, reject });

      if (this.queue.length >= 10) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), 100);
      }
    });
  }

  private async processBatch() {
    const batch = this.queue.splice(0, 10);
    clearTimeout(this.timer);
    this.timer = null;

    try {
      const results = await this.openai.batchParse(batch);
      batch.forEach((req, i) => req.resolve(results[i]));
    } catch (error) {
      batch.forEach((req) => req.reject(error));
    }
  }
}
```

## Monitoring Implementation

### Custom Metrics

```typescript
// Prometheus metrics
import { Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();

const parseCounter = new Counter({
  name: 'flrts_parse_total',
  help: 'Total number of parse requests',
  labelNames: ['status', 'operation'],
  registers: [registry],
});

const parseHistogram = new Histogram({
  name: 'flrts_parse_duration_seconds',
  help: 'Parse request duration',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

const openaiTokens = new Counter({
  name: 'flrts_openai_tokens_total',
  help: 'Total OpenAI tokens used',
  labelNames: ['model'],
  registers: [registry],
});
```

## Future Architecture Considerations

### MCP Server Integration

```typescript
// Future: Expose FLRTS as MCP server
class FLRTSMCPServer implements MCPServer {
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    switch (request.method) {
      case 'parse':
        return this.handleParse(request.params);
      case 'create_task':
        return this.handleCreateTask(request.params);
      case 'list_tasks':
        return this.handleListTasks(request.params);
    }
  }

  getCapabilities(): MCPCapabilities {
    return {
      name: 'FLRTS',
      version: '1.0.0',
      methods: ['parse', 'create_task', 'list_tasks'],
      description: 'Natural language task management for OpenProject',
    };
  }
}
```

### OpenProject CLI Integration

```bash
#!/bin/bash
# Future: Wrapper script for OpenProject CLI integration

flrts_op() {
  local parsed=$(flrts parse "$1")
  openproject-cli work-package create \
    --subject "$(echo $parsed | jq -r .subject)" \
    --assignee "$(echo $parsed | jq -r .assignee)" \
    --due-date "$(echo $parsed | jq -r .dueDate)"
}

alias opt="flrts_op"
# Usage: opt "Create task for Taylor to check equipment tomorrow"
```
