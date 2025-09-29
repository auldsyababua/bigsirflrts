Comprehensive System Audit Plan for FLRTS Monorepo

  Executive Summary

  This audit plan provides a systematic approach to analyzing the FLRTS (Field Reports, Lists, Reminders, Tasks, Sub-Tasks) system, designed for modular execution by LLM agents with
  limited context windows. The plan divides the codebase into discrete audit modules based on service boundaries and logical pipelines, ensuring thorough coverage while maintaining
  manageable scope for each audit session.

  1. Audit Module Definitions

  Module 1: Core Infrastructure & Configuration

  Scope: Foundation layer analysis
  Directories:

- /infrastructure/
- /.github/workflows/
- /docker-compose*.yml files
- Root configuration files (tsconfig.json, package.json, .eslintrc.*)

  Key Focus Areas:

- Docker orchestration configuration validation
- CI/CD pipeline integrity
- Environment variable management
- Security configuration (secrets, keys)
- Network topology and service discovery

  LLM Agent Instructions:
  // Agent Context Limit: 32k tokens
  // Primary Tools: ESLint, grep for secrets, Docker validation
  // Output: infrastructure-audit.json + infrastructure-connections.md

  1. Map all service definitions in docker-compose files
  2. Identify exposed ports and internal networks
  3. Validate environment variable usage (no hardcoded secrets)
  4. Check GitHub Actions for security vulnerabilities
  5. Generate service dependency graph

  Module 2: OpenProject Integration Service

  Scope: Rails application integration layer
  Directories:

- Files containing "openproject" references
- Database migration files related to OpenProject
- API client implementations

  Key Focus Areas:

- Schema mismatch detection (public vs openproject schema issue)
- API endpoint mapping to OpenProject REST v3
- Authentication flow validation
- Data synchronization logic
- Error handling for external service failures

  LLM Agent Instructions:
  // Focus: Breaking change detection
  // Critical Issue: Schema namespace mismatch
  // Tools: TypeScript compiler, schema validation

  1. Extract all OpenProject API calls with file:line references
  2. Validate against OpenProject REST v3 specification
  3. Check database queries for schema references
  4. Map data transformation pipelines
  5. Identify retry/fallback mechanisms

  Module 3: NLP Service & AI Integration

  Scope: OpenAI integration and text processing
  Directories:

- /packages/nlp-service/
- Files containing OpenAI/GPT references
- Text processing utilities

  Key Focus Areas:

- API key management and rotation
- Token usage optimization
- Prompt injection vulnerability assessment
- Response validation and sanitization
- Cost tracking implementation

  LLM Agent Instructions:
  // Security Critical Module
  // Check for: API key exposure, prompt injection vectors
  // Validate: Token limits, rate limiting, error handling

  1. Audit all OpenAI API calls for security
  2. Check prompt construction for injection vulnerabilities
  3. Validate response parsing and error handling
  4. Map data flow from input to AI processing
  5. Verify cost tracking mechanisms

  Module 4: Telegram Bot Service

  Scope: Bot implementation and webhook handling
  Directories:

- Files using Telegraf framework
- Webhook endpoint definitions
- Bot command handlers

  Key Focus Areas:

- Command handler implementation completeness
- Webhook security validation
- User authentication and authorization
- Rate limiting implementation
- Message queue handling

  LLM Agent Instructions:
  // User-facing service audit
  // Priority: Security, user data handling
  // Check: Input validation, command injection

  1. Map all bot commands to handler functions
  2. Validate webhook endpoint security
  3. Check user session management
  4. Audit rate limiting implementation
  5. Verify error messages don't leak sensitive info

  Module 5: n8n Workflow Automation

  Scope: Workflow definitions and webhook integrations
  Directories:

- n8n workflow JSON files (if stored)
- Webhook endpoints for n8n
- Workflow trigger implementations

  Key Focus Areas:

