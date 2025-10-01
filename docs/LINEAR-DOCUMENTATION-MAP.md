# Linear Documentation Map

**Last updated:** 2025-10-01 **Source of Truth:** Linear Epic
[10N-227](https://linear.app/10netzero/issue/10N-227/erpnext-backend-adoption)
**Purpose:** Systematic mapping of all documentation to Linear issues

**Audit Status:** ✅ **COMPLETED** - 2025-10-01

**Related Reports:**

- [DOCUMENTATION-AUDIT-SUMMARY.md](DOCUMENTATION-AUDIT-SUMMARY.md) - Executive
  summary and recommendations
- [ORPHANED-DOCUMENTATION-REPORT.md](ORPHANED-DOCUMENTATION-REPORT.md) -
  Analysis of 4 orphaned documents
- [MISSING-DOCUMENTATION-REPORT.md](MISSING-DOCUMENTATION-REPORT.md) - Tracking
  for 15 missing documents

---

## ERPNext Migration Documentation (Active)

### Architecture & ADRs

| Document                                                                                                                  | Purpose                                    | Related Linear Issues | Status                 |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------- | ---------------------- |
| [docs/erpnext/architecture/ADR-006-erpnext-backend-adoption.md](erpnext/architecture/ADR-006-erpnext-backend-adoption.md) | ERPNext migration decision record          | 10N-227               | ✅ Linked in epic      |
| [docs/erpnext/architecture/erpnext-migration-workflow.md](erpnext/architecture/erpnext-migration-workflow.md)             | Detailed migration workflow                | 10N-227               | ✅ Linked in epic      |
| [docs/architecture/linear-audit-erpnext-migration.md](architecture/linear-audit-erpnext-migration.md)                     | Linear audit report for ERPNext transition | 10N-227               | ✅ Referenced in audit |

### Standards & Critical Docs

| Document                                                                                            | Purpose                                   | Related Linear Issues         | Status            |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------- | ----------------- |
| [docs/erpnext/ERPNext-Migration-Naming-Standards.md](erpnext/ERPNext-Migration-Naming-Standards.md) | Naming conventions for all migration work | 10N-227, All Phase 1+ stories | ✅ Linked in epic |

### Research & Planning (Phase 1 Templates)

| Document                                                                                                    | Purpose                             | Related Linear Issues | Status            |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------- | ----------------- |
| [docs/erpnext/research/erpnext-schema-philosophy.md](erpnext/research/erpnext-schema-philosophy.md)         | Phase 1.1 research template         | 10N-228               | ✅ Linked in epic |
| [docs/erpnext/research/erpnext-vs-traditional-sql.md](erpnext/research/erpnext-vs-traditional-sql.md)       | Phase 1.1 research template         | 10N-228               | ✅ Linked in epic |
| [docs/erpnext/research/flrts-functional-requirements.md](erpnext/research/flrts-functional-requirements.md) | Phase 1.2 requirements template     | 10N-229               | ✅ Linked in epic |
| [docs/erpnext/research/erpnext-feature-mapping.md](erpnext/research/erpnext-feature-mapping.md)             | Phase 1.2 feature mapping template  | 10N-229               | ✅ Linked in epic |
| [docs/erpnext/research/erpnext-doctype-patterns.md](erpnext/research/erpnext-doctype-patterns.md)           | Phase 1.3 DocType patterns template | 10N-230               | ✅ Linked in epic |
| [docs/erpnext/codebase-audit-report.md](erpnext/codebase-audit-report.md)                                   | Phase 1.4 codebase audit template   | 10N-231               | ✅ Linked in epic |

**Note:** These templates are intentionally empty and will be filled during
Phase 1 execution.

---

## Historical/Superseded Documentation

### OpenProject Documentation (Archived Context)

| Document                                                                                                                    | Purpose                        | Notes                             | Status        |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------- | ------------- |
| [docs/architecture/adr/ADR-002-openproject-migration-pattern.md](architecture/adr/ADR-002-openproject-migration-pattern.md) | OpenProject migration decision | Superseded by ADR-006             | 📦 Historical |
| [docs/architecture/adr/ADR-003-supabase-connection-pooling.md](architecture/adr/ADR-003-supabase-connection-pooling.md)     | Supabase connection patterns   | Still applies to ERPNext          | ✅ Active     |
| [docs/architecture/openproject-integration-strategy.md](architecture/openproject-integration-strategy.md)                   | OpenProject integration guide  | Superseded by ERPNext workflow    | 📦 Historical |
| [docs/deployment/OPENPROJECT_DEPLOYMENT.md](deployment/OPENPROJECT_DEPLOYMENT.md)                                           | OpenProject deployment guide   | Historical reference only         | 📦 Historical |
| [docs/setup/openproject.md](setup/openproject.md)                                                                           | OpenProject setup instructions | Superseded by ERPNext setup (TBD) | 📦 Historical |

### OpenProject Stories (Historical)

| Document                                                                                        | Purpose                     | Notes                        | Related Linear    |
| ----------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------- | ----------------- |
| [docs/stories/1.9.openproject-schema-migration.md](stories/1.9.openproject-schema-migration.md) | OpenProject schema work     | Cancelled/superseded         | 10N-159 (closed)  |
| [docs/stories/3.1.openproject-api-workflows.md](stories/3.1.openproject-api-workflows.md)       | OpenProject API integration | Updated to ERPNext in Linear | 10N-157 (updated) |

---

## Active Documentation (Non-Migration)

### Architecture & Core Docs

| Document                                                                                                | Purpose                      | Related Linear Issues   | Status    |
| ------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------- | --------- |
| [docs/architecture/architecture-overview.md](architecture/architecture-overview.md)                     | System architecture overview | General reference       | ✅ Active |
| [docs/architecture/mvp-architecture.md](architecture/mvp-architecture.md)                               | MVP architecture design      | MVP stories             | ✅ Active |
| [docs/architecture/system-connections.md](architecture/system-connections.md)                           | Integration map              | All integration stories | ✅ Active |
| [docs/architecture/tech-stack.md](architecture/tech-stack.md)                                           | Technology choices           | General reference       | ✅ Active |
| [docs/architecture/source-tree.md](architecture/source-tree.md)                                         | Codebase structure           | Developer reference     | ✅ Active |
| [docs/architecture/api-contract.md](architecture/api-contract.md)                                       | API specifications           | API stories             | ✅ Active |
| [docs/architecture/coding-standards.md](architecture/coding-standards.md)                               | Code style guide             | All development         | ✅ Active |
| [docs/architecture/adr/ADR-001-n8n-deployment-mode.md](architecture/adr/ADR-001-n8n-deployment-mode.md) | n8n deployment decision      | n8n setup               | ✅ Active |
| [docs/architecture/adr/ADR-005-mvp-scope-reduction.md](architecture/adr/ADR-005-mvp-scope-reduction.md) | MVP scope decision           | MVP planning            | ✅ Active |

### Product & Requirements

| Document                                                          | Purpose              | Related Linear Issues               | Status    |
| ----------------------------------------------------------------- | -------------------- | ----------------------------------- | --------- |
| [docs/prd/prd.md](prd/prd.md)                                     | Product requirements | Epic-level planning                 | ✅ Active |
| [docs/prd/Telegram-Bot-UX-Flows.md](prd/Telegram-Bot-UX-Flows.md) | Telegram UX design   | Telegram stories (10N-155, 10N-156) | ✅ Active |

### Active Stories

| Document                                                                                        | Purpose                      | Related Linear Issues | Status           |
| ----------------------------------------------------------------------------------------------- | ---------------------------- | --------------------- | ---------------- |
| [docs/stories/2.1.telegram-task-creation.md](stories/2.1.telegram-task-creation.md)             | Telegram task creation story | 10N-155               | ✅ Linked        |
| [docs/stories/2.2.telegram-command-parser.md](stories/2.2.telegram-command-parser.md)           | Command parser story         | 10N-156               | ⚠️ Check linkage |
| [docs/stories/3.2.openai-context-injection-mvp.md](stories/3.2.openai-context-injection-mvp.md) | OpenAI integration story     | 10N-158               | ⚠️ Check linkage |
| [docs/stories/MVP-STORY-PLAN.md](stories/MVP-STORY-PLAN.md)                                     | MVP story overview           | MVP epic              | ✅ Active        |

### Setup & Integration

| Document                                                                              | Purpose               | Related Linear Issues | Status    |
| ------------------------------------------------------------------------------------- | --------------------- | --------------------- | --------- |
| [docs/setup/linear-integration.md](setup/linear-integration.md)                       | Linear setup guide    | DevOps/setup          | ✅ Active |
| [docs/setup/telegram-bot.md](setup/telegram-bot.md)                                   | Telegram bot setup    | Telegram stories      | ✅ Active |
| [docs/setup/webhook-integration.md](setup/webhook-integration.md)                     | Webhook configuration | Integration stories   | ✅ Active |
| [docs/monitoring/webhook-monitoring-setup.md](monitoring/webhook-monitoring-setup.md) | Monitoring webhooks   | Monitoring/DevOps     | ✅ Active |

### QA & Testing

| Document                                                                                                        | Purpose                     | Related Linear Issues | Status      |
| --------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------- | ----------- |
| [docs/qa/epic-1-completion-summary.md](qa/epic-1-completion-summary.md)                                         | Epic 1 QA summary           | Epic 1 retrospective  | ✅ Complete |
| [docs/qa/assessments/1.1-test-design-mvp-20250109.md](qa/assessments/1.1-test-design-mvp-20250109.md)           | Story 1.1 test design       | Story 1.1             | ✅ Complete |
| [docs/qa/assessments/1.7-test-design-20250916.md](qa/assessments/1.7-test-design-20250916.md)                   | Story 1.7 test design       | Story 1.7             | ✅ Complete |
| [docs/qa/assessments/1.7-trace-20250916.md](qa/assessments/1.7-trace-20250916.md)                               | Story 1.7 trace             | Story 1.7             | ✅ Complete |
| [docs/qa/assessments/infra.002-test-design-20250926.md](qa/assessments/infra.002-test-design-20250926.md)       | Infra story test design     | INFRA-002             | ✅ Complete |
| [docs/qa/assessments/infra.002-trace-20250926.md](qa/assessments/infra.002-trace-20250926.md)                   | Infra story trace           | INFRA-002             | ✅ Complete |
| [docs/qa/assessments/infra.002-risk-20250926.md](qa/assessments/infra.002-risk-20250926.md)                     | Infra story risk assessment | INFRA-002             | ✅ Complete |
| [docs/qa/assessments/testing-debt-assessment.md](qa/assessments/testing-debt-assessment.md)                     | Testing debt analysis       | QA planning           | ✅ Active   |
| [docs/qa/assessments/container-naming-audit.md](qa/assessments/container-naming-audit.md)                       | Container naming review     | INFRA-002             | ✅ Complete |
| [docs/qa/assessments/e2e-test-bug-investigation-report.md](qa/assessments/e2e-test-bug-investigation-report.md) | E2E test debugging          | Test infrastructure   | ✅ Complete |
| [docs/qa/templates/retroactive-test-design-template.md](qa/templates/retroactive-test-design-template.md)       | QA template                 | QA process            | ✅ Active   |
| [docs/qa/test-scenarios/1.1-mvp-scenarios.md](qa/test-scenarios/1.1-mvp-scenarios.md)                           | MVP test scenarios          | MVP testing           | ✅ Active   |
| [docs/qa/implementation/mvp-test-implementation-guide.md](qa/implementation/mvp-test-implementation-guide.md)   | Test implementation         | Testing stories       | ✅ Active   |

### Infrastructure & DevOps

| Document                                                                          | Purpose                         | Related Linear Issues | Status      |
| --------------------------------------------------------------------------------- | ------------------------------- | --------------------- | ----------- |
| [docs/infrastructure/port-binding-audit.md](infrastructure/port-binding-audit.md) | Port allocation review          | Infrastructure        | ✅ Active   |
| [docs/security/SECURITY-REVIEW.md](security/SECURITY-REVIEW.md)                   | Security audit                  | Security stories      | ✅ Active   |
| [docs/security/IMPLEMENTATION-SUMMARY.md](security/IMPLEMENTATION-SUMMARY.md)     | Security implementation summary | Security completion   | ✅ Complete |

### Development Guides

| Document                                                                          | Purpose                  | Related Linear Issues    | Status    |
| --------------------------------------------------------------------------------- | ------------------------ | ------------------------ | --------- |
| [docs/architecture/implementation-guide.md](architecture/implementation-guide.md) | Implementation patterns  | Developer reference      | ✅ Active |
| [docs/architecture/openai-integration.md](architecture/openai-integration.md)     | OpenAI integration guide | OpenAI stories (10N-158) | ✅ Active |

---

## Post-MVP Documentation (Future)

| Document                                                                                                                              | Purpose                 | Related Linear Issues              | Status      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------- | ----------- |
| [docs/stories/post-mvp/1.6.redis-queue-configuration.md](stories/post-mvp/1.6.redis-queue-configuration.md)                           | Redis queue story       | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/2.2.telegram-reminder-system.md](stories/post-mvp/2.2.telegram-reminder-system.md)                             | Reminder feature        | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/2.3.telegram-inline-keyboards.md](stories/post-mvp/2.3.telegram-inline-keyboards.md)                           | Telegram UI enhancement | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/2.4.error-recovery.md](stories/post-mvp/2.4.error-recovery.md)                                                 | Error handling          | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/2.6.telegram-user-context.md](stories/post-mvp/2.6.telegram-user-context.md)                                   | User context management | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/3.2.openproject-webhooks.md](stories/post-mvp/3.2.openproject-webhooks.md)                                     | Webhook enhancements    | Post-MVP (may need ERPNext update) | 📅 Future   |
| [docs/stories/post-mvp/3.3.batch-sync-workflows.md](stories/post-mvp/3.3.batch-sync-workflows.md)                                     | Batch sync              | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/3.5.timezone-conversion-logic.md](stories/post-mvp/3.5.timezone-conversion-logic.md)                           | Timezone handling       | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/4.1.lists-interface.md](stories/post-mvp/4.1.lists-interface.md)                                               | Lists feature           | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/4.2.list-commands.md](stories/post-mvp/4.2.list-commands.md)                                                   | List commands           | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/4.3.list-templates-system.md](stories/post-mvp/4.3.list-templates-system.md)                                   | List templates          | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/4.4.list-sharing-permissions.md](stories/post-mvp/4.4.list-sharing-permissions.md)                             | List sharing            | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/4.5.list-notifications.md](stories/post-mvp/4.5.list-notifications.md)                                         | List notifications      | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/INFRA-001-directory-consolidation.md](stories/post-mvp/INFRA-001-directory-consolidation.md)                   | Infrastructure cleanup  | Post-MVP                           | 📅 Future   |
| [docs/stories/post-mvp/INFRA-002-container-naming-standardization.md](stories/post-mvp/INFRA-002-container-naming-standardization.md) | Container naming        | Completed                          | ✅ Complete |

