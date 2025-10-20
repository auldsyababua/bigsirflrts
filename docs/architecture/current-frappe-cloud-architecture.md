# Current Frappe Cloud Architecture

**Last Updated:** October 2025 **Status:** Production **Migration:** ADR-006
(September 2025)

## Overview

BigSirFLRTS runs on **ERPNext (Frappe Framework)** hosted on **Frappe Cloud**,
providing a managed ERP platform with field service management capabilities.
This architecture replaced the previous Supabase/OpenProject stack to
consolidate operations, reduce maintenance overhead, and provide native field
service workflows.

**Live Production:** <https://ops.10nz.tools>

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interfaces                          │
├─────────────────────────────────────────────────────────────────┤
│  Telegram Bot  │  ERPNext Web UI  │  Mobile App (Future)       │
└────────┬────────────────┬─────────────────────────────────────────┘
         │                │
         │                │
         ▼                ▼
    ┌────────┐       ┌──────────────────────────────────────┐
    │ AWS    │       │     ERPNext on Frappe Cloud          │
    │ Lambda │       │  https://ops.10nz.tools              │
    └────┬───┘       │                                       │
         │           │  ┌──────────────┐  ┌───────────────┐ │
         │           │  │  ERPNext     │  │  flrts_       │ │
         │           │  │  (Core)      │  │  extensions   │ │
         │           │  └──────┬───────┘  └───────┬───────┘ │
         │           │         │                   │         │
         │           │         └───────┬───────────┘         │
         │           │                 ▼                     │
         │           │        ┌─────────────────┐           │
         │           │        │  Frappe Cloud   │           │
         │           │        │  MariaDB 10.6+  │           │
         │           │        └─────────────────┘           │
         │           └──────────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │  n8n     │ ◄────── Webhook Triggers
    │ Workflows│
    └────┬─────┘
         │
         └─────────► OpenAI GPT-4o API
                     ERPNext REST API
```

## Core Components

### 1. ERPNext on Frappe Cloud

**Purpose:** Primary backend platform providing ERP, database, and business
logic

**Key Features:**

- **Managed MariaDB 10.6+** - Automated backups, PITR, scaling
- **Built-in workflows** - ERPNext automation (Server Scripts, Workflows)
- **Field Service Management** - Native modules for service calls, tasks,
  equipment
- **REST API** - Full CRUD operations on all DocTypes
- **Webhooks** - Event-driven integrations
- **Role-Based Permissions** - Fine-grained access control

**Deployment:**

- **Platform:** Frappe Cloud Private Bench
- **URL:** <https://ops.10nz.tools>
- **Region:** US (Frappe Cloud managed)
- **Custom App:** flrts_extensions (Git push-to-deploy)

**Access:**

- **Web UI:** <https://ops.10nz.tools> (authenticated users)
- **REST API:** <https://ops.10nz.tools/api> (API key auth)
- **WebSocket:** Real-time updates (authenticated)

### 2. AWS Lambda (Telegram Webhook Handler)

**Purpose:** Low-latency webhook receiver for Telegram bot (<100ms response
time)

**Responsibilities:**

- Receive Telegram webhook POSTs
- Immediately acknowledge receipt (prevent timeouts)
- Enqueue messages to n8n workflow
- Rate limiting and basic validation

**Why Lambda:**

- Sub-100ms cold start (vs. Edge Functions)
- Mature ecosystem and monitoring
- AWS Free Tier (1M requests/month)

**Configuration:**

- **Runtime:** Node.js 20
- **Memory:** 256MB
- **Timeout:** 10 seconds
- **Trigger:** API Gateway (POST /webhook)

### 3. n8n Workflows (Orchestration Layer)

**Purpose:** Complex business logic orchestration and OpenAI integration

**Responsibilities:**

- Parse Telegram messages via OpenAI GPT-4o
- Transform NLP results to ERPNext DocType structure
- Create/update ERPNext records via REST API
- Error handling and retry logic
- User notifications

**Deployment:**

- **Mode:** Single-instance (10-user scale)
- **Host:** DigitalOcean Droplet (2GB RAM)
- **Queue:** Redis (containerized)
- **Version:** v1.105.2

**Key Workflows:**

- `telegram-task-creation` - NLP → ERPNext Task
- `telegram-service-call` - NLP → ERPNext Service Call
- `error-notification` - Send error messages to users

### 4. Frappe Cloud MariaDB

**Purpose:** Managed database backend for all ERPNext data

**Features:**

- **Version:** MariaDB 10.6+ (Frappe Cloud managed)
- **Backups:** Automated daily + PITR
- **Scaling:** Automatic based on usage
- **Connection Pooling:** Managed by Frappe Cloud
- **Monitoring:** Built-in metrics and alerts

**Access Pattern:**

- **Direct SQL:** None (all operations through ERPNext ORM)
- **ERPNext ORM:** Python-based (Frappe Framework)
- **REST API:** JSON-based queries via ERPNext

### 5. flrts_extensions (Custom Frappe App)

**Purpose:** Mining-specific customizations and DocTypes

**Key DocTypes:**

- `Field Report` - Daily operational reports
- `Equipment Check` - Equipment inspection logs
- `Mining Task` - Extended Task with mining fields
- `NLP Parse Log` - OpenAI audit trail (planned)

**Development:**

- **Language:** Python 3.10+
- **Framework:** Frappe Framework
- **Deployment:** Git push-to-deploy (Frappe Cloud)
- **Repository:** (Link to repo when ready)

## Data Flow

### Task Creation via Telegram

```
1. User sends message to Telegram bot
   └─► "Hey Taylor, check pump #3 by 2pm today"

