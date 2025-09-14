# FLRTS NLP Task Management Service Product Requirements Document (PRD)

## Goals and Background Context

### Goals
• Enable rapid, friction-free task creation through natural language processing for distributed team operations
• Eliminate manual timezone conversion errors by automatically converting all times to assignee's local timezone  
• Reduce average task creation time from 45 seconds to under 5 seconds
• Maintain full OpenProject functionality while adding NLP enhancement layer via API integration
• Provide dual-interface access (OpenProject UI + FLRTS NLP) for maximum flexibility
• Achieve 95% parse accuracy and 100% timezone conversion accuracy

### Background Context

The FLRTS NLP Task Management Service addresses critical operational friction at a distributed bitcoin mining company where team members across PST, CST, and EST zones need rapid task coordination. The current manual form-based task entry in OpenProject creates significant delays and dropped tasks due to timezone confusion and workflow interruption. By leveraging a simplified single-database architecture where OpenProject connects directly to Supabase PostgreSQL, FLRTS provides a natural language enhancement layer that converts conversational commands like "Hey Taylor, Colin needs the server logs by 1pm his time" into properly structured API calls to OpenProject. 

**Critical Architecture Rule:** FLRTS implements a "Reflex and Brain" hybrid architecture:
- **Reflex Layer (Edge Functions)**: Handles immediate responses (<100ms) for Telegram acknowledgments and simple queries
- **Brain Layer (n8n Workflows)**: Orchestrates complex business logic, multi-step operations, and all OpenProject API interactions
- **Data Flow**: User → Telegram → Edge Function (instant ACK) → n8n Workflow → OpenProject API → Supabase PostgreSQL
- **Performance Rule**: Operations requiring <500ms response use Edge Functions; all others use n8n workflows
- **Database Rule**: FLRTS never writes to the database directly - all writes go through OpenProject REST API

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-12 | 1.0 | Initial PRD creation with single-database architecture | John (PM Agent) |
| 2025-01-13 | 2.0 | Major update: PostgreSQL 15.8, n8n-first hybrid architecture, Lists feature | John (PM Agent) |

## Requirements

### Functional Requirements

• **FR1:** The system shall parse natural language task commands into structured JSON using OpenAI GPT-4o API with a single comprehensive prompt
• **FR2:** The system shall support CREATE, READ, UPDATE, and ARCHIVE operations for work packages via natural language commands (DELETE operations are soft-delete/archive only to maintain audit trail)
• **FR3:** The system shall parse time references to identify context (sender's time, assignee's time, or absolute time), then convert times to assignee's local timezone using application-layer timezone logic (OpenAI provides time_context field, FLRTS performs actual conversion)
• **FR4:** The system shall recognize @mentions for task assignees and map them to OpenProject user IDs
• **FR5:** The system shall parse relative dates and times ("tomorrow at 2pm", "next Monday", "in 3 days") into absolute timestamps
• **FR6:** The system shall display a confirmation UI showing the parsed JSON before executing any operation against the OpenProject API
• **FR7:** The system shall integrate with OpenProject's REST API to execute ALL task management operations (no direct database writes)
• **FR8:** The system shall provide error messages with suggested manual entry when parsing fails
• **FR9:** The system shall support /commands for explicit operation types (/create, /update, /archive, /list)
• **FR10:** The system shall send task reminder notifications to both Telegram and email channels
• **FR11:** The system shall maintain user access to the full OpenProject UI alongside the NLP interface
• **FR12:** The system shall maintain a complete audit trail by implementing soft-delete/archive operations only - true deletions are restricted to admin users (Colin) via direct database access

### Non-Functional Requirements

