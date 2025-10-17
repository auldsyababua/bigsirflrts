# Archived Packages

**Updated:** 2025-10-16

This directory contains packages that are no longer actively developed due to deprecated technologies or completed migrations.

---

## sync-service/

**Archived**: 2025-10-16
**Issue**: 10N-339 - Remove OpenProject Fallback Pattern

**Purpose**: Bidirectional synchronization between Supabase (PostgreSQL) and OpenProject task management system.

**Why Archived**:
1. **OpenProject deprecated**: Per ADR-006 (Sept 30, 2025), OpenProject hosting shut down
2. **Architectural shift**: Migrated to ERPNext as primary backend - no sync needed
3. **Original use case obsolete**:
   - Initially: Separate OpenProject local DB + Supabase sync
   - Then: Discovered Supabase could BE the OpenProject DB
   - Finally: Dropped OpenProject entirely for ERPNext
4. **No active usage**: Zero references to sync-service in codebase

**Functionality** (for historical reference):
- Synced tasks/work packages between Supabase and OpenProject
- Handled status mapping (Supabase statuses → OpenProject statuses)
- Implemented retry logic, idempotency, correlation IDs
- Dictionary caching for OpenProject type/status/priority IDs
- Express API endpoints for triggering syncs

**Tech Stack**:
- Express.js server
- Axios for OpenProject API calls
- Supabase client for PostgreSQL queries
- ~400 lines of sync orchestration code

**Replacement**:
- ERPNext is now the primary backend (no sync service needed)
- Direct API calls to ERPNext replace sync pattern
- Supabase retained for analytics/logging only (see 10N-243)

**Related**:
- ADR-006: ERPNext Frappe Cloud Migration Decision
- 10N-243: Application Code Updates (OpenProject → ERPNext)
- 10N-339: Remove OpenProject Fallback Pattern

---

## flrts-extension/

**Archived Date:** 2025-10-16
**Original Location:** `/packages/flrts-extension/`
**Breadcrumb ID:** ARCH-015
**Reason:** OpenProject deprecated per ADR-006

### What It Was

Chrome extension for OpenProject natural language task creation in the BigSirFLRTS project.

**Technology Stack:**
- Chrome Extension Manifest V3
- Content script for OpenProject web UI
- Natural language parsing for task creation
- Direct integration with OpenProject API

### File Inventory

| File | Size | Last Modified | Purpose |
|------|------|---------------|---------|
| manifest.json | 966 bytes | 2025-09-24 | Chrome extension manifest |
| content.js | 10.7 KB | 2025-09-24 | Content script with NLP integration |

**Total Size:** ~11 KB

### Why Archived

#### OpenProject Shutdown (Primary Reason)

**From .project-context.md:**
```markdown
**❌ OpenProject** → ✅ ERPNext (ADR-006)
- OpenProject hosting shut down September 30, 2025
- Do NOT reference OpenProject API, clients, or configuration
```

**Timeline:**
- 2025-09-24: Last extension updates
- 2025-09-30: OpenProject hosting shut down
- 2025-10-16: Extension archived

#### Not in Package Workspaces

Extension was never added to `package.json` workspaces - standalone browser extension not part of monorepo build.

#### No ERPNext Equivalent Planned

**Current ERPNext Strategy:**
- Direct API access preferred over browser extension
- ERPNext web UI provides built-in task creation
- Custom DocTypes in flrts_extensions app (external repo)
- No need for browser extension layer

### Last Active

**Last Modified:** 2025-09-24
**Last Commit:** Related to linting/formatting
**Technology Shutdown:** 2025-09-30 (OpenProject hosting terminated)

### Extension Details

**Extension Metadata:**
```json
{
  "name": "FLRTS for OpenProject",
  "version": "0.1.0",
  "description": "Natural language task creation for OpenProject",
  "host_permissions": [
    "http://localhost:8080/*",
    "https://*.openproject.com/*",
    "https://*.openproject.org/*"
  ]
}
```

**All target environments now deprecated.**

### Recovery

```bash
# View git history
git log --all -- packages/flrts-extension/

# Restore from git
git checkout <commit-hash> -- packages/flrts-extension/
```

### Related

**ADR-006:** ERPNext/Frappe Cloud Migration (2025-09-30)
**Related Issues:** 10N-233 (Frappe Cloud migration epic), 10N-339 (sync-service archival)
**Migration Documentation:** docs/.scratch/deep-audit/migration-mapping.md

**Breadcrumb:** ARCH-015 (packages/flrts-extension/ → packages/archive/flrts-extension/)

---

## Future Archive Additions

As other packages become obsolete, they will be added to this directory with archival documentation.

**Current Active Packages:**
- `packages/nlp-service/` - Status: EVAL-001 (decision pending on ERPNext refactor)

---

**Note**: Archived packages are preserved for historical reference only. Do not use in active development.
