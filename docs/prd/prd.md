# FLRTS NLP Task Management Service Product Requirements Document (PRD)

## Goals and Background Context

### Goals

• Enable rapid, friction-free task creation through natural language processing
for distributed team operations • Eliminate manual timezone conversion errors by
automatically converting all times to assignee's local timezone  
• Reduce average task creation time from 45 seconds to under 5 seconds •
Maintain full OpenProject functionality while adding NLP enhancement layer via
API integration • Provide dual-interface access (OpenProject UI + FLRTS NLP) for
maximum flexibility • Achieve 95% parse accuracy and 100% timezone conversion
accuracy

### Background Context

The FLRTS NLP Task Management Service addresses critical operational friction at
a distributed bitcoin mining company where team members across PST, CST, and EST
zones need rapid task coordination. The current manual form-based task entry
creates significant delays and dropped tasks due to timezone confusion and
workflow interruption. FLRTS provides a natural language enhancement layer that
converts conversational commands like "Hey Taylor, Colin needs the server logs
by 1pm his time" into properly structured API calls to ERPNext.

**Critical Architecture Rule:** FLRTS implements a "Reflex and Brain" hybrid
architecture:

- **Reflex Layer (AWS Lambda)**: Handles immediate responses (<100ms) for
  Telegram acknowledgments and simple queries
- **Brain Layer (n8n Workflows)**: Orchestrates complex business logic,
  multi-step operations, and all ERPNext API interactions
- **Data Flow**: User → Telegram → AWS Lambda (instant ACK) → n8n Workflow →
  ERPNext REST API → Frappe Cloud MariaDB
- **Performance Rule**: Operations requiring <500ms response use AWS Lambda; all
  others use n8n workflows
- **Database Rule**: FLRTS never writes to the database directly - all writes go
  through ERPNext REST API

### Change Log

| Date       | Version | Description                                                                       | Author          |
| ---------- | ------- | --------------------------------------------------------------------------------- | --------------- |
| 2025-01-12 | 1.0     | Initial PRD creation with single-database architecture                            | John (PM Agent) |
| 2025-01-13 | 2.0     | Major update: PostgreSQL 15.8, n8n-first hybrid architecture, Lists feature       | John (PM Agent) |
| 2025-09-15 | 2.1     | Architecture revision: Single-instance n8n for 10-user scale, deferred queue mode | John (PM Agent) |
| 2025-09-25 | 3.0     | MVP scope reduction: Focus on CREATE operations only for rapid demo               | John (PM Agent) |

## MVP Demo Scope (v3.0)

### Critical Path to Demo

**Goal**: Deliver a working NLP task/list creation demo ASAP

**In Scope (CREATE Only):**

- Natural language task creation via Telegram
- Natural language list creation via Telegram
- OpenAI parsing of messages to structured data
- Creation of tasks/service calls in ERPNext via API
- Simple confirmation messages back to users
- Basic error handling for unparseable input

**Out of Scope (Deferred to Post-MVP):**

- READ operations (viewing tasks/lists)
- UPDATE operations (editing tasks/lists)
- ARCHIVE/DELETE operations
- Complex timezone conversions
- Task reminders and notifications
- Inline keyboards and UI refinements
- Batch operations
- Advanced error recovery
- User context management

**Rationale**: By focusing solely on CREATE operations, we can demonstrate the
core NLP capability and OpenProject integration without the complexity of
bidirectional sync, state management, or UI complications. Users can create
tasks naturally via Telegram, then manage them in OpenProject's full UI.

## Requirements

### Functional Requirements

• **FR1:** The system shall parse natural language task commands into structured
JSON using OpenAI GPT-4o API with a single comprehensive prompt • **FR2 (MVP):**
The system shall support CREATE operations for tasks and lists via natural
language commands (READ, UPDATE, and ARCHIVE operations deferred to post-MVP
phase) • **FR3 (Post-MVP):** The system shall parse time references to identify
context (sender's time, assignee's time, or absolute time), then convert times
to assignee's local timezone using application-layer timezone logic (OpenAI
provides time_context field, FLRTS performs actual conversion) • **FR4:** The
system shall recognize @mentions for task assignees and map them to ERPNext user
IDs • **FR5:** The system shall parse relative dates and times ("tomorrow at
2pm", "next Monday", "in 3 days") into absolute timestamps • **FR6 (MVP):** The
system shall display a simple confirmation message showing the created
task/service call title and assignee • **FR7:** The system shall integrate with
ERPNext's REST API to execute ALL task management operations (no direct database
writes) • **FR8:** The system shall provide error messages with suggested manual
entry when parsing fails • **FR9 (MVP):** The system shall support /create
command for explicit task/list creation (other commands like /update, /archive,
/list deferred to post-MVP) • **FR10 (Post-MVP):** The system shall send task
reminder notifications to both Telegram and email channels • **FR11:** The
system shall maintain user access to the full OpenProject UI alongside the NLP
interface • **FR12 (Post-MVP):** The system shall maintain a complete audit
trail by implementing soft-delete/archive operations only - true deletions are
restricted to admin users (Colin) via direct database access

