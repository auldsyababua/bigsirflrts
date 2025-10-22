/**
 * OpenAI Chat Completions client with structured outputs
 * @module lib/openai
 */

import OpenAI from 'openai';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logError, logInfo } from './logging.mjs';

const tracer = trace.getTracer('telegram-webhook');

const taskParametersSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'task_parameters',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'The task description',
        },
        assignee: {
          type: ['string', 'null'],
          description: 'The person assigned to the task (email format)',
        },
        dueDate: {
          type: ['string', 'null'],
          description: 'Due date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)',
        },
        priority: {
          type: ['string', 'null'],
          enum: ['Low', 'Medium', 'High', 'Urgent', null],
          description: 'Task priority level',
        },
        rationale: {
          type: 'string',
          description: 'Brief explanation of parsing logic and reasoning',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score 0.0-1.0 for this parse',
        },
      },
      required: ['description', 'rationale', 'confidence'],
      additionalProperties: false,
    },
  },
};

/**
 * Sleep utility for retry backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build system prompt with injected context
 *
 * @param {Object} context - Context object with users, sites, current time
 * @returns {string} System prompt with context
 */
export function buildSystemPromptWithContext(context) {
  const users = Array.isArray(context?.users) ? context.users : [];
  const sites = Array.isArray(context?.sites) ? context.sites : [];

  const teamList = users
    .map(u => `- ${u.fullName || u.name || 'Unknown'} (${u.email || 'unknown'}) - ${u.timezone || 'UTC'}`)
    .join('\n');

  const siteList = sites.map(s => `- ${s}`).join('\n');

  // Convert current time to sender's timezone
  const sender = {
    name: 'User',
    email: 'user@10nz.tools',
    timezone: 'America/New_York',
    ...(context?.sender || {})
  };

  const currentTimeUTC = new Date().toISOString();
  let currentTimeLocal;
  try {
    currentTimeLocal = new Date().toLocaleString('en-US', {
      timeZone: sender.timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    currentTimeLocal = new Date().toLocaleString('en-US', { hour12: false });
  }

  return `You are a task extraction assistant for a distributed bitcoin mining operations team.

**Current Context:**
- Current time (sender's timezone): ${currentTimeLocal} ${sender.timezone}
- Current UTC time: ${currentTimeUTC}
- Sender: ${sender.name} (${sender.email})
- Sender timezone: ${sender.timezone}

**Team Members:**
${teamList}

**Site Locations:**
${siteList}

**Your Task:**
Extract task parameters from user messages. Match assignee names to the team members listed above (use email format in output). Match site references to the locations listed above.

**Output Fields:**
- description: The main task description (required, max 5000 chars)
- assignee: Person's email from team list above (null if not specified)
- dueDate: ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ) (null if not specified)
- priority: One of [Low, Medium, High, Urgent] (null if not specified, defaults to Medium)
- rationale: Brief explanation of your parsing logic (required, max 2000 chars)
- confidence: Confidence score 0.0-1.0 (required)

**Parsing Rules:**
1. Match names case-insensitively to team members
2. Convert relative dates ("tomorrow", "Friday") to absolute ISO dates based on sender's local time (not UTC)
3. When "his time" or "her time" mentioned, use assignee's timezone from team list above
4. Infer priority from urgency keywords (ASAP → Urgent, urgent → High)
5. Set confidence < 0.7 if any ambiguity exists
6. Include reasoning in rationale field

**Examples:**
"Taylor check pump #3 by 2pm" →
{
  "description": "Check pump #3",
  "assignee": "taylor@10nz.tools",
  "dueDate": "2024-10-20T14:00:00Z",
  "priority": null,
  "rationale": "User mentioned 'Taylor' which matches team member taylor@10nz.tools. Time '2pm' interpreted as 2pm UTC (no timezone specified).",
  "confidence": 0.85
}

"Fix the login bug" →
{
  "description": "Fix the login bug",
  "assignee": null,
  "dueDate": null,
  "priority": null,
  "rationale": "Clear task description with no assignee or deadline specified.",
  "confidence": 0.95
}`;
}

/**
 * Classify user intent and extract task parameters using OpenAI Chat Completions
 *
 * @param {string} text - User message text
 * @param {Object} options - Configuration options
 * @param {number} [options.timeoutMs=10000] - Request timeout in milliseconds
 * @param {number} [options.maxRetries=2] - Maximum number of retries
 * @param {string} [options.apiKey] - OpenAI API key
 * @param {Object} [options.context] - Context object (users, sites, sender)
 * @param {string} [options.correlationId] - Correlation ID for logging
 * @returns {Promise<Object>} Parsed task parameters
 */
export async function classifyIntent(text, options = {}) {
  const {
    timeoutMs = 10000,
    maxRetries = 2,
    apiKey = process.env.OPENAI_API_KEY,
    context = null,
    correlationId = null
  } = options;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey,
    timeout: timeoutMs,
  });

  const systemPrompt = context
    ? buildSystemPromptWithContext(context)
    : `You are a task extraction assistant. Extract task parameters from user messages.`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const span = tracer.startSpan('openai-parse');

    try {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        const jitter = Math.random() * 500;
        await sleep(backoffMs + jitter);

        logInfo('openai_retry', {
          attempt,
          backoffMs: Math.round(backoffMs + jitter),
          correlationId
        });
      }

      logInfo('openai_request_start', {
        attempt,
        textLength: text.length,
        correlationId
      });

      const startTime = Date.now();

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        response_format: taskParametersSchema,
        temperature: 0.1,
      });

      const duration = Date.now() - startTime;
      // Structured Outputs API returns parsed object in message.parsed
      const taskData = response.choices[0].message.parsed || JSON.parse(response.choices[0].message.content);

      logInfo('openai_request_complete', {
        attempt,
        duration,
        finishReason: response.choices[0].finish_reason,
        confidence: taskData.confidence,
        usage: response.usage,
        correlationId
      });

      span.setAttribute('duration_ms', duration);
      span.setAttribute('model', response.model);
      span.setAttribute('confidence', taskData.confidence);
      try { span.setAttribute('usage_total_tokens', response.usage?.total_tokens || 0); } catch {}
      span.setStatus({ code: SpanStatusCode.OK });

      // Flag low confidence parses
      if (taskData.confidence < 0.5) {
        logInfo('low_confidence_parse_warning', {
          confidence: taskData.confidence,
          rationale: taskData.rationale,
          correlationId
        });
      }

      return taskData;
    } catch (error) {
      // Auth errors - don't retry
      if (error.status === 401) {
        logError('openai_auth_failed', {
          error: error.message,
          correlationId
        });
        throw new Error('OpenAI authentication failed');
      }

      // Rate limit or quota - retry with delay
      if (error.status === 429) {
        const ra = error.response?.headers?.['retry-after'];
        let retryAfter = Number.isFinite(+ra) ? parseInt(ra, 10) : 2;
        if (!Number.isFinite(retryAfter) && typeof ra === 'string') {
          const deltaMs = Date.parse(ra) - Date.now();
          retryAfter = deltaMs > 0 ? Math.ceil(deltaMs / 1000) : 2;
        }

        const isQuota = /insufficient[_\s-]?quota/i.test(error?.message || '') || error?.type === 'insufficient_quota';
        logInfo(isQuota ? 'openai_quota_exceeded' : 'openai_rate_limit', {
          attempt,
          retryAfter,
          correlationId
        });

        if (attempt < maxRetries) {
          await sleep(retryAfter * 1000);
          continue;
        }
      }

      // Server errors - retry
      if (error.status >= 500 && attempt < maxRetries) {
        logInfo('openai_server_error', {
          attempt,
          statusCode: error.status,
          correlationId
        });
        continue;
      }

      // Timeout - retry if attempts are left
      if ((error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') && attempt < maxRetries) {
        logInfo('openai_timeout', {
          attempt,
          timeout_ms: timeoutMs,
          correlationId
        });
        continue;
      }

      logError('openai_request_failed', {
        attempt,
        error: error.message,
        code: error.code,
        type: error.type,
        status: error.status,
        correlationId
      });

      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

      if (attempt >= maxRetries) {
        throw new Error(`OpenAI request failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
    } finally {
      span.end();
    }
  }
}
