# ERPNext Migration Workflow

**Status:** Planning **Date:** 2025-09-30 **Related ADR:**
[ADR-006: ERPNext Backend Adoption](adr/ADR-006-erpnext-backend-adoption.md)

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

### Phase 0: Preparation (Current)

**Goal:** Document decision and plan systematic migration

**Tasks:**

1. ✅ Create ADR-006 documenting ERPNext decision
2. ✅ Create this migration workflow document
3. [ ] Audit all Linear issues for impact
4. [ ] Create new Linear epic for ERPNext adoption
5. [ ] Update affected Linear stories
6. [ ] Create new branch `feature/erpnext-adoption`
7. [ ] Commit ADR and workflow docs to Git

**Success Criteria:**

- ADR-006 exists and is complete
- Migration workflow documented
- All Linear issues updated
- Clean Git branch created

**Rollback:** N/A (just planning)

---

### Phase 1: Research & Validation (Week 1-2)

**Goal:** Validate ERPNext fits our needs before committing to migration

**Branch:** `feature/erpnext-adoption`

**Linear Stories to Create:**

- [ ] `10N-XXX`: Deploy ERPNext dev instance
- [ ] `10N-XXX`: Connect ERPNext to Supabase PostgreSQL
- [ ] `10N-XXX`: Test ERPNext FSM module features
- [ ] `10N-XXX`: Validate ERPNext API integration
- [ ] `10N-XXX`: Create schema mapping document

**Technical Tasks:**

#### 1.1: ERPNext Deployment

```bash
# Deploy ERPNext using Docker on test environment
# Use frappe_docker for Supabase PostgreSQL connection
# Document deployment steps
```

**Deliverables:**

- ERPNext running on test server
- Accessible web UI at `https://erpnext-dev.10nz.tools`
- Connected to Supabase test database

#### 1.2: ERPNext Configuration

```bash
# Configure FSM module
# Create test data:
#   - 2-3 locations (sites)
#   - 2-3 suppliers (contractors)
#   - 5-10 work orders
#   - 3-5 users with different roles
```

**Deliverables:**

- FSM module enabled
- Test data representing FLRTS domain
- User roles configured (admin, supervisor, worker)

#### 1.3: API Testing

```bash
# Test ERPNext REST API
# Endpoints to validate:
#   - GET /api/resource/Location
#   - POST /api/resource/Work Order
#   - GET /api/resource/Supplier
#   - Webhooks configuration
```

**Deliverables:**

- Postman collection with ERPNext API calls
- API response time benchmarks
- Webhook test successful (triggers n8n)

#### 1.4: Integration Proof-of-Concepts

**Telegram Bot → ERPNext:**

```python
# Create simple Telegram bot that:
# 1. Receives message: "Create work order at Site-001"
# 2. Calls ERPNext API to create work order
# 3. Confirms creation back to Telegram
```

**n8n Workflow → ERPNext:**

```yaml
# Create n8n workflow that:
# 1. Listens to ERPNext webhook (work order created)
# 2. Sends Telegram notification
# 3. Logs to Supabase
```

**Deliverables:**

- Telegram bot POC working
- n8n workflow POC working
- Integration response times measured

#### 1.5: Schema Mapping Document

Create document mapping current FLRTS schema → ERPNext:

```markdown
# FLRTS → ERPNext Schema Mapping

| FLRTS Table        | ERPNext DocType         | Notes                   |
| ------------------ | ----------------------- | ----------------------- |
| public.sites       | tabLocation             | Direct mapping          |
| public.contractors | tabSupplier             | Direct mapping          |
| public.personnel   | tabUser + custom fields | May need custom DocType |
| public.tasks       | tabWork Order           | Primary work tracking   |
| public.lists       | tabToDo                 | Or keep custom table    |
| public.reminders   | tabEvent                | Or keep custom table    |
```

**Deliverables:**

- Complete schema mapping document
- Data migration scripts (draft)
- Identified gaps (features needing custom DocTypes)

**Success Criteria:**