---

## Scratch/Working Documents (Temporary)

| Document                                                                                | Purpose              | Notes       |
| --------------------------------------------------------------------------------------- | -------------------- | ----------- |
| [docs/.scratch/devops-investigation-report.md](.scratch/devops-investigation-report.md) | DevOps investigation | Working doc |
| [docs/.scratch/schema-migration-analysis.md](.scratch/schema-migration-analysis.md)     | Schema analysis      | Working doc |
| [docs/.scratch/.archive/\*.md](.scratch/.archive/)                                      | Old analysis files   | Archived    |

---

## Audit/Planning Documents

| Document                                                                                              | Purpose                                   | Related Linear Issues | Status      |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------- | ----------- |
| [docs/architecture/audit-log.md](architecture/audit-log.md)                                           | Change tracking                           | General               | ✅ Active   |
| [docs/architecture/audit-plan.md](architecture/audit-plan.md)                                         | Audit planning                            | General               | ✅ Active   |
| [docs/architecture/final-audit-summary.md](architecture/final-audit-summary.md)                       | Audit summary                             | Audit completion      | ✅ Complete |
| [docs/LINEAR-DOCUMENTATION-MAP.md](LINEAR-DOCUMENTATION-MAP.md)                                       | Complete documentation inventory          | 10N-228               | ✅ Active   |
| [docs/DOCUMENTATION-AUDIT-SUMMARY.md](DOCUMENTATION-AUDIT-SUMMARY.md)                                 | Documentation audit executive summary     | 10N-228               | ✅ Complete |
| [docs/ORPHANED-DOCUMENTATION-REPORT.md](ORPHANED-DOCUMENTATION-REPORT.md)                             | Analysis of 4 documents with weak linkage | 10N-228               | ✅ Complete |
| [docs/MISSING-DOCUMENTATION-REPORT.md](MISSING-DOCUMENTATION-REPORT.md)                               | Tracking for 15 missing documents         | 10N-228               | ✅ Complete |
| [docs/architecture/linear-audit-erpnext-migration.md](architecture/linear-audit-erpnext-migration.md) | Linear audit report for ERPNext migration | 10N-227               | ✅ Complete |

