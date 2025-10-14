# ERPNext FSM Module Analysis

**Status:** In Progress **Phase:** 1.3 **Agent:** Perplexity/WebSearch **Date
Created:** 2025-10-01 **Last Updated:** 2025-10-01 **Related Linear:** 10N-230

## Purpose

Summarize ERPNext Field Service Management capabilities, identify gaps affecting
BigSirFLRTS, and outline the custom DocTypes/fields we must introduce before
Phase 2 integration work begins.

## Prerequisites

- [x] ERPNext dev instance deployed (`https://ops.10nz.tools`)
- [ ] Sample data for customers, sites, contractors, work orders
- [ ] Telegram/NLP proof of concept pointing at ERPNext sandbox

## FSM Features Inventory

### Maintenance Visit (Core Work Order)

- Transactional DocType representing a service job; supports submit/cancel
  lifecycle.
- Standard fields cover customer, equipment (`item_code`, `serial_no`),
  technician (`sales_person`), and completion notes.
- **FLRTS fit:** Serves as canonical Work Order. Extend with Site/Contractor
  fields for our hybrid workforce.

### Maintenance Schedule & SLA

- Handle recurring maintenance plans and response commitments.
- **FLRTS fit:** Use schedules for preventative rounds; SLAs back contractual
  obligations.

### Issue (Support Ticket)

- Intake for reactive incidents; can auto-create Maintenance Visits.
- **FLRTS fit:** Map Telegram inbound triage to Issues, promoting selected
  records to Visits.

### Stock & Item Management

- Items, Serial Nos, Stock Entries manage parts and equipment histories.
- **FLRTS fit:** Capture materials consumed during visits; track serialized gear
  on site.

### Supplier vs Employee

- Supplier DocType represents external contractors; Employee/Sales Person covers
  internal technicians.
- **FLRTS fit:** Add `custom_contractor_type` and timezone fields to support
  mixed assignments.

## Feature Gaps & Customizations

| Gap                            | Impact                                 | Solution                                                                                                 |
| ------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| No structured task checklist   | Hard to prove multi-step completion    | Child DocType `Maintenance Visit Task` with fields: description, responsible_party, status, completed_on |
| Parts usage not captured       | No audit of materials consumed         | Child DocType `Maintenance Visit Part` (Item, qty, supplier, notes)                                      |
| External contractor assignment | Core UI limited to internal users      | Add Link field `contractor` (Supplier) + role + user permissions                                         |
| Site/location missing          | Only customer address available        | Create `Site Location` master DocType (`is_tree: 1`) and link via new field `site_location`              |
| Telegram/NLP traceability      | Hard to reconcile messages with visits | Add fields `telegram_message_id`, `parser_log_id` on Maintenance Visit                                   |

## Recommended Custom Structures

### Site Location (Master)

- Fields: `site_name`, `site_code` (Unique), `customer` (Link), `address`
  (Link), `status`, `aliases`, `coordinates` (Geolocation).
- Properties: `is_tree: 1` for region → campus → zone hierarchy.

### Maintenance Visit Task (Child)

- Parent: Maintenance Visit.
- Fields: `task_description`, `responsible_party`, `status` (Select),
  `completed_on`, `notes`.

### Maintenance Visit Part (Child)

- Parent: Maintenance Visit.
- Fields: `item_code` (Link Item), `qty`, `uom`, `supplier`, `notes`.

### Custom Fields

- Maintenance Visit: `contractor` (Link Supplier), `site_location` (Link Site
  Location), `telegram_message_id` (Data), `parser_log_id` (Data).
- Supplier: `contractor_type` (Select), `preferred_regions` (Table with
  Territory links).
- Employee: `custom_timezone`, `custom_telegram_user_id` for scheduler
  alignment.

## Integration & Automation Notes

- **API:** Use `/api/resource/Maintenance Visit` for CRUD; always call `submit`
  when work order is finalized.
- **Webhooks:** Enable DocType Event Webhooks to notify Supabase/Telegram when
  visits change state.
- **Permissions:** Create `Contractor` Role with read/update on Maintenance
  Visit; enforce scope via User Permissions tied to the `contractor` link.
- **Naming Series:** Configure `WO-{YYYY}-{#####}` for Maintenance Visit and
  `SITE-{#####}` for Site Location to keep NLP prompts deterministic.
- **Data Import:** For future migrations, prefer the Data Import Tool to ensure
  hooks run and audit fields populate.

## Recommendations

1. Prototype the custom child tables and Site Location master inside the
   `flrts_extensions` custom app; export fixtures for version control.
2. Validate contractor permissions by logging in as a Supplier-linked user and
   confirming RLS enforcement.
3. Document REST payloads and webhook configs in a follow-up appendix once the
   dev instance is stable.
4. Capture screenshots or short Loom videos while configuring; attach them to
   Linear for context.
5. Remember: no production data migration yet—treat these findings as groundwork
   for Phase 2 and future MVP cutover.

## References

- ERPNext Maintenance Visit DocType
  (`erpnext/support/doctype/maintenance_visit/maintenance_visit.json`)
- ERPNext Document Naming Guide
  (<https://docs.frappe.io/erpnext/user/manual/en/document-naming>)
- ERPNext Users & Permissions
  (<https://docs.frappe.io/erpnext/user/manual/en/users-and-permissions>)
- Community discussions on Site/Territory modeling (Frappe forum)
