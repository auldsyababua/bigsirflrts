# Database Audit Report

## OpenProject + 10NetZero Custom Schema Investigation

**Date**: 2025-09-30 **Investigator**: Alex (DevOps Infrastructure Specialist)
**Database**: Supabase PostgreSQL (project: thnwlykidzhrsagyjncc)

---

## Executive Summary

The current database contains **225 tables** all residing in the `public`
schema, with approximately **180 OpenProject native tables** incorrectly mixed
with **~45 custom 10NetZero/FLRTS tables**. The `openproject` schema exists but
is **completely empty**.

**Critical Finding**: All OpenProject tables should be in the `openproject`
schema for proper operation, upgrade safety, and maintainability. This
misplacement creates significant technical debt and upgrade risk.

**Total Database Size**: ~185 MB (dominated by `bot_logs` at 167 MB)

---

## Current State

### Schema Distribution

| Schema        | Table Count | Status                             |
| ------------- | ----------- | ---------------------------------- |
| `public`      | 225         | ❌ Mixed OpenProject + Custom      |
| `openproject` | 0           | ❌ Empty (should have ~180 tables) |

### Table Size Analysis (Top 20)

| Table                     | Size   | Type        | Notes                                          |
| ------------------------- | ------ | ----------- | ---------------------------------------------- |
| bot_logs                  | 167 MB | Custom      | Telegram bot logging - needs archival strategy |
| sessions                  | 3.9 MB | OpenProject | User sessions                                  |
| good_jobs                 | 2.7 MB | OpenProject | Background job queue                           |
| good_job_executions       | 1.7 MB | OpenProject | Job execution history                          |
| journal_entry_lines       | 408 KB | Custom      | Accounting data                                |
| brain_bot_documents       | 392 KB | Custom      | AI/RAG document storage                        |
| workflows                 | 376 KB | OpenProject | Workflow definitions                           |
| attachments               | 328 KB | OpenProject | File attachments                               |
| work_packages             | 312 KB | OpenProject | Core issue/task data                           |
| journal_entries           | 288 KB | Custom      | Accounting journals                            |
| notification_settings     | 288 KB | OpenProject | User notification prefs                        |
| work_package_journals     | 280 KB | OpenProject | Work package audit history                     |
| tasks                     | 272 KB | Custom      | **Potential duplicate** of work_packages       |
| brain_bot_document_chunks | 232 KB | Custom      | AI RAG chunks                                  |
| meeting_agenda_items      | 224 KB | OpenProject | Meeting agendas                                |
| journals                  | 224 KB | OpenProject | Audit trail                                    |
| personnel                 | 184 KB | Custom      | Employee records                               |
| field_reports             | 160 KB | Custom      | Mining field reports                           |
| lists                     | 144 KB | Custom      | FLRTS list feature                             |
| reminders                 | 128 KB | Custom      | FLRTS reminders                                |

---

## OpenProject Table Analysis

### Core Tables (Essential for OpenProject Operation)

**Project Management** (9 tables)

- `projects`, `project_journals`, `project_queries`
- `project_storages`, `project_custom_field_project_mappings`
- `projects_types`, `last_project_folders`
- `enabled_modules`, `menu_items`

**Work Package System** (12 tables)

- `work_packages`, `work_package_journals`, `work_package_hierarchies`
- `ordered_work_packages`, `types`, `statuses`, `workflows`
- `categories`, `versions`, `version_settings`
- `relations`, `changesets`, `changesets_work_packages`

**User & Access Management** (16 tables)

- `users`, `user_passwords`, `user_preferences`, `user_profiles`
- `members`, `member_roles`, `group_users`
- `roles`, `role_permissions`
- `auth_providers`, `ldap_*` (4 tables)
- `remote_identities`, `oidc_user_session_links`
- `tokens`, `sessions`, `two_factor_authentication_devices`

**Customization** (10 tables)

- `custom_fields`, `custom_fields_projects`, `custom_fields_types`
- `custom_field_sections`, `custom_values`, `custom_options`
- `custom_actions` (5 tables for automated actions)
- `colors`, `custom_styles`

### Feature Module Tables

**Time & Cost Tracking** (10 tables)

- `time_entries`, `time_entry_journals`, `time_entry_activities_projects`
- `cost_entries`, `cost_types`, `cost_queries`
- `budgets`, `budget_journals`, `rates`
- `labor_budget_items`, `material_budget_items`

**Collaboration** (18 tables)