2. Telegram → AWS Lambda (webhook)
   └─► Lambda acknowledges immediately (<100ms)
   └─► Enqueues message to n8n

3. n8n receives message
   └─► Calls OpenAI GPT-4o with NLP prompt
   └─► Receives structured JSON:
       {
         "action": "create_task",
         "title": "Check pump #3",
         "assignee": "taylor@10nz.tools",
         "due_date": "2024-10-20 14:00",
         "priority": "High"
       }

4. n8n transforms to ERPNext Task DocType
   └─► POST https://ops.10nz.tools/api/resource/Task
       {
         "subject": "Check pump #3",
         "description": "Assigned via Telegram",
         "assigned_to": "taylor@10nz.tools",
         "expected_end_date": "2024-10-20 14:00:00",
         "priority": "High",
         "custom_telegram_message_id": "12345"
       }

5. ERPNext creates Task record
   └─► Stores in MariaDB
   └─► Triggers webhooks (if configured)
   └─► Sends email notification (optional)

6. n8n confirms to user
   └─► Telegram message: "✅ Task created: Check pump #3 (assigned to Taylor)"
```

## API Integration Patterns

### ERPNext REST API

**Base URL:** `https://ops.10nz.tools/api`

**Authentication:**

```bash
Authorization: token <api_key>:<api_secret>
Content-Type: application/json
```

**Common Operations:**

```bash
# List records
GET /api/resource/{DocType}?fields=["*"]&filters=[["status","=","Open"]]

# Get single record
GET /api/resource/{DocType}/{name}

# Create record
POST /api/resource/{DocType}
{
  "fieldname": "value",
  ...
}

# Update record
PUT /api/resource/{DocType}/{name}
{
  "fieldname": "new_value"
}

# Delete record
DELETE /api/resource/{DocType}/{name}
```

**Error Handling:**

- `200 OK` - Success
- `401 Unauthorized` - Invalid API key
- `403 Forbidden` - Permission denied
- `404 Not Found` - Record not found
- `417 Expectation Failed` - Validation error

### n8n → ERPNext Integration

**HTTP Request Node Configuration:**

```json
{
  "method": "POST",
  "url": "https://ops.10nz.tools/api/resource/Task",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "Authorization",
    "value": "token {{$credentials.erpnextApiKey}}:{{$credentials.erpnextApiSecret}}"
  },
  "body": {
    "subject": "{{$json.title}}",
    "assigned_to": "{{$json.assignee}}",
    "priority": "{{$json.priority}}"
  }
}
```

## Security Architecture

### Authentication & Authorization

**ERPNext Web UI:**

- Username/password authentication
- Session-based (cookies)
- Two-factor authentication (optional)

**REST API:**

- API Key + Secret (token-based)
- Keys generated per user/integration
- Scoped permissions (same as user role)

**AWS Lambda:**

- API Gateway with API key
- Telegram bot token validation
- Rate limiting (100 req/min per user)

**n8n:**

- Basic auth for web UI
- API key for webhook triggers
- Encrypted credentials storage

### Data Security

**In Transit:**

- TLS 1.3 for all connections
- Frappe Cloud managed SSL certificates
- AWS Lambda → Frappe Cloud encrypted

**At Rest:**

- MariaDB encryption (Frappe Cloud managed)
- Backup encryption (Frappe Cloud managed)
- n8n credentials encrypted (AES-256)

**Access Control:**

- ERPNext Role-Based Access Control (RBAC)
- User permissions defined per DocType
- API key permissions match user role

## Monitoring & Observability

### ERPNext Monitoring

**Built-in:**

- System Health dashboard
- Background Job logs
- Error logs (Server Scripts, API errors)
- User activity audit trail

**Frappe Cloud Dashboard:**

- Database metrics (connections, queries/sec)
- Server metrics (CPU, memory, disk)
- Backup status and history
- Uptime monitoring

### n8n Monitoring

**Built-in:**

- Execution logs (success/failure)
- Workflow execution time
- Error tracking per workflow
- Queue length (Redis)

**Metrics:**

- Workflow executions/hour
- Average execution time
- Error rate
- OpenAI API usage/costs

### AWS Lambda Monitoring

**CloudWatch Metrics:**

