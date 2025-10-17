# Linear Migration Scripts Archive

**Archived:** 2025-10-16
**Original Path:** `/scripts/migrate-to-linear*.js`, `/scripts/setup-linear*.js`, `/scripts/push-docs-to-linear.js`
**Breadcrumb IDs:** ARCH-002, ARCH-003, ARCH-004, ARCH-005, ARCH-006
**Reason:** One-time migration from OpenProject to Linear complete (September 2025)

## What Was Here

These scripts were used for the one-time migration from OpenProject to Linear and initial Linear workspace setup. The migration was completed in September 2025, and Linear integration is now stable with the 10N-275 master dashboard established.

### File Inventory

| File | Size | Last Modified | Purpose |
|------|------|---------------|---------|
| migrate-to-linear.js | 413 lines | 2025-09-29 | Full OpenProject → Linear migration script |
| migrate-to-linear-simple.js | N/A | 2025-09-29 | Simplified migration script (alternative approach) |
| setup-linear.js | N/A | 2025-09-22 | Initial Linear workspace setup |
| setup-linear-cycles.js | N/A | 2025-09-22 | Linear cycle configuration |
| push-docs-to-linear.js | N/A | 2025-09-22 | Documentation sync to Linear (unused) |

## Why Archived

### Migration Complete

The one-time migration from OpenProject to Linear was completed on **2025-09-22** (commit: "10N-89: Complete Linear integration and archive documentation").

**Migration Timeline:**
- 2025-09-22: Initial Linear workspace setup
- 2025-09-22: Linear cycle configuration
- 2025-09-22: Migration scripts created
- 2025-09-29: Final migration execution and linting cleanup
- 2025-10-16: Scripts archived (stable integration confirmed)

### Linear Integration Stable

Linear is now the primary issue tracking system with:
- **Master Dashboard:** 10N-275 (established)
- **Workspace:** colin-aulds (10nz.tools)
- **Team:** 10N
- **MCP Integration:** Active via @linear/sdk
- **Workflow:** Stable for 3+ weeks without issues

### No Active Usage

**Evidence from codebase analysis:**
- ✅ No references in package.json scripts
- ✅ No imports in active code
- ✅ Not referenced in GitHub workflows
- ✅ No git activity since Sep 29 (linting only)

## Last Active

