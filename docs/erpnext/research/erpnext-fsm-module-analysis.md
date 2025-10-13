# ERPNext DocType Patterns & FSM Module Analysis

**Status:** ✅ Complete (Phase 1.3) **Phase:** Phase 1.3 **Related Linear:**
[10N-227](https://linear.app/10netzero/issue/10N-227) **Source:** Deep Research
Report (ERPNext Architectural Patterns) **Date Created:** 2025-10-01

## Executive Summary

This document synthesizes the Phase 1.3 deep research on ERPNext DocType design
patterns and the Field Service Management (FSM) module ecosystem. **Critical
Finding:** ERPNext FSM is NOT a monolithic module but a **constellation of
DocTypes** across Support, Selling, and Stock modules that must be orchestrated
together.

---

## Section 1: DocType Design Patterns (The Building Blocks)

### 1.1 Five Core DocType Patterns

ERPNext's architecture is built on five fundamental patterns. Understanding when
to use each is critical for correct data modeling.

#### Pattern 1: Master Data DocTypes (The "Nouns")

**Definition:** Core, relatively static business entities that are _referenced_
by other documents.

**Characteristics:**

- Low transaction volume
- Long-lasting data
- Referenced by many transactional documents
- Foundation of the business system

**When to Use:**

- Modeling core business entities (customers, items, assets, employees)
- Data will be reused across multiple transactions
- Record needs to exist independently

**ERPNext Examples:**

- Customer, Supplier, Item, Employee, Asset, Warehouse, Company

**FLRTS Application:**

- Sites/Locations (Master)
- Contractors/Vendors (Master)
- Personnel (Master)

---

#### Pattern 2: Transactional Data DocTypes (The "Verbs")

**Definition:** High-volume, time-bound documents that record business events.

**Characteristics:**

- High transaction volume
- Always timestamped
- Always reference one or more Master DocTypes
- Often submittable (immutable after finalization)

**When to Use:**

- Recording business events (sales, purchases, service visits)
- Creating audit trail
- Capturing time-bound activities

**ERPNext Examples:**

- Sales Order, Purchase Invoice, Stock Entry, Journal Entry, Maintenance Visit

**FLRTS Application:**

- Work Orders (Transactional - records service event)
- Reminders (Transactional - records notification event)

---

#### Pattern 3: Child Table DocTypes (One-to-Many Relationships)

**Definition:** DocTypes that cannot exist independently, embedded within a
parent document.

**Characteristics:**

- `istable: 1` property enabled
- Stores multiple sub-records within parent
- Automatically managed parent/parenttype/parentfield links
- Stored in separate database table

**When to Use:**

- Line items (order items, invoice items)
- Task checklists
- Parts consumed during service
- Any one-to-many relationship within a document

**ERPNext Examples:**

- Sales Order Item (child of Sales Order)
- Purchase Invoice Item (child of Purchase Invoice)
- Journal Entry Account (child of Journal Entry)

**FLRTS Application:**

- FLRTS List Item (child of FLRTS List)
- Service Visit Task (child of Maintenance Visit)
- Service Visit Parts (child of Maintenance Visit)
- FLRTS Contractor Site (child of Supplier)

---

#### Pattern 4: Single DocTypes (Singleton for Global Settings)

**Definition:** DocType with only ONE record for entire system.

**Characteristics:**

- `issingle: 1` property enabled
- No list view (direct form access)
- Stored in `tabSingles` table (not own table)
- Used exclusively for global configuration

**When to Use:**

- System-wide settings
- Global defaults
- One-per-system configuration

**ERPNext Examples:**

- System Settings, Stock Settings, Selling Settings, Accounts Settings

**FLRTS Application:**

- Not needed (no global configuration DocTypes required)

---

#### Pattern 5: Specialized Behavioral Patterns

**Submittable DocTypes:**

- `is_submittable: 1` property
- Workflow: Draft (0) → Submitted (1) → Cancelled (2)
- Submitted documents are **immutable** (critical for audit trail)
- Use for financial records, work orders, any document requiring approval

**Tree DocTypes:**

- `is_tree: 1` property
- Hierarchical self-referential structure
- Use for nested categories, org charts, geographic territories

**ERPNext Examples:**

- Chart of Accounts (Tree + Submittable)
- Item Groups (Tree)
- Territory (Tree)

**FLRTS Application:**

- Location DocType should be Tree (nested site hierarchy)
- Work Order should be Submittable (immutable after assignment)

---

## Section 2: ERPNext FSM Module Architecture

### 2.1 Critical Finding: FSM is a "Constellation," Not a Module

**ERPNext FSM is NOT a single module with dedicated DocTypes.** It's a **process
workflow** that orchestrates standard DocTypes from multiple modules:

| FLRTS Concept         | ERPNext DocType                       | Module      | Primary or Extension  |
| --------------------- | ------------------------------------- | ----------- | --------------------- |
| Work Request          | **Issue**                             | Support     | ✅ Primary (standard) |
| Scheduled Work Order  | **Maintenance Visit**                 | Support     | ✅ Primary (standard) |
| Recurring Maintenance | **Maintenance Schedule**              | Support     | ✅ Primary (standard) |
| Service Commitment    | **Service Level Agreement (SLA)**     | Support     | ✅ Primary (standard) |
| Site/Location         | **Territory** or **Address**          | Selling/CRM | ⚠️ Needs extension    |
| Contractor            | **Supplier**                          | Buying      | ⚠️ Needs extension    |
| Parts/Materials       | **Item**                              | Stock       | ✅ Primary (standard) |
| Technician            | **Sales Person** (linked to Employee) | HR/Selling  | ⚠️ Workaround         |

### 2.2 The Standard Work Order DocType is NOT for FSM

**❌ CRITICAL WARNING:** ERPNext's standard **Work Order DocType** is a
**manufacturing tool**, NOT a field service tool.

**Why it's wrong for FSM:**

- Designed for factory production (Item to Manufacture, BOM, WIP Warehouse)
- Creates finished goods from raw materials
- Workflow assumes manufacturing operations (material transfer, production)
- Does NOT model service visits to customer sites

**✅ CORRECT FSM DocType:** **Maintenance Visit** (Support module)

---

### 2.3 Maintenance Visit: The True FSM Work Order

**Maintenance Visit** is the correct DocType for field service jobs.

**Standard Fields (Field-by-Field Analysis):**

| Field                  | Type              | Purpose                          | Required | FLRTS Mapping         |
| ---------------------- | ----------------- | -------------------------------- | -------- | --------------------- |
| `customer`             | Link to Customer  | Who is being serviced            | Yes      | FLRTS customer        |
| `maintenance_type`     | Select            | Scheduled/Unscheduled/Breakdown  | Yes      | Work order type       |
| `completion_status`    | Select            | Partially/Fully Completed        | Yes      | Status tracking       |
| `item_code`            | Link to Item      | What equipment is being serviced | Yes      | Equipment/asset       |
| `serial_no`            | Link to Serial No | Specific asset instance          | Yes      | Asset tracking        |
| `maintenance_schedule` | Link              | Links to recurring schedule      | No       | Recurring work        |
| `sales_person`         | Link              | Assigned technician (employee)   | Yes      | Field technician      |
| `work_done`            | Small Text        | Summary of work performed        | Yes      | Service notes         |
| `customer_feedback`    | Text              | Post-visit feedback              | No       | Customer satisfaction |

**🚨 CRITICAL GAPS in Standard Maintenance Visit:**

1. **No task checklist child table** - Can't track multi-step procedures
2. **No parts consumed child table** - Can't record materials used
3. **No external contractor support** - Only internal Sales Person (Employee)
4. **No site/location field** - Only customer address

**Required Customizations:**

- Add child table: `Service Visit Task` (task checklist)
- Add child table: `Service Visit Part` (parts consumed)
- Add Link field: `contractor` (Link to Supplier for external techs)
- Add Link field: `site_location` (Link to custom Site Location DocType)

---

### 2.4 Site/Location Modeling

**ERPNext does NOT have a dedicated "Site" DocType.** Community consensus: Use
**Territory + Address** combination.

**✅ RECOMMENDED: Create Custom `Site Location` DocType**

- Combines best of both
- Link to Customer (who owns site)
- Link to Address (physical location)
- Geolocation field (GPS coordinates)
- Tree structure for nested sites (Is Tree: 1)
- Custom fields: `site_code`, `site_type`, `status`, `aliases`

---

## Section 3: Key Findings Summary

See full document at
[docs/research/erpnext-fsm-module-analysis.md](docs/research/erpnext-fsm-module-analysis.md)
for:

- Complete DocType JSON templates
- Custom app structure (`flrts_extensions`)
- Integration patterns (REST API, Webhooks)
- Upgrade strategy
- Mobile/offline considerations

---

**Phase 1.3 Complete:** All deep research findings documented and integrated
into Phase 1.2 deliverables.
