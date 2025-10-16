# Database Table Categorization Analysis

## OpenProject Native Tables (Identified Patterns)

Based on OpenProject documentation and common patterns:

### Core OpenProject Tables (~180 tables)

- `work_packages`, `work_package_*` (core issue tracking)
- `projects`, `project_*` (project management)
- `users`, `user_*`, `members`, `member_*`, `group_*` (user/permission
  management)
- `types`, `statuses`, `workflows`, `roles`, `role_*` (workflow/type system)
- `time_entries`, `time_entry_*` (time tracking)
- `budgets`, `budget_*`, `cost_*`, `rates` (cost tracking)
- `versions`, `version_*` (release management)
- `categories`, `colors`, `custom_*` (customization)
- `attachments`, `attachment_*`, `file_links`, `storages*` (file management)
- `wiki_*`, `forums`, `messages`, `message_*` (collaboration)
- `meetings`, `meeting_*` (meetings module)
- `news`, `news_*`, `announcements` (announcements)
- `bcf_*` (BIM/BCF module)
- `github_*`, `gitlab_*` (SCM integrations)
- `oauth_*`, `oidc_*`, `auth_*`, `ldap_*`, `tokens` (authentication)
- `webhooks_*` (webhooks)
- `queries`, `query_*`, `grids`, `grid_*`, `views` (UI/views)
- `journals`, `*_journals`, `changes`, `changesets*` (audit/history)
- `notifications`, `notification_*`, `watchers`, `favorites` (notifications)
- `enabled_modules`, `menu_items` (modules/navigation)
- `settings`, `enterprise_tokens`, `licenses*` (system settings)
- `ifc_models`, `exports`, `deploy_*` (extended features)
- `good_job*`, `job_statuses` (background jobs)
- `recaptcha_entries`, `sessions`, `two_factor_*` (security)
- `schema_migrations`, `ar_internal_metadata` (Rails framework)
- `paper_trail_audits` (auditing)
- `remote_identities` (external identity)
- `non_working_days`, `ical_*` (calendar)

## 10NetZero/FLRTS Custom Tables (Identified)

### Business Reference Tables

1. **sites** - Mining sites (name, code, location)
2. **site_aliases** - Alternative names for sites
3. **site_partner_assignments** - Which partners work at which sites
4. **site_vendor_assignments** - Which vendors supply which sites
5. **personnel** - Employees with Telegram integration
6. **operators** - Site operators
7. **partners** - Partner organizations
8. **vendors** - Vendor organizations
9. **companies** - Company entities for accounting

### Mining Equipment/Assets

10. **asics** - ASIC mining hardware
11. **equipment** - Other mining equipment

### Field Reporting System

12. **field_reports** - Daily field reports from sites
13. **field_report_edits** - Edit history for field reports
14. **field_reports_asics** - ASICs mentioned in field reports
15. **field_reports_equipment** - Equipment mentioned in field reports

### FLRTS Interface Tables

16. **lists** - FLRTS list management feature
17. **list_items** - Items within lists
18. **reminders** - FLRTS reminder system
19. **tasks** - Cached work_packages for fast queries (?)
20. **task_assignment_history** - Task assignment tracking
21. **flrts_users** - FLRTS user profiles (linked to personnel)
22. **openproject_user_mapping** - Maps FLRTS users to OpenProject users

### Licensing & Agreements

23. **licenses_agreements** - License agreements tracking
24. **licenses_agreements_partners** - Partners on agreements
25. **licenses_agreements_sites** - Sites covered by agreements
26. **licenses_agreements_vendors** - Vendors on agreements

### Accounting/Financial

27. **chart_of_accounts** - Chart of accounts
28. **journal_entries** - Accounting journal entries
29. **journal_entry_lines** - Journal entry line items
30. **general_ledger** - General ledger postings
31. **financial_statement_snapshots** - Financial snapshots
32. **trial_balance_snapshots** - Trial balance snapshots
33. **accounting_customers** - Customer accounting entities
34. **accounting_employees** - Employee accounting entities
35. **partner_billings** - Partner billing records
36. **vendor_invoices** - Vendor invoice tracking
37. **labor_budget_items** - Labor budget planning
38. **material_budget_items** - Material budget planning

### Operations/Logging

39. **bot_logs** - Telegram bot logging
40. **parsing_logs** - NLP parsing logs
41. **notifications_log** - Notification delivery log
42. **markup_changes_log** - Pricing markup changes

### AI/Brain Bot (Custom Feature)

43. **brain_bot_documents** - Document storage for AI
44. **brain_bot_document_chunks** - Document chunks for RAG
45. **brain_bot_media_files** - Media file storage

### Views (Not Base Tables)

- Various `*_view` and `*_with_details` views that provide convenient access to
  data

## Total Count

- **OpenProject Native**: ~180 tables
- **Custom Tables**: ~45 base tables + numerous views
- **Total in public schema**: 225 tables
- **OpenProject schema**: 0 tables (empty - should have ~180)

## Critical Observation

The `openproject` schema is EMPTY. All OpenProject tables are incorrectly in the
`public` schema, mixed with custom tables.
