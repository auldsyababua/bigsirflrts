import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateWebhook, sendMessage, createConfirmationKeyboard } from '../lib/telegram.mjs';

global.fetch = vi.fn();

describe('validateWebhook', () => {
  it('should return true when no expectedToken is configured', () => {
    const event = { headers: {} };
    expect(validateWebhook(event, null)).toBe(true);
    expect(validateWebhook(event, undefined)).toBe(true);
    expect(validateWebhook(event, '')).toBe(true);
  });

  it('should return true when tokens match (lowercase header)', () => {
    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'test-secret',
      },
    };
    expect(validateWebhook(event, 'test-secret')).toBe(true);
  });

  it('should return true when tokens match (PascalCase header)', () => {
    const event = {
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'test-secret',
      },
    };
    expect(validateWebhook(event, 'test-secret')).toBe(true);
  });

  it('should return false when token is missing', () => {
    const event = { headers: {} };
    expect(validateWebhook(event, 'expected-token')).toBe(false);
  });

  it('should return false when tokens do not match', () => {
    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'wrong-token',
      },
    };
    expect(validateWebhook(event, 'expected-token')).toBe(false);
  });
});

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send message without keyboard', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        result: { message_id: 123 },
      }),
    };
    global.fetch.mockResolvedValue(mockResponse);

    await sendMessage('123456', 'Test message', null, 'bot-token');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '123456',
          text: 'Test message',
          parse_mode: 'Markdown',
        }),
      })
    );
  });

  it('should send message with inline keyboard', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        result: { message_id: 123 },
      }),
    };
    global.fetch.mockResolvedValue(mockResponse);

    const keyboard = [[{ text: 'Button', callback_data: 'action' }]];

    await sendMessage('123456', 'Test message', keyboard, 'bot-token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('reply_markup'),
      })
    );
  });

  it('should throw error when API returns non-ok status', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Bad Request'),
    };
    global.fetch.mockResolvedValue(mockResponse);

    await expect(sendMessage('123456', 'Test', null, 'bot-token')).rejects.toThrow(
      'Telegram API error: 400'
    );
  });

  it('should throw error on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    await expect(sendMessage('123456', 'Test', null, 'bot-token')).rejects.toThrow('Network error');
  });
});

describe('createConfirmationKeyboard', () => {
  it('should create keyboard with Yes and Cancel buttons', () => {
    const keyboard = createConfirmationKeyboard('test-id-123');

    expect(keyboard).toEqual([
      [
        { text: '✅ Yes', callback_data: 'confirm:test-id-123' },
        { text: '❌ Cancel', callback_data: 'cancel:test-id-123' },
      ],
    ]);
  });
});