- Invocation count
- Error rate
- Duration (p50, p99)
- Throttles

**Alarms:**

- Error rate > 5%
- Duration > 5 seconds
- Throttles detected

## Backup & Disaster Recovery

### Database Backups

**Automated (Frappe Cloud):**

- Daily full backups (retained 30 days)
- Point-in-time recovery (PITR) to any second within 7 days
- Automatic failover to standby (HA plans)

**Manual Backups:**

- On-demand backups via Frappe Cloud dashboard
- Before major migrations/changes

### Application Backups

**flrts_extensions:**

- Git repository (source of truth)
- Frappe Cloud auto-deploy from Git

**n8n Workflows:**

- Exported JSON (stored in Git)
- Automatic export on change (planned)

### Recovery Procedures

**Database Restore:**

1. Access Frappe Cloud dashboard
2. Select backup or PITR timestamp
3. Initiate restore (automatic)
4. Verify data integrity

**Application Redeploy:**

1. Push fix to Git repository
2. Frappe Cloud auto-deploys
3. Verify in staging bench first (best practice)

**n8n Recovery:**

1. Restore Redis data (if queue issue)
2. Re-import workflow JSON from Git
3. Test with dummy webhook

## Cost Structure

### Monthly Operating Costs

| Service         | Usage               | Cost             |
| --------------- | ------------------- | ---------------- |
| Frappe Cloud    | Private Bench       | ~$200            |
| AWS Lambda      | 150K invocations/mo | ~$1              |
| n8n (self-host) | DigitalOcean 2GB    | $18              |
| OpenAI GPT-4o   | 50 tasks/day        | $5-10            |
| **Total**       |                     | **~$224-229/mo** |

**Note:** Increased from $85/mo (Supabase era) but includes:

- Managed MariaDB with automated backups
- Built-in field service workflows
- Reduced development/maintenance time

## Scaling Considerations

### Current Capacity (October 2025)

- **Users:** 10 active
- **Tasks/day:** ~50
- **Telegram messages:** ~200/day
- **n8n executions:** ~100/hour

### Scaling Triggers

**n8n (Single → Queue Mode):**

- Sustained > 500 webhooks/hour
- Execution times > 30 seconds regularly
- Memory usage > 80%

**Frappe Cloud:**

- Automatic scaling based on usage
- Upgrade plan for more resources
- Add worker instances (HA plans)

**AWS Lambda:**

- Automatically scales (up to account limits)
- Consider reserved concurrency if needed

## Development Workflow

### Local Development

**ERPNext:**

```bash
# Clone flrts_extensions app
git clone <repo-url> ~/frappe-bench/apps/flrts_extensions

# Install in local bench
bench get-app flrts_extensions
bench --site dev.localhost install-app flrts_extensions

# Develop and test
bench start
```

**n8n:**

```bash
# Run locally via Docker
docker-compose up n8n

# Import workflows from Git
# Edit via UI: http://localhost:5678
```

### Deployment

**flrts_extensions:**

1. Commit changes to Git
2. Push to main branch
3. Frappe Cloud auto-deploys
4. Verify at <https://ops.10nz.tools>

**n8n Workflows:**

1. Export workflow JSON
2. Commit to Git
3. Import on production n8n instance
4. Test with sample Telegram message

## Migration History

**September 2025 - ADR-006**

- **From:** Supabase PostgreSQL + OpenProject
- **To:** Frappe Cloud MariaDB + ERPNext
- **Rationale:** Consolidate platforms, reduce maintenance, native field service
- **Duration:** 4 weeks (planning + execution)
- **Outcome:** Successful, zero data loss

**Key Lessons:**

- DocType design requires understanding ERPNext patterns
- REST API differs from direct SQL (requires translation layer)
- Managed platform reduces operational burden significantly

## Reference Documentation

- **ADR-006:**
  [ERPNext Frappe Cloud Migration](./adr/ADR-006-erpnext-frappe-cloud-migration.md)
- **Migration Guide:**
  [Supabase → Frappe Migration](../MIGRATION-SUPABASE-TO-FRAPPE.md)
- **Tech Stack:** [Technology Stack](./tech-stack.md)
- **PRD:** [Product Requirements](../prd/prd.md)

## Appendix: Key Terminology

| Term                 | Definition                                                       |
| -------------------- | ---------------------------------------------------------------- |
| **DocType**          | ERPNext's term for a database table/model (like SQL table)       |
| **Frappe Framework** | Python web framework powering ERPNext                            |
| **Bench**            | Development/deployment environment for Frappe apps               |
| **Server Script**    | Python code that runs on ERPNext server (like database triggers) |
| **Workflow**         | Built-in state machine for document approval flows               |
| **Field Service**    | ERPNext module for managing on-site service operations           |
| **PITR**             | Point-In-Time Recovery (restore to any second within retention)  |

---

**Document Owner:** Infrastructure Team **Review Cycle:** Quarterly or after
major architecture changes **Last Reviewed:** October 2025
