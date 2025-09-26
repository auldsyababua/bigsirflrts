# MVP Story Plan - Creation-Only Demo

## Executive Summary

**Goal**: Deliver a working NLP demo ASAP that showcases natural language
task/list creation via Telegram → OpenProject

**Core Demo Flow**: User sends message to Telegram → OpenAI parses → Creates
task/list in OpenProject → Confirms to user

## Story Categorization

### ✅ Epic 1 - Infrastructure (COMPLETE)

All infrastructure stories completed and validated. Ready for application layer.

### 🎯 Epic 2 - Telegram Bot (MVP FOCUS)

#### Required for MVP (CREATE Only):

- **Story 2.1**: Telegram Task Creation ✅ READY
  - Status: Implementation complete, needs credential configuration
  - Effort: 1-2 hours to activate
- **Story 2.5**: Telegram Command Parser (SIMPLIFIED)
  - Scope: Only `/create` command needed
  - Effort: 2-3 hours (simplified from original)

#### Deferred to Post-MVP:

- Story 2.2: Reminder System (not needed for creation)
- Story 2.3: Inline Keyboards (not needed for basic creation)
- Story 2.4: Error Recovery (beyond basic error messages)
- Story 2.6: User Context Management (not needed for stateless creation)

### 🎯 Epic 3 - OpenProject Integration (MVP FOCUS)

#### Required for MVP (CREATE Only):

- **Story 3.1**: OpenProject API Workflows (CREATE ONLY)
  - Scope: Only `POST /api/v3/work_packages` endpoint
  - Effort: 3-4 hours
- **Story 3.4**: OpenAI Context Injection MVP
  - Scope: Hardcode employee list in prompt
  - Effort: 2-3 hours

#### Deferred to Post-MVP:

- Story 3.2: OpenProject Webhooks (for bidirectional sync)
- Story 3.3: Batch Sync Workflows (not needed for creation)
- Story 3.5: Timezone Conversion Logic (use simple defaults for MVP)

### ❌ Epic 4 - Lists Feature (SIMPLIFIED FOR MVP)

#### Required for MVP:

- **Basic List Creation**: Part of Story 2.1
  - Scope: Parse "create a list called X" → Create in OpenProject
  - No additional story needed

#### Deferred to Post-MVP:

- Story 4.1: Lists Interface (full UI)
- Story 4.2: List Commands (beyond creation)
- Story 4.3: List Templates System
- Story 4.4: List Sharing Permissions
- Story 4.5: List Notifications

## Implementation Sequence

### Phase 1: Core Creation Pipeline (Week 1)

1. **Day 1-2**: Configure Story 2.1 (Telegram webhook activation)
2. **Day 2-3**: Implement Story 3.1 (OpenProject CREATE API)
3. **Day 3-4**: Implement Story 3.4 (OpenAI context injection)
4. **Day 4-5**: Simplified Story 2.5 (/create command only)
5. **Day 5**: End-to-end testing and demo prep

### Phase 2: Demo & Feedback (Week 2)

- Demo to stakeholders
- Gather feedback on NLP quality
- Identify priority enhancements

### Phase 3: Post-MVP Enhancements (Week 3+)

Based on feedback, implement:

- READ operations (viewing tasks)
- UPDATE operations (editing tasks)
- Enhanced error handling
- UI improvements (inline keyboards)

## Success Metrics for MVP Demo

### Must Have:

- ✅ User can send "Colin needs to fix the router tomorrow" → Task created
- ✅ User can send "Create a bug fixes list" → List created
- ✅ Confirmation message shows what was created
- ✅ Tasks/lists visible in OpenProject UI

### Nice to Have (if time permits):

- Parse priority levels (high/medium/low)
- Handle multiple assignees
- Parse recurring tasks

### Not Required for Demo:

- Viewing existing tasks from Telegram
- Editing tasks after creation via Telegram
- OpenProject → Telegram notifications (task completed, etc.)
- Reminder notifications
- Inline keyboards or mini-apps
- Telegram group chat support (just direct messages for MVP)

## Technical Simplifications for MVP

### OpenAI Prompt (With Timezone Support):

```
Current UTC time: [TIMESTAMP]
Sender: [User name and timezone - CST or PST]

Employees:
- Colin Aulds (ID: colin, timezone: PST)
- Joel Fulford (ID: joel, timezone: CST)
- Bryan Aulds (ID: bryan, timezone: CST)

Parse the message and identify:
1. If time is mentioned as "my time" vs "their time" vs absolute
2. Convert to assignee's local timezone

Return:
{
  "type": "task" or "list",
  "title": "...",
  "assignee": "colin/joel/bryan/unassigned",
  "due_date": "2025-01-20T15:00:00-08:00" (in assignee's timezone),
  "time_context": "sender_time|assignee_time|absolute",
  "priority": "normal" (default)
}
```

### n8n Workflow (Simplified):

```
Telegram → Parse with OpenAI → Create in OpenProject → Confirm to User
```

### OpenProject API (Single Endpoint):

```
POST /api/v3/work_packages
{
  "subject": "{title}",
  "assignee": { "href": "/api/v3/users/{id}" },
  "dueDate": "{date}"
}
```

## Risk Mitigation

### Risk: OpenAI parsing quality

**Mitigation**: Use comprehensive examples in prompt, test with real messages

### Risk: Timezone conversion errors

**Mitigation**: Include clear examples in prompt, default to sender's timezone
if ambiguous

### Risk: OpenProject API complexity

**Mitigation**: Start with minimal required fields only

### Risk: Credential/auth issues

**Mitigation**: Test each integration point separately first

## Definition of Demo Done

- [ ] User can create tasks via Telegram natural language
- [ ] User can create lists via Telegram natural language
- [ ] Created items appear in OpenProject immediately
- [ ] User receives confirmation of creation
- [ ] Demo script prepared with 5-10 example messages
- [ ] System handles basic parsing errors gracefully

## Post-Demo Roadmap

Based on demo feedback, prioritize:

1. Most requested missing features
2. Quality improvements to parsing
3. UI/UX enhancements
4. Additional CRUD operations

---

**Prepared by**: John (PM) **Date**: 2025-09-25 **Status**: Ready for
implementation
