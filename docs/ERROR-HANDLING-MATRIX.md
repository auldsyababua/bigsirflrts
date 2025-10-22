# Error Handling Matrix

**Purpose:** Comprehensive error handling specification for Telegram → OpenAI →
ERPNext Lambda integration

**Last Updated:** October 2025

## Overview

This document defines error handling strategies, retry logic, user messaging,
and logging standards for all failure scenarios in the Telegram webhook handler.

## Error Classification

### Error Categories

1. **Telegram Webhook Errors** - Issues receiving/parsing Telegram webhooks
2. **ERPNext Context Fetch Errors** - Failures fetching users/sites
3. **OpenAI API Errors** - Issues with GPT-4o parsing
4. **ERPNext Task Creation Errors** - Failures creating Maintenance Visits
5. **Audit Logging Errors** - Failures writing to Parser Log
6. **Telegram Confirmation Errors** - Failures sending success message

## 1. Telegram Webhook Errors

### 1.1 Invalid Webhook Secret

**Detection:** `X-Telegram-Bot-Api-Secret-Token` header mismatch

**Handling:**

```javascript
if (!validateWebhook(event, webhookSecret)) {
  logWarn('webhook_validation_failed', {
    sourceIp: event.requestContext?.http?.sourceIp,
    headers: event.headers, // Redacted by logging.mjs
  });

  return {
    statusCode: 403,
    body: JSON.stringify({ error: 'Invalid webhook secret' }),
  };
}
```

**User Message:** None (Telegram never sees this)

**Retry:** No retry (auth error)

**Logging:** Warning level with source IP

---

### 1.2 Malformed Telegram Payload

**Detection:** Missing `message` or `message.text` field

**Handling:**

```javascript
const parsed = parseUpdate(event.body);

if (!parsed) {
  logWarn('unsupported_update_type', {
    updateType: typeof update,
    hasMessage: !!update?.message,
    hasText: !!update?.message?.text,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Update type not supported' }),
  };
}
```

**User Message:** None (ignore non-text messages for MVP)

**Retry:** No retry (not actionable)

**Logging:** Warning level with update structure

---

### 1.3 Bot Commands (Future)

**Detection:** Message starts with `/`

**Handling:**

```javascript
if (parsed.text.startsWith('/')) {
  logInfo('bot_command_received', {
    command: parsed.text.split(' ')[0],
    chatId: parsed.chatId,
  });

  await sendMessage(
    parsed.chatId,
    'Commands are not yet implemented. Please send a task description.',
    null,
    botToken
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Command received' }),
  };
}
```

**User Message:** "Commands are not yet implemented. Please send a task
description."

**Retry:** No retry

**Logging:** Info level

---

## 2. ERPNext Context Fetch Errors

### 2.1 Authentication Failure (401)

**Detection:** ERPNext API returns 401 status

**Handling:**

```javascript
if (response.status === 401) {
  logError('erpnext_auth_failed', {
    endpoint: url,
    statusCode: 401,
    apiKeyPrefix: maskSecret(apiKey), // Show first 2, last 2 chars
  });

  // Alert admin (future: SNS notification)
  throw new Error('ERPNext authentication failed - admin notified');
}
```

**User Message:** "System authentication error. Admin has been notified. Please
try again in a few minutes."

**Retry:** No retry (auth errors are permanent)

**Logging:** Error level + admin alert

**Fallback:** Use hardcoded fallback data for context

---

### 2.2 Server Error (500+)

**Detection:** ERPNext API returns 500, 502, 503, 504

**Handling:**

```javascript
const shouldRetry = (statusCode) => statusCode >= 500;
const retryDelays = [0, 1000, 2000]; // 0ms, 1s, 2s

for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const response = await fetch(url, options);

    if (response.ok) return await response.json();

    if (shouldRetry(response.status) && attempt < 2) {
      await sleep(retryDelays[attempt + 1]);
      continue;
    }

    // After 3 failures → fallback
    logWarn('erpnext_fetch_failed_using_fallback', {
      statusCode: response.status,
      attempts: attempt + 1,
    });

    return FALLBACK_DATA;
  } catch (error) {
    if (attempt === 2) {
      logError('erpnext_fetch_failed_after_retries', { error: error.message });
      return FALLBACK_DATA;
    }
  }
}
```

**User Message:** None (transparent fallback)

**Retry:** Yes, 3 attempts with exponential backoff (0s, 1s, 2s)

**Logging:** Warning level when using fallback

**Fallback:** Use hardcoded fallback data

---

### 2.3 Timeout (>10 seconds)

