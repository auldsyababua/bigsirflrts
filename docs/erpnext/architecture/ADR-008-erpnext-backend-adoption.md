# Architecture Decision Record: ERPNext as Backend Platform

## ADR-008: ERPNext FSM Backend vs OpenProject vs Custom Schema

**Status:** Proposed **Date:** 2025-09-30 **Decision Makers:** Technical
Architecture Team, Product Owner

## Context

After implementing OpenProject integration for field service management (FSM),
discovered fundamental architectural misalignment:

### Discovery Process

1. **Initial Approach:** OpenProject selected for off-the-shelf project
   management features
2. **Schema Migration Investigation (10N-159):**
   - DevOps audit revealed zero FK coupling between FLRTS custom tables and
     OpenProject
   - ~180 OpenProject tables exist in production
   - OpenProject designed for software/generic PM, not field service operations
3. **Critical Findings:**
   - OpenProject lacks native tables for sites, contractors, field operations
   - Custom fields only (no custom tables support)
   - Enterprise license required for full features
   - Cannot extend schema without forking (maintenance nightmare)
4. **Cost Analysis:**
   - Evaluated headless FSM APIs (Salesforce Field Service: $150-165/user/month)
   - At 10-50 users: $1,500-8,250/month
   - Researched open-source FSM alternatives

### Requirements

**Must Have:**

- Sites/locations management (field service, not generic projects)
- Contractor/vendor tracking
- Work order management with site assignment
- User roles (admin, supervisor, field worker)
- REST API for integrations
- Active maintenance and community support
- PostgreSQL/Supabase compatibility
- Can integrate with: Telegram bots, n8n workflows

**Highly Desired:**

- Checklist/inventory management
- Recurring scheduling/reminders
- Custom fields or extensible data model
- Multi-tenant support (future clients)
- Self-hosted option
- Free/open-source

### Alternatives Evaluated

| Platform           | Type                | Cost/User/Month | FSM Features       | PostgreSQL       | API             | Verdict                |
| ------------------ | ------------------- | --------------- | ------------------ | ---------------- | --------------- | ---------------------- |
| **OpenProject**    | Open-source PM      | Free/$5-7       | ❌ Generic PM only | ✅               | ✅              | **Current - Rejected** |
| **Salesforce FSM** | Enterprise headless | $150-165        | ✅ Full FSM        | ❌ Salesforce DB | ✅ Excellent    | Too expensive          |
| **ERPNext**        | Open-source ERP     | Free            | ✅ Full FSM module | ✅ PostgreSQL    | ✅ Extensive    | **Recommended**        |
| **Odoo CE**        | Open-source ERP     | Free            | ⚠️ Limited FSM     | ✅ PostgreSQL    | ⚠️ Via add-ons  | Viable alternative     |
| **Custom Schema**  | Build from scratch  | Dev time        | ✅ Tailored        | ✅ Supabase      | ✅ Full control | High maintenance       |

## Decision

**Adopt ERPNext as the backend platform, replacing OpenProject and custom FLRTS
schema.**

- Deploy ERPNext connected to Supabase PostgreSQL database
- Use ERPNext FSM module for business logic and schema
- Build custom UIs (FLRTS dashboard, Telegram bot) on top of ERPNext REST API
- Maintain Supabase as single database (ERPNext schema + custom extensions)
- Use only FSM features needed for MVP, grow into advanced features

## Rationale

### ERPNext Strengths

**Field Service Features (Native):**

- ✅ Sites/locations management
- ✅ Contractors/vendors tracking
- ✅ Work orders with site assignment
- ✅ User roles and permissions
- ✅ Scheduling engine
- ✅ Recurring tasks
- ✅ Inventory/stock management
- ✅ Mobile app support

**Technical Fit:**

- ✅ PostgreSQL native (can use Supabase)
- ✅ Comprehensive REST API (all modules)
- ✅ Active development (daily commits)
- ✅ Large community (thousands of deployments)
- ✅ Webhook support for real-time sync
- ✅ n8n integration available
- ✅ Can build custom UIs on top

**Cost:**

- ✅ Free and open-source
- ✅ Only hosting costs (~$40-60/month)
- ✅ No per-user licensing
- ✅ Can self-host or use managed providers

**Extensibility:**