- Workflow chain validation
- Webhook endpoint security
- Error propagation through workflows
- Retry logic and dead letter handling
- Performance bottlenecks in chains

  LLM Agent Instructions:
  // Event-driven architecture audit
  // Focus: Chain integrity, error handling
  // Map: Complete workflow paths

  1. Extract all n8n webhook endpoints
  2. Map workflow trigger points
  3. Validate error handling in chains
  4. Check for infinite loop conditions
  5. Verify webhook authentication

  Module 6: Supabase Integration Layer

  Scope: Database, Edge Functions, and real-time features
  Directories:

- Database migration files
- Supabase client implementations
- Edge Function definitions
- RLS policies (if defined in code)

  Key Focus Areas:

- Connection pooling configuration
- RLS policy validation
- Edge Function deployment configuration
- Real-time subscription handling
- Transaction boundary management

  LLM Agent Instructions:
  // Database layer audit
  // Critical: Connection pooling, RLS policies
  // Validate: Transaction handling, query optimization

  1. Audit all Supabase client instantiations
  2. Check for connection pool exhaustion risks
  3. Validate RLS policies if present
  4. Map all Edge Function calls
  5. Verify transaction boundaries

  Module 7: Frontend & API Gateway

  Scope: Next.js application and Express API
  Directories:

- Next.js pages and API routes
- Express router definitions
- Middleware implementations
- Socket.io configurations

  Key Focus Areas:

- Authentication middleware consistency
- CORS configuration
- Rate limiting implementation
- WebSocket security
- API versioning strategy

  LLM Agent Instructions:
  // API surface audit
  // Priority: Authentication, authorization, rate limiting
  // Map: All public endpoints

  1. Extract all API endpoints with methods
  2. Validate authentication on each endpoint
  3. Check CORS and security headers
  4. Audit WebSocket authentication
  5. Verify input validation middleware

  2. Connection Mapping Strategy

  2.1 Connection Taxonomy

  interface ServiceConnection {
    source: {
      service: string;
      file: string;
      line: number;
      function?: string;
    };
    destination: {
      service: string;
      endpoint?: string;
      protocol: 'HTTP' | 'WebSocket' | 'PostgreSQL' | 'Redis' | 'Custom';
    };
    authentication: {
      type: 'Bearer' | 'Basic' | 'APIKey' | 'None' | 'Custom';
      location: 'Header' | 'Query' | 'Body' | 'Cookie';
    };
    dataFlow: {
      request: string | object;  // Schema or example
      response: string | object; // Schema or example
      errors: string[];         // Possible error codes
    };
  }

  2.2 Discovery Methodology

  Phase 1: Static Analysis

# HTTP/API Calls

  rg -t ts -t js "fetch\(|axios\.|http\.|https\." --json | \
    jq -r '.data.path.text + ":" + (.data.line_number | tostring)'

# Database Connections

  rg -t ts "createClient|supabase\.|pool\." --json

# WebSocket Connections

  rg -t ts "io\(|socket\." --json

