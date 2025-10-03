# Objective

Replace/retire all OpenProject, Supabase connection pooler, and Cloudflare
Tunnel references in the repository following the Frappe Cloud migration
decision (ADR-006).

**Parent Issue:**
[10N-233](https://linear.app/10netzero/issue/10N-233/refactor-docs-and-tickets-for-frappe-cloud-migration) -
Refactor Docs & Tickets for Frappe Cloud Migration  
**Context:** [ADR-006](docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)  
**Audit
Report:** Stage 1 inventory in
[10N-233](https://linear.app/10netzero/issue/10N-233/refactor-docs-and-tickets-for-frappe-cloud-migration)

---

## Implementation Strategy

### Linear-First Workflow

1. **Work from this checklist** - Each item specifies file path + action
2. **Update as you go** - Add commit hash to checked items (e.g.,
   `[x] file.md (85b37db)`)
3. **Reference docs** - Link to ADR-006 and migration notes in commits
4. **Archive pattern** - Move obsolete files to `docs/archive/{category}/` with
   README explaining why

### Documentation Guidelines

**Update Pattern:**

- Add `> ⚠️ **SUPERSEDED BY ADR-006** - Frappe Cloud Migration` banner to
  historical docs
- Replace architecture diagrams with Frappe Cloud equivalents
- Update all `ops.10nz.tools` references to point to Frappe Cloud hosting

**Archive Pattern:**

- Create category directories: `docs/archive/{openproject|supabase|tunnel}/`
- Add `ARCHIVE-README.md` in each category explaining what was deprecated and
  why
- Move files preserving directory structure

---

## Checklist

### 📋 Category 1: Core Documentation (CRITICAL) - 8-10h

**Action:** Update or Archive

- [x] `CLAUDE.md` - Remove OpenProject SSH, Supabase DB project ID, add Frappe
      Cloud access info (85b37db)
- [x] `CLAUDE.md` - Update archive path reference to docs/archive/ (e53c108)
- [x] `CONTRIBUTING.md` - Update ADR reference to ADR-006, remove Supabase-only
      DB constraint (86e3ed5)
- [x] `docs/prd/README.md` - Replace "OpenProject Integration" with Frappe Cloud
      backend strategy (b3cbc79)
- [x] `docs/prd/prd.md` - Rewrite architecture section, replace OpenProject API
      with ERPNext REST API (08314b5, 9dfd76c)
- [x] `docs/prd/Telegram-Bot-UX-Flows.md` - Update API interaction examples
      (9dfd76c)
- [x] `docs/deployment/OPENPROJECT_DEPLOYMENT.md` - N/A (never existed; Stage 2
      created FRAPPE_CLOUD_DEPLOYMENT.md)
- [x] `infrastructure/README.md` - Remove OpenProject deployment, add Frappe
      Cloud provisioning overview (f4189c6)
- [x] `infrastructure/digitalocean/DEPLOYMENT_GUIDE.md` - **ARCHIVED** to
      docs/archive/openproject/ (8122cc0)
- [x] `infrastructure/digitalocean/MONITORING_DEPLOYMENT_GUIDE.md` -
      **ARCHIVED** to docs/archive/openproject/ (8122cc0)
- [x] `infrastructure/digitalocean/CLOUDFLARE-TUNNEL-SETUP.md` - **ARCHIVED** to
      docs/archive/tunnel/ (8122cc0)
- [x] `docs/architecture/system-connections.md` - Update connection diagram to
      show Frappe Cloud architecture (7941850)

---

### 🐳 Category 2: Docker & Configuration (CRITICAL) - 3-4h

**Action:** Remove obsolete services, update configs

**Environment File Strategy:**

- `.env.digitalocean` does not exist in repository (outdated checklist
  reference)
- Current env files:
  - Root `.env` (gitignored, contains active credentials)
  - `infrastructure/digitalocean/.env.example` - **ARCHIVED** to
    docs/archive/openproject/ (6fb8169)
  - `infrastructure/digitalocean/.env.erpnext.example` (ERPNext-specific
    template with Supabase DB refs - retained for legacy reference)
- [x] `infrastructure/docker/docker-compose.yml` - N/A (n8n queue mode config,
      no cloudflared present)
- [x] `infrastructure/digitalocean/docker-compose.prod.yml` - Remove
      `cloudflared` service (c622ad9)
- [x] `infrastructure/digitalocean/docker-compose.supabase.yml` - **ARCHIVED**
      to docs/archive/supabase/ (922aca5)
- [x] `infrastructure/digitalocean/docker-compose.erpnext.yml` - **ARCHIVED** to
      docs/archive/erpnext-self-hosted/ (e9eb79e)
- [x] `infrastructure/digitalocean/ERPNEXT-DEPLOYMENT-PLAN.md` - **ARCHIVED** to
      docs/archive/erpnext-self-hosted/ (e9eb79e)
- [x] `infrastructure/digitalocean/.env.example` - **ARCHIVED** to
      docs/archive/openproject/ (6fb8169)
- [x] `infrastructure/digitalocean/cloudflared-config-secure.yml` - **ARCHIVED**
      to docs/archive/tunnel/ (0095753)
- [x] `infrastructure/digitalocean/tunnel-config.yml` - **ARCHIVED** to
      docs/archive/tunnel/ (0095753)
- [x] `wrangler.toml` - **ARCHIVED** to docs/archive/openproject/ (8d8338f,
      c842d51)

**ops_network Note:** Custom Docker bridge network `ops_network` was defined in
archived docker-compose.erpnext.yml. No longer needed after archival; no active
references remain.

---

### 💻 Category 3: Application Code (MEDIUM) - 12-15h

**Action:** Refactor or feature-flag (defer to separate story if too complex)

- [ ] `packages/sync-service/src/index.ts` - **DEFER** - Replace OpenProject
      client with ERPNext client (major refactor, lines 25-634)
- [ ] `packages/nlp-service/src/index.ts` - **EVALUATE** - Determine if Supabase
      logging (lines 63-76) should remain for analytics
- [ ] `packages/nlp-service/src/schemas.ts` - Remove `customFields` OpenProject
      reference (line 23)
- [ ] `supabase/functions/telegram-webhook/index.ts` - **EVALUATE** - Review
      Supabase logging pattern (lines 70-73, 188-201)
- [ ] `supabase/functions/parse-request/index.ts` - **EVALUATE** - Review
      Supabase JWT auth (lines 39-51)

**Note:** If code changes are extensive, create separate child issue "Refactor
Application Code for ERPNext Backend"

---

### 🔧 Category 4: Scripts (LOW) - 2-3h

**Action:** Archive to `docs/archive/scripts/`

- [x] `infrastructure/cloudflare/setup-tunnel.sh` - **ARCHIVED** to
      docs/archive/scripts/ (f7d41b1)
- [x] `infrastructure/cloudflare/setup-cloudflare.sh` - **ARCHIVED** to
      docs/archive/scripts/ (f7d41b1)
- [x] `infrastructure/digitalocean/fix_admin_password.rb` - **ARCHIVED** to
      docs/archive/scripts/ (f7d41b1)
- [ ] `supabase/deploy-telegram-webhook.sh` - **EVALUATE** - Retention depends
      on Category 3 decision (Supabase Edge Functions)
- [ ] `scripts/validate-test-env.sh` - **EVALUATE** - Supabase checks (lines
      76-134) deferred to Category 3
- [ ] `scripts/security-review.sh` - **EVALUATE** - Supabase service_role key
      check (lines 364-374) deferred to Category 3
- [x] `infrastructure/scripts/deploy-monitoring-remote.sh` - **ARCHIVED** to
      docs/archive/scripts/ (f7d41b1)

---

### 🧪 Category 5: Tests (LOW) - 4-5h

**Action:** Update or delete

- [x] `tests/e2e/executive-workflows.test.ts` - Updated title assertions (lines
      21, 67): "FLRTS on Frappe Cloud" (f7d41b1)
- [x] `tests/integration/supabase-webhook-n8n.test.ts` - **DELETED**
      (Supabase→n8n→OpenProject flow obsolete) (f7d41b1)
- [ ] `tests/integration/services/sync-service-supabase.test.ts` -
      **EVALUATE** - Deferred to Category 3 (Supabase analytics decision)
- [x] `tests/integration/openproject-operational-tests.sh` - **DELETED**
      (f7d41b1)
- [x] `tests/mvp-smoke-test.sh` - Updated OpenProject references (lines 38, 44):
      "FLRTS on Frappe Cloud" (f7d41b1)
- [x] `tests/README.md` - Updated Story 1.1 description (line 207): "Deploy
      ERPNext on Frappe Cloud" (f7d41b1)
- [x] `infrastructure/qa-evidence/story-1.1/` - **ARCHIVED** to
      docs/archive/openproject/qa-evidence-story-1.1/ (f7d41b1)
- [x] `infrastructure/qa-evidence/story-1.4/` - **ARCHIVED** to
      docs/archive/supabase/qa-evidence-story-1.4/ (f7d41b1)

---

### 📊 Category 6: Audit/Reference Files (ARCHIVE) - 1h

**Action:** Move to `docs/archive/audits/`

- [x] `audit-results/openproject-audit.json` - **ARCHIVED** to
      docs/archive/audits/ (f7d41b1)
- [x] `audit-results/supabase-audit.json` - **ARCHIVED** to docs/archive/audits/
      (f7d41b1)
- [x] `audit-results/infrastructure-audit.json` - **ARCHIVED** to
      docs/archive/audits/ (f7d41b1)
- [x] `audit-results/infrastructure-connections.md` - **ARCHIVED** to
      docs/archive/audits/ (f7d41b1)
- [x] All audit-results/\* files archived; empty directory removed (f7d41b1)

---

### 📝 Category 7: Migration Docs (KEEP WITH NOTES) - 2h

**Action:** Add "superseded by ADR-006" banners

- [x] `docs/migration/data-migration-strategy.md` - Added superseded notice at
      top (23bb9ea)
- [x] `docs/migration/schema-mapping.md` - Added superseded notice at top
      (23bb9ea)
- [x] `docs/prompts/module-migration-prompt.md` - Updated to "ERPNext Module
      Development" template; removed OpenProject→ERPNext migration language
      (23bb9ea)
- [x] `docs/erpnext/architecture/ADR-006-erpnext-backend-adoption.md` - **KEPT
      AS-IS** (historical decision record)
- [x] `docs/erpnext/architecture/erpnext-migration-workflow.md` - **KEPT AS-IS**
      (workflow reference)
- [x] `docs/erpnext/codebase-audit-report.md` - **KEPT AS-IS** (audit reference)

---

## Archive Directory Structure

Created structure:

```
docs/archive/
├── openproject/
│   ├── ARCHIVE-README.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── MONITORING_DEPLOYMENT_GUIDE.md
│   ├── .env.example
│   ├── wrangler.toml
│   └── qa-evidence-story-1.1/ (17 files)
├── erpnext-self-hosted/
│   ├── ARCHIVE-README.md
│   ├── docker-compose.erpnext.yml
│   └── ERPNEXT-DEPLOYMENT-PLAN.md
├── supabase/
│   ├── ARCHIVE-README.md
│   ├── docker-compose.supabase.yml
│   └── qa-evidence-story-1.4/ (2 files)
├── tunnel/
│   ├── ARCHIVE-README.md
│   ├── CLOUDFLARE-TUNNEL-SETUP.md
│   ├── cloudflared-config-secure.yml
│   └── tunnel-config.yml
├── scripts/
│   ├── ARCHIVE-README.md
│   ├── setup-tunnel.sh
│   ├── setup-cloudflare.sh
│   ├── fix_admin_password.rb
│   └── deploy-monitoring-remote.sh
└── audits/
    ├── ARCHIVE-README.md
    ├── openproject-audit.json
    ├── supabase-audit.json
    ├── infrastructure-audit.json
    ├── infrastructure-connections.md
    ├── frontend-api-audit.json
    ├── n8n-audit.json
    ├── nlp-audit.json
    └── telegram-audit.json
```

Each `ARCHIVE-README.md` contains:

- What was archived
- Why it was deprecated (link to ADR-006)
- Date of archival
- Replacement approach

---

## Acceptance Criteria

- [ ] All checklist items completed with commit references
- [ ] No active references to OpenProject/Supabase/Tunnel except in:
  - `docs/archive/` directories
  - ADR-006 and [MIGRATION-NOTES.md](http://MIGRATION-NOTES.md)
  - Code comments marked as "historical context"
- [ ] All archive directories have explanatory READMEs
- [ ] `CLAUDE.md` updated with Frappe Cloud production context
- [ ] Documentation map updated (if exists) to reflect new structure
- [ ] All broken doc links fixed
- [ ] Stage 1 completion noted in parent issue
      [10N-233](https://linear.app/10netzero/issue/10N-233/refactor-docs-and-tickets-for-frappe-cloud-migration)

---

## Related Issues

- **Parent:**
  [10N-233](https://linear.app/10netzero/issue/10N-233/refactor-docs-and-tickets-for-frappe-cloud-migration) -
  Refactor Docs & Tickets for Frappe Cloud Migration
- **Follows:** ADR-006 - ERPNext Hosting Migration to Frappe Cloud

---

## Deferred Work

If application code refactoring (Category 3) proves too extensive, create
separate issue: **"Refactor Application Code for ERPNext Backend"** covering:

- `sync-service` OpenProject→ERPNext client swap
- Supabase logging pattern decisions
- Edge Function auth pattern updates