### Non-Functional Requirements

• **NFR1:** [DEFERRED] Google Workspace SSO for authentication (use basic auth
for MVP) • **NFR2:** The system shall support 10 active users with
single-instance n8n deployment (100+ webhooks/hour capacity) • **NFR3:** The
system shall achieve 95% parse accuracy on the 100-example synthetic test
dataset • **NFR4:** The system shall achieve 100% mathematical accuracy for
timezone conversions • **NFR5:** The system shall use Frappe Cloud managed
MariaDB with automated connection pooling • **NFR6:** [REMOVED - Superseded by
Frappe Cloud] • **NFR7:** The system shall use native ERPNext attachments for
file storage (optional R2 integration via marketplace app) • **NFR8:** Frappe
Cloud handles regional deployment and availability • **NFR9:** [ASPIRATIONAL]
Target 99.9% availability (Frappe Cloud managed) • **NFR10:** The system shall
use SSL/TLS encryption for all API connections • **NFR11:** [REMOVED - Frappe
Cloud managed] • **NFR12:** The system shall use Cloudflare DNS for routing to
Frappe Cloud • **NFR13:** [REVISED] n8n shall use single-instance mode for
10-user scale (queue mode preserved for future 50+ users) • **NFR14:** AWS
Lambda handles all operations requiring <500ms response time • **NFR15:** n8n
concurrency optimized for single-instance mode (10-20 concurrent executions) •
**NFR16:** Database connection pool managed by Frappe Cloud

## User Interface Design Goals

### Overall UX Vision

Telegram-first conversational interface where users send natural language
messages and receive parsed JSON confirmations. The correction loop happens
entirely through chat messages - users reply with corrections until the parsing
is accurate, then confirm for execution.

### Key Interaction Paradigms

• **Conversational correction loop**: Send message → Review bot response → Reply
with corrections → Repeat until correct → Confirm • **Text-only confirmation**:
Bot shows parsed JSON in readable format, user types "yes" or "confirm" to
execute • **OpenProject fallback**: Users can confirm faulty parsing and fix
directly in OpenProject's mobile-responsive UI

### Core Screens and Views

• **Telegram Bot Chat** - Primary interface for all NLP interactions • **JSON
Confirmation Message** - Bot's formatted response showing parsed intent •
**OpenProject Mobile UI** - Fallback interface for manual corrections (existing
responsive design)

### Accessibility: None

(Telegram handles its own accessibility)

### Branding

No custom branding required - uses standard Telegram bot interface

### Target Device and Platforms: Mobile Only

(Telegram app on phones)

## Technical Assumptions

### Repository Structure: Monorepo

### Service Architecture

**Hybrid "Reflex and Brain" Model:**

- **Reflex Layer**: AWS Lambda for immediate responses (<100ms latency)
- **Brain Layer**: n8n workflows in single-instance mode for 10-user scale
  (queue mode available for 50+ users)
- **Infrastructure**: Frappe Cloud managed ERPNext with custom flrts_extensions
  app
- **Integration Pattern**: AWS Lambda acknowledges users instantly, then
  triggers n8n workflows asynchronously to interact with ERPNext REST API

#### n8n Deployment Architecture

**Current Scale (10 Users):**

- Single-instance mode deployment
- Configuration: `docker-compose.single.yml`
- Capacity: 100+ webhooks/hour, 10-20 concurrent executions
- Resource usage: 2GB RAM, 1 CPU core

**Migration Path (Future):**

- Queue mode configuration preserved at `docker-compose.yml`
- Trigger migration when:
  - Sustained 50+ active users
  - > 500 webhooks/hour consistently
  - Execution times exceeding 30 seconds regularly
