# Future Features

This document tracks features and enhancements that are planned for future development but not currently prioritized for the MVP or immediate sprints. This is the canonical location for recording post-MVP feature ideas and technical debt items.

## Security & Authentication

### Advanced Prompt Injection Protection with User Scoping

**Priority:** High (Post-MVP)
**Description:** Implement comprehensive prompt injection protection for the Telegram task creation workflow using LLMGuard or similar security framework, combined with a user scoping system that limits the blast radius of malicious content based on user privilege levels and data isolation boundaries.

**Current State:** Basic input validation only (length limits, basic content filtering). All users operate at same privilege level with access to shared data.

**Requirements:**

**Security Framework:**

- Integrate LLMGuard or equivalent prompt injection detection
- Implement content filtering for malicious patterns
- Add monitoring and alerting for detected injection attempts
- Create fallback workflows for blocked inputs

**User Scoping & Privilege System:**

- **User Risk Levels**: Define user categories (Guest, Employee, Supervisor, Admin) with different UGC risk tolerances
- **Data Isolation Boundaries**: Implement scoped access where certain user levels can only affect their own data or team-specific elements
- **Privilege-Based Processing**: Different prompt processing strictness based on user level (e.g., Guests get maximum filtering, Admins get minimal filtering)
- **Blast Radius Limitation**: Ensure malicious prompts can only affect the user's own tasks/data, not system-wide or other users' data

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

**Context:** Identified during Story 1.3 security review. Current MVP approach uses trusted user base and basic validation, but production deployment requires comprehensive protection against prompt injection attacks AND a way to limit the damage scope based on user privilege levels and data ownership boundaries.

**Estimated Effort:** 3-4 sprints (2 for security framework, 1-2 for scoping system)
**Dependencies:** LLMGuard integration, monitoring infrastructure, user management system redesign, database schema updates for data isolation

---

## Notifications & Integrations

### Telegram Bot Integration

**Priority:** Medium (Post-MVP)
**Description:** Implement native Telegram bot integration for task creation, updates, and notifications without requiring the Mini App interface.

**Current State:** Telegram Mini App integration planned for MVP (web-based interface)

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

**Context:** While the MVP uses a Telegram Mini App, many users prefer native bot interactions for speed and simplicity. Native bot commands provide faster task creation and management without opening a web interface.

**Estimated Effort:** 2-3 sprints
**Dependencies:** Telegram Bot API, webhook infrastructure, notification queue system

### Slack App Integration

**Priority:** Medium (Post-MVP)
**Description:** Create a comprehensive Slack app for task management within Slack workspaces, enabling natural language task creation and team collaboration.

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

**Context:** Many organizations use Slack as their primary communication platform. Native Slack integration would enable seamless task management without context switching, improving adoption and team collaboration.

**Estimated Effort:** 3-4 sprints
**Dependencies:** Slack API, OAuth infrastructure, event subscription handling, Block Kit UI components

### Multi-Channel Notification System

**Priority:** High (Post-MVP Phase 2)
**Description:** Unified notification framework supporting multiple channels with user preferences and intelligent routing.

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

**Context:** Different users prefer different notification channels based on their workflow and urgency. A unified system ensures reliable delivery while respecting user preferences and preventing notification overload.

**Estimated Effort:** 4-5 sprints
**Dependencies:** Message queue system, template engine, third-party APIs (Twilio, SendGrid, etc.), user preference storage

---

## Enhanced API Memory and Learning

**Priority:** High (Post-MVP)
**Description:** Implement an advanced memory architecture for the FLRTS API to enable continuous learning and improve output quality. This system will use a combination of in-memory databases, a vector database, and a dedicated memory store to retain context, learn from interactions, and correct mistakes over time.

**Current State:** The API is stateless, processing each call independently without long-term memory of past interactions or feedback.

**Requirements:**

- **Redis Integration:** Use Redis for fast caching of frequently accessed data and session information.
- **Mem0 Implementation:** Integrate Mem0 as a specialized, intelligent memory layer to store and retrieve conversational context and user preferences.
- **VectorDB for Semantic Memory:** Implement a vector database (e.g., Pinecone, Weaviate) to store embeddings of past interactions, enabling semantic search and retrieval of relevant historical context to inform new outputs.
- **DragonflyDB for Performance:** Utilize Dragonfly as a high-performance, multi-threaded in-memory datastore to supercharge the caching and session management capabilities, ensuring low-latency responses.
- **Learning Loop:** Develop a feedback mechanism where API outputs can be rated or corrected, and this feedback is used to update the memory stores, allowing the system to learn from its mistakes.

**Context:** To significantly improve the quality and consistency of the FLRTS API, it needs to move from a stateless model to one that learns and adapts. This enhanced memory architecture will provide the foundation for a self-improving system, leading to more accurate, context-aware, and personalized outputs.

**Estimated Effort:** 4-5 sprints
**Dependencies:** Infrastructure for Redis, VectorDB, and Dragonfly; development of a feedback and learning pipeline.

---

## Template

When adding new future features, use this template:

### [Feature Name]

**Priority:** [High/Medium/Low] ([Timeline])
**Description:** [Brief description of the feature]

**Current State:** [What exists now, if anything]

**Requirements:**

- [Key requirement 1]
- [Key requirement 2]
- [etc.]

**Context:** [Why this is needed, background information]

**Estimated Effort:** [Time estimate]
**Dependencies:** [Technical or business dependencies]

---

*Last Updated: 2025-01-09*
*Managed by: Development Team*