---

## Missing Documentation (Referenced but Not Created)

Based on Linear issues and workflow documents, these docs are referenced but
don't exist yet:

| Expected Document                                      | Purpose                   | Related Linear | Priority |
| ------------------------------------------------------ | ------------------------- | -------------- | -------- |
| `docs/erpnext/research/erpnext-fsm-module-analysis.md` | Phase 1.3 FSM analysis    | 10N-230        | Phase 1  |
| `docs/prompts/module-migration-prompt.md`              | Module migration template | Phase 1.4      | Phase 1  |
| `docs/migration/schema-mapping.md`                     | Schema mapping doc        | 10N-232        | Phase 1  |
| `docs/migration/data-migration-strategy.md`            | Data migration plan       | 10N-232        | Phase 1  |
| `docs/migration/custom-doctypes-design.md`             | Custom DocType design     | Phase 2.1      | Phase 2  |
| `docs/migration/custom-fields-standard-doctypes.md`    | Custom fields doc         | Phase 2.1      | Phase 2  |
| `docs/migration/data-audit-report.md`                  | Production data audit     | Phase 2.2      | Phase 2  |
| `docs/migration/data-transformation-logic.md`          | Transformation logic      | Phase 2.2      | Phase 2  |
| `docs/migration/migration-scripts-guide.md`            | Migration scripts doc     | Phase 2.3      | Phase 2  |
| `docs/migration/test-migration-report.md`              | Test migration results    | Phase 2.4      | Phase 2  |
| `docs/migration/rollback-procedure.md`                 | Rollback procedures       | Phase 2.4      | Phase 2  |
| `docs/migration/sync-service-migration-plan.md`        | sync-service plan         | Phase 3.2      | Phase 3  |
| `docs/migration/telegram-bot-migration-plan.md`        | Telegram bot plan         | Phase 3.2      | Phase 3  |
| `docs/migration/n8n-workflows-migration-plan.md`       | n8n workflows plan        | Phase 3.2      | Phase 3  |
| `docs/development/erpnext-client-api.md`               | API client docs           | Phase 3.1      | Phase 3  |