- Migration guide: `/infrastructure/docs/SCALING_GUIDE.md`

### Testing Requirements

Unit tests for timezone conversion logic and NLP parsing validation against
100-example synthetic dataset. Manual testing via Telegram bot for MVP, with
automated integration tests post-MVP.

### Performance Requirements & Capacity Planning

#### Current Scale (10 Users)

- **Webhook Processing:** <500ms response time
- **Concurrent Executions:** 10-20 maximum
- **Throughput:** 100+ webhooks/hour
- **Database Connections:** 50 maximum pool size
- **Memory Footprint:** <2GB total for n8n container
- **CPU Usage:** 1 CPU core sufficient
- **Cost Estimate:** ~$20-40/month for VM resources

#### Queue Mode Activation Triggers

Migrate from single-instance to queue mode when:

- User count exceeds 50 active users
- Webhook volume exceeds 500/hour consistently
- Execution times regularly exceed 30 seconds
- Memory usage consistently >80% of 2GB allocation
- CPU usage consistently >70%

#### Cost-Benefit Analysis

- **Single-Instance (Current):** ~50% lower resource cost, simpler operations
- **Queue Mode (Future):** 2-3x resource cost, handles 25-50x current capacity
- **Migration Time:** <1 hour with prepared configuration

### Additional Technical Assumptions and Requests

• **ERPNext on Frappe Cloud** with managed MariaDB, Redis, background workers,
and scheduler • **FLRTS writes through ERPNext REST API only** - no direct
database access • **All parsing logic in single OpenAI GPT-4o prompt** - no
preprocessing or separate intent detection for MVP • **Hardcoded entity lists in
prompt** (team member names, project names) rather than dynamic lookups for MVP
• **Node.js/TypeScript** for FLRTS NLP service with Zod schema validation •
**Telegram Bot API** for primary user interface • **Cloudflare DNS** (no tunnel;
direct DNS-only routing to Frappe Cloud) • **Native ERPNext attachments** for
file storage (optional R2 integration via marketplace app) • **Custom Frappe
app** (flrts_extensions) for mining-specific DocTypes and automation • **ERPNext
REST API and webhooks** for all task/service call operations • **n8n** for
workflow orchestration (optional; may be replaced by Frappe automation) •
**Lists Management** as core feature alongside Tasks

See [ADR-006](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md) for
platform migration details.

## Epic List

### MVP Stories (Active)

• **Epic 1: Infrastructure Foundation** - ✅ COMPLETE (Stories 1.1-1.5) • **Epic
2: Telegram Interface** - Stories 2.1 (Task Creation) and 2.2 (Command Parser -
CREATE only) • **Epic 3: Integration Layer** - Stories 3.1 (ERPNext API - CREATE
only) and 3.2 (OpenAI Context Injection)

### Post-MVP Stories (Deferred)

• **Epic 1 Extensions** - Monitoring, Redis Queue, Schema Migration
([See post-MVP stories](./stories/post-mvp/)) • **Epic 2 Extensions** -
Reminders, Inline Keyboards, Error Recovery, User Context • **Epic 3
Extensions** - Webhooks, Batch Sync, Timezone Logic • **Epic 4: Lists
Management** - Full CRUD for lists with templates and sharing

## Epic 1: Infrastructure Foundation

**Goal:** Establish production infrastructure with OpenProject deployed, n8n
configured in queue mode with Redis, and Edge Functions layer for low-latency
operations.

### Story 1.1: Deploy OpenProject via Docker on DigitalOcean [COMPLETED]

As a system administrator, I want OpenProject deployed via Docker on Digital
Ocean, so that we have our core project management platform running.

**Status:** ✅ COMPLETED - Running at <https://ops.10nz.tools>

### Story 1.2: [DEPRECATED - SUPERSEDED BY ADR-006] PostgreSQL 15.8 Validation

**Status:** ❌ DEPRECATED - No longer applicable after Frappe Cloud migration

As a system administrator, I want to ensure the Supabase database meets version
requirements, so that OpenProject runs without compatibility issues.

**Deprecation Note:** Following the Frappe Cloud migration (ADR-006), database
version management is handled by Frappe Cloud's managed MariaDB. This story is
retained for historical reference only.

**Original Acceptance Criteria:**

