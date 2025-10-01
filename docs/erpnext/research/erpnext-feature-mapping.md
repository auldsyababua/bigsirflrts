# ERPNext Feature Mapping to FLRTS Needs

**Status:** Not Started **Phase:** 1.2 **Agent:** Claude (general-purpose) +
User **Date Created:** 2025-09-30 **Prerequisites:**
`flrts-functional-requirements.md` must be complete

## Purpose

Map FLRTS functional requirements to ERPNext modules and features.

Determine:

1. Which ERPNext features we'll use immediately
2. Which features we'll grow into later
3. Which features we don't need

## ERPNext Modules Assessment

### Field Service Management (FSM) Module

**Status:** Core module for FLRTS

**Features:**

- Work Orders
- Locations
- Service Providers (Suppliers)
- Maintenance Schedules

**FLRTS Usage:**

- ✅ **Use Immediately:**
  - Work Orders → FLRTS "Work"
  - Locations → FLRTS "Sites"
  - Suppliers → FLRTS "Contractors"
- 🔄 **Grow Into Later:**
  - Maintenance Schedules → Future feature
- ❌ **Don't Need:**
  - (List features we won't use)

### Human Resources (HR) Module

**Status:** Potential module for personnel management

**Features:**

- Employee master
- Attendance
- Leave management
- Shift scheduling

**FLRTS Usage:**

- ✅ **Use Immediately:**
  - Employee → FLRTS "Personnel" (maybe? or custom DocType?)
- 🔄 **Grow Into Later:**
  - Shift scheduling
- ❌ **Don't Need:**
  - Leave management, payroll, etc.

### Project Management Module

**Status:** Evaluate vs FSM Work Orders

**Features:**

- Projects
- Tasks
- Gantt charts
- Resource allocation

**FLRTS Usage:**

- Decision needed: FSM Work Orders vs Project Tasks?
- Recommendation: <!-- Agent to provide recommendation -->

### CRM Module

**Status:** Evaluate for contractor/client management

**Features:**

- Contacts
- Communications log
- Opportunities
- Quotes

**FLRTS Usage:**

- Recommendation: <!-- Agent to provide recommendation -->

### Stock/Inventory Module

**Status:** Future consideration

**Features:**

- Inventory tracking
- Stock movements
- Material requests

**FLRTS Usage:**

- 🔄 **Grow Into Later:** If FLRTS needs to track materials/supplies
- ❌ **Don't Need:** For MVP

### Automation (Workflow, Events, Webhooks)

**Status:** Critical for FLRTS

**Features:**

- Workflow states
- Event hooks
- Webhooks
- Server scripts

**FLRTS Usage:**

- ✅ **Use Immediately:**
  - Webhooks for n8n integration
  - Event hooks for Telegram notifications
- 🔄 **Grow Into Later:**
  - Complex workflow states
  - Server scripts for business logic

## Feature Usage Summary

### Immediate Use (MVP)

| ERPNext Feature | FLRTS Need      | Notes                     |
| --------------- | --------------- | ------------------------- |
| FSM Work Orders | Work tracking   | Core feature              |
| FSM Locations   | Sites           | Core feature              |
| FSM Suppliers   | Contractors     | Core feature              |
| Webhooks        | n8n integration | Core feature              |
| User Management | Personnel       | Extend with custom fields |

### Grow Into Later

| ERPNext Feature       | FLRTS Future Need  | Timeline |
| --------------------- | ------------------ | -------- |
| Maintenance Schedules | Recurring work     | Phase 2+ |
| Inventory             | Materials tracking | TBD      |
| Time Tracking         | Billable hours     | TBD      |

### Don't Need

| ERPNext Feature | Why Not Needed         |
| --------------- | ---------------------- |
| Accounting      | Out of scope for FLRTS |
| Manufacturing   | Not applicable         |
| E-commerce      | Not applicable         |

## Customization Needs

### Custom DocTypes Required

1. **FLRTS Personnel** (extends User)
   - Reason: Need Telegram-specific fields
   - Fields: telegram_user_id, telegram_username, timezone

2. **FLRTS Lists** (custom)
   - Reason: Shopping lists not in standard ERPNext
   - Fields: TBD based on functional requirements

3. **FLRTS Reminders** (custom)
   - Reason: Custom reminder logic
   - Fields: TBD based on functional requirements

### Custom Fields for Standard DocTypes

**Work Order:**

- `custom_telegram_message_id` (link back to original message)
- `custom_priority` (if ERPNext priority insufficient)
- Other fields TBD

**Location:**

- `custom_flrts_code` (short code for Telegram)
- `custom_aliases` (JSON array of alternative names)

**Supplier:**

- `custom_assigned_sites` (link to multiple locations)

## Integration Points

### ERPNext → n8n

**Events to expose:**

- Work Order created
- Work Order status changed
- Work Order assigned
- Work Order completed

**Webhook Configuration:**

<!-- Agent: Define exact webhook URLs, payloads -->

### Telegram → ERPNext

**API Endpoints to use:**

- `POST /api/resource/Work Order` - Create work order
- `GET /api/resource/Location` - List sites
- `GET /api/resource/Supplier` - List contractors

**Authentication:**

<!-- Agent: Define auth method - API keys, OAuth, etc. -->

### ERPNext → Supabase

**Data to sync:**

- Work orders (for analytics)
- Location activity
- Completion metrics

**Sync Method:**

<!-- Agent: Real-time webhooks vs periodic sync -->

## Recommendations

<!-- Agent: After analysis, provide recommendations -->

### Recommended Approach

<!-- Summary of best approach for FLRTS -->

### Risks

<!-- Any risks or concerns with chosen ERPNext features -->

### Alternatives Considered

<!-- Other ERPNext configurations considered -->