- ✅ Custom fields supported
- ✅ Custom DocTypes (tables) supported
- ✅ Python-based customization
- ✅ App framework for extensions
- ⚠️ Must follow ERPNext patterns (better than forking OpenProject)

### vs OpenProject

| Aspect             | OpenProject                   | ERPNext                             |
| ------------------ | ----------------------------- | ----------------------------------- |
| **Domain Fit**     | Generic PM (software teams)   | Field service operations            |
| **Sites Table**    | ❌ Projects only              | ✅ Native locations                 |
| **Contractors**    | ❌ Custom fields hack         | ✅ Native suppliers/vendors         |
| **Work Orders**    | ⚠️ Work packages (PM context) | ✅ Native work orders (FSM context) |
| **Extensibility**  | ❌ Custom fields only         | ✅ Custom DocTypes + fields         |
| **Schema Control** | ❌ Locked (~180 tables)       | ✅ Documented patterns              |
| **FSM Features**   | ❌ None                       | ✅ Full module                      |

### vs Custom Schema

| Aspect                  | Custom Schema                   | ERPNext                  |
| ----------------------- | ------------------------------- | ------------------------ |
| **Development Time**    | Months of business logic coding | Days of configuration    |
| **Maintenance**         | Ongoing dev overhead            | Community maintains core |
| **Scheduling Engine**   | Must build from scratch         | Built-in with recurring  |
| **Mobile App**          | Must build from scratch         | Native mobile app        |
| **Workflow Automation** | Must code                       | Configuration-based      |
| **Reporting**           | Must build                      | Report builder included  |
| **Total Cost (1 year)** | ~$30-50k dev time               | ~$500-1k hosting         |

### vs Salesforce Field Service

| Aspect              | Salesforce FSM             | ERPNext                |
| ------------------- | -------------------------- | ---------------------- |
| **Cost (10 users)** | $18,000/year               | ~$600/year (hosting)   |
| **Cost (50 users)** | $99,000/year               | ~$600/year (hosting)   |
| **Database**        | Salesforce proprietary     | PostgreSQL/Supabase    |
| **Customization**   | Apex code (vendor lock-in) | Python (open patterns) |
| **Data Ownership**  | Salesforce controls        | Full ownership         |
| **Exit Strategy**   | Complex migration          | Standard SQL export    |

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           ERPNext Schema (SSOT for FSM)                │ │
│  │  • Sites, Work Orders, Contractors, Users              │ │
│  │  • Scheduling, Inventory, Projects                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │        Custom FLRTS Extensions (if needed)             │ │
│  │  • Lists, Reminders (if not using ERPNext features)    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ ERPNext │        │  FLRTS  │        │Telegram │
   │   Web   │        │Dashboard│        │   Bot   │
   │   UI    │        │  (Custom)│       │(Custom) │
   │(Optional)│       └─────────┘        └─────────┘
   └─────────┘              │                  │
                            │                  │
                     ERPNext REST API          │
                            └──────────────────┘
                                    │
                            ┌───────▼───────┐
                            │      n8n      │
                            │  (Workflows)  │
                            └───────────────┘
```

### Schema Organization

**Option A: ERPNext Schema Only (Recommended for MVP)**

```sql
-- All in ERPNext native tables
erpnext.tabLocation        -- Sites/locations
erpnext.tabSupplier        -- Contractors
erpnext.tabWorkOrder       -- Work orders
erpnext.tabUser            -- Personnel/users
erpnext.tabTask            -- Tasks with recurring
erpnext.tabProject         -- Projects
```

**Option B: Hybrid (If custom features needed)**

```sql
-- ERPNext for FSM business logic
erpnext.tabLocation
erpnext.tabWorkOrder
erpnext.tabSupplier

