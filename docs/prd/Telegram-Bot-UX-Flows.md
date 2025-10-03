# Telegram Bot UX Flows & Message Templates

## Overview

This document defines the conversational flows and message templates for the
FLRTS Telegram Bot interface. The design prioritizes clarity and simplicity for
5-10 internal users, focusing on mobile-first interaction patterns within
Telegram's text-only constraints.

## Design Principles

- **Mobile-First Format**: Short lines, clear sections, emoji landmarks for
  scanning
- **Progressive Disclosure**: Start simple, add detail as needed
- **Error Prevention**: Show parsed understanding before action
- **Easy Recovery**: Clear correction instructions at each step
- **Capture All Interactions**: Keep users in-bot to improve NLP pipeline
- **Soft Delete Only**: All deletions are archives for audit trail

---

## 1. ONBOARDING & COMMAND DISCOVERY

### /start Command

```
🤖 Welcome to FLRTS Bot!

Quick task & list creation using natural language.

🚀 Quick Start:
• "Create task for Taylor to review logs by 2pm"
• "New list for Q1 infrastructure projects"
• "Show my tasks for today"

Commands: /help for all options
```

### /help Command

```
📋 FLRTS Commands

TASKS:
/createtask (/newtask) - Create new task
/updatetask - Modify existing task
/deletetask - Delete a task
/viewtasks - Show tasks

LISTS:
/createlist (/newlist) - Create new list
/updatelist - Modify existing list
/viewlists - Show lists

💡 Or just type naturally and I'll understand!
```

---

## 2. TELEGRAM BOT MENU STRUCTURE

```
🔘 Bot Menu Buttons (Always Visible):
┌─────────────────────────┐
│ 📝 New Task             │
│ 📋 New List             │
│ 👁 View Tasks           │
│ 📊 View Lists           │
└─────────────────────────┘
```

---

## 3. TASK OPERATIONS

### Create Task Flow

#### /createtask or /newtask Command

```
📝 Creating New Task

What needs to be done?
(or type the complete task naturally)

Example: "Taylor needs to review server logs by tomorrow 2pm"
```

#### Task Creation Confirmation

```
✅ Ready to create:

📝 NEW TASK
━━━━━━━━━━━━━━━
Assignee: Taylor Martinez
Task: Review server logs
Due: Jan 16, 2025 @ 2:00 PM
Project: Infrastructure
Priority: Normal
List: Unassigned

Reply:
• "confirm" → Create task
• "add to [list name]" → Assign to list
• "change X to Y" → Modify
• "cancel" → Abort
```

### Update Task Flow

#### /updatetask Command

```
📝 Update Task

Which task? (provide #ID or description)

Recent tasks:
1. #1234 - Server logs review (Taylor)
2. #1235 - API documentation (Colin)
3. #1236 - Database backup (Sarah)

Reply with number or task ID.
```

#### Update Confirmation

```
✅ Ready to update:

📝 UPDATE TASK #1234
━━━━━━━━━━━━━━━
Current: Deploy API v2.1
Change to: Deploy API v2.2

Due Date:
Current: Jan 14 @ 3:00 PM
Change to: Jan 16 @ 3:00 PM

Assignee: No change (Colin)

Reply:
• "confirm" → Update task
• "also change X" → Add changes
• "cancel" → Keep unchanged
```

### Delete Task Flow

#### /deletetask Command

```
🗑 Delete Task

Which task to delete?

Your recent tasks:
1. #1234 - Server logs review ✓ Completed
2. #1235 - API documentation 🔄 In Progress
3. #1236 - Database backup 📅 Due Tomorrow

Reply with number or #ID.
```

#### Delete Confirmation

```
🗑 Confirm Delete

DELETE TASK #1234
━━━━━━━━━━━━━━━
Title: Server logs review
Assignee: Taylor Martinez
Status: Completed
Created: Jan 10, 2025

Reply "delete" to confirm or "cancel" to keep.
```

### View Tasks

#### /viewtasks Response

```
👁 Your Tasks

TODAY (3):
━━━━━━━━━━━━━━━
⚡ #1234 Server logs review
   Due: 2:00 PM • Taylor

🔄 #1235 API documentation
   Due: 5:00 PM • You

📅 #1236 Database backup
   Due: 11:59 PM • Sarah

TOMORROW (2):
━━━━━━━━━━━━━━━
📝 #1237 Deploy v2.1
📝 #1238 Team standup prep

Reply with task # for details.
```

