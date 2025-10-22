import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetContextCache } from '../lib/erpnext.mjs';
import { handler } from '../index.mjs';

// Create a shared mock for OpenAI create method
const mockOpenAICreate = vi.fn();

// Mock OpenAI SDK before any imports
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      constructor() {
        this.chat = {
          completions: {
            create: mockOpenAICreate,
          },
        };
      }
    },
  };
});

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

describe('End-to-End Complete Flow Tests', () => {
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAICreate.mockReset();
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    process.env.NODE_ENV = 'test';
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ERPNEXT_API_KEY = 'test-erpnext-key';
    process.env.ERPNEXT_API_SECRET = 'test-erpnext-secret';
    process.env.ERPNEXT_BASE_URL = 'https://test.erpnext.com';

    // Reset context cache between tests using exported function
    resetContextCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  // Mock Helpers
  const mockSuccessfulERPNextContext = () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              name: 'joel@10nz.tools',
              email: 'joel@10nz.tools',
              full_name: 'Joel',
              time_zone: 'America/New_York',
              enabled: 1,
            },
            {
              name: 'bryan@10nz.tools',
              email: 'bryan@10nz.tools',
              full_name: 'Bryan',
              time_zone: 'America/Denver',
              enabled: 1,
            },
            {
              name: 'taylor@10nz.tools',
              email: 'taylor@10nz.tools',
              full_name: 'Taylor',
              time_zone: 'America/Los_Angeles',
              enabled: 1,
            },
            {
              name: 'colin@10nz.tools',
              email: 'colin@10nz.tools',
              full_name: 'Colin',
              time_zone: 'America/New_York',
              enabled: 1,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { name: 'big_sky', location_name: 'Big Sky' },
            { name: 'viper', location_name: 'Viper' },
            { name: 'crystal_peak', location_name: 'Crystal Peak' },
            { name: 'thunder_ridge', location_name: 'Thunder Ridge' },
          ],
        }),
      });
  };

  const mockOpenAIParse = (taskData) => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: taskData, // Use 'parsed' field for Structured Outputs API
          },
        },
      ],
    });
  };

  const mockMaintenanceVisitCreated = (name) => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { name },
      }),
    });
  };

  const mockAuditLogSuccess = () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { name: 'LOG-00001' },
      }),
    });
  };

  const mockTelegramSendMessage = () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
  };

  const mockTelegramWebhook = (text, userId = 123, chatId = 123, messageId = 1) => ({
    headers: {
      'x-telegram-bot-api-secret-token': 'test-secret',
    },
    body: JSON.stringify({
      message: {
        message_id: messageId,
        from: { id: userId, username: 'testuser', first_name: 'Test' },
        chat: { id: chatId },
        text,
      },
    }),
    requestContext: {
      requestId: 'test-request-id',
      http: { sourceIp: '1.2.3.4' },
    },
  });

  // Assertion Helpers
  const expectTaskCreatedInERPNext = (expectedFields) => {
    const maintenanceVisitCall = global.fetch.mock.calls.find((call) =>
      call[0].includes('/api/resource/Maintenance Visit')
    );
    expect(maintenanceVisitCall).toBeDefined();
    const body = JSON.parse(maintenanceVisitCall[1].body);
    Object.entries(expectedFields).forEach(([key, value]) => {
      expect(body[key]).toBe(value);
    });
  };

  const expectTelegramMessageSent = (chatId, expectedText) => {
    const telegramCall = global.fetch.mock.calls.find((call) =>
      call[0].includes('api.telegram.org')
    );
    expect(telegramCall).toBeDefined();
    const body = JSON.parse(telegramCall[1].body);
    expect(body.chat_id).toBe(chatId);
    expect(body.text).toContain(expectedText);
  };

  const expectAuditLogged = (status) => {
    const auditCall = global.fetch.mock.calls.find((call) => call[0].includes('FLRTS Parser Log'));
    expect(auditCall).toBeDefined();
    const body = JSON.parse(auditCall[1].body);
    expect(body.status).toBe(status);
  };

  describe('Suite 1: Happy Path - Complete Flow', () => {
    it('should create task from simple Telegram message', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Check pump at Big Sky',
        assignee: 'Colin',
        dueDate: null,
        priority: 'Medium',
        rationale: 'User requested pump check',
        confidence: 0.85,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Colin check pump at Big Sky');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.taskId).toBe('MV-2024-001');

      // Verify required API calls were made (not checking exact count)
      expect(global.fetch.mock.calls.some((call) => call[0].includes('/api/resource/User'))).toBe(
        true
      );
      expect(
        global.fetch.mock.calls.some((call) => call[0].includes('/api/resource/Location'))
      ).toBe(true);
      // Verify OpenAI SDK mock was called (not global.fetch since SDK is mocked)
      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(
        global.fetch.mock.calls.some((call) => call[0].includes('/api/resource/Maintenance Visit'))
      ).toBe(true);
      expect(global.fetch.mock.calls.some((call) => call[0].includes('FLRTS Parser Log'))).toBe(
        true
      );
      expect(global.fetch.mock.calls.some((call) => call[0].includes('api.telegram.org'))).toBe(
        true
      );

      expectTaskCreatedInERPNext({
        mntc_work_details: 'Check pump at Big Sky',
        custom_assigned_to: 'colin@10nz.tools',
        custom_flrts_priority: 'Medium',
      });

      expectAuditLogged('success');
      expectTelegramMessageSent(123, 'Task Created Successfully');
    });

    it('should handle assignee name mapping to email', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Fix the server',
        assignee: 'Taylor',
        dueDate: null,
        priority: 'High',
        rationale: 'Server issue',
        confidence: 0.9,
      });
      mockMaintenanceVisitCreated('MV-2024-002');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Taylor needs to fix the server');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);

      expectTaskCreatedInERPNext({
        custom_assigned_to: 'taylor@10nz.tools',
      });
    });

    it('should handle task with due date and priority', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Check compressor',
        assignee: 'Colin',
        dueDate: '2024-10-21T14:00:00Z',
        priority: 'Urgent',
        rationale: 'Urgent compressor check',
        confidence: 0.95,
      });
      mockMaintenanceVisitCreated('MV-2024-003');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('URGENT: Colin check compressor by tomorrow 2pm');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);

      // Handler converts ISO dates to local timezone (not UTC)
      // 2024-10-21T14:00:00Z UTC -> local time (e.g., 07:00:00 in PDT which is UTC-7)
      const expectedDate = new Date('2024-10-21T14:00:00Z');
      const expectedDateStr = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')} ${String(expectedDate.getHours()).padStart(2, '0')}:${String(expectedDate.getMinutes()).padStart(2, '0')}:${String(expectedDate.getSeconds()).padStart(2, '0')}`;

      expectTaskCreatedInERPNext({
        mntc_date: expectedDateStr,
        custom_flrts_priority: 'Urgent',
      });

      expectTelegramMessageSent(123, '🔴 *Priority:* Urgent');
    });
  });

  describe('Suite 2: Context Caching Behavior', () => {
    it('should cache ERPNext context for 5 minutes', async () => {
      // First invocation
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'First task',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event1 = mockTelegramWebhook('First task', 123, 123, 1);
      await handler(event1);

      // Verify first call fetched context
      const initialUserCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/User')
      ).length;
      const initialLocationCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/Location')
      ).length;
      expect(initialUserCalls).toBe(1);
      expect(initialLocationCalls).toBe(1);

      const fetchCountAfterFirst = global.fetch.mock.calls.length;

      // Second invocation (within 5 minutes) - should use cache
      mockOpenAIParse({
        description: 'Second task',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-002');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event2 = mockTelegramWebhook('Second task', 123, 123, 2);
      await handler(event2);

      // Should NOT have called User/Location APIs again (cache hit)
      const finalUserCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/User')
      ).length;
      const finalLocationCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/Location')
      ).length;
      expect(finalUserCalls).toBe(1); // Still only 1 call from first invocation
      expect(finalLocationCalls).toBe(1); // Still only 1 call from first invocation
    });

    it('should refresh cache after TTL expires', async () => {
      vi.useFakeTimers();

      // First invocation at T=0
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'First task',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event1 = mockTelegramWebhook('First task', 123, 123, 1);
      await handler(event1);

      // Verify first call fetched context
      const initialUserCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/User')
      ).length;
      const initialLocationCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/Location')
      ).length;
      expect(initialUserCalls).toBe(1);
      expect(initialLocationCalls).toBe(1);

      // Advance time by 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second invocation at T=6 minutes
      mockSuccessfulERPNextContext(); // Should fetch again
      mockOpenAIParse({
        description: 'Second task',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-002');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event2 = mockTelegramWebhook('Second task', 123, 123, 2);
      await handler(event2);

      // Should have fetched context again (cache expired)
      const finalUserCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/User')
      ).length;
      const finalLocationCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/Location')
      ).length;
      expect(finalUserCalls).toBe(2); // Called twice - initial + after TTL
      expect(finalLocationCalls).toBe(2); // Called twice - initial + after TTL
    });
  });

  describe('Suite 3: Error Handling - ERPNext Context Fetch', () => {
    it('should use fallback data when ERPNext context fetch fails', async () => {
      // Mock context fetch failures (ERPNext retries 3 times for 500 errors)
      // Users fetch - 3 failures
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        })
        // Sites fetch - 3 failures
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        });

      mockOpenAIParse({
        description: 'Task with fallback context',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task with fallback context');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expectTaskCreatedInERPNext({
        mntc_work_details: 'Task with fallback context',
      });
    });

    it('should handle ERPNext 401 auth error gracefully', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
        });

      mockOpenAIParse({
        description: 'Task with auth error',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task with auth error');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Suite 4: Error Handling - OpenAI Parsing', () => {
    it('should handle OpenAI timeout and send error to user', async () => {
      mockSuccessfulERPNextContext();
      // Mock OpenAI SDK to reject with error (3 attempts total with maxRetries=2)
      mockOpenAICreate
        .mockRejectedValueOnce(new Error('OpenAI timeout'))
        .mockRejectedValueOnce(new Error('OpenAI timeout'))
        .mockRejectedValueOnce(new Error('OpenAI timeout'));
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Test message');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expectAuditLogged('failed');
      expectTelegramMessageSent(123, 'trouble understanding');
    });

    it('should retry OpenAI on 429 rate limit', async () => {
      mockSuccessfulERPNextContext();

      // First call returns 429 error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      rateLimitError.response = { headers: { 'retry-after': '1' } };
      mockOpenAICreate.mockRejectedValueOnce(rateLimitError);

      // Second call succeeds
      mockOpenAIParse({
        description: 'Task after retry',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });

      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task after retry');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      // Should have called OpenAI SDK mock twice (initial 429 + retry success)
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
    });

    it('should handle low confidence parse (< 0.5)', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Low confidence task',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.3,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Low confidence task');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expectTaskCreatedInERPNext({
        custom_flagged_for_review: true,
      });
      expectTelegramMessageSent(123, 'flagged for review (confidence: 30%)');
    });
  });

  describe('Suite 5: Error Handling - ERPNext Task Creation', () => {
    it('should handle ERPNext 417 validation error', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Task with validation error',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });

      // 417 errors are retried as "network errors" (3 attempts total)
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 417,
          json: async () => ({
            _server_messages: JSON.stringify([{ message: 'Customer is mandatory' }]),
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 417,
          json: async () => ({
            _server_messages: JSON.stringify([{ message: 'Customer is mandatory' }]),
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 417,
          json: async () => ({
            _server_messages: JSON.stringify([{ message: 'Customer is mandatory' }]),
          }),
        });

      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task with validation error');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expectAuditLogged('failed');
      expectTelegramMessageSent(123, 'Customer is mandatory');
    });

    it('should retry ERPNext 500 error and succeed on second attempt', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Task with retry',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });

      // First call fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      // Second call succeeds
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task with retry');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);

      // Should have retried (at least 2 attempts)
      const maintenanceCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/Maintenance Visit')
      );
      expect(maintenanceCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail after 3 retry attempts on persistent 500 error', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Task with persistent error',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });

      // All calls fail
      for (let i = 0; i < 3; i++) {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        });
      }

      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task with persistent error');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);

      // Should have attempted all 3 retries
      const maintenanceCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/api/resource/Maintenance Visit')
      );
      expect(maintenanceCalls.length).toBeGreaterThanOrEqual(3);
      expectTelegramMessageSent(123, 'Failed to create task in ERPNext');
    });
  });

  describe('Suite 6: Error Handling - Invalid Input', () => {
    it('should handle invalid assignee name (not in team)', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Task with invalid assignee',
        assignee: 'John',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task with invalid assignee');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expectTelegramMessageSent(123, "User 'John' not found");
    });

    it('should handle empty message text', async () => {
      const event = {
        headers: {
          'x-telegram-bot-api-secret-token': 'test-secret',
        },
        body: JSON.stringify({
          message: {
            message_id: 1,
            from: { id: 123, username: 'testuser' },
            chat: { id: 123 },
            // No text field
          },
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).message).toBe('Update type not supported');
    });

    it('should handle very long description (>5000 chars)', async () => {
      mockSuccessfulERPNextContext();
      const longDescription = 'A'.repeat(6001);
      mockOpenAIParse({
        description: longDescription,
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Very long message');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expectTelegramMessageSent(123, 'Description exceeds maximum length');
    });
  });

  describe('Suite 7: Audit Logging (Fire-and-Forget)', () => {
    it('should log successful parse to ERPNext', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Successful task',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.9,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Successful task');

      await handler(event);

      expectAuditLogged('success');
      const auditCall = global.fetch.mock.calls.find((call) =>
        call[0].includes('FLRTS Parser Log')
      );
      const body = JSON.parse(auditCall[1].body);
      expect(body.telegram_message_id).toBe('1');
      // parsed_data is stringified JSON, parse it to access fields
      const parsedData = JSON.parse(body.parsed_data);
      expect(parsedData.confidence).toBe(0.9);
    });

    it('should log failed parse to ERPNext', async () => {
      mockSuccessfulERPNextContext();
      // Mock OpenAI SDK to reject with error (3 attempts total with maxRetries=2)
      mockOpenAICreate
        .mockRejectedValueOnce(new Error('OpenAI failed'))
        .mockRejectedValueOnce(new Error('OpenAI failed'))
        .mockRejectedValueOnce(new Error('OpenAI failed'));
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Failed parse');

      await handler(event);

      expectAuditLogged('failed');
      const auditCall = global.fetch.mock.calls.find((call) =>
        call[0].includes('FLRTS Parser Log')
      );
      const body = JSON.parse(auditCall[1].body);
      // parsed_data is stringified JSON, for null it becomes "null" string
      expect(body.parsed_data).toBe('null');
      expect(body.error_message).toContain('OpenAI failed');
    });

    it('should NOT fail handler when audit logging fails', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Task with audit failure',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-001');

      // Audit log fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Audit log failed' }),
      });

      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Task with audit failure');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).taskId).toBe('MV-2024-001');
    });
  });

  describe('Suite 8: Webhook Validation', () => {
    it('should reject webhook with invalid secret token', async () => {
      const event = {
        headers: {
          'x-telegram-bot-api-secret-token': 'wrong-secret',
        },
        body: JSON.stringify({
          message: { text: 'test' },
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error).toBe('Invalid webhook secret');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should accept webhook with correct secret token', async () => {
      mockSuccessfulERPNextContext();
      mockOpenAIParse({
        description: 'Valid webhook',
        assignee: 'Colin',
        priority: 'Medium',
        confidence: 0.8,
      });
      mockMaintenanceVisitCreated('MV-2024-001');
      mockAuditLogSuccess();
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('Valid webhook');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });

    it('should ignore bot commands (starts with /)', async () => {
      mockTelegramSendMessage();

      const event = mockTelegramWebhook('/start');

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expectTelegramMessageSent(123, 'Commands are not yet implemented');
    });
  });
});
