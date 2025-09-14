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

**Critical Architecture Rule:** FLRTS never writes to the database directly. All data flows through: User → Telegram → FLRTS → OpenAI (parse) → FLRTS (validate/timezone) → OpenProject REST API → Supabase PostgreSQL. This ensures OpenProject owns all migrations, constraints, and business rules.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-12 | 1.0 | Initial PRD creation with single-database architecture | John (PM Agent) |

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
• **NFR6:** The system shall require PostgreSQL version 16 or higher for database compatibility
• **NFR7:** [OPTIONAL] If using R2 storage, set OPENPROJECT_DIRECT__UPLOADS=false (local volume acceptable for MVP)
• **NFR8:** VM deployment should be in same region/provider family as Supabase (best effort)
• **NFR9:** [ASPIRATIONAL] Target 99.9% availability (not guaranteed for MVP)
• **NFR10:** The system shall use SSL/TLS encryption for all database connections (sslmode=require)
• **NFR11:** The system shall implement container isolation between services using Docker Compose
• **NFR12:** The system shall use Cloudflare Tunnel for zero-trust external access

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
VM-based deployment using Docker Compose orchestration with containerized services: OpenProject (Rails application with direct Supabase connection), FLRTS NLP service (Node.js/TypeScript), n8n workflow automation, and Telegram bot service.

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

## Epic List

• **Epic 1: Foundation & Infrastructure Setup** - Migrate from local PostgreSQL to Supabase, establish VM environment, deploy OpenProject with direct database connection
• **Epic 2: NLP Service Enhancement** - Enhance existing FLRTS NLP service with timezone conversion, CRUD operations, and OpenProject API integration
• **Epic 3: Telegram Bot Interface** - Create Telegram bot with conversational correction loop and confirmation flow

## Epic 1: Foundation & Infrastructure Setup

**Goal:** Migrate from local PostgreSQL to Supabase-based architecture, establish Digital Ocean VM deployment, and get OpenProject running with direct database connection, eliminating all synchronization requirements.

### Story 1.1: Pre-Migration Snapshot
As a system administrator,
I want to take a manual backup snapshot before migration,
so that we can recover if needed.

**Acceptance Criteria:**
1. Manual Supabase snapshot taken before any migration
2. Existing docker PostgreSQL data exported if needed
3. Backup location documented

### Story 1.2: Minimal VM Setup
As a DevOps engineer,
I want to provision a single VM with Docker Compose,
so that we can run all services.

**Acceptance Criteria:**
1. One VM provisioned (nearest region to Supabase)
2. Docker and Docker Compose installed
3. Cloudflare Tunnel configured (no public ports)
4. Basic `.env` file created

### Story 1.3: Supabase Quick Setup
As a database administrator,
I want to create minimal Supabase configuration,
so that OpenProject can connect.

**Acceptance Criteria:**
1. Supabase project created (PostgreSQL 16+)
2. Schema `openproject` created with role `openproject_app`
3. Role granted `USAGE, CREATE` on schema
4. Connection string uses port 5432 with `sslmode=require`
5. Basic connection test passes

### Story 1.4: OpenProject Container Launch
As a project manager,
I want OpenProject running with Supabase connection,
so that we can manage work packages.

**Acceptance Criteria:**
1. DATABASE_URL set with `sslmode=require`
2. SECRET_KEY_BASE configured
3. Migrations run successfully
4. Health endpoint returns 200
5. One test work package created via UI

### Story 1.5: [DEFERRED] Google SSO Configuration
[This story is deferred to post-MVP. Use basic auth for now.]

### Story 1.6: Simple Storage Setup
As a system administrator,
I want to configure either local volume OR R2 for attachments,
so that users can upload files.

**Acceptance Criteria:**
1. Choose ONE: local volume OR R2 (not both)
2. If R2: set credentials and OPENPROJECT_DIRECT__UPLOADS=false
3. If local: ensure volume mounted properly
4. Upload one 10MB test file successfully

### Story 1.7: Remove Sync Service
As a developer,
I want to remove the obsolete sync-service,
so that the codebase is clean.

**Acceptance Criteria:**
1. packages/sync-service directory deleted
2. docker-compose.yml updated
3. One commit: "Remove obsolete sync service"

## Epic 2: NLP Service Enhancement