- `wiki_pages`, `wiki_redirects`, `wikis`, `wiki_page_journals`
- `forums`, `messages`, `message_journals`
- `meetings`, `meeting_*` (7 tables for structured meetings)
- `news`, `news_journals`, `announcements`
- `comments`

**Document & File Management** (9 tables)

- `attachments`, `attachment_journals`, `attachable_journals`
- `documents`, `document_journals`
- `storages`, `project_storages`, `file_links`
- `storages_file_links_journals`

**BIM/BCF Integration** (4 tables)

- `bcf_issues`, `bcf_comments`, `bcf_viewpoints`
- `ifc_models`

**Source Control Integration** (12 tables)

- `github_pull_requests`, `github_check_runs`, `github_users`
- `github_pull_requests_work_packages`
- `gitlab_issues`, `gitlab_merge_requests`, `gitlab_pipelines`
- `gitlab_users`, `gitlab_*_work_packages` (2 tables)
- `repositories`, `changes`

**Notification & Webhooks** (11 tables)

- `notifications`, `notification_settings`
- `watchers`, `favorites`
- `webhooks_webhooks`, `webhooks_events`, `webhooks_logs`
- `webhooks_projects`
- `ical_token_query_assignments`

### System/Infrastructure Tables (12 tables)

- `schema_migrations`, `ar_internal_metadata` (Rails framework)
- `good_jobs`, `good_job_*` (4 tables for background jobs)
- `job_statuses`, `exports`
- `settings`, `enterprise_tokens`
- `paper_trail_audits` (audit logging)
- `recaptcha_entries`

**Authentication/OAuth** (10 tables)

- `oauth_applications`, `oauth_access_grants`, `oauth_access_tokens`
- `oauth_clients`, `oauth_client_tokens`

### Query/View System (6 tables)

- `queries`, `views`, `grids`, `grid_widgets`
- `non_working_days`
- `deploy_status_checks`, `deploy_targets`

### Other Features (8 tables)

- `enumerations` (global lists)
- `design_colors`
- Various journals and change tracking

**Total OpenProject Tables**: ~180

---

## Custom Table Analysis

### Business Reference Tables (9 tables)

| Table                      | Purpose                                       | OpenProject Alternative?                                     |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `sites`                    | Mining sites (name, code, location, operator) | ❌ **KEEP** - Use as OpenProject Projects with custom fields |
| `site_aliases`             | Alternative site names                        | ✅ Could use custom field or project description             |
| `site_partner_assignments` | Partner-site relationships                    | ⚠️ Could use work package relations or custom fields         |
| `site_vendor_assignments`  | Vendor-site assignments                       | ⚠️ Could use work package relations or custom fields         |
| `personnel`                | Employees + Telegram user IDs + roles         | ❌ **KEEP** - OpenProject `users` lacks Telegram integration |
| `operators`                | Site operators                                | ⚠️ Could be custom field on projects                         |
| `partners`                 | Partner organizations                         | ⚠️ Could use custom list field                               |
| `vendors`                  | Vendor organizations                          | ⚠️ Could use custom list field                               |
| `companies`                | Company entities for accounting               | ❌ **KEEP** - Required for accounting module                 |

**Recommendation**: Keep `sites`, `personnel`, `companies`. Others could
potentially be replaced by OpenProject custom fields or relations.

### Mining Equipment/Assets (2 tables)

| Table       | Purpose                        | OpenProject Alternative?                    |
| ----------- | ------------------------------ | ------------------------------------------- |
| `asics`     | ASIC mining hardware inventory | ⚠️ Could use work packages with custom type |
| `equipment` | Other mining equipment         | ⚠️ Could use work packages with custom type |

**Recommendation**: These could potentially be modeled as work package types
(e.g., "Asset" type) with custom fields for serial numbers, vendors, etc.

### Field Reporting System (4 tables)

| Table                     | Purpose                               | OpenProject Alternative?                            |
| ------------------------- | ------------------------------------- | --------------------------------------------------- |
| `field_reports`           | Daily field reports from mining sites | ⚠️ Could use work packages with type "Field Report" |
| `field_report_edits`      | Edit history                          | ✅ OpenProject has native journal system            |
| `field_reports_asics`     | ASICs mentioned in reports            | ⚠️ Could use work package relations                 |
| `field_reports_equipment` | Equipment mentioned in reports        | ⚠️ Could use work package relations                 |

**Recommendation**: Strong candidate for migration to OpenProject work packages.
The journal system already tracks edits.

### FLRTS Interface Tables (7 tables)