---

## Orphaned Documentation (No Clear Linear Linkage)

All previously orphaned migration documents have been linked to Linear issues.

### Remaining Orphaned Documents

| Document                                                                              | Purpose         | Recommendation                          |
| ------------------------------------------------------------------------------------- | --------------- | --------------------------------------- |
| [docs/architecture/ui2-future-integration.md](architecture/ui2-future-integration.md) | Future UI plans | Create Linear story or mark as archived |
| [docs/README.md](README.md)                                                           | Docs overview   | Update with ERPNext migration context   |
| [docs/prd/README.md](prd/README.md)                                                   | PRD index       | Ensure up to date                       |
| [docs/setup/README.md](setup/README.md)                                               | Setup index     | Update for ERPNext                      |

---

## Recommendations

### Immediate Actions (Phase 1)

1. **Update Phase 1 Linear Stories (10N-228 to 10N-232)**
   - Add "Deliverables" sections linking to template files
   - Example format provided below

2. **Create Missing Phase 1 Deliverables**
   - `docs/erpnext/research/erpnext-fsm-module-analysis.md` (Phase 1.3)
   - `docs/prompts/module-migration-prompt.md` (Phase 1.4)

3. **Link Active Stories to Docs**
   - Verify 10N-156, 10N-158 link to story files
   - Update story docs if ERPNext changes needed

