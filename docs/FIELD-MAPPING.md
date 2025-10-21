# ERPNext Field Mapping Specification

**Purpose:** Complete mapping of OpenAI parsed fields to ERPNext Maintenance
Visit DocType fields

**Last Updated:** October 2025

## Overview

This document defines the exact field mapping used by the Telegram webhook
handler when creating Maintenance Visit records in ERPNext. It includes type
conversions, default values, validation rules, and error handling patterns.

## Core Field Mapping Table

| OpenAI Field  | ERPNext Field                | Type            | Required | Default           | Validation                                            | Notes                                                                      |
| ------------- | ---------------------------- | --------------- | -------- | ----------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `description` | `mntc_work_details`          | Text            | Yes      | -                 | Max 5000 chars                                        | Main task description                                                      |
| `assignee`    | `custom_assigned_to`         | Link (User)     | No       | None              | Must exist in User table                              | Email format: `user@10nz.tools`. Custom field (must be created in ERPNext) |
| `dueDate`     | `mntc_date`                  | Datetime        | No       | None              | ISO 8601 → ERPNext datetime                           | Converted to `YYYY-MM-DD HH:MM:SS`                                         |
| `priority`    | `custom_flrts_priority`      | Select          | No       | "Medium"          | ["Low", "Medium", "High", "Urgent"]                   | Custom field in flrts_extensions                                           |
| `rationale`   | `custom_parse_rationale`     | Text            | Yes      | -                 | Max 2000 chars                                        | OpenAI reasoning for parse                                                 |
| `confidence`  | `custom_parse_confidence`    | Float           | Yes      | -                 | 0.0-1.0                                               | OpenAI confidence score                                                    |
| -             | `customer`                   | Link (Customer) | Yes      | "10netzero Tools" | Hardcoded                                             | Standard ERPNext field                                                     |
| -             | `maintenance_type`           | Select          | Yes      | "Preventive"      | ["Preventive", "Breakdown"]                           | Standard ERPNext field                                                     |
| -             | `completion_status`          | Select          | Yes      | "Pending"         | ["Pending", "Partially Completed", "Fully Completed"] | Standard ERPNext field                                                     |
| -             | `custom_telegram_message_id` | Data            | No       | From webhook      | -                                                     | Audit trail field                                                          |
| -             | `custom_flrts_source`        | Data            | Yes      | "telegram_bot"    | Fixed value                                           | Integration source tracking                                                |
| -             | `docstatus`                  | Int             | Yes      | 0                 | [0=Draft, 1=Submitted, 2=Cancelled]                   | Draft state for review                                                     |

## Type Conversions

### ISO 8601 → ERPNext Datetime

**Input:** `2024-10-20` or `2024-10-20T14:30:00Z`

**Output:** `2024-10-20 14:30:00`

**Conversion Logic:**

```javascript
function toERPNextDatetime(isoString) {
  if (!isoString) return null;

  // Parse ISO string
  const date = new Date(isoString);

  // Format as ERPNext datetime (YYYY-MM-DD HH:MM:SS)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
```

### Priority Mapping

**OpenAI Output → ERPNext Value:**

- `"Low"` → `"Low"`
- `"Medium"` → `"Medium"`
- `"High"` → `"High"`
- `"Urgent"` → `"Urgent"`
- `null` → `"Medium"` (default)

**Validation:** If OpenAI returns an invalid priority, use default "Medium" and
log warning.

### User Email Mapping

**OpenAI Output:** User name (e.g., "Joel", "Taylor", "Colin")

**ERPNext Value:** User email (e.g., "<joel@10nz.tools>")

**Mapping Logic:**

```javascript
const USER_EMAIL_MAP = {
  joel: 'joel@10nz.tools',
  bryan: 'bryan@10nz.tools',
  taylor: 'taylor@10nz.tools',
  colin: 'colin@10nz.tools',
};

function mapUserToEmail(name) {
  if (!name) return null;

  const normalized = name.toLowerCase().trim();
  return USER_EMAIL_MAP[normalized] || null;
}
```

## Default Values

### Required ERPNext Fields (Not from OpenAI)

```javascript
const DEFAULT_VALUES = {
  customer: '10netzero Tools', // Hardcoded for MVP
  maintenance_type: 'Preventive', // Default task type
  completion_status: 'Pending', // Initial state
  docstatus: 0, // Draft mode
  custom_flrts_source: 'telegram_bot', // Source tracking
};
```

### Optional Fields with Defaults

```javascript
const OPTIONAL_DEFAULTS = {
  priority: 'Medium', // If not specified
  assign_to: null, // Allow unassigned tasks
  mntc_date: null, // Allow tasks without due date
};
```

## Validation Rules

### Pre-Submission Validation

```javascript
function validateMaintenanceVisit(data) {
  const errors = [];

  // Required field validation
  if (!data.mntc_work_details || data.mntc_work_details.length === 0) {
    errors.push('Work details are required');
  }

  if (data.mntc_work_details && data.mntc_work_details.length > 5000) {
    errors.push('Work details exceed maximum length (5000 characters)');
  }

  if (!data.customer) {
    errors.push('Customer is required');
  }

  if (!data.maintenance_type) {
    errors.push('Maintenance type is required');
  }

  // Confidence threshold
  if (data.custom_parse_confidence < 0.5) {
    errors.push('Parse confidence too low (< 0.5), manual review required');
  }

  // User existence validation (requires ERPNext check)
  if (data.assign_to && !isValidUser(data.assign_to)) {
    errors.push(`User ${data.assign_to} does not exist in system`);
  }

  return errors;
}
```