| Table                      | Purpose                        | OpenProject Alternative?                     |
| -------------------------- | ------------------------------ | -------------------------------------------- |
| `lists`                    | FLRTS list management feature  | ❌ **KEEP** - No OpenProject equivalent      |
| `list_items`               | Items within lists             | ❌ **KEEP** - Part of FLRTS feature          |
| `reminders`                | FLRTS reminder system          | ⚠️ OpenProject has due dates + notifications |
| `tasks`                    | **Cached work_packages?**      | ✅ **REMOVE** - Query OpenProject directly   |
| `task_assignment_history`  | Task assignment audit          | ✅ OpenProject journals track this           |
| `flrts_users`              | FLRTS user profiles            | ❌ **KEEP** - Links personnel to Telegram    |
| `openproject_user_mapping` | Maps FLRTS → OpenProject users | ❌ **KEEP** - Critical integration table     |

**Recommendation**:

- **Remove `tasks`** - appears to be denormalized cache of work_packages
- **Remove `task_assignment_history`** - OpenProject journals handle this
- Keep `lists`, `list_items` (unique feature)
- Keep `flrts_users`, `openproject_user_mapping` (integration glue)
- Evaluate `reminders` - could leverage OpenProject notifications

### Licensing & Agreements (4 tables)

| Table                          | Purpose                     | OpenProject Alternative?                            |
| ------------------------------ | --------------------------- | --------------------------------------------------- |
| `licenses_agreements`          | License agreement tracking  | ⚠️ Could use work packages type "License Agreement" |
| `licenses_agreements_partners` | Partners on agreements      | ⚠️ Could use relations or custom fields             |
| `licenses_agreements_sites`    | Sites covered by agreements | ⚠️ Could use relations or custom fields             |
| `licenses_agreements_vendors`  | Vendors on agreements       | ⚠️ Could use relations or custom fields             |

**Recommendation**: Could be modeled as work packages with relations to
sites/partners/vendors.

### Accounting/Financial (13 tables)

| Table                           | Purpose                      | OpenProject Alternative?             |
| ------------------------------- | ---------------------------- | ------------------------------------ |
| `chart_of_accounts`             | Accounting chart of accounts | ❌ **KEEP** - Specialized accounting |
| `journal_entries`               | Accounting journal entries   | ❌ **KEEP** - Specialized accounting |
| `journal_entry_lines`           | Journal line items           | ❌ **KEEP** - Specialized accounting |
| `general_ledger`                | General ledger postings      | ❌ **KEEP** - Specialized accounting |
| `financial_statement_snapshots` | Financial snapshots          | ❌ **KEEP** - Specialized accounting |
| `trial_balance_snapshots`       | Trial balance snapshots      | ❌ **KEEP** - Specialized accounting |
| `accounting_customers`          | Customer accounting          | ❌ **KEEP** - Specialized accounting |
| `accounting_employees`          | Employee accounting          | ❌ **KEEP** - Specialized accounting |
| `partner_billings`              | Partner billing records      | ❌ **KEEP** - Specialized accounting |
| `vendor_invoices`               | Vendor invoices              | ❌ **KEEP** - Specialized accounting |
| `labor_budget_items`            | Labor budget                 | ⚠️ OpenProject has budgets module    |
| `material_budget_items`         | Material budget              | ⚠️ OpenProject has budgets module    |

**Recommendation**: Keep all specialized accounting tables. Labor/material
budget items could potentially use OpenProject's budget module, but keep for
now.

### Operations/Logging (4 tables)

| Table                | Purpose                        | OpenProject Alternative?               |
| -------------------- | ------------------------------ | -------------------------------------- |
| `bot_logs`           | Telegram bot logging (167 MB!) | ❌ **KEEP** but implement archival     |
| `parsing_logs`       | NLP parsing logs               | ❌ **KEEP**                            |
| `notifications_log`  | Notification delivery log      | ⚠️ OpenProject has notification system |
| `markup_changes_log` | Pricing markup audit           | ❌ **KEEP** - Business specific        |

**Recommendation**: Keep logging tables but implement archival strategy for
`bot_logs` (currently 167 MB).

### AI/Brain Bot (3 tables)

| Table                       | Purpose              | OpenProject Alternative?        |
| --------------------------- | -------------------- | ------------------------------- |
| `brain_bot_documents`       | RAG document storage | ❌ **KEEP** - Custom AI feature |
| `brain_bot_document_chunks` | RAG chunks           | ❌ **KEEP** - Custom AI feature |
| `brain_bot_media_files`     | Media files          | ❌ **KEEP** - Custom AI feature |

