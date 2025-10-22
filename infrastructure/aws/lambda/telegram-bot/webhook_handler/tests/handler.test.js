import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as telegram from '../lib/telegram.mjs';
import * as openai from '../lib/openai.mjs';
import * as erpnext from '../lib/erpnext.mjs';

// Mocks BEFORE handler import (critical for preventing dependency load)
vi.mock('../lib/telegram.mjs');
vi.mock('../lib/openai.mjs');
vi.mock('../lib/erpnext.mjs');

// Now import handler (mocks are applied)
import { handler } from '../index.mjs';

describe('webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ERPNEXT_API_KEY = 'test-erpnext-key';
    process.env.ERPNEXT_API_SECRET = 'test-erpnext-secret';
    process.env.ERPNEXT_BASE_URL = 'https://test.erpnext.com';
    process.env.OPENAI_TIMEOUT_MS = '5000';
  });

  it('should process valid webhook and send confirmation', async () => {
    const mockContext = {
      users: [
        {
          email: 'test@10nz.tools',
          fullName: 'Test User',
          timezone: 'America/New_York',
          enabled: true,
        },
      ],
      sites: [{ name: 'site-1', location_name: 'Test Site' }],
    };

    vi.spyOn(telegram, 'validateWebhook').mockReturnValue(true);
    vi.spyOn(erpnext, 'getContext').mockResolvedValue(mockContext);
    vi.spyOn(openai, 'classifyIntent').mockResolvedValue({
      description: 'Fix bug',
      assignee: 'test@10nz.tools',
      dueDate: null,
      priority: 'High',
      rationale: 'User requested bug fix',
      confidence: 0.9,
    });
    vi.spyOn(erpnext, 'createMaintenanceVisit').mockResolvedValue({ name: 'MNTC-00001' });
    vi.spyOn(erpnext, 'logParserAudit').mockResolvedValue(undefined);
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true });

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
    expect(JSON.parse(response.body).taskId).toBe('MNTC-00001');
    expect(telegram.validateWebhook).toHaveBeenCalled();
    expect(erpnext.getContext).toHaveBeenCalled();
    expect(openai.classifyIntent).toHaveBeenCalledWith(
      'Fix the bug',
      expect.objectContaining({
        context: expect.objectContaining({
          users: mockContext.users,
          sites: mockContext.sites,
          sender: expect.objectContaining({
            email: 'test@10nz.tools',
            name: 'Test User',
          }),
        }),
        timeoutMs: 5000,
        maxRetries: 2,
      })
    );
    expect(erpnext.createMaintenanceVisit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Fix bug',
        assignee: 'test@10nz.tools',
        priority: 'High',
        rationale: 'User requested bug fix',
        confidence: 0.9,
      }),
      '1'
    );
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

  it('should handle OpenAI classification failure and log audit', async () => {
    const mockContext = {
      users: [],
      sites: [],
    };

    vi.spyOn(telegram, 'validateWebhook').mockReturnValue(true);
    vi.spyOn(erpnext, 'getContext').mockResolvedValue(mockContext);
    vi.spyOn(openai, 'classifyIntent').mockRejectedValue(new Error('OpenAI timeout'));
    vi.spyOn(erpnext, 'logParserAudit').mockResolvedValue(undefined);
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
    expect(erpnext.logParserAudit).toHaveBeenCalledWith({
      telegram_message_id: '1',
      user_id: '123',
      original_text: 'Test message',
      parsed_data: null,
      confidence: 0,
      status: 'failed',
      error_message: 'OpenAI timeout',
    });
    expect(telegram.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('trouble understanding'),
      null,
      'test-bot-token'
    );
  });

  it('should handle ERPNext 417 validation errors with user-friendly message', async () => {
    const mockContext = {
      users: [{ email: 'test@10nz.tools', fullName: 'Test User', timezone: 'UTC', enabled: true }],
      sites: [],
    };

    vi.spyOn(telegram, 'validateWebhook').mockReturnValue(true);
    vi.spyOn(erpnext, 'getContext').mockResolvedValue(mockContext);
    vi.spyOn(openai, 'classifyIntent').mockResolvedValue({
      description: 'Fix bug',
      assignee: 'test@10nz.tools',
      dueDate: null,
      priority: 'High',
      rationale: 'Test',
      confidence: 0.9,
    });

    const validationError = new Error('ERPNext API error 417');
    validationError.status = 417;
    validationError._server_messages = JSON.stringify([
      {
        message: 'Customer is mandatory',
      },
    ]);

    vi.spyOn(erpnext, 'createMaintenanceVisit').mockRejectedValue(validationError);
    vi.spyOn(erpnext, 'logParserAudit').mockResolvedValue(undefined);
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true });

    const event = {
      headers: {},
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the bug',
        },
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    // Note: The audit log currently receives the generic error.message ("ERPNext API error 417")
    // rather than the parsed validation details. The user message DOES get the detailed error.
    // This could be enhanced in the future to extract validation messages for audit logging.
    expect(erpnext.logParserAudit).toHaveBeenCalledWith({
      telegram_message_id: '1',
      user_id: '123',
      original_text: 'Fix the bug',
      parsed_data: expect.any(Object),
      confidence: 0.9,
      status: 'failed',
      error_message: 'ERPNext API error 417',
    });
    // User message DOES get the detailed validation error (parsed from _server_messages)
    expect(telegram.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Customer is mandatory'),
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
