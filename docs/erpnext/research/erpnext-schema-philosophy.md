# ERPNext Schema Philosophy Research

**Status:** In Progress **Phase:** 1.1 **Agent:** Perplexity/WebSearch **Date
Created:** 2025-09-30 **Last Updated:** 2025-10-01

## Research Questions

### 1. What is a DocType?

**Question:** How does ERPNext's DocType system differ from traditional database
tables?

**Findings:**

- DocTypes are “fat models” that bundle schema, generated UI, API endpoints, and
  lifecycle hooks; a single definition drives the underlying SQL table
  (`tab<DocType>`), list view, and controller logic.
- Metadata lives both in the database (records in `tabDocType`, `tabDocField`)
  and, for standard/custom-app DocTypes, in version-controlled JSON files that
  are applied via `bench migrate`.
- CRUD is orchestrated through the framework’s document lifecycle
  (`before_insert`, `validate`, `on_update`, `on_submit`, etc.), so business
  rules belong in hooks rather than database triggers.

### 2. ERPNext Naming Conventions

**Question:** Why does ERPNext use names like `tabWorkOrder` instead of
`work_orders`?

**Findings:**

- Tables are auto-created as `tab<DocType Name>` to keep framework-owned objects
  distinct from system tables and to enable dynamic DocType creation.
- Auto-generated IDs are managed by Naming Series patterns (e.g.,
  `WO-{YYYY}-{#####}`), which keep identifiers user-friendly while ensuring
  uniqueness.
- Child tables (DocTypes with `istable=1`) get their own `tab<Child DocType>`
  table and are linked via `parent`, `parenttype`, and `parentfield` columns.
- Singleton DocTypes (`issingle=1`) store values in the shared `tabSingles`
  table and should be reserved for global configuration.
- Custom fields added through “Customize Form” are prefixed with `custom_`;
  stick to this convention to remain upgrade-safe.

### 3. Field Types and Validation

**Question:** What field types does ERPNext support and how does validation
work?

**Findings:**

- Core field families: `Data`, `Text`, `Select`, `Date/Time`, numeric types,
  `Link` (foreign key), `Table`/`Table MultiSelect` (child tables), `Check`,
  `Attach`, `JSON`, and calculated `Formula`.
- Validation happens at multiple layers: required (`reqd`), unique (`unique`),
  read-only, length limits, and `depends_on` expressions guard the client UI,
  while server hooks (`validate`, `before_save`, `on_submit`) enforce business
  invariants and should be considered authoritative.
- Select enumerations should map to Naming Series or configuration DocTypes to
  avoid hard-coding business choices.
- Heavy or large JSON fields can impact query performance; prefer normalized
  child tables when records need filtering/reporting.

### 4. Permission and Role Model

**Question:** How does ERPNext handle permissions and row-level security?

**Findings:**

- Role-based permissions are defined per DocType in the Role Permission Manager;
  each permission row specifies allowed actions (read/write/create/delete and
  workflow stages).
- Field-level security is controlled via `permlevel` and “Depends On”
  expressions without custom code.
- Row-level security is implemented declaratively through User Permissions
  (restricting Link fields to specific records) or programmatically via
  `get_permission_query_conditions`/`has_permission` hooks.
- For external contractors or segregated departments, combine minimal Roles
  (e.g., “Contractor”) with User Permissions and enable “Apply User Permissions”
  for the critical DocTypes.

### 5. Customization Philosophy

**Question:** When to use Custom Fields vs Custom DocTypes? How to extend
without breaking upgrades?

**Findings:**

- Treat “Customize Form” additions as the default for attaching attributes to
  core DocTypes; export them as fixtures in a custom app for version control.
- Create new DocTypes when modeling standalone business entities with their own
  lifecycle or when a customization would overload a core DocType.
- Never modify core ERPNext/Frappe apps directly; package all extensions (server
  scripts, client scripts, reports) inside a dedicated app.
- Use hooks for lifecycle automation, and keep critical validation/server logic
  on the backend—client scripts are purely for UX.
- Maintain staging environments and run `bench migrate` + automated tests before
  applying upgrades to production.
- No production data migration is planned yet; treat schema and customization
  work as preparation for a future MVP cutover.

## Summary

- DocTypes encapsulate schema, UI, and logic—build mental models around complete
  business objects rather than raw tables.
- Naming series, child-table conventions, and `custom_` field prefixes keep
  customizations aligned with Frappe expectations.
- Enforce business rules through hooks and role/user permissions instead of
  database triggers or ad-hoc SQL.
- Favor upgrade-safe patterns: custom apps, fixtures, and the Frappe ORM; avoid
  direct DB writes even during exploratory work.
- Current effort is research/preparation—no live data migration means we can
  iterate on design safely before MVP rollout.

## References

- Frappe Docs – DocTypes & DocFields
  (<https://docs.frappe.io/framework/v15/user/en/basics/doctypes>)
- OneHash: Customization – DocType
  (<https://help.onehash.ai/en/article/customization-doctype-u3f5w5/>)
- Sabbir Z. – Frappe DocType Lifecycle Explained
  (<https://www.sabbirz.com/blog/frappe-doctype-lifecycle-explained>)
- ERPNext Manual – Users & Permissions
  (<https://docs.frappe.io/erpnext/user/manual/en/users-and-permissions>)
- ERPNext Manual – Document Naming
  (<https://docs.frappe.io/erpnext/user/manual/en/document-naming>)