• **NFR1:** [DEFERRED] Google Workspace SSO for authentication (use basic auth for MVP)
• **NFR2:** The system shall be "fast enough" for 5-10 users (performance metrics post-MVP)
• **NFR3:** The system shall achieve 95% parse accuracy on the 100-example synthetic test dataset
• **NFR4:** The system shall achieve 100% mathematical accuracy for timezone conversions
• **NFR5:** The system shall use Supavisor Session Mode (port 5432) for all database connections to prevent transaction mode incompatibilities
• **NFR6:** The system shall use PostgreSQL version 15.8 for optimal Supabase compatibility and extension support
• **NFR7:** [OPTIONAL] If using R2 storage, set OPENPROJECT_DIRECT__UPLOADS=false (local volume acceptable for MVP)
• **NFR8:** VM deployment should be in same region/provider family as Supabase (best effort)
• **NFR9:** [ASPIRATIONAL] Target 99.9% availability (not guaranteed for MVP)
• **NFR10:** The system shall use SSL/TLS encryption for all database connections (sslmode=require)
• **NFR11:** The system shall implement container isolation between services using Docker Compose
• **NFR12:** The system shall use Cloudflare Tunnel for zero-trust external access
• **NFR13:** n8n must run in queue mode with Redis for production scaling (not main mode)
• **NFR14:** Edge Functions handle all operations requiring <500ms response time
• **NFR15:** n8n worker concurrency set to 20 for I/O-bound operations (N8N_CONCURRENCY=20)
• **NFR16:** PostgreSQL connection pool size set to 4 minimum (DB_POSTGRESDB_POOL_SIZE=4)

## User Interface Design Goals

### Overall UX Vision
Telegram-first conversational interface where users send natural language messages and receive parsed JSON confirmations. The correction loop happens entirely through chat messages - users reply with corrections until the parsing is accurate, then confirm for execution.

### Key Interaction Paradigms
• **Conversational correction loop**: Send message → Review bot response → Reply with corrections → Repeat until correct → Confirm
• **Text-only confirmation**: Bot shows parsed JSON in readable format, user types "yes" or "confirm" to execute
• **OpenProject fallback**: Users can confirm faulty parsing and fix directly in OpenProject's mobile-responsive UI

### Core Screens and Views
• **Telegram Bot Chat** - Primary interface for all NLP interactions
• **JSON Confirmation Message** - Bot's formatted response showing parsed intent
• **OpenProject Mobile UI** - Fallback interface for manual corrections (existing responsive design)

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
- **Reflex Layer**: Supabase Edge Functions for immediate responses (<100ms latency)
- **Brain Layer**: n8n workflows in queue mode for complex orchestration (20-50ms base overhead acceptable)
- **Infrastructure**: VM-based deployment using Docker Compose with OpenProject, n8n (queue mode), Redis, and supporting services
- **Integration Pattern**: Edge Functions acknowledge users instantly, then trigger n8n workflows asynchronously

### Testing Requirements  
Unit tests for timezone conversion logic and NLP parsing validation against 100-example synthetic dataset. Manual testing via Telegram bot for MVP, with automated integration tests post-MVP.

### Additional Technical Assumptions and Requests
• **Single Supabase PostgreSQL database** with logical schema separation (openproject schema owned by OpenProject, flrts schema for FLRTS logs/metrics only)
• **OpenProject connects directly to Supabase** via DATABASE_URL - no synchronization needed
• **FLRTS never writes to openproject schema** - all writes go through OpenProject REST API
• **All parsing logic in single OpenAI GPT-4o prompt** - no preprocessing or separate intent detection for MVP
• **Hardcoded entity lists in prompt** (team member names, project names) rather than dynamic lookups for MVP
• **Node.js/TypeScript** for FLRTS NLP service with Zod schema validation
• **Telegram Bot API** for primary user interface
• **Cloudflare Tunnel** for secure external access to services
• **Cloudflare R2** for object storage (replaces local file uploads)
• **Digital Ocean VM** deployment in same region as Supabase
• **Docker Compose** for service orchestration and container management
• **OpenProject REST API** for all task operations (not direct database access)
• **n8n in Queue Mode** with Redis for workflow orchestration
• **Supabase Edge Functions** for latency-critical operations
• **Lists Management** as core feature alongside Tasks

## Epic List

• **Epic 1: Infrastructure Foundation** - Deploy OpenProject, configure n8n in queue mode, establish Edge Functions layer
• **Epic 2: Telegram Interface** - Build Telegram bot interface with task creation, reminders, inline keyboards, and error recovery
• **Epic 3: Integration Layer** - Build n8n workflows for OpenProject API, webhooks, batch sync, OpenAI integration, and timezone conversion
• **Epic 4: Lists Management** - Implement Lists interface, management commands, templates, sharing, and notifications

