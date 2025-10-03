# Context

Per [ADR-006](docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md),
we're migrating ERPNext from self-hosted DigitalOcean/Supabase/OpenProject to
Frappe Cloud (managed MariaDB, built-in Redis, custom apps via Private Bench).

**What's Now Obsolete:**

- Tunnel/DNS setup via cloudflared
- Supabase connection pooler instructions
- OpenProject deployment guides
- Manual Docker/Redis/MariaDB management

**New Architecture:**

- Frappe Cloud Private Bench hosting ERPNext
- Custom domain via DNS-only Cloudflare (no tunnel)
- Git-based deployment for `flrts_extensions`
- Native Frappe automation (webhooks, scheduled jobs)

**MVP Strategy:** Rely on Frappe Cloud's built-in tools; add external services
(n8n, observability) only if needed later.

---

## ✅ Stage 1: Inventory - COMPLETE

**Deliverables:** Complete checklist of affected docs and issues

### Repository Audit - COMPLETE ✅

**Audit Date**: 2025-10-02  
**Method**: Full-text searches via `rg` for obsolete stack references

**Search Results Summary:**

- `OpenProject`: \~150 references across docs (60%), config (20%), code (15%),
  tests (5%)
- `Supabase`: \~250 references in code (40%), docs (35%), config (15%), tests
  (10%)
- `cloudflared`: \~80 references in config (50%), docs (40%), scripts (10%)
- `ops_network`: 9 references (Docker compose only)
- `tunnel`: \~185 references (primarily docs 70%, scripts 20%, config 10%)

**Master Checklist**: Files categorized into 7 execution categories with effort
estimates (32-40h total)

