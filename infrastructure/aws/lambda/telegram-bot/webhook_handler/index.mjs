/**
 * Telegram Webhook Handler (Stage 1)
 *
 * Handles incoming Telegram webhooks, validates requests, parses messages with OpenAI Chat Completions,
 * writes confirmation state to DynamoDB, and sends inline keyboard to user.
 *
 * @module webhook_handler
 */

import { validateWebhook, sendMessage, createConfirmationKeyboard } from './lib/telegram.mjs';
import { classifyIntent } from './lib/openai.mjs';
import { putConfirmation } from './lib/dynamodb.mjs';
import { logInfo, logError, logWarn } from './lib/logging.mjs';

/**
 * Parse Telegram update to extract message and user info
 */
function parseUpdate(body) {
  const update = typeof body === 'string' ? JSON.parse(body) : body;

  if (!update.message || !update.message.text) {
    return null;
  }

  return {
    messageId: update.message.message_id,
    chatId: update.message.chat.id,
    userId: update.message.from.id,
    username: update.message.from.username,
    text: update.message.text.trim(),
  };
}

/**
 * Format task data for confirmation message
 */
function formatTaskSummary(taskData) {
  let summary = `📋 *Task:* ${taskData.description}`;

  if (taskData.assignee) {
    summary += `\n👤 *Assignee:* ${taskData.assignee}`;
  }

  if (taskData.dueDate) {
    summary += `\n📅 *Due:* ${taskData.dueDate}`;
  }

  if (taskData.priority) {
    const priorityEmoji = {
      Urgent: '🔴',
      High: '🟠',
      Medium: '🟡',
      Low: '🟢',
    }[taskData.priority] || '';
    summary += `\n${priorityEmoji} *Priority:* ${taskData.priority}`;
  }

  return summary;
}

/**
 * Lambda handler for Telegram webhook
 */
export const handler = async (event) => {
  const startTime = Date.now();

  logInfo('webhook_received', {
    requestId: event.requestContext?.requestId,
    sourceIp: event.requestContext?.http?.sourceIp,
  });

  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    if (!validateWebhook(event, webhookSecret)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid webhook secret' }),
      };
    }

    const parsed = parseUpdate(event.body);

    if (!parsed) {
      logWarn('unsupported_update_type', {
        body: event.body?.substring(0, 200),
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Update type not supported' }),
      };
    }

    logInfo('message_parsed', {
      chatId: parsed.chatId,
      userId: parsed.userId,
      textLength: parsed.text.length,
    });

    let taskData;
    try {
      taskData = await classifyIntent(parsed.text, {
        timeoutMs: parseInt(process.env.OPENAI_TIMEOUT_MS || '5000', 10),
        maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '1', 10),
      });
    } catch (error) {
      logError('intent_classification_failed', {
        chatId: parsed.chatId,
        error: error.message,
      });

      await sendMessage(
        parsed.chatId,
        '❌ Sorry, I had trouble understanding your request. Please try again.',
        null,
        botToken
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Classification failed, error sent to user' }),
      };
    }

    const confirmationId = await putConfirmation({
      userId: String(parsed.userId),
      chatId: String(parsed.chatId),
      taskData,
    });

    const summaryText = formatTaskSummary(taskData);
    const confirmationMessage = `${summaryText}\n\n❓ *Create this task?*`;
    const keyboard = createConfirmationKeyboard(confirmationId);

    await sendMessage(parsed.chatId, confirmationMessage, keyboard, botToken);

    const duration = Date.now() - startTime;

    logInfo('webhook_complete', {
      confirmationId,
      chatId: parsed.chatId,
      duration,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmationId,
        message: 'Confirmation sent',
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logError('webhook_handler_error', {
      error: error.message,
      stack: error.stack,
      duration,
    });

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};