## Epic 1: Infrastructure Foundation

**Goal:** Establish production infrastructure with OpenProject deployed, n8n configured in queue mode with Redis, and Edge Functions layer for low-latency operations.

### Story 1.1: Deploy OpenProject via Docker on DigitalOcean [COMPLETED]
As a system administrator,
I want OpenProject deployed via Docker on Digital Ocean,
so that we have our core project management platform running.

**Status:** ✅ COMPLETED - Running at https://ops.10nz.tools

### Story 1.2: PostgreSQL 15.8 Validation
As a system administrator,
I want to ensure the Supabase database meets version requirements,
so that OpenProject runs without compatibility issues.

**Acceptance Criteria:**
1. Verify PostgreSQL version is 15.8 (Supabase default)
2. Confirm OpenProject compatibility with 15.8
3. Document that pgjwt extension requires 15.8
4. Remove any references to PostgreSQL 16+

### Story 1.3: n8n Queue Mode Configuration
As a DevOps engineer,
I want n8n configured in queue mode with Redis,
so that we can handle concurrent workflows at scale.

**Acceptance Criteria:**
1. Redis container deployed for queue management
2. n8n main instance configured with EXECUTIONS_MODE=queue
3. n8n worker instances configured with concurrency=20
4. DB_POSTGRESDB_POOL_SIZE=4 configured
5. Execution pruning enabled (EXECUTIONS_DATA_PRUNE=true)
6. Health checks verify queue connectivity

### Story 1.4: Supabase Edge Functions Setup
As a backend developer,
I want Edge Functions deployed for low-latency operations,
so that Telegram webhooks respond instantly.

**Acceptance Criteria:**
1. Edge Functions deployed for Telegram webhook receiver
2. Edge Function responds in <100ms with acknowledgment
3. Edge Function triggers n8n workflow via webhook
4. Environment variables configured for bot token
5. Error handling returns graceful messages
6. Monitoring for function execution times

### Story 1.5: Supabase Webhooks Configuration
As a backend developer,
I want Supabase webhooks configured,
so that database changes trigger n8n workflows.

**Acceptance Criteria:**
1. Database webhooks configured for task table changes
2. Webhook endpoints point to n8n workflows
3. Retry logic configured for failed webhooks
4. Webhook payload structure documented
5. Security tokens configured for webhook validation

### Story 1.6: Redis Queue Configuration [TODO]
As a DevOps engineer,
I want Redis properly configured for n8n queue mode,
so that workflows execute reliably.

**Acceptance Criteria:**
1. Redis container deployed with persistence
2. Redis connection verified from n8n main and workers
3. Queue monitoring dashboard accessible
4. Automatic queue cleanup configured
5. Redis memory limits set appropriately
6. Connection pooling optimized

### Story 1.7: Monitoring and Observability [TODO]
As a DevOps engineer,
I want monitoring for all infrastructure components,
so that we can track performance and reliability.

**Acceptance Criteria:**
1. n8n queue length monitoring
2. Edge Function latency tracking
3. Database connection pool metrics
4. Worker CPU/memory utilization
5. Webhook response time measurements
6. Alert thresholds configured


## Epic 2: Telegram Interface

**Goal:** Build the Telegram bot interface layer with natural language task creation, reminders, inline keyboards, and error recovery.

### Story 2.1: Telegram Task Creation Workflow
As a field employee,
I want to create tasks through Telegram using natural language,
so that I can quickly assign work without opening OpenProject.

**Acceptance Criteria:**
1. Telegram bot receives natural language messages
2. Messages sent to n8n workflow for processing
3. Parsed results shown as confirmation message
4. User can confirm or correct before execution
5. Task created in OpenProject via API
6. Success/failure notification sent back

### Story 2.2: Telegram Reminder System
As a field employee,
I want to receive task reminders in Telegram,
so that I don't miss important deadlines.

