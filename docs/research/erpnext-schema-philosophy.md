# ERPNext Schema Philosophy Research Summary

**Status:** ✅ Complete (Phase 1.1)
**Phase:** Phase 1.1
**Related Linear:** [10N-227](https://linear.app/10netzero/issue/10N-227)
**Source:** Deep Research Report (ERPNext Schema & DocType Research.rtf)
**Date Created:** 2025-10-01

## Executive Summary

This document synthesizes the Phase 1.1 deep research findings on ERPNext's schema philosophy. The core insight: **ERPNext's DocType is not a database table wrapper—it's a full-stack application component** that encompasses Model, View, and Controller in a unified, metadata-driven construct.

---

## Section 1: The DocType Metamodel

### 1.1 What is a DocType?

A **DocType** is the fundamental building block of Frappe/ERPNext. It is a **JSON metadata object** that defines:

1. **Model**: Database schema (fields, types, constraints)
2. **View**: User interface (forms, lists, reports, calendars)
3. **Controller**: Server-side business logic (validation, workflows)

**Critical Distinction from SQL Table:**

| Frappe Concept | SQL Equivalent | Key Difference |
|----------------|----------------|----------------|
| **DocType** | TABLE + View + Triggers + API | Unified metadata-driven object |
| **Document** | ROW/Record | Single instance of a DocType |
| **Field (fieldname)** | COLUMN | Maps to database column |
| **Link Field** | FOREIGN KEY (logical only) | No DB constraint, app-level validation |
| **Table Field** | One-to-Many Relationship | Child table with parent/parentfield/parenttype |
| **name Field** | PRIMARY KEY (VARCHAR) | User-configurable naming strategy |

### 1.2 Auto-Generated Features

When you create a DocType, Frappe **automatically generates**:

- ✅ Database table (MariaDB/PostgreSQL)
- ✅ Python ORM methods (frappe.get_doc, save, submit, etc.)
- ✅ REST API endpoints (GET, POST, PUT, DELETE)
- ✅ Form View (create/edit UI)
- ✅ List View (paginated, filterable grid)
- ✅ Report Builder integration
- ✅ Calendar/Kanban views (if applicable)
- ✅ Print formats
- ✅ Role-based permissions

**Example: Work Order DocType**
- Creates `tabWorkOrder` database table
- Generates `/api/resource/Work Order` REST endpoints
- Provides Work Order form, list, and report views
- Enforces permissions (who can create, submit, cancel)

### 1.3 Meta-is-Data Philosophy

**Profound Insight:** A DocType is itself a DocType.

The definition of every DocType (including its fields, properties, permissions) is stored as a **document in the "DocType" master DocType**. This self-referential architecture means:

- You can modify DocType definitions using the standard Form view
- The system's own tools evolve the system
- No manual database migration scripts for many customizations
- True low-code platform capability

---

## Section 2: Naming Conventions & Namespace Management

### 2.1 Framework-Enforced Naming Rules

**DocType Naming:**
- **Singular** form (Work Order, not Work Orders)
- **Title Case** (Work Order, not work_order)

**Database Table Naming:**
- Automatic `tab` prefix: `tabWorkOrder`
- Isolates Frappe tables from other DB tables

**Field Naming:**
- `lowercase_snake_case` (planned_start_date, item_to_manufacture)

**Custom Field Naming:**
- Automatic `custom_` prefix for user-added fields
- Example: Adding "Service Priority" → `custom_service_priority`
- **Critical for upgrade safety**: Prevents collision with future standard fields

### 2.2 Reserved Field Names

Every DocType automatically includes these standard fields (NEVER use these names for custom fields):

| Field | Type | Purpose |
|-------|------|---------|
| `name` | VARCHAR (Primary Key) | Unique document identifier |
| `owner` | Link to User | Creator of document |
| `creation` | Timestamp | When document was created |
| `modified` | Timestamp | Last modification time |
| `modified_by` | Link to User | Last modifier |
| `docstatus` | Integer | Workflow state (0=Draft, 1=Submitted, 2=Cancelled) |
| `idx` | Integer | Row number in child tables |
| `parent` | VARCHAR | Parent document name (child tables only) |
| `parentfield` | VARCHAR | Parent table field name (child tables only) |
| `parenttype` | VARCHAR | Parent DocType name (child tables only) |

### 2.3 Document Naming Strategies

The `autoname` property defines how the `name` (primary key) is generated:

**Common Patterns:**

1. **field:[fieldname]** - Use another field's value
   - Example: Customer DocType uses `customer_name` as primary key

2. **naming_series:** - User-defined prefix + auto-increment
   - Example: `FSM-WO-.YYYY.-.#####` → `FSM-WO-2024-00001`
   - Most common for transactional documents

3. **prompt** - User manually enters unique name

4. **format:{...}** - Complex patterns combining:
   - Static text
   - Series numbers (#####)
   - Date components (YYYY, MM, DD)
   - Field values ({fieldname})

**FSM Recommendation:** Use `FSM-WO-.YYYY.-.#####` for Work Orders

---

## Section 3: Field Types & Relational Modeling

### 3.1 Key Field Types for FLRTS

**Data Types:**

| Frappe Type | DB Type | Use Case |
|-------------|---------|----------|
| Data | VARCHAR(140) | Short text (validated by options: Email, Phone, URL) |
| Small Text | TEXT | Medium text (descriptions) |
| Text | TEXT | Long text |
| Long Text | LONGTEXT | Very long content |
| Int | INTEGER | Whole numbers |
| Float | FLOAT | Decimal numbers |
| Currency | DECIMAL | Money (precision from System Settings) |
| Date | DATE | Date only |
| Datetime | DATETIME | Date + Time |
| Check | TINYINT | Boolean (0/1) |
| Select | VARCHAR | Dropdown (options in `options` property) |

**Relational Types:**

| Frappe Type | Purpose | Example |
|-------------|---------|---------|
| **Link** | Reference to another DocType | `item_to_manufacture` → Item DocType |
| **Table** | One-to-many child table | `required_items` → Work Order Item child table |
| **Attach** | File upload (links to File DocType) | Service photos, PDFs |

### 3.2 The Link Field (Logical Foreign Key)

**How Link Fields Work:**

1. **UI Behavior:** Renders as searchable dropdown with AJAX autocomplete
2. **Data Storage:** Stores the `name` (primary key) of the linked document
3. **Validation:** Application-level only (no DB FOREIGN KEY constraint)
4. **Filters:** Can restrict choices using `frm.set_query()` in Client Script

**Why No DB Foreign Keys?**
- **Performance:** Avoids automatic indexing overhead on every linked field
- **Flexibility:** Allows soft deletes and dynamic relationships
- **Trade-off:** Must ALWAYS use Frappe ORM to maintain referential integrity

**Critical Rule:** ANY process that writes directly to the database (bypassing Frappe ORM) is **unsafe** and will corrupt data.

**FSM Example:**
```python
# Work Order DocType definition
{
    "fieldname": "item_to_manufacture",
    "fieldtype": "Link",
    "options": "Item",  # Links to Item DocType
    "label": "Item to Manufacture"
}
```

### 3.3 The Table Field (One-to-Many Relationships)

**Implementation Pattern:**

1. **Create Child DocType** with `Is Child Table: 1`
   - Example: `Work Order Item` child DocType
   - Fields: `item_code`, `required_qty`, `source_warehouse`

2. **Add Table Field to Parent DocType**
   - Field type: `Table`
   - Options: Name of child DocType (`Work Order Item`)

**Database Structure:**

- Child records stored in separate table: `tabWork Order Item`
- Link to parent via three columns:
  - `parent` = Work Order name (e.g., "FSM-WO-2024-00001")
  - `parenttype` = "Work Order"
  - `parentfield` = "required_items"

**FSM Example: Work Order with Required Parts**

```
tabWorkOrder (Parent)
- name = "FSM-WO-2024-00001"
- item_to_manufacture = "Pump Assembly"

tabWork Order Item (Child)
- parent = "FSM-WO-2024-00001"
- parenttype = "Work Order"
- parentfield = "required_items"
- item_code = "Bearing-123"
- required_qty = 2
```

---

## Section 4: Permission Framework (Multi-Layered Security)

### 4.1 Three Pillars of Security

ERPNext uses a **three-layer permission model**:

#### Layer 1: Role Permissions (DocType-Level)
**What it controls:** Which roles can perform actions (Read, Write, Create, Delete, Submit, Cancel) on a DocType

**Configuration:** Role Permissions Manager

**Example:**
- "Field Technician" role: Read-only on Work Order
- "Service Manager" role: Full CRUD on Work Order

#### Layer 2: User Permissions (Row-Level Security)
**What it controls:** Which specific documents (rows) a user can access based on field values

**Analogous to:** PostgreSQL Row-Level Security (RLS)

**Example:**
- User "Taylor" can only see Work Orders where `assigned_technician = Taylor`
- User "Colin" can only see Work Orders where `territory = 'West Region'`

**Implementation:** User Permissions Manager creates filter rules applied to all queries

#### Layer 3: Permission Levels (Field-Level Security)
**What it controls:** Which fields (columns) are visible/editable based on permission level

**How it works:**
- Fields assigned a Permission Level (0-9)
- Default: All fields at Level 0
- Role permissions granted per level

**Example:**
- Field Technician: Permission Level 0 only
  - Sees: Task description, location, assigned tech
  - Hidden: Cost fields, billing info (Level 1)
- Service Manager: Permission Levels 0-9
  - Sees: All fields including cost/billing

### 4.2 FSM Permission Scenarios

**Scenario 1: Field Technician**
```
Role: Field Technician
DocType: Work Order

Role Permissions:
- Read: ✅
- Write: ❌
- Submit: ❌

User Permissions:
- Filter: assigned_technician = {current_user}

Permission Levels:
- Level 0: ✅ (task details, location)
- Level 1: ❌ (cost, billing hidden)
```

**Scenario 2: Service Manager**
```
Role: Service Manager
DocType: Work Order

Role Permissions:
- Read: ✅
- Write: ✅
- Create: ✅
- Submit: ✅
- Cancel: ✅

User Permissions:
- No restrictions (see all Work Orders)

Permission Levels:
- Levels 0-9: ✅ (all fields visible)
```

---

## Section 5: The Frappe Way - Extensibility Philosophy

### 5.1 Core Principle: Never Modify Core Code

**The Frappe Way** = Extend without disrupting core application code

**Key Rule:** NEVER edit files in `apps/frappe/` or `apps/erpnext/`

**Why?**
- `bench update` replaces core code
- Custom changes in core directories = **lost on upgrade**

### 5.2 The Custom App Pattern

**Correct Approach:**

1. **Create Custom App** (isolated from core)
   ```bash
   bench new-app fsm_extensions
   bench --site [site.name] install-app fsm_extensions
   ```

2. **All customizations live in:** `apps/fsm_extensions/`
   - Custom DocTypes
   - Server Scripts
   - Client Scripts
   - Custom Fields (exported as fixtures)
   - Hooks to extend standard DocTypes

3. **Use hooks.py** to inject custom logic into core DocTypes
   ```python
   # apps/fsm_extensions/fsm_extensions/hooks.py
   doc_events = {
       "Work Order": {
           "validate": "fsm_extensions.events.work_order.custom_validation",
           "on_submit": "fsm_extensions.events.work_order.send_notification"
       }
   }
   ```

### 5.3 Custom Field vs. Custom DocType Decision Matrix

**Use Custom Field when:**
- Adding 1-5 simple attributes to existing DocType
- Data has no independent lifecycle
- Example: Add `custom_service_priority` to Work Order

**Use Custom DocType when:**
- Modeling a NEW business entity
- Entity has own fields, permissions, workflow
- Example: Create `FLRTS Service Contract` DocType

### 5.4 Upgrade-Safe Customization Checklist

- ✅ **Always work in custom app** (never edit core)
- ✅ **Use hooks.py** for server-side logic on standard DocTypes
- ✅ **Export custom fields as fixtures** (makes them version-controlled)
  ```python
  # hooks.py
  fixtures = ["Custom Field", "Property Setter"]
  ```
  ```bash
  bench --site [site] export-fixtures
  ```
- ✅ **Use Client/Server Script DocTypes** for low-code extensions
- ✅ **Version control custom app with Git**
- ✅ **Test on staging before production**

---

## Section 6: Critical Insights for FLRTS Migration

### 6.1 Application-Layer Validation (No DB Constraints)

**Key Architectural Decision:**
- Frappe does NOT use database foreign keys, check constraints, or triggers
- ALL validation happens in application layer (Python ORM)

**Implications for FLRTS:**
- ✅ **Must use Frappe APIs** for all writes (never direct SQL)
- ✅ **Sync Service must call ERPNext REST API** (not write to MariaDB directly)
- ✅ **n8n workflows must use ERPNext webhooks/API** (not DB access)
- ❌ **Direct SQL inserts WILL corrupt data** (no integrity enforcement)

**Why This Matters:**
```python
# ✅ CORRECT: Uses Frappe ORM (validates, enforces business rules)
doc = frappe.get_doc({
    "doctype": "Work Order",
    "item_to_manufacture": "Pump-123",
    "company": "10NetZero"
})
doc.insert()

# ❌ WRONG: Bypasses validation (creates orphaned/invalid data)
frappe.db.sql("""
    INSERT INTO `tabWork Order` (name, item_to_manufacture)
    VALUES ('WO-001', 'InvalidItem')
""")
```

### 6.2 Namespace Management for FLRTS

**Custom Field Prefix Strategy:**
- ALL custom fields auto-prefixed with `custom_`
- Example: `custom_telegram_user_id`, `custom_flrts_site_code`

**Custom DocType Naming Convention:**
- Use `FLRTS {Entity}` pattern (Title Case, Singular)
- Examples:
  - `FLRTS List` (not "List" - too generic)
  - `FLRTS Reminder` (not "Reminder")
  - `FLRTS Personnel` (if using custom DocType vs User)

**Why This Matters:**
- Future ERPNext updates won't collide with our custom fields
- Clear namespace separation between standard and FLRTS-specific entities

### 6.3 Document Naming for FLRTS Entities

**Recommended Naming Series:**

| Entity | Pattern | Example |
|--------|---------|---------|
| Work Order | `FSM-WO-.YYYY.-.#####` | `FSM-WO-2024-00001` |
| FLRTS List | `LIST-.####` | `LIST-0001` |
| FLRTS Reminder | `REM-.YYYY.-.#####` | `REM-2024-00001` |
| Location (Site) | `prompt` or `field:location_code` | `BIGsir-MAIN` (user enters) |
| Supplier (Contractor) | `field:supplier_name` | `Acme Contractors` |

### 6.4 Child Table Pattern for FLRTS

**Use Cases:**

1. **Work Order Required Items** (spare parts for repair)
   - Parent: Work Order
   - Child: `FLRTS Work Order Item` (custom child DocType)
   - Fields: item_code (Link to Item), required_qty, notes

2. **List Items** (items in a checklist/shopping list)
   - Parent: `FLRTS List`
   - Child: `FLRTS List Item` (custom child DocType)
   - Fields: item_text, is_completed (Check), sequence

3. **Reminder Recurrence Rules** (if complex recurrence needed)
   - Parent: `FLRTS Reminder`
   - Child: `FLRTS Recurrence Rule`
   - Fields: frequency, day_of_week, time_of_day

---

## Section 7: Integration Architecture Implications

### 7.1 ERPNext REST API (Primary Integration Point)

**All external systems MUST use REST API:**

- Telegram Bot → n8n → **ERPNext REST API**
- Sync Service → **ERPNext REST API**
- Custom Edge Functions → **ERPNext REST API**

**API Capabilities:**
- Full CRUD on all DocTypes
- Filtering, pagination, sorting
- Field selection (reduce payload)
- Bulk operations
- Webhook triggers

**Example API Calls:**

```bash
# Create Work Order
POST https://erp.10nz.tools/api/resource/Work Order
{
  "item_to_manufacture": "Pump-Assembly",
  "company": "10NetZero",
  "custom_site": "BIGSR-MAIN",
  "custom_telegram_user_id": 123456789
}

# Get all open Work Orders for a site
GET https://erp.10nz.tools/api/resource/Work Order?filters=[["custom_site","=","BIGSR-MAIN"],["status","=","Not Started"]]

# Update Work Order status
PUT https://erp.10nz.tools/api/resource/Work Order/FSM-WO-2024-00001
{
  "status": "In Progress"
}
```

### 7.2 Authentication via OAuth2/OIDC (Supabase Integration)

**ERPNext Native Support:**
- OAuth 2.0 and OpenID Connect (OIDC) via "Social Login Key"
- Standards-compliant (works with Supabase Auth, Auth0, Keycloak, etc.)

**Integration Pattern:**
1. Create OAuth App in Supabase → get Client ID/Secret
2. In ERPNext: Setup > Integrations > Social Login Key
3. Select Provider: "Custom"
4. Configure endpoints:
   - Base URL: `https://[project].supabase.co`
   - Authorize URL: `/auth/v1/authorize`
   - Token URL: `/auth/v1/token`
   - API Endpoint: `/auth/v1/user`

**Result:** Users can log into ERPNext using Supabase credentials

**Alternative (API Key for Service Accounts):**
- Generate ERPNext API Key for service accounts (sync-service, n8n)
- Use API Key + Secret for machine-to-machine auth

---

## Section 8: Recommended ERPNext Modules for FLRTS

### 8.1 Field Service Management (FSM) Module

**Core DocTypes:**

1. **Work Order** (or Task)
   - Maps to: FLRTS Work Orders
   - Fields: item, company, planned_start_date, status, assigned technician
   - Custom Fields needed:
     - `custom_site` (Link to Location)
     - `custom_telegram_user_id` (Data)
     - `custom_flrts_source` (Select: "Telegram", "Manual", "API")

2. **Location** (Territory/Site)
   - Maps to: FLRTS Sites
   - Standard fields: location_name, parent_location (tree structure)
   - Custom Fields needed:
     - `custom_site_code` (Data - e.g., "BIGSR-MAIN")
     - `custom_aliases` (Small Text - comma-separated aliases)

3. **Supplier**
   - Maps to: FLRTS Contractors
   - Standard fields: supplier_name, supplier_group, contact
   - Custom Fields needed:
     - `custom_contractor_code` (Data)
     - `custom_assigned_sites` (Table - link to Locations)

### 8.2 Custom DocTypes Required

These have NO standard ERPNext equivalent:

1. **FLRTS List**
   - Fields:
     - owner (Link to User)
     - name (naming_series: "LIST-.####")
     - list_type (Select: Checklist, Shopping, Inventory, Custom)
     - items (Table → FLRTS List Item child DocType)
     - is_shared (Check)
   - Permissions: Owner-based RLS

2. **FLRTS Reminder**
   - Fields:
     - owner (Link to User)
     - assignee (Link to User)
     - title (Data)
     - due_at (Datetime)
     - is_recurring (Check)
     - recurrence_pattern (JSON or Small Text)
     - status (Select: Pending, Sent, Completed)
   - Permissions: Owner can CRUD, Assignee can Read

3. **FLRTS Personnel** (Optional - if not using User/Employee)
   - Fields:
     - telegram_user_id (Data, Unique)
     - full_name (Data)
     - timezone (Select)
     - role (Select: Admin, Supervisor, Worker, Viewer)
   - Consideration: Use standard User + Employee instead?

---

## Section 9: Decision Framework for Open Questions

### 9.1 Question 1: Work Order vs Task DocType?

**Option A: Use standard Task DocType**
- ✅ Simpler, part of Projects module
- ✅ Lighter weight
- ❌ Less FSM-specific features

**Option B: Use standard Work Order DocType**
- ✅ FSM-native (built for field service)
- ✅ Has manufacturing/item context built-in
- ✅ More extensible for future FSM features
- ❌ Heavier weight (more fields)

**Recommendation:** **Use Work Order DocType**
- FLRTS is field service (not generic project management)
- Work Order has location, supplier, item concepts built-in
- Aligns with "ERPNext way" for FSM

### 9.2 Question 2: Lists/Reminders Storage Location?

**Option A: Store in ERPNext (Custom DocTypes)**
- ✅ Single source of truth
- ✅ Unified permissions model
- ✅ Searchable via ERPNext UI/API
- ❌ Adds load to ERPNext instance

**Option B: Store in Supabase (FLRTS tables)**
- ✅ Keeps ERPNext lean (focused on work orders)
- ✅ Faster queries for high-frequency Telegram operations
- ❌ Split data model (complexity)
- ❌ Dual permission systems

**Recommendation:** **Start with Option A (ERPNext), migrate to B if performance issues**
- Principle: Single source of truth > premature optimization
- ERPNext can handle 10-user scale easily
- Can add Redis cache layer if needed

### 9.3 Question 3: Notification Delivery?

**Option A: n8n Workflows (Current Pattern)**
- ✅ Already working
- ✅ Flexible for multi-channel (Telegram, Email, SMS)
- ✅ Easy to debug/modify

**Option B: ERPNext Custom Server Scripts**
- ✅ Tighter coupling with ERPNext events
- ❌ Less flexible for complex workflows

**Option C: Hybrid (ERPNext triggers n8n)**
- ✅ Best of both worlds
- ERPNext Webhook DocType → n8n webhook → Telegram/Email

**Recommendation:** **Option C (Hybrid)**
- ERPNext's built-in Webhook DocType triggers n8n on events
- n8n handles delivery logic (retries, multi-channel)

---

## Section 10: Next Steps (Post Phase 1.1)

### 10.1 Immediate Actions

- [ ] **User reviews Phase 1.2 Functional Requirements** doc
- [ ] **Answers 10 open questions** in Phase 1.2 doc
- [ ] **Wait for Phase 1.3 deep research** (DocType Design Patterns)

### 10.2 Phase 1.4: Codebase Audit
- Identify all OpenProject API calls in current codebase
- Map to ERPNext equivalents
- Document breaking changes

### 10.3 Phase 1.5: Deploy ERPNext Dev Instance
- Deploy ERPNext v15+ on separate server/container
- Install FSM module
- Create `flrts_extensions` custom app
- Test Work Order, Location, Supplier DocTypes

### 10.4 Phase 1.6: Create Detailed Schema Mapping
- Document: `docs/erpnext/research/erpnext-schema-mapping.md`
- Map every Supabase table → ERPNext DocType
- Define all custom fields needed
- Plan migration scripts

---

## Appendix: Key Resources

**Official Documentation:**
- Frappe Framework: https://docs.frappe.io/framework
- ERPNext User Manual: https://docs.frappe.io/erpnext
- Frappe Forum: https://discuss.frappe.io

**GitHub:**
- Frappe Framework: https://github.com/frappe/frappe
- ERPNext: https://github.com/frappe/erpnext

**Community:**
- Frappe/ERPNext Discuss Forum (active Q&A)
- Awesome Frappe List (curated resources)

---

**Phase 1.1 Completion Checklist:**

- [x] DocType metamodel understood
- [x] Naming conventions documented
- [x] Field types and relational modeling analyzed
- [x] Permission framework mapped to FLRTS requirements
- [x] "The Frappe Way" extensibility philosophy internalized
- [x] Application-layer validation implications understood
- [x] Integration architecture patterns identified
- [x] Decision framework created for open questions
- [ ] User review and approval