**Last Modified:** 2025-09-29
**Last Meaningful Change:** 2025-09-22 (10N-89 migration completion)
**Final Commit:** Chore/fix linting warnings (#23)

**Activity Timeline:**
- 2025-09-22 13:02:43: Initial Linear integration (10N-89)
- 2025-09-22 13:14:12: Fix CI test failures
- 2025-09-22 17:52:07: Add linting/formatting configs
- 2025-09-29 18:16:22: Resolve linting issues (last change)

## Related

### Architecture & Decisions
- **OpenProject Shutdown:** September 30, 2025 (hosting terminated)
- **ADR-006:** ERPNext/Frappe Cloud migration (included Linear as issue tracker)
- **Linear Workspace:** colin-aulds workspace (10nz.tools domain)

### Related Migrations
- **OpenProject deprecation:** Entire platform shut down
- **Supabase migration:** ADR-006 (moved to ERPNext)
- **sync-service archived:** packages/archive/sync-service/ (no longer needed)

### Related Issues
- **10N-89:** Complete Linear integration and archive documentation
- **10N-233:** Refactor docs & tickets for Frappe Cloud migration (parent epic)
- **10N-275:** Master Dashboard Issue (current tracking hub)

### Migration Documentation
- Migration mapping: `docs/.scratch/deep-audit/migration-mapping.md`
- Forensic audit: `docs/.scratch/deep-audit/forensic-audit-report.md`

### Active Linear Integration

**Current Usage (NOT archived):**
- Linear MCP server: Active in Claude Code
- @linear/sdk: Package dependency for API access
- Linear CLI tools: May still be active (see EVAL-002 in migration-mapping.md)
- Linear webhooks: May still be active (see EVAL-003 in migration-mapping.md)

**Note:** Only the one-time migration scripts are archived. Ongoing Linear integration remains active.

## Recovery

If you need to restore these scripts for reference or to understand the migration process:

### View Git History
```bash
git log --all -- scripts/migrate-to-linear.js
git log --all -- scripts/setup-linear.js
git log --all -- scripts/push-docs-to-linear.js
```

### Restore from Git
```bash
# Restore entire migration script
git checkout <commit-hash> -- scripts/migrate-to-linear.js

# Find migration completion commit
git log --all --oneline --grep="10N-89"
# Output: e9c3f1a 10N-89: Complete Linear integration and archive documentation

# Restore from that commit
git checkout e9c3f1a -- scripts/migrate-to-linear.js
```

### Use Cases for Recovery
- **Documentation:** Understand how migration was performed
- **Reference:** Similar migration for another project
- **Debugging:** Investigate if migration missed any data
- **Audit:** Review what was migrated and how

## Migration Script Details

### migrate-to-linear.js (ARCH-002)

**Purpose:** Full OpenProject → Linear migration

**Functionality:**
- Read work packages from OpenProject API
- Transform to Linear issue format
- Create issues in Linear workspace
- Preserve metadata (assignees, dates, status)
- Handle relationships (parent/child tasks)

**Size:** 413 lines
**Dependencies:** @linear/sdk, axios (OpenProject API)
**Complexity:** High (full data transformation)

**Last Meaningful Change:** 2025-09-22 (initial creation for 10N-89)
**Linting Change:** 2025-09-29 (style fixes only)

### migrate-to-linear-simple.js (ARCH-003)

**Purpose:** Simplified migration approach

**Functionality:**
- Minimal data transformation
- Flat issue structure (no parent/child)
- Basic field mapping
- Faster execution

**Differences from full script:**
- No relationship preservation
- Simpler error handling
- Fewer API calls
- Trade-off: Speed vs completeness

**Last Modified:** 2025-09-29 (linting only)

### setup-linear.js (ARCH-004)

**Purpose:** Initial Linear workspace configuration

**Functionality:**
- Create Linear team
- Set up custom fields
- Configure workflow states
- Establish project structure
- Define labels and templates

**Status:** Setup complete (workspace established)
**Last Modified:** 2025-09-22

### setup-linear-cycles.js (ARCH-005)

**Purpose:** Linear cycle (sprint) configuration

**Functionality:**
- Configure cycle duration
- Set start day of week
- Enable/disable automatic cycle creation
- Define cycle naming convention

**Status:** Configuration complete
**Last Modified:** 2025-09-22

### push-docs-to-linear.js (ARCH-006)

**Purpose:** Sync documentation to Linear issues

**Functionality:**
- Read markdown documentation
- Create Linear issues from docs
- Maintain doc-to-issue mapping
- Update existing issues when docs change

**Status:** UNUSED (no workflow usage found)
**Last Modified:** 2025-09-22

**Note:** This script was created but never integrated into workflows. Documentation updates are now handled manually or through different mechanisms.

## Migration Results

### What Was Migrated

**From OpenProject:**
- Work packages → Linear issues
- Projects → Linear projects
- Status mapping → Linear workflow states
- Assignees → Linear team members
- Parent/child relationships → Issue hierarchy

**Master Dashboard Established:**
- 10N-275: Central tracking issue for all project work
- Linked to this repository
- Active since 2025-09-22

### What Was NOT Migrated

**Intentionally Skipped:**
- OpenProject time tracking (ERPNext handles this)
- OpenProject file attachments (moved to ERPNext)
- Old comments/history (fresh start in Linear)
- Custom OpenProject fields not applicable to Linear

**Reason:** Clean migration to new system, avoiding legacy cruft

## Technical Notes

### Dependencies

All migration scripts use:
- **@linear/sdk:** Linear API client (v1.x)
- **Node.js:** v18+ required
- **Environment Variables:**
  - `LINEAR_API_KEY` - Linear API authentication
  - `LINEAR_TEAM_ID` - Target team identifier
  - `OPENPROJECT_API_URL` - OpenProject instance URL (deprecated)
  - `OPENPROJECT_API_KEY` - OpenProject authentication (deprecated)

### Execution Context

**How scripts were run:**
```bash
# Workspace setup
node scripts/setup-linear.js

# Cycle configuration
node scripts/setup-linear-cycles.js

# Full migration
node scripts/migrate-to-linear.js

# Or simplified version
node scripts/migrate-to-linear-simple.js
```

**Note:** Scripts were run locally, not in CI/CD. One-time execution only.

### Error Handling

**Migration scripts include:**
- API rate limiting delays
- Retry logic for transient failures
- Validation of migrated data
- Rollback capabilities (via Linear API)
- Progress logging and checkpoints

**Common Issues Encountered:**
- Rate limiting from Linear API (handled with delays)
- Missing required fields (manual intervention)
- Duplicate issue detection (skip duplicates)

## Breadcrumbs

- **ARCH-002:** scripts/migrate-to-linear.js → docs/archive/scripts/linear-migration/
- **ARCH-003:** scripts/migrate-to-linear-simple.js → docs/archive/scripts/linear-migration/
- **ARCH-004:** scripts/setup-linear.js → docs/archive/scripts/linear-migration/
- **ARCH-005:** scripts/setup-linear-cycles.js → docs/archive/scripts/linear-migration/
- **ARCH-006:** scripts/push-docs-to-linear.js → docs/archive/scripts/linear-migration/

---

**Archived by:** Action Agent
**Archive Date:** 2025-10-16
**Archive Commit:** chore/directory-cleanup branch
**Migration Reference:** docs/.scratch/deep-audit/migration-mapping.md