**Detection:** Fetch timeout exception

**Handling:**

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  return await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    logWarn('erpnext_fetch_timeout', {
      endpoint: url,
      timeout_ms: 10000,
    });

    return FALLBACK_DATA;
  }
  throw error;
}
```

**User Message:** None (transparent fallback)

**Retry:** No (timeout implies slow response, retrying would worsen latency)

**Logging:** Warning level

**Fallback:** Use hardcoded fallback data

---

### 2.4 Empty Response

**Detection:** ERPNext returns `{ data: [] }`

**Handling:**

```javascript
if (!response.data || response.data.length === 0) {
  logWarn('erpnext_empty_response', {
    endpoint: url,
    filters: filters,
  });

  return FALLBACK_DATA;
}
```

**User Message:** None (transparent fallback)

**Retry:** No retry

**Logging:** Warning level

**Fallback:** Use hardcoded fallback data

---

## 3. OpenAI API Errors

### 3.1 Authentication Error (401)

**Detection:** OpenAI returns 401

**Handling:**

```javascript
if (error.status === 401) {
  logError('openai_auth_failed', {
    apiKeyPrefix: maskSecret(apiKey),
    error: error.message,
  });

  throw new Error('OpenAI authentication failed');
}
```

**User Message:** "AI service authentication error. Please contact admin."

**Retry:** No retry (auth errors are permanent)

**Logging:** Error level + admin alert

---

### 3.2 Rate Limit (429)

**Detection:** OpenAI returns 429

**Handling:**

```javascript
if (error.status === 429) {
  const retryAfter = error.response?.headers?.['retry-after'] || 2;

  logWarn('openai_rate_limit', {
    retryAfter,
    attempt
  });

  if (attempt < maxRetries) {
    await sleep(retryAfter * 1000);
    continue;  // Retry
  }
}
```

**User Message:** "AI service is busy. Please try again in a moment."

**Retry:** Yes, 2 attempts with delay from `Retry-After` header

**Logging:** Warning level

---

### 3.3 Server Error (500+)

**Detection:** OpenAI returns 500, 502, 503

**Handling:**

```javascript
if (error.status >= 500) {
  logWarn('openai_server_error', {
    statusCode: error.status,
    attempt
  });

  if (attempt < maxRetries) {
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 3000);
    await sleep(backoffMs);
    continue;  // Retry
  }
}
```

**User Message:** "AI service temporarily unavailable. Please try again."

**Retry:** Yes, 2 attempts with exponential backoff (1s, 2s)

**Logging:** Warning level

---

### 3.4 Timeout (>10 seconds)

**Detection:** OpenAI request exceeds timeout

**Handling:**

```javascript
const openai = new OpenAI({
  apiKey,
  timeout: 10000  // 10 seconds
});

try {
  const response = await openai.chat.completions.create({ ... });
  return response;
} catch (error) {
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    logWarn('openai_timeout', {
      timeout_ms: 10000,
      attempt
    });

    if (attempt < 1) {
      await sleep(1000);
      continue;  // Retry once
    }
  }

  throw new Error(`OpenAI request failed: ${error.message}`);
}
```

**User Message:** "AI service timeout. Please try again."

**Retry:** Yes, 1 retry with 1 second delay

**Logging:** Warning level

---

### 3.5 Low Confidence Parse (<0.5)

**Detection:** `confidence` field in OpenAI response < 0.5

**Handling:**

```javascript
const taskData = JSON.parse(response.choices[0].message.content);