**Acceptance Criteria:**
1. Reminder times parsed from task creation
2. n8n cron workflow checks for due reminders
3. Telegram messages sent at reminder times
4. Reminders include task details and links
5. Users can snooze or mark complete from Telegram
6. Reminder status synced back to OpenProject

### Story 2.3: Telegram Inline Keyboards
As a mobile user,
I want to use buttons instead of typing commands,
so that I can interact faster on my phone.

**Acceptance Criteria:**
1. Inline keyboards for common actions (confirm/cancel/edit)
2. Task status buttons (complete/in-progress/blocked)
3. Quick reply templates for common responses
4. Navigation buttons for multi-page results
5. Callback handlers process button clicks
6. Visual feedback for button interactions

### Story 2.4: Error Recovery Procedures
As a user,
I want helpful error messages when something fails,
so that I know how to fix the problem.

**Acceptance Criteria:**
1. NLP parsing failures show suggested corrections
2. API errors translated to user-friendly messages
3. Retry logic for transient failures
4. Fallback to manual entry instructions
5. Error logs captured for debugging
6. Admin notifications for critical failures

### Story 2.5: Telegram Command Parser [TODO]
As a power user,
I want to use explicit commands for precise control,
so that I can bypass NLP when needed.

**Acceptance Criteria:**
1. /create, /update, /list, /archive commands
2. Structured command syntax documented
3. Parameter validation and error messages
4. Command help text available via /help
5. Command shortcuts for common operations
6. Command history and autocomplete

### Story 2.6: Telegram User Context [TODO]
As a user,
I want the bot to remember my context,
so that I don't have to repeat information.

**Acceptance Criteria:**
1. User timezone stored and applied automatically
2. Recent tasks remembered for quick updates
3. Default project/assignee preferences
4. Conversation state maintained across messages
5. Context reset command available
6. Privacy-compliant context storage

**OpenAI API Request Payload Structure:**
The following data MUST be sent to OpenAI for every NLP processing request:

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

**Required OpenAI Response Schema:**
OpenAI must return the following structured JSON for ALL operations:

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

**Note on Test Data:** The existing 100 synthetic examples in `/docs/flrts-crud-query-examples.md` currently only show CREATE operations without CRUD operation type or timezone context. These examples need to be expanded to include:
- Operation type field (CREATE/READ/UPDATE/ARCHIVE)
- FLRT type field (TASK/LIST)
- Time context information (sender_time/assignee_time/absolute)
- Examples for all CRUD operations, not just CREATE
- Work package IDs for UPDATE/ARCHIVE/READ operations

## Epic 3: Integration Layer

**Goal:** Build n8n workflows for OpenProject API integration, webhook processing, batch operations, and NLP processing.

### Story 3.1: OpenProject API Workflows [TODO]
As a backend developer,
I want n8n workflows for all OpenProject operations,
so that we have reliable API integration.

**Acceptance Criteria:**
1. CREATE work package workflow via POST /api/v3/work_packages
2. READ work packages workflow with filtering
3. UPDATE work package workflow via PATCH
4. ARCHIVE workflow via status change (never DELETE)
5. Error handling with retries
6. Response transformation to standard format

### Story 3.2: OpenProject Webhook Sync
As a system administrator,
I want OpenProject changes to sync back to our system,
so that we maintain data consistency.

**Acceptance Criteria:**
1. OpenProject webhooks configured for work package changes
2. n8n webhook receiver processes OpenProject events
3. Status updates reflected in Telegram notifications
4. Assignment changes trigger notifications
5. Due date changes update reminder schedules
6. Webhook signature validation implemented

### Story 3.3: Batch Sync Workflows [TODO]
As a system administrator,
I want batch synchronization workflows,
so that we can handle bulk operations efficiently.

**Acceptance Criteria:**
1. SplitInBatches node configuration
2. Rate limiting for external APIs
3. Progress tracking and reporting
4. Error handling per batch item
5. Partial success handling
6. Performance optimization for large datasets

### Story 3.4: OpenAI Context Injection (MVP)
As a backend developer,
I want to pass all valid options to OpenAI,
so that it can match natural language to specific entities.