1. Verify PostgreSQL version is 15.8 (Supabase default)
2. Confirm OpenProject compatibility with 15.8
3. Document that pgjwt extension requires 15.8
4. Remove any references to PostgreSQL 16+

### Story 1.3: n8n Deployment Configuration [COMPLETED]

As a DevOps engineer, I want n8n properly configured for our 10-user scale, so
that we have optimal performance without unnecessary complexity.

**Acceptance Criteria:**

1. Single-instance n8n deployment (`docker-compose.single.yml`)
2. Resource allocation: 2GB RAM, 1 CPU core
3. Handles 100+ webhooks/hour, 10-20 concurrent executions
4. DB_POSTGRESDB_POOL_SIZE=4 configured
5. Execution pruning enabled (EXECUTIONS_DATA_PRUNE=true)
6. Queue mode config preserved for future scaling (`docker-compose.yml`)
7. Scaling guide documented at `/infrastructure/docs/SCALING_GUIDE.md`

**Status:** ✅ COMPLETED - Decision made for single-instance based on actual
scale requirements

### Story 1.4: [DEPRECATED - SUPERSEDED BY ADR-006] Supabase Edge Functions Setup

**Status:** ❌ DEPRECATED - Replaced by AWS Lambda in September 2025

As a backend developer, I want Edge Functions deployed for low-latency
operations, so that Telegram webhooks respond instantly.

**Deprecation Note:** Following the Frappe Cloud migration (ADR-006), this story
was superseded by AWS Lambda deployment. See
[ADR-006](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md) for
migration rationale.

**Original Acceptance Criteria:**

1. Edge Functions deployed for Telegram webhook receiver
2. Edge Function responds in <100ms with acknowledgment
3. Edge Function triggers n8n workflow via webhook
4. Environment variables configured for bot token
5. Error handling returns graceful messages
6. Monitoring for function execution times

### Story 1.5: [DEPRECATED - SUPERSEDED BY ADR-006] Supabase Webhooks Configuration

**Status:** ❌ DEPRECATED - Replaced by ERPNext webhooks in September 2025

As a backend developer, I want Supabase webhooks configured, so that database
changes trigger n8n workflows.

**Deprecation Note:** Following the Frappe Cloud migration (ADR-006), this story
was superseded by ERPNext webhook functionality. See
[ADR-006](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md) for
migration rationale.

**Original Acceptance Criteria:**

1. Database webhooks configured for task table changes
2. Webhook endpoints point to n8n workflows
3. Retry logic configured for failed webhooks
4. Webhook payload structure documented
5. Security tokens configured for webhook validation

### Story 1.6: [MOVED TO POST-MVP] Redis Queue Configuration

As a DevOps engineer, I want Redis ready for when we scale to queue mode, so
that migration is seamless when needed.

**Acceptance Criteria:**

1. Queue mode configuration preserved in `docker-compose.yml`
2. Migration triggers documented (50+ users, 500+ webhooks/hour)
3. Scaling guide available at `/infrastructure/docs/SCALING_GUIDE.md`
4. Redis configuration templates ready for deployment
5. Migration can be completed in <1 hour when triggered

**Note:** Not needed for current 10-user scale. Single-instance mode handles
current load efficiently.

### Story 1.7: [MOVED TO POST-MVP] Monitoring and Observability

As a DevOps engineer, I want monitoring for all infrastructure components, so
that we can track performance and reliability.

**Acceptance Criteria:**

1. n8n queue length monitoring
2. Edge Function latency tracking
3. Database connection pool metrics
4. Worker CPU/memory utilization
5. Webhook response time measurements
6. Alert thresholds configured

## Epic 2: Telegram Interface

**Goal:** Build the Telegram bot interface layer with natural language task
creation, reminders, inline keyboards, and error recovery.

### Story 2.1: Telegram Task Creation Workflow

As a field employee, I want to create tasks through Telegram using natural
language, so that I can quickly assign work without opening OpenProject.

**Acceptance Criteria:**

1. Telegram bot receives natural language messages
2. Messages sent to n8n workflow for processing
3. Parsed results shown as confirmation message
4. User can confirm or correct before execution
5. Task/service call created in ERPNext via API
6. Success/failure notification sent back

### Story 2.2: Telegram Reminder System

As a field employee, I want to receive task reminders in Telegram, so that I
don't miss important deadlines.

