# MVP Features (Critical for Launch)

This document tracks features that MUST be implemented for the MVP launch. These
are non-negotiable requirements for a functional minimum viable product.

## OpenAI Parser Audit Log

**Priority:** CRITICAL (MVP Required) **Status:** Not Yet Implemented

**Description:** Comprehensive logging of all OpenAI API calls for NLP parsing,
including inputs, outputs, model rationale, and correction attempts. Essential
for debugging, prompt engineering, and understanding model behavior.

**Why This Is MVP-Critical:**

1. **Debugging:** When users report parsing errors, you can see exactly what the
   model saw and why it made its decision
2. **Prompt Engineering:** Rationale field tells you what to fix in your prompts
   to improve accuracy
3. **Model Comparison:** Track performance across GPT-4o versions and prompt
   iterations
4. **Cost Tracking:** Monitor token usage and API costs for budget planning
5. **Compliance:** Audit trail of all AI-generated content for regulatory
   requirements

---

### Database Schema

Create `openai_parser_logs` table in Supabase:

```sql
CREATE TABLE openai_parser_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Request Context
  telegram_message_id BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  original_message TEXT NOT NULL,
  user_timezone VARCHAR(50), -- User's timezone for context

  -- OpenAI Request
  openai_request_id VARCHAR(100), -- OpenAI's request ID from response headers
  model_name VARCHAR(50) NOT NULL, -- e.g., "gpt-4o-2024-08-06"
  prompt_version VARCHAR(50) NOT NULL, -- Your prompt template version (git commit hash)
  system_prompt TEXT NOT NULL, -- Full system prompt sent
  user_message TEXT NOT NULL, -- Full user message sent
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- OpenAI Response
  response_timestamp TIMESTAMPTZ,
  response_duration_ms INTEGER, -- Time to receive response
  finish_reason VARCHAR(50), -- stop, length, content_filter, etc.

  -- Parsed Output (JSON structure)
  parsed_output JSONB NOT NULL, -- The structured JSON response
  model_rationale TEXT NOT NULL, -- WHY the model chose this structure (from LLM)
  confidence_score DECIMAL(3,2), -- If your prompt asks for confidence (0.00-1.00)

  -- Token Usage (from OpenAI response)
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd DECIMAL(10,6), -- Calculated based on model pricing

  -- Error Tracking
  error_occurred BOOLEAN DEFAULT FALSE,
  error_type VARCHAR(100), -- API error, validation error, timeout, etc.
  error_message TEXT,
  error_code VARCHAR(50), -- OpenAI error code if applicable

  -- User Correction Flow
  is_correction BOOLEAN DEFAULT FALSE, -- Is this a retry after user rejection?
  original_log_id UUID, -- FK to original parse attempt (self-referential)
  correction_user_feedback TEXT, -- What the user said was wrong
  correction_rationale TEXT, -- Model's NEW rationale for the corrected output
  correction_attempt_number INTEGER DEFAULT 1, -- How many corrections attempted

  -- Result
  user_accepted BOOLEAN, -- Did user accept this parse? (NULL until user responds)
  user_response_timestamp TIMESTAMPTZ, -- When user accepted/rejected
  user_feedback TEXT, -- User's exact response (if rejected)
  created_task_id UUID, -- FK to tasks table (if accepted and task created)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and analytics
CREATE INDEX idx_openai_logs_telegram_user ON openai_parser_logs(telegram_user_id, created_at DESC);
CREATE INDEX idx_openai_logs_telegram_msg ON openai_parser_logs(telegram_message_id);
CREATE INDEX idx_openai_logs_accepted ON openai_parser_logs(user_accepted, created_at DESC);
CREATE INDEX idx_openai_logs_corrections ON openai_parser_logs(is_correction, original_log_id);
CREATE INDEX idx_openai_logs_errors ON openai_parser_logs(error_occurred) WHERE error_occurred = TRUE;
CREATE INDEX idx_openai_logs_model_version ON openai_parser_logs(model_name, prompt_version, created_at DESC);
CREATE INDEX idx_openai_logs_cost_tracking ON openai_parser_logs(created_at, total_tokens, estimated_cost_usd);

-- Self-referential foreign key for correction tracking
ALTER TABLE openai_parser_logs
  ADD CONSTRAINT fk_original_log
  FOREIGN KEY (original_log_id) REFERENCES openai_parser_logs(id) ON DELETE SET NULL;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_openai_parser_logs_updated_at
  BEFORE UPDATE ON openai_parser_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### OpenAI Prompt Requirements

Your OpenAI prompt **MUST** include a `rationale` field in the response schema:

```typescript
const openAIRequest = {
  model: 'gpt-4o-2024-08-06',
  messages: [
    {
      role: 'system',
      content: `You are a task parser for FLRTS (Field Reports, Lists, Reminders, Tasks, and Sub-Tasks).

Parse natural language messages into structured task data.

IMPORTANT: You MUST explain your reasoning in the 'rationale' field. Describe:
- What clues in the message led to each decision
- What assumptions you made (e.g., default times, site matching)
- Why you chose specific values (priority, assignee, dates)
- What was ambiguous or unclear

Known Sites: Big Sky, Viper, Crystal Peak, Thunder Ridge
Known Personnel: Colin, Mike, Sarah, Alex
Default Times: morning=8am, afternoon=2pm, evening=6pm
Default Priority: normal (unless urgent/critical/ASAP mentioned)`,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'task_parse_result',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          task_title: {
            type: 'string',
            description: 'Concise task title',
          },
          assignee: {
            type: 'string',
            description:
              "Person assigned (must match known personnel or 'unassigned')",
          },
          due_date: {
            type: 'string',
            description: 'ISO date YYYY-MM-DD or null',
          },
          due_time: {
            type: 'string',
            description: '24hr time HH:MM or null',
          },
          site: {
            type: 'string',
            description: 'Site name (must match known sites) or null',
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
            description: 'Task priority level',
          },
          confidence: {
            type: 'number',
            description: 'Confidence score 0.0-1.0 for this parse',
          },
          rationale: {
            type: 'string',
            description:
              'REQUIRED: Explain WHY you structured the output this way. What clues in the message led to each decision? What assumptions did you make? Be specific about how you interpreted dates, times, sites, and assignments.',
          },
        },
        required: [
          'task_title',
          'assignee',
          'priority',
          'confidence',
          'rationale',
        ],
        additionalProperties: false,
      },
    },
  },
};
```

---

### Example Logged Interaction Flow

#### Original Parse Attempt

**User Message:**

> "Colin needs to check the compressor at Big Sky tomorrow afternoon"

**OpenAI Request Logged:**

```json
{
  "telegram_message_id": 12345,
  "telegram_user_id": 67890,
  "original_message": "Colin needs to check the compressor at Big Sky tomorrow afternoon",
  "model_name": "gpt-4o-2024-08-06",
  "prompt_version": "v1.2.3-abc123",
  "system_prompt": "You are a task parser for FLRTS...",
  "user_message": "Colin needs to check the compressor at Big Sky tomorrow afternoon",
  "request_timestamp": "2025-10-01T14:30:00Z"
}
```

**OpenAI Response:**

```json
{
  "task_title": "Check compressor at Big Sky",
  "assignee": "Colin",
  "due_date": "2025-10-02",
  "due_time": "14:00",
  "site": "Big Sky",
  "priority": "normal",
  "confidence": 0.85,
  "rationale": "Detected 'Colin needs to' as direct assignment. 'Tomorrow afternoon' parsed as next calendar day (2025-10-02) at 2pm (default afternoon time per system config). 'Big Sky' is a known site name, matched exactly. 'Check compressor' indicates routine maintenance task, marked normal priority by default since no urgency keywords detected."
}
```

**Logged Fields:**

```json
{
  "parsed_output": {
    /* JSON above */
  },
  "model_rationale": "Detected 'Colin needs to' as direct assignment...",
  "confidence_score": 0.85,
  "prompt_tokens": 245,
  "completion_tokens": 89,
  "total_tokens": 334,
  "estimated_cost_usd": 0.00167,
  "finish_reason": "stop",
  "response_duration_ms": 1243,
  "user_accepted": null // Waiting for user confirmation
}
```

---

#### User Rejects and Provides Correction

**User Response:**

> "No, I meant tomorrow MORNING, and it's URGENT"

**System Updates Original Log:**

```sql
UPDATE openai_parser_logs
SET
  user_accepted = FALSE,
  user_response_timestamp = NOW(),
  user_feedback = 'No, I meant tomorrow MORNING, and it''s URGENT'
