# Linear Audit: Frappe Cloud Migration Impact

**Date**: 2025-10-02 **Audit Scope**: Identify Linear issues affected by ADR-006
Frappe Cloud migration **Related**:
[ADR-006](adr/ADR-006-erpnext-frappe-cloud-migration.md) |
[10N-233](https://linear.app/10netzero/issue/10N-233)

---

## Executive Summary

**Total Issues Affected**: 19 **Issues Requiring Updates**: 3 **Issues Requiring
Closure**: 14 **Already Closed/Done**: 2 **Epics/Projects Affected**: 2

**Search Methodology**: Searched Linear for "OpenProject", "Supabase", "Tunnel",
"cloudflared" in issue titles, descriptions, and comments.

---

## 1. Issues Requiring Updates (3)

### 10N-228: Phase 1.1: Deploy ERPNext dev instance

- **Status**: Backlog
- **Parent**: 10N-227 (ERPNext Backend Adoption)
- **Impact**: Heavy Supabase/tunnel references throughout
- **Action Required**:
  - Remove all Supabase connection instructions
  - Replace Docker/tunnel deployment with Frappe Cloud provisioning steps
  - Update from "dev instance deployment" to "Frappe Cloud site setup"
  - Update database connection section to reference Frappe Cloud managed MariaDB
  - Remove cloudflared tunnel configuration
- **Priority**: High (blocks ERPNext adoption)
- **Effort**: 2-3 hours (major rewrite)

### 10N-227: ERPNext Backend Adoption (EPIC)

- **Status**: Backlog
- **Impact**: References old stack throughout (Supabase, Docker, OpenProject
  replacement)
- **Action Required**:
  - Update architecture diagrams to show Frappe Cloud
  - Remove Supabase compatibility references (now MariaDB only)
  - Update deployment strategy from Docker to Frappe Cloud Private Bench
  - Remove "OpenProject replacement" framing (now infrastructure migration)
  - Update ADR-006 link (currently points to old ADR)
  - Add link to new ADR-006-erpnext-frappe-cloud-migration.md
- **Priority**: Urgent (parent epic)
- **Effort**: 1-2 hours

### 10N-190: [Module 7] LOW — No rate limiting on Express services

- **Status**: Backlog
- **Impact**: Minor - references "Cloudflare Tunnel handles DDoS" in research
  findings
- **Action Required**:
  - Update DDoS mitigation section to reference Cloudflare DNS instead of tunnel
  - Clarify that Frappe Cloud provides DDoS protection, not tunnel
- **Priority**: Low
- **Effort**: 15 minutes

---

## 2. Issues Requiring Closure (14)

### OpenProject-Specific Issues

#### 10N-88: [EPIC] OpenProject Deployment & Configuration

- **Status**: Done (already closed)
- **Action**: Add closure comment referencing ADR-006 and 10N-227 (ERPNext
  adoption)
- **Closure Note Template**:

  ```
  Closing per ADR-006 (Frappe Cloud migration). OpenProject deployment superseded by ERPNext on Frappe Cloud Private Bench. See 10N-227 for ERPNext adoption epic.
  ```

#### 10N-93: Set up automated backups for OpenProject

- **Status**: Backlog
- **Parent**: 10N-88
- **Action**: Close with reference to Frappe Cloud's built-in backups
- **Closure Note**:

  ```
  Closing per ADR-006. Backups now handled by Frappe Cloud's managed backup system (PITR, automated daily backups). No manual configuration needed.
  ```

#### 10N-147: Epic 1.1: Deploy OpenProject via Docker Compose on DigitalOcean

- **Status**: Done (already closed)
- **Action**: Verify closure comment references migration

#### 10N-102: QA Gate PASS_WITH_CAVEAT: Story 1.1 - Deploy OpenProject via Docker Compose

- **Status**: Done (already closed)
- **Action**: Add note that performance issues are moot (OpenProject retired)

#### 10N-101: Performance Optimization: OpenProject P95 Response Time

- **Status**: Backlog
- **Action**: Close (no longer relevant)
- **Closure Note**:

  ```
  Closing per ADR-006. OpenProject retired in favor of ERPNext on Frappe Cloud. Performance optimization no longer applicable.
  ```

#### 10N-152: Epic 1.7: Monitoring and Observability

- **Status**: Done
- **Impact**: References OpenProject monitoring
- **Action**: Verify focuses on infrastructure monitoring (can stay closed)

### Infrastructure Issues

#### 10N-166: [Module 1] LOW — Open ports on all interfaces in local/dev stacks

- **Status**: Done (already closed)
- **Action**: Verify resolution is still valid for remaining services
- **Note**: Port binding fixes apply to remaining services, keep closed

### Legacy/Unrelated Issues (No Action Needed)

The following issues mention "Tunnel" or "Cloudflare" but are NOT related to
infrastructure:

- **10N-11**: [PROJECT OVERVIEW] FLRTS (mentions tunnel in legacy context)
- **10N-12**: [AGENT-CHAIN] Secrets-Safe Ops Automation (mentions webhook setup,
  not infra tunnel)
- **10N-66**: Project Links & Ownership (generic project template)
- **10N-62**: Release Checklist: v1 Launch (different project - speech coaching
  website)
- **10N-10, 10N-9, 10N-7**: FLRTS Telegram bot issues (separate from ERPNext
  infra)

**Action**: No changes needed for these issues.

---

## 3. Epic/Project Impact Analysis

### 10N-227: ERPNext Backend Adoption (Epic)

**Status**: Backlog **Project**: BigSirFLRTS **Impact**: CRITICAL - Parent epic
for ERPNext migration

**Current State**:

- References OpenProject replacement narrative
- Documents Supabase PostgreSQL compatibility
- Describes Docker deployment strategy
- Links to old ADR-006 (ERPNext Backend Adoption)

**Required Updates**:

1. **Reframe Purpose**:
   - OLD: "Replace OpenProject with ERPNext"
   - NEW: "Adopt ERPNext on Frappe Cloud for FSM operations"

2. **Update Architecture References**:
   - Remove Supabase compatibility mentions
   - Replace Docker deployment with Frappe Cloud Private Bench
   - Update database from "PostgreSQL/Supabase" to "Managed MariaDB"
   - Remove tunnel/networking configuration

3. **Link to New ADR**:
   - Add:
     [ADR-006: Frappe Cloud Migration](adr/ADR-006-erpnext-frappe-cloud-migration.md)
   - Clarify old ADR-006 covered platform selection, new one covers hosting

4. **Update Success Criteria**:
   - Remove "Supabase integration verified"
   - Remove "Docker containers healthy"
   - Add "Frappe Cloud site operational"
   - Add "Custom domain configured (ops.10nz.tools)"
   - Add "Git deployment workflow verified"

5. **Update Child Issues**:
   - 10N-228 (Phase 1.1) requires major rewrite (see above)

**Estimated Effort**: 2-3 hours (epic update + child issue rewrites)

---

### BigSirFLRTS Project (9d089be4-a284-4879-9b67-f472abecf998)

**Status**: Backlog **Lead**: Colin Aulds

**Project Description Impact**: MODERATE

**Current Description Excerpt**:

```markdown
### Production Services

- **OpenProject**: https://ops.10nz.tools
  - SSH: ssh root@165.227.216.172
  - Admin: admin / [password]
  - Database: Supabase PostgreSQL (thnwlykidzhrsagyjncc)
  - Storage: Cloudflare R2 (10netzero-docs)
```

**Required Updates**:

1. Replace "OpenProject" section with "ERPNext" section:

   ```markdown
   ### Production Services

   - **ERPNext**: https://ops.10nz.tools
     - Hosted on: Frappe Cloud Private Bench
     - Database: Managed MariaDB (Frappe Cloud)
     - Custom App: flrts_extensions (Git-based deployment)
     - Storage: Native Frappe storage (R2 integration optional)
   ```

2. Update Tech Stack:
   - Remove: Supabase PostgreSQL
   - Remove: Docker on DigitalOcean (for ERPNext)
   - Add: Frappe Cloud Private Bench
   - Add: Managed MariaDB

3. Update Known Issues:
   - Remove: "OpenProject data in `public` schema instead of `openproject`"
   - Add: "Migration from self-hosted ERPNext to Frappe Cloud in progress (see
     ADR-006)"