**Recommendation**: Keep all - custom AI/RAG implementation.

### Views

Multiple `*_view` and `*_with_details` views provide convenient data access.
These should be recreated after schema migration.

---

## Foreign Key Relationships

### Critical Cross-Schema Dependencies

**Custom → OpenProject References** (requires careful handling):

- `field_report_edits.author_user_id` → `flrts_users.id`
- `field_reports.submitted_by_user_id` → `flrts_users.id`
- `flrts_users.personnel_id` → `personnel.id`
- `openproject_user_mapping.supabase_user_id` → `flrts_users.id`
- Many custom tables → `sites.id`
- Several tables → `partners.id`, `vendors.id`

**Custom → Custom References** (safe to move together):

- Accounting module internal references
- Field report relationships
- FLRTS internal relationships
- Equipment/asset relationships

**OpenProject Internal** (all move to openproject schema):

- `work_packages` → `projects`, `types`, `statuses`
- `members` → `users`, `roles`, `projects`
- Various `*_journals` → `journals`
- Extensive internal dependencies

---

## Key Findings

### 1. **Schema Misplacement Risk** ⚠️

OpenProject expects its tables in the `openproject` schema. Having them in
`public` schema:

- **Breaks upgrade assumptions** - OpenProject migration squashing process
  expects specific schema
- **Complicates backups** - Can't selectively backup OpenProject vs custom data
- **Pollutes public schema** - Makes understanding database structure difficult
- **May cause future conflicts** - OpenProject updates could introduce naming
  conflicts

### 2. **Potential Data Duplication** ⚠️

The `tasks` table (272 KB) appears to duplicate `work_packages` data:

- Both have similar structures
- `tasks` has foreign keys to `flrts_users` and `field_reports`
- Likely a denormalized cache for performance
- **Recommendation**: Evaluate if still needed or if API/materialized view would
  suffice

### 3. **Logging Data Growth** ⚠️

`bot_logs` at 167 MB (90% of total database):

- **Immediate need**: Archival strategy (e.g., move logs older than 90 days to
  cold storage)
- **Recommendation**: Implement log rotation policy

### 4. **Underutilized OpenProject Features** ℹ️

Several custom tables could leverage native OpenProject capabilities:

- **Custom fields**: Could replace some reference tables (vendors, partners as
  lists)
- **Work package types**: Could model equipment, field reports, license
  agreements
- **Journals**: Already track all changes - `field_report_edits` redundant
- **Budget module**: Could handle labor/material budget items
- **Relations**: Could replace many junction tables

### 5. **Integration Points** ✅

Clean separation exists between:

- **OpenProject native** - User, project, work package management
- **Business domain** - Mining sites, personnel, equipment, accounting
- **FLRTS interface** - Telegram bot integration layer
- **AI/Brain Bot** - RAG document processing

**Key integration tables**:

- `openproject_user_mapping` (links systems)
- `flrts_users` (extends personnel with Telegram data)
- Foreign keys from custom tables to OpenProject users/projects

---

## Recommendations Summary

### Must Keep (Business Critical)

1. **All accounting tables** (13 tables) - specialized domain
2. **Personnel, sites, companies** - business entities
3. **FLRTS interface** - lists, flrts_users, openproject_user_mapping
4. **AI/Brain Bot** - custom RAG implementation
5. **Logging tables** - operational data (with archival)

### Candidates for Migration to OpenProject

1. **Field reports** → Work package type "Field Report"
2. **License agreements** → Work package type "License Agreement"
3. **Equipment/ASICs** → Work package type "Asset" with custom fields
4. **Reminders** → OpenProject due dates + notifications

### Candidates for Removal/Consolidation

1. **`tasks` table** - likely denormalized cache, query work_packages directly
2. **`task_assignment_history`** - OpenProject journals handle this
3. **`field_report_edits`** - OpenProject journals handle this
4. **Some junction tables** - could use OpenProject relations

### Operational Improvements

1. **Implement log archival** for `bot_logs` (currently 167 MB)
2. **Add database monitoring** for table growth
3. **Create regular backup strategy** separating OpenProject vs custom data

---

## Next Steps

1. Review recommendations with product/architecture team
2. Decide on schema organization strategy (see separate recommendation doc)
3. Develop migration plan with rollback strategy
4. Test migration on staging environment with full data
5. Plan for zero-downtime or maintenance window execution
