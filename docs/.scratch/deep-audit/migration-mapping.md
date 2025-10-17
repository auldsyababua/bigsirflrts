# Repository Reorganization Migration Mapping

**Date:** 2025-10-16
**Source:** forensic-audit-report.md
**Purpose:** Full traceability for repository cleanup
**Repository:** BigSirFLRTS (/Users/colinaulds/Desktop/bigsirflrts)
**Branch:** chore/directory-cleanup

---

## Migration Summary

**Total Migrations:** 45 items
- Archives: 25 items
- Deletions: 2 items
- Consolidations: 8 items
- Removals: 1 item (external repo)
- Reorganizations: 4 items
- Evaluate/Decisions Required: 5 items

**Root Directory Impact:**
- Current: 23 items (13 directories, 10 files)
- After cleanup: ~17 items (~26% reduction)
- Target: 8-10 directories, 8 files

---

## Archives (Moving to docs/archive/)

### Supabase/Database Archives

| Breadcrumb ID | Original Path | New Path | Reason | Last Active | Size |
|---------------|---------------|----------|--------|-------------|------|
| ARCH-001 | database/ | docs/archive/supabase-migrations/ | Entire directory obsolete - Supabase deprecated per ADR-006 | 2025-09-30 | ~145KB |
| ARCH-001a | database/migrations/001_initial_schema.sql | docs/archive/supabase-migrations/migrations/001_initial_schema.sql | Part of database/ archive | 2025-09-14 | N/A |
| ARCH-001b | database/migrations/002_openproject_schema.sql | docs/archive/supabase-migrations/migrations/002_openproject_schema.sql | Part of database/ archive | 2025-09-30 | N/A |
| ARCH-001c | database/migrations/003_flrts_features.sql | docs/archive/supabase-migrations/migrations/003_flrts_features.sql | Part of database/ archive | 2025-09-25 | N/A |
| ARCH-001d | database/migrations/004_monitoring_views.sql | docs/archive/supabase-migrations/migrations/004_monitoring_views.sql | Part of database/ archive | 2025-09-25 | N/A |
| ARCH-001e | database/seeds/development.sql | docs/archive/supabase-migrations/seeds/development.sql | Part of database/ archive | 2025-09-14 | N/A |
| ARCH-001f | database/seeds/test.sql | docs/archive/supabase-migrations/seeds/test.sql | Part of database/ archive | 2025-09-14 | N/A |
| ARCH-001g | database/README.md | docs/archive/supabase-migrations/README.md | Part of database/ archive | 2025-09-17 | N/A |

### Linear Migration Scripts

| Breadcrumb ID | Original Path | New Path | Reason | Last Active | Size |
|---------------|---------------|----------|--------|-------------|------|
| ARCH-002 | scripts/migrate-to-linear.js | docs/archive/scripts/linear-migration/migrate-to-linear.js | One-off OpenProject → Linear migration complete | 2025-09-29 | 413 lines |
| ARCH-003 | scripts/migrate-to-linear-simple.js | docs/archive/scripts/linear-migration/migrate-to-linear-simple.js | Simplified migration script - completed | 2025-09-29 | N/A |
| ARCH-004 | scripts/setup-linear.js | docs/archive/scripts/linear-migration/setup-linear.js | Initial Linear setup complete | 2025-09-22 | N/A |
| ARCH-005 | scripts/setup-linear-cycles.js | docs/archive/scripts/linear-migration/setup-linear-cycles.js | Linear cycle configuration complete | 2025-09-22 | N/A |
| ARCH-006 | scripts/push-docs-to-linear.js | docs/archive/scripts/linear-migration/push-docs-to-linear.js | Doc sync script - no workflow usage found | 2025-09-22 | N/A |

### Cloudflare Scripts

| Breadcrumb ID | Original Path | New Path | Reason | Last Active | Size |
|---------------|---------------|----------|--------|-------------|------|
| ARCH-007 | scripts/cf-wrangler | docs/archive/scripts/cloudflare/cf-wrangler | Deprecated - hardcoded paths, not in package.json | No git history | ~2KB |
| ARCH-008 | scripts/check-cf-dns | docs/archive/scripts/cloudflare/check-cf-dns | Deprecated - hardcoded paths, manual env sourcing | No git history | ~1.5KB |
| ARCH-009 | infrastructure/cloudflare/setup-r2.sh | docs/archive/scripts/cloudflare/setup-r2.sh | One-time R2 bucket setup (R2 optional per project-context.md) | 2025-09-22 | 4.3KB |

### Infrastructure Scripts

| Breadcrumb ID | Original Path | New Path | Reason | Last Active | Size |
|---------------|---------------|----------|--------|-------------|------|
| ARCH-010 | infrastructure/scripts/deploy-queue-mode.sh | docs/archive/scripts/infrastructure/deploy-queue-mode.sh | One-off Story 1.3 deployment script | No git history | N/A |
| ARCH-011 | infrastructure/scripts/generate-secure-env.sh | docs/archive/scripts/infrastructure/generate-secure-env.sh | One-time .env generation setup | No git history | N/A |
| ARCH-012 | infrastructure/scripts/rollback-container-names.sh | docs/archive/scripts/infrastructure/rollback-container-names.sh | One-time rollback script | No git history | N/A |

### Test Setup Scripts

| Breadcrumb ID | Original Path | New Path | Reason | Last Active | Size |
|---------------|---------------|----------|--------|-------------|------|
| ARCH-013 | scripts/setup-test-env.sh | docs/archive/scripts/setup-test-env.sh | Superseded by validate-test-env.sh | 2025-09-14 | N/A |
| ARCH-014 | scripts/setup/setup-smart-search.sh | docs/archive/scripts/setup-smart-search.sh | One-time setup script | Sep 24 (no git history) | N/A |

### Browser Extension (OpenProject)

| Breadcrumb ID | Original Path | New Path | Reason | Last Active | Size |
|---------------|---------------|----------|--------|-------------|------|
| ARCH-015 | packages/flrts-extension/ | packages/archive/flrts-extension/ | OpenProject deprecated (ADR-006), not in package.json workspaces | 2025-09-24 | 11KB |
| ARCH-015a | packages/flrts-extension/manifest.json | packages/archive/flrts-extension/manifest.json | Part of flrts-extension archive | 2025-09-24 | 966 bytes |
| ARCH-015b | packages/flrts-extension/content.js | packages/archive/flrts-extension/content.js | Part of flrts-extension archive | 2025-09-24 | 10.7KB |

---

## Deletions (Removing temporary/generated files)

| Breadcrumb ID | Original Path | Reason | Backup Location | Size |
|---------------|---------------|--------|-----------------|------|
| DEL-001 | tmp-sec.log | Temporary log file from security-review.sh | N/A - add to .gitignore | 849 bytes |
| DEL-002 | security-findings.json | Generated security scan results | N/A - add to .gitignore | 170 bytes |

---

## Consolidations (Merging directories/single-file dirs)

