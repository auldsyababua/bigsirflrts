# Archived Packages

**Archived**: 2025-10-16
**Issue**: 10N-339 - Remove OpenProject Fallback Pattern

---

## sync-service/

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

**Note**: This package is preserved for historical reference only. Do not use in active development.
