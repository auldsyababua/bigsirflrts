# Archived: OpenProject Architecture Documentation

**Archived Date:** 2025-10-17
**Reason:** OpenProject backend deprecated per ADR-006 (ERPNext adoption)

## Files

### openproject-integration-strategy.md (ARCH-016)
**Original Location:** docs/architecture/openproject-integration-strategy.md
**Last Modified:** 2025-09-24
**Reason:** OpenProject replaced by ERPNext as backend platform

### openai-integration.md (ARCH-017)
**Original Location:** docs/architecture/openai-integration.md
**Last Modified:** 2025-09-24
**Reason:** References deprecated OpenProject integration and archived nlp-service

### ADR-002-openproject-migration-pattern.md (ARCH-018)
**Original Location:** docs/architecture/adr/ADR-002-openproject-migration-pattern.md
**Last Modified:** 2025-09-24
**Reason:** OpenProject database migration patterns no longer applicable

## Recovery
```bash
git log --all -- docs/architecture/openproject-integration-strategy.md
git log --all -- docs/architecture/openai-integration.md
git log --all -- docs/architecture/adr/ADR-002-openproject-migration-pattern.md
git checkout <commit-hash> -- docs/archive/architecture/<file>
```

## Related
- ADR-006: ERPNext as Backend Platform (docs/erpnext/architecture/ADR-006-erpnext-backend-adoption.md)
- Archived nlp-service: packages/archive/nlp-service/ (EVAL-001)