**Goal:** Enhance the existing FLRTS NLP service to handle CRUD operations, add timezone conversion in application code, and integrate with OpenProject API instead of direct database access.

### Story 2.1: Timezone Conversion Function
As a developer,
I want one well-tested timezone conversion function,
so that times work correctly.

**Acceptance Criteria:**
1. Single conversion function with moment-timezone
2. User timezone mappings hardcoded
3. 10-15 edge case tests (DST, day boundaries)
4. Function integrated into parser

### Story 2.2: OpenAI Prompt Enhancement
As an NLP engineer,
I want to update the existing prompt to handle CREATE, READ, UPDATE, and ARCHIVE operations,
so that we support full task management with audit trail preservation.

**Acceptance Criteria:**
1. Existing prompt expanded for UPDATE/ARCHIVE/READ operations (no true DELETE)
2. Operation type detection added to parser output
3. ARCHIVE operations use OpenProject's archive/status API endpoints (not DELETE)
4. Hardcoded team member names retained in prompt
5. Entity extraction validated for all operation types
6. 95% accuracy maintained on synthetic test dataset
7. Backward compatibility with existing CREATE functionality

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

### Story 2.3: OpenProject API Integration
As a backend developer,
I want FLRTS to use OpenProject REST API exclusively,
so that OpenProject owns all business logic.

**Acceptance Criteria:**
1. FLRTS calls OpenProject API only (ZERO direct writes to openproject.* tables)
2. CREATE work package via POST /api/v3/work_packages
3. READ work packages via GET /api/v3/work_packages
4. UPDATE work packages via PATCH /api/v3/work_packages/:id
5. ARCHIVE work packages via status change API (set to archived/closed status, never DELETE endpoint)
6. File attachments via OpenProject attachments API (not direct R2)
7. Basic error handling (show error, suggest manual entry)
8. One synthetic test passes end-to-end

### Story 2.4: Service Containerization
As a DevOps engineer,
I want the enhanced NLP service properly containerized,
so that it deploys cleanly in the new architecture.

**Acceptance Criteria:**
1. Dockerfile created for NLP service
2. Service added to main docker-compose.yml
3. Environment variables properly configured
4. Health check endpoint verified
5. Service connects successfully to OpenAI and OpenProject

## Epic 3: Telegram Bot Interface

**Goal:** Create the Telegram bot interface that provides the conversational UI for users to submit commands, review parsed results, iterate on corrections, and confirm execution.

### Story 3.1: Telegram Bot Setup
As a user,
I want to interact with the NLP service through Telegram,
so that I can create tasks from my phone using natural language.

**Acceptance Criteria:**
1. Telegram bot created and token configured
2. Bot service containerized and added to docker-compose.yml
3. Webhook or polling configured for message reception
4. Basic command handling (/start, /help) implemented
5. Bot responds to messages and forwards to NLP service

### Story 3.2: JSON Confirm Step
As a user,
I want to see and confirm parsed JSON before execution,
so that I can verify it's correct.

**Acceptance Criteria:**
1. Bot shows parsed JSON in readable format
2. User types "confirm" to execute or provides correction
3. Correction + previous result sent back to LLM
4. Loop until confirmed

### Story 3.3: [OPTIONAL] Basic Notifications
As a user,
I want basic task notifications,
so that I'm reminded of deadlines.

**Acceptance Criteria:**
1. Simple webhook endpoint for OpenProject
2. Send Telegram message on task due
3. [DEFERRED] Email notifications

## Minimal MVP Checklist (One Sitting)

1. **DB:** Create Supabase project (PG ≥16). Create schema `openproject`; create role `openproject_app`; grant `USAGE, CREATE`. Use port 5432 session URL with `sslmode=require`.

2. **App:** Set `DATABASE_URL` with `sslmode=require`; set `SECRET_KEY_BASE`. Run migrations. Health check returns 200.

3. **Storage:** Choose local volume OR R2 (not both). If R2, set credentials + `OPENPROJECT_DIRECT__UPLOADS=false`. Upload 10MB test file.

4. **Edge:** Start Cloudflare Tunnel; map hostname; no public ports.

5. **FLRTS:** Call OpenProject API only (no direct DB writes to openproject.*); implement timezone conversion; Telegram bot with JSON confirm step. If FLRTS needs logging, use separate `flrts` schema.

6. **Backup:** Daily snapshots enabled; take manual snapshot before cutover.

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