**Acceptance Criteria:**

1. Reminder times parsed from task creation
2. n8n cron workflow checks for due reminders
3. Telegram messages sent at reminder times
4. Reminders include task details and links
5. Users can snooze or mark complete from Telegram
6. Reminder status synced back to OpenProject

### Story 2.3: Telegram Inline Keyboards

As a mobile user, I want to use buttons instead of typing commands, so that I
can interact faster on my phone.

**Acceptance Criteria:**

1. Inline keyboards for common actions (confirm/cancel/edit)
2. Task status buttons (complete/in-progress/blocked)
3. Quick reply templates for common responses
4. Navigation buttons for multi-page results
5. Callback handlers process button clicks
6. Visual feedback for button interactions

### Story 2.4: Error Recovery Procedures

As a user, I want helpful error messages when something fails, so that I know
how to fix the problem.

**Acceptance Criteria:**

1. NLP parsing failures show suggested corrections
2. API errors translated to user-friendly messages
3. Retry logic for transient failures
4. Fallback to manual entry instructions
5. Error logs captured for debugging
6. Admin notifications for critical failures

### Story 2.5: Telegram Command Parser [TODO]

As a power user, I want to use explicit commands for precise control, so that I
can bypass NLP when needed.

**Acceptance Criteria:**

1. /create, /update, /list, /archive commands
2. Structured command syntax documented
3. Parameter validation and error messages
4. Command help text available via /help
5. Command shortcuts for common operations
6. Command history and autocomplete

### Story 2.6: Telegram User Context [TODO]

As a user, I want the bot to remember my context, so that I don't have to repeat
information.

**Acceptance Criteria:**

1. User timezone stored and applied automatically
2. Recent tasks remembered for quick updates
3. Default project/assignee preferences
4. Conversation state maintained across messages
5. Context reset command available
6. Privacy-compliant context storage

**OpenAI API Request Payload Structure:** The following data MUST be sent to
OpenAI for every NLP processing request:

```json
{
  "message": "<raw user input from Telegram>",
  "context": {
    "sender": {
      "name": "<sender name: Joel|Bryan|Taylor|Colin>",
      "timezone": "<EST|CST|PST>",
      "current_time": "<ISO-8601 timestamp in sender's timezone>"
    },
    "team_members": {
      "Joel": { "timezone": "EST", "role": "CEO" },
      "Bryan": { "timezone": "EST", "role": "CFO" },
      "Taylor": { "timezone": "CST", "role": "Operator" },
      "Colin": { "timezone": "PST", "role": "CTO" },
      "Bernie": { "timezone": "PST", "role": "Investor" },
      "Ari": { "timezone": "PST", "role": "Investor" }
    },
    "available_projects": ["Site A", "Site B", "Site C"],
    "supported_operations": ["CREATE", "READ", "UPDATE", "ARCHIVE"]
  }
}
```

**Required OpenAI Response Schema:** OpenAI must return the following structured
JSON for ALL operations:

```json
{
  "operation": "CREATE|READ|UPDATE|ARCHIVE",
  "flrt_type": "TASK|LIST",
  "data": {
    "assigner": "<name from team_members>",
    "assignee": "<name from team_members>",
    "participants": ["<array of additional team members>"],
    "task_description": "<parsed task description>",
    "reminder_at": "<ISO-8601 or null>",
    "due_at": "<ISO-8601 or null>",
    "recurrence": "<recurrence pattern string or null>",
    "location": "<Site A|Site B|Site C or null>",
    "assignee_timezone": "<EST|CST|PST>",
    "status": "todo|in_progress|done|archived",
    "original_time_reference": "<how time was expressed in input>",
    "time_context": "sender_time|assignee_time|absolute",
    "work_package_id": "<for UPDATE/ARCHIVE/READ operations>"
  },
  "confidence": 0.95,
  "parse_errors": []
}
```

**Note on Test Data:** The existing 100 synthetic examples in
`/docs/flrts-crud-query-examples.md` currently only show CREATE operations
without CRUD operation type or timezone context. These examples need to be
expanded to include:

- Operation type field (CREATE/READ/UPDATE/ARCHIVE)
- FLRT type field (TASK/LIST)
- Time context information (sender_time/assignee_time/absolute)
- Examples for all CRUD operations, not just CREATE
- Work package IDs for UPDATE/ARCHIVE/READ operations