**Child Issue Created**:
[10N-234](https://linear.app/10netzero/issue/10N-234/execute-repository-refactor-for-frappe-cloud-migration) -
Execute Repository Refactor for Frappe Cloud Migration

Contains complete execution checklist with file paths, actions, and acceptance
criteria.

---

### Linear Audit - COMPLETE ✅

**Audit Date**: 2025-10-02  
**Method**: Linear issue searches for "OpenProject", "Supabase", "Tunnel",
"cloudflared"  
**Full Report**: `docs/architecture/linear-audit-frappe-cloud-migration.md`

**Summary:**

- **19 issues affected** total
- **3 require updates**:
  [10N-227](https://linear.app/10netzero/issue/10N-227/erpnext-backend-adoption)
  (epic),
  [10N-228](https://linear.app/10netzero/issue/10N-228/phase-11-deploy-erpnext-dev-instance)
  (major rewrite),
  [10N-190](https://linear.app/10netzero/issue/10N-190/module-7-low-no-rate-limiting-on-express-services)
  (minor)
- **5 require closure**:
  [10N-93](https://linear.app/10netzero/issue/10N-93/set-up-automated-backups-for-openproject),
  [10N-101](https://linear.app/10netzero/issue/10N-101/performance-optimization-openproject-p95-response-time)
  (backlog);
  [10N-88](https://linear.app/10netzero/issue/10N-88/epic-openproject-deployment-and-configuration),
  [10N-147](https://linear.app/10netzero/issue/10N-147/epic-11-deploy-openproject-via-docker-compose-on-digitalocean),
  [10N-102](https://linear.app/10netzero/issue/10N-102/qa-gate-pass-with-caveat-story-11-deploy-openproject-via-docker)
  (add notes to closed issues)
- **2 epics/projects impacted**:
  [10N-227](https://linear.app/10netzero/issue/10N-227/erpnext-backend-adoption)
  (ERPNext Backend Adoption), BigSirFLRTS project
- **Effort estimate**: 6-8 hours for Linear cleanup

**Child Issue Created**:
[10N-235](https://linear.app/10netzero/issue/10N-235/stage-4-update-linear-issues-for-frappe-cloud-migration) -
Stage 4: Update Linear Issues for Frappe Cloud Migration

Contains phased checklist for issue closures, epic updates, rewrites, and
verification.

---

## ✅ Stage 2: Draft New Canonical Docs - COMPLETE

**Deliverables:** New architecture and ops runbooks

**Branch:** `stage2/frappe-cloud-docs`

### Frappe Cloud Deployment & Operations (Complete)

- [x] **10N-236** - Create `docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md`
      (d95b515)
  - Phase 1-10 deployment workflow (provisioning → production cutover)
  - SSH access setup with certificate-based authentication
  - Custom app deployment (flrts_extensions via Git push-to-deploy)
  - Data migration procedures from self-hosted ERPNext
  - Custom domain configuration (ops.10nz.tools with Cloudflare DNS)
  - Integration setup (Telegram webhooks, n8n, OpenAI)
  - Monitoring & backup verification procedures
  - Comprehensive troubleshooting guide
  - CI/CD integration examples (GitHub Actions)
- [x] **10N-237** - Create `docs/infrastructure/frappe-cloud-operations.md`
      (334eb3b)
  - Routine maintenance (daily/weekly/monthly operations)
  - Monitoring & alerting configuration (Frappe Cloud + external)
  - Backup & recovery procedures (RTO: 4hrs, RPO: 24hrs)
  - Incident response workflow (P0-P3 severity levels, SLAs)
  - Security operations (monitoring, credential rotation, breach response)
  - Scaling & performance optimization guidance
  - Comprehensive troubleshooting guide
  - Change management and deployment procedures
- [x] **10N-238** - Update documentation map & archive OpenProject (27b9157)
  - Created `docs/setup/frappe-cloud-site.md` (access, auth, secrets)
  - Created `docs/architecture/frappe-cloud-environment.md` (component overview)
  - Moved OpenProject deployment/setup docs to `docs/archive/` with superseded
    banners
  - Updated `docs/LINEAR-DOCUMENTATION-MAP.md` for new/archived docs (dac3563)

\*\*All Stage 2 docs reference
[ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)
per acceptance criteria.

**Output:** Complete Frappe Cloud documentation suite ready for Stage 3 archival
work

---

## ✅ Stage 3: Update Documentation - COMPLETE

**Deliverables:** All docs reflect Frappe Cloud architecture

**Execution tracked in child issue**:
[10N-234](https://linear.app/10netzero/issue/10N-234/execute-repository-refactor-for-frappe-cloud-migration) -
Execute Repository Refactor

**Progress Summary (2025-10-02):**

- ✅ **Category 1 (Core Documentation)**: 12/12 items complete - All core docs
  updated or archived
- ✅ **Category 2 (Docker & Configuration)**: 9/9 items complete - All obsolete
  configs archived
- ⏭️ **Category 3 (Application Code)**: Deferred to separate sub-issue (per
  acceptance criteria)
- ✅ **Category 4 (Scripts)**: 7/7 items complete - 4 archived, 3 EVALUATE items
  deferred to Category 3 (f7d41b1)
- ✅ **Category 5 (Tests)**: 8/8 items complete - 6 updated/deleted, 1 EVALUATE
  deferred, QA evidence archived (f7d41b1)
- ✅ **Category 6 (Audit Files)**: 5/5 items complete - All audit results
  archived to docs/archive/audits/ (f7d41b1)
- ✅ **Category 7 (Migration Docs)**: Complete - Added context banners to
  migration workflow & schema research docs (046c90a)

**Archives Established:**

- `docs/archive/openproject/` - OpenProject deployment files + configs + QA
  evidence (story-1.1)
- `docs/archive/supabase/` - Supabase+OpenProject integration + QA evidence
  (story-1.4)
- `docs/archive/erpnext-self-hosted/` - Self-hosted ERPNext (planned but not
  deployed)
- `docs/archive/tunnel/` - Cloudflare Tunnel configurations
- `docs/archive/scripts/` - Obsolete automation scripts (f7d41b1)
- `docs/archive/audits/` - Pre-migration infrastructure audits (f7d41b1)

All archive directories include [ARCHIVE-README.md](http://ARCHIVE-README.md)
explaining deprecation rationale and replacement approach.

**Commits Summary:**

- Batch 1 (Categories 1-2): 85b37db, e53c108, 86e3ed5, b3cbc79, 08314b5,
  9dfd76c, f4189c6, 8122cc0, 7941850, c622ad9, 922aca5, e9eb79e, 6fb8169,
  0095753, 8d8338f, c842d51
- Batch 3 (Categories 4-6): f7d41b1
- Batch 4 (Category 7): 046c90a

### Update Existing Docs

- [x] Process Stage 1 checklist - Core docs (85b37db, e53c108, 86e3ed5, b3cbc79,
      08314b5, 9dfd76c, f4189c6, 7941850)
- [x] Replace Supabase connection docs with Frappe Cloud DB access (multiple
      commits in Batch 1)
- [x] Replace OpenProject deployment with Frappe Cloud provisioning steps
      (f4189c6)
- [x] Replace tunnel setup with DNS-only custom domain config (7941850)
- [x] Update [CLAUDE.md](http://CLAUDE.md) project instructions (85b37db,
      e53c108)
- [x] Add "superseded by ADR-006" notes to migration docs (046c90a)

### Archive Obsolete Content

- [x] Move OpenProject-specific docs to `docs/archive/openproject/` (8122cc0,
      6fb8169, 8d8338f, c842d51)
- [x] Move Supabase-specific docs to `docs/archive/supabase/` (922aca5)
- [x] Move self-hosted ERPNext to `docs/archive/erpnext-self-hosted/` (e9eb79e)
- [x] Move tunnel setup guides to `docs/archive/tunnel/` (8122cc0, 0095753)
- [x] Move obsolete scripts to `docs/archive/scripts/` (f7d41b1)
- [x] Move QA evidence to respective archives (f7d41b1)
- [x] Move audit results to `docs/archive/audits/` (f7d41b1)
- [x] Create archive READMEs explaining what's obsolete and why (all archives
      have [ARCHIVE-README.md](http://ARCHIVE-README.md))
- [x] Update main docs index to point to new canonical sources (7941850,
      dac3563)

### Add Forward-Looking Notes

- [x] Document deferred decisions (Category 3 app code deferred to sub-issue)
- [x] Mark areas requiring follow-up research (EVALUATE items flagged in
      Categories 4-5)
- [ ] Add placeholders for future R2 integration, custom workflows

**Next Steps:** Create Category 3 sub-issue for app code refactoring, proceed to
Stage 4 (Linear updates)

**Output:** Clean documentation tree with clear migration path and archived
history

---

## Stage 4: Reorient Linear

**Deliverables:** Linear backlog reflects Frappe Cloud architecture

**Execution tracked in child issue**:
[10N-235](https://linear.app/10netzero/issue/10N-235/stage-4-update-linear-issues-for-frappe-cloud-migration) -
Update Linear Issues

### Update Active Issues (3 issues, 3-5h effort)

- [ ] Edit
      [10N-227](https://linear.app/10netzero/issue/10N-227/erpnext-backend-adoption)
      (epic) to reflect Frappe Cloud requirements
- [ ] Rewrite
      [10N-228](https://linear.app/10netzero/issue/10N-228/phase-11-deploy-erpnext-dev-instance)
      (major effort - remove Docker/Supabase, add Frappe Cloud)
- [ ] Minor update to
      [10N-190](https://linear.app/10netzero/issue/10N-190/module-7-low-no-rate-limiting-on-express-services)
      (DDoS mitigation references)

### Close Obsolete Issues (5 issues, 30min effort)

- [ ] Close
      [10N-93](https://linear.app/10netzero/issue/10N-93/set-up-automated-backups-for-openproject)
      (OpenProject backups) - Frappe Cloud provides backups
- [ ] Close
      [10N-101](https://linear.app/10netzero/issue/10N-101/performance-optimization-openproject-p95-response-time)
      (OpenProject performance) - no longer relevant
- [ ] Add context notes to
      [10N-88](https://linear.app/10netzero/issue/10N-88/epic-openproject-deployment-and-configuration),
      [10N-147](https://linear.app/10netzero/issue/10N-147/epic-11-deploy-openproject-via-docker-compose-on-digitalocean),
      [10N-102](https://linear.app/10netzero/issue/10N-102/qa-gate-pass-with-caveat-story-11-deploy-openproject-via-docker)
      (already closed)
- [ ] Reference ADR-006 in all closure comments

### Create New Issues

- [ ] "Provision Frappe Cloud Private Bench"
- [ ] "Configure custom domain ops.10nz.tools on Frappe Cloud"
- [ ] "Deploy flrts_extensions via Git workflow"
- [ ] "Migrate data from DigitalOcean bench to Frappe Cloud"
- [ ] "Update Telegram webhooks to point to Frappe Cloud endpoint"
- [ ] "Verify integrations (Telegram, external APIs) on new stack"
- [ ] "Retire legacy infrastructure (Supabase, DigitalOcean, tunnel)"

### Epic Communication

- [ ] Post summary on ERPNext migration epic:
  - Link to ADR-006
  - Explain rationale (MariaDB compatibility, reduced ops overhead)
  - Impact on timeline (likely accelerates MVP)
  - New deliverables list
  - Updated architecture diagram

**Output:** Linear backlog accurately reflects Frappe Cloud migration path with
clear tasks

---

## Stage 5: Verification & Communication

**Deliverables:** Confirmed migration completion, team awareness

### Technical Verification

- [ ] Re-run all `rg` searches from Stage 1
- [ ] Verify old stack terms only appear in:
  - `docs/archive/` directories
  - Historical context sections (clearly marked)
  - ADR-006 and [MIGRATION-NOTES.md](http://MIGRATION-NOTES.md)
- [ ] Check all doc links work (no 404s)
- [ ] Verify navigation flows logically from main README

### Team Communication

- [ ] Update main README:
  - Add notice about architecture change
  - Link to ADR-006 and new deployment docs
  - Remove obsolete "Production Services" section
- [ ] Post team announcement:
  - Summarize stack change (self-hosted → Frappe Cloud)
  - Link to updated documentation
  - Highlight developer impact (no more Docker/tunnel debugging)
  - New access patterns (Frappe Cloud UI, SSH to Private Bench)

### Final Checks

- [ ] All acceptance criteria met ✓
- [ ] No broken doc links
- [ ] New Linear issues labeled and prioritized
- [ ] Archive directories have explanatory READMEs
- [ ] [CLAUDE.md](http://CLAUDE.md) updated with new production context

**Output:** Complete migration with verified docs and informed team

---

## Acceptance Criteria

✅ **All documentation points to Frappe Cloud workflows**

- ✅ No active docs reference obsolete Supabase/OpenProject/tunnel setup except
  in archive (Categories 1-2, 4-7 complete)
- ✅ New architecture docs cover deployment, operations, automation on Frappe
  Cloud (Stage 2 complete)
- ✅ Historical context preserved with clear "superseded by ADR-006" markers
  (Category 7 complete - 046c90a)

✅ **Archive structure established**

- ✅ Old infra docs moved to `docs/archive/` with explanatory README (6 archive
  directories created)
- ✅ Archive READMEs explain what changed and why (all archives include
  [ARCHIVE-README.md](http://ARCHIVE-README.md))
- ✅ Deferred decisions (Category 3 app code, n8n, observability) documented for
  future
- ✅ No ambiguity about current vs. historical stack

⏳ **Linear backlog reflects new architecture** (Stage 4 pending)

- Active issues updated with Frappe Cloud requirements
- Obsolete issues closed with ADR-006 reference
- New provisioning/migration issues created and prioritized
- Epic comment explains pivot with links to ADR and new docs

⏳ **Verification complete** (Stage 5 pending)

- Search results show old stack terms only in historical/archive context
- Team communication posted with links to ADR and new docs
- All doc links functional
- ✅ [CLAUDE.md](http://CLAUDE.md) reflects Frappe Cloud production environment
  (e53c108)

---

## Notes

**Priority:** High - blocks accurate development planning and MVP delivery  
**Effort:** Medium - systematic audit and update across \~20-30 files  
**Dependencies:** ADR-006 already documents decision; no blockers

**Related Work:**

- Implementation tasks in Stage 4 "Create New Issues" will follow this
  refactoring
- Data migration process detailed in ADR-006 section 8

**Key Documents Created:**

- Repository audit checklist: tracked in
  [10N-234](https://linear.app/10netzero/issue/10N-234/execute-repository-refactor-for-frappe-cloud-migration)
- Linear audit report:
  `docs/architecture/linear-audit-frappe-cloud-migration.md`

This refactoring ensures the team works from accurate documentation and avoids
wasting time on obsolete infrastructure approaches.