- [ ] ERPNext deployed and accessible
- [ ] FSM module working with test data
- [ ] API tested and documented (Postman collection)
- [ ] Telegram bot POC creates ERPNext work order
- [ ] n8n workflow triggered by ERPNext webhook
- [ ] Schema mapping complete
- [ ] Performance acceptable (API < 200ms)
- [ ] **Go/No-Go decision:** ERPNext meets requirements

**Rollback:** Delete test instance, continue with OpenProject (low cost)

**Go/No-Go Decision Point:**

- If ERPNext doesn't meet needs → Document why, evaluate alternatives
- If ERPNext works → Proceed to Phase 2

---

### Phase 2: Schema Migration Planning (Week 3)

**Goal:** Plan detailed data migration without touching production

**Prerequisites:**

- Phase 1 complete and approved
- Go decision made

**Linear Stories to Create:**

- [ ] `10N-XXX`: Audit production data for migration
- [ ] `10N-XXX`: Write data migration scripts
- [ ] `10N-XXX`: Test migration on copy of production data

**Technical Tasks:**

#### 2.1: Production Data Audit

```sql
-- Count records in each FLRTS table
SELECT 'sites' AS table_name, COUNT(*) FROM public.sites
UNION ALL
SELECT 'contractors', COUNT(*) FROM public.contractors
UNION ALL
SELECT 'personnel', COUNT(*) FROM public.personnel
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'lists', COUNT(*) FROM public.lists
UNION ALL
SELECT 'reminders', COUNT(*) FROM public.reminders;

-- Identify data quality issues
-- Check for nulls, invalid references, etc.
```

**Deliverables:**

- Data audit report
- List of data quality issues to fix
- Record counts per table

#### 2.2: Migration Scripts

Create Python scripts using ERPNext data import:

```python
# migrate_sites.py
# Reads public.sites, creates ERPNext Locations

# migrate_contractors.py
# Reads public.contractors, creates ERPNext Suppliers

# migrate_personnel.py
# Reads public.personnel, creates ERPNext Users

# migrate_tasks.py
# Reads public.tasks, creates ERPNext Work Orders
```

**Deliverables:**

- Migration scripts for each entity type
- Rollback scripts (delete imported data)
- Data validation scripts (compare before/after)

#### 2.3: Test Migration

Run migration on copy of production database:

```bash
# 1. Clone production Supabase to test instance
# 2. Point ERPNext dev to test database
# 3. Run migration scripts
# 4. Validate data integrity
# 5. Test API access to migrated data
```

**Deliverables:**

- Test migration completed successfully
- Data validation report (all records migrated)
- Performance metrics (migration time, API performance)

**Success Criteria:**

- [ ] Production data audited
- [ ] Migration scripts written and tested
- [ ] Test migration successful (0 data loss)
- [ ] Validation confirms data integrity
- [ ] Migration time acceptable (< 1 hour for production data)

**Rollback:** Keep current schema, abort migration (medium cost)

---

### Phase 3: Integration Code Updates (Week 4-5)

**Goal:** Update all integrations to use ERPNext API instead of OpenProject

**Prerequisites:**

- Phase 2 complete
- Migration scripts validated

**Linear Stories to Update:**

- [ ] `10N-155`: Update for ERPNext work order creation
- [ ] `10N-156`: Update for ERPNext work order creation
- [ ] `10N-157`: Update for ERPNext work order creation
- [ ] `10N-158`: Update for ERPNext work order creation
- [ ] `10N-159`: Close as superseded by ERPNext migration

**Linear Stories to Create:**

- [ ] `10N-XXX`: Update sync-service for ERPNext API
- [ ] `10N-XXX`: Update Telegram bot for ERPNext integration
- [ ] `10N-XXX`: Update n8n workflows for ERPNext webhooks
- [ ] `10N-XXX`: Create ERPNext API client library

**Technical Tasks:**

#### 3.1: Create ERPNext API Client

Create reusable TypeScript client:

