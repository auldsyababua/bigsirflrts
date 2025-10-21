# Post-MVP Task Reminders Implementation Guide

**Purpose:** Implementation guide for task reminders using ERPNext native
features

**Last Updated:** October 2025

**Status:** Post-MVP (deferred from initial launch)

## Overview

This document describes how to implement task reminders using **ERPNext native
features** (Email Alerts + Server Scripts) rather than external orchestration
systems. This approach leverages the platform's built-in scheduling and
notification capabilities.

## Architecture

### ERPNext Native Reminders

```
┌─────────────────────────────────────────────────────────┐
│                   ERPNext (Frappe Cloud)                │
│                                                         │
│  ┌───────────────┐         ┌──────────────────┐       │
│  │  Maintenance  │         │  Email Alert     │       │
│  │  Visit        │────────>│  (Scheduled)     │       │
│  │  DocType      │         │                  │       │
│  └───────────────┘         └──────────────────┘       │
│         │                           │                  │
│         │                           │                  │
│         ▼                           ▼                  │
│  ┌───────────────┐         ┌──────────────────┐       │
│  │ Server Script │────────>│  Notification    │       │
│  │ (Before Save) │         │  Log             │       │
│  └───────────────┘         └──────────────────┘       │
│                                     │                  │
└─────────────────────────────────────┼──────────────────┘
                                      │
                                      ▼
                          ┌──────────────────────┐
                          │  Email (Frappe)      │
                          │  Telegram (n8n)      │
                          └──────────────────────┘
```

## Implementation Options

### Option 1: Email Alerts (Native ERPNext)

**Best For:** Email notifications, simple scheduling

**Setup:**

1. Navigate to: `Settings > Email Alerts`
2. Click: `+ New Email Alert`
3. Configure:
   - **Document Type:** Maintenance Visit
   - **Subject:** `Reminder: Task Due Soon`
   - **Enabled:** Yes
   - **Send Alert On:** Time-based
   - **Days Before:** 0 (send on due date)
   - **Time to Send:** 09:00
   - **Condition:** `doc.completion_status == 'Pending' and doc.mntc_date`

**Pros:**