---

## 4. LIST OPERATIONS

### Create List Flow

#### /createlist or /newlist Command

```
📋 Creating New List

List name and purpose?

Example: "Q1 Infrastructure Tasks for server migration project"
```

#### List Creation Confirmation

```
✅ Ready to create:

📋 NEW LIST
━━━━━━━━━━━━━━━
Name: Q1 Infrastructure Tasks
Description: Server migration project
Project: Infrastructure
Visibility: Team

Reply:
• "confirm" → Create list
• "private" → Make private list
• "change X to Y" → Modify
• "cancel" → Abort
```

### Update List Flow

#### /updatelist Command

```
📋 Update List

Your lists:
1. Q1 Infrastructure (12 tasks)
2. Bug Fixes (8 tasks)
3. Documentation (5 tasks)

Which list to update? Reply with number.
```

### View Lists

#### /viewlists Response

```
📊 Your Lists

ACTIVE LISTS:
━━━━━━━━━━━━━━━
📋 Q1 Infrastructure
   12 tasks • 3 overdue

📋 Bug Fixes
   8 tasks • 2 critical

📋 Documentation
   5 tasks • All on track

Reply with list name to see tasks.
```

---

## 5. NATURAL LANGUAGE PARSING

### Multi-Entity Detection

```
📊 I found multiple items:

Your message: "Create a bug fixes list and add Taylor's login bug task to it"

Actions detected:
1. CREATE LIST: "Bug Fixes"
2. CREATE TASK: "Login bug" → Taylor
3. ASSIGN: Task to "Bug Fixes" list

Reply:
• "confirm all" → Execute all
• "1,2" → Execute only 1 and 2
• "modify" → Make changes
```

### Complex Query Handling

```
📊 Processing Complex Request

I understand you want to:
• Update 5 tasks
• Move them to new list
• Change all due dates
• Reassign to different team members

Let me break this down:

UPDATES (5 tasks):
━━━━━━━━━━━━━━━
1. #1234 → Taylor → Jan 20
2. #1235 → Colin → Jan 21
3. #1236 → Sarah → Jan 22
4. #1237 → Mike → Jan 23
5. #1238 → Taylor → Jan 24

New List: "Rescheduled Items"

Reply "confirm" to execute all changes.
```

---

## 6. CORRECTION LOOP UX

### First Correction Request

```
🤔 Let me adjust that:

📝 CREATE TASK (v2)
━━━━━━━━━━━━━━━
Assignee: Taylor Martinez ✓
Task: Review server logs ✓
Due: Jan 15, 2025 @ 2:00 PM
Project: Infrastructure ✓
Priority: Normal → High ✨

Changes made:
• Priority changed to High

Reply "confirm" or make more changes.
```

### Multi-Field Correction

```
User: "Change assignee to Colin and due date to tomorrow 5pm"

Bot:
🔄 Updating...

📝 CREATE TASK (v3)
━━━━━━━━━━━━━━━
Assignee: Taylor → Colin Aulds ✨
Task: Review server logs ✓
Due: Tomorrow (Jan 16) @ 5:00 PM ✨
Project: Infrastructure ✓
Priority: High ✓

Changes:
• Assignee: Taylor → Colin
• Due: Jan 15 2pm → Jan 16 5pm

Reply "confirm" or continue adjusting.
```

### Progressive Refinement

```
User: "Server migration task"

Bot:
ℹ️ I need more details:

Task: Server migration ✓
Assignee: ?
Due date: ?

Who should handle this and when?

User: "Colin, end of week, high priority"

Bot:
✅ Complete!

📝 CREATE TASK
━━━━━━━━━━━━━━━
Assignee: Colin Aulds
Task: Server migration
Due: Jan 17 (Fri) @ 5:00 PM
Priority: High
Project: Infrastructure

Reply "confirm" to create.
```

---

## 7. ERROR STATES & RECOVERY

### Parse Failure - Need More Info

```
❓ I need more details:

Your message: "get stuff done"

Please specify:
• What task needs to be done?
• Who should do it?
• When is it due?

Example: "Colin needs to update the API docs by Friday"
```

### Parse Failure - Unknown Entity