# Service Imports

  rg -t ts "^import.*from ['\"]\.\./" -g '!node_modules' --json

  Phase 2: Runtime Analysis
  // Instrumentation points
  const connectionLogger = {
    logHTTPRequest: (req: Request) => { /*capture */ },
    logDatabaseQuery: (query: string) => { /* capture */ },
    logWebSocketEvent: (event: string) => { /* capture*/ }
  };

  Phase 3: Documentation Generation
  graph TB
      subgraph "External Services"
          OP[OpenProject API]
          OAI[OpenAI API]
          TG[Telegram API]
          CF[Cloudflare R2]
      end

      subgraph "Gateway Layer"
          NG[Next.js Gateway]
          EX[Express API]
          WS[WebSocket Server]
      end

      subgraph "Processing Layer"
          NLP[NLP Service]
          BOT[Telegram Bot]
          WF[n8n Workflows]
      end

      subgraph "Data Layer"
          SB[Supabase PostgreSQL]
          EF[Edge Functions]
      end

      NG --> NLP
      BOT --> NLP
      NLP --> OAI
      WF --> OP
      EX --> SB
      NLP --> SB
      BOT --> TG

  3. Audit Execution Plan

  3.1 Execution Sequence

  audit_sequence:
    week_1:
      day_1:
        - module: infrastructure
          duration: 4h
          dependencies: none
          output: infrastructure-audit.json

      day_2:
        - module: database_layer
          duration: 6h
          dependencies: [infrastructure]
          output: database-audit.json

      day_3:
        - module: external_integrations
          parallel:
            - openproject_service
            - telegram_bot
            - nlp_service
          duration: 8h
          output: integrations-audit.json

      day_4:
        - module: api_gateway
          duration: 6h
          dependencies: [database_layer, external_integrations]
          output: api-audit.json

      day_5:
        - module: workflow_automation
          duration: 4h
          dependencies: all
          output: workflows-audit.json

    week_2:
      - integration_testing
      - security_validation
      - performance_analysis
      - final_report_generation

  3.2 Validation Checkpoints

  interface ValidationCheckpoint {
    module: string;
    checks: {
      syntax: boolean;      // ESLint/TypeScript passes
      tests: boolean;       // Jest tests pass
      security: boolean;    // No critical vulnerabilities
      connections: boolean; // All connections mapped
      documentation: boolean; // Issues documented
    };
    blockers: string[];     // Issues preventing next module
    warnings: string[];     // Non-blocking issues
    metrics: {
      filesAnalyzed: number;
      issuesFound: number;
      connectionsMaped: number;
      testCoverage: number;
    };
  }

  3.3 Progressive Validation Script

  #!/bin/bash

# audit-checkpoint.sh

  MODULE=$1
  AUDIT_DIR="./audit-results"

# Run syntax checks

  npm run lint --workspace=$MODULE > $AUDIT_DIR/$MODULE-lint.log 2>&1
  LINT_STATUS=$?

# Run type checks

  npx tsc --noEmit -p packages/$MODULE > $AUDIT_DIR/$MODULE-types.log 2>&1
  TYPE_STATUS=$?

# Run tests if they exist

  if [ -f "packages/$MODULE/jest.config.js" ]; then
      npm test --workspace=$MODULE > $AUDIT_DIR/$MODULE-tests.log 2>&1
      TEST_STATUS=$?
  else
      TEST_STATUS=0
  fi

# Generate checkpoint report

  node scripts/generate-checkpoint.js \
      --module=$MODULE \
      --lint=$LINT_STATUS \
      --types=$TYPE_STATUS \
      --tests=$TEST_STATUS \
      > $AUDIT_DIR/$MODULE-checkpoint.json