## Epic 3: Integration Layer

**Goal:** Build n8n workflows for ERPNext API integration, webhook processing,
batch operations, and NLP processing.

### Story 3.1: ERPNext API Workflows [TODO]

As a backend developer, I want n8n workflows for all ERPNext operations, so that
we have reliable API integration.

**Acceptance Criteria:**

1. CREATE Maintenance Visit workflow via POST /api/resource/Maintenance Visit
2. READ Maintenance Visit workflow with appropriate filters
3. UPDATE workflow via PATCH /api/resource/Maintenance Visit/\<name\>
4. ARCHIVE workflow via status change (never DELETE)
5. Error handling with retries
6. Response transformation to standard format

### Story 3.2: OpenProject Webhook Sync

As a system administrator, I want OpenProject changes to sync back to our
system, so that we maintain data consistency.

**Acceptance Criteria:**

1. OpenProject webhooks configured for work package changes
2. n8n webhook receiver processes OpenProject events
3. Status updates reflected in Telegram notifications
4. Assignment changes trigger notifications
5. Due date changes update reminder schedules
6. Webhook signature validation implemented

### Story 3.3: Batch Sync Workflows [TODO]

As a system administrator, I want batch synchronization workflows, so that we
can handle bulk operations efficiently.

**Acceptance Criteria:**

1. SplitInBatches node configuration
2. Rate limiting for external APIs
3. Progress tracking and reporting
4. Error handling per batch item
5. Partial success handling
6. Performance optimization for large datasets

### Story 3.4: OpenAI Context Injection (MVP)

As a backend developer, I want to pass all valid options to OpenAI, so that it
can match natural language to specific entities.

**Acceptance Criteria:**

1. Fetch all users, sites, contractors from database
2. Include complete lists in OpenAI prompt
3. Include current UTC timestamp in prompt
4. OpenAI matches entities to provided IDs
5. Timezone logic handles "my time" vs assignee time
6. Prompt stays within token limits

### Story 3.5: Timezone Conversion Logic [TODO]

As a distributed team, I want automatic timezone conversion, so that times are
always correct.

**Acceptance Criteria:**

1. Timezone detection from context
2. User timezone mapping configuration
3. DST handling for all zones
4. Relative time parsing ("tomorrow", "next week")
5. Conversion accuracy 100%
6. Clear timezone display in confirmations

## Epic 4: Lists Management

**Goal:** Implement Lists feature for organizing tasks, managing collections via
Telegram commands, with templates and sharing capabilities.

### Story 4.1: Lists Interface

As a field employee, I want to create filtered task views and simple bullet
lists, so that I can organize work and personal reminders.

**Acceptance Criteria:**

1. Telegram commands for task filtering: `/my_tasks`, `/overdue`, `/today`
2. Simple bullet list creation: `/create_list Shopping`
3. List management commands: `/add_to_list`, `/show_list`
4. Task lists return formatted results with actionable buttons
5. Both filtered task queries and simple bullet lists working
6. Mobile-optimized display format

### Story 4.2: List Management Commands

As an operations team member, I want to manage task lists via Telegram commands,
so that I can organize work by project, client, or operational area.

**Acceptance Criteria:**

1. `/createlist` and `/newlist` commands work identically
2. Parse list name and optional description
3. Support visibility setting (team/private)
4. `/updatelist` shows numbered list of user's lists
5. `/viewlists` shows all accessible lists with task counts
6. Natural language support for list operations

### Story 4.3: List Templates System [TODO]

As a team lead, I want to create reusable list templates, so that standard
processes can be quickly instantiated.

**Acceptance Criteria:**

1. Create template from existing list
2. Template library management
3. Instantiate template with variables
4. Share templates across team
5. Version control for templates
6. Template usage analytics

### Story 4.4: List Sharing & Permissions [TODO]

As a team member, I want to share lists with specific colleagues, so that we can
collaborate on task collections.

**Acceptance Criteria:**

1. Share lists with individuals or groups
2. Read-only vs edit permissions
3. Notification on share
4. Revoke access capability
5. Audit trail of access changes
6. List ownership transfer

### Story 4.5: List Notifications [TODO]

As a list member, I want notifications about list changes, so that I stay
informed about shared work.

**Acceptance Criteria:**

1. Notification on task added to list
2. Notification on list shared
3. Daily list summary option
4. Notification preferences per list
5. Batch notifications for multiple changes
6. Unsubscribe capability

