/**
 * Telegram Webhook Handler (Pure Lambda MVP)
 *
 * Handles incoming Telegram webhooks, validates requests, fetches ERPNext context,
 * parses messages with OpenAI Chat Completions, creates Maintenance Visit in ERPNext,
 * and sends confirmation to user.
 *
 * @module webhook_handler
 */

import { validateWebhook, sendMessage } from './lib/telegram.mjs';
import { classifyIntent } from './lib/openai.mjs';
import { getContext, createMaintenanceVisit, logParserAudit } from './lib/erpnext.mjs';
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
    firstName: update.message.from.first_name,
    text: update.message.text.trim(),
  };
}

/**
 * Determine sender context from Telegram user
 */
function determineSender(telegramUser, teamMembers) {
  const usernameLower = telegramUser.username?.toLowerCase();
  const firstNameLower = telegramUser.firstName?.toLowerCase();

  // Try to match by username or first name
  const matched = teamMembers.find(member => {
    const memberNameLower = member.fullName.toLowerCase();
    return memberNameLower === usernameLower || memberNameLower === firstNameLower;
  });

  if (matched) {
    return {
      name: matched.fullName,
      email: matched.email,
      timezone: matched.timezone,
      telegram_id: telegramUser.userId
    };
  }

  // Fallback: Use first enabled user
  const fallback = teamMembers.find(m => m.enabled) || teamMembers[0];
  return {
    name: fallback?.fullName || 'Unknown',
    email: fallback?.email || 'unknown@10nz.tools',
    timezone: fallback?.timezone || 'America/New_York',
    telegram_id: telegramUser.userId
  };
}

/**
 * Format success message for user
 */
function formatSuccessMessage(taskData, erpnextTask) {
  let message = `✅ *Task Created Successfully*\n\n`;
  message += `📋 *Description:* ${taskData.description.substring(0, 100)}`;

  if (taskData.description.length > 100) {
    message += '...';
  }

  if (taskData.assignee) {
    const assigneeName = taskData.assignee.split('@')[0];
    message += `\n👤 *Assigned to:* ${assigneeName}`;
  }

  if (taskData.dueDate) {
    message += `\n📅 *Due:* ${taskData.dueDate}`;
  }

  if (taskData.priority) {
    const priorityEmoji = {
      Urgent: '🔴',
      High: '🟠',
      Medium: '🟡',
      Low: '🟢',
    }[taskData.priority] || '';
    message += `\n${priorityEmoji} *Priority:* ${taskData.priority}`;
  }

  if (taskData.confidence < 0.7) {
    message += `\n\n⚠️ *Note:* Task flagged for review (confidence: ${(taskData.confidence * 100).toFixed(0)}%)`;
  }

  message += `\n\n*Task ID:* ${erpnextTask.name}`;

  return message;
}

/**
 * Lambda handler for Telegram webhook
 */
