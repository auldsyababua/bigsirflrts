import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../index.mjs';
import * as telegram from '../lib/telegram.mjs';
import * as openai from '../lib/openai.mjs';
import * as dynamodb from '../lib/dynamodb.mjs';

vi.mock('../lib/telegram.mjs');
vi.mock('../lib/openai.mjs');
vi.mock('../lib/dynamodb.mjs');

describe('webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret';
  });

  it('should process valid webhook and send confirmation', async () => {
    vi.spyOn(telegram, 'validateWebhook').mockReturnValue(true);
    vi.spyOn(openai, 'classifyIntent').mockResolvedValue({
      description: 'Fix bug',
      assignee: null,
      dueDate: null,
      priority: null,
    });
    vi.spyOn(dynamodb, 'putConfirmation').mockResolvedValue('test-confirmation-id');
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true });
    vi.spyOn(telegram, 'createConfirmationKeyboard').mockReturnValue([]);

    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'test-secret',
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the bug',
        },
      }),
      requestContext: {
        requestId: 'test-request',
        http: { sourceIp: '1.2.3.4' },
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).confirmationId).toBe('test-confirmation-id');
    expect(telegram.validateWebhook).toHaveBeenCalled();
    expect(openai.classifyIntent).toHaveBeenCalledWith(
      'Fix the bug',
      expect.objectContaining({ timeoutMs: 5000 })
    );
    expect(dynamodb.putConfirmation).toHaveBeenCalled();
    expect(telegram.sendMessage).toHaveBeenCalled();
  });

  it('should return 403 when webhook validation fails', async () => {
    vi.spyOn(telegram, 'validateWebhook').mockReturnValue(false);

    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'wrong-secret',
      },
      body: JSON.stringify({ message: { text: 'test' } }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error).toBe('Invalid webhook secret');
  });

  it('should handle unsupported update types', async () => {
    vi.spyOn(telegram, 'validateWebhook').mockReturnValue(true);

    const event = {
      headers: {},
      body: JSON.stringify({
        callback_query: { id: 'test' },
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe('Update type not supported');
  });

  it('should handle OpenAI classification failure gracefully', async () => {
    vi.spyOn(telegram, 'validateWebhook').mockReturnValue(true);
    vi.spyOn(openai, 'classifyIntent').mockRejectedValue(new Error('OpenAI timeout'));
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true });

    const event = {
      headers: {},
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Test message',
        },
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(telegram.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('trouble understanding'),
      null,
      'test-bot-token'
    );
  });

  it('should return 500 on unexpected error', async () => {
    vi.spyOn(telegram, 'validateWebhook').mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const event = {
      headers: {},
      body: '{}',
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toBe('Internal server error');
  });

  it('should throw error when bot token not configured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const event = {
      headers: {},
      body: '{}',
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
  });
});