- ✅ Zero code required
- ✅ Built-in scheduling (Frappe's cron)
- ✅ Email delivery managed by platform
- ✅ Works immediately on Frappe Cloud

**Cons:**

- ❌ Email only (no Telegram notifications)
- ❌ Limited customization
- ❌ No multi-channel support

**Example Email Alert Configuration:**

```python
# Email Alert: Task Due Today
Document Type: Maintenance Visit
Enabled: Yes
Send Alert On: Time Based
Send Alert At: 09:00
Days Before or After: 0  # Send on due date
Condition: doc.completion_status == 'Pending' and doc.mntc_date

Subject: Reminder: {{ doc.mntc_work_details[:50] }}

Message:
Hi {{ doc.assign_to }},

This is a reminder that the following task is due today:

Task: {{ doc.mntc_work_details }}
Due Date: {{ doc.mntc_date }}
Priority: {{ doc.custom_priority or 'Medium' }}

Please complete this task or update the status in ERPNext.

View task: {{ doc.get_url() }}

Thanks,
FLRTS Bot
```

---

### Option 2: Server Scripts + n8n (Hybrid)

**Best For:** Multi-channel notifications (Email + Telegram), advanced logic

**Architecture:**

```
ERPNext Server Script → n8n Webhook → [Email + Telegram]
```

**Setup:**

#### Step 1: Create Server Script

Navigate to: `Settings > Server Script > + New Server Script`

```python
# Server Script: Send Task Reminders
# Trigger: Scheduler Event (Daily)
# Script Type: Scheduler Event

import frappe
from datetime import datetime, timedelta

def execute(method=None):
    """Send reminders for tasks due today"""

    # Find tasks due today that are still pending
    today = datetime.now().date()

    tasks = frappe.get_all(
        'Maintenance Visit',
        filters={
            'completion_status': 'Pending',
            'mntc_date': ['between', [today, today + timedelta(days=1)]]
        },
        fields=['name', 'mntc_work_details', 'assign_to', 'custom_priority', 'mntc_date', 'custom_telegram_message_id']
    )

    for task in tasks:
        # Call n8n webhook to send Telegram + Email
        send_reminder_webhook(task)


def send_reminder_webhook(task):
    """Trigger n8n workflow for multi-channel reminder"""
    import requests

    webhook_url = frappe.conf.get('n8n_reminder_webhook_url')

    if not webhook_url:
        frappe.log_error('n8n webhook URL not configured', 'Reminder Script')
        return

    payload = {
        'task_id': task.name,
        'description': task.mntc_work_details,
        'assignee_email': task.assign_to,
        'priority': task.custom_priority or 'Medium',
        'due_date': str(task.mntc_date),
        'telegram_chat_id': get_telegram_chat_id(task.assign_to),  # Lookup from User
        'original_message_id': task.custom_telegram_message_id
    }

    try:
        requests.post(webhook_url, json=payload, timeout=5)
    except Exception as e:
        frappe.log_error(f'Failed to send reminder webhook: {str(e)}', 'Reminder Script')


def get_telegram_chat_id(user_email):
    """Retrieve Telegram chat ID from User custom field"""
    user = frappe.get_doc('User', user_email)
    return user.custom_telegram_chat_id if hasattr(user, 'custom_telegram_chat_id') else None
```

**Scheduler Configuration:**

- **Event:** Daily (9 AM local time)
- **Frequency:** All Days
- **Enabled:** Yes

#### Step 2: Create n8n Workflow

Workflow: `task-reminder-notification`

**Nodes:**

1. **Webhook Trigger** (receives Server Script POST)
   - Path: `/webhook/task-reminder`
   - Method: POST
   - Authentication: None (use random token in URL)

2. **Email Node** (Send via Frappe SMTP)
   - To: `{{ $json.assignee_email }}`
   - Subject: `Reminder: {{ $json.description.substring(0, 50) }}`
   - Body: Email template with task details

3. **Telegram Node** (Send via Telegram Bot API)
   - Chat ID: `{{ $json.telegram_chat_id }}`
   - Message:
     `🔔 Reminder: Your task "${$json.description}" is due today! Priority: ${$json.priority}`
   - Reply To Message ID: `{{ $json.original_message_id }}` (thread context)

4. **ERPNext Log Node** (Optional: Log reminder sent)
   - POST to ERPNext Notification Log DocType

**Pros:**

- ✅ Multi-channel (Email + Telegram)
- ✅ Advanced routing logic
- ✅ Thread context in Telegram (reply to original message)
- ✅ Retry logic in n8n

**Cons:**

- ❌ Requires n8n deployment
- ❌ More complex setup
- ❌ External dependency (n8n)

---

### Option 3: Pure ERPNext Workflows (Future)

**Best For:** Complex approval workflows, state machines

**Note:** Workflows are more suited for approval processes (e.g., "Manager
approves task → Send to assignee"). For simple time-based reminders, Email
Alerts or Server Scripts are better.

**Use Case Example:**

```
Task Created → Manager Review → Approved → Send to Assignee → Reminder at 80% Due Time
```

**When to Use:**

- Multi-step approval processes
- Conditional routing based on task priority/type
- Integration with ERPNext's built-in approval UI

---

## Recommended Approach for MVP

### Phase 1: Email Alerts (Immediate)

**Timeline:** 1-2 hours

**Implementation:**

1. Create Email Alert for tasks due today
2. Create Email Alert for overdue tasks
3. Test with sample Maintenance Visits

**Benefits:**

- No code required
- Works immediately
- Email coverage sufficient for MVP

---

### Phase 2: Server Scripts + n8n (Post-MVP)

**Timeline:** 1-2 days

**Implementation:**

1. Add `custom_telegram_chat_id` field to User DocType
2. Create Server Script for daily reminders
3. Create n8n workflow for multi-channel delivery
4. Test Telegram threading (reply to original message)
5. Monitor ERPNext Notification Logs

**Benefits:**

- Telegram notifications for mobile users
- Thread context in Telegram (cleaner UX)
- Advanced routing logic (e.g., urgent tasks → immediate notification)

---

## Field Requirements

### Custom Fields Needed

**User DocType:**

- `custom_telegram_chat_id` (Data, Read-only)
  - Populated when user first interacts with Telegram bot
  - Used to send Telegram reminders

**Maintenance Visit DocType:**

- `custom_telegram_message_id` (Data)
  - Already exists (see FIELD-MAPPING.md)
  - Used for Telegram threading (reply to original message)

---

## Scheduling Details

### Email Alert Scheduling

**Frappe Cloud Cron:**

- Runs hourly by default
- Email Alerts evaluated every hour
- "Time to Send" field controls exact delivery time

**Example Schedule:**

- 09:00 UTC → Check all Email Alerts with `Time to Send = 09:00`
- 14:00 UTC → Check all Email Alerts with `Time to Send = 14:00`

### Server Script Scheduling

**Scheduler Event Types:**

- `hourly` - Every hour
- `daily` - Once per day (specify time)
- `weekly` - Once per week (specify day + time)
- `cron` - Custom cron expression

**Recommended for Reminders:**

```python
# Scheduler Event: Daily at 09:00 local time
Event: Daily
Enabled: Yes
```

---

## Testing Checklist

### Email Alert Testing

- [ ] Create Maintenance Visit with due date = today
- [ ] Set `completion_status = 'Pending'`
- [ ] Wait for next Email Alert cron run (max 1 hour)
- [ ] Verify email received by assignee
- [ ] Check Email Alert log for delivery status

### Server Script Testing

- [ ] Enable Server Script in Frappe settings
- [ ] Create test Maintenance Visit due today
- [ ] Manually trigger scheduler:
      `bench execute frappe.utils.scheduler.execute_scheduler_event`
- [ ] Check n8n webhook logs
- [ ] Verify Telegram message sent
- [ ] Verify email sent

### Integration Testing

- [ ] End-to-end: Telegram message → Task creation → Reminder sent
- [ ] Test overdue task reminders
- [ ] Test high-priority task escalation
- [ ] Verify Telegram threading (reply to original message)

---

## Monitoring & Alerts

### ERPNext Logs

**Email Alert Log:**

- `Settings > Email Alert > [Alert Name] > View Logs`
- Shows delivery status, errors, timestamps

**Server Script Error Log:**

- `Settings > Error Log`
- Shows Python exceptions from Server Scripts

**Notification Log:**

- `Settings > Notification Log`
- Custom logging from Server Scripts

### n8n Monitoring

**Execution Logs:**

- n8n UI → Executions → Filter by workflow
- Shows success/failure, execution time, errors

**Metrics to Track:**

- Reminder delivery rate (% successful)
- Average delivery latency
- Error rate per channel (Email vs Telegram)

---

## Cost Implications

### Email Alerts (Native)

**Cost:** $0 (included in Frappe Cloud)

**Limits:**

- Frappe Cloud SMTP quota (typically 1000 emails/day)
- No rate limiting within ERPNext

### Server Scripts + n8n

**Cost:**

- n8n self-hosted: $18/month (DigitalOcean)
- Telegram Bot API: $0 (free)
- ERPNext Server Script: $0 (included)

**Total:** ~$18/month (same as existing n8n deployment)

---

## Migration Path from n8n to ERPNext Native

**Current State (MVP):**

- No reminders implemented

**Option 1: Email Alerts Only**

- Implement Email Alerts
- Defer Telegram reminders to later phase
- **Cost:** $0, **Complexity:** Low

**Option 2: Hybrid (Recommended)**

- Implement Email Alerts for basic coverage
- Add Server Scripts + n8n for Telegram
- **Cost:** $18/month (existing n8n), **Complexity:** Medium

**Option 3: Full ERPNext Native (Future)**

- Implement custom Frappe app with Telegram integration
- Replace n8n entirely
- **Cost:** $0 additional, **Complexity:** High (requires Frappe development)

---

## Example Use Cases

### Use Case 1: Daily Task Digest

**Requirement:** Send users a daily summary of pending tasks

**Implementation:** Email Alert

```python
# Email Alert: Daily Task Digest
Document Type: Maintenance Visit
Send Alert On: Time Based
Time to Send: 07:00
Days Before or After: 0
Condition: doc.completion_status == 'Pending'

# Group by assignee, send one email per user with all pending tasks
```

### Use Case 2: Urgent Task Escalation

**Requirement:** Immediately notify assignee of urgent tasks

**Implementation:** Server Script + n8n

```python
# Server Script: Urgent Task Notification
# Trigger: After Insert (Maintenance Visit)

def execute(doc, method):
    if doc.custom_priority == 'Urgent':
        send_immediate_notification(doc)
```

### Use Case 3: Overdue Task Reminder

**Requirement:** Remind users of overdue tasks every day

**Implementation:** Email Alert

```python
# Email Alert: Overdue Tasks
Document Type: Maintenance Visit
Send Alert On: Time Based
Time to Send: 09:00
Days Before or After: -1  # One day after due date
Condition: doc.completion_status == 'Pending' and doc.mntc_date < frappe.utils.nowdate()
```

---

## References

- ERPNext Email Alerts:
  `https://docs.erpnext.com/docs/user/manual/en/setting-up/email/email-alerts`
- Frappe Server Scripts:
  `https://frappeframework.com/docs/user/en/desk/scripting/server-script`
- n8n Workflows: `docs/architecture/current-frappe-cloud-architecture.md`
- Field Mapping: `docs/FIELD-MAPPING.md`

---

**Document Owner:** Backend Team **Implementation Priority:** Post-MVP
**Estimated Effort:** 2-4 hours (Email Alerts), 1-2 days (Hybrid) **Last
Reviewed:** October 2025