-- Custom FLRTS features (if ERPNext doesn't have)
public.lists               -- If ERPNext ToDo insufficient
public.reminders           -- If ERPNext Event insufficient
```

### Integration Points

**Telegram Bot → ERPNext:**

```python
# Create work order via API
POST /api/resource/Work Order
{
  "location": "Site-001",
  "subject": "Replace HVAC filter",
  "assigned_to": "user@example.com"
}
```

**n8n Workflows:**

- Webhook triggers from ERPNext (work order created, completed)
- Telegram notifications via bot
- OpenAI NLP → ERPNext work order creation
- Recurring task automation

**FLRTS Dashboard:**

- Read work orders, sites, contractors via ERPNext API
- Optional: Cache in Supabase views for dashboard performance
- Write operations always go to ERPNext API (SSOT)

## Migration Path

### Phase 1: Research & Setup (1-2 weeks)

1. Deploy ERPNext development instance
2. Connect to Supabase PostgreSQL test database
3. Test ERPNext FSM module features
4. Verify API integration with Telegram/n8n
5. Document ERPNext schema vs current FLRTS schema mapping

### Phase 2: Schema Migration (1-2 weeks)

1. Export current FLRTS data (if any production data exists)
2. Map to ERPNext entities:
   - `public.sites` → `tabLocation`
   - `public.contractors` → `tabSupplier`
   - `public.personnel` → `tabUser`
   - `public.tasks` → `tabWork Order` or `tabTask`
3. Import data via ERPNext data import tools
4. Validate data integrity

### Phase 3: Integration Updates (2-3 weeks)

1. Update sync-service to use ERPNext API instead of OpenProject
2. Modify Telegram bot to create ERPNext work orders
3. Update n8n workflows to use ERPNext webhooks
4. Update Linear stories 10N-155 through 10N-158 (Telegram task creation)
5. Test end-to-end flows

### Phase 4: Custom UI Development (3-4 weeks)

1. Build FLRTS dashboard on ERPNext API
2. Implement site views, work order lists, contractor management
3. Add custom features not in ERPNext (if needed)
4. User acceptance testing

### Phase 5: Deployment (1 week)

1. Deploy ERPNext production instance
2. Migrate production data
3. Switch DNS/endpoints to ERPNext
4. Deprecate OpenProject instance
5. Monitor and optimize

**Total Estimated Time:** 8-12 weeks to full production

## Consequences

### Positive

✅ **Free and Open-Source:** No licensing costs, only hosting (~$40-60/month) ✅
**Field Service Native:** Purpose-built for FSM, not generic PM ✅
**PostgreSQL/Supabase:** Use preferred database stack ✅ **Comprehensive API:**
All features accessible via REST ✅ **Active Community:** Daily commits, large
user base, good documentation ✅ **Extensible:** Custom DocTypes and fields
supported ✅ **Mobile Support:** Native mobile app for field workers ✅ **Grow
Into Features:** Use what's needed now, expand later (scheduling, inventory,
etc.) ✅ **Off-the-Shelf Logic:** Avoid building business logic from scratch ✅
**Data Ownership:** Full control, standard SQL export ✅ **Custom UI:** Build
FLRTS dashboard on top of ERPNext backend

### Negative

⚠️ **Learning Curve:** Team must learn ERPNext patterns and API ⚠️ **Migration
Effort:** 8-12 weeks to fully migrate from OpenProject ⚠️ **Python Dependency:**
Customizations require Python knowledge ⚠️ **ERP Overhead:** ERPNext includes
many modules we don't need (can ignore) ⚠️ **Must Follow Patterns:** Can't
arbitrary schema changes (but better than OpenProject) ⚠️ **Initial Setup
Complexity:** ERPNext setup more involved than simple schema

### Neutral

- ERPNext web UI exists but optional (can build custom FLRTS UI entirely)
- Both self-hosted and managed hosting options available
- Can contribute back to ERPNext if we build useful FSM extensions
- May need custom DocTypes for unique FLRTS features

### Risks and Mitigations

| Risk                                       | Impact | Probability | Mitigation                                                   |
| ------------------------------------------ | ------ | ----------- | ------------------------------------------------------------ |
| ERPNext doesn't fit exact needs            | High   | Low         | Research phase validates fit before commitment               |
| Migration takes longer than estimated      | Medium | Medium      | Phased approach allows early abort if needed                 |
| Team lacks Python skills for customization | Medium | Low         | Most FSM features work out-of-box; hire Python dev if needed |
| ERPNext project abandonment                | High   | Very Low    | Active daily commits, large community, can fork if needed    |
| Performance issues with Supabase           | Medium | Low         | ERPNext tested with PostgreSQL; Supabase is managed Postgres |

## Success Criteria

This decision is successful if:

1. **Functional:**
   - ✅ Can create/manage sites, contractors, work orders via ERPNext
   - ✅ Telegram bot successfully creates work orders via API
   - ✅ n8n workflows integrate with ERPNext webhooks
   - ✅ Custom FLRTS dashboard can read/display ERPNext data

2. **Performance:**
   - ✅ API response times < 200ms
   - ✅ Can handle 10 concurrent users
   - ✅ Mobile app works for field workers

3. **Cost:**
   - ✅ Total monthly cost < $100 (hosting only)
   - ✅ No per-user licensing fees
   - ✅ Dev time < 3 months to MVP

4. **Maintainability:**
   - ✅ Team can configure ERPNext without deep Python knowledge
   - ✅ Upgrades don't break customizations
   - ✅ Documentation exists for custom integrations

## Rollback Plan

If ERPNext adoption fails during research/migration:

1. **Before Schema Migration (Phase 1):** Easy rollback - continue with current
   OpenProject integration
2. **During Schema Migration (Phase 2):** Restore FLRTS schema from backup,
   abandon ERPNext
3. **After Integration Updates (Phase 3+):** More costly - would need to either:
   - Complete ERPNext migration (sunk cost)
   - OR build custom schema from scratch (original alternative)
   - OR pay for Salesforce/commercial FSM

**Key Decision Point:** End of Phase 1 (Research & Setup)

- If ERPNext doesn't meet needs, abort before schema migration
- Low cost to rollback at this point

## Implementation

### Immediate Actions (This Sprint)

1. **Update Linear 10N-159:**
   - Mark OpenProject schema migration as blocked/superseded
   - Create new epic for ERPNext adoption
   - Update stories 10N-155 through 10N-158 (on hold pending ERPNext)

2. **Create New Stories:**
   - [ ] 10N-XXX: Research ERPNext FSM module capabilities
   - [ ] 10N-XXX: Deploy ERPNext development instance
   - [ ] 10N-XXX: Connect ERPNext to Supabase PostgreSQL
   - [ ] 10N-XXX: Test ERPNext API with Telegram/n8n
   - [ ] 10N-XXX: Document schema mapping (FLRTS → ERPNext)

3. **Branch Strategy:**
   - Create `feature/erpnext-adoption` branch
   - Keep `main` stable with current OpenProject integration
   - Merge ERPNext only after successful Phase 1 validation

### Research Phase Deliverables

Before proceeding to migration:

- [ ] ERPNext deployed and connected to Supabase
- [ ] FSM module configured with test data (sites, contractors, work orders)
- [ ] API tested with Postman/curl (create, read, update work orders)
- [ ] Telegram bot proof-of-concept creates ERPNext work order
- [ ] n8n workflow triggered by ERPNext webhook
- [ ] Schema mapping document (FLRTS tables → ERPNext DocTypes)
- [ ] Performance baseline (API response times, database load)
- [ ] Go/No-Go decision documented

## References

### ERPNext Documentation

- [ERPNext Field Service Module](https://docs.erpnext.com/docs/user/manual/en/field-service-management)
- [ERPNext REST API](https://frappeframework.com/docs/user/en/api/rest)
- [ERPNext Custom DocTypes](https://frappeframework.com/docs/user/en/desk/doctype)
- [ERPNext PostgreSQL Setup](https://github.com/frappe/bench/wiki/Using-PostgreSQL)

### Related ADRs

- ADR-002: OpenProject Migration Pattern (superseded by this ADR)
- ADR-003: Supabase Connection Pooling (still applies - ERPNext uses same DB)

### Linear Issues

- [10N-159: OpenProject Schema Migration](https://linear.app/10netzero/issue/10N-159)
  (blocked/superseded)
- 10N-155 through 10N-158: Telegram task creation (on hold pending ERPNext)

### Research Documents

- `/docs/non-development-related-files/open-project-schenma-research/` -
  OpenProject investigation
- Perplexity research: Headless FSM APIs, open-source alternatives (2025-09-30)

## Review Schedule

Reassess this decision:

- **End of Phase 1 (Research):** Go/No-Go decision point
- **End of Phase 3 (Integration):** Evaluate migration progress, adjust timeline
- **After 3 months production use:** Long-term viability assessment
- **When user count reaches 50:** Scalability and cost review

## Approval

**Recommended:** Yes - adopt ERPNext for FSM backend

**Awaiting Approval:**

- [ ] Product Owner
- [ ] Technical Lead
- [ ] DevOps/Infrastructure

**Decision Date:** [To be filled after approval] **Approved By:** [To be filled
after approval]