WHERE id = '<original_log_id>';
```

**New Correction Request to OpenAI:**

System constructs correction prompt:

```json
{
  "role": "user",
  "content": "The user rejected the previous parse with this feedback: 'No, I meant tomorrow MORNING, and it's URGENT'\n\nOriginal message: 'Colin needs to check the compressor at Big Sky tomorrow afternoon'\n\nPlease re-parse with the correction in mind."
}
```

**Corrected OpenAI Response:**

```json
{
  "task_title": "Check compressor at Big Sky",
  "assignee": "Colin",
  "due_date": "2025-10-02",
  "due_time": "08:00",
  "site": "Big Sky",
  "priority": "urgent",
  "confidence": 0.95,
  "rationale": "User explicitly corrected 'afternoon' to 'morning' - changed time from 14:00 to 08:00 (default morning time). User stated 'URGENT' in all caps, indicating high priority - updated from 'normal' to 'urgent'. All other fields (assignee=Colin, site=Big Sky, task=check compressor) were not challenged, so kept them unchanged. Higher confidence (0.95) because user provided explicit corrections."
}
```

**Logged as Correction:**

```json
{
  "is_correction": true,
  "original_log_id": "<UUID of first attempt>",
  "correction_user_feedback": "No, I meant tomorrow MORNING, and it's URGENT",
  "correction_rationale": "User explicitly corrected 'afternoon' to 'morning'...",
  "correction_attempt_number": 2,
  "parsed_output": {
    /* Corrected JSON */
  },
  "confidence_score": 0.95,
  "user_accepted": null // Waiting for confirmation
}
```

**User Accepts:**

> "Perfect!"

**Final Update:**

```sql
UPDATE openai_parser_logs
SET
  user_accepted = TRUE,
  user_response_timestamp = NOW(),
  user_feedback = 'Perfect!',
  created_task_id = '<UUID of created task>'
