/**
 * OpenAI Chat Completions client with structured outputs
 * @module lib/openai
 */

import OpenAI from 'openai';
import AWSXRay from 'aws-xray-sdk-core';
import { logError, logInfo } from './logging.mjs';

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
          description: 'The person assigned to the task',
        },
        dueDate: {
          type: ['string', 'null'],
          description: 'Due date in ISO 8601 format (YYYY-MM-DD)',
        },
        priority: {
          type: ['string', 'null'],
          enum: ['Low', 'Medium', 'High', 'Urgent', null],
          description: 'Task priority level',
        },
      },
      required: ['description'],
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
 * Classify user intent and extract task parameters using OpenAI Chat Completions
 *
 * @param {string} text - User message text
 * @param {Object} options - Configuration options
 * @param {number} [options.timeoutMs=5000] - Request timeout in milliseconds
 * @param {number} [options.maxRetries=1] - Maximum number of retries
 * @param {string} [options.apiKey] - OpenAI API key
 * @returns {Promise<Object>} Parsed task parameters
 */
export async function classifyIntent(text, options = {}) {
  const {
    timeoutMs = 5000,
    maxRetries = 1,
    apiKey = process.env.OPENAI_API_KEY,
  } = options;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey,
    timeout: timeoutMs,
  });

  const systemPrompt = `You are a task extraction assistant. Extract task parameters from user messages.
- description: The main task description
- assignee: Person's name if mentioned (null if not specified)
- dueDate: ISO 8601 date (YYYY-MM-DD) if mentioned (null if not specified)
- priority: One of [Low, Medium, High, Urgent] if mentioned (null if not specified)

Examples:
"Fix the login bug" -> {description: "Fix the login bug", assignee: null, dueDate: null, priority: null}
"Assign John to review the PR by Friday" -> {description: "Review the PR", assignee: "John", dueDate: "2024-01-19", priority: null}
"URGENT: Deploy hotfix to production ASAP" -> {description: "Deploy hotfix to production", assignee: null, dueDate: null, priority: "Urgent"}`;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const subsegment = AWSXRay.getSegment()?.addNewSubsegment('openai-parse');

    try {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        const jitter = Math.random() * 500;
        await sleep(backoffMs + jitter);

        logInfo('openai_retry', {
          attempt,
          backoffMs: Math.round(backoffMs + jitter),
        });
      }

      logInfo('openai_request_start', {
        attempt,
        textLength: text.length,
      });

      const startTime = Date.now();

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        response_format: taskParametersSchema,
        temperature: 0.1,
      });

      const duration = Date.now() - startTime;
      const taskData = JSON.parse(response.choices[0].message.content);

      logInfo('openai_request_complete', {
        attempt,
        duration,
        finishReason: response.choices[0].finish_reason,
        usage: response.usage,
      });

      subsegment?.addMetadata('duration', duration);
      subsegment?.addMetadata('model', response.model);
      subsegment?.addMetadata('usage', response.usage);
      subsegment?.close();

      return taskData;
    } catch (error) {
      lastError = error;

      logError('openai_request_failed', {
        attempt,
        error: error.message,
        code: error.code,
        type: error.type,
      });

      subsegment?.addError(error);
      subsegment?.close();

      if (attempt >= maxRetries) {
        throw new Error(`OpenAI request failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
    }
  }

  throw lastError;
}