**Acceptance Criteria:**
1. Fetch all users, sites, contractors from database
2. Include complete lists in OpenAI prompt
3. Include current UTC timestamp in prompt
4. OpenAI matches entities to provided IDs
5. Timezone logic handles "my time" vs assignee time
6. Prompt stays within token limits

### Story 3.5: Timezone Conversion Logic [TODO]
As a distributed team,
I want automatic timezone conversion,
so that times are always correct.

**Acceptance Criteria:**
1. Timezone detection from context
2. User timezone mapping configuration
3. DST handling for all zones
4. Relative time parsing ("tomorrow", "next week")
5. Conversion accuracy 100%
6. Clear timezone display in confirmations

## Epic 4: Lists Management

**Goal:** Implement Lists feature for organizing tasks, managing collections via Telegram commands, with templates and sharing capabilities.

### Story 4.1: Lists Interface
As a field employee,
I want to create filtered task views and simple bullet lists,
so that I can organize work and personal reminders.

**Acceptance Criteria:**
1. Telegram commands for task filtering: `/my_tasks`, `/overdue`, `/today`
2. Simple bullet list creation: `/create_list Shopping`
3. List management commands: `/add_to_list`, `/show_list`
4. Task lists return formatted results with actionable buttons
5. Both filtered task queries and simple bullet lists working
6. Mobile-optimized display format

### Story 4.2: List Management Commands
As an operations team member,
I want to manage task lists via Telegram commands,
so that I can organize work by project, client, or operational area.

**Acceptance Criteria:**
1. `/createlist` and `/newlist` commands work identically
2. Parse list name and optional description
3. Support visibility setting (team/private)
4. `/updatelist` shows numbered list of user's lists
5. `/viewlists` shows all accessible lists with task counts
6. Natural language support for list operations

### Story 4.3: List Templates System [TODO]
As a team lead,
I want to create reusable list templates,
so that standard processes can be quickly instantiated.

**Acceptance Criteria:**
1. Create template from existing list
2. Template library management
3. Instantiate template with variables
4. Share templates across team
5. Version control for templates
6. Template usage analytics

### Story 4.4: List Sharing & Permissions [TODO]
As a team member,
I want to share lists with specific colleagues,
so that we can collaborate on task collections.

**Acceptance Criteria:**
1. Share lists with individuals or groups
2. Read-only vs edit permissions
3. Notification on share
4. Revoke access capability
5. Audit trail of access changes
6. List ownership transfer

### Story 4.5: List Notifications [TODO]
As a list member,
I want notifications about list changes,
so that I stay informed about shared work.

**Acceptance Criteria:**
1. Notification on task added to list
2. Notification on list shared
3. Daily list summary option
4. Notification preferences per list
5. Batch notifications for multiple changes
6. Unsubscribe capability

## Minimal MVP Checklist (Updated)

1. **DB:** Create Supabase project (PostgreSQL 15.8). Create schema `openproject`; create role `openproject_app`; grant `USAGE, CREATE`. Use port 5432 session URL with `sslmode=require`.

2. **App:** Set `DATABASE_URL` with `sslmode=require`; set `SECRET_KEY_BASE`. Run migrations. Health check returns 200.

3. **Storage:** Choose local volume OR R2 (not both). If R2, set credentials + `OPENPROJECT_DIRECT__UPLOADS=false`. Upload 10MB test file.

4. **Edge:** Start Cloudflare Tunnel; map hostname; no public ports.

5. **n8n:** Configure queue mode with Redis, set concurrency=20, enable execution pruning. Deploy workflows for OpenProject API integration.

6. **Edge Functions:** Deploy Telegram webhook receiver with <100ms response time. Trigger n8n workflows asynchronously.

7. **Backup:** Daily snapshots enabled; take manual snapshot before cutover.

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
Review the FLRTS PRD focusing on the Telegram bot interface (Epic 3). Design the conversational flow for the correction loop, ensuring clear feedback and intuitive interaction patterns for mobile users.

### Architect Prompt
Review the FLRTS PRD with focus on Epic 1 migration stories and Epic 2 service enhancement. Create technical architecture for VM-based deployment with direct Supabase connection, eliminating all synchronization complexity.