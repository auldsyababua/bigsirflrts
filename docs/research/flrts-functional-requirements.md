# FLRTS Functional Requirements

**Status:** ✅ Phase 1.1 Complete | 🔄 Phase 1.2 Draft - Awaiting User Review
**Phase:** Phase 1.2 **Related Linear:**
[10N-227](https://linear.app/10netzero/issue/10N-227) **Date Created:**
2025-10-01 **Last Updated:** 2025-10-01 (integrated Phase 1.1 findings)

## Purpose

Define what FLRTS NEEDS functionally, independent of OpenProject implementation.
This document focuses on business requirements, workflows, and integrations to
guide ERPNext schema mapping.

**Phase 1.1 Integration:** This document has been updated with critical insights
from the ERPNext Schema Philosophy research. See
[erpnext-schema-philosophy.md](erpnext-schema-philosophy.md) for deep technical
details.

**Note:** This is a draft based on documentation analysis. User will review and
correct as needed.

---

## 1. Business Entity Definitions

### 1.1 Core Business Entities

#### Personnel (Team Members)

**Business Purpose:** Track FLRTS users with Telegram integration and timezone
awareness

**Attributes:**

- Telegram user ID (primary identifier)
- Full name, phone, email
- Timezone (critical for reminder scheduling)
- Role: admin, supervisor, worker, viewer
- Active/inactive status

**Current Team:**

- Joel (CEO, EST timezone)
- Bryan (CFO, EST timezone)
- Taylor (Operator, CST timezone)
- Colin (CTO, PST timezone)
- Bernie (Investor, PST timezone)
- Ari (Investor, PST timezone)

**ERPNext Mapping Strategy (Phase 1.1 Informed):**

**Option A: Use Standard User + Employee DocTypes** (RECOMMENDED)

- Use ERPNext's built-in User DocType for authentication
- Add Employee record for HR/personnel data
- Custom Fields to add:
  - `custom_telegram_user_id` (Data, Unique) - Telegram bot integration
  - `custom_flrts_timezone` (Select) - For reminder scheduling
  - `custom_flrts_role` (Select: Admin, Supervisor, Worker, Viewer)

**Option B: Create Custom `FLRTS Personnel` DocType**

- Separate from ERPNext Users (no login access)
- All FLRTS-specific fields as standard fields
- Links to User DocType if login needed
- Pro: Cleaner separation, no core DocType modification
- Con: Dual user management systems

**Recommendation:** **Option A** - Leverage standard User/Employee, add custom
fields via "Customize Form"

- Follows "The Frappe Way" (extend, don't rebuild)
- Unified authentication with ERPNext
- Custom fields auto-prefixed with `custom_` (upgrade-safe)

**Naming Convention:**

- User: Email-based (standard ERPNext)
- Employee: `EMP-.####` series (e.g., `EMP-0001`)

---

#### Sites/Locations (Mining Facilities)

**Business Purpose:** Track physical work locations for field service operations

**Attributes:**

- Site name
- Site code (unique identifier, used in natural language)
- Aliases (alternative names for NLP matching)
- Location metadata (coordinates, address)
- Active/inactive status

**Business Rules:**

- Must support alias matching for natural language ("the big site" → "BigSir
  Main")
- Code used for quick reference in Telegram commands

**ERPNext Mapping Strategy (Phase 1.1 Informed):**

**Use Standard Location DocType** (FSM Module)

- Built-in support for hierarchical locations (`Is Tree: 1`)
- Standard fields: `location_name`, `parent_location`
- Custom Fields to add:
  - `custom_site_code` (Data, Unique) - Short code for NLP (e.g., "BIGSR-MAIN")
  - `custom_aliases` (Small Text) - Comma-separated aliases for fuzzy matching
  - `custom_coordinates` (Geolocation) - GPS coordinates (future)

**Tree Structure Example:**

```
All Locations
├── USA
│   ├── Nevada
│   │   ├── BigSir Main Site (code: BIGSR-MAIN)
│   │   └── BigSir South Pit (code: BIGSR-SOUTH)
```

**Business Rules (Server Script):**

- Validate site_code uniqueness before save
- Fuzzy match on aliases for Telegram NLP

**Naming Convention:**

- Use `prompt` or `field:location_name` autoname
- User enters descriptive name (e.g., "BigSir Main Site")
- Automatically generates `custom_site_code` from name if empty

---

#### Contractors (Vendors/Suppliers)

**Business Purpose:** Track third-party vendors providing services at sites

**Attributes:**

- Contractor name
- Contractor code (unique identifier)
- Contact information (JSONB: phone, email, primary contact)
- Assigned sites (which locations they service)
- Active/inactive status

**Business Rules:**

- Contractor can be assigned to multiple sites
- Used in work order creation to specify vendor responsibility

**ERPNext Mapping Strategy (Phase 1.1 Informed):**

**Use Standard Supplier DocType** (Buying Module)

- Standard fields: `supplier_name`, `supplier_group`, `supplier_type`
- Custom Fields to add:
  - `custom_contractor_code` (Data, Unique) - Short code (e.g., "ACME")
  - `custom_assigned_sites` (Table) - Child DocType: `FLRTS Contractor Site`
    - Fields: `site` (Link to Location), `is_active` (Check)
  - `custom_service_areas` (Small Text) - Text description

**Naming Convention:**

- Use `field:supplier_name` autoname
- Example: "Acme Contractors" → name = "Acme Contractors"

**Business Rules (Server Script):**

- Validate contractor can only be assigned to Work Order if assigned to that
  site
- Check: `custom_assigned_sites` table contains Work Order's site

---

#### Work Orders/Tasks (Field Service Jobs)

**Business Purpose:** Track work to be performed at sites

**Attributes:**

- Title (brief description)
- Description (detailed instructions)
- Status (new, in progress, completed, cancelled)
- Priority (1-4: urgent, high, normal, low)
- Due date
- Owner (creator)
- Assignee (responsible person)
- Site (where work is performed)
- Contractor (who performs work, optional)
- Parent task (for sub-tasks/hierarchy)

**Business Rules:**

- MVP: CREATE operations only (no UPDATE/DELETE via Telegram)
- Must support task hierarchy (parent-child relationships)
- Synced bidirectionally with backend system

**Current Implementation:** OpenProject work packages via API

**ERPNext Mapping Strategy (Phase 1.1 Informed):**

**✅ DECISION: Use Standard Work Order DocType** (Manufacturing/FSM Module)

- More FSM-specific than generic Task DocType
- Built-in fields: `item_to_manufacture`, `company`, `planned_start_date`,
  `actual_start_date`, `status`
- Standard workflow: Draft → Submitted → In Process → Completed → Cancelled

**Custom Fields to Add:**

- `custom_site` (Link to Location) - Where work is performed
- `custom_contractor` (Link to Supplier) - Who performs work
- `custom_telegram_user_id` (Data) - Creator's Telegram ID
- `custom_flrts_source` (Select: Telegram, Manual, API) - Source of creation
- `custom_assigned_technician` (Link to Employee) - Field technician
- `custom_service_priority` (Select: Urgent, High, Normal, Low)

**Naming Series:**

- `FSM-WO-.YYYY.-.#####`
- Example: `FSM-WO-2024-00001`

**Is Submittable: 1** (Enables Draft → Submitted workflow)

- Draft (docstatus=0): Editable
- Submitted (docstatus=1): Locked, technician assigned
- Cancelled (docstatus=2): Soft delete

**Permissions (Role-Based):**

- Field Technician: Read-only, filtered by
  `custom_assigned_technician = {current_user}`
- Service Manager: Full CRUD + Submit/Cancel
- Viewer: Read-only all

**Alternative Considered: Task DocType**

- Rejected because it's generic project management, not FSM-specific
- Lacks manufacturing/item context needed for equipment repairs

---

#### Lists (Custom FLRTS Feature)

**Business Purpose:** Personal/shared lists for checklists, shopping, inventory

**Types:**

- Checklist
- Shopping
- Inventory
- Custom

**Attributes:**

- Owner (creator)
- Name (unique per owner)
- Type
- Items (JSONB array of list items)
- Tags (for categorization)
- Shared status (personal vs shared)
- Sharing permissions (view, comment, edit, admin)

**Business Rules:**

- List name must be unique per owner
- Support templates for common list patterns
- Sharing requires explicit permission grants

**ERPNext Mapping Strategy (Phase 1.1 Informed):**

**✅ DECISION: Create Custom DocType `FLRTS List`**

- No standard ERPNext equivalent exists
- This is a unique FLRTS feature

**DocType Configuration:**

- **Is Submittable:** 0 (Draft mode only, no workflow)
- **Track Changes:** 1 (Version history for shared lists)
- **Naming Series:** `LIST-.####` (e.g., `LIST-0001`)

**Fields:**

- `owner` (Link to User) - Creator
- `list_name` (Data, Mandatory) - Unique per owner
- `list_type` (Select: Checklist, Shopping, Inventory, Custom)
- `items` (Table → Child DocType: `FLRTS List Item`)
  - `item_text` (Data)
  - `is_completed` (Check)
  - `notes` (Small Text)
  - `idx` (Int) - Sort order
- `tags` (Small Text) - Comma-separated tags
- `is_shared` (Check)

**Permissions (Owner-Based RLS):**

- User Permission: Filter by `owner = {current_user}`
- Shared lists: Separate `FLRTS List Share` DocType
  - Fields: `list_id` (Link), `shared_with` (Link to User), `permission_level`
    (Select: View, Edit, Admin)

**Custom App Location:**

- Create in `flrts_extensions` custom app
- File: `flrts_extensions/flrts_extensions/doctype/flrts_list/flrts_list.json`

---

#### Reminders (Notifications)

**Business Purpose:** Schedule one-time or recurring notifications via Telegram

**Attributes:**

- Owner (creator)
- Assignee (who receives reminder)
- Title
- Description
- Due timestamp
- Reminder timestamp (when to send notification)
- Recurring flag
- Recurrence pattern (JSONB: daily, weekly, monthly rules)
- Status (pending, sent, completed, cancelled)

**Business Rules:**

- Timezone-aware scheduling (use assignee's timezone)
- Support recurring patterns (daily, weekly, monthly)
- Multi-channel delivery (Telegram primary, email/SMS future)

**ERPNext Mapping Strategy (Phase 1.1 Informed):**

**✅ DECISION: Create Custom DocType `FLRTS Reminder`**

- No standard ERPNext equivalent (ERPNext has Email Alerts, but not user-facing
  reminders)

**DocType Configuration:**

- **Is Submittable:** 0 (No workflow)
- **Naming Series:** `REM-.YYYY.-.#####` (e.g., `REM-2024-00001`)

**Fields:**

- `owner` (Link to User) - Creator
- `assignee` (Link to User) - Recipient
- `title` (Data, Mandatory)
- `description` (Text)
- `due_at` (Datetime, Mandatory) - When action is due
- `reminder_at` (Datetime) - When to send notification (default: 1 hour before
  due_at)
- `is_recurring` (Check)
- `recurrence_pattern` (Small Text or JSON) - Example: "daily",
  "weekly:monday,friday", "monthly:1,15"
- `status` (Select: Pending, Sent, Completed, Cancelled)
- `notification_sent` (Check) - Track if notification delivered

**Permissions (Assignee-Based):**

- Owner: Full CRUD
- Assignee: Read-only (can mark completed)

**Background Job (Scheduler):**

- Add to `flrts_extensions/hooks.py`:

  ```python
  scheduler_events = {
      "cron": {
          "*/5 * * * *": ["flrts_extensions.tasks.send_pending_reminders"]
      }
  }
  ```

- Check every 5 minutes for reminders where `reminder_at <= now()` and
  `status = Pending`
- Send via n8n webhook (Telegram, Email, SMS)
- Mark `status = Sent`

**Timezone Handling:**

- Store all times in UTC
- Convert to user's `custom_flrts_timezone` from Employee record when scheduling

---

### 1.2 Supporting Entities

#### Notification Queue

**Business Purpose:** Decouple notification scheduling from delivery

**Attributes:**

- Recipient
- Channel (telegram, email, sms)
- Message content
- Scheduled send time
- Status (pending, sent, failed)
- Retry count

**ERPNext Mapping Candidate:** Custom DocType or n8n workflow management

---

#### Audit Logs

**Business Purpose:** Complete audit trail for compliance

**Attributes:**

- Actor (who performed action)
- Action type (create, update, delete, share, etc.)
- Entity type (task, list, reminder, etc.)
- Entity ID
- Changes (JSONB diff)
- Timestamp
- IP address, user agent

**ERPNext Mapping Candidate:** Custom DocType or ERPNext standard audit features

---

## 2. Workflows

### 2.1 Primary Workflow: Natural Language Task Creation

**User Journey:**

1. User sends message to Telegram bot: "Create task: Fix pump at BigSir, assign
   to Taylor, due Friday"
2. NLP Service (OpenAI GPT-4o) parses message → structured JSON
3. Sync Service validates entities (BigSir exists, Taylor exists, Friday = valid
   date)
4. Backend creates Work Order in ERPNext
5. Telegram bot confirms creation with task ID
6. Optional: Notification sent to assignee

**Critical Features:**

- Natural language parsing (OpenAI GPT-4o)
- Entity resolution (alias matching for sites, fuzzy name matching for
  personnel)
- Timezone handling (user's timezone for "Friday" interpretation)
- Real-time validation (site exists, person exists)
- Immediate confirmation (Telegram response <2 seconds)

**Architecture Pattern:**

- **Reflex** (Edge Function): NLP parsing, validation (<100ms target)
- **Brain** (n8n workflow): Backend API calls, notifications (slower, complex
  logic)

---

### 2.2 Secondary Workflows

#### List Management

1. Create list via Telegram: "/createlist Shopping list"
2. Add items: "Add milk, eggs, bread to Shopping list"
3. Share list: "Share Shopping list with Taylor (edit access)"
4. Check items: "Mark milk as done in Shopping list"
5. View list: "/viewlist Shopping list"

#### Reminder Scheduling

1. Create reminder: "Remind me to check meters every Monday at 8am"
2. Parse recurrence pattern (weekly, Monday, 8am in user's timezone)
3. Store reminder with recurrence rule
4. Notification queue sends Telegram message at scheduled time
5. If recurring, schedule next occurrence

#### Task Viewing/Filtering

1. View my tasks: "/mytasks"
2. View site tasks: "Show all tasks for BigSir"
3. View contractor tasks: "What tasks are assigned to Acme Contractors?"
4. Filter by status: "Show completed tasks from last week"

**Note:** MVP = CREATE only. Read/filter operations deferred to Phase 2.

---

## 3. Required Reports & Analytics

### 3.1 MVP Reports (Required for Launch)

#### Personal Task Dashboard

- My open tasks (assigned to me)
- Tasks I created (owned by me)
- Overdue tasks
- Due this week

#### Site Activity Report

- Tasks by site (last 30 days)
- Contractor activity by site
- Completion rate by site

#### Contractor Performance

- Tasks assigned to contractor
- Average completion time
- On-time vs late completion rate

**Data Source:** ERPNext reporting engine (standard)

---

### 3.2 Future Analytics (Post-MVP)

- Cost tracking per site
- Labor hours by contractor
- Recurring issue detection
- Predictive maintenance alerts

**ERPNext Feature:** Report Builder, Dashboard Designer (standard features)

---

## 4. Critical Integration Points

### 4.1 Telegram Bot (Primary User Interface)

**Purpose:** Natural language interface for field workers

**Integration Type:** Webhook bidirectional

- **Inbound:** User messages → FLRTS
- **Outbound:** FLRTS notifications → Users

**Technical Details:**

- Telegram Bot API (HTTP webhooks)
- User session management (track conversation context)
- Command parsing (/createtask, /mytasks, /createlist, etc.)

**ERPNext Integration:** Custom server scripts or n8n webhooks

---

### 4.2 OpenAI GPT-4o (NLP Parsing Engine)

**Purpose:** Parse natural language → structured data

**Input Example:**

```
"Create task: Fix pump at BigSir, assign to Taylor, due Friday"
```

**Output Example:**

```json
{
  "action": "create_task",
  "title": "Fix pump",
  "site": "BigSir",
  "assignee": "Taylor",
  "due_date": "2025-10-05"
}
```

**Integration Type:** API calls from Edge Function

**ERPNext Integration:** Pre-processing layer before ERPNext API calls

---

### 4.3 n8n Workflows (Orchestration Brain)

**Purpose:** Complex multi-step workflows, external integrations

**Current Architecture:**

- Single-instance mode (10-user scale)
- Remote deployment (not self-hosted)

**Use Cases:**

- Webhook routing (Telegram → FLRTS → ERPNext)
- Notification delivery (ERPNext → Telegram)
- Data transformation (OpenProject → ERPNext migration)
- Error handling and retries

**ERPNext Integration:** Webhook triggers, API calls to ERPNext

---

### 4.4 Supabase PostgreSQL 15.8 (Data Layer)

**Purpose:** Single database for all services

**Current Schema:**

- `public.*` - FLRTS custom tables
- `openproject.*` - OpenProject sync tables (to be replaced)

**Post-Migration:**

- ERPNext becomes source of truth for work orders
- Supabase may cache ERPNext data for analytics
- RLS policies for data isolation

**ERPNext Integration:**

- ERPNext uses internal MariaDB
- Supabase may cache ERPNext data via API sync
- Decision needed: Where to store FLRTS custom entities (Lists, Reminders)?

---

### 4.5 Future Integrations

#### Email/SMS Notifications

- Multi-channel reminder delivery
- Fallback if Telegram unavailable

#### Mobile App

- Native app alternative to Telegram
- Same backend API

#### IoT Sensors

- Automated task creation from sensor alerts
- Predictive maintenance

---

## 5. Data Access Patterns

### 5.1 Read Operations (High Frequency)

#### Task Queries

- Get my tasks (filtered by assignee)
- Get site tasks (filtered by site)
- Get overdue tasks (filtered by due_date < now)
- Search tasks by keyword

**Performance Requirements:**

- Response time: <500ms for filtered queries
- Support pagination for large result sets

**ERPNext Capability:** REST API with filters, pagination (standard)

---

#### List Queries

- Get my lists (filtered by owner)
- Get shared lists (joined via list_shares)
- Search list items (JSONB query)

**Performance Requirements:**

- Response time: <300ms
- JSONB indexing for item search

**ERPNext Capability:** Custom DocType queries (standard)

---

### 5.2 Write Operations (Medium Frequency)

#### Task Creation

- Validate site exists
- Validate assignee exists
- Create work order in ERPNext
- Send confirmation notification

**Transaction Requirements:**

- Atomic operation (rollback if ERPNext API fails)
- Return ERPNext task ID to caller

---

#### List Updates

- Add/remove items (JSONB array modification)
- Update sharing permissions
- Mark items complete

**Concurrency Requirements:**

- Handle concurrent edits (optimistic locking)
- Last-write-wins or conflict resolution

---

### 5.3 Sync Operations (Background)

#### OpenProject → ERPNext Migration

- One-time bulk migration
- Preserve task history
- Map personnel, sites, contractors

**Data Volume:**

- Unknown task count (need to query OpenProject)
- Personnel: ~6 users
- Sites: Unknown count
- Contractors: Unknown count

---

#### Cache Refresh (Post-Migration)

- Periodic sync from ERPNext → Supabase cache
- Delta sync (only changed records)
- Conflict resolution (ERPNext wins)

---

## 6. Security & Permissions

### 6.1 Row-Level Security (RLS)

**Current Implementation (Supabase):**

- `public.lists` - Owner can CRUD, shares grant view/edit
- `public.reminders` - Owner can CRUD, assignee can view
- `public.list_shares` - Explicit sharing model

**ERPNext Equivalent:**

- User Permissions (standard feature)
- Document-level permissions
- Custom permission rules via scripts

---

### 6.2 Role-Based Access Control

**Roles:**

- **Admin:** Full access to all entities
- **Supervisor:** Create/view tasks, manage personnel
- **Worker:** View assigned tasks, update status
- **Viewer:** Read-only access

**ERPNext Capability:** Role-based permissions (standard)

---

## 7. Data Integrity & Business Rules

### 7.1 Validation Rules

#### Task Creation

- Site must exist and be active
- Assignee must exist and be active
- Due date cannot be in past (optional warning)
- Priority must be 1-4

#### List Sharing

- Cannot share with self
- Share recipient must exist
- Share permission must be valid (view/comment/edit/admin)

#### Contractor Assignment

- Contractor must be assigned to site before creating task

**ERPNext Capability:** Validation scripts, Link Field constraints (standard)

---

### 7.2 Cascading Rules

#### Personnel Deletion

- Tasks: Set assignee to NULL (keep task history)
- Lists: DELETE CASCADE (personal data)
- Reminders: DELETE CASCADE (personal data)

#### Site Deletion

- Tasks: Set site to NULL (archive reference)
- Contractors: Remove site from assigned_sites array

**ERPNext Capability:** Custom delete scripts (requires development)

---

## 8. Deployment & Scaling Considerations

### 8.1 Current Scale

**Users:** 6-10 team members **Sites:** Unknown (estimated 5-20) **Tasks:**
Unknown (need OpenProject audit) **Lists:** Personal feature (low volume)
**Reminders:** Personal feature (low volume)

**Growth Projection:** 2x users/year for 3 years (20-30 users by 2028)

---

### 8.2 Performance Requirements

#### Telegram Bot Responsiveness

- Acknowledgment: <2 seconds
- Task creation confirmation: <5 seconds
- Query results: <3 seconds

#### Background Jobs

- Reminder scheduling: Run every minute
- Cache sync: Run every 15 minutes (configurable)

---

## 9. ERPNext Feature Mapping (High-Level)

### 9.1 Standard ERPNext Features We Need

| FLRTS Entity    | ERPNext Module | ERPNext DocType    | Readiness                      |
| --------------- | -------------- | ------------------ | ------------------------------ |
| Sites/Locations | FSM            | Location           | Ready (need custom fields)     |
| Contractors     | Buying         | Supplier           | Ready (need custom fields)     |
| Personnel       | HR             | User + Employee    | Partial (need Telegram fields) |
| Work Orders     | FSM            | Work Order or Task | Ready (need evaluation)        |
| Projects        | Projects       | Project            | Ready (standard)               |

---

### 9.2 Custom ERPNext DocTypes We Need

| FLRTS Entity       | ERPNext DocType       | Rationale                       |
| ------------------ | --------------------- | ------------------------------- |
| Lists              | `FLRTS List`          | No standard equivalent          |
| Reminders          | `FLRTS Reminder`      | No standard equivalent          |
| Notification Queue | `FLRTS Notification`  | Optional (may use n8n)          |
| List Templates     | `FLRTS List Template` | Optional (if templating needed) |

---

### 9.3 ERPNext Features We Can Leverage

#### Field Service Management Module

- Work Order management
- Location/Territory management
- Supplier/Contractor tracking
- Maintenance scheduling

#### Projects Module

- Task hierarchy (parent-child)
- Gantt charts (future)
- Time tracking (future)

#### Workflow Engine

- Status transitions
- Email notifications
- Approval workflows (future)

#### REST API

- Full CRUD operations
- Filtering, pagination
- Webhook support

#### Report Builder

- Custom reports
- Dashboards
- Export to Excel/PDF

---

## 10. Critical Architecture Constraints (Phase 1.1 Findings)

### 10.1 Application-Layer Validation ONLY (No DB Constraints)

**❗ CRITICAL FINDING:** ERPNext does NOT use database-level foreign keys, check
constraints, or triggers.

**Why This Matters for FLRTS:**

ALL data integrity is enforced at the application layer (Python ORM). This
means:

✅ **REQUIRED:**

- All writes MUST go through ERPNext REST API or Frappe ORM
- Sync Service uses ERPNext API (not direct MariaDB access)
- n8n workflows call ERPNext webhooks/API (not DB writes)

❌ **FORBIDDEN:**

- Direct SQL `INSERT`/`UPDATE` to ERPNext database
- Bypassing Frappe ORM = corrupt data + orphaned records

**Example of Correct Integration:**

```python
# ✅ CORRECT: Frappe ORM validates business rules
doc = frappe.get_doc({
    "doctype": "Work Order",
    "item_to_manufacture": "Pump-123",
    "company": "10NetZero",
    "custom_site": "BIGSR-MAIN"
})
doc.insert()  # Validates site exists, checks permissions, etc.

# ❌ WRONG: Bypasses ALL validation
frappe.db.sql("""
    INSERT INTO `tabWork Order` (name, item_to_manufacture)
    VALUES ('WO-001', 'InvalidItem')
""")
```

**Implication for Migration:**

- Cannot bulk-import data via SQL scripts
- Must use ERPNext's Data Import Tool or API for OpenProject → ERPNext migration

### 10.2 Custom Field Namespace Management

**ALL custom fields automatically prefixed with `custom_`**

Examples:

- `telegram_user_id` → Database column: `custom_telegram_user_id`
- `site_code` → Database column: `custom_site_code`
- `flrts_source` → Database column: `custom_flrts_source`

**Why This Matters:**

- Future ERPNext updates won't collide with our fields
- If ERPNext v16 adds a standard `telegram_user_id` field, our
  `custom_telegram_user_id` is safe
- Upgrade safety guaranteed

### 10.3 Custom App Isolation (Never Edit Core)

**The Frappe Way:**

- ✅ Create `flrts_extensions` custom app
- ✅ All customizations in `apps/flrts_extensions/`
- ❌ NEVER edit `apps/erpnext/` or `apps/frappe/`

**Deployment Structure:**

```
frappe-bench/
├── apps/
│   ├── frappe/          # Core framework (DO NOT EDIT)
│   ├── erpnext/         # Standard ERPNext (DO NOT EDIT)
│   └── flrts_extensions/  # ✅ Our custom app (safe to edit)
│       ├── flrts_extensions/
│       │   ├── hooks.py         # Extend standard DocTypes
│       │   ├── doctype/
│       │   │   ├── flrts_list/
│       │   │   ├── flrts_reminder/
│       │   └── tasks.py         # Background jobs
│       └── fixtures/
│           └── custom_field.json  # Version-controlled custom fields
```

**Why This Matters:**

- `bench update` replaces core code
- Custom app survives upgrades
- Git version control for customizations

## 11. Open Questions for User Review

### ✅ ANSWERED by Phase 1.1 Research:

1. **Task vs Work Order:** ✅ **DECISION: Work Order DocType**
   - Rationale: FSM-specific, has item/location/supplier context built-in
   - See Section 1.1 "Work Orders/Tasks" for full mapping

2. **Lists & Reminders Storage:** ✅ **DECISION: ERPNext Custom DocTypes**
   - Rationale: Single source of truth, unified permissions, upgrade-safe via
     custom app
   - Can add caching layer later if performance issues (premature optimization
     avoided)

3. **Notification Delivery:** ✅ **DECISION: Hybrid (ERPNext Webhook → n8n)**
   - ERPNext's built-in Webhook DocType triggers n8n on events (Work Order
     submitted, Reminder due)
   - n8n handles delivery logic (Telegram, Email, SMS, retries)

4. **Personnel Mapping:** ✅ **DECISION: User + Employee + Custom Fields**
   - Use standard User DocType for authentication (OAuth2/OIDC with Supabase)
   - Use standard Employee DocType for HR data
   - Add custom fields: `custom_telegram_user_id`, `custom_flrts_timezone`,
     `custom_flrts_role`
   - Follows "The Frappe Way" (extend, don't rebuild)

### ⏳ STILL OPEN (User Input Required):

1. **Data Migration Scope:**
   - Do we migrate full OpenProject task history (all closed tasks)?
   - Or only active/open tasks?
   - How many tasks total in OpenProject?

2. **Site/Contractor Counts:**
   - How many sites/locations exist in production?
   - How many contractors/vendors?
   - Needed for ERPNext instance sizing

3. **Custom App Name Confirmation:**
   - Proposed: `flrts_extensions`
   - Alternative: `erpnext_flrts`, `flrts_customizations`
   - Should match FLRTS naming standards

4. **Supabase Integration Strategy:**
   - Use ERPNext native OAuth2/OIDC for user authentication? (RECOMMENDED)
   - Or keep Supabase Auth separate + API keys for service accounts?

---

## 11. Next Steps (Phase 1 Deliverables)

- [ ] **User reviews this document and provides corrections**
- [ ] Create `erpnext-feature-mapping.md` with detailed module-by-module mapping
- [ ] Wait for Phase 1.1 deep research results (ERPNext schema philosophy)
- [ ] Wait for Phase 1.3 deep research results (DocType design patterns)
- [ ] Phase 1.4: Codebase audit to identify all OpenProject dependencies
- [ ] Phase 1.5: Deploy ERPNext dev instance for hands-on testing
- [ ] Phase 1.6: Create detailed schema mapping document

---

**Phase 1.2 Completion Checklist:**

- [x] Business entities defined (Personnel, Sites, Contractors, Tasks, Lists,
      Reminders)
- [x] Workflows documented (Natural language task creation, list management,
      reminders)
- [x] Required reports identified (Personal dashboard, site activity, contractor
      performance)
- [x] Critical integrations mapped (Telegram, OpenAI, n8n, Supabase)
- [x] Data access patterns analyzed (Read, write, sync operations)
- [x] Security model documented (RLS, RBAC)
- [x] ERPNext feature mapping completed (informed by Phase 1.1)
- [x] ✅ Phase 1.1 findings integrated
  - [x] DocType vs SQL table distinction understood
  - [x] Application-layer validation constraints documented
  - [x] Custom field namespace strategy defined
  - [x] Custom app architecture planned
  - [x] Naming conventions established
  - [x] Permission framework mapped
- [x] Key architecture decisions made (Work Order, Custom DocTypes for
      Lists/Reminders, Hybrid notifications)
- [ ] ⏳ User review and corrections applied
- [ ] ⏳ Remaining open questions answered (migration scope, production counts,
      auth strategy)
