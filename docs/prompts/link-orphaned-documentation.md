# Agent Task: Link Orphaned Documentation to Linear Issues

## Context

A documentation audit has been completed (see `docs/DOCUMENTATION-AUDIT-SUMMARY.md`). The audit identified 4 critical orphaned documents that need to be linked to Linear issues, and the ERPNext documentation has been reorganized into `docs/erpnext/`.

## Your Mission

Link the orphaned documentation to appropriate Linear issues by:

1. **Updating Linear issue descriptions** to reference the documents
2. **Verifying cross-references** within documents are correct
3. **Ensuring bidirectional linkage** (doc → Linear, Linear → doc)

## Input Files

**Primary References:**
- [`docs/ORPHANED-DOCUMENTATION-REPORT.md`](../ORPHANED-DOCUMENTATION-REPORT.md) - Lists all orphaned docs
- [`docs/LINEAR-DOCUMENTATION-MAP.md`](../LINEAR-DOCUMENTATION-MAP.md) - Current doc-to-Linear mapping
- [`docs/DOCUMENTATION-AUDIT-SUMMARY.md`](../DOCUMENTATION-AUDIT-SUMMARY.md) - Executive summary

**Key Context:**
- All ERPNext docs are now consolidated in `docs/erpnext/`
- Linear epic: [10N-227 ERPNext Backend Adoption](https://linear.app/10netzero/issue/10N-227/erpnext-backend-adoption)
- GitHub repo: `auldsyababua/bigsirflrts` on branch `feature/erpnext-adoption`

## Orphaned Documents to Link

### Priority 1: Critical Migration Workflow Docs

#### 1. ERPNext Migration Workflow
- **File:** `docs/erpnext/architecture/erpnext-migration-workflow.md`
- **Should link to:** Linear issue 10N-227 (main epic)
- **Action:** Add GitHub link to 10N-227 description section "📋 Migration Workflow:"
- **New GitHub URL:** `https://github.com/auldsyababua/bigsirflrts/blob/feature/erpnext-adoption/docs/erpnext/architecture/erpnext-migration-workflow.md`

#### 2. ERPNext Migration Naming Standards
- **File:** `docs/erpnext/ERPNext-Migration-Naming-Standards.md`
- **Should link to:** Linear issue 10N-227 (main epic)
- **Action:** Add GitHub link to 10N-227 description section "🎯 Naming Standards:"
- **New GitHub URL:** `https://github.com/auldsyababua/bigsirflrts/blob/feature/erpnext-adoption/docs/erpnext/ERPNext-Migration-Naming-Standards.md`

#### 3. Codebase Audit Report
- **File:** `docs/erpnext/codebase-audit-report.md`
- **Should link to:** Linear issue 10N-231 (Phase 1.4)
- **Action:** Add as deliverable in 10N-231 description
- **New GitHub URL:** `https://github.com/auldsyababua/bigsirflrts/blob/feature/erpnext-adoption/docs/erpnext/codebase-audit-report.md`

#### 4. Linear Audit Report
- **File:** `docs/architecture/linear-audit-erpnext-migration.md`
- **Should link to:** Linear issue 10N-227 (main epic)
- **Action:** Add to 10N-227 description under "## Documentation" section
- **GitHub URL:** `https://github.com/auldsyababua/bigsirflrts/blob/feature/erpnext-adoption/docs/architecture/linear-audit-erpnext-migration.md`

## Linear Issue Updates Required

### 10N-227: ERPNext Backend Adoption (Main Epic)

**Current Issue:** Contains OLD GitHub URLs using old paths

**Required Changes:**

1. **Update existing GitHub URLs** (find and replace):

```
OLD: docs/architecture/erpnext-migration-workflow.md
NEW: docs/erpnext/architecture/erpnext-migration-workflow.md

OLD: docs/architecture/adr/ADR-006-erpnext-backend-adoption.md
NEW: docs/erpnext/architecture/ADR-006-erpnext-backend-adoption.md

OLD: docs/ERPNext-Migration-Naming-Standards.md
NEW: docs/erpnext/ERPNext-Migration-Naming-Standards.md

OLD: docs/research/erpnext-schema-philosophy.md
NEW: docs/erpnext/research/erpnext-schema-philosophy.md

OLD: docs/research/erpnext-vs-traditional-sql.md
NEW: docs/erpnext/research/erpnext-vs-traditional-sql.md

OLD: docs/research/flrts-functional-requirements.md
NEW: docs/erpnext/research/flrts-functional-requirements.md

OLD: docs/research/erpnext-feature-mapping.md
NEW: docs/erpnext/research/erpnext-feature-mapping.md

OLD: docs/research/erpnext-doctype-patterns.md
NEW: docs/erpnext/research/erpnext-doctype-patterns.md

OLD: docs/migration/codebase-audit-report.md
NEW: docs/erpnext/codebase-audit-report.md
```

2. **Add new section** after "## Documentation":

```markdown
**📊 Project Audits:**
- [Linear Issues Audit](https://github.com/auldsyababua/bigsirflrts/blob/feature/erpnext-adoption/docs/architecture/linear-audit-erpnext-migration.md)
- [Documentation Audit Summary](https://github.com/auldsyababua/bigsirflrts/blob/feature/erpnext-adoption/docs/DOCUMENTATION-AUDIT-SUMMARY.md)
```

### 10N-231: Comprehensive Codebase Audit

**Required Changes:**

Add deliverables section:

```markdown
## Deliverables

**📄 Output:** [docs/erpnext/codebase-audit-report.md](https://github.com/auldsyababua/bigsirflrts/blob/feature/erpnext-adoption/docs/erpnext/codebase-audit-report.md)

This document provides:
- Complete inventory of code changes needed for ERPNext migration
- Module-by-module analysis organized by priority
- Effort estimates for each change
- Dependencies and sequencing requirements
```

## Tools You'll Need

**Linear MCP Server:**
- `mcp__linear-server__get_issue` - Retrieve current issue descriptions
- `mcp__linear-server__update_issue` - Update issue descriptions with new links

**Verification:**
- Read the issue first to see current content
- Make surgical edits (find-replace for path updates)
- Verify all GitHub URLs use correct branch (`feature/erpnext-adoption`)

## Success Criteria

- [ ] All 9 GitHub URLs in Linear issue 10N-227 updated to new `docs/erpnext/` paths
- [ ] Linear issue 10N-231 contains link to codebase-audit-report.md
- [ ] Audit reports linked in 10N-227 for visibility
- [ ] All GitHub URLs point to correct branch: `feature/erpnext-adoption`
- [ ] Updated `docs/LINEAR-DOCUMENTATION-MAP.md` to mark orphaned docs as "✅ Linked"

## Validation Steps

After completing the updates:

1. Click every GitHub URL in Linear issues to verify they load correctly
2. Check that relative paths in documents still work
3. Update LINEAR-DOCUMENTATION-MAP.md orphaned status:
   - Change "❌ Not linked yet" → "✅ Linked in epic" for all 4 docs
4. Commit changes to LINEAR-DOCUMENTATION-MAP.md with message:
   ```
   docs: mark orphaned documentation as linked in Linear

   All orphaned documentation from audit now linked:
   - ERPNext migration workflow → 10N-227
   - ERPNext naming standards → 10N-227
   - Codebase audit report → 10N-231
   - Linear audit report → 10N-227
   ```

## Notes

- **All file paths have changed** - don't use cached/old paths
- **GitHub URLs must include branch** - use `feature/erpnext-adoption`
- **Test links before finalizing** - click them to verify they work
- **Document structure is now cleaner** - everything ERPNext is under `docs/erpnext/`

## Context from Previous Work

**What was done:**
- Archived 18 obsolete documentation files (preserved in git history)
- Consolidated all ERPNext docs into `docs/erpnext/` directory
- Updated all internal cross-references within documentation
- Created comprehensive audit reports

**What remains:**
- Update Linear issue GitHub URLs (this task)
- Further cleanup of setup guides and QA directories (future task)
- Update docs/README.md with new structure (future task)

---

**Questions?** Check the audit reports in `docs/` for detailed context.
