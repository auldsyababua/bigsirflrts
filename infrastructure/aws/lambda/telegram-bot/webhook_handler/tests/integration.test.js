import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../index.mjs';

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startSpan: () => ({
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      }),
    }),
  },
  SpanStatusCode: {
    OK: 0,
    ERROR: 2,
  },
}));

describe('Integration Tests', () => {
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    process.env.NODE_ENV = 'test';
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ERPNEXT_API_KEY = 'test-erpnext-key';
    process.env.ERPNEXT_API_SECRET = 'test-erpnext-secret';
    process.env.ERPNEXT_BASE_URL = 'https://test.erpnext.com';

    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should handle complete happy path: Telegram → ERPNext context → OpenAI → ERPNext creation → Telegram confirmation', async () => {
    // Mock ERPNext context fetch (users)
    const mockUsersResponse = {
      data: [
        {
          name: 'user@10nz.tools',
          email: 'user@10nz.tools',
          full_name: 'Test User',
          time_zone: 'America/New_York',
          enabled: 1,
        },
      ],
    };

    // Mock ERPNext context fetch (sites)
    const mockSitesResponse = {
      data: [{ name: 'site-1', location_name: 'Test Site' }],
    };

    // Mock OpenAI response
    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            parsed: {
              description: 'Fix the pump at Test Site',
              assignee: 'user@10nz.tools',
              dueDate: '2024-10-20T14:00:00Z',
              priority: 'High',
              rationale: 'Urgent maintenance required',
              confidence: 0.95,
            },
          },
        },
      ],
    };

    // Mock ERPNext Maintenance Visit creation
    const mockMaintenanceVisitResponse = {
      data: {
        name: 'MNTC-00001',
        mntc_work_details: 'Fix the pump at Test Site',
        custom_assigned_to: 'user@10nz.tools',
      },
    };

    // Mock Telegram sendMessage
    const mockTelegramResponse = {
      ok: true,
      result: {
        message_id: 2,
        text: '✅ Task created successfully!',
      },
    };

    // Mock audit log
    const mockAuditLogResponse = {
      data: {
        name: 'LOG-00001',
      },
    };

    global.fetch
      // ERPNext: fetch users
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUsersResponse,
      })
      // ERPNext: fetch sites
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSitesResponse,
      })
      // OpenAI: parse message
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOpenAIResponse,
      })
      // ERPNext: create Maintenance Visit
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMaintenanceVisitResponse,
      })
      // Telegram: send confirmation
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTelegramResponse,
      })
      // ERPNext: log audit (fire-and-forget)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuditLogResponse,
      });

    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'test-secret',
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the pump at Test Site',
        },
      }),
      requestContext: {
        requestId: 'test-request-id',
        http: { sourceIp: '1.2.3.4' },
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.taskId).toBe('MNTC-00001');
    expect(body.message).toBe('Task created successfully');

    // Verify fetch calls in order
    expect(global.fetch).toHaveBeenCalledTimes(6);

    // 1. ERPNext users fetch
    expect(global.fetch.mock.calls[0][0]).toContain('/api/resource/User');

    // 2. ERPNext sites fetch
    expect(global.fetch.mock.calls[1][0]).toContain('/api/resource/Location');

    // 3. OpenAI parse
    expect(global.fetch.mock.calls[2][0]).toContain('openai.com');

    // 4. ERPNext create Maintenance Visit
    expect(global.fetch.mock.calls[3][0]).toContain('/api/resource/Maintenance Visit');
    const createBody = JSON.parse(global.fetch.mock.calls[3][1].body);
    expect(createBody.mntc_work_details).toBe('Fix the pump at Test Site');
    expect(createBody.custom_assigned_to).toBe('user@10nz.tools');
    expect(createBody.custom_telegram_message_id).toBe('1');

    // 5. Telegram sendMessage
    expect(global.fetch.mock.calls[4][0]).toContain('api.telegram.org');

    // 6. ERPNext audit log
    expect(global.fetch.mock.calls[5][0]).toContain('/api/resource/FLRTS Parser Log');
  });

  it('should handle OpenAI parsing failure with audit logging and user notification', async () => {
    // Mock ERPNext context fetch
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      // OpenAI fails
      .mockRejectedValueOnce(new Error('OpenAI timeout'))
      // Telegram error message
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      // Audit log
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { name: 'LOG-00001' } }),
      });

    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'test-secret',
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the pump',
        },
      }),
      requestContext: {
        requestId: 'test-request-id',
        http: { sourceIp: '1.2.3.4' },
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify Telegram error notification was sent
    const telegramCall = global.fetch.mock.calls.find((call) =>
      call[0].includes('api.telegram.org')
    );
    expect(telegramCall).toBeDefined();
    const telegramBody = JSON.parse(telegramCall[1].body);
    expect(telegramBody.text).toContain('trouble understanding');

    // Verify audit log was created
    const auditCall = global.fetch.mock.calls.find((call) => call[0].includes('FLRTS Parser Log'));
    expect(auditCall).toBeDefined();
    const auditBody = JSON.parse(auditCall[1].body);
    expect(auditBody.status).toBe('failed');
    expect(auditBody.error_message).toContain('OpenAI timeout');
  });

  it('should handle ERPNext 417 validation error with parsed error message', async () => {
    // Mock ERPNext context fetch
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              name: 'user@10nz.tools',
              email: 'user@10nz.tools',
              full_name: 'User',
              time_zone: 'UTC',
              enabled: 1,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      // OpenAI parse
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                parsed: {
                  description: 'Fix pump',
                  assignee: 'user@10nz.tools',
                  dueDate: null,
                  priority: 'High',
                  rationale: 'Test',
                  confidence: 0.9,
                },
              },
            },
          ],
        }),
      })
      // ERPNext create fails with 417
      .mockResolvedValueOnce({
        ok: false,
        status: 417,
        json: async () => ({
          _server_messages: JSON.stringify([{ message: 'Customer is mandatory' }]),
          message: 'Validation failed',
        }),
      })
      // Telegram error message
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      // Audit log
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { name: 'LOG-00001' } }),
      });

    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'test-secret',
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the pump',
        },
      }),
      requestContext: {
        requestId: 'test-request-id',
        http: { sourceIp: '1.2.3.4' },
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify user-friendly error message was sent
    const telegramCall = global.fetch.mock.calls.find((call) =>
      call[0].includes('api.telegram.org')
    );
    expect(telegramCall).toBeDefined();
    const telegramBody = JSON.parse(telegramCall[1].body);
    expect(telegramBody.text).toContain('Customer is mandatory');

    // Verify audit log contains error details
    const auditCall = global.fetch.mock.calls.find((call) => call[0].includes('FLRTS Parser Log'));
    expect(auditCall).toBeDefined();
    const auditBody = JSON.parse(auditCall[1].body);
    expect(auditBody.status).toBe('failed');
  });

  it('should handle ERPNext 500 error with retry and eventual failure', async () => {
    // Mock ERPNext context fetch
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      // OpenAI parse
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                parsed: {
                  description: 'Fix pump',
                  assignee: null,
                  dueDate: null,
                  priority: 'Medium',
                  rationale: 'Test',
                  confidence: 0.8,
                },
              },
            },
          ],
        }),
      })
      // ERPNext create fails 3 times with 500
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      })
      // Telegram error message
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      // Audit log
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { name: 'LOG-00001' } }),
      });

    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'test-secret',
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the pump',
        },
      }),
      requestContext: {
        requestId: 'test-request-id',
        http: { sourceIp: '1.2.3.4' },
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify 3 retry attempts were made
    const erpnextCreateCalls = global.fetch.mock.calls.filter((call) =>
      call[0].includes('/api/resource/Maintenance Visit')
    );
    expect(erpnextCreateCalls).toHaveLength(3);

    // Verify error message sent to user
    const telegramCall = global.fetch.mock.calls.find((call) =>
      call[0].includes('api.telegram.org')
    );
    expect(telegramCall).toBeDefined();
  }, 15000); // Increase timeout for retries

  it('should reject invalid webhook secret', async () => {
    const event = {
      headers: {
        'x-telegram-bot-api-secret-token': 'wrong-secret',
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the pump',
        },
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error).toBe('Invalid webhook secret');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle missing environment variables gracefully', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const event = {
      headers: {},
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: { id: 123, username: 'testuser' },
          chat: { id: 123 },
          text: 'Fix the pump',
        },
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toBe('Internal server error');

    // Restore
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
  });
});
