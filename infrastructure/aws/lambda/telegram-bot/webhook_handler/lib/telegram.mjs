/**
 * Telegram API utilities
 * @module lib/telegram
 */

import { logError, logInfo, maskSecret } from './logging.mjs';

/**
 * Validate Telegram webhook request
 *
 * @param {Object} event - Lambda event object
 * @param {string} expectedToken - Expected secret token
 * @returns {boolean} True if valid, false otherwise
 */
export function validateWebhook(event, expectedToken) {
  if (!expectedToken) {
    return true;
  }

  const receivedToken = event.headers?.['x-telegram-bot-api-secret-token'] ||
                       event.headers?.['X-Telegram-Bot-Api-Secret-Token'];

  if (!receivedToken) {
    logError('webhook_validation_failed', {
      reason: 'missing_secret_token',
    });
    return false;
  }

  if (receivedToken !== expectedToken) {
    logError('webhook_validation_failed', {
      reason: 'token_mismatch',
      received: maskSecret(receivedToken),
      expected: maskSecret(expectedToken),
    });
    return false;
  }

  return true;
}

/**
 * Send a message to Telegram with optional inline keyboard
 *
 * @param {string} chatId - Telegram chat ID
 * @param {string} text - Message text
 * @param {Object} [inlineKeyboard] - Inline keyboard markup
 * @param {string} botToken - Telegram bot token
 * @returns {Promise<Object>} Telegram API response
 */
export async function sendMessage(chatId, text, inlineKeyboard, botToken) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  };

  if (inlineKeyboard) {
    payload.reply_markup = {
      inline_keyboard: inlineKeyboard,
    };
  }

  logInfo('telegram_send_start', {
    chatId,
    hasKeyboard: !!inlineKeyboard,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    logInfo('telegram_send_complete', {
      chatId,
      messageId: result.result?.message_id,
    });

    return result;
  } catch (error) {
    logError('telegram_send_failed', {
      chatId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create inline keyboard with Yes/Cancel buttons
 *
 * @param {string} confirmationId - Unique confirmation ID
 * @returns {Array} Inline keyboard array
 */
export function createConfirmationKeyboard(confirmationId) {
  return [
    [
      {
        text: '✅ Yes',
        callback_data: `confirm:${confirmationId}`,
      },
      {
        text: '❌ Cancel',
        callback_data: `cancel:${confirmationId}`,
      },
    ],
  ];
}
