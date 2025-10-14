# ERPNext vs Traditional SQL Comparison

**Status:** In Progress **Phase:** 1.1 **Agent:** Perplexity/WebSearch **Date
Created:** 2025-09-30 **Last Updated:** 2025-10-01

## Purpose

Mental model guide for developers familiar with PostgreSQL/traditional RDBMS to
understand ERPNext's approach.

## Comparison Table

| PostgreSQL Concept | ERPNext Equivalent | Key Differences                                                                             | Notes                                                                   |
| ------------------ | ------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Table              | DocType            | Represents schema, form layout, list view, and controller logic in one metadata definition. | Stored in `tabDocType` / JSON files; auto-creates `tab<DocType>` table. |
| Column             | Field              | Fields include UI label, permlevel, dependencies, and validation metadata.                  | Changes applied via Customize Form or DocType JSON.                     |
| Foreign Key        | Link Field         | Link adds relational constraint and renders as searchable UI widget.                        | Framework creates index; supports User Permissions for scoping.         |
| Check Constraint   | Validation         | Enforced via field flags and server hooks (`validate`, `before_save`).                      | Implement business rules in Python instead of SQL `CHECK`.              |
| View               | Report / List View | Reports and list views are metadata-driven (Report Builder, DocType list settings).         | Can define custom reports or scripts without raw SQL.                   |
| Trigger            | Hook               | Lifecycle hooks fire during document events rather than database triggers.                  | Write logic in DocType controller or Server Script.                     |
| Row Level Security | Permission Rules   | Combine Role Permission Manager, User Permissions, and query-condition hooks.               | Declarative RLS preferred; hooks for complex cases.                     |
| Schema             | Module             | Modules group DocTypes, pages, and reports for packaging in apps.                           | Similar to namespaces; ship via custom app.                             |

Additional mental mappings:

- **Transactions** → DocType documents (`doc.save()`, `doc.submit()` manage
  state transitions and audit trail).
- **Sequences** → Naming Series patterns managed in DocType settings.
- **Stored Procedures** → Server scripts or whitelisted Python methods accessed
  via REST.
- **ORM Models** → The `frappe.model.document.Document` class and
  DocType-specific controller files.

## Migration Mental Models

### Creating a New Entity

**PostgreSQL Way:**

```sql
CREATE TABLE work_orders (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**ERPNext Way:**

```json
{
  "doctype": "Work Order",
  "fields": [
    {"fieldname": "title", "fieldtype": "Data", "reqd": 1},
    {"fieldname": "status", "fieldtype": "Select"},
    ...
  ]
}
```

**Key Differences:**

- In SQL you define tables then hand-build UI/business logic; in ERPNext the
  DocType definition is the single source for schema + UI + API endpoints.
- Table changes in SQL require migrations; in ERPNext `bench migrate` applies
  DocType metadata to generate the backing table automatically.
- ERPNext enforces lifecycle events (`validate`, `before_save`, `on_submit`) so
  all writes must pass through the ORM; direct SQL writes bypass hooks and are
  discouraged.

### Relationships

**PostgreSQL Way:**

```sql
ALTER TABLE work_orders
  ADD CONSTRAINT fk_location
  FOREIGN KEY (location_id) REFERENCES locations(id);
```

**ERPNext Way:**

```json
{
  "fieldname": "location",
  "fieldtype": "Link",
  "options": "Location"
}
```

**Key Differences:**

- Foreign keys are modeled with `Link` fields, which simultaneously enforce
  referential integrity and power UI lookups.
- Many-to-many relationships leverage child tables (`Table` fields) or separate
  join DocTypes; they automatically include `parent` metadata instead of manual
  join tables.
- User permissions can limit selectable link targets at runtime—something that
  SQL foreign keys do not handle.

## Common Gotchas

<!-- Agent: Document common mistakes when transitioning from SQL to ERPNext -->

1. **Bypassing the ORM:** Running direct `psql` updates skips validation,
   permissions, and hooks—can corrupt data. Always use `frappe.db` or document
   APIs, even for maintenance scripts.
2. **Overloading Core DocTypes:** Adding dozens of custom fields to standard
   DocTypes without fixtures bloats the form and risks conflicts during
   upgrades; prefer dedicated DocTypes when modeling new entities.
3. **Ignoring Naming Series/ID rules:** Manually setting primary keys breaks the
   framework’s naming expectations; configure naming series instead of ad-hoc
   integers.
4. **Client-only validation:** Relying on JavaScript checks alone leaves API
   imports unguarded—mirror all critical validation on the server hooks.

## Best Practices

- Define new business objects as DocTypes inside a custom app and keep JSON
  definitions in version control.
- Use `Customize Form` for incremental fields on core DocTypes, export as
  fixtures, and prefix custom fields automatically.
- Model relationships explicitly with Link fields or child tables so permissions
  and UI work automatically.
- Leverage Report Builder and Query Builder before writing raw SQL; if raw
  queries are necessary, wrap them in server scripts and respect permissions.
- Plan upgrades with staging environments; run `bench migrate` and regression
  tests before touching production.
- No production data migration is scheduled yet—treat this mapping as
  preparation for future MVP cutover lessons learned.

## References

- Frappe Docs – DocTypes & Fieldtypes
  (<https://docs.frappe.io/framework/v15/user/en/basics/doctypes>)
- ERPNext Manual – Users & Permissions
  (<https://docs.frappe.io/erpnext/user/manual/en/users-and-permissions>)
- ERPNext Manual – Document Naming
  (<https://docs.frappe.io/erpnext/user/manual/en/document-naming>)
- Sabbir Z. – Frappe DocType Lifecycle Explained
  (<https://www.sabbirz.com/blog/frappe-doctype-lifecycle-explained>)
- Frappe Query Builder Docs
  (<https://docs.frappe.io/framework/user/en/api/query-builder>)