WHERE id = '<correction_log_id>';
```

---

### Analytics Queries

#### 1. Parser Success Rate Dashboard

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_parses,
  COUNT(*) FILTER (WHERE user_accepted = TRUE) as accepted,
  COUNT(*) FILTER (WHERE user_accepted = FALSE) as rejected,
  COUNT(*) FILTER (WHERE is_correction = TRUE) as corrections_needed,
  ROUND(AVG(confidence_score), 2) as avg_confidence,
  ROUND(AVG(response_duration_ms)) as avg_response_ms,
  SUM(estimated_cost_usd) as daily_cost
FROM openai_parser_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND is_correction = FALSE  -- Only count original attempts
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### 2. Common Failure Patterns

```sql
-- Find the most common user corrections
SELECT
  user_feedback,
  COUNT(*) as frequency,
  ROUND(AVG(orig.confidence_score), 2) as avg_original_confidence
FROM openai_parser_logs corr
JOIN openai_parser_logs orig ON corr.original_log_id = orig.id
WHERE corr.is_correction = TRUE
  AND corr.user_feedback IS NOT NULL
GROUP BY user_feedback
ORDER BY frequency DESC
LIMIT 20;
```

#### 3. Model Rationale Analysis for Failed Parses

```sql
-- Export all rationales for rejected parses to identify patterns
SELECT
  original_message,
  model_rationale,
  user_feedback,
  parsed_output->>'task_title' as parsed_title,
  parsed_output->>'due_time' as parsed_time,
  parsed_output->>'priority' as parsed_priority,
  confidence_score
FROM openai_parser_logs
WHERE user_accepted = FALSE
  AND is_correction = FALSE
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;
```

#### 4. Prompt Version A/B Testing

```sql
-- Compare performance across different prompt versions
SELECT
  prompt_version,
  model_name,
  COUNT(*) as total_parses,
  ROUND(AVG(CASE WHEN user_accepted THEN 1.0 ELSE 0.0 END), 3) as acceptance_rate,
  ROUND(AVG(confidence_score), 2) as avg_confidence,
  ROUND(AVG(response_duration_ms)) as avg_latency_ms,
  ROUND(SUM(estimated_cost_usd), 4) as total_cost,
  MIN(created_at) as first_used,
  MAX(created_at) as last_used
FROM openai_parser_logs
WHERE is_correction = FALSE
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY prompt_version, model_name
ORDER BY acceptance_rate DESC, avg_confidence DESC;
```

#### 5. Cost Tracking and Budget Alerts

```sql
-- Monthly cost projection
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_requests,
  SUM(total_tokens) as total_tokens,
  ROUND(SUM(estimated_cost_usd), 2) as actual_cost,
  ROUND((SUM(estimated_cost_usd) / EXTRACT(DAY FROM created_at)) * 30, 2) as projected_monthly_cost