### ERPNext Validation Errors (417 Response)

ERPNext returns `417 Expectation Failed` with validation errors:

```json
{
  "exception": "frappe.exceptions.ValidationError",
  "message": "Maintenance Type is mandatory",
  "_server_messages": "[{\"message\": \"Maintenance Type is mandatory\", \"indicator\": \"red\"}]"
}
```

**Handling Strategy:**

1. Parse `_server_messages` array
2. Extract validation error messages
3. Return friendly error to user
4. Log to FLRTS Parser Log for debugging

## Complete Mapping Example

### OpenAI Response

```json
{
  "description": "Check pump #3 pressure sensor",
  "assignee": "Taylor",
  "dueDate": "2024-10-20",
  "priority": "High",
  "rationale": "User requested Taylor to check a specific pump component by a specific date",
  "confidence": 0.92
}
```

### ERPNext POST Body

```json
{
  "mntc_work_details": "Check pump #3 pressure sensor",
  "custom_assigned_to": "taylor@10nz.tools",
  "mntc_date": "2024-10-20 00:00:00",
  "custom_priority": "High",
  "custom_parse_rationale": "User requested Taylor to check a specific pump component by a specific date",
  "custom_parse_confidence": 0.92,
  "customer": "10netzero Tools",
  "maintenance_type": "Preventive",
  "completion_status": "Pending",
  "docstatus": 0,
  "custom_telegram_message_id": "12345",
  "custom_flrts_source": "telegram_bot"
}
```

**Note**: `doctype` field removed for stricter REST compliance (Comment 10).

## Error Handling Matrix

| Error Type               | Detection             | Handling              | User Message                                            | Log Action           |
| ------------------------ | --------------------- | --------------------- | ------------------------------------------------------- | -------------------- |
| Missing required field   | Pre-validation        | Return 400            | "Required field missing: [field]"                       | Log to Parser Log    |
| Invalid field type       | Type conversion error | Use default or skip   | "Using default value for [field]"                       | Log warning          |
| User not found           | ERPNext 417           | Ask for clarification | "User '[name]' not found. Did you mean: [suggestions]?" | Log to Parser Log    |
| Low confidence (<0.5)    | Pre-validation        | Create with flag      | "Task created but flagged for review (low confidence)"  | Log to Parser Log    |
| ERPNext validation (417) | API response          | Parse error message   | ERPNext message (user-friendly)                         | Log full response    |
| Network timeout          | API timeout           | Retry 3x              | "ERPNext temporarily unavailable, please try again"     | Log error            |
| Auth failure (401)       | API response          | Alert admin           | "System authentication error, admin notified"           | Critical log + alert |

## Field Nullability Rules

### Fields That Can Be Null

- `assign_to` - Unassigned tasks allowed
- `mntc_date` - Tasks without due dates allowed
- `custom_priority` - Defaults to "Medium" if null

### Fields That Cannot Be Null

- `mntc_work_details` - Required by ERPNext
- `customer` - Required by ERPNext
- `maintenance_type` - Required by ERPNext
- `completion_status` - Required by ERPNext
- `custom_parse_confidence` - Required for audit
- `custom_flrts_source` - Required for tracking

## Testing Checklist

### Unit Tests (Field Mapping)

- [ ] Converts ISO dates to ERPNext datetime format
- [ ] Maps user names to email addresses correctly
- [ ] Applies default values for missing optional fields
- [ ] Validates required fields before submission
- [ ] Handles invalid priority values gracefully
- [ ] Rejects work details exceeding 5000 characters
- [ ] Flags low confidence parses (<0.5)
- [ ] Preserves original Telegram message ID

### Integration Tests (ERPNext API)

- [ ] Creates valid Maintenance Visit successfully
- [ ] Handles 417 validation errors with user-friendly messages
- [ ] Retries on 500+ server errors
- [ ] Logs all field mapping failures to Parser Log
- [ ] Verifies assigned user exists before submission
- [ ] Creates draft records (docstatus=0) by default

### Edge Cases

- [ ] Empty description (should reject)
- [ ] Unknown user name (should ask for clarification)
- [ ] Due date in the past (should create with warning)
- [ ] Extremely long description (should truncate or reject)
- [ ] Special characters in description (should escape properly)
- [ ] Null assignee (should create unassigned task)
- [ ] Confidence = 0.0 (should flag for manual review)
- [ ] Confidence = 1.0 (should create without review)

## References

- ERPNext Maintenance Visit DocType:
  `https://ops.10nz.tools/app/maintenance-visit`
- ERPNext REST API Documentation: `https://frappeframework.com/docs/user/en/api`
- OpenAI Structured Outputs: Defined in `lib/openai.mjs`
- Context Injection: See `docs/CONTEXT-INJECTION-SPEC.md`

---

**Document Owner:** Backend Team **Review Cycle:** After each schema change
**Last Reviewed:** October 2025