```typescript
// packages/erpnext-client/src/index.ts
export class ERPNextClient {
  async createWorkOrder(data: WorkOrderInput): Promise<WorkOrder>;
  async getLocations(): Promise<Location[]>;
  async getSuppliers(): Promise<Supplier[]>;
  // ... etc
}
```

**Deliverables:**

- ERPNext API client library
- TypeScript types for all entities
- Unit tests for client methods

#### 3.2: Update Sync Service

Replace OpenProject integration with ERPNext:

```typescript
// packages/sync-service/src/erpnext-sync.ts
// Listen to ERPNext webhooks
// Sync work orders to Supabase cache tables (if needed)
```

**Deliverables:**

- sync-service uses ERPNext API
- OpenProject code removed or marked deprecated
- Tests updated

#### 3.3: Update Telegram Bot

Update bot to create ERPNext work orders:

```typescript
// Before: Create task in public.tasks
// After: Call ERPNext API to create Work Order
await erpnextClient.createWorkOrder({
  location: siteId,
  subject: taskDescription,
  assigned_to: userId,
});
```

**Deliverables:**

- Telegram bot creates ERPNext work orders
- NLP integration updated (OpenAI → ERPNext)
- Tests updated

#### 3.4: Update n8n Workflows

Update workflows to use ERPNext webhooks:

```yaml
# Before: Listen to Supabase webhooks on public.tasks
# After: Listen to ERPNext webhooks on Work Order events
trigger:
  type: webhook
  url: /webhook/erpnext/work-order-created
```

**Deliverables:**

- n8n workflows use ERPNext webhooks
- Workflow tests passing
- Documentation updated

**Success Criteria:**

- [ ] ERPNext API client library complete and tested
- [ ] sync-service migrated to ERPNext
- [ ] Telegram bot migrated to ERPNext
- [ ] n8n workflows migrated to ERPNext
- [ ] All integration tests passing
- [ ] End-to-end flow works (Telegram → ERPNext → n8n → notification)

**Rollback:** Revert code changes, restore OpenProject integration (high cost -
code already modified)

---

### Phase 4: Custom UI Development (Week 6-8)

**Goal:** Build FLRTS dashboard on ERPNext API (if custom UI desired)

**Prerequisites:**

- Phase 3 complete
- ERPNext API integrations working

**Note:** This phase optional if ERPNext web UI sufficient for MVP

**Linear Stories to Create:**

- [ ] `10N-XXX`: Design FLRTS dashboard UI
- [ ] `10N-XXX`: Build site management views
- [ ] `10N-XXX`: Build work order views
- [ ] `10N-XXX`: Build contractor management views
- [ ] `10N-XXX`: Build dashboard home/reporting

**Technical Tasks:**

#### 4.1: Dashboard Framework

Choose and setup dashboard framework:

```bash
# Options:
# - Next.js + Supabase (leverage existing stack)
# - ERPNext web UI (customize existing)
# - React + ERPNext API
```

**Deliverables:**

- Dashboard framework selected and initialized
- Authentication with ERPNext
- Basic layout and navigation

#### 4.2: Core Views

Build essential views:

- Sites list and detail pages
- Work orders list and detail pages
- Contractor list and detail pages
- User dashboard (my work orders)

**Deliverables:**

- All core views implemented
- CRUD operations working
- Responsive design

#### 4.3: Reporting & Analytics

Build custom reports (if ERPNext reports insufficient):

- Work orders by site
- Contractor performance
- Workload by user
- Completion trends

**Deliverables:**

- Custom reports and charts
- Export functionality
- Print-friendly views

**Success Criteria:**

- [ ] FLRTS dashboard deployed
- [ ] All CRUD operations working via ERPNext API
- [ ] User acceptance testing passed
- [ ] Performance acceptable (page loads < 2s)

**Rollback:** Use ERPNext native web UI instead of custom dashboard

---

### Phase 5: Production Deployment (Week 9)

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

#### 5.1: Production ERPNext Deployment

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

#### 5.2: Production Data Migration

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

#### 5.3: Traffic Cutover

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

#### 5.4: OpenProject Deprecation

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

#### 5.5: Post-Deployment Monitoring

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
