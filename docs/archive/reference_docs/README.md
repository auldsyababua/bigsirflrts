# Archived Reference Documentation

**Archive Date**: 2025-10-14 **Reason**: Agent prompt audit -
orphaned/superseded documentation

---

## Files in This Archive

### action-handoff.md (392 tokens)

- **Archived**: 2025-10-14
- **Reason**: Superseded by `docs/prompts/reference_docs/agent-handoff-rules.md`
- **Details**: This was a minimal handoff checklist that duplicated content from
  the comprehensive agent-handoff-rules.md reference doc. The full template in
  agent-handoff-rules.md (Template #6: Action → QA Handoff) provides all the
  same checklist items plus complete formatting and examples.

### link-orphaned-documentation.md (1,747 tokens)

- **Archived**: 2025-10-14
- **Reason**: Historical one-time task completed
- **Details**: This was specific task instructions for linking orphaned docs to
  Linear issues after the docs/erpnext/ reorganization. The task referenced
  specific Linear issues (10N-227, 10N-231) and old file paths that have since
  been updated. No longer needed as reference doc.

### module-research-and-planning.md (3,061 tokens)

- **Archived**: 2025-10-14
- **Reason**: Historical security audit workflow, not general-purpose
- **Details**: Comprehensive prompt template for researching and documenting
  security audit findings during codebase security review. Very specific to that
  workflow phase (MODULE 1-8 security audit) with CodeRabbit integration, Linear
  issue research patterns, and security-specific quality standards. Not
  applicable to current ERPNext migration work or general agentic workflows.

---

## Kept in Active Reference Docs

### module-migration-prompt.md

- **Status**: ✅ KEPT in docs/prompts/reference_docs/
- **Reason**: Useful ERPNext module development template
- **Details**: Provides reusable checklist and prompt template for building
  ERPNext modules. References current docs
  (ERPNext-Migration-Naming-Standards.md, ADR-006, Frappe Cloud deployment
  guide). Still applicable for future ERPNext development work.

---

## Related Documentation

**Active Reference Docs**: `docs/prompts/reference_docs/` **Audit Report**:
`docs/prompts/reference_docs/agent-audit-checklist.md` (Issue #3)

---

**Archive Policy**: Documents are moved here when:

1. Superseded by newer/better docs
2. Historical one-time tasks completed
3. Workflow-specific prompts no longer applicable to current work
4. Not referenced by any active agent

All content is preserved in git history for reference.