4. Update Quick Links:
   - Keep OpenProject link with deprecation notice until retired
   - Add Frappe Cloud dashboard link when available

**Estimated Effort**: 1 hour

---

## 4. Summary Tables

### Issues to Update

| Issue ID | Title                                  | Priority | Effort | Assignee |
| -------- | -------------------------------------- | -------- | ------ | -------- |
| 10N-227  | ERPNext Backend Adoption               | Urgent   | 2h     | TBD      |
| 10N-228  | Phase 1.1: Deploy ERPNext dev instance | High     | 3h     | TBD      |
| 10N-190  | [Module 7] LOW — No rate limiting      | Low      | 15m    | TBD      |

**Total Effort**: ~5-6 hours

### Issues to Close

| Issue ID | Title                                     | Status  | Closure Reason                |
| -------- | ----------------------------------------- | ------- | ----------------------------- |
| 10N-88   | [EPIC] OpenProject Deployment             | Done    | OpenProject retired (ADR-006) |
| 10N-93   | Set up automated backups for OpenProject  | Backlog | Frappe Cloud provides backups |
| 10N-101  | Performance Optimization: OpenProject P95 | Backlog | OpenProject retired           |
| 10N-147  | Deploy OpenProject Docker Compose         | Done    | Historical - verify closure   |
| 10N-102  | QA Gate: OpenProject Deployment           | Done    | Historical - add note         |

