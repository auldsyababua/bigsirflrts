# ERPNext Migration Workflow

**Status:** Planning **Date:** 2025-09-30

**📌 Source of Truth:**
[Linear Epic 10N-227](https://linear.app/10netzero/issue/10N-227/erpnext-backend-adoption)

**Related ADR:**
[ADR-006: ERPNext Backend Adoption](adr/ADR-006-erpnext-backend-adoption.md)

> **Note:** This document provides detailed implementation guidance for the
> ERPNext migration. For current status, phase tracking, and overall progress,
> see **Linear Epic 10N-227** which is the master source of truth. This document
> is referenced by Linear for technical details and step-by-step procedures.

## Purpose

Systematic workflow to migrate from OpenProject to ERPNext backend while
maintaining system stability and minimizing risk.

## Critical Success Factors

1. **No Data Loss:** All existing data preserved or migrated
2. **Minimal Downtime:** Phased approach allows parallel systems
3. **Reversible:** Can rollback at each phase
4. **Validated:** Each phase has clear success criteria
5. **Documented:** All changes tracked in Linear and Git

## Pre-Migration Checklist

Before starting any migration work:

- [ ] ADR-006 approved by Product Owner and Technical Lead
- [ ] Current branch (`10N-159/openproject-schema-migration`) committed
- [ ] Main branch synced with remote
- [ ] All untracked files committed or added to `.gitignore`
- [ ] Team notified of architecture change
- [ ] Backup of current Supabase database created

## Workflow Phases

### Phase 0: Preparation & Baseline (Current - Week 0)

**Goal:** Document decision, establish baseline, and create comprehensive
planning foundation

**Tasks:**

1. ✅ Create ADR-006 documenting ERPNext decision
2. ✅ Create this migration workflow document
3. ✅ Audit all Linear issues for impact
4. ✅ Create new Linear epic for ERPNext adoption (10N-227)
5. ✅ Update affected Linear stories
6. ✅ Create new branch `feature/erpnext-adoption`
7. ✅ Commit ADR and workflow docs to Git
8. ✅ Create Git tag `v0.1.0-pre-erpnext` for rollback point

**Success Criteria:**

- ✅ ADR-006 exists and is complete
- ✅ Migration workflow documented
- ✅ All Linear issues updated (10N-227 epic + Phase 1 stories)
- ✅ Clean Git branch created
- ✅ Baseline tag created for easy rollback

**Rollback:** N/A (just planning)

---

### Phase 1: Deep Research & Schema Philosophy (Week 1-2)

**Goal:** Understand ERPNext schema philosophy and design patterns BEFORE
touching code

**Branch:** `feature/erpnext-adoption`

**Philosophy:** Research-heavy, low-code phase. Understand the "ERPNext way"
before mapping our needs to it.

**Linear Stories:**

- ✅ 10N-228: Deploy ERPNext dev instance
- ✅ 10N-229: Connect ERPNext to Supabase PostgreSQL
- ✅ 10N-230: Test ERPNext FSM module features
- ✅ 10N-231: Validate ERPNext API integration
- ✅ 10N-232: Create schema mapping document
- [ ] **NEW:** Deep dive ERPNext schema philosophy research
- [ ] **NEW:** Functional requirements mapping (business logic, not engineering)
- [ ] **NEW:** DocType design patterns study

#### 1.1: ERPNext Schema Philosophy Research

**Goal:** Understand how ERPNext organizes data and why

**Research Questions:**

1. **What is a DocType?**
   - How does it differ from a traditional database table?
   - What are the advantages of ERPNext's DocType system?
   - How do DocTypes relate to each other?

2. **ERPNext Naming Conventions:**
   - Why `tabWorkOrder` instead of `work_orders`?
   - How does ERPNext handle naming conflicts?
   - What are the reserved field names?

3. **Field Types and Validation:**
   - What field types does ERPNext support?
   - How does ERPNext handle validation vs PostgreSQL constraints?
   - How are relationships (FK equivalents) defined?

4. **Permission and Role Model:**
   - How does ERPNext RLS (Row Level Security) work?
   - How do roles map to DocType permissions?
   - Can we integrate with Supabase Auth?

5. **Customization Philosophy:**
   - When to use Custom Fields vs Custom DocTypes?
   - How to extend ERPNext without breaking upgrades?
   - What's the "Frappe way" of doing things?

**Deliverables:**

- **Document:** `docs/research/erpnext-schema-philosophy.md`
  - ERPNext data model explained
  - DocType lifecycle and patterns
  - Naming conventions guide
  - Customization best practices
- **Document:** `docs/research/erpnext-vs-traditional-sql.md`
  - Comparison table: PostgreSQL concepts → ERPNext equivalents
  - Migration mental model guide

#### 1.2: Functional Requirements Mapping (Business-First)

**Goal:** Define what we NEED functionally, separate from how OpenProject did it

**Approach:** Forget OpenProject. Start from business requirements.

**Questions to Answer:**

1. **What are our actual business entities?**
   - Sites/Locations (what attributes do they NEED?)
   - Contractors (what do we track about them?)
   - Personnel (roles, contact info, what else?)
   - Work (tasks vs projects vs work orders - what's the difference for us?)

2. **What workflows do we need?**
   - How does work get created?
   - How does work get assigned?
   - What are the status transitions?
   - What triggers notifications?

3. **What reports do we need?**
   - Site activity summaries?
   - Contractor performance?
   - Work completion rates?
   - Time tracking?

4. **What integrations are critical?**
   - Telegram (input: create work)
   - n8n (automation: workflows)
   - Supabase (data: analytics/dashboards)
   - OpenAI (intelligence: parsing)

**Deliverables:**

- **Document:** `docs/research/flrts-functional-requirements.md`
  - Business entity definitions (not technical tables)
  - Workflow diagrams (how work flows through system)
  - Required reports and analytics
  - Critical integration points
- **Document:** `docs/research/erpnext-feature-mapping.md`
  - Which ERPNext modules map to our needs
  - Which features we'll use immediately
  - Which features we'll grow into later

#### 1.3: DocType Design Patterns Study

**Goal:** Understand how to design DocTypes the "ERPNext way"

**Research Questions:**

1. **Standard DocType Patterns:**
   - What are common ERPNext DocType design patterns?
   - How do master DocTypes differ from transactional DocTypes?
   - How are child tables (line items) designed?

2. **ERPNext FSM Module Deep Dive:**
   - Study existing FSM DocTypes: Work Order, Location, Supplier
   - What fields are standard vs customizable?
   - How does ERPNext handle FSM-specific workflows?

3. **Customization Best Practices:**
   - When to extend existing DocTypes vs create new ones?
   - How to add custom fields without breaking upgrades?
   - What are the limits of customization?

4. **Real-World Examples:**
   - Find GitHub repos of ERPNext customizations
   - Study community apps extending ERPNext FSM
   - Learn from others' mistakes and successes

**Deliverables:**

- **Document:** `docs/research/erpnext-doctype-patterns.md`
  - Master vs transactional DocType patterns
  - Child table design patterns
  - Customization strategies
  - Real-world examples and case studies
- **Document:** `docs/research/erpnext-fsm-module-analysis.md`
  - Deep dive into ERPNext FSM module
  - Field-by-field analysis of relevant DocTypes
  - Workflow analysis (how FSM works out of the box)

#### 1.4: Comprehensive Codebase Audit

**Goal:** Identify EVERY code change needed across all modules

**Approach:** Systematic audit using architecture docs and existing code

**Audit Methodology:**

1. **Review Architecture Documents:**
   - Read all docs in `docs/architecture/`
   - Identify every component that touches OpenProject
   - Map component → files → functions

2. **Code Search for OpenProject References:**

   ```bash
   # Find all OpenProject API calls
   rg "openproject" --type ts --type js -g '!node_modules'

   # Find all references to OpenProject tables
   rg "work_packages|projects|users" --type ts --type sql -g '!node_modules'

   # Find all OpenProject config variables
   rg "OPENPROJECT" --type env --type yaml
   ```

3. **Module-by-Module Audit:**
   - For each module in architecture docs:
     - List all files in module
     - Identify OpenProject dependencies
     - Document required changes (paths, imports, APIs, schemas)

4. **Create Change Inventory:**
   - Every file that needs modification
   - Every import/path that needs updating
   - Every API endpoint that needs changing
   - Every database query that needs rewriting

**Deliverables:**

- **Document:** `docs/migration/codebase-audit-report.md`
  - Complete inventory of code changes needed
  - Organized by module and priority
  - Estimated effort for each change
- **Prompt Template:** `docs/prompts/module-migration-prompt.md`
  - Reusable prompt for migrating each module
  - Leverages audit report for context
  - Includes validation checklist

**Example Audit Output:**

```markdown
### Module: sync-service

**Files to Modify:**

1. `packages/sync-service/src/index.ts`
   - Change: Replace OpenProject API client with ERPNext client
   - Lines: 45-67, 89-102
   - Effort: 2 hours

2. `packages/sync-service/src/config.ts`
   - Change: Replace OPENPROJECT_URL with ERPNEXT_URL
   - Lines: 12-15
   - Effort: 15 minutes

**New Files to Create:**

1. `packages/sync-service/src/erpnext-client.ts`
   - Purpose: ERPNext API wrapper
   - Effort: 4 hours

**Dependencies to Update:**

- Remove: `@openproject/api-client`
- Add: `@frappe/client` or custom ERPNext client
```

#### 1.5: ERPNext Deployment & Validation (Technical POCs)

**Goal:** Get hands-on with ERPNext to validate research

**Prerequisites:** Phases 1.1-1.4 complete (research done first!)

**Technical Tasks:**

**Deploy ERPNext Dev Instance:**

```bash
# Using Frappe Docker with PostgreSQL
git clone https://github.com/frappe/frappe_docker
cd frappe_docker
# Configure for PostgreSQL (not MariaDB)
# Point to Supabase test database
```

**ERPNext FSM Module Setup:**

- Configure FSM module
- Create test data representing FLRTS domain
- Test actual DocTypes we identified in research
- User roles configured (admin, supervisor, worker)

**API Testing:**

```bash
# Test ERPNext REST API
# Endpoints to validate:
#   - GET /api/resource/Location
#   - POST /api/resource/Work Order
#   - GET /api/resource/Supplier
#   - Webhooks configuration
```

**Integration POCs:**

```python
# Telegram Bot → ERPNext POC
# Simple bot that creates work order via API

# n8n Workflow → ERPNext POC
# Workflow triggered by ERPNext webhook
```

**Deliverables:**

- ERPNext dev instance running on PostgreSQL
- Test data in ERPNext FSM module
- Postman collection with API calls tested
- API performance benchmarks (< 200ms target)
- Telegram bot POC creating ERPNext work orders
- n8n workflow POC triggered by ERPNext webhooks

#### 1.6: Schema Mapping Document (Based on Research)

**Goal:** Map FLRTS requirements → ERPNext DocTypes

**Prerequisites:** All research complete (1.1-1.4)

**Approach:** Use functional requirements (not current schema!) to map to
ERPNext

```markdown
# FLRTS → ERPNext Schema Mapping

## Based on Functional Requirements (Not Current Schema)

| Business Entity | Functional Needs              | ERPNext DocType    | Customization Needed |
| --------------- | ----------------------------- | ------------------ | -------------------- |
| Sites/Locations | Name, code, aliases, location | tabLocation        | Add custom fields    |
| Contractors     | Name, contact, sites assigned | tabSupplier        | Add custom fields    |
| Personnel       | Telegram ID, roles, timezone  | tabUser + custom   | Custom DocType?      |
| Work            | Tasks, subtasks, checklists   | tabWork Order      | Child tables         |
| Lists           | Shopping, checklists, etc     | tabToDo OR custom  | TBD based on needs   |
| Reminders       | Due dates, recurring          | tabEvent OR custom | TBD based on needs   |

## Migration Strategy per Entity

**Sites:** Direct mapping to tabLocation + custom fields **Contractors:** Direct
mapping to tabSupplier + custom fields **Personnel:** Custom DocType extending
tabUser (Telegram integration) **Work:** Use tabWork Order + child tables for
subtasks/checklists **Lists/Reminders:** Evaluate if ERPNext modules sufficient
OR keep custom tables in public schema
```

**Deliverables:**

- **Document:** `docs/migration/schema-mapping.md`
  - Complete mapping based on functional requirements
  - Justification for each mapping decision
  - Identified gaps requiring custom DocTypes
- **Document:** `docs/migration/data-migration-strategy.md`
  - Strategy for migrating each entity
  - Whether to use ERPNext import OR direct SQL
  - Estimated migration time and complexity

**Phase 1 Success Criteria:**

- [ ] **Research Complete:**
  - [ ] ERPNext schema philosophy documented
  - [ ] FLRTS functional requirements defined (business-first)
  - [ ] DocType design patterns studied
  - [ ] Codebase audit completed (every change identified)
  - [ ] Module migration prompt template created
- [ ] **Technical Validation:**
  - [ ] ERPNext deployed and accessible
  - [ ] FSM module working with test data
  - [ ] API tested and documented (Postman collection)
  - [ ] Telegram bot POC creates ERPNext work order
  - [ ] n8n workflow triggered by ERPNext webhook
  - [ ] Performance acceptable (API < 200ms)
- [ ] **Planning Artifacts:**
  - [ ] Schema mapping complete (functional → ERPNext)
  - [ ] Data migration strategy documented
  - [ ] All deliverable documents created and reviewed

**Rollback:** Delete test instance, continue with OpenProject (low cost)

**Go/No-Go Decision Point:**

- **Question:** Does ERPNext meet our needs AND do we understand it well enough
  to migrate?
- **Go Criteria:**
  - ✅ ERPNext FSM features map to our functional requirements
  - ✅ We understand ERPNext schema philosophy and design patterns
  - ✅ Codebase audit complete - we know every change needed
  - ✅ POCs successful - integrations work
  - ✅ Performance acceptable
- **No-Go Actions:**
  - Document why ERPNext doesn't fit
  - Evaluate alternatives (Odoo, custom schema, stay with OpenProject)
  - Present options to stakeholders

---

### Phase 2: Data Migration Planning & Custom DocType Design (Week 3-4)

**Goal:** Design custom DocTypes and plan data transformation WITHOUT touching
production

**Prerequisites:**

- Phase 1 complete and approved
- Go decision made
- Functional requirements and schema mapping finalized

**Philosophy:** Design ERPNext schema extensions thoughtfully. Understand what
data transforms are needed.

**Linear Stories to Create:**

- [ ] `10N-XXX`: Design custom DocTypes for FLRTS-specific entities
- [ ] `10N-XXX`: Create DocType JSON definitions
- [ ] `10N-XXX`: Audit production data quality and transformation needs
- [ ] `10N-XXX`: Design data transformation logic (not just copying data)
- [ ] `10N-XXX`: Write and test data migration scripts
- [ ] `10N-XXX`: Create data validation and rollback procedures

#### 2.1: Custom DocType Design

**Goal:** Design DocTypes for entities not covered by standard ERPNext

**Based on Phase 1 Schema Mapping:**

1. **Review Gaps from Schema Mapping:**
   - Which FLRTS entities need custom DocTypes?
   - Which can use standard ERPNext DocTypes + custom fields?
   - Which might stay as custom tables in `public` schema?

2. **Design Custom DocTypes:**
   - **Example: FLRTS Personnel DocType**
     - Extends standard User with:
     - Telegram user ID (Link field)
     - Telegram username
     - Phone with country code
     - Timezone (for scheduling)
     - FLRTS role (different from ERPNext roles)
     - Metadata (JSONB for extensibility)

3. **Create DocType JSON Definitions:**

   ```json
   // Example: FLRTS Personnel.json
   {
     "name": "FLRTS Personnel",
     "module": "FLRTS",
     "istable": 0,
     "fields": [
       {
         "fieldname": "telegram_user_id",
         "fieldtype": "Data",
         "label": "Telegram User ID",
         "unique": 1,
         "reqd": 1
       }
       // ... more fields
     ]
   }
   ```

**Deliverables:**

- **Document:** `docs/migration/custom-doctypes-design.md`
  - Rationale for each custom DocType
  - Field-by-field definitions
  - Relationships and links to standard DocTypes
- **Files:** `erpnext-customizations/doctypes/*.json`
  - JSON definitions for each custom DocType
  - Ready to import into ERPNext
- **Document:** `docs/migration/custom-fields-standard-doctypes.md`
  - Custom fields to add to standard DocTypes (Location, Supplier, Work Order)

#### 2.2: Production Data Audit & Transformation Design

**Goal:** Understand data quality and transformation needs

**Data Audit:**

```sql
-- Count records and identify data quality issues
SELECT 'sites' AS table_name, COUNT(*) as total,
       COUNT(*) FILTER (WHERE name IS NULL) as null_names,
       COUNT(*) FILTER (WHERE code IS NULL) as null_codes
FROM public.sites;

-- Check for data that doesn't fit ERPNext constraints
-- e.g., duplicate codes, invalid references, etc.
```

**Transformation Analysis:**

1. **Not Just Copying Data:**
   - What data needs cleaning before migration?
   - What data needs transformation (format changes)?
   - What data needs enrichment (adding required ERPNext fields)?

2. **Examples of Transformations:**
   - **Sites → Location:**
     - Transform `aliases` array to ERPNext format
     - Map FLRTS location JSONB to ERPNext address fields
     - Generate ERPNext naming series
   - **Tasks → Work Order:**
     - Map FLRTS status strings to ERPNext workflow states
     - Transform metadata JSONB to ERPNext custom fields
     - Create child table records for subtasks

**Deliverables:**

- **Document:** `docs/migration/data-audit-report.md`
  - Record counts per table
  - Data quality issues identified
  - Missing/invalid data flagged for cleanup
- **Document:** `docs/migration/data-transformation-logic.md`
  - Detailed transformation rules for each entity type
  - Mapping of FLRTS fields → ERPNext fields
  - Data enrichment requirements
  - Edge cases and how to handle them

#### 2.3: Migration Scripts Development

**Goal:** Write scripts that TRANSFORM data, not just copy it

**Approach:** Use ERPNext Data Import API + custom transformation logic

```python
# Example: migrate_sites_to_locations.py

from frappe.client import FrappeClient
import json

def transform_flrts_site_to_location(site_data):
    """
    Transform FLRTS site data to ERPNext Location format.

    Handles:
    - Aliases array → ERPNext custom field
    - JSONB location → Address fields
    - Code generation for ERPNext naming series
    """
    location = {
        "doctype": "Location",
        "location_name": site_data["name"],
        "custom_flrts_code": site_data["code"],
        "custom_aliases": json.dumps(site_data["aliases"]),
        # ... transformation logic
    }

    # Validate before returning
    validate_location_data(location)
    return location

def migrate_sites_batch(sites, erpnext_client):
    """Migrate sites in batches with error handling."""
    for site in sites:
        try:
            location = transform_flrts_site_to_location(site)
            erpnext_client.insert("Location", location)
        except Exception as e:
            log_migration_error(site, e)
            # Continue or abort based on error severity
```

**Deliverables:**

- **Scripts:** `migration-scripts/migrate_*.py` for each entity type
  - Sites → Locations
  - Contractors → Suppliers
  - Personnel → Users + custom DocType
  - Tasks → Work Orders
- **Scripts:** `migration-scripts/rollback_*.py` for rollback
- **Scripts:** `migration-scripts/validate_*.py` for data validation
- **Document:** `docs/migration/migration-scripts-guide.md`
  - How to run scripts
  - Order of execution
  - Error handling procedures

#### 2.4: Test Migration on Copy of Production

**Goal:** Validate migration process without risk

**Test Environment Setup:**

```bash
# 1. Create Supabase branch or test database
# 2. Copy production data to test database
# 3. Point ERPNext dev instance to test database
# 4. Run migration scripts
# 5. Validate results
# 6. Test API access and integrations
# 7. Measure performance
```

**Validation Procedures:**

```sql
-- Compare record counts before/after
SELECT
  'sites' as entity,
  (SELECT COUNT(*) FROM public.sites) as source_count,
  (SELECT COUNT(*) FROM tabLocation WHERE custom_flrts_code IS NOT NULL) as target_count;

-- Validate data integrity (spot checks)
-- Validate relationships (FKs equivalent)
-- Validate custom field data
```

**Deliverables:**

- Test migration executed successfully
- **Document:** `docs/migration/test-migration-report.md`
  - Results of test migration
  - Record counts comparison (source vs target)
  - Data integrity validation results
  - Issues found and resolution plan
  - Performance metrics (migration time, data volume)
- **Document:** `docs/migration/rollback-procedure.md`
  - Step-by-step rollback instructions
  - Tested and validated rollback process

**Phase 2 Success Criteria:**

- [ ] **Custom DocTypes Designed:**
  - [ ] All custom DocTypes designed with field-level detail
  - [ ] DocType JSON definitions created
  - [ ] Custom fields for standard DocTypes documented
- [ ] **Data Understanding:**
  - [ ] Production data audited (counts, quality issues identified)
  - [ ] Transformation logic documented for each entity type
  - [ ] Edge cases and data enrichment requirements defined
- [ ] **Migration Ready:**
  - [ ] Migration scripts written and tested
  - [ ] Rollback scripts created and tested
  - [ ] Validation scripts created
  - [ ] Test migration successful (0 data loss)
  - [ ] All deliverable documents created and reviewed
  - [ ] Migration time acceptable (< 1 hour estimate)

**Rollback:** Keep current schema, abort migration (medium cost - significant
planning investment)

---

### Phase 3: Code Migration Planning & API Client Development (Week 5-6)

**Goal:** Plan ALL code changes systematically and build foundation (API client)
BEFORE touching integration code

**Prerequisites:**

- Phase 2 complete
- Custom DocTypes deployed to dev ERPNext
- Migration scripts validated

**Philosophy:** Use the codebase audit from Phase 1.4. Don't start changing
integration code until API client is solid.

**Linear Stories to Create:**

- [ ] `10N-XXX`: Create ERPNext API client library (foundation first!)
- [ ] `10N-XXX`: Plan sync-service code changes (based on audit)
- [ ] `10N-XXX`: Plan Telegram bot code changes (based on audit)
- [ ] `10N-XXX`: Plan n8n workflow changes (based on audit)
- [ ] `10N-XXX`: Create integration testing suite for ERPNext

#### 3.1: ERPNext API Client Library Development

**Goal:** Build robust, well-tested API client BEFORE using it anywhere

**Why First:** Foundation for all other integrations. Get this right, everything
else is easier.

**Design Considerations:**

1. **Type Safety:**
   - TypeScript types for all ERPNext DocTypes
   - Leverage Phase 2 custom DocType definitions
   - Generate types from DocType JSON if possible

2. **Error Handling:**
   - ERPNext-specific error codes
   - Retry logic for transient failures
   - Circuit breaker for API health

3. **Developer Experience:**
   - Intuitive API methods
   - Good documentation
   - Comprehensive test coverage

**Implementation:**

```typescript
// packages/erpnext-client/src/index.ts

export class ERPNextClient {
  private baseURL: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(config: ERPNextConfig) {
    this.baseURL = config.url;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  // Work Order operations
  async createWorkOrder(data: WorkOrderInput): Promise<WorkOrder> {
    return this.post(
      '/api/resource/Work Order',
      this.transformWorkOrderInput(data)
    );
  }

  async getWorkOrder(id: string): Promise<WorkOrder> {
    return this.get(`/api/resource/Work Order/${id}`);
  }

  async updateWorkOrder(
    id: string,
    data: Partial<WorkOrderInput>
  ): Promise<WorkOrder> {
    return this.put(`/api/resource/Work Order/${id}`, data);
  }

  // Location operations
  async createLocation(data: LocationInput): Promise<Location> {
    return this.post('/api/resource/Location', data);
  }

  async getLocations(filters?: LocationFilters): Promise<Location[]> {
    return this.get('/api/resource/Location', { filters });
  }

  // Supplier operations (contractors)
  async createSupplier(data: SupplierInput): Promise<Supplier> {
    return this.post('/api/resource/Supplier', data);
  }

  // Custom FLRTS Personnel DocType
  async createFLRTSPersonnel(
    data: FLRTSPersonnelInput
  ): Promise<FLRTSPersonnel> {
    return this.post('/api/resource/FLRTS Personnel', data);
  }

  // Webhook management
  async registerWebhook(event: string, url: string): Promise<void> {
    // ERPNext webhook registration
  }

  // Private helper methods
  private async get<T>(endpoint: string, params?: any): Promise<T> {
    // HTTP GET with auth, error handling, retries
  }

  private async post<T>(endpoint: string, data: any): Promise<T> {
    // HTTP POST with auth, error handling, retries
  }

  private transformWorkOrderInput(input: WorkOrderInput): ERPNextWorkOrder {
    // Transform FLRTS format to ERPNext format
    // Handle field name differences, required fields, etc.
  }
}

// Type definitions
export interface WorkOrderInput {
  subject: string;
  location: string;
  assigned_to?: string;
  description?: string;
  due_date?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
}

export interface WorkOrder {
  name: string; // ERPNext ID
  subject: string;
  status: string;
  location: string;
  // ... all ERPNext Work Order fields
}

// ... more type definitions
```

**Deliverables:**

- **Package:** `packages/erpnext-client/`
  - Fully typed TypeScript client
  - Comprehensive unit tests (>80% coverage)
  - Integration tests against dev ERPNext instance
  - API documentation (JSDoc + README)
  - Example usage scripts
- **Document:** `docs/development/erpnext-client-api.md`
  - API reference for developers
  - Common usage patterns
  - Error handling guide

#### 3.2: Integration Code Change Planning

**Goal:** Create detailed migration plans for each integration (DON'T code yet!)

**Use Phase 1.4 Codebase Audit:**

For each module identified in audit:

1. **Review Audit Report:**
   - Files to modify
   - Functions to update
   - APIs to replace
   - Tests to update

2. **Create Detailed Migration Plan:**
   - Step-by-step changes for each file
   - Dependencies between changes (what must come first?)
   - Testing strategy for each change
   - Rollback strategy

3. **Identify Risks:**
   - What could break?
   - What's the blast radius?
   - How to mitigate?

**Example: sync-service Migration Plan**

```markdown
### sync-service Migration to ERPNext

**Files to Modify:**

1. `packages/sync-service/src/index.ts`
   - **Lines 45-67:** Replace OpenProject client initialization with
     ERPNextClient
   - **Lines 89-102:** Replace OpenProject webhook handlers with ERPNext webhook
     handlers
   - **Dependencies:** Must complete 3.1 (API client) first
   - **Testing:** Integration tests with dev ERPNext instance
   - **Risk:** High - core service functionality
   - **Rollback:** Feature flag to switch between OpenProject and ERPNext

2. `packages/sync-service/src/config.ts`
   - **Lines 12-15:** Replace OPENPROJECT*\* env vars with ERPNEXT*\*
   - **Dependencies:** None
   - **Testing:** Config validation tests
   - **Risk:** Low
   - **Rollback:** Keep old env vars until migration complete

**New Files to Create:**

1. `packages/sync-service/src/erpnext-sync.ts`
   - Purpose: ERPNext-specific sync logic
   - Functions:
     - `syncWorkOrderToSupabase()` - Cache work orders in Supabase
     - `handleERPNextWebhook()` - Process ERPNext webhooks
     - `transformERPNextToFLRTS()` - Data transformation layer
   - Testing: Unit tests + integration tests
   - Risk: Medium - new code, potential bugs

**Migration Steps (in order):**

1. Add ERPNext env vars (keep OpenProject vars)
2. Create erpnext-sync.ts module
3. Write tests for erpnext-sync.ts
4. Add feature flag to switch backends
5. Update index.ts to use ERPNext when flag enabled
6. Test with feature flag OFF (should still use OpenProject)
7. Test with feature flag ON (should use ERPNext)
8. Fix any issues
9. Enable feature flag in dev environment
10. Monitor for 1 week
11. Enable in production
12. Remove OpenProject code after 30 days

**Estimated Effort:** 16 hours **Risk Level:** High **Dependencies:** ERPNext
client (3.1), Custom DocTypes deployed (Phase 2)
```

**Deliverables:**

- **Document:** `docs/migration/sync-service-migration-plan.md`
- **Document:** `docs/migration/telegram-bot-migration-plan.md`
- **Document:** `docs/migration/n8n-workflows-migration-plan.md`
- Each with:
  - Detailed step-by-step changes
  - Testing strategy
  - Risk assessment
  - Rollback procedures
  - Effort estimates

#### 3.3: Integration Testing Suite Development

**Goal:** Build comprehensive integration tests BEFORE changing any integration
code

**Test Scenarios:**

```typescript
// tests/integration/erpnext-integration.test.ts

describe('ERPNext Integration Suite', () => {
  describe('Telegram Bot → ERPNext', () => {
    it('creates work order from Telegram message', async () => {
      // Simulate Telegram message
      // Verify work order created in ERPNext
      // Verify notification sent back to Telegram
    });
  });

  describe('ERPNext → n8n Webhooks', () => {
    it('triggers n8n workflow on work order creation', async () => {
      // Create work order in ERPNext
      // Verify n8n webhook received
      // Verify workflow executes correctly
    });
  });

  describe('Sync Service', () => {
    it('syncs ERPNext work orders to Supabase cache', async () => {
      // Create work order in ERPNext
      // Verify synced to Supabase
      // Verify data transformation correct
    });
  });

  describe('End-to-End Flow', () => {
    it('complete flow: Telegram → ERPNext → n8n → Notification', async () => {
      // Full integration test
    });
  });
});
```

**Deliverables:**

- **Test Suite:** `tests/integration/erpnext-integration.test.ts`
- **Test Fixtures:** Mock data for all scenarios
- **Test Environment:** Automated ERPNext dev instance setup
- **CI Integration:** Tests run on every PR

#### 3.4: Update Linear Stories (Deferred to Phase 4)

**Decision:** Don't update integration code stories until Phase 4

**Why:** Phase 3 is planning. Phase 4 is execution.

**Stories to Update in Phase 4:**

- `10N-155`: Telegram bot creates task via voice
- `10N-156-158`: Related stories
- `10N-159`: Close as superseded

**Phase 3 Success Criteria:**

- [ ] **API Client Foundation:**
  - [ ] ERPNext API client library complete
  - [ ] Unit tests >80% coverage
  - [ ] Integration tests against dev ERPNext passing
  - [ ] API documentation complete
- [ ] **Integration Plans:**
  - [ ] sync-service migration plan documented
  - [ ] Telegram bot migration plan documented
  - [ ] n8n workflow migration plan documented
  - [ ] All plans include effort estimates and risk assessments
- [ ] **Testing Infrastructure:**
  - [ ] Integration test suite created
  - [ ] Test fixtures and mock data ready
  - [ ] CI integration configured

**Rollback:** Low cost - only API client and planning docs created, no
integration code touched yet

---

### Phase 4: Integration Code Execution (Week 7-8)

**Goal:** Execute integration migrations following Phase 3 plans, using feature
flags for safety

**Prerequisites:**

- Phase 3 complete
- API client tested and working
- Migration plans reviewed and approved

**Philosophy:** Execute the plans systematically. Use feature flags. One
integration at a time. Test thoroughly.

**Linear Stories to Update:**

- [ ] `10N-155`: Telegram bot creates task via voice (update for ERPNext)
- [ ] `10N-156-158`: Related stories (update for ERPNext)
- [ ] `10N-159`: Close as superseded by ERPNext migration

**Linear Stories to Create:**

- [ ] `10N-XXX`: Migrate sync-service to ERPNext (with feature flag)
- [ ] `10N-XXX`: Migrate Telegram bot to ERPNext (with feature flag)
- [ ] `10N-XXX`: Migrate n8n workflows to ERPNext
- [ ] `10N-XXX`: End-to-end integration testing
- [ ] `10N-XXX`: Enable ERPNext in dev environment and monitor

#### 4.1: sync-service Migration

**Follow Plan from Phase 3.2**

**Key Steps:**

1. Add ERPNext configuration (feature flag OFF)
2. Create `erpnext-sync.ts` module
3. Write tests
4. Update `index.ts` with conditional logic:

   ```typescript
   if (config.USE_ERPNEXT) {
     return new ERPNextSyncService(erpnextClient);
   } else {
     return new OpenProjectSyncService(openProjectClient);
   }
   ```

5. Test with flag OFF (OpenProject still works)
6. Test with flag ON (ERPNext works)
7. Fix any issues
8. Deploy to dev with flag OFF initially

**Deliverables:**

- sync-service supports both OpenProject and ERPNext
- Feature flag controls which backend is used
- All tests passing for both backends
- Code deployed to dev environment

#### 4.2: Telegram Bot Migration

**Follow Plan from Phase 3.2**

**Key Steps:**

1. Update bot to use ERPNext API client
2. Update NLP integration (OpenAI prompts for ERPNext entities)
3. Add feature flag for ERPNext backend
4. Update tests
5. Test thoroughly with dev ERPNext instance
6. Deploy to dev with flag OFF

**Deliverables:**

- Telegram bot creates ERPNext work orders (when flag ON)
- Backwards compatible with OpenProject (when flag OFF)
- All tests passing
- Code deployed to dev

#### 4.3: n8n Workflows Migration

**Follow Plan from Phase 3.2**

**Key Steps:**

1. Create new n8n workflows for ERPNext webhooks
2. Keep existing OpenProject workflows active
3. Test ERPNext workflows in isolation
4. Validate end-to-end flows
5. Document workflow changes

**Deliverables:**

- n8n workflows for ERPNext events created
- Existing OpenProject workflows untouched (for rollback)
- Workflow documentation updated

#### 4.4: End-to-End Integration Testing

**Goal:** Validate complete flows work with ERPNext

**Test Scenarios:**

```bash
# Scenario 1: Telegram → ERPNext → n8n → Notification
1. Send Telegram message: "Create work order at Site-001 for painting"
2. Verify work order created in ERPNext
3. Verify n8n workflow triggered
4. Verify notification sent back to Telegram

# Scenario 2: sync-service syncs ERPNext changes to Supabase
1. Update work order in ERPNext UI
2. Verify webhook received by sync-service
3. Verify Supabase cache updated

# Scenario 3: Multiple integrations working together
1. Create work order via Telegram
2. Update in ERPNext UI
3. Verify Supabase cache reflects changes
4. Verify notifications sent
```

**Deliverables:**

- All test scenarios passing
- Test results documented
- Performance metrics captured

#### 4.5: Dev Environment Deployment & Monitoring

**Goal:** Run ERPNext integrations in dev for 1 week before production

**Steps:**

1. Enable feature flags in dev environment
2. Monitor logs, errors, performance
3. Test with real usage patterns
4. Fix any issues found
5. Document any gotchas or edge cases

**Monitoring Checklist:**

- [ ] API response times acceptable
- [ ] No errors in logs
- [ ] All integrations working as expected
- [ ] Performance meets targets
- [ ] Users can create/view/update work orders
- [ ] Webhooks firing correctly

**Deliverables:**

- Dev environment running ERPNext for 1 week
- Monitoring report (errors, performance, issues)
- Issues found and fixed documented
- Confidence to proceed to production

**Phase 4 Success Criteria:**

- [ ] **Code Migrations Complete:**
  - [ ] sync-service migrated with feature flag
  - [ ] Telegram bot migrated with feature flag
  - [ ] n8n workflows migrated
  - [ ] All unit and integration tests passing
- [ ] **End-to-End Validation:**
  - [ ] All integration test scenarios passing
  - [ ] Performance acceptable (API < 200ms)
  - [ ] No critical bugs
- [ ] **Dev Environment Stable:**
  - [ ] ERPNext running in dev for 1 week
  - [ ] Monitoring shows healthy metrics
  - [ ] Ready for production deployment

**Rollback:** Feature flags make rollback easy - just flip flags back to
OpenProject. Medium cost if issues found late.

---

### Phase 5: Custom UI Development (OPTIONAL - Week 9-11)

**Goal:** Build FLRTS custom dashboard on ERPNext API (ONLY if ERPNext web UI
insufficient)

**Prerequisites:**

- Phase 4 complete
- ERPNext API integrations stable in dev
- Decision made that custom UI is needed (not just using ERPNext web UI)

**Note:** This phase is OPTIONAL. For MVP, consider using ERPNext native web UI.

**Decision Point Questions:**

- Is ERPNext web UI sufficient for current needs?
- What specific features are missing from ERPNext UI?
- Is custom UI worth 3+ weeks of development time?
- Can we start with ERPNext UI and build custom UI later if needed?

**If Custom UI Needed:**

(Keep original Phase 4 content here about dashboard development)

**Deliverables:**

- Custom FLRTS dashboard (if needed)
- Or decision to use ERPNext native UI

---

### Phase 6: Production Deployment (Week 9 or 12 depending on Phase 5)

**Goal:** Deploy ERPNext to production and migrate live data

**Prerequisites:**

- All previous phases complete
- User acceptance testing passed
- Production deployment plan approved

**Linear Stories to Create:**

- [ ] `10N-XXX`: Deploy ERPNext production instance
- [ ] `10N-XXX`: Run production data migration
- [ ] `10N-XXX`: Switch production traffic to ERPNext
- [ ] `10N-XXX`: Deprecate OpenProject instance
- [ ] `10N-XXX`: Monitor and optimize

**Technical Tasks:**

#### 6.1: Production ERPNext Deployment

```bash
# Deploy ERPNext to production infrastructure
# Use managed PostgreSQL (Supabase production)
# Configure SSL, backups, monitoring
```

**Deliverables:**

- ERPNext production instance deployed
- Connected to Supabase production database
- SSL configured
- Backups automated
- Monitoring configured (uptime, performance)

#### 6.2: Production Data Migration

**CRITICAL: Announce maintenance window**

```bash
# 1. Announce maintenance (1-2 hour window)
# 2. Stop writes to current system
# 3. Backup production database
# 4. Run migration scripts
# 5. Validate data
# 6. Switch DNS/endpoints
# 7. Resume operations
```

**Migration Checklist:**

- [ ] Maintenance window announced (48 hours notice)
- [ ] Production database backed up
- [ ] Migration scripts tested on prod copy
- [ ] Migration executed
- [ ] Data validation passed (record counts match)
- [ ] ERPNext API responding
- [ ] Integrations tested (Telegram, n8n)

**Deliverables:**

- Production data migrated to ERPNext schema
- Validation report (0 data loss)
- Old schema preserved (for rollback)

#### 6.3: Traffic Cutover

```bash
# Update environment variables
N8N_ERPNEXT_URL=https://erpnext.10nz.tools
TELEGRAM_BOT_BACKEND=erpnext

# Update DNS if needed
# Restart services with new config
```

**Deliverables:**

- All services pointing to ERPNext
- Telegram bot creating ERPNext work orders
- n8n workflows triggered by ERPNext
- FLRTS dashboard (if built) using ERPNext API

#### 6.4: OpenProject Deprecation

```bash
# Keep OpenProject running (read-only) for 30 days
# Monitor ERPNext for issues
# After 30 days: shut down OpenProject
# After 90 days: delete OpenProject instance
```

**Deliverables:**

- OpenProject marked read-only
- Documentation updated (ERPNext is now SSOT)
- Team trained on ERPNext

#### 6.5: Post-Deployment Monitoring

Monitor for 7 days:

```sql
-- Check ERPNext usage
SELECT COUNT(*) FROM tabWorkOrder
WHERE creation > NOW() - INTERVAL '1 day';

-- Check API performance
-- Monitor Supabase dashboard
-- Check error logs
```

**Monitoring Checklist:**

- [ ] API response times < 200ms
- [ ] No errors in logs
- [ ] All integrations working
- [ ] Users can create/view work orders
- [ ] Mobile app working (if used)
- [ ] n8n workflows executing

**Success Criteria:**

- [ ] ERPNext production deployed
- [ ] Production data migrated successfully
- [ ] All traffic cutover to ERPNext
- [ ] 0 critical bugs in 7 day monitoring period
- [ ] User acceptance confirmed
- [ ] OpenProject deprecated

**Rollback:**

- **Before migration:** Low cost - abort deployment
- **After migration:** High cost - restore from backup, revert code
- **Rollback window:** 30 days (while OpenProject still running)

---

## Linear Issue Management

### Issues to Update

**Close as Superseded:**

- `10N-159`: OpenProject Schema Migration
  - Comment: "Superseded by ERPNext adoption (ADR-006)"
  - Link to new epic

**Update for ERPNext:**

- `10N-155`: Telegram bot creates task via voice
- `10N-156`: Telegram bot creates task via voice (continuation)
- `10N-157`: Telegram bot creates task via voice (continuation)
- `10N-158`: Telegram bot creates task via voice (continuation)
  - Update: Change from "OpenProject API" to "ERPNext API"

### New Epic to Create

**Epic: ERPNext Backend Adoption**

**Description:**

```markdown
Replace OpenProject with ERPNext as FSM backend platform.

**Background:** After investigating OpenProject schema migration (10N-159),
discovered OpenProject is not designed for field service operations. ERPNext
provides native FSM features, better extensibility, and same PostgreSQL/Supabase
compatibility.

**Related ADR:** ADR-006

**Phases:**

1. Research & Validation (2 weeks)
2. Schema Migration Planning (1 week)
3. Integration Code Updates (2 weeks)
4. Custom UI Development (3 weeks) [Optional]
5. Production Deployment (1 week)

**Success Criteria:**

- ERPNext deployed and integrated
- All FLRTS features working on ERPNext backend
- Telegram bot creates ERPNext work orders
- n8n workflows use ERPNext webhooks
- Custom dashboard (if built) uses ERPNext API
- Zero data loss during migration
```

**Child Stories:** All Phase 1-5 stories listed above

### Issues to Keep As-Is

All other issues unrelated to OpenProject/ERPNext migration.

---

## Decision Gates

### Gate 1: End of Phase 1 (Research)

**Question:** Does ERPNext meet our needs?

**Go Criteria:**

- ✅ ERPNext FSM module has sites, contractors, work orders
- ✅ API works with Telegram and n8n
- ✅ Performance acceptable
- ✅ Can connect to Supabase PostgreSQL
- ✅ Schema extensible for custom features

**No-Go Actions:**

- Document why ERPNext doesn't fit
- Evaluate alternatives (Odoo, custom schema, commercial FSM)
- Present options to stakeholders

### Gate 2: End of Phase 2 (Migration Planning)

**Question:** Can we safely migrate production data?

**Go Criteria:**

- ✅ Migration scripts tested successfully
- ✅ Zero data loss in test migration
- ✅ Migration time acceptable (< 1 hour)
- ✅ Rollback procedure tested

**No-Go Actions:**

- Fix migration scripts
- Re-test until criteria met
- If unfixable: abort migration, keep OpenProject

### Gate 3: End of Phase 3 (Integrations)

**Question:** Do all integrations work with ERPNext?

**Go Criteria:**

- ✅ Telegram bot creates work orders
- ✅ n8n workflows triggered
- ✅ End-to-end flow tested
- ✅ No critical bugs

**No-Go Actions:**

- Fix integration bugs
- Re-test
- If unfixable: evaluate if ERPNext viable

### Gate 4: Before Phase 5 (Production)

**Question:** Ready for production deployment?

**Go Criteria:**

- ✅ All previous phases complete
- ✅ User acceptance testing passed
- ✅ Production deployment plan reviewed
- ✅ Rollback procedure documented
- ✅ Stakeholders approve

**No-Go Actions:**

- Address blockers
- Schedule new deployment date
- Continue testing

---

## Communication Plan

### Stakeholders to Notify

1. **Product Owner:**
   - ADR-006 approval needed
   - Informed at each decision gate
   - Final production deployment approval

2. **Development Team:**
   - ADR-006 shared
   - Weekly updates during migration
   - Training on ERPNext if needed

3. **End Users:**
   - Notified before Phase 5 (production deployment)
   - Maintenance window announced 48 hours ahead
   - Training on ERPNext web UI (if used)

### Communication Channels

- **Linear:** All stories and updates
- **Git:** ADR and docs committed
- **Team Chat:** Daily progress updates during migration
- **Email:** Maintenance window announcements

---

## Risk Register

| Risk                                | Impact   | Probability | Mitigation                                    |
| ----------------------------------- | -------- | ----------- | --------------------------------------------- |
| ERPNext doesn't fit needs (Phase 1) | High     | Low         | Thorough research phase with POCs             |
| Data loss during migration          | Critical | Low         | Multiple backups, test migrations, validation |
| Migration takes too long            | Medium   | Medium      | Phased approach, test on prod copy first      |
| Performance issues in production    | High     | Low         | Load testing, monitoring, rollback plan       |
| Team lacks ERPNext expertise        | Medium   | Medium      | Documentation, training, ERPNext community    |
| ERPNext bugs/issues post-deployment | Medium   | Low         | 30-day OpenProject backup, active monitoring  |
| Integration failures (Telegram/n8n) | High     | Low         | Extensive integration testing before prod     |
| User resistance to change           | Medium   | Medium      | Training, gradual rollout, support            |

---

## Success Metrics

Track these throughout migration:

| Metric              | Target        | How to Measure                 |
| ------------------- | ------------- | ------------------------------ |
| Data Integrity      | 100% (0 loss) | Record count validation        |
| Migration Downtime  | < 2 hours     | Maintenance window log         |
| API Performance     | < 200ms avg   | Monitoring dashboard           |
| Integration Success | 100%          | End-to-end test results        |
| Critical Bugs       | 0             | Bug tracker 7 days post-deploy |
| User Satisfaction   | ≥ 80%         | User survey after 30 days      |
| Cost Savings        | $1,400+/month | Salesforce avoided             |
| Time to MVP         | < 12 weeks    | Project timeline               |

---

## Next Steps

**Immediate (This Week):**

1. ✅ ADR-006 created
2. ✅ This workflow document created
3. [ ] Update Linear issues:
   - Mark 10N-159 as superseded
   - Update 10N-155 through 10N-158
   - Create new ERPNext epic
   - Create Phase 1 stories
4. [ ] Create `feature/erpnext-adoption` branch
5. [ ] Commit ADR and workflow to Git
6. [ ] Get ADR-006 approved by stakeholders

**Next Week (Phase 1 Start):**

1. [ ] Deploy ERPNext dev instance
2. [ ] Connect to Supabase test database
3. [ ] Configure FSM module
4. [ ] Begin API testing

---

## References

- [ADR-006: ERPNext Backend Adoption](adr/ADR-006-erpnext-backend-adoption.md)
- [Linear 10N-159: OpenProject Schema Migration](https://linear.app/10netzero/issue/10N-159)
- [ERPNext Documentation](https://docs.erpnext.com)
- [Frappe Docker](https://github.com/frappe/frappe_docker) - For PostgreSQL
  deployment
