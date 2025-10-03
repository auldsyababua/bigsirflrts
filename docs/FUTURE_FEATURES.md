# Future Features

This document tracks features and enhancements that are planned for future
development but not currently prioritized for the MVP or immediate sprints. This
is the canonical location for recording post-MVP feature ideas and technical
debt items.

**Note**: This document has been updated (2025-10-01) to reflect the ERPNext
backend adoption ([10N-227](https://linear.app/10netzero/issue/10N-227)). All
features are now mapped to ERPNext DocTypes and implementation patterns.

## ERPNext Schema Enhancements (Post-MVP)

### Parser Metadata Tracking

**Priority:** High (Post-MVP Phase 1) **Description:** Add comprehensive
metadata tracking for NLP parser performance, model versions, and confidence
scores to monitor and improve task creation accuracy over time.

**Current State:** MVP creates tasks via Telegram without tracking parser
metadata

**Requirements:**

- Add to `tasks` table (or ERPNext Maintenance Visit custom fields):
  - `parser_confidence` DECIMAL(3,2) - Confidence score from GPT-4o (0.00-1.00)
  - `parser_version` VARCHAR(50) - Parser version/commit hash
  - `parser_model` VARCHAR(50) - AI model used (e.g., "gpt-4o-2024-08-06")
  - `parsing_duration_ms` INTEGER - Time taken to parse message
- Dashboard for parser analytics:
  - Average confidence scores over time
  - Model performance comparison
  - Failed parse rate tracking
  - Confidence threshold analysis
- Alert system for degraded parser performance

**ERPNext Implementation:**

- Custom fields on Maintenance Visit: `custom_parser_confidence`,
  `custom_parser_model`, `custom_parser_version`
- Custom Report: "NLP Parser Performance Dashboard"
- Server script to track parsing metrics

**Context:** Helps identify when model changes or prompt engineering updates
improve or degrade parsing quality. Critical for maintaining high accuracy as
the system scales.

**Estimated Effort:** 1 sprint **Dependencies:** ERPNext custom fields,
reporting dashboard, parser service updates

---

### User Notification Preferences

**Priority:** High (Post-MVP Phase 1) **Description:** Per-user notification
preferences for reminder timing, daily summaries, and quiet hours.

**Current State:** MVP has basic reminders without user customization

**Requirements:**

- Add to `personnel` / `flrts_users` table (or ERPNext User custom fields):
  - `reminder_minutes_before` INTEGER DEFAULT 30 - Default reminder lead time
  - `daily_summary_enabled` BOOLEAN DEFAULT FALSE - Enable daily task digest
  - `daily_summary_time` TIME DEFAULT '08:00' - When to send daily summary
  - `quiet_hours_start` TIME - Start of quiet hours (no notifications)
  - `quiet_hours_end` TIME - End of quiet hours
  - `notification_channels` JSONB - Preferred channels per notification type
- User settings interface (Telegram commands or web UI):
  - `/settings reminders` - Configure reminder preferences
  - `/settings summary` - Configure daily summary
  - `/settings quiet` - Configure quiet hours
- Notification service respects user preferences
- Timezone-aware delivery

**ERPNext Implementation:**

- Custom fields on User DocType: `custom_reminder_minutes`,
  `custom_daily_summary_enabled`, `custom_daily_summary_time`
- Custom DocType: "FLRTS User Notification Preferences" (child table with
  notification type rules)
- Server script to check preferences before sending notifications

**Context:** Users have different work patterns and notification preferences.
Giving them control improves satisfaction and reduces notification fatigue.

**Estimated Effort:** 1-2 sprints **Dependencies:** User settings UI,
notification service refactor

---

### Notification Engagement Tracking

**Priority:** Medium (Post-MVP Phase 2) **Description:** Track notification
delivery, read status, and user actions to measure notification effectiveness
and improve delivery.

**Current State:** MVP sends notifications without tracking engagement

**Requirements:**

- Add to `notifications_log` table (or ERPNext custom Notification Log):
  - `read_at` TIMESTAMPTZ - When user viewed notification
  - `action_taken` VARCHAR(50) - What user did (clicked, dismissed, snoozed,
    completed_task)
  - `action_taken_at` TIMESTAMPTZ - When action occurred
  - `retry_count` INTEGER DEFAULT 0 - Delivery retry attempts
  - `delivery_error` TEXT - Last delivery error message
  - `delivery_latency_ms` INTEGER - Time from creation to delivery
- Analytics dashboard:
  - Read rate by notification type
  - Action conversion rate (notification → task completion)
  - Average time to read/act
  - Failed delivery analysis
  - Channel effectiveness comparison
- A/B testing framework for notification formats

**ERPNext Implementation:**

- Custom DocType: "FLRTS Notification Log" with engagement fields
- Custom Report: "Notification Effectiveness Dashboard"
- Webhook from Telegram bot to record read receipts
- Server script to track action events

**Context:** Helps optimize notification timing, format, and channels.
Identifies which notifications drive action vs. create noise.

**Estimated Effort:** 2 sprints **Dependencies:** Telegram bot webhook,
analytics infrastructure

---

### Document Access Tracking

**Priority:** Low (Post-MVP Phase 3) **Description:** Track when documents and
media files are last accessed to identify stale content for cleanup.

**Current State:** MVP has document storage without access tracking

**Requirements:**

- Add to `brain_bot_documents` and `brain_bot_media_files`:
  - `last_accessed_at` TIMESTAMPTZ - Last time document was viewed
  - `access_count` INTEGER DEFAULT 0 - Total access count
  - `unique_users_accessed` INTEGER DEFAULT 0 - Unique user count
- Automatic update on document read/retrieval
- Stale content report:
  - Documents not accessed in 90+ days
  - Media files with zero access
  - Outdated document versions
- Cleanup workflow for archiving unused content

**ERPNext Implementation:**

- Custom fields on File DocType: `custom_last_accessed`, `custom_access_count`
- Server script to auto-update on file access
- Custom Report: "Stale Documents Cleanup List"

**Context:** Knowledge base grows over time. Tracking access helps identify
outdated content for cleanup, improving search relevance and storage costs.

**Estimated Effort:** 1 sprint **Dependencies:** File access hooks, cleanup
automation

---

### Enhanced Audit Trail

**Priority:** Medium (Post-MVP Phase 2) **Description:** Forensic-level audit
logging for task changes, including IP address, user agent, and client type for
security and compliance.

**Current State:** MVP has basic `task_assignment_history` without forensic
details

**Requirements:**

- Add to `task_assignment_history` (or ERPNext Version Control):
  - `ip_address` INET - User's IP address
  - `user_agent` TEXT - Browser/client user agent string
  - `client_type` VARCHAR(50) - Source of change (telegram, web, api, n8n)
  - `geographic_location` JSONB - IP geolocation data (optional)
  - `session_id` VARCHAR(100) - Session identifier for correlation
- Enhanced audit report:
  - Changes by user, date range, entity
  - Suspicious activity detection (unusual IPs, times)
  - Compliance export (GDPR, SOC2)
- Configurable retention policy (e.g., 7 years for compliance)

**ERPNext Implementation:**

- ERPNext has built-in Version Control - enhance with custom fields
- Custom Report: "Audit Trail Export (Compliance)"
- Server script to capture IP/user agent on all changes
- Integration with security monitoring tools

**Context:** Helps investigate security incidents, meet compliance requirements,
and understand user behavior patterns.

**Estimated Effort:** 1-2 sprints **Dependencies:** Enhanced logging
infrastructure, GDPR compliance review

---

## Security & Authentication

### Advanced Prompt Injection Protection with User Scoping

**Priority:** High (Post-MVP Phase 2) **Description:** Implement comprehensive
prompt injection protection for the Telegram task creation workflow using
LLMGuard or similar security framework, combined with a user scoping system that
limits the blast radius of malicious content based on user privilege levels and
data isolation boundaries.

**Current State:** Basic input validation only (length limits, basic content
filtering). All users operate at same privilege level with access to shared
data.

**Requirements:**

**Security Framework:**

- Integrate LLMGuard or equivalent prompt injection detection
- Implement content filtering for malicious patterns
- Add monitoring and alerting for detected injection attempts
- Create fallback workflows for blocked inputs

**User Scoping & Privilege System:**

- **User Risk Levels**: Define user categories (Guest, Employee, Supervisor,
  Admin) with different UGC risk tolerances
- **Data Isolation Boundaries**: Implement scoped access where certain user
  levels can only affect their own data or team-specific elements
- **Privilege-Based Processing**: Different prompt processing strictness based
  on user level (e.g., Guests get maximum filtering, Admins get minimal
  filtering)
- **Blast Radius Limitation**: Ensure malicious prompts can only affect the
  user's own tasks/data, not system-wide or other users' data

**Scoping Schema Design (Future Planning):**

- User-specific task namespaces
- Team-based data segregation
- Role-based prompt processing policies
- Graduated privilege escalation system
- Cross-user impact prevention mechanisms

**Security Isolation Examples:**

- Guest users: Can only create/modify their own tasks, heavy prompt filtering
- Field employees: Can affect team tasks but not other teams, moderate filtering
- Supervisors: Can affect department-wide tasks, light filtering
- Admins: System-wide access with audit logging, minimal filtering

**ERPNext Implementation:**

- Use ERPNext's native Role Permission system for data isolation
- Custom Permission Rules for row-level security
- Custom validation scripts with LLMGuard integration
- Server script to enforce privilege-based prompt filtering

**Context:** Identified during Story 1.3 security review. Current MVP approach
uses trusted user base and basic validation, but production deployment requires
comprehensive protection against prompt injection attacks AND a way to limit the
damage scope based on user privilege levels and data ownership boundaries.

**Estimated Effort:** 3-4 sprints (2 for security framework, 1-2 for scoping
system) **Dependencies:** LLMGuard integration, monitoring infrastructure, user
management system redesign, ERPNext permission configuration

---

## Notifications & Integrations

### Telegram Bot Integration

**Priority:** Medium (Post-MVP Phase 2) **Description:** Implement native
Telegram bot integration for task creation, updates, and notifications without
requiring the Mini App interface.

**Current State:** Telegram Mini App integration planned for MVP (web-based
interface)

**Requirements:**

- Native Telegram Bot API integration using polling or webhooks
- Slash commands for task operations (/create, /list, /update, /complete)
- Inline keyboards for quick task actions (assign, prioritize, complete)
- Rich message formatting with task details and status
- Proactive notifications for:
  - Task assignments
  - Due date reminders
  - Status changes
  - Comment mentions
- Group chat support for team task management
- Direct message support for personal task lists

**ERPNext Implementation:**

- ERPNext Webhook DocType triggers Telegram notifications
- n8n workflow receives ERPNext webhooks → formats → sends Telegram messages
- Telegram bot commands call ERPNext REST API
- Use ERPNext's Comment feature for Telegram thread integration

**Context:** While the MVP uses a Telegram Mini App, many users prefer native
bot interactions for speed and simplicity. Native bot commands provide faster
task creation and management without opening a web interface.

**Estimated Effort:** 2-3 sprints **Dependencies:** Telegram Bot API, webhook
infrastructure, notification queue system, ERPNext API

---

### Slack App Integration

**Priority:** Medium (Post-MVP Phase 3) **Description:** Create a comprehensive
Slack app for task management within Slack workspaces, enabling natural language
task creation and team collaboration.

**Current State:** No Slack integration currently planned

**Requirements:**

- Slack App with OAuth 2.0 authentication
- Slash commands (/flrts-create, /flrts-list, /flrts-assign)
- Interactive messages with buttons and select menus
- Modal dialogs for detailed task creation/editing
- Thread-based task discussions
- Channel-specific task lists and project associations
- Notification features:
  - DM notifications for personal task updates
  - Channel notifications for team tasks
  - Customizable notification preferences
  - @mentions in task comments
- Natural language processing via Slack messages
- Home tab with personal task dashboard
- Workflow builder integration for automation

**ERPNext Implementation:**

- Similar pattern to Telegram: ERPNext webhooks → n8n → Slack
- Slack commands → n8n → ERPNext REST API
- Use ERPNext Project DocType for Slack channel associations

**Context:** Many organizations use Slack as their primary communication
platform. Native Slack integration would enable seamless task management without
context switching, improving adoption and team collaboration.

**Estimated Effort:** 3-4 sprints **Dependencies:** Slack API, OAuth
infrastructure, event subscription handling, Block Kit UI components

---

### Multi-Channel Notification System

**Priority:** High (Post-MVP Phase 2) **Description:** Unified notification
framework supporting multiple channels with user preferences and intelligent
routing.

**Current State:** Basic email notifications planned for MVP

**Requirements:**

- Centralized notification service with channel abstraction
- Supported channels:
  - Email (enhanced with templates and tracking)
  - Telegram (bot messages and Mini App push)
  - Slack (DMs and channel messages)
  - SMS (via Twilio or similar)
  - In-app notifications (WebSocket real-time)
  - Mobile push (iOS/Android future apps)
- User preference management:
  - Channel preferences per notification type
  - Quiet hours and timezone-aware delivery
  - Notification frequency controls (immediate, digest, daily summary)
  - Opt-in/opt-out granular controls
- Intelligent routing:
  - Escalation paths for urgent tasks
  - Fallback channels if primary fails
  - De-duplication across channels
  - Smart batching to prevent notification fatigue
- Template management for consistent messaging
- Delivery tracking and analytics
- Webhook support for custom integrations

**ERPNext Implementation:**

- Custom DocType: "FLRTS Notification Rule" (routing rules)
- Custom DocType: "FLRTS Notification Template" (message templates)
- Server script to process notifications based on user preferences
- Integration with n8n for multi-channel delivery
- Use ERPNext's Notification DocType as foundation

**Context:** Different users prefer different notification channels based on
their workflow and urgency. A unified system ensures reliable delivery while
respecting user preferences and preventing notification overload.

**Estimated Effort:** 4-5 sprints **Dependencies:** Message queue system,
template engine, third-party APIs (Twilio, SendGrid, etc.), user preference
storage

---

## Equipment & Asset Management (Post-MVP)

### Equipment Service History Tracking

**Priority:** High (Post-MVP Phase 2) **Description:** Link equipment and ASICs
to field reports and maintenance visits for complete service history tracking.

**Current State:** MVP has `field_reports_asics` and `field_reports_equipment`
junction tables

**Requirements:**

- Complete integration with ERPNext's Serial No and Asset tracking
- Service history timeline view per equipment/ASIC
- Maintenance cost tracking per asset
- Warranty and lifecycle management
- Predictive maintenance alerts based on service patterns
- Equipment failure analysis and reporting

**ERPNext Implementation:**

- Use standard **Serial No** DocType for ASIC tracking
- Use standard **Asset** DocType for equipment
- Link Maintenance Visit (field reports) to Serial No/Asset
- Custom Report: "Equipment Service History"
- Custom Report: "ASIC Failure Analysis"
- Server script for predictive maintenance alerts

**Context:** Mining operations require detailed equipment tracking for cost
management, warranty claims, and operational efficiency.

**Estimated Effort:** 3-4 sprints **Dependencies:** ERPNext Asset Management
module, Maintenance Visit integration

---

## Financial & Billing (Post-MVP)

### Partner Billing Automation

**Priority:** Medium (Post-MVP Phase 3) **Description:** Automate billing for
mining partners based on hashrate agreements and service contracts.

**Current State:** `partner_billings` table exists but not integrated

**Requirements:**

- Link `licenses_agreements` (hashrate contracts) to billing cycles
- Automated invoice generation based on agreement terms
- Integration with ERPNext's Sales Invoice
- Billing report dashboards
- Payment tracking and reconciliation
- Multi-currency support for international partners

**ERPNext Implementation:**

- Use standard **Sales Invoice** DocType
- Link to custom "FLRTS License Agreement" DocType
- Subscription DocType for recurring billing
- Custom Report: "Partner Billing Dashboard"
- Payment Entry integration for reconciliation

**Context:** Automates revenue tracking and ensures accurate billing based on
complex hashrate agreements.

**Estimated Effort:** 3-4 sprints **Dependencies:** ERPNext Accounting module,
license agreement implementation

---

### Vendor Invoice Management

**Priority:** Medium (Post-MVP Phase 3) **Description:** Track vendor invoices
for equipment, parts, and contractor services.

**Current State:** `vendor_invoices` table exists but not integrated

**Requirements:**

- Link invoices to maintenance visits and equipment purchases
- Integration with ERPNext's Purchase Invoice
- Approval workflows for invoice verification
- Cost tracking per site and project
- Vendor performance analytics

**ERPNext Implementation:**

- Use standard **Purchase Invoice** DocType
- Link to Maintenance Visit via custom fields
- Use ERPNext's Approval workflow
- Custom Report: "Vendor Cost Analysis by Site"

**Context:** Ensures accurate cost tracking and vendor accountability for mining
operations.

**Estimated Effort:** 2-3 sprints **Dependencies:** ERPNext Buying module,
Maintenance Visit integration

---

## Template

When adding new future features, use this template:

### [Feature Name]

**Priority:** [High/Medium/Low] ([Timeline]) **Description:** [Brief description
of the feature]

**Current State:** [What exists now, if anything]

**Requirements:**

- [Key requirement 1]
- [Key requirement 2]
- [etc.]

**ERPNext Implementation:** [How this maps to ERPNext DocTypes and features]

**Context:** [Why this is needed, background information]

**Estimated Effort:** [Time estimate] **Dependencies:** [Technical or business
dependencies]

---

_Last Updated: 2025-10-01_ _Managed by: Development Team_ _ERPNext Migration:
Phase 1 Complete (Schema Philosophy, Functional Requirements, DocType Patterns)_