export const handler = async (event) => {
  const startTime = Date.now();
  const correlationId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logInfo('webhook_received', {
    requestId: event.requestContext?.requestId,
    sourceIp: event.requestContext?.http?.sourceIp,
    correlationId
  });

  try {
    // Step 1: Validate webhook and parse request
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    if (!validateWebhook(event, webhookSecret)) {
      logWarn('webhook_validation_failed', {
        sourceIp: event.requestContext?.http?.sourceIp,
        correlationId
      });

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
        correlationId
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Update type not supported' }),
      };
    }

    // Handle bot commands (future enhancement)
    if (parsed.text.startsWith('/')) {
      logInfo('bot_command_received', {
        command: parsed.text.split(' ')[0],
        chatId: parsed.chatId,
        correlationId
      });

      await sendMessage(
        parsed.chatId,
        'Commands are not yet implemented. Please send a task description.',
        null,
        botToken
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Command received' }),
      };
    }

    logInfo('message_parsed', {
      chatId: parsed.chatId,
      userId: parsed.userId,
      textLength: parsed.text.length,
      correlationId
    });

    // Step 2: Fetch ERPNext context (with caching and automatic fallback to hardcoded data)
    const { users, sites } = await getContext();

    const sender = determineSender({
      username: parsed.username,
      firstName: parsed.firstName,
      userId: parsed.userId
    }, users);

    const context = {
      users,
      sites,
      sender
    };

    logInfo('context_fetched', {
      userCount: users.length,
      siteCount: sites.length,
      sender: sender.name,
      correlationId
    });

    // Step 3: Parse message with OpenAI
    let taskData;
    try {
      taskData = await classifyIntent(parsed.text, {
        timeoutMs: parseInt(process.env.OPENAI_TIMEOUT_MS || '10000', 10),
        maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2', 10),
        context,
        correlationId
      });

      logInfo('message_parsed_by_openai', {
        confidence: taskData.confidence,
        assignee: taskData.assignee,
        priority: taskData.priority,
        correlationId
      });

      // Map assignee name to email address (OpenAI may return "Joel" instead of "joel@10nz.tools")
      if (taskData.assignee && !taskData.assignee.includes('@')) {
        const nameLower = taskData.assignee.toLowerCase().trim();
        const matchedUser = context.users.find(u =>
          u.fullName.toLowerCase() === nameLower ||
          u.email.toLowerCase().startsWith(nameLower)
        );

        if (matchedUser) {
          taskData.assignee = matchedUser.email;
          logInfo('assignee_mapped', {
            originalName: nameLower,
            mappedEmail: matchedUser.email,
            correlationId
          });
        } else {
          // User not found - send friendly message
          const validAssignees = context.users.map(u => u.fullName).join(', ');
          await sendMessage(
            parsed.chatId,
            `❌ User '${taskData.assignee}' not found.\n\nValid assignees: ${validAssignees}`,
            null,
            botToken
          );

          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Invalid assignee, error sent to user' }),
          };
        }
      }

      // Validate parsed data before creating Maintenance Visit in ERPNext
      const validationErrors = [];

      if (!taskData.description || taskData.description.trim() === '') {
        validationErrors.push('Description cannot be empty');
      }

      if (taskData.description && taskData.description.length > 5000) {
        validationErrors.push('Description exceeds maximum length (5000 characters)');
      }

      const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
      if (taskData.priority && !validPriorities.includes(taskData.priority)) {
        taskData.priority = 'Medium';  // Default to Medium if invalid
        logWarn('invalid_priority_defaulted', {
          originalPriority: taskData.priority,
          correlationId
        });
      }

      if (validationErrors.length > 0) {
        await sendMessage(
          parsed.chatId,
          `❌ Validation failed:\n\n${validationErrors.join('\n')}\n\nPlease check your input and try again.`,
          null,
          botToken
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Validation failed, error sent to user' }),
        };
      }

    } catch (error) {
      logError('intent_classification_failed', {
        chatId: parsed.chatId,
        error: error.message,
        correlationId
      });

      await sendMessage(
        parsed.chatId,
        '❌ Sorry, I had trouble understanding your request. Please try again or rephrase.',
        null,
        botToken
      );

      // Log failed parse to ERPNext (fire-and-forget)
      logParserAudit({
        telegram_message_id: String(parsed.messageId),
        user_id: String(parsed.userId),
        original_text: parsed.text,
        parsed_data: null,
        confidence: 0,
        status: 'failed',
        error_message: error.message
      }).catch(() => {});  // Ignore audit failures

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Classification failed, error sent to user' }),
      };
    }

    // Step 4: Create Maintenance Visit in ERPNext
    let erpnextTask;
    try {
      erpnextTask = await createMaintenanceVisit(taskData, String(parsed.messageId));

      logInfo('maintenance_visit_created', {
        taskId: erpnextTask.name,
        assignee: taskData.assignee,
        confidence: taskData.confidence,
        correlationId
      });

      // Log successful parse to ERPNext (fire-and-forget)
      logParserAudit({
        telegram_message_id: String(parsed.messageId),
        user_id: String(parsed.userId),
        original_text: parsed.text,
        parsed_data: taskData,
        confidence: taskData.confidence,
        status: 'success'
      }).catch(() => {});  // Ignore audit failures

    } catch (error) {
      logError('create_maintenance_visit_failed', {
        error: error.message,
        status: error.status,
        taskDescription: taskData.description?.substring(0, 50),
        correlationId
      });

      // Log failed task creation to ERPNext audit trail (fire-and-forget)
      logParserAudit({
        telegram_message_id: String(parsed.messageId),
        user_id: String(parsed.userId),
        original_text: parsed.text,
        parsed_data: taskData,
        confidence: taskData.confidence,
        status: 'failed',
        error_message: error.message
      }).catch(() => {});  // Ignore audit failures

      // Handle ERPNext validation errors (417) by parsing _server_messages for user-friendly details
      if (error.status === 417 && error._server_messages) {
        try {
          const messages = JSON.parse(error._server_messages);
          const userFriendlyErrors = messages.map(m => m.message).join('\n');
          await sendMessage(
            parsed.chatId,
            `❌ Task creation failed:\n\n${userFriendlyErrors}\n\nPlease check your input and try again.`,
            null,
            botToken
          );
        } catch {
          // Fallback if parsing fails
          await sendMessage(
            parsed.chatId,
            `❌ Task validation failed. Please check your input and try again.`,
            null,
            botToken
          );
        }
      } else if (error.status === 417) {
        // 417 without _server_messages
        await sendMessage(
          parsed.chatId,
          `❌ Task validation failed: ${error.message}\n\nPlease check your input and try again.`,
          null,
          botToken
        );
      } else {
        // Other errors
        await sendMessage(
          parsed.chatId,
          '❌ Failed to create task in ERPNext. Please try again in a moment.',
          null,
          botToken
        );
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Task creation failed, error sent to user' }),
      };
    }

    // Step 5: Send success confirmation to user
    try {
      const successMessage = formatSuccessMessage(taskData, erpnextTask);

      await sendMessage(parsed.chatId, successMessage, null, botToken);

      logInfo('confirmation_sent', {
        chatId: parsed.chatId,
        taskId: erpnextTask.name,
        correlationId
      });
    } catch (error) {
      // Log failure but don't fail the whole operation (task was created successfully)
      logWarn('telegram_send_confirmation_failed', {
        error: error.message,
        taskId: erpnextTask.name,
        correlationId
      });
    }

    const duration = Date.now() - startTime;

    logInfo('webhook_complete', {
      taskId: erpnextTask.name,
      duration,
      correlationId
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: erpnextTask.name,
        message: 'Task created successfully',
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logError('webhook_handler_error', {
      error: error.message,
      stack: error.stack,
      duration,
      correlationId
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