# Check if we can proceed

  if [ $LINT_STATUS -ne 0 ] || [ $TYPE_STATUS -ne 0 ]; then
      echo "❌ Module $MODULE has blocking issues. Fix before proceeding."
      exit 1
  fi

  echo "✅ Module $MODULE validated. Proceeding to next module."

  4. Issue Detection Framework

  4.1 Critical Issue Patterns

  const criticalPatterns = {
    schemaIssues: {
      pattern: /schema\s*[=:]\s*['"]public['"]/,
      severity: 'CRITICAL',
      description: 'OpenProject expects "openproject" schema, not "public"',
      autoFix: {
        search: 'schema: "public"',
        replace: 'schema: "openproject"'
      }
    },

    hardcodedSecrets: {
      pattern: /api[_-]?key\s*[=:]\s*['"][A-Za-z0-9]{20,}['"]/i,
      severity: 'CRITICAL',
      description: 'Hardcoded API key detected',
      remediation: 'Move to environment variables'
    },

    unboundedQueries: {
      pattern: /\.findMany\(\s*\)/,
      severity: 'HIGH',
      description: 'Unbounded database query without limit',
      remediation: 'Add pagination or limit clause'
    },

    missingErrorHandling: {
      pattern: /\.catch\(\s*\)/,
      severity: 'MEDIUM',
      description: 'Empty catch block',
      remediation: 'Implement proper error handling'
    },

    deprecatedAPIs: {
      pattern: /openproject\/api\/v2/,
      severity: 'HIGH',
      description: 'Using deprecated OpenProject API v2',
      remediation: 'Migrate to API v3'
    }
  };

  4.2 Test Quality Assessment

  interface TestQualityMetrics {
    coverage: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    quality: {
      hasUnitTests: boolean;
      hasIntegrationTests: boolean;
      hasE2ETests: boolean;
      mockingStrategy: 'full' | 'partial' | 'none';
      assertionDensity: number; // assertions per test
    };
    gaps: {
      untestedEndpoints: string[];
      untestedServices: string[];
      missingErrorCases: string[];
      missingEdgeCases: string[];
    };
  }

  4.3 Security Vulnerability Checklist

  security_checklist:
    authentication:
      - JWT_secret_rotation
      - session_timeout_implementation
      - password_complexity_requirements
      - MFA_support

    authorization:
      - RBAC_implementation
      - resource_ownership_validation
      - privilege_escalation_prevention

    input_validation:
      - SQL_injection_prevention
      - XSS_prevention
      - command_injection_prevention
      - path_traversal_prevention

    api_security:
      - rate_limiting_per_endpoint
      - CORS_configuration
      - API_versioning
      - deprecation_warnings

    data_protection:
      - encryption_at_rest
      - encryption_in_transit
      - PII_handling
      - audit_logging

    dependency_security:
      - known_vulnerabilities
      - outdated_packages
      - license_compliance

  4.4 Documentation Drift Detection

  class DocumentationValidator {
    checkEndpointDocs(endpoint: string): ValidationResult {
      const codeSignature = this.extractFromCode(endpoint);
      const docSignature = this.extractFromDocs(endpoint);

      return {
        matches: this.compareSignatures(codeSignature, docSignature),
        codeVersion: codeSignature.version,
        docVersion: docSignature.version,
        lastUpdated: docSignature.lastUpdated,
        drift: this.calculateDrift(codeSignature, docSignature)
      };
    }

    findOrphanedDocs(): string[] {
      // Find documented features that no longer exist
    }

    findUndocumentedFeatures(): string[] {
      // Find code without corresponding documentation
    }
  }

  5. Output Format Templates

  5.1 Connection Map Template (Mermaid)

  %%{init: {'theme':'dark', 'themeVariables': { 'fontSize': '16px'}}}%%
  graph TB
      %% Service Definitions
      subgraph "External Services"
          OP[OpenProject<br/>REST v3]:::external
          OAI[OpenAI<br/>GPT-4o]:::external
          TG[Telegram<br/>Bot API]:::external
      end

      %% Connection Definitions with Details
      BOT -->|"Webhook<br/>Auth: Bearer<br/>handlers/bot.ts:45"| TG
      NLP -->|"POST /v1/completions<br/>Auth: API Key<br/>services/nlp.ts:123"| OAI

      %% Styling
      classDef external fill:#ff6b6b,stroke:#fff,stroke-width:2px
      classDef internal fill:#4ecdc4,stroke:#fff,stroke-width:2px
      classDef database fill:#95e1d3,stroke:#fff,stroke-width:2px

  5.2 Issue Report Template (Linear-Compatible JSON)

  {
    "issue": {
      "title": "[AUDIT] Schema Mismatch in OpenProject Integration",
      "description": "## Summary\nOpenProject integration expects 'openproject' schema but code uses 'public' schema.\n\n## Location\n- File: `packages/sync-service/db.ts:45`\n- Function:
   `syncToOpenProject()`\n\n## Impact\n- Data sync failures\n- Silent data loss\n- Breaking production integration\n\n## Reproduction\n```typescript\n// Current (broken)\nconst result =
  await db.query('SELECT * FROM public.work_packages');\n\n// Expected\nconst result = await db.query('SELECT * FROM openproject.work_packages');\n```\n\n## Suggested Fix\nUpdate schema
  references throughout the codebase.",
      "priority": 1,
      "labels": ["audit", "critical", "schema-issue", "openproject"],
      "assignee": "unassigned",
      "project": "Infrastructure",
      "estimate": 3
    }
  }

  5.3 Module Audit Summary Template

  interface ModuleAuditSummary {
    module: string;
    timestamp: string;
    statistics: {
      filesAnalyzed: number;
      linesOfCode: number;
      connections: {
        internal: number;
        external: number;
        total: number;
      };
      issues: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
      testCoverage: number;
      typesCoverage: number;
    };

    topIssues: Array<{
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      location: string;
      impact: string;
      effort: number; // story points
    }>;

    connections: Array<{
      from: string;
      to: string;
      protocol: string;
      authenticated: boolean;
      documented: boolean;
    }>;

    recommendations: {
      immediate: string[];  // Fix within 24h
      shortTerm: string[]; // Fix within 1 week
      longTerm: string[];  // Technical debt backlog
    };
  }

  5.4 Validation Schema for Programmatic Processing

  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "AuditReport",
    "type": "object",
    "required": ["version", "timestamp", "modules", "connections", "issues"],
    "properties": {
      "version": {
        "type": "string",
        "pattern": "^\\d+\\.\\d+\\.\\d+$"
      },
      "timestamp": {
        "type": "string",
        "format": "date-time"
      },
      "modules": {
        "type": "array",
        "items": {
          "$ref": "#/definitions/ModuleAudit"
        }
      },
      "connections": {
        "type": "array",
        "items": {
          "$ref": "#/definitions/ServiceConnection"
        }
      },
      "issues": {
        "type": "array",
        "items": {
          "$ref": "#/definitions/Issue"
        }
      }
    },
    "definitions": {
      "ModuleAudit": {
        "type": "object",
        "required": ["name", "status", "metrics"],
        "properties": {
          "name": {"type": "string"},
          "status": {"enum": ["pending", "in-progress", "completed", "failed"]},
          "metrics": {"type": "object"}
        }
      },
      "ServiceConnection": {
        "type": "object",
        "required": ["source", "destination", "protocol"],
        "properties": {
          "source": {"type": "object"},
          "destination": {"type": "object"},
          "protocol": {"type": "string"}
        }
      },
      "Issue": {
        "type": "object",
        "required": ["id", "severity", "module", "title"],
        "properties": {
          "id": {"type": "string"},
          "severity": {"enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]},
          "module": {"type": "string"},
          "title": {"type": "string"}
        }
      }
    }
  }

  6. Automation Scripts

  6.1 Master Audit Orchestrator

  // audit-orchestrator.ts
  import { LinearClient } from '@linear/sdk';
  import { ESLint } from 'eslint';

  class AuditOrchestrator {
    private modules = [
      'infrastructure',
      'openproject-integration',
      'nlp-service',
      'telegram-bot',
      'n8n-workflows',
      'supabase-layer',
      'frontend-api'
    ];

    async runFullAudit(): Promise<AuditReport> {
      const report: AuditReport = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        modules: [],
        connections: [],
        issues: []
      };

      for (const module of this.modules) {
        console.log(`🔍 Auditing module: ${module}`);

        // Run module-specific audit
        const moduleResult = await this.auditModule(module);
        report.modules.push(moduleResult);

        // Extract connections and issues
        report.connections.push(...moduleResult.connections);
        report.issues.push(...moduleResult.issues);

        // Create Linear issues for critical findings
        await this.createLinearIssues(moduleResult.issues.filter(i => i.severity === 'CRITICAL'));

        // Checkpoint validation
        if (!await this.validateCheckpoint(module)) {
          console.error(`❌ Module ${module} failed validation. Stopping audit.`);
          break;
        }
      }

      // Generate final report
      await this.generateFinalReport(report);
      return report;
    }

    private async auditModule(module: string): Promise<ModuleAudit> {
      // Module-specific audit logic
      const eslint = new ESLint();
      const results = await eslint.lintFiles([`packages/${module}/**/*.ts`]);

      // Extract connections via AST analysis
      const connections = await this.extractConnections(module);

      // Run security checks
      const securityIssues = await this.runSecurityChecks(module);

      return {
        name: module,
        status: 'completed',
        metrics: this.calculateMetrics(results),
        connections,
        issues: [...this.eslintToIssues(results), ...securityIssues]
      };
    }
  }

  6.2 Connection Extraction Utility

  // connection-extractor.ts
  import *as ts from 'typescript';
  import* as path from 'path';

  class ConnectionExtractor {
    extract(sourceFile: ts.SourceFile): ServiceConnection[] {
      const connections: ServiceConnection[] = [];

      ts.forEachChild(sourceFile, node => {
        // Detect fetch/axios calls
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (ts.isPropertyAccessExpression(expression)) {
            const method = expression.name.text;
            if (['get', 'post', 'put', 'delete'].includes(method)) {
              connections.push(this.extractHTTPConnection(node, sourceFile));
            }
          }
        }

        // Detect database queries
        if (this.isDatabaseQuery(node)) {
          connections.push(this.extractDatabaseConnection(node, sourceFile));
        }

        // Detect WebSocket connections
        if (this.isWebSocketConnection(node)) {
          connections.push(this.extractWebSocketConnection(node, sourceFile));
        }
      });

      return connections;
    }
  }

  7. Integration with Existing Tools

  7.1 Linear Integration

  const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

  async function createAuditIssue(issue: AuditIssue) {
    await linearClient.issueCreate({
      title: issue.title,
      description: issue.description,
      priority: issue.severity === 'CRITICAL' ? 1 : 2,
      labelIds: await getLabelIds(['audit', issue.module, issue.severity]),
      projectId: process.env.LINEAR_AUDIT_PROJECT_ID
    });
  }

  7.2 GitHub Actions Integration

  name: Codebase Audit
  on:
    schedule:
      - cron: '0 0 ** 0' # Weekly on Sunday
    workflow_dispatch:

  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3

        - name: Setup Node
          uses: actions/setup-node@v3
          with:
            node-version: '22'

        - name: Install dependencies
          run: npm ci

        - name: Run audit
          run: npm run audit:full

        - name: Upload results
          uses: actions/upload-artifact@v3
          with:
            name: audit-results
            path: audit-results/

        - name: Create issues in Linear
          if: failure()
          run: npm run audit:create-issues
          env:
            LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}

  8. Success Metrics

  interface AuditSuccessMetrics {
    coverage: {
      codebasePercentage: number;    // Target: 95%
      connectionsMapped: number;      // Target: 100%
      issuesIdentified: number;       // Track trend
    };

    quality: {
      falsePositives: number;         // Target: <5%
      criticalIssuesFound: number;    // Track and fix
      testCoverageImproved: number;   // Target: +10%
    };

    efficiency: {
      timePerModule: number;          // Target: <4 hours
      automationRate: number;         // Target: 80%
      manualReviewTime: number;       // Track reduction
    };

    impact: {
      bugsPreventedInProduction: number;
      performanceImprovements: number;
      securityVulnerabilitiesFixed: number;
      developerOnboardingTime: number; // Target: -50%
    };
  }

⏺ Conclusion

  This comprehensive audit plan provides a systematic, modular approach to analyzing your FLRTS monorepo while respecting LLM context limitations. Each module can be
  audited independently, with clear handoff points and validation checkpoints ensuring completeness and quality.

  The plan leverages your existing tooling (ESLint, Jest, Linear, GitHub Actions) while introducing targeted analysis for your specific architecture challenges,
  particularly the OpenProject schema mismatch and service integration points.

  Key deliverables include automated connection mapping, prioritized issue detection focused on your identified pain points, and integration with your Linear workflow
   for immediate actionability. The modular structure ensures that both human developers and AI agents can execute the audit efficiently, building a comprehensive
  understanding of your system's health and architectural integrity.