## Minimal MVP Checklist (v3.0 - CREATE Operations Only)

### ✅ Completed Infrastructure (Epic 1)

1. **Platform:** ERPNext on Frappe Cloud (<https://ops.10nz.tools>)
2. **Database:** MariaDB managed by Frappe Cloud
3. **Storage:** Native ERPNext attachments
4. **DNS:** Cloudflare DNS routing to Frappe Cloud
5. **n8n:** Single-instance mode deployed and operational
6. **Lambda:** AWS Lambda for Telegram webhook handling

### 🚧 MVP Implementation (5-Day Sprint)

1. **Day 1-2:** Story 2.1 - Telegram webhook activation and basic bot
2. **Day 2-3:** Story 3.1 - ERPNext CREATE API workflow in n8n
3. **Day 3-4:** Story 3.2 - OpenAI context injection with hardcoded entities
4. **Day 4-5:** Story 2.2 - Command parser for CREATE operations only
5. **Day 5:** Integration testing and demo preparation

### ❌ Deferred to Post-MVP

- All READ, UPDATE, DELETE operations
- Complex timezone conversion logic
- Reminder systems and notifications
- Inline keyboards and UI enhancements
- Lists management (Epic 4)

1. **Backup:** Daily snapshots enabled; take manual snapshot before cutover.

## Post-MVP Stories and Enhancements

### Deferred Stories

The following stories have been moved to post-MVP to focus on core CREATE
functionality:

#### Infrastructure Extensions (Epic 1)

- [1.6 Redis Queue Configuration](./stories/post-mvp/1.6.redis-queue-configuration.md)
- [1.7 Monitoring and Observability](./stories/post-mvp/1.7.monitoring-observability.md)
- [1.8 Migrate Monitoring to DigitalOcean](./stories/post-mvp/1.8.migrate-monitoring-digitalocean.md)
- [1.9 OpenProject Schema Migration](./stories/post-mvp/1.9.openproject-schema-migration.md)

#### Telegram Interface Extensions (Epic 2)

- [2.2 Telegram Reminder System](./stories/post-mvp/2.2.telegram-reminder-system.md)
- [2.3 Telegram Inline Keyboards](./stories/post-mvp/2.3.telegram-inline-keyboards.md)
- [2.4 Error Recovery](./stories/post-mvp/2.4.error-recovery.md)
- [2.6 Telegram User Context](./stories/post-mvp/2.6.telegram-user-context.md)

#### Integration Layer Extensions (Epic 3)

- [3.2 OpenProject Webhooks](./stories/post-mvp/3.2.openproject-webhooks.md)
- [3.3 Batch Sync Workflows](./stories/post-mvp/3.3.batch-sync-workflows.md)
- [3.5 Timezone Conversion Logic](./stories/post-mvp/3.5.timezone-conversion-logic.md)

#### Lists Management (Epic 4)

- [4.1 Lists Interface](./stories/post-mvp/4.1.lists-interface.md)
- [4.2 List Commands](./stories/post-mvp/4.2.list-commands.md)
- [4.3 List Templates System](./stories/post-mvp/4.3.list-templates-system.md)
- [4.4 List Sharing Permissions](./stories/post-mvp/4.4.list-sharing-permissions.md)
- [4.5 List Notifications](./stories/post-mvp/4.5.list-notifications.md)

#### Infrastructure Improvements

- [INFRA-001 Directory Consolidation](./stories/post-mvp/INFRA-001-directory-consolidation.md)
- [INFRA-002 Container Naming Standardization](./stories/post-mvp/INFRA-002-container-naming-standardization.md)

## Post-MVP Hardening (Defer)

- PITR backups + quarterly restore drills
- Google SSO integration
- Performance monitoring and SLOs
- Centralized logging
- Cache optimization
- Secret rotation
- Second VM for availability

## Next Steps

### UX Expert Prompt

Review the FLRTS PRD focusing on the Telegram bot interface (Epic 3). Design the
conversational flow for the correction loop, ensuring clear feedback and
intuitive interaction patterns for mobile users.

### Architect Prompt

Review the FLRTS PRD with focus on Epic 1 migration stories and Epic 2 service
enhancement. Create technical architecture for VM-based deployment with direct
Supabase connection, eliminating all synchronization complexity.