```
⚠️ Can't find that item

No task found with: "#9999"

Try:
• /viewtasks - See all tasks
• Search by keywords: "login bug"
• Recent task IDs: #1234-#1240
```

### Parse Failure - Ambiguous Input

```
❓ I need clarification:

Your message: "Get that thing done by Monday"

Missing info:
• Who should do this? (assignee)
• What specifically? (task details)
• Which Monday? (Jan 20 or 27?)

Please try again with more details.
```

### Network/API Error

```
❌ Connection Error

I couldn't reach ERPNext. The task wasn't created.

Your input was saved:
"Taylor needs to review logs by 2pm"

Options:
• Reply "retry" - Try again
• Wait and try later
```

---

## 8. BATCH OPERATIONS

### Fast Entry Mode

```
⚡ Fast Entry Mode

Type multiple tasks separated by semicolons:

"Taylor: logs review; Colin: update docs tomorrow; Sarah: test API by Friday"

I'll parse and confirm all at once.
```

### Bulk Task Creation

```
⚡ Batch Mode Detected

Creating 4 tasks:
━━━━━━━━━━━━━━━
1. ✓ Taylor: Review logs (Today 2pm)
2. ✓ Colin: Update docs (Tomorrow)
3. ⚠️ "That thing" - needs assignee
4. ✓ Sarah: Test API (Friday)

Fix #3 or reply:
• "skip 3" → Create 1,2,4 only
• "assign 3 to Mike" → Fix & create all
• "cancel" → Abort all
```

### Bulk Updates

```
📊 Bulk Update

Updating 8 tasks in "Bug Fixes" list:
• Moving all to "In Progress"
• Setting priority to High
• Due dates pushed by 2 days

Affected tasks:
#1234, #1235, #1236, #1237,
#1238, #1239, #1240, #1241

Reply "confirm" to update all.
```

---

## 9. QUICK ACTION BUTTONS

### Contextual Actions

Every response includes relevant quick action buttons:

```
Task Created! #1234

[➕ Add Another] [📋 Add to List] [👁 View All]
```

```
List Updated: Bug Fixes

[➕ Add Task] [👁 View Tasks] [📊 Show Lists]
```

---

## 10. COMPLETION CONFIRMATIONS

### Task Created

```
✅ Task Created!

Task #1234 assigned to Taylor Martinez
Due: Jan 15 @ 2:00 PM

What's next?
• Type another task
• /viewtasks - See all tasks
```

### Task Updated

```
✅ Task #1234 Updated!

Changes applied:
• Due date → Jan 16 @ 5:00 PM
• Priority → High

Taylor has been notified.
```

### Task Deleted

```
✅ Task #1234 Deleted

The task has been archived and removed from active lists.
```

### List Created

```
✅ List Created!

"Q1 Infrastructure Tasks" is ready for tasks.

• Add tasks: "Add login bug fix to Q1 Infrastructure"
• View list: /viewlists
```

---

## Visual Indicators Legend

- ⚡ **Urgent/Active** - Requires immediate attention
- 🔄 **In Progress** - Currently being worked on
- 📅 **Scheduled** - Future dated item
- ✓ **Completed** - Done/finished
- ⚠️ **Warning** - Needs attention or has issues
- 📝 **Task** - Standard task item
- 📋 **List** - Task list or collection
- 👁 **View** - Display/read operation
- 🗑 **Delete** - Archive/soft delete operation
- ❓ **Help/Unknown** - Needs clarification
- ❌ **Error** - Operation failed
- ✅ **Success** - Operation completed

---

## Implementation Notes

1. **All deletes are soft deletes** - Archive to maintain audit trail
2. **No ERPNext redirects** - Keep users in bot to capture interaction data
3. **Mobile-first design** - Optimized for phone screens
4. **Text-only interface** - Work within Telegram's constraints
5. **Confirmation before execution** - Prevent accidental operations
6. **Natural conversation flow** - Support corrections through replies
7. **Batch operations** - Enable efficient bulk actions
8. **Clear visual hierarchy** - Use emoji and formatting for scanning

---

## Future Enhancements (Post-MVP)

- Voice message support for task creation
- Inline keyboards for common actions
- Rich media attachments for tasks
- Smart suggestions based on patterns
- Team-wide broadcast notifications
- Integration with calendar view
- Recurring task templates
- Custom reminder schedules