### Future Actions (Phase 2+)

1. **Create Phase 2+ Documentation Structure**
   - All docs listed in "Missing Documentation" section
   - Follow naming standards religiously

2. **Archive Obsolete Docs**
   - Move OpenProject docs to `docs/archive/openproject/`
   - Add README explaining historical context

3. **Update Orphaned Docs**
   - Link to Linear or deprecate
   - Update setup guides for ERPNext

---

## Phase 1 Linear Story Update Template

### For 10N-228: Deploy ERPNext dev instance

Add this section to the issue description:

```markdown
## Deliverables

Research output documents:

- Deployment steps documented in issue comments
- Admin credentials stored in 1Password
- ERPNext dev instance accessible at https://ops.10nz.tools

This task does NOT produce a separate markdown file - deployment steps are
documented inline.
```

### For 10N-229: Connect ERPNext to Supabase

Add this section:

```markdown
## Deliverables

Connection configuration documented in issue comments. Must answer:

- How to configure DATABASE_URL for Supabase
- Performance baseline metrics
- Connection pool settings

No separate documentation file - technical details captured in issue.
```

### For 10N-230: Test ERPNext FSM module

Add this section:

```markdown
## Deliverables

Research output document:
[docs/erpnext/research/erpnext-fsm-module-analysis.md](erpnext/research/erpnext-fsm-module-analysis.md)

This document must answer:

- What FSM features exist in ERPNext?
- Which features map to FLRTS needs?
- Screenshots of key workflows
- List of any missing features
```

### For 10N-231: Validate ERPNext API integration

Add this section:

```markdown
## Deliverables

Technical validation artifacts:

- Postman collection with API examples
- API performance metrics (< 200ms target)
- POC code for Telegram bot → ERPNext
- POC code for n8n → ERPNext webhook

Documentation captured in issue comments and POC repositories.
```

### For 10N-232: Create schema mapping document

Add this section:

```markdown
## Deliverables

Research output documents:

- [docs/migration/schema-mapping.md](../../docs/migration/schema-mapping.md)
- [docs/migration/data-migration-strategy.md](../../docs/migration/data-migration-strategy.md)

These documents must answer:

- How does FLRTS schema map to ERPNext DocTypes?
- What data transformations are needed?
- Migration strategy for each entity type
- Estimated migration complexity and time
```

---

## Legend

- ✅ **Active** - Document is current and actively used
- ❌ **Not linked yet** - Document exists but not referenced in Linear
- ⚠️ **Check linkage** - Linkage needs verification
- 📦 **Historical** - Archived for context, superseded by newer docs
- 📅 **Future** - Planned for post-MVP phases

---

**Maintained by:** Automated audit process **Next review:** After Phase 1
completion