if (taskData.confidence < 0.5) {
  logWarn('low_confidence_parse', {
    confidence: taskData.confidence,
    rationale: taskData.rationale,
    originalText: text.substring(0, 100),
  });

  // Still create task but flag for review
  taskData.custom_flagged_for_review = true;
}
```

**User Message:** "Task created but flagged for manual review (low confidence
parse)."

**Retry:** No retry (response is valid)

**Logging:** Warning level with rationale

**Action:** Create task with `custom_flagged_for_review = true`

---

## 4. ERPNext Task Creation Errors

### 4.1 Validation Error (417)

**Detection:** ERPNext returns 417 with validation messages

**Handling:**

```javascript
if (response.status === 417) {
  const body = await response.json();
  const messages = JSON.parse(body._server_messages || '[]');
  const errorMessages = messages.map((m) => JSON.parse(m).message);

  logWarn('erpnext_validation_error', {
    validationErrors: errorMessages,
    taskData: taskData,
  });

  const userMessage = `Task creation failed:\n${errorMessages.join('\n')}\n\nPlease check your input and try again.`;

  await sendMessage(chatId, userMessage, null, botToken);

  return {
    statusCode: 200, // Return 200 to Telegram (we handled it)
    body: JSON.stringify({ message: 'Validation error sent to user' }),
  };
}
```

**User Message:** Parse validation errors and show user-friendly message

**Retry:** No retry (validation errors require user correction)

**Logging:** Warning level with validation errors

---

### 4.2 Permission Denied (403)

**Detection:** ERPNext returns 403

**Handling:**

```javascript
if (response.status === 403) {
  logError('erpnext_permission_denied', {
    user: assignee,
    doctype: 'Maintenance Visit',
  });

  await sendMessage(
    chatId,
    'Permission denied: Unable to create task for this user. Please contact admin.',
    null,
    botToken
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Permission error sent' }),
  };
}
```

**User Message:** "Permission denied: Unable to create task for this user.
Please contact admin."

**Retry:** No retry (permission errors are permanent)

**Logging:** Error level + admin alert

---

### 4.3 Server Error (500+)

**Detection:** ERPNext returns 500, 502, 503

**Handling:**

```javascript
const shouldRetry = (statusCode) => statusCode >= 500;
const maxRetries = 3;

for (let attempt = 0; attempt < maxRetries; attempt++) {
  const response = await fetch(url, options);

  if (response.ok) {
    return await response.json();
  }

  if (shouldRetry(response.status) && attempt < maxRetries - 1) {
    const backoffMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
    await sleep(backoffMs);
    continue;
  }

  // Final failure
  logError('erpnext_create_task_failed', {
    statusCode: response.status,
    attempts: attempt + 1,
  });

  throw new Error('ERPNext server error after retries');
}
```

**User Message:** "ERPNext server error. Please try again in a few minutes."

**Retry:** Yes, 3 attempts with exponential backoff (1s, 2s, 4s)

**Logging:** Error level

---

### 4.4 Timeout (>30 seconds)

**Detection:** Fetch timeout

**Handling:**

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  return await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    logError('erpnext_create_timeout', {
      timeout_ms: 30000,
      taskDescription: taskData.description?.substring(0, 50),
    });

    await sendMessage(
      chatId,
      'Task creation timed out. Please try again.',
      null,
      botToken
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Timeout error sent' }),
    };
  }
  throw error;
}
```

**User Message:** "Task creation timed out. Please try again."

**Retry:** No (already exceeded 30s)

**Logging:** Error level

---

## 5. Audit Logging Errors

### 5.1 Parser Log Creation Failure

**Detection:** POST to FLRTS Parser Log DocType fails

**Handling:**

```javascript
async function logParserAudit(logData) {
  try {
    await fetch(`${ERPNEXT_BASE_URL}/api/resource/FLRTS Parser Log`, {
      method: 'POST',
      headers: {
        Authorization: `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    });
  } catch (error) {
    // Fire-and-forget: Log locally but don't fail main operation
    logWarn('parser_audit_log_failed', {
      error: error.message,
      logData: logData,
    });
  }
}
```

**User Message:** None (fire-and-forget operation)

**Retry:** No retry (non-critical operation)

**Logging:** Warning level only

**Impact:** Audit trail incomplete but task creation succeeds

---

## 6. Telegram Confirmation Errors

### 6.1 sendMessage Failure

**Detection:** Telegram API returns error

**Handling:**

```javascript
async function sendMessage(chatId, text, keyboard, botToken) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logWarn('telegram_send_failed', {
        chatId,
        errorCode: error.error_code,
        description: error.description,
      });

      // Don't throw - task was created successfully
      return false;
    }

    return true;
  } catch (error) {
    logWarn('telegram_send_exception', {
      chatId,
      error: error.message,
    });
    return false;
  }
}
```

**User Message:** None (user doesn't see confirmation but task was created)

**Retry:** No retry (task already created, confirmation is secondary)

**Logging:** Warning level

**Impact:** User doesn't get confirmation but can check ERPNext UI

---

## 7. Cascading Failure Handling

### 7.1 Multiple Failures in Sequence

**Scenario:** Context fetch fails → OpenAI fails → Task creation fails

**Handling:**

```javascript
// Stage 1: Context fetch
let context;
try {
  context = await getContext();
} catch (error) {
  context = getFallbackContext(); // Use hardcoded data
  logWarn('using_fallback_context', { reason: error.message });
}

