# MVP Story Plan - Creation-Only Demo

## Executive Summary

**Goal**: Deliver a working NLP demo ASAP that showcases natural language task
creation via Telegram → ERPNext

**Core Demo Flow**: User sends message to Telegram → OpenAI parses → Creates
Maintenance Visit in ERPNext → Confirms to user

**Note**: This plan has been updated to reflect the ERPNext backend adoption
(see [10N-227](https://linear.app/10netzero/issue/10N-227)). OpenProject has
been replaced with ERPNext as the FSM backend platform.

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

### 🎯 Epic 3 - ERPNext Integration (MVP FOCUS)

#### Required for MVP (CREATE Only):

- **Story 3.1**: ERPNext API Workflows (CREATE ONLY)
  - Scope: Only `POST /api/resource/Maintenance Visit` endpoint
  - Create Maintenance Visit (FSM work order) via REST API
  - Effort: 3-4 hours
- **Story 3.4**: OpenAI Context Injection MVP
  - Scope: Hardcode employee list, sites, and partners in prompt
  - Include known entities for better parsing accuracy
  - Effort: 2-3 hours

#### Deferred to Post-MVP:

- Story 3.2: ERPNext Webhooks (for bidirectional sync - ERPNext → Telegram
  notifications)
- Story 3.3: Batch Sync Workflows (not needed for creation-only MVP)
- Story 3.5: Timezone Conversion Logic (use simple defaults for MVP)

### ❌ Epic 4 - Lists Feature (DEFERRED - Post-MVP)

**Note**: Lists feature is deferred to Post-MVP Phase 2. MVP focuses solely on
Maintenance Visit (work order) creation.

#### Deferred to Post-MVP:

- Story 4.1: Lists Interface (full UI)
- Story 4.2: List Commands (beyond creation)
- Story 4.3: List Templates System
- Story 4.4: List Sharing Permissions
- Story 4.5: List Notifications

**ERPNext Implementation**: Lists will be implemented as custom "FLRTS List"
DocType with child table for list items (see
[docs/research/flrts-functional-requirements.md](../research/flrts-functional-requirements.md))

## Implementation Sequence

### Phase 1: Core Creation Pipeline (Week 1)

**Prerequisites:**

- ERPNext Phase 1.5 complete: Dev instance deployed at `https://ops.10nz.tools`
- API credentials configured
- Test users and sites created in ERPNext

**Implementation:**

1. **Day 1-2**: Configure Story 2.1 (Telegram webhook activation)
2. **Day 2-3**: Implement Story 3.1 (ERPNext Maintenance Visit CREATE API)
3. **Day 3-4**: Implement Story 3.4 (OpenAI context injection with ERPNext
   entities)
4. **Day 4-5**: Simplified Story 2.5 (/create command only)
5. **Day 5**: End-to-end testing and demo prep
6. **Throughout**: Implement OpenAI Parser Audit Log (parallel to above tasks)

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

- ✅ User can send "Colin needs to check the compressor at Big Sky tomorrow" →
  Maintenance Visit created
- ✅ Confirmation message shows what was created (assignee, site, due date)
- ✅ Maintenance Visits visible in ERPNext UI
- ✅ OpenAI Parser Audit Log captures all requests with model rationale
- ✅ Can query parser success rate and cost tracking

### Nice to Have (if time permits):

- Parse priority levels (low/normal/high/urgent)
- Link to equipment (ASICs, compressors)
- Parse field report creation
- Parse partner/vendor assignments

### Not Required for Demo:

- Lists feature (deferred to Post-MVP)
- Viewing existing Maintenance Visits from Telegram
- Editing Maintenance Visits after creation via Telegram
- ERPNext → Telegram notifications (webhooks)
- Reminder notifications
- Inline keyboards or mini-apps
- Telegram group chat support (just direct messages for MVP)
- Equipment service history tracking
- Partner billing integration

## Technical Simplifications for MVP

### OpenAI Prompt (ERPNext Context):

```
Current UTC time: [TIMESTAMP]
Sender: [User name and timezone - CST or PST]

Known Personnel (ERPNext Users):
- Colin Aulds (ID: colin, timezone: PST)
- Mike Davis (ID: mike, timezone: CST)
- Sarah Johnson (ID: sarah, timezone: PST)

Known Sites (FLRTS Site Location):
- Big Sky Mining Facility (Montana)
- Viper Operations (Wyoming)
- Crystal Peak Site (Colorado)
- Thunder Ridge (Nevada)

Parse the message and identify:
1. Task type: Maintenance Visit (work order) or Field Report
2. Assignee (person doing the work)
3. Site location
4. Due date/time (convert to assignee's timezone)
5. Priority (low/normal/high/urgent)
6. Equipment mentioned (optional)

Return:
{
  "type": "maintenance_visit",
  "title": "Check compressor at Big Sky",
  "assignee": "colin",
  "site": "Big Sky Mining Facility",
  "due_date": "2025-10-02",
  "due_time": "14:00",
  "priority": "normal",
  "confidence": 0.85,
  "rationale": "Explain WHY you chose each field value..."
}
```

### n8n Workflow (Simplified):

```
Telegram Webhook
  ↓
Parse with OpenAI (log to openai_parser_logs)
  ↓
Create Maintenance Visit in ERPNext via REST API
  ↓
Confirm to User via Telegram
  ↓
Update parser log with user_accepted status
```

### ERPNext API (Single Endpoint for MVP):

```http
POST https://ops.10nz.tools/api/resource/Maintenance Visit
Authorization: token <api_key>:<api_secret>
Content-Type: application/json

{
  "item_code": "MAINTENANCE_SERVICE",
  "customer": "Mining Operations",
  "maintenance_type": "Preventive Maintenance",
  "company": "10NetZero",
  "completion_status": "Pending",
  "custom_site": "Big Sky Mining Facility",
  "custom_assignee": "colin",
  "custom_due_date": "2025-10-02",
  "custom_due_time": "14:00:00",
  "custom_priority": "normal",
  "custom_telegram_message_id": "12345",
  "custom_parser_log_id": "<UUID from openai_parser_logs>"
}
```

**Custom Fields Required in ERPNext:**

- `custom_site` (Link to FLRTS Site Location)
- `custom_assignee` (Link to User)
- `custom_due_date` (Date)
- `custom_due_time` (Time)
- `custom_priority` (Select: low/normal/high/urgent)
- `custom_telegram_message_id` (Data)
- `custom_parser_log_id` (Data - link to audit log)

## Risk Mitigation

### Risk: OpenAI parsing quality

**Mitigation**: Use comprehensive examples in prompt, test with real messages

### Risk: Timezone conversion errors

**Mitigation**: Include clear examples in prompt, default to sender's timezone
if ambiguous

### Risk: ERPNext API complexity

**Mitigation**: Start with minimal required fields only, use ERPNext dev
instance for testing

### Risk: Credential/auth issues

**Mitigation**: Test each integration point separately first

## Critical MVP Feature: OpenAI Parser Audit Log

**Priority:** CRITICAL (Must have before launch) **Status:** Not Yet Implemented
**Owner:** Development Team

### Why This Is Critical

Complete logging of all OpenAI API interactions is **non-negotiable** for MVP
because:

1. **Debugging:** When users report "it parsed wrong", you need to see exactly
   what the model received and why it made each decision
2. **Prompt Engineering:** The `rationale` field from the LLM tells you what to
   fix in your prompts to improve accuracy
3. **Cost Tracking:** Monitor OpenAI API spend and project monthly costs
4. **Quality Improvement:** Track success rate over time, identify patterns in
   failures
5. **Compliance:** Audit trail of all AI-generated content

### Database Schema Required

Create `openai_parser_logs` table in Supabase:

```sql
CREATE TABLE openai_parser_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context
  telegram_message_id BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  original_message TEXT NOT NULL,

  -- Request
  model_name VARCHAR(50) NOT NULL,
  prompt_version VARCHAR(50) NOT NULL,  -- Git commit hash
  system_prompt TEXT NOT NULL,
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Response
  parsed_output JSONB NOT NULL,
  model_rationale TEXT NOT NULL,  -- WHY the model chose this structure
  confidence_score DECIMAL(3,2),
  response_duration_ms INTEGER,

  -- Tokens & Cost
  total_tokens INTEGER,
  estimated_cost_usd DECIMAL(10,6),

  -- User Feedback
  user_accepted BOOLEAN,  -- Did user accept this parse?
  user_feedback TEXT,  -- User's response if rejected

  -- Correction Flow
  is_correction BOOLEAN DEFAULT FALSE,
  original_log_id UUID,  -- Link to original attempt
  correction_attempt_number INTEGER DEFAULT 1,

  -- Result
  created_task_id UUID,  -- Link to created task/list

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### OpenAI Prompt Must Include Rationale

**CRITICAL:** Your OpenAI response schema **MUST** include a `rationale` field:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "schema": {
        "properties": {
          "task_title": { "type": "string" },
          "assignee": { "type": "string" },
          "due_date": { "type": "string" },
          "priority": { "type": "string" },
          "confidence": { "type": "number" },
          "rationale": {
            "type": "string",
            "description": "Explain WHY you structured the output this way. What clues led to each decision? What assumptions did you make?"
          }
        },
        "required": ["task_title", "rationale"]
      }
    }
  }
}
```

### Implementation Checklist

- [ ] Create `openai_parser_logs` table in Supabase
- [ ] Update OpenAI prompt to require `rationale` field
- [ ] Log BEFORE sending to OpenAI (capture request)
- [ ] Log AFTER receiving OpenAI response (capture output + rationale)
- [ ] Capture user acceptance/rejection in Telegram bot
- [ ] Handle correction flow (if user says "no, I meant...")
- [ ] Link correction attempts to original parse (original_log_id)
- [ ] Update log when task is created (set created_task_id)
- [ ] Calculate estimated_cost_usd based on model pricing
- [ ] Create basic analytics query for success rate

### Example: Correction Flow

**Original Parse:** User: "Colin needs to check the compressor at Big Sky
tomorrow afternoon"

Model Output:

```json
{
  "task_title": "Check compressor at Big Sky",
  "due_time": "14:00",
  "priority": "normal",
  "rationale": "'Tomorrow afternoon' = 2pm (default). No urgency keywords detected."
}
```

**User Rejects:** "No, I meant tomorrow MORNING, and it's URGENT"

**Correction Parse:**

```json
{
  "task_title": "Check compressor at Big Sky",
  "due_time": "08:00",
  "priority": "urgent",
  "rationale": "User explicitly corrected 'afternoon' to 'morning' (8am). User said 'URGENT' in caps, changed priority from normal to urgent.",
  "is_correction": true,
  "original_log_id": "<UUID of first attempt>"
}
```

This correction chain lets you analyze: "Why did it get it wrong the first time?
What pattern should I add to the prompt?"

### Estimated Effort

**Implementation:** 1 day

- Database schema: 2 hours
- Parser service updates: 4 hours
- Telegram bot updates: 2 hours

**See:** `/docs/MVP-FEATURES.md` for complete technical spec including analytics
queries and ERPNext migration strategy.

---

## Definition of Demo Done

- [ ] **ERPNext dev instance deployed** at `https://ops.10nz.tools`
- [ ] **Custom fields added to Maintenance Visit** DocType (see above)
- [ ] **OpenAI Parser Audit Log fully implemented** (see above)
- [ ] User can create Maintenance Visits via Telegram natural language
- [ ] Created Maintenance Visits appear in ERPNext immediately
- [ ] User receives confirmation of creation with all parsed fields
- [ ] Demo script prepared with 5-10 example messages
- [ ] System handles basic parsing errors gracefully
- [ ] Can query parser success rate and view failed parse rationales
- [ ] ERPNext REST API authentication working (API key/secret)

## Post-Demo Roadmap

Based on demo feedback, prioritize:

1. Most requested missing features
2. Quality improvements to parsing
3. UI/UX enhancements
4. Additional CRUD operations

---

**Prepared by**: John (PM) **Date**: 2025-09-25 **Status**: Ready for
implementation
