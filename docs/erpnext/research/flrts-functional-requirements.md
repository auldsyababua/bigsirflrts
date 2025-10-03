# FLRTS Functional Requirements (Business-First)

**Status:** Not Started **Phase:** 1.2 **Agent:** Claude (general-purpose) +
User **Date Created:** 2025-09-30

## Purpose

Define what FLRTS needs functionally, independent of any technical
implementation (OpenProject, ERPNext, or custom).

**Critical:** Forget current schema. Start from business needs.

## Business Entities

### Sites/Locations

**What is it?** Physical locations where work happens

**Required Attributes:**

- Name (human-readable)
- Code (short identifier for Telegram/quick reference)
- Aliases (alternative names people use)
- Physical location (address, coordinates)
- Status (active/inactive)
- Notes/special instructions

**Business Rules:**

<!-- Define rules, e.g., "Codes must be unique and uppercase" -->

### Contractors

**What is it?** External companies/people who perform work

**Required Attributes:**

- Name
- Contact information (phone, email)
- Sites they're assigned to
- Status (active/inactive)
- Performance tracking?

**Business Rules:**

<!-- Define rules -->

### Personnel

**What is it?** People who use the system (employees, supervisors)

**Required Attributes:**

- Name
- Telegram user ID (critical for bot integration)
- Telegram username
- Phone number (with country code)
- Timezone (for scheduling)
- Role in FLRTS (not technical permission - business role)
- Status

**Business Rules:**

<!-- Define rules, e.g., "Telegram user ID must be unique" -->

### Work

**What is it?** Tasks, projects, work orders - things that need to be done

**Required Attributes:**

- Title/subject
- Description
- Site/location
- Assigned to (person or contractor)
- Status (what are valid statuses?)
- Priority
- Due date
- Created date/time
- Created by
- Subtasks? (Can work have child tasks?)
- Checklists? (Can work have completion checklists?)

**Business Rules:**

<!-- Define rules, e.g., "Work must be assigned to a site" -->

**Status Workflow:**

<!-- Define valid status transitions, e.g., "Draft → Open → In Progress → Completed → Closed" -->

### Lists

**What is it?** Shopping lists, checklists, to-do lists

**Required Attributes:**

<!-- User to define - what are lists for? -->

**Business Rules:**

### Reminders

**What is it?** Time-based notifications/events

**Required Attributes:**

<!-- User to define - what are reminders for? -->

**Business Rules:**

## Workflows

### How does work get created?

1. **Via Telegram:**
   - User sends message to bot
   - Bot parses message (OpenAI)
   - Creates work order
   - Confirms back to user

2. **Via Web UI:**
   <!-- Define if needed -->

3. **Via n8n automation:**
   <!-- Define if needed -->

### How does work get assigned?

<!-- Define assignment process -->

### What are the status transitions?

<!-- Define complete workflow for work lifecycle -->

### What triggers notifications?

<!-- Define all notification scenarios -->

## Reports Needed

### Site Activity Summary

**What it shows:**

<!-- Define report requirements -->

**Who sees it:**

<!-- Define audience -->

**How often:**

<!-- Define frequency -->

### Contractor Performance

**What it shows:**

**Who sees it:**

**How often:**

### Work Completion Rates

**What it shows:**

**Who sees it:**

**How often:**

### Time Tracking

**What it shows:**

**Who sees it:**

**How often:**

## Critical Integrations

### Telegram Bot

**Purpose:** Primary input method for creating work

**Requirements:**

- Accept natural language messages
- Parse using OpenAI
- Create work orders
- Send confirmations
- Send notifications when work status changes

**Data flows:**

<!-- Define data flows -->

### n8n Workflows

**Purpose:** Automation and notifications

**Requirements:**

- Trigger on work order events (created, updated, completed)
- Send Telegram notifications
- Log to Supabase for analytics
- Other automation?

**Data flows:**

### Supabase

**Purpose:** Analytics and custom dashboards

**Requirements:**

- Cache work order data for fast queries
- Support custom reporting
- Integrate with custom dashboards (if built)

**Data flows:**

### OpenAI

**Purpose:** Natural language parsing

**Requirements:**

- Parse Telegram messages
- Extract: site, task description, assignee, priority
- Handle ambiguity

**Data flows:**

## Questions for User

<!-- Agent: Ask user to clarify any undefined sections above -->

1. What are "Lists" used for in FLRTS?
2. What are "Reminders" used for?
3. What reports are most critical?
4. Are there other integrations needed?
5. What's the complete workflow for a work order from creation to completion?

## Summary

<!-- Agent: After user input, summarize core functional requirements -->
