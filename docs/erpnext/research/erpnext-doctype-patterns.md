# ERPNext DocType Design Patterns

**Status:** In Progress **Phase:** 1.3 **Agent:** Perplexity/WebSearch + GitHub
Search **Date Created:** 2025-09-30 **Last Updated:** 2025-10-01

## Research Questions

### 1. Master vs Transactional DocTypes

**Question:** What's the difference and when to use each?

**Findings:**

- Master DocTypes are long-lived reference entities (customers, suppliers,
  items) that other documents link to; transactional DocTypes (e.g., Maintenance
  Visit, Sales Order) capture time-bound events and usually support
  submit/cancel workflows.
- Master records are editable after creation; transactional DocTypes typically
  become immutable after submission to preserve audit trails (`docstatus`
  workflow).
- Decision rule: if the data describes a reusable business noun → Master; if it
  records an action/event with lifecycle → Transactional.

**Examples from ERPNext:**

- Master DocTypes: <!-- List examples -->
- Transactional DocTypes: <!-- List examples -->

### 2. Child Tables (Line Items)

**Question:** How do child tables work in ERPNext?

**Findings:**

- Child DocTypes set `istable: 1` and are stored in their own `tab<ChildName>`
  table with implicit `parent`, `parenttype`, and `parentfield` columns managed
  by Frappe.
- Parent DocType includes a `Table` (or `Table MultiSelect`) field referencing
  the child DocType; the framework handles CRUD and validation for embedded
  rows.
- Use child tables for line items, checklists, and many-to-many join records
  that must remain tightly coupled to the parent document.

**Example Use Case:**

```json
// Example of parent-child relationship
// Agent: Provide ERPNext example
```

### 3. Standard Field Patterns

**Question:** What standard fields appear in most DocTypes?

**Common Fields:**

- `name` – Primary key. Generated via naming series or explicit value; avoid
  manual mutations post-insert.
- `owner` – Creator user; used for default permission rules and audit trails.
- `creation` / `modified` – Timestamps automatically managed by ORM.
- `modified_by` – Tracks last editor; useful for troubleshooting automation.
- `docstatus` – Workflow state (0 Draft, 1 Submitted, 2 Cancelled) controlling
  immutability and downstream logic.

**When to override:** Only override `autoname` or add naming hooks when a custom
pattern is required; otherwise rely on Naming Series to keep consistency.

### 4. Naming Series

**Question:** How does ERPNext auto-generate names/IDs?

**Findings:**

- Naming Series patterns (configured via DocType or Setup > Naming Series)
  provide deterministic document IDs while supporting fiscal resets
  (`WO-{YYYY}-{#####}`).
- Custom autoname functions should live in DocType controller files to remain
  version-controlled and upgrade-safe.
- Use short, human-readable prefixes (WO, LOC, SITE) to help operators interact
  via Telegram/NLP workflows.

### 5. Link Fields

**Question:** How do relationships work?

**Findings:**

- Link fields generate dropdowns and enforce referential integrity; always
  ensure the target DocType exists in the same module or is installed via
  dependency.
- Descriptive options (e.g., `"options": "Supplier"`) power user permissions –
  enabling “Only allow linked records permitted to the user.”
- For frequently used references (Customer, Site), add search fields
  (`search_fields` property) to improve UX.

### 6. Permission Patterns

**Question:** How are permissions typically structured?

**Findings:**

- Set `permlevel` on fields to require elevated roles for editing sensitive data
  (e.g., financial fields on Work Order).
- DocType-level permissions should prefer the Role Permission Manager; custom
  controller logic (`has_permission`) reserved for complex exceptions.
- Workflow State DocTypes combined with `docstatus` provide structured approval
  flows without custom code.

### 7. Validation Patterns

**Question:** Where does validation happen?

**Findings:**

- Field validation options: `mandatory_depends_on` expressions,
  `read_only_depends_on`, regex validations (`set_only_once`, `in_list_view`).
- Document hooks (`validate`, `before_save`, `on_submit`) should encapsulate
  cross-field rules to guarantee enforcement regardless of entry channel
  (UI/API/import).