**Total Issues to Close**: 5 (2 already done, 3 in backlog)

---

## 5. Epics/Projects to Update

| Type    | ID          | Name                     | Impact   | Effort |
| ------- | ----------- | ------------------------ | -------- | ------ |
| Epic    | 10N-227     | ERPNext Backend Adoption | Critical | 2h     |
| Project | 9d089be4... | BigSirFLRTS              | Moderate | 1h     |

**Total Effort**: ~3 hours

---

## 6. Recommended Execution Order

### Phase 1: Immediate Closures (30 minutes)

1. Close 10N-93, 10N-101 with ADR-006 reference
2. Add closure notes to 10N-88, 10N-147, 10N-102

### Phase 2: Epic Updates (2-3 hours)

1. Update 10N-227 epic description
2. Update BigSirFLRTS project description

### Phase 3: Issue Rewrites (3-4 hours)

1. Rewrite 10N-228 (major effort)
2. Quick update to 10N-190

### Phase 4: Verification (30 minutes)

1. Re-run Linear searches to confirm cleanup
2. Verify all links to ADR-006 are correct
3. Update 10N-233 checklist

**Total Estimated Effort**: 6-8 hours

---

## 7. Acceptance Criteria

- [ ] All OpenProject-specific issues closed or updated
- [ ] 10N-227 epic accurately reflects Frappe Cloud architecture
- [ ] BigSirFLRTS project description references Frappe Cloud, not self-hosted
- [ ] No active issues reference Supabase for ERPNext (historical references OK
      in archives)
- [ ] No active issues reference cloudflared tunnel for ERPNext
- [ ] All closure comments reference ADR-006
- [ ] Re-running Linear searches for "OpenProject", "Supabase", "Tunnel" returns
      only archived/historical issues

---

## 8. Notes

**Migration Context**:

- This audit supports Stage 1 of 10N-233 (Refactor Docs & Tickets for Frappe
  Cloud Migration)
- Repository file audit is separate (Stage 1 also includes `rg` searches of
  codebase)
- Both audits will feed into Stage 3 (Update Documentation) and Stage 4
  (Reorient Linear)

**Related Work**:

- See `docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md` for
  architectural decision context
- See `10N-233` for full 5-stage refactoring plan

**Search Limitations**:

- Linear query searches are limited by token size
- Some issues may have been returned truncated
- Full issue details retrieved for critical issues (10N-228, 10N-227, 10N-88,
  etc.)
- No open issues found with "Supabase" or "OpenProject" in simple query search
  (only backlog/done)

---

## Appendix: Search Results Summary

### "OpenProject" Search

- **Total Results**: 6 issues found (includes "Tunnel" search overlap)
- **Statuses**: 3 Done, 3 Backlog
- **Key Issues**: 10N-88 (epic), 10N-147, 10N-152, 10N-102, 10N-93, 10N-101

### "Supabase" Search

- **Total Results**: 0 open issues in simple query
- **Deep Search** (via full issue retrieval): 10N-228, 10N-227 have extensive
  Supabase references

### "Tunnel" Search

- **Total Results**: 6 issues found
- **Relevant**: 10N-228 (cloudflared), 10N-190 (DDoS context)
- **Irrelevant**: 10N-11, 10N-12 (different context - Telegram webhooks, not
  infra)

### "cloudflared" Search

- **Total Results**: 6 issues found (overlap with "Tunnel")
- **Relevant**: Same as "Tunnel" search

### Projects Searched

- BigSirFLRTS (9d089be4-a284-4879-9b67-f472abecf998)
- bmad-linear-CLI (fc9e5dbc-c645-48e2-bcab-1b8189a74aba) - not affected

---

**End of Audit**