| Breadcrumb ID | Original Path | New Path | Reason | Dependencies | Size |
|---------------|---------------|----------|--------------|--------------|------|
| CONS-001 | lib/linear-integration.js | docs/archive/prototypes/linear-integration.js | Single-file directory, no imports found in codebase | None found (orphaned) | 5.9KB |
| CONS-002 | infrastructure/scripts/health-check.sh | scripts/health-check.sh | Consolidate infrastructure scripts to reduce depth | None found | N/A |
| CONS-003 | infrastructure/scripts/run-resilience-tests.sh | scripts/run-resilience-tests.sh | Consolidate infrastructure scripts | package.json: "test:resilience:shell" | N/A |
| CONS-004 | infrastructure/scripts/validate-container-naming.sh | scripts/validate-container-naming.sh | Consolidate infrastructure scripts | None found | N/A |
| CONS-005 | config/linting/.markdownlint.json | (root)/.markdownlint.json | Move linting configs to root (check for duplicates first) | Markdown linting | 134 bytes |
| CONS-006 | config/linting/.markdownlintignore | (root)/.markdownlintignore | Move linting configs to root | Markdown linting | 119 bytes |

**CONS-002 through CONS-004 Note:** After consolidation, update package.json reference for run-resilience-tests.sh

**CONS-005 and CONS-006 Note:** Check diff with existing root .markdownlint.json before moving. If identical, just remove config/linting/ directory.

---

## Removals (External Repository Items)

| Breadcrumb ID | Original Path | Reason | External Location | Verification Required |
|---------------|---------------|--------|-------------------|------------------------|
| REM-001 | flrts_extensions/ | Custom ERPNext app belongs in external repo per .project-context.md | /Users/colinaulds/Desktop/flrts-extensions (GitHub: auldsyababua/flrts-extensions) | Verify external repo is up-to-date before removal |

**REM-001 Actions Required:**
1. Verify `/Users/colinaulds/Desktop/flrts-extensions/` has latest code
2. Add `/flrts_extensions` to .gitignore
3. Remove from repository using `git rm -r flrts_extensions/`

---

## Reorganizations (Purpose-based moves per Diátaxis)