FROM openai_parser_logs
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', created_at);
```

#### 6. Correction Chain Analysis

```sql
-- Find messages that required multiple correction attempts
WITH RECURSIVE correction_chain AS (
  -- Base case: original parses
  SELECT
    id,
    telegram_message_id,
    original_message,
    1 as attempt_number,
    user_accepted,
    confidence_score
  FROM openai_parser_logs
  WHERE original_log_id IS NULL

  UNION ALL

  -- Recursive case: follow corrections
  SELECT
    l.id,
    cc.telegram_message_id,
    cc.original_message,
    cc.attempt_number + 1,
    l.user_accepted,
    l.confidence_score
  FROM openai_parser_logs l
  JOIN correction_chain cc ON l.original_log_id = cc.id
)
SELECT
  telegram_message_id,
  original_message,
  MAX(attempt_number) as total_attempts,
  BOOL_OR(user_accepted) as eventually_accepted
FROM correction_chain
GROUP BY telegram_message_id, original_message
HAVING MAX(attempt_number) > 1
ORDER BY total_attempts DESC;
```

---

### ERPNext Implementation Strategy

Once ERPNext migration is complete, create a Custom DocType: **"FLRTS Parser
Audit Log"**

**Fields:**

- Link to User (telegram_user_id mapped to ERPNext User)
- Link to Maintenance Visit (created_task_id → Maintenance Visit name)
- Text fields for: original_message, system_prompt, user_message
- Long Text for: parsed_output (JSON), model_rationale
- Data fields for: request_timestamp, response_timestamp
- Decimal for: confidence_score, estimated_cost_usd
- Integer for: tokens, duration_ms
- Check for: error_occurred, is_correction, user_accepted
- Link to self for: original_log_id (correction chain)

**Custom Reports:**

1. "Parser Performance Dashboard" - Success rates, costs, latencies
2. "Failed Parse Analysis" - Rejection reasons and patterns
3. "Model Comparison Report" - A/B test different prompts/models
4. "Cost Tracking Report" - Daily/monthly OpenAI spend

**Server Scripts:**

- Auto-calculate `estimated_cost_usd` based on model pricing
- Alert if acceptance rate drops below 80%
- Alert if daily cost exceeds budget threshold

---

### Implementation Checklist

MVP Launch Requirements:

- [ ] **Database:** Create `openai_parser_logs` table in Supabase
- [ ] **Prompt Engineering:** Add `rationale` field to OpenAI JSON schema
- [ ] **Parser Service:** Log BEFORE sending to OpenAI (capture request)
- [ ] **Parser Service:** Log AFTER receiving OpenAI response
- [ ] **Telegram Bot:** Capture user acceptance/rejection
- [ ] **Telegram Bot:** Handle correction flow (link to original attempt)
- [ ] **Telegram Bot:** Update log when task is created (set created_task_id)
- [ ] **Cost Calculation:** Add pricing lookup for model (gpt-4o pricing)
- [ ] **Analytics Dashboard:** Create Grafana/Supabase dashboard for success
      rate
- [ ] **Alerts:** Set up alert for parser success rate drop below 80%
- [ ] **Alerts:** Set up alert for daily cost exceeding $10 USD
- [ ] **Documentation:** Document prompt versioning strategy (git commit hash)

Post-MVP Enhancements:

- [ ] Export failed parses to CSV for manual prompt engineering review
- [ ] A/B testing framework for different system prompts
- [ ] Auto-retrain logic: if confidence < 0.7, ask clarifying questions
- [ ] Migrate to ERPNext Custom DocType when ERPNext is live

---

### Estimated Effort

**MVP Implementation:** 3-5 days

- Database schema creation: 4 hours
- Parser service logging integration: 1 day
- Telegram bot updates (capture user responses): 1 day
- Cost calculation and basic analytics: 1 day
- Testing and validation: 1 day

**ERPNext Migration:** 2-3 days (Post-MVP Phase 2)

- Custom DocType creation
- Reports and dashboards
- Server scripts for alerts

---

_Last Updated: 2025-10-01_ _Status: MVP Critical - Not Yet Implemented_ _Owner:
Development Team_
