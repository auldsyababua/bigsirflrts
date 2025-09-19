# Summary

- What does this change do and why?

## Linked Issues

- Closes #

## BMAD Method Compliance

- [ ] Read `.bmad-core/core-config.yaml` and devLoadAlwaysFiles
- [ ] Reviewed ADRs and aligned design:
  - [ ] `docs/architecture/adr/ADR-001-n8n-deployment-mode.md`
  - [ ] `docs/architecture/adr/ADR-002-openproject-migration-pattern.md`
- [ ] Architecture-affecting changes reference/update ADRs as needed
- [ ] QA Gate evidence attached (run `bash scripts/bmad-qa-gate.sh` or
      `npm run qa:gate` and paste summary)

## Tests & Quality

- [ ] Unit/Integration/E2E updated for this change
- [ ] P0 coverage maintained/added where applicable (`@P0`)
- [ ] `npm run lint` ✅
- [ ] `npm run format:check` ✅
- [ ] `npm run test:mvp` ✅

## Security & Config

- [ ] No secrets committed (`.env*` excluded); sensitive values documented
- [ ] Single Supabase database only (no new Postgres containers)
- [ ] n8n remains single-instance (no Redis/workers) unless justified by ADR

## Docs

- [ ] Updated `docs/architecture/` and/or `docs/stories/` if behavior or
      architecture changed

## Screenshots/Logs (optional)

-
-

## Deployment Notes

- Steps, migrations, or toggles required

## Rollback Plan

- How to revert safely if needed