// Stage 2: OpenAI parse
let taskData;
try {
  taskData = await classifyIntent(text, { context });
} catch (error) {
  logError('openai_failed', { error: error.message });
  await sendMessage(
    chatId,
    'Unable to parse your message. Please try again.',
    null,
    botToken
  );
  return { statusCode: 200, body: JSON.stringify({ message: 'Parse failed' }) };
}

// Stage 3: Task creation
try {
  const task = await createMaintenanceVisit(taskData);
  await sendMessage(chatId, `✅ Task created: ${task.name}`, null, botToken);
} catch (error) {
  logError('task_creation_failed', { error: error.message });
  await sendMessage(
    chatId,
    'Failed to create task. Please try again.',
    null,
    botToken
  );
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Creation failed' }),
  };
}
```

**Strategy:** Fail fast at each stage, send user-friendly message, return 200 to
Telegram

---

## 8. Logging Standards

### Log Levels

- **Info:** Normal operations (webhook received, cache hit, task created)
- **Warning:** Recoverable errors (fallback used, low confidence, retry attempt)
- **Error:** Unrecoverable errors (auth failure, validation failure, final retry
  failure)

### Structured Log Format

```javascript
{
  "timestamp": "2024-10-20T18:30:00.123Z",
  "level": "error",
  "event": "erpnext_create_task_failed",
  "correlationId": "webhook-123456",
  "chatId": "789012",
  "userId": "345678",
  "statusCode": 500,
  "attempts": 3,
  "error": "ERPNext server error",
  "duration_ms": 12345
}
```

### Correlation IDs

```javascript
const correlationId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Pass through all operations
logInfo('webhook_received', { correlationId, chatId });
logInfo('openai_request_start', { correlationId, chatId });
logInfo('task_created', { correlationId, chatId, taskId });
```

### Secret Masking

All secrets automatically masked by `lib/logging.mjs`:

- API keys
- Bot tokens
- Webhook secrets
- User passwords (if ever logged)

**Masking policy:** Show first 2 and last 2 characters, mask middle with `*`

Example: `sk-proj-abc123xyz789` → `sk**************89`

---

## 9. Monitoring & Alerting

### CloudWatch Metrics

```javascript
// Custom metrics (future enhancement)
putMetric('TelegramWebhook/ErrorRate', errorCount / totalRequests);
putMetric('OpenAI/TimeoutRate', timeoutCount / totalRequests);
putMetric('ERPNext/FallbackUsageRate', fallbackCount / totalRequests);
```

### Alarms

1. **Critical:** `erpnext_auth_failed` OR `openai_auth_failed`
   - Action: Page admin immediately

2. **High:** `erpnext_create_task_failed > 5 in 10 minutes`
   - Action: Alert on-call engineer

3. **Medium:** `context_fallback_usage > 10 in 1 hour`
   - Action: Investigate ERPNext connectivity

4. **Low:** `low_confidence_parse > 20% of requests`
   - Action: Review OpenAI prompt quality

---

## 10. Testing Checklist

### Unit Tests

- [ ] Validates webhook secret correctly
- [ ] Handles malformed Telegram payloads gracefully
- [ ] Retries ERPNext 500 errors 3 times
- [ ] Falls back to hardcoded data on context fetch failure
- [ ] Retries OpenAI 429 errors with Retry-After delay
- [ ] Parses ERPNext 417 validation errors correctly
- [ ] Masks secrets in all log outputs
- [ ] Generates unique correlation IDs

### Integration Tests

- [ ] End-to-end happy path (webhook → parse → create → confirm)
- [ ] ERPNext 401 auth error triggers fallback
- [ ] ERPNext 500 error triggers 3 retries then fails gracefully
- [ ] OpenAI timeout retries once then fails with user message
- [ ] Low confidence parse creates task with review flag
- [ ] Validation errors return user-friendly messages
- [ ] Telegram send failure doesn't break task creation

### Failure Injection Tests

- [ ] Simulate ERPNext downtime (all 503 responses)
- [ ] Simulate OpenAI rate limit (429 responses)
- [ ] Simulate network timeout (slow responses)
- [ ] Simulate invalid API credentials (401 responses)
- [ ] Verify fallback data used in all scenarios
- [ ] Verify user receives appropriate error messages

---

## References

- Context Injection: `docs/CONTEXT-INJECTION-SPEC.md`
- Field Mapping: `docs/FIELD-MAPPING.md`
- Logging Module:
  `infrastructure/aws/lambda/telegram-bot/webhook_handler/lib/logging.mjs`
- ERPNext API: `https://frappeframework.com/docs/user/en/api/rest`

---

**Document Owner:** Backend Team **Review Cycle:** After each error type
discovered in production **Last Reviewed:** October 2025