- Server Scripts provide low-code entry points but should be migrated to proper
  custom-app controllers for maintainability when logic grows.

**Best practices:** Centralise critical validations server-side; mirror client
scripts only for UX enhancements.

## Real-World Examples

### Example 1: Work Order DocType

**Source:** ERPNext core
(`erpnext/support/doctype/maintenance_visit/maintenance_visit.json`)

**Key Patterns Used:**

- Transactional DocType with submit/cancel workflow (service visit lifecycle)
- Child tables for task checklist and parts usage
- Link fields to Customer, Item, Serial No, Sales Person

**Lessons Learned:** Model FLRTS Work Orders on Maintenance Visit to reuse
built-in scheduling, SLA, and completion tracking; add custom child tables for
contractor tasks/parts.

### Example 2: Custom FSM Implementation

**Source:** Community extensions (e.g., Frappe FSM demos)

**Key Patterns Used:**

- Custom master DocType `Site Location` with tree hierarchy (`is_tree: 1`)
- Link to Customer and Address
- Geolocation field for mapping services

**Lessons Learned:** Create dedicated Site doc instead of overloading
Customer/Address; tree-based navigation simplifies territory assignments for
technicians.

### Example 3: Third-Party App Extension

**Source:** <!-- GitHub URL -->

**Key Patterns Used:**

**Lessons Learned:**

## Anti-Patterns (What NOT to Do)

1. **Stuffing transactional data into Master DocTypes:**
   - Why bad: Bloats profiles, breaks normalization, complicates permissions.
   - Instead: Create separate Transactional DocType linked to master record.
2. **Editing core DocType JSON directly in `apps/erpnext`:**
   - Why bad: Changes lost on upgrade; merge conflicts.
   - Instead: Extend via custom app + fixtures.
3. **Duplicate child table definitions:**
   - Why bad: Creates mismatched schema/UX; increases maintenance.
   - Instead: Reuse generic child DocTypes where practical (e.g., ToDo, Comment)
     or consolidate custom ones.

## Recommendations for FLRTS

### For FLRTS Personnel DocType

- **Recommended Pattern:** Extend standard User + Employee (Masters) with custom
  fields (`custom_telegram_user_id`, `custom_flrts_timezone`).
- **Reasoning:** Retains built-in authentication/HR workflows and simplifies
  permission management.

### For FLRTS Work Orders

- **Recommended Pattern:** Base on Maintenance Visit (Transactional) with
  additional child tables for contractor tasks/parts and Link fields for
  Site/Contractor.
- **Reasoning:** Leverages existing FSM lifecycle while capturing FLRTS-specific
  metadata.

### For FLRTS Lists (composite checklists)

- **Recommended Pattern:** Custom Master DocType (`FLRTS List`) with child table
  (`FLRTS List Item`) to store ordered checklist entries.
- **Reasoning:** Lists are reusable templates referenced by work orders and
  Telegram prompts; master + child pattern supports versioning and reuse.

## GitHub Repositories Reviewed

1. **ERPNext Core** – `erpnext/support/doctype/maintenance_visit` (GitHub)
   - Reference for transactional pattern + child tables.
2. **Community FSM extension demos** – YouTube/GitHub examples
   - Confirmed Site Location DocType approach and contractor workflows.

## References

- Frappe Docs – DocTypes & DocFields
  (<https://docs.frappe.io/framework/v15/user/en/basics/doctypes>)
- ERPNext Docs – Field Types
  (<https://docs.frappe.io/erpnext/user/manual/en/field-types>)
- ERPNext Docs – Role-Based Permissions
  (<https://docs.frappe.io/erpnext/user/manual/en/role-based-permissions>)
- Sabbir Z. – Frappe DocType Lifecycle Explained
  (<https://www.sabbirz.com/blog/frappe-doctype-lifecycle-explained>)
- ERPNext Docs – Document Naming
  (<https://docs.frappe.io/erpnext/user/manual/en/document-naming>)