| Breadcrumb ID | Original Path | New Path | Reason | Size |
|---------------|---------------|----------|--------|------|
| REORG-001 | erpnext-admin-map/2025-10-07/ | docs/erpnext/research/admin-interface-screenshots/ | One-time research screenshots - move to research directory | 610KB |
| REORG-001a | erpnext-admin-map/2025-10-07/README.md | docs/erpnext/research/admin-interface-screenshots/README.md | Part of admin-map reorganization | N/A |
| REORG-001b | erpnext-admin-map/2025-10-07/*.png | docs/erpnext/research/admin-interface-screenshots/*.png | 8 PNG screenshots (customer-list, item-list, etc.) | 610KB total |

**REORG-001 Note:** After moving all contents from erpnext-admin-map/2025-10-07/, remove empty parent directories (erpnext-admin-map/)

---

## .gitignore Updates Required

Add these patterns to prevent future tracking:

```gitignore
# Temporary files
tmp-*.log

# Generated security reports
security-findings.json

# Custom ERPNext app (external repo)
/flrts_extensions

# Build artifacts (if not already covered)
*.pyc
__pycache__/
```

---

## Breadcrumb Lookup Table

### Archives

**ARCH-001**: database/ → docs/archive/supabase-migrations/
- Purpose: Obsolete Supabase PostgreSQL migrations (entire directory)
- Deprecated: ADR-006 (2025-09-30) - ERPNext migration, Supabase no longer primary backend
- Last Activity: 2025-09-30 (002_openproject_schema.sql)
- Size: ~145KB
- Contents: migrations/ (4 SQL files), seeds/ (2 SQL files), README.md
- Recovery: `git log --all -- database/`

**ARCH-002**: scripts/migrate-to-linear.js → docs/archive/scripts/linear-migration/migrate-to-linear.js
- Purpose: Full OpenProject → Linear migration script
- Last used: 2025-09-29
- Size: 413 lines
- Status: Migration complete, Linear integration stable (10N-275 master dashboard)
- Recovery: `git log --all -- scripts/migrate-to-linear.js`

**ARCH-003**: scripts/migrate-to-linear-simple.js → docs/archive/scripts/linear-migration/migrate-to-linear-simple.js
- Purpose: Simplified Linear migration script
- Last used: 2025-09-29
- Status: Migration complete
- Recovery: `git log --all -- scripts/migrate-to-linear-simple.js`

**ARCH-004**: scripts/setup-linear.js → docs/archive/scripts/linear-migration/setup-linear.js
- Purpose: Initial Linear workspace setup
- Last used: 2025-09-22
- Status: Setup complete
- Recovery: `git log --all -- scripts/setup-linear.js`

**ARCH-005**: scripts/setup-linear-cycles.js → docs/archive/scripts/linear-migration/setup-linear-cycles.js
- Purpose: Linear cycle configuration
- Last used: 2025-09-22
- Status: Configuration complete
- Recovery: `git log --all -- scripts/setup-linear-cycles.js`

**ARCH-006**: scripts/push-docs-to-linear.js → docs/archive/scripts/linear-migration/push-docs-to-linear.js
- Purpose: Sync documentation to Linear
- Last used: 2025-09-22
- Status: No workflow usage found, not in package.json
- Recovery: `git log --all -- scripts/push-docs-to-linear.js`

**ARCH-007**: scripts/cf-wrangler → docs/archive/scripts/cloudflare/cf-wrangler
- Purpose: Cloudflare Workers deployment wrapper
- Last used: No git history
- Size: ~2KB
- Issues: Hardcoded absolute path `/Users/colinaulds/Desktop/projects/bigsirflrts`
- Recovery: `git log --all -- scripts/cf-wrangler`

**ARCH-008**: scripts/check-cf-dns → docs/archive/scripts/cloudflare/check-cf-dns
- Purpose: Cloudflare DNS verification
- Last used: No git history
- Size: ~1.5KB
- Issues: Hardcoded paths, manual env sourcing
- Recovery: `git log --all -- scripts/check-cf-dns`

**ARCH-009**: infrastructure/cloudflare/setup-r2.sh → docs/archive/scripts/cloudflare/setup-r2.sh
- Purpose: Cloudflare R2 bucket setup
- Last used: 2025-09-22
- Size: 4.3KB
- Status: One-time setup script, R2 optional per .project-context.md
- Recovery: `git log --all -- infrastructure/cloudflare/setup-r2.sh`

**ARCH-010**: infrastructure/scripts/deploy-queue-mode.sh → docs/archive/scripts/infrastructure/deploy-queue-mode.sh
- Purpose: Deploy queue mode (Story 1.3)
- Last used: No git history
- Status: One-off deployment script
- Recovery: `git log --all -- infrastructure/scripts/deploy-queue-mode.sh`

**ARCH-011**: infrastructure/scripts/generate-secure-env.sh → docs/archive/scripts/infrastructure/generate-secure-env.sh
- Purpose: Generate .env files
- Last used: No git history
- Status: One-time setup script
- Recovery: `git log --all -- infrastructure/scripts/generate-secure-env.sh`

**ARCH-012**: infrastructure/scripts/rollback-container-names.sh → docs/archive/scripts/infrastructure/rollback-container-names.sh
- Purpose: Rollback container names
- Last used: No git history
- Status: One-time rollback script
- Recovery: `git log --all -- infrastructure/scripts/rollback-container-names.sh`

**ARCH-013**: scripts/setup-test-env.sh → docs/archive/scripts/setup-test-env.sh
- Purpose: Test environment setup
- Last used: 2025-09-14
- Status: Superseded by validate-test-env.sh
- Recovery: `git log --all -- scripts/setup-test-env.sh`

**ARCH-014**: scripts/setup/setup-smart-search.sh → docs/archive/scripts/setup-smart-search.sh
- Purpose: Smart search setup
- Last used: Sep 24 (no git history)
- Status: One-time setup script
- Recovery: `git log --all -- scripts/setup/setup-smart-search.sh`

**ARCH-015**: packages/flrts-extension/ → packages/archive/flrts-extension/
- Purpose: Chrome extension for OpenProject natural language task creation
- Last used: 2025-09-24
- Size: 11KB (manifest.json 966 bytes, content.js 10.7KB)
- Status: OpenProject deprecated (ADR-006), not in package.json workspaces
- Recovery: `git log --all -- packages/flrts-extension/`

### Deletions

**DEL-001**: tmp-sec.log
- Purpose: Temporary security review log output
- Created: 2025-09-29
- Size: 849 bytes
- Reason: Generated artifact from security-review.sh, should be gitignored
- Action: Delete + add pattern `tmp-*.log` to .gitignore

**DEL-002**: security-findings.json
- Purpose: Security scan results JSON
- Modified: 2025-10-16
- Size: 170 bytes
- Reason: Generated file, changes with each scan run
- Action: Delete + add `security-findings.json` to .gitignore

### Consolidations

**CONS-001**: lib/linear-integration.js → docs/archive/prototypes/linear-integration.js
- Purpose: Linear integration module for BigSirFLRTS
- Last Modified: 2025-09-22 (linting fix only)
- Size: 5.9KB
- Dependencies: @linear/sdk (no active imports in codebase)
- Status: Orphaned code, single-file directory anti-pattern
- Recovery: `git log --all -- lib/linear-integration.js`

**CONS-002**: infrastructure/scripts/health-check.sh → scripts/health-check.sh
- Purpose: Service health monitoring
- Status: Active script
- Dependencies: None found
- Reason: Consolidate infrastructure scripts to reduce directory depth

**CONS-003**: infrastructure/scripts/run-resilience-tests.sh → scripts/run-resilience-tests.sh
- Purpose: Resilience testing
- Status: Active (referenced in package.json)
- Dependencies: package.json script `"test:resilience:shell": "bash infrastructure/scripts/run-resilience-tests.sh"`
- Reason: Consolidate infrastructure scripts
- **Action Required**: Update package.json after move to `"bash scripts/run-resilience-tests.sh"`

**CONS-004**: infrastructure/scripts/validate-container-naming.sh → scripts/validate-container-naming.sh
- Purpose: Container naming validation
- Status: Active
- Dependencies: None found
- Reason: Consolidate infrastructure scripts

**CONS-005**: config/linting/.markdownlint.json → (root)/.markdownlint.json
- Purpose: Markdown linting configuration
- Size: 134 bytes
- Reason: Move to root (industry standard), root already has .markdownlint.json
- **Action Required**: Check diff before moving, may be duplicate

**CONS-006**: config/linting/.markdownlintignore → (root)/.markdownlintignore
- Purpose: Markdown linting ignore patterns
- Size: 119 bytes
- Reason: Move to root (industry standard)
- **Action Required**: Check for existing .markdownlintignore at root

### Removals

**REM-001**: flrts_extensions/ → (external repo)
- Purpose: Custom ERPNext app for FLRTS
- External Location: /Users/colinaulds/Desktop/flrts-extensions
- GitHub: auldsyababua/flrts-extensions
- Status: Should NOT be in this repository per .project-context.md (lines 126-132)
- Reason: Frappe Cloud deployment expects separate Git repo, separation of concerns
- **Action Required**: Verify external repo is up-to-date before removal
- Recovery: `git log --all -- flrts_extensions/`

### Reorganizations

**REORG-001**: erpnext-admin-map/2025-10-07/ → docs/erpnext/research/admin-interface-screenshots/
- Purpose: ERPNext admin interface screenshots for documentation
- Created: 2025-10-07
- Last Modified: 2025-10-13 (README.md)
- Size: 610KB (8 PNG screenshots)
- Contents:
  - README.md
  - customer-list.png (57 KB)
  - item-list.png (55 KB)
  - item-form-has-serial.png (126 KB)
  - serialno-list.png (52 KB)
  - serialno-detail-link-to-item.png (78 KB)
  - maintenance-visit-list.png (66 KB)
  - maintenance-visit-form.png (78 KB)
  - admin-api-access-redacted.png (98 KB)
- Reason: One-time research should live in docs/research/, not root
- Recovery: `git log --all -- erpnext-admin-map/`

---

## Evaluate/Decision Required (5 items)

These items require explicit decision from Planning Agent before action:

### EVAL-001: packages/nlp-service/

**Current Status:** Active in package.json workspaces, but built for deprecated backends

**Analysis:**
- Purpose: NLP service for parsing task requests (OpenAI GPT-4o)
- Last Modified: 2025-09-28 (package-lock.json)
- Dependencies: OpenProject (deprecated), Supabase logging (deprecated)
- README states: "Parses task requests into structured OpenProject work packages"
- Features: POST /parse, reasoning capture, Supabase logging
- Tech: OpenTelemetry instrumentation (aligned with ADR-007)

**Options:**
1. **Refactor** - Adapt for ERPNext Task DocType creation (if NLP still desired)
2. **Archive** - If direct ERPNext Task creation preferred over NLP parsing
3. **Keep as research** - If planning future NLP integration

**Question for Planning Agent:** Is NLP task parsing still a priority with ERPNext backend?

**Evidence Needed:**
- PRD or roadmap for NLP features with ERPNext
- Backlog items mentioning natural language task creation
- User requirements for NLP vs direct form entry

---

### EVAL-002: scripts/linear-cli.js

**Current Status:** No usage found in package.json

**Analysis:**
- Purpose: Linear command-line interface
- Last Modified: 2025-09-22 (linting only)
- Not in package.json scripts
- No obvious imports found

**Investigation Needed:**
- Check .github/workflows/linear-*.yml for references
- Ask team if manual CLI operations still needed
- Determine if used for ad-hoc operations

**Recommendation:** INVESTIGATE WORKFLOWS before archiving

---

### EVAL-003: scripts/linear-webhook.js

**Current Status:** No usage found in package.json

**Analysis:**
- Purpose: Linear webhook handler
- Last Modified: 2025-09-22 (linting only)
- Not in package.json scripts
- Workflow may use this

**Investigation Needed:**
- Check .github/workflows/linear-*.yml for references
- Determine if used in production webhook handling

**Recommendation:** INVESTIGATE WORKFLOWS before archiving

---

### EVAL-004: scripts/maintenance/cleanup.sh

**Current Status:** Unknown usage

**Analysis:**
- Size: 2061 bytes
- Last Modified: Sep 24 (no git history)
- Not in package.json
- Purpose unclear from audit

**Investigation Needed:**
- Check if used in CI/CD
- Ask team if manual maintenance operations still use this
- Determine if still relevant or superseded

**Recommendation:** EVALUATE USAGE before archiving

---

### EVAL-005: scripts/maintenance/fix-node-modules.sh

**Current Status:** Unknown usage

**Analysis:**
- Size: 2931 bytes
- Last Modified: Sep 24 (no git history)
- Not in package.json
- Purpose unclear from audit

**Investigation Needed:**
- Check if used in CI/CD
- Ask team if manual maintenance operations still use this
- Determine if still relevant or superseded

**Recommendation:** EVALUATE USAGE before archiving

---

## Migration Phases (Execution Order)

### Phase 1: Safe Deletions (No Dependencies)

**Risk Level:** LOW
**Estimated Time:** 5 minutes

1. Update .gitignore:
   ```bash
   echo "" >> .gitignore
   echo "# Temporary files" >> .gitignore
   echo "tmp-*.log" >> .gitignore
   echo "" >> .gitignore
   echo "# Generated security reports" >> .gitignore
   echo "security-findings.json" >> .gitignore
   echo "" >> .gitignore
   echo "# Custom ERPNext app (external repo)" >> .gitignore
   echo "/flrts_extensions" >> .gitignore
   ```

2. Delete temporary files:
   ```bash
   git rm tmp-sec.log
   git rm security-findings.json
   ```

3. Commit:
   ```bash
   git commit -m "chore: remove temporary files, update .gitignore

   - Remove tmp-sec.log (generated by security-review.sh)
   - Remove security-findings.json (generated security scan results)
   - Add patterns to .gitignore to prevent future tracking

   Refs: DEL-001, DEL-002"
   ```

**Breadcrumbs Completed:** DEL-001, DEL-002

---

### Phase 2: Remove External Repository Items

**Risk Level:** LOW (if verification passes)
**Estimated Time:** 10 minutes

1. Verify external repo is up-to-date:
   ```bash
   ls -la /Users/colinaulds/Desktop/flrts-extensions/
   # Verify directory exists and has content

   cd /Users/colinaulds/Desktop/flrts-extensions
   git status
   git log --oneline -5
   # Verify it's a valid Git repo with recent commits

   cd /Users/colinaulds/Desktop/bigsirflrts
   ```

2. Remove from this repository:
   ```bash
   git rm -r flrts_extensions/
   ```

3. Commit:
   ```bash
   git commit -m "chore: remove flrts_extensions/ - belongs in external repo

   Per .project-context.md, the flrts_extensions custom ERPNext app
   belongs in the external repository at:
   - Local: /Users/colinaulds/Desktop/flrts-extensions
   - GitHub: auldsyababua/flrts-extensions

   Frappe Cloud deployment uses Git push-to-deploy from external repo.
   Added /flrts_extensions to .gitignore (Phase 1) to prevent re-adding.

   Refs: REM-001"
   ```

**Breadcrumbs Completed:** REM-001

**Verification Required:** Confirm external repo exists and is current before executing

---

### Phase 3: Archives - Supabase/Database (Low Risk)

**Risk Level:** LOW
**Estimated Time:** 10 minutes

1. Create archive directory with README:
   ```bash
   mkdir -p docs/archive/supabase-migrations
   ```

2. Create ARCHIVE-README.md:
   ```bash
   cat > docs/archive/supabase-migrations/ARCHIVE-README.md << 'EOF'
   # Archived: Supabase PostgreSQL Migrations

   **Archived Date:** 2025-10-16
   **Original Location:** /database/
   **Reason:** Supabase deprecated as primary backend per ADR-006 (2025-09-30)

   ## Context

   This directory contains the original Supabase PostgreSQL migrations from when
   the project used Supabase as the primary backend. As of ADR-006, ERPNext on
   Frappe Cloud is the primary and only backend.

   Supabase is retained for analytics/audit logging ONLY (not primary data storage).

   ## Contents

   - migrations/ - 4 SQL migration files
     - 001_initial_schema.sql - Initial FLRTS schema
     - 002_openproject_schema.sql - OpenProject integration schema
     - 003_flrts_features.sql - FLRTS features
     - 004_monitoring_views.sql - Monitoring views
   - seeds/ - Development and test seed data
   - README.md - Original database documentation

   ## Recovery

   To restore from git history:
   ```bash
   git log --all -- database/
   git checkout <commit-hash> -- database/
   ```

   ## Related Decisions

   - ADR-006: ERPNext/Frappe Cloud migration (2025-09-30)
   - Migration: OpenProject shut down September 30, 2025

   ## Breadcrumb

   ARCH-001: database/ → docs/archive/supabase-migrations/
   EOF
   ```

3. Move database directory:
   ```bash
   git mv database/* docs/archive/supabase-migrations/
   rmdir database
   ```

4. Commit:
   ```bash
   git commit -m "chore: archive database/ - Supabase migrations obsolete

   Archive entire database/ directory to docs/archive/supabase-migrations/

   Reason: Supabase deprecated as primary backend per ADR-006 (2025-09-30).
   ERPNext on Frappe Cloud is now the primary and only backend.

   Supabase retained for analytics/audit logging ONLY.

   Last activity: 2025-09-30 (002_openproject_schema.sql)

   Refs: ARCH-001"
   ```

**Breadcrumbs Completed:** ARCH-001 (and all sub-items ARCH-001a through ARCH-001g)

---

### Phase 4: Archives - Linear Migration Scripts

**Risk Level:** LOW
**Estimated Time:** 15 minutes

1. Create archive directory:
   ```bash
   mkdir -p docs/archive/scripts/linear-migration
   ```

2. Create ARCHIVE-README.md:
   ```bash
   cat > docs/archive/scripts/linear-migration/ARCHIVE-README.md << 'EOF'
   # Archived: Linear Migration Scripts

   **Archived Date:** 2025-10-16
   **Original Locations:**
   - /scripts/migrate-to-linear.js
   - /scripts/migrate-to-linear-simple.js
   - /scripts/setup-linear.js
   - /scripts/setup-linear-cycles.js
   - /scripts/push-docs-to-linear.js

   **Reason:** One-time migration from OpenProject to Linear complete

   ## Context

   These scripts were used for the one-time migration from OpenProject to Linear
   and initial Linear workspace setup. Migration completed September 2025.

   Linear integration is now stable with 10N-275 master dashboard established.

   ## Scripts

   - migrate-to-linear.js (413 lines) - Full migration script
   - migrate-to-linear-simple.js - Simplified migration
   - setup-linear.js - Initial workspace setup
   - setup-linear-cycles.js - Cycle configuration
   - push-docs-to-linear.js - Doc sync (no workflow usage)

   ## Recovery

   ```bash
   git log --all -- scripts/migrate-to-linear*.js
   git log --all -- scripts/setup-linear*.js
   git log --all -- scripts/push-docs-to-linear.js
   git checkout <commit-hash> -- scripts/<script-name>
   ```

   ## Related

   - OpenProject shut down: September 30, 2025
   - Linear workspace: colin-aulds (10nz.tools)
   - Master dashboard: 10N-275

   ## Breadcrumbs

   - ARCH-002: scripts/migrate-to-linear.js
   - ARCH-003: scripts/migrate-to-linear-simple.js
   - ARCH-004: scripts/setup-linear.js
   - ARCH-005: scripts/setup-linear-cycles.js
   - ARCH-006: scripts/push-docs-to-linear.js
   EOF
   ```

3. Move scripts:
   ```bash
   git mv scripts/migrate-to-linear.js docs/archive/scripts/linear-migration/
   git mv scripts/migrate-to-linear-simple.js docs/archive/scripts/linear-migration/
   git mv scripts/setup-linear.js docs/archive/scripts/linear-migration/
   git mv scripts/setup-linear-cycles.js docs/archive/scripts/linear-migration/
   git mv scripts/push-docs-to-linear.js docs/archive/scripts/linear-migration/
   ```

4. Commit:
   ```bash
   git commit -m "chore: archive Linear migration and setup scripts

   Move one-time migration scripts to docs/archive/scripts/linear-migration/

   Scripts archived:
   - migrate-to-linear.js (full migration, 413 lines)
   - migrate-to-linear-simple.js (simplified migration)
   - setup-linear.js (initial setup)
   - setup-linear-cycles.js (cycle config)
   - push-docs-to-linear.js (doc sync, unused)

   Reason: Migration complete (Sep 2025), Linear integration stable.
   No active usage in package.json or workflows.

   Refs: ARCH-002, ARCH-003, ARCH-004, ARCH-005, ARCH-006"
   ```

**Breadcrumbs Completed:** ARCH-002, ARCH-003, ARCH-004, ARCH-005, ARCH-006

---

### Phase 5: Archives - Cloudflare Scripts

**Risk Level:** LOW
**Estimated Time:** 10 minutes

1. Create archive directory:
   ```bash
   mkdir -p docs/archive/scripts/cloudflare
   ```

2. Create ARCHIVE-README.md:
   ```bash
   cat > docs/archive/scripts/cloudflare/ARCHIVE-README.md << 'EOF'
   # Archived: Cloudflare Scripts

   **Archived Date:** 2025-10-16
   **Original Locations:**
   - /scripts/cf-wrangler
   - /scripts/check-cf-dns
   - /infrastructure/cloudflare/setup-r2.sh

   **Reason:** Deprecated or one-time setup scripts

   ## Context

   These scripts were used for Cloudflare Workers deployment and R2 bucket setup.
   Cloudflare R2 is optional per .project-context.md (via marketplace app).

   ## Issues with cf-wrangler and check-cf-dns

   - Hardcoded absolute paths: /Users/colinaulds/Desktop/projects/bigsirflrts
   - Manual environment sourcing
   - Not referenced in package.json or workflows
   - No git history (created before repo tracking)

   ## Scripts

   - cf-wrangler (~2KB) - Cloudflare Workers deployment wrapper
   - check-cf-dns (~1.5KB) - Cloudflare DNS verification
   - setup-r2.sh (4.3KB) - One-time R2 bucket setup

   ## Recovery

   ```bash
   git log --all -- scripts/cf-wrangler
   git log --all -- scripts/check-cf-dns
   git log --all -- infrastructure/cloudflare/setup-r2.sh
   git checkout <commit-hash> -- <script-path>
   ```

   ## Breadcrumbs

   - ARCH-007: scripts/cf-wrangler
   - ARCH-008: scripts/check-cf-dns
   - ARCH-009: infrastructure/cloudflare/setup-r2.sh
   EOF
   ```

3. Move scripts:
   ```bash
   git mv scripts/cf-wrangler docs/archive/scripts/cloudflare/
   git mv scripts/check-cf-dns docs/archive/scripts/cloudflare/
   git mv infrastructure/cloudflare/setup-r2.sh docs/archive/scripts/cloudflare/

   # Remove empty cloudflare directory if it's now empty
   rmdir infrastructure/cloudflare 2>/dev/null || true
   ```

4. Commit:
   ```bash
   git commit -m "chore: archive Cloudflare scripts

   Move deprecated Cloudflare scripts to docs/archive/scripts/cloudflare/

   Scripts archived:
   - cf-wrangler (deployment wrapper, hardcoded paths)
   - check-cf-dns (DNS verification, hardcoded paths)
   - setup-r2.sh (one-time R2 bucket setup)

   Reason: Deprecated scripts with hardcoded paths, not in package.json.
   R2 optional per .project-context.md (marketplace app).

   Refs: ARCH-007, ARCH-008, ARCH-009"
   ```

**Breadcrumbs Completed:** ARCH-007, ARCH-008, ARCH-009

---

### Phase 6: Archives - Infrastructure Scripts

**Risk Level:** LOW
**Estimated Time:** 10 minutes

1. Create archive directory:
   ```bash
   mkdir -p docs/archive/scripts/infrastructure
   ```

2. Create ARCHIVE-README.md:
   ```bash
   cat > docs/archive/scripts/infrastructure/ARCHIVE-README.md << 'EOF'
   # Archived: Infrastructure One-Off Scripts

   **Archived Date:** 2025-10-16
   **Original Location:** /infrastructure/scripts/

   **Reason:** One-time deployment, setup, and rollback scripts

   ## Context

   These scripts were used for one-time infrastructure operations and are no
   longer actively needed.

   ## Scripts

   - deploy-queue-mode.sh - Deploy queue mode (Story 1.3)
   - generate-secure-env.sh - Generate .env files (one-time setup)
   - rollback-container-names.sh - Rollback container names (one-time)

   ## Recovery

   ```bash
   git log --all -- infrastructure/scripts/deploy-queue-mode.sh
   git log --all -- infrastructure/scripts/generate-secure-env.sh
   git log --all -- infrastructure/scripts/rollback-container-names.sh
   git checkout <commit-hash> -- infrastructure/scripts/<script-name>
   ```

   ## Breadcrumbs

   - ARCH-010: deploy-queue-mode.sh
   - ARCH-011: generate-secure-env.sh
   - ARCH-012: rollback-container-names.sh
   EOF
   ```

3. Move scripts:
   ```bash
   git mv infrastructure/scripts/deploy-queue-mode.sh docs/archive/scripts/infrastructure/
   git mv infrastructure/scripts/generate-secure-env.sh docs/archive/scripts/infrastructure/
   git mv infrastructure/scripts/rollback-container-names.sh docs/archive/scripts/infrastructure/
   ```

4. Commit:
   ```bash
   git commit -m "chore: archive infrastructure one-off scripts

   Move one-time infrastructure scripts to docs/archive/scripts/infrastructure/

   Scripts archived:
   - deploy-queue-mode.sh (Story 1.3 deployment)
   - generate-secure-env.sh (.env generation)
   - rollback-container-names.sh (container name rollback)

   Reason: One-time operations complete, not in package.json or workflows.

   Refs: ARCH-010, ARCH-011, ARCH-012"
   ```

**Breadcrumbs Completed:** ARCH-010, ARCH-011, ARCH-012

---

### Phase 7: Archives - Test Setup Scripts

**Risk Level:** LOW
**Estimated Time:** 10 minutes

1. Create archive directory (if not exists from previous phases):
   ```bash
   mkdir -p docs/archive/scripts
   ```

2. Create or update ARCHIVE-README.md:
   ```bash
   cat > docs/archive/scripts/ARCHIVE-README.md << 'EOF'
   # Archived: Test and Setup Scripts

   **Archived Date:** 2025-10-16
   **Original Locations:**
   - /scripts/setup-test-env.sh
   - /scripts/setup/setup-smart-search.sh

   **Reason:** Superseded or one-time setup scripts

   ## Context

   - setup-test-env.sh: Superseded by validate-test-env.sh
   - setup-smart-search.sh: One-time setup for smart search feature

   ## Recovery

   ```bash
   git log --all -- scripts/setup-test-env.sh
   git log --all -- scripts/setup/setup-smart-search.sh
   git checkout <commit-hash> -- scripts/<script-path>
   ```

   ## Breadcrumbs

   - ARCH-013: setup-test-env.sh
   - ARCH-014: setup-smart-search.sh
   EOF
   ```

3. Move scripts:
   ```bash
   git mv scripts/setup-test-env.sh docs/archive/scripts/
   git mv scripts/setup/setup-smart-search.sh docs/archive/scripts/

   # Remove empty setup directory
   rmdir scripts/setup 2>/dev/null || true
   ```

4. Commit:
   ```bash
   git commit -m "chore: archive test and setup scripts

   Move superseded and one-time setup scripts to docs/archive/scripts/

   Scripts archived:
   - setup-test-env.sh (superseded by validate-test-env.sh)
   - setup-smart-search.sh (one-time setup)

   Refs: ARCH-013, ARCH-014"
   ```

**Breadcrumbs Completed:** ARCH-013, ARCH-014

---

### Phase 8: Archives - Browser Extension

**Risk Level:** LOW
**Estimated Time:** 10 minutes

1. Create or verify archive directory exists:
   ```bash
   # packages/archive/ should already exist per audit report
   ls -d packages/archive/ || mkdir -p packages/archive/
   ```

2. Create ARCHIVE-README.md:
   ```bash
   cat > packages/archive/ARCHIVE-README.md << 'EOF'
   # Archived Packages

   This directory contains packages that are no longer actively developed.

   ## flrts-extension/

   **Archived Date:** 2025-10-16
   **Original Location:** /packages/flrts-extension/
   **Reason:** OpenProject deprecated per ADR-006

   Chrome extension for OpenProject natural language task creation.

   - Built for OpenProject (shut down September 30, 2025)
   - Not referenced in package.json workspaces
   - No ERPNext equivalent planned (direct API access preferred)

   ### Recovery

   ```bash
   git log --all -- packages/flrts-extension/
   git checkout <commit-hash> -- packages/flrts-extension/
   ```

   ### Breadcrumb

   ARCH-015: packages/flrts-extension/
   EOF
   ```

3. Move extension:
   ```bash
   git mv packages/flrts-extension/ packages/archive/flrts-extension/
   ```

4. Commit:
   ```bash
   git commit -m "chore: archive flrts-extension package

   Move OpenProject browser extension to packages/archive/flrts-extension/

   Reason: OpenProject deprecated per ADR-006 (shut down Sep 30, 2025).
   Not in package.json workspaces. No ERPNext equivalent planned.

   Extension provided natural language task creation for OpenProject.
   Direct ERPNext API access preferred over browser extension approach.

   Refs: ARCH-015"
   ```

**Breadcrumbs Completed:** ARCH-015 (and sub-items ARCH-015a, ARCH-015b)

---

### Phase 9: Consolidations - Orphaned Code (Medium Risk - Testing Required)

**Risk Level:** MEDIUM
**Estimated Time:** 10 minutes

1. Create archive directory:
   ```bash
   mkdir -p docs/archive/prototypes
   ```

2. Create ARCHIVE-README.md:
   ```bash
   cat > docs/archive/prototypes/ARCHIVE-README.md << 'EOF'
   # Archived: Code Prototypes

   **Archived Date:** 2025-10-16
   **Reason:** Orphaned code with no active imports

   ## linear-integration.js

   **Original Location:** /lib/linear-integration.js
   **Last Modified:** 2025-09-22 (linting fix only)
   **Size:** 5.9KB

   Linear integration module for BigSirFLRTS. Exports LinearIntegration class
   with methods for getCurrentUser(), getProject(), etc.

   ### Why Archived

   - No imports found in entire codebase
   - Single-file directory (anti-pattern)
   - Last meaningful change was linting, not feature work
   - Likely superseded by @linear/sdk direct usage

   ### Recovery

   ```bash
   git log --all -- lib/linear-integration.js
   git checkout <commit-hash> -- lib/linear-integration.js
   ```

   ### Breadcrumb

   CONS-001: lib/linear-integration.js → docs/archive/prototypes/
   EOF
   ```

3. Move file and remove directory:
   ```bash
   git mv lib/linear-integration.js docs/archive/prototypes/
   rmdir lib
   ```

4. Commit:
   ```bash
   git commit -m "chore: archive orphaned linear-integration.js

   Move lib/linear-integration.js to docs/archive/prototypes/

   Reason:
   - No imports found in codebase (orphaned code)
   - Single-file directory (anti-pattern)
   - Last change was linting only (2025-09-22)
   - Likely superseded by @linear/sdk direct usage

   Removes /lib directory from root.

   Refs: CONS-001"
   ```

**Breadcrumbs Completed:** CONS-001

---

### Phase 10: Consolidations - Infrastructure Scripts (Medium Risk - Testing Required)

**Risk Level:** MEDIUM
**Estimated Time:** 20 minutes

**IMPORTANT:** This phase requires updating package.json and testing

1. Move infrastructure scripts to root scripts/:
   ```bash
   git mv infrastructure/scripts/health-check.sh scripts/
   git mv infrastructure/scripts/run-resilience-tests.sh scripts/
   git mv infrastructure/scripts/validate-container-naming.sh scripts/
   ```

2. Update package.json:
   ```bash
   # Edit package.json to update script reference
   # OLD: "test:resilience:shell": "bash infrastructure/scripts/run-resilience-tests.sh"
   # NEW: "test:resilience:shell": "bash scripts/run-resilience-tests.sh"
   ```

3. Test the change:
   ```bash
   npm run test:resilience:shell
   # Verify script executes correctly
   ```

4. Commit:
   ```bash
   git add package.json
   git commit -m "refactor: consolidate infrastructure scripts to root scripts/

   Move active infrastructure scripts to scripts/ to reduce directory depth:
   - health-check.sh
   - run-resilience-tests.sh
   - validate-container-naming.sh

   Updated package.json script reference for run-resilience-tests.sh.

   Refs: CONS-002, CONS-003, CONS-004"
   ```

**Breadcrumbs Completed:** CONS-002, CONS-003, CONS-004

**Testing Required:**
- [ ] `npm run test:resilience:shell` executes successfully
- [ ] Verify no other scripts reference old infrastructure/scripts/ path

---

### Phase 11: Consolidations - Linting Config (Medium Risk - Testing Required)

**Risk Level:** MEDIUM
**Estimated Time:** 15 minutes

1. Check for duplicates and differences:
   ```bash
   # Compare existing root file with config/linting/ version
   diff .markdownlint.json config/linting/.markdownlint.json || echo "Files differ or one missing"

   # Check if .markdownlintignore exists at root
   ls -la .markdownlintignore || echo "No .markdownlintignore at root"
   ```

2. Move or consolidate:
   ```bash
   # If root .markdownlint.json exists and is identical:
   git rm config/linting/.markdownlint.json

   # If different or root doesn't exist, move:
   # git mv config/linting/.markdownlint.json ./

   # Move .markdownlintignore to root
   git mv config/linting/.markdownlintignore ./

   # Remove empty directory
   rmdir config/linting
   rmdir config 2>/dev/null || echo "config/ not empty or doesn't exist"
   ```

3. Test markdown linting:
   ```bash
   npm run lint:md
   # Verify linting still works
   ```

4. Commit:
   ```bash
   git commit -m "refactor: consolidate linting configs to root

   Move markdown linting configs from config/linting/ to root:
   - .markdownlintignore → root

   Remove duplicate/obsolete config/linting/.markdownlint.json
   (root already has .markdownlint.json)

   Removes /config directory from root (now empty).

   Refs: CONS-005, CONS-006"
   ```

**Breadcrumbs Completed:** CONS-005, CONS-006

**Testing Required:**
- [ ] `npm run lint:md` executes successfully
- [ ] Markdown files lint correctly with expected rules

**Note:** Actual command may vary (check package.json for markdown linting script)

---

### Phase 12: Reorganizations - Research Screenshots (Low Risk)

**Risk Level:** LOW
**Estimated Time:** 10 minutes

1. Create destination directory:
   ```bash
   mkdir -p docs/erpnext/research/admin-interface-screenshots
   ```

2. Move screenshots and README:
   ```bash
   # Move all contents from dated directory
   git mv erpnext-admin-map/2025-10-07/* docs/erpnext/research/admin-interface-screenshots/

   # Remove empty directories
   rmdir erpnext-admin-map/2025-10-07
   rmdir erpnext-admin-map
   ```

3. Update screenshot README if needed:
   ```bash
   # Optional: Update docs/erpnext/research/admin-interface-screenshots/README.md
   # to reflect new location if it references paths
   ```

4. Commit:
   ```bash
   git commit -m "refactor: move ERPNext admin screenshots to research directory

   Move erpnext-admin-map/ to docs/erpnext/research/admin-interface-screenshots/

   Contents moved:
   - README.md
   - 8 PNG screenshots (610KB total)
     - customer-list.png, item-list.png, item-form-has-serial.png
     - serialno-list.png, serialno-detail-link-to-item.png
     - maintenance-visit-list.png, maintenance-visit-form.png
     - admin-api-access-redacted.png

   Reason: One-time research artifacts belong in docs/research/, not root.
   Follows project convention for research content organization.

   Removes /erpnext-admin-map directory from root.

   Refs: REORG-001"
   ```

**Breadcrumbs Completed:** REORG-001 (and sub-items REORG-001a, REORG-001b)

---

## Validation Checklist

Before executing each phase:

- [ ] Review breadcrumb mappings for accuracy
- [ ] Check dependencies (imports, package.json scripts, workflows)
- [ ] Create ARCHIVE-README.md for each archived directory
- [ ] Run tests after each phase (where applicable)
- [ ] Commit after each successful phase
- [ ] Verify no broken references in active code

After all phases complete:
- [ ] Update .project-context.md with migration reference
- [ ] Update docs/LINEAR-DOCUMENTATION-MAP.md if any docs moved
- [ ] Run full CI/CD pipeline to verify no breakage
- [ ] Document any deferred evaluation items in Linear

---

## Recovery Instructions

If migration causes issues:

### 1. Find Original Location

Check this migration-mapping.md for the breadcrumb ID:

Example: To find original location of archived script
```markdown
Search this file for: ARCH-002
Found: scripts/migrate-to-linear.js → docs/archive/scripts/linear-migration/migrate-to-linear.js
```

### 2. Restore from Git

Using git history:
```bash
# View history of archived file
git log --all -- <original-path>

# Restore specific version
git checkout <commit-hash> -- <original-path>

# Or restore from archive location
git checkout HEAD -- <new-archive-path>
```

### 3. Check Archive Location

All archives have ARCHIVE-README.md with:
- Original path
- Reason for archival
- Recovery instructions
- Related decisions (ADRs)

### 4. Emergency Full Rollback

To roll back an entire phase:
```bash
# Identify commit from phase
git log --oneline --grep="ARCH-00"

# Revert the commit
git revert <commit-hash>

# Or hard reset (DANGEROUS - loses uncommitted work)
git reset --hard <commit-before-phase>
```

---

## Dependencies Matrix

### Scripts Referenced in package.json

| Script | Path | package.json Reference | Migration Impact |
|--------|------|------------------------|------------------|
| bmad-qa-gate.sh | scripts/ | `"qa:gate"` | **KEEP** - No change |
| test-like-github.sh | scripts/ | `"test:ci-local"` | **KEEP** - No change |
| validate-test-env.sh | scripts/ | `"test:ci-validate"` | **KEEP** - No change |
| run-resilience-tests.sh | infrastructure/scripts/ → scripts/ | `"test:resilience:shell"` | **UPDATE** - Phase 10 |

**Action Required in Phase 10:** Update package.json script path for run-resilience-tests.sh

### Scripts Referenced in GitHub Workflows

| Workflow File | Script Referenced | Migration Impact |
|---------------|-------------------|------------------|
| .github/workflows/security.yml | scripts/security-review.sh | **KEEP** - No change |

**No workflow updates required** - active scripts remain in scripts/

### Import Analysis

| File | Imports Found | Migration Impact |
|------|---------------|------------------|
| lib/linear-integration.js | **NONE** | **ARCHIVE** - Phase 9 (orphaned) |

**No import updates required** - no active code imports archived files

---

## Progress Tracking

### Phases Completed: 0 / 12

- [ ] Phase 1: Safe Deletions (DEL-001, DEL-002)
- [ ] Phase 2: Remove External Repo (REM-001)
- [ ] Phase 3: Archive Supabase/Database (ARCH-001)
- [ ] Phase 4: Archive Linear Scripts (ARCH-002 through ARCH-006)
- [ ] Phase 5: Archive Cloudflare Scripts (ARCH-007 through ARCH-009)
- [ ] Phase 6: Archive Infrastructure Scripts (ARCH-010 through ARCH-012)
- [ ] Phase 7: Archive Test/Setup Scripts (ARCH-013, ARCH-014)
- [ ] Phase 8: Archive Browser Extension (ARCH-015)
- [ ] Phase 9: Consolidate Orphaned Code (CONS-001)
- [ ] Phase 10: Consolidate Infrastructure Scripts (CONS-002, CONS-003, CONS-004)
- [ ] Phase 11: Consolidate Linting Config (CONS-005, CONS-006)
- [ ] Phase 12: Reorganize Research Screenshots (REORG-001)

### Breadcrumbs Completed: 0 / 45

**Archives:** 0 / 25 (ARCH-001 through ARCH-015 + sub-items)
**Deletions:** 0 / 2 (DEL-001, DEL-002)
**Consolidations:** 0 / 6 (CONS-001 through CONS-006)
**Removals:** 0 / 1 (REM-001)
**Reorganizations:** 0 / 4 (REORG-001 + sub-items)

**Evaluations Pending:** 5 items (EVAL-001 through EVAL-005)

---

## Evaluation Items - Decision Required

**DO NOT EXECUTE** these items without explicit approval from Planning Agent:

1. **EVAL-001:** packages/nlp-service/ - Refactor, archive, or keep?
2. **EVAL-002:** scripts/linear-cli.js - Still used?
3. **EVAL-003:** scripts/linear-webhook.js - Still used?
4. **EVAL-004:** scripts/maintenance/cleanup.sh - Still used?
5. **EVAL-005:** scripts/maintenance/fix-node-modules.sh - Still used?

**Investigation Required:**
- Check .github/workflows/ for references to EVAL-002 and EVAL-003
- Ask team about manual usage of EVAL-004 and EVAL-005
- Review roadmap/PRD for NLP requirements (EVAL-001)

---

## Expected Final State

### Root Directory Structure (After All Phases)

```
bigsirflrts/
├── docs/                      # Documentation (expanded with archives)
├── infrastructure/            # Infrastructure (reduced - scripts moved)
├── packages/                  # Packages (nlp-service only if not archived)
├── scripts/                   # Scripts (consolidated from infrastructure/)
├── tests/                     # Tests (unchanged)
├── .github/                   # Workflows (unchanged)
├── docker-compose.yml         # Docker config (unchanged)
├── package.json               # NPM manifest (updated in Phase 10)
├── package-lock.json          # NPM lockfile (unchanged)
├── tsconfig.json              # TypeScript config (unchanged)
├── vitest.config.ts           # Test config (unchanged)
├── .eslintrc.json             # ESLint config (unchanged)
├── .prettierrc.json           # Prettier config (unchanged)
├── .markdownlint.json         # Markdown lint (unchanged)
├── .markdownlintignore        # Markdown lint ignore (added in Phase 11)
├── .gitignore                 # Git ignore (updated in Phase 1)
├── README.md                  # Project README (unchanged)
├── CONTRIBUTING.md            # Contributing guide (unchanged)
├── CLAUDE.md                  # Claude instructions (unchanged)
└── validate-setup.sh          # Setup validation (unchanged)
```

**Root Items:** ~17 (down from 23)
- Removed: database/, erpnext-admin-map/, lib/, config/, flrts_extensions/, tmp-sec.log, security-findings.json
- Added: .markdownlintignore

### docs/archive/ Structure (After All Phases)

```
docs/archive/
├── supabase-migrations/       # Phase 3 (ARCH-001)
│   ├── ARCHIVE-README.md
│   ├── migrations/
│   ├── seeds/
│   └── README.md
├── scripts/
│   ├── ARCHIVE-README.md      # Phase 7 (ARCH-013, ARCH-014)
│   ├── linear-migration/      # Phase 4 (ARCH-002 through ARCH-006)
│   │   ├── ARCHIVE-README.md
│   │   └── *.js (5 scripts)
│   ├── cloudflare/            # Phase 5 (ARCH-007 through ARCH-009)
│   │   ├── ARCHIVE-README.md
│   │   └── cf-wrangler, check-cf-dns, setup-r2.sh
│   ├── infrastructure/        # Phase 6 (ARCH-010 through ARCH-012)
│   │   ├── ARCHIVE-README.md
│   │   └── deploy-queue-mode.sh, generate-secure-env.sh, rollback-container-names.sh
│   ├── setup-test-env.sh
│   └── setup-smart-search.sh
└── prototypes/                # Phase 9 (CONS-001)
    ├── ARCHIVE-README.md
    └── linear-integration.js
```

### packages/ Structure (After Phase 8)

```
packages/
├── archive/
│   ├── ARCHIVE-README.md      # Updated in Phase 8
│   └── flrts-extension/       # Phase 8 (ARCH-015)
└── nlp-service/               # Status depends on EVAL-001 decision
```

---

## Final Validation Commands

After completing all phases, run:

```bash
# 1. Verify no broken imports
npm run lint

# 2. Type check
npx tsc --noEmit

# 3. Run tests
npm test

# 4. Security scan
bash scripts/security-review.sh

# 5. Verify package.json scripts
npm run qa:gate
npm run test:ci-local
npm run test:resilience:shell

# 6. Check for orphaned directories
find . -type d -empty -not -path "./.git/*"

# 7. Verify .gitignore patterns
git status
# Should not show tmp-*.log, security-findings.json, or flrts_extensions/

# 8. Check root directory count
ls -1 | wc -l
# Should be ~17 items (down from 23)
```

---

## Documentation Updates Required

After migration completes:

1. **Update .project-context.md:**
   - Add migration completion note under "Recent Changes"
   - Reference this migration-mapping.md document
   - Update "Known Issues/Blockers" to remove directory organization item

2. **Update docs/LINEAR-DOCUMENTATION-MAP.md** (if exists):
   - Mark any moved documentation as relocated
   - Add references to archive locations

3. **Create ADR (optional):**
   - If significant architectural impact, consider ADR-008 documenting repository reorganization

4. **Update CONTRIBUTING.md** (if needed):
   - Document new archive conventions
   - Reference migration-mapping.md for historical context

---

## Notes for Planning Agent

### Safe to Execute Immediately (Low Risk)
- Phases 1-9: No external approval needed (archives and deletions)
- Phase 12: Reorganization (low risk, documentation only)

### Requires Testing (Medium Risk)
- Phase 10: Infrastructure scripts consolidation (package.json update)
- Phase 11: Linting config consolidation (verify no duplicates)

### Requires Decision (High Risk)
- EVAL-001 through EVAL-005: Explicit approval needed before action

### Recommended Execution Order
1. Execute Phases 1-9 in sequence (can be batched into fewer commits if desired)
2. Execute Phase 12 (reorganization)
3. Test and execute Phase 10 (infrastructure consolidation)
4. Test and execute Phase 11 (linting consolidation)
5. Investigate and decide EVAL items separately

### Batch Commit Option
If preferred, Phases 3-8 (all archives) could be combined into a single commit:
```bash
git commit -m "chore: archive obsolete code and one-time scripts

Archive multiple directories to docs/archive/:
- database/ (Supabase migrations - ADR-006)
- Linear migration scripts (5 files)
- Cloudflare scripts (3 files)
- Infrastructure one-off scripts (3 files)
- Test/setup scripts (2 files)
- packages/flrts-extension/ (OpenProject extension)

All migrations complete, scripts superseded, or tech deprecated.

Refs: ARCH-001 through ARCH-015"
```

---

**Migration Mapping Complete**
**Document Version:** 1.0
**Prepared By:** Action Agent
**Date:** 2025-10-16
**Total Items Mapped:** 45 items
**Total Phases:** 12 phases
**Estimated Total Time:** 2-3 hours (with testing)
