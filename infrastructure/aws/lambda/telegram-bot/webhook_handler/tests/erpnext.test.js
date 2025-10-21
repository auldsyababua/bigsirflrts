import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getContext, createMaintenanceVisit, logParserAudit } from '../lib/erpnext.mjs';

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

// Mock logging
vi.mock('../lib/logging.mjs', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

describe('ERPNext Client', () => {
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    process.env.ERPNEXT_API_KEY = 'test-key';
    process.env.ERPNEXT_API_SECRET = 'test-secret';
    process.env.ERPNEXT_BASE_URL = 'https://test.erpnext.com';

    // Reset module cache to clear contextCache between tests
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getContext', () => {
    it('should fetch users and sites on cache miss', async () => {
      const mockUsersResponse = {
        data: [
          {
            name: 'user1@10nz.tools',
            email: 'user1@10nz.tools',
            full_name: 'User One',
            time_zone: 'UTC',
            enabled: 1,
          },
          {
            name: 'user2@10nz.tools',
            email: 'user2@10nz.tools',
            full_name: 'User Two',
            time_zone: 'America/New_York',
            enabled: 1,
          },
        ],
      };

      const mockSitesResponse = {
        data: [
          { name: 'site-1', location_name: 'Site One' },
          { name: 'site-2', location_name: 'Site Two' },
        ],
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockUsersResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSitesResponse,
        });

      const { getContext } = await import('../lib/erpnext.mjs');
      const context = await getContext();

      expect(context.users).toHaveLength(2);
      expect(context.users[0].email).toBe('user1@10nz.tools');
      expect(context.sites).toHaveLength(2);
      expect(context.sites[0].name).toBe('site-1');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return cached data on cache hit', async () => {
      const mockUsersResponse = {
        data: [
          {
            name: 'user1@10nz.tools',
            email: 'user1@10nz.tools',
            full_name: 'User One',
            time_zone: 'UTC',
            enabled: 1,
          },
        ],
      };

      const mockSitesResponse = {
        data: [{ name: 'site-1', location_name: 'Site One' }],
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockUsersResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSitesResponse,
        });

      const { getContext } = await import('../lib/erpnext.mjs');

      // First call - cache miss
      const context1 = await getContext();
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Second call - cache hit
      const context2 = await getContext();
      expect(global.fetch).toHaveBeenCalledTimes(2); // No additional calls
      expect(context2.users).toEqual(context1.users);
      expect(context2.sites).toEqual(context1.sites);
    });

    it('should return fallback data on fetch error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const { getContext } = await import('../lib/erpnext.mjs');
      const context = await getContext();

      expect(context.users).toHaveLength(4); // FALLBACK_USERS length
      expect(context.users[0].email).toBe('joel@10nz.tools');
      expect(context.sites).toHaveLength(4); // FALLBACK_SITES length
      expect(context.sites).toContain('Big Sky');
    });

    it('should handle 401 auth error with fallback', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      const { getContext } = await import('../lib/erpnext.mjs');
      const context = await getContext();

      expect(context.users).toHaveLength(4); // FALLBACK_USERS
      expect(context.sites).toContain('Big Sky');
    });
  });

  describe('createMaintenanceVisit', () => {
    it('should create maintenance visit successfully', async () => {
      const mockResponse = {
        data: {
          name: 'MNTC-00001',
          mntc_work_details: 'Fix pump',
          custom_assigned_to: 'user@10nz.tools',
        },
      };

      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const { createMaintenanceVisit } = await import('../lib/erpnext.mjs');

      const taskData = {
        description: 'Fix pump',
        assignee: 'user@10nz.tools',
        dueDate: '2024-10-20T14:00:00Z',
        priority: 'High',
        rationale: 'Urgent repair needed',
        confidence: 0.9,
      };

      const result = await createMaintenanceVisit(taskData, '12345');

      expect(result.name).toBe('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.mntc_work_details).toBe('Fix pump');
      expect(requestBody.custom_assigned_to).toBe('user@10nz.tools');
      expect(requestBody.custom_telegram_message_id).toBe('12345');
    });

    it('should retry on 500 error and eventually succeed', async () => {
      const mockErrorResponse = {
        message: 'Internal server error',
      };

      const mockSuccessResponse = {
        data: {
          name: 'MNTC-00001',
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => mockErrorResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => mockErrorResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
        });

      const { createMaintenanceVisit } = await import('../lib/erpnext.mjs');

      const taskData = {
        description: 'Test task',
        assignee: null,
        dueDate: null,
        priority: 'Medium',
        rationale: 'Test',
        confidence: 0.8,
      };

      const result = await createMaintenanceVisit(taskData, '12345');

      expect(result.name).toBe('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    }, 10000); // Increase timeout for retry delays

    it('should throw structured error on 417 validation error', async () => {
      const mockErrorResponse = {
        _server_messages: JSON.stringify([
          {
            message: 'Customer is mandatory',
          },
        ]),
        message: 'Validation failed',
      };

      global.fetch.mockResolvedValue({
        ok: false,
        status: 417,
        json: async () => mockErrorResponse,
      });

      const { createMaintenanceVisit } = await import('../lib/erpnext.mjs');

      const taskData = {
        description: 'Test task',
        assignee: null,
        dueDate: null,
        priority: 'Medium',
        rationale: 'Test',
        confidence: 0.8,
      };

      await expect(createMaintenanceVisit(taskData, '12345')).rejects.toThrow(
        'ERPNext API error 417'
      );

      try {
        await createMaintenanceVisit(taskData, '12345');
      } catch (error) {
        expect(error.status).toBe(417);
        expect(error._server_messages).toBeDefined();
      }
    });

    it('should handle timeout by aborting request', async () => {
      global.fetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ data: {} }),
            });
          }, 15000); // Longer than 10s timeout
        });
      });

      const { createMaintenanceVisit } = await import('../lib/erpnext.mjs');

      const taskData = {
        description: 'Test task',
        assignee: null,
        dueDate: null,
        priority: 'Medium',
        rationale: 'Test',
        confidence: 0.8,
      };

      await expect(createMaintenanceVisit(taskData, '12345')).rejects.toThrow();
    }, 15000);

    it('should throw on missing credentials', async () => {
      delete process.env.ERPNEXT_API_KEY;

      const { createMaintenanceVisit } = await import('../lib/erpnext.mjs');

      const taskData = {
        description: 'Test task',
        assignee: null,
        dueDate: null,
        priority: 'Medium',
        rationale: 'Test',
        confidence: 0.8,
      };

      await expect(createMaintenanceVisit(taskData, '12345')).rejects.toThrow(
        'ERPNext API credentials not configured'
      );

      // Restore for other tests
      process.env.ERPNEXT_API_KEY = 'test-key';
    });
  });

  describe('logParserAudit', () => {
    it('should log audit trail successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { name: 'LOG-00001' } }),
      });

      const { logParserAudit } = await import('../lib/erpnext.mjs');

      const logData = {
        telegram_message_id: '12345',
        user_id: '67890',
        original_text: 'Fix the pump',
        parsed_data: { description: 'Fix the pump', priority: 'High' },
        confidence: 0.9,
        status: 'success',
      };

      await logParserAudit(logData);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.telegram_message_id).toBe('12345');
      expect(requestBody.status).toBe('success');
      expect(requestBody.doctype).toBe('FLRTS Parser Log');
    });

    it('should handle audit log failure gracefully (fire-and-forget)', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const { logParserAudit } = await import('../lib/erpnext.mjs');

      const logData = {
        telegram_message_id: '12345',
        user_id: '67890',
        original_text: 'Fix the pump',
        parsed_data: { description: 'Fix the pump' },
        confidence: 0.9,
        status: 'success',
      };

      // Should not throw
      await expect(logParserAudit(logData)).resolves.toBeUndefined();
    });

    it('should log error audit with error_message', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { name: 'LOG-00001' } }),
      });

      const { logParserAudit } = await import('../lib/erpnext.mjs');

      const logData = {
        telegram_message_id: '12345',
        user_id: '67890',
        original_text: 'Fix the pump',
        parsed_data: null,
        confidence: 0,
        status: 'failed',
        error_message: 'OpenAI timeout',
      };

      await logParserAudit(logData);

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.status).toBe('failed');
      expect(requestBody.error_message).toBe('OpenAI timeout');
    });
  });
});
