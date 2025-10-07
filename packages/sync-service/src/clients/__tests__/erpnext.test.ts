/**
 * ERPNext Client Tests - Production Implementation (10N-255)
 *
 * Comprehensive test suite covering:
 * - CRUD operations (success paths)
 * - Error envelope handling (exception detection)
 * - Retry logic (network errors, HTTP 5xx)
 * - Secret masking (two-character reveal)
 * - X-Request-ID propagation
 *
 * **QA Adjustments Applied**:
 * - ImportError → ERPNextNotFoundError (404) expectation per QA recommendation #1
 * - Direct `maskSecret()` assertions (exported helper) per QA recommendation #2
 *
 * @see packages/sync-service/src/clients/erpnext.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ERPNextClient, createERPNextClientFromEnv, maskSecret } from '../erpnext';

// Mock fetch globally
global.fetch = vi.fn();

describe('ERPNextClient', () => {
  let client: ERPNextClient;
  const mockConfig = {
    baseUrl: 'https://test.example.com',
    apiKey: 'test_key_1234567890',
    apiSecret: 'test_secret_abcdefgh',
    timeout: 5000,
    maxRetries: 3,
    baseBackoff: 100,
    maxBackoff: 1000,
  };

  beforeEach(() => {
    client = new ERPNextClient(mockConfig);
    vi.clearAllMocks();
    // Suppress console logs during tests
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Success Path Tests
  // ==========================================================================

  describe('createMaintenanceVisit', () => {
    it('should create a Maintenance Visit successfully', async () => {
      const mockDoc = {
        customer: 'Internal Operations',
        maintenance_type: 'Unscheduled' as const,
        mntc_date: '2025-10-07T12:00:00',
        work_done: 'Test maintenance',
        item_code: 'Field Service',
        serial_no: 'FS-0001',
      };

      const mockResponse = {
        data: {
          name: 'MNTC-00001',
          ...mockDoc,
          creation: '2025-10-07T12:00:00',
          modified: '2025-10-07T12:00:00',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.createMaintenanceVisit(mockDoc);

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/resource/Maintenance Visit',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'token test_key_1234567890:test_secret_abcdefgh',
            'Content-Type': 'application/json',
            'X-Request-ID': expect.any(String),
          }),
          body: JSON.stringify(mockDoc),
        })
      );
    });
  });

  describe('getMaintenanceVisit', () => {
    it('should fetch a Maintenance Visit by name', async () => {
      const mockResponse = {
        data: {
          name: 'MNTC-00001',
          customer: 'Internal Operations',
          maintenance_type: 'Unscheduled',
          mntc_date: '2025-10-07T12:00:00',
          work_done: 'Test maintenance',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.getMaintenanceVisit('MNTC-00001');

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/resource/Maintenance Visit/MNTC-00001',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should URL-encode names with special characters', async () => {
      const mockResponse = { data: { name: 'MNTC-2025/001' } };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      await client.getMaintenanceVisit('MNTC-2025/001');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/resource/Maintenance Visit/MNTC-2025%2F001',
        expect.any(Object)
      );
    });
  });

  describe('updateMaintenanceVisit', () => {
    it('should update a Maintenance Visit', async () => {
      const updates = {
        completion_status: 'Fully Completed' as const,
        customer_feedback: 'Work completed',
        docstatus: 1 as const,
      };

      const mockResponse = {
        data: {
          name: 'MNTC-00001',
          customer: 'Internal Operations',
          maintenance_type: 'Unscheduled',
          mntc_date: '2025-10-07T12:00:00',
          ...updates,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.updateMaintenanceVisit('MNTC-00001', updates);

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/resource/Maintenance Visit/MNTC-00001',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });
  });

  describe('deleteMaintenanceVisit', () => {
    it('should delete a Maintenance Visit', async () => {
      const mockResponse = { data: { message: 'Deleted' } };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      await client.deleteMaintenanceVisit('MNTC-00001');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/api/resource/Maintenance Visit/MNTC-00001',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('listMaintenanceVisits', () => {
    it('should list all Maintenance Visits without filters', async () => {
      const mockResponse = {
        data: [
          { name: 'MNTC-00001', customer: 'Internal Operations' },
          { name: 'MNTC-00002', customer: 'Internal Operations' },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.listMaintenanceVisits();

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resource/Maintenance Visit?'),
        expect.any(Object)
      );
    });

    it('should apply filters and pagination', async () => {
      const mockResponse = { data: [{ name: 'MNTC-00001' }] };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      const filters = { customer: 'Internal Operations', docstatus: 0 };
      await client.listMaintenanceVisits(filters, ['name', 'customer'], 50, 10);

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain('filters=');
      expect(callUrl).toContain('fields=');
      expect(callUrl).toContain('limit_page_length=50');
      expect(callUrl).toContain('limit_start=10');
    });

    it('should handle empty result sets', async () => {
      const mockResponse = { data: [] };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.listMaintenanceVisits({ customer: 'Nonexistent' });

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Error Envelope Tests (HTTP 200 with exception)
  // ==========================================================================

  describe('Error Envelope Handling', () => {
    it('should detect AuthenticationError envelope', async () => {
      const mockErrorResponse = {
        exception: 'frappe.exceptions.AuthenticationError',
        exc_type: 'AuthenticationError',
        exc: 'Traceback...',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200, // ERPNext returns 200 even for errors!
        json: async () => mockErrorResponse,
      });

      await expect(client.getMaintenanceVisit('MNTC-00001')).rejects.toMatchObject({
        name: 'ERPNextAuthError',
        excType: 'AuthenticationError',
        statusCode: 401,
      });
    });

    it('should detect ValidationError envelope', async () => {
      const mockErrorResponse = {
        exception: 'Mandatory field missing: customer',
        exc_type: 'ValidationError',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockErrorResponse,
      });

      await expect(
        client.createMaintenanceVisit({
          maintenance_type: 'Unscheduled',
          mntc_date: '2025-10-07',
        } as any)
      ).rejects.toMatchObject({
        name: 'ERPNextValidationError',
        excType: 'ValidationError',
        statusCode: 400,
      });
    });

    it('should detect DoesNotExistError envelope', async () => {
      const mockErrorResponse = {
        exception: 'Maintenance Visit MNTC-99999 not found',
        exc_type: 'DoesNotExistError',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockErrorResponse,
      });

      await expect(client.getMaintenanceVisit('MNTC-99999')).rejects.toMatchObject({
        name: 'ERPNextNotFoundError',
        excType: 'DoesNotExistError',
        statusCode: 404,
      });
    });

    // QA Adjustment #1: ImportError → ERPNextNotFoundError (404)
    // Per QA recommendation: ImportError indicates DocType doesn't exist (e.g., ERPNext not installed)
    it('should detect ImportError envelope (ERPNext not installed) and map to 404', async () => {
      const mockErrorResponse = {
        exception: "Error: No module named 'frappe.core.doctype.maintenance_visit'",
        exc_type: 'ImportError',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockErrorResponse,
      });

      await expect(client.getMaintenanceVisit('MNTC-00001')).rejects.toMatchObject({
        name: 'ERPNextNotFoundError',
        excType: 'ImportError',
        statusCode: 404, // ImportError → 404 (DocType doesn't exist)
      });
    });

    it('should handle generic ERPNext errors', async () => {
      const mockErrorResponse = {
        exception: 'Something went wrong',
        exc_type: 'UnknownError',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockErrorResponse,
      });

      await expect(client.getMaintenanceVisit('MNTC-00001')).rejects.toMatchObject({
        name: 'ERPNextError',
        excType: 'UnknownError',
      });
    });
  });

  // ==========================================================================
  // Retry Logic Tests
  // ==========================================================================

  describe('Retry Logic', () => {
    beforeEach(() => {
      // Speed up tests by reducing backoff
      client = new ERPNextClient({
        ...mockConfig,
        maxRetries: 2,
        baseBackoff: 10,
        maxBackoff: 50,
      });
    });

    it('should retry on ECONNREFUSED', async () => {
      const mockError = new Error('Connection refused');
      (mockError as any).code = 'ECONNREFUSED';

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      const result = await client.getMaintenanceVisit('MNTC-00001');

      expect(result.name).toBe('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on ETIMEDOUT', async () => {
      const mockError = new Error('Request timeout');
      (mockError as any).code = 'ETIMEDOUT';

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      const result = await client.getMaintenanceVisit('MNTC-00001');

      expect(result.name).toBe('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on ECONNRESET', async () => {
      const mockError = new Error('Connection reset');
      (mockError as any).code = 'ECONNRESET';

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      await client.getMaintenanceVisit('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on ENOTFOUND', async () => {
      const mockError = new Error('DNS lookup failed');
      (mockError as any).code = 'ENOTFOUND';

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      await client.getMaintenanceVisit('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on HTTP 500 (Internal Server Error)', async () => {
      const mockError = new Error('Server error');
      (mockError as any).statusCode = 500;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      await client.getMaintenanceVisit('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on HTTP 502 (Bad Gateway)', async () => {
      const mockError = new Error('Bad gateway');
      (mockError as any).statusCode = 502;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      await client.getMaintenanceVisit('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on HTTP 503 (Service Unavailable)', async () => {
      const mockError = new Error('Service unavailable');
      (mockError as any).statusCode = 503;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      await client.getMaintenanceVisit('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on HTTP 504 (Gateway Timeout)', async () => {
      const mockError = new Error('Gateway timeout');
      (mockError as any).statusCode = 504;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      await client.getMaintenanceVisit('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on HTTP 429 (Rate Limit)', async () => {
      const mockError = new Error('Too many requests');
      (mockError as any).statusCode = 429;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ data: { name: 'MNTC-00001' } }),
        });

      await client.getMaintenanceVisit('MNTC-00001');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on HTTP 4xx (except 429)', async () => {
      const mockErrorResponse = {
        exception: 'Validation error',
        exc_type: 'ValidationError',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockErrorResponse,
      });

      await expect(client.getMaintenanceVisit('MNTC-00001')).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should exhaust retries and throw last error', async () => {
      const mockError = new Error('Connection refused');
      (mockError as any).code = 'ECONNREFUSED';

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      await expect(client.getMaintenanceVisit('MNTC-00001')).rejects.toThrow('Connection refused');
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should apply exponential backoff with jitter', async () => {
      const mockError = new Error('Timeout');
      (mockError as any).code = 'ETIMEDOUT';

      const startTime = Date.now();

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      await expect(client.getMaintenanceVisit('MNTC-00001')).rejects.toThrow();

      const elapsed = Date.now() - startTime;
      // Should have delays: ~10ms, ~20-30ms with jitter
      // Total minimum: ~30ms, allow up to 200ms for test execution overhead
      expect(elapsed).toBeGreaterThanOrEqual(20);
      expect(elapsed).toBeLessThan(500);
    });
  });

  // ==========================================================================
  // X-Request-ID Propagation Tests
  // ==========================================================================

  describe('X-Request-ID Propagation', () => {
    it('should generate X-Request-ID if not provided', async () => {
      const mockResponse = { data: { name: 'MNTC-00001' } };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      await client.getMaintenanceVisit('MNTC-00001');

      const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
      expect(headers['X-Request-ID']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should use provided X-Request-ID', async () => {
      const mockResponse = { data: { name: 'MNTC-00001' } };
      const customRequestId = 'custom-request-12345';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      await client.getMaintenanceVisit('MNTC-00001', customRequestId);

      const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
      expect(headers['X-Request-ID']).toBe(customRequestId);
    });

    it('should include requestId in error objects', async () => {
      const mockErrorResponse = {
        exception: 'Not found',
        exc_type: 'DoesNotExistError',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockErrorResponse,
      });

      try {
        await client.getMaintenanceVisit('MNTC-00001', 'test-request-123');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.requestId).toBe('test-request-123');
      }
    });
  });

  // ==========================================================================
  // Secret Masking Tests
  // ==========================================================================

  describe('Secret Masking', () => {
    // QA Adjustment #2: Assert maskSecret() directly (exported helper)
    // Console spies unreliable due to NODE_ENV=test suppression
    it('should mask secrets with two-character reveal', () => {
      const testCases = [
        { input: 'dbf4bb1b556e3d2', expected: 'db***********d2' }, // 15 chars → 11 asterisks
        { input: 'f6097d1b5069034', expected: 'f6***********34' }, // 15 chars → 11 asterisks
        { input: 'short', expected: '****' }, // Too short
        { input: 'abcdef', expected: 'ab**ef' }, // Minimum length (6 chars → 2 asterisks)
      ];

      testCases.forEach(({ input, expected }) => {
        expect(maskSecret(input)).toBe(expected);
      });
    });

    it('should handle edge cases in secret masking', () => {
      expect(maskSecret('')).toBe('****');
      expect(maskSecret('a')).toBe('****');
      expect(maskSecret('ab')).toBe('****');
      expect(maskSecret('abc')).toBe('****');
      expect(maskSecret('abcd')).toBe('****');
      expect(maskSecret('abcde')).toBe('****');
      expect(maskSecret('abcdef')).toBe('ab**ef'); // First valid case (6 chars)
    });

    it('should NEVER log full Authorization header', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      const mockResponse = { data: { name: 'MNTC-00001' } };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      });

      await client.getMaintenanceVisit('MNTC-00001');

      // Check all console.debug calls for leaked secrets
      const allLogs = consoleSpy.mock.calls.map((call) => JSON.stringify(call));
      expect(allLogs.join('')).not.toContain('test_key_1234567890:test_secret_abcdefgh');

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Environment Factory Tests
  // ==========================================================================

  describe('createERPNextClientFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from ERPNEXT_API_URL env vars', () => {
      process.env.ERPNEXT_API_URL = 'https://ops.10nz.tools';
      process.env.ERPNEXT_ADMIN_API_KEY = 'dbf4bb1b556e3d2';
      process.env.ERPNEXT_ADMIN_API_SECRET = 'f6097d1b5069034';

      const client = createERPNextClientFromEnv();
      expect(client).toBeInstanceOf(ERPNextClient);
    });

    it('should create client from ERPNEXT_URL fallback', () => {
      process.env.ERPNEXT_URL = 'https://ops.10nz.tools';
      process.env.ERPNEXT_API_KEY = 'dbf4bb1b556e3d2';
      process.env.ERPNEXT_API_SECRET = 'f6097d1b5069034';

      const client = createERPNextClientFromEnv();
      expect(client).toBeInstanceOf(ERPNextClient);
    });

    it('should throw if ERPNEXT_URL is missing', () => {
      process.env.ERPNEXT_ADMIN_API_KEY = 'test_key';
      process.env.ERPNEXT_ADMIN_API_SECRET = 'test_secret';
      delete process.env.ERPNEXT_URL;
      delete process.env.ERPNEXT_API_URL;

      expect(() => createERPNextClientFromEnv()).toThrow(
        'Missing required env var: ERPNEXT_URL or ERPNEXT_API_URL'
      );
    });

    it('should throw if API key is missing', () => {
      process.env.ERPNEXT_URL = 'https://test.example.com';
      process.env.ERPNEXT_ADMIN_API_SECRET = 'test_secret';
      delete process.env.ERPNEXT_API_KEY;
      delete process.env.ERPNEXT_ADMIN_API_KEY;

      expect(() => createERPNextClientFromEnv()).toThrow(
        'Missing required env var: ERPNEXT_API_KEY or ERPNEXT_ADMIN_API_KEY'
      );
    });

    it('should throw if API secret is missing', () => {
      process.env.ERPNEXT_URL = 'https://test.example.com';
      process.env.ERPNEXT_ADMIN_API_KEY = 'test_key';
      delete process.env.ERPNEXT_API_SECRET;
      delete process.env.ERPNEXT_ADMIN_API_SECRET;

      expect(() => createERPNextClientFromEnv()).toThrow(
        'Missing required env var: ERPNEXT_API_SECRET or ERPNEXT_ADMIN_API_SECRET'
      );
    });

    it('should apply optional config from env vars', () => {
      process.env.ERPNEXT_URL = 'https://test.example.com';
      process.env.ERPNEXT_ADMIN_API_KEY = 'test_key';
      process.env.ERPNEXT_ADMIN_API_SECRET = 'test_secret';
      process.env.ERPNEXT_TIMEOUT = '60000';
      process.env.ERPNEXT_MAX_RETRIES = '10';
      process.env.ERPNEXT_BASE_BACKOFF = '2000';
      process.env.ERPNEXT_MAX_BACKOFF = '64000';

      const client = createERPNextClientFromEnv();
      expect(client).toBeInstanceOf(ERPNextClient);
      // Can't directly test private config, but factory should not throw
    });
  });

  // ==========================================================================
  // Integration Smoke Test (Mocked)
  // ==========================================================================

  describe('Integration Smoke Test (Mocked)', () => {
    it('should complete full CRUD workflow', async () => {
      // 1. Create
      const createResponse = {
        data: {
          name: 'MNTC-00001',
          customer: 'Internal Operations',
          maintenance_type: 'Unscheduled',
          mntc_date: '2025-10-07T12:00:00',
          work_done: 'Test maintenance',
          item_code: 'Field Service',
          serial_no: 'FS-0001',
          docstatus: 0,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => createResponse,
      });

      const created = await client.createMaintenanceVisit({
        customer: 'Internal Operations',
        maintenance_type: 'Unscheduled',
        mntc_date: '2025-10-07T12:00:00',
        work_done: 'Test maintenance',
        item_code: 'Field Service',
        serial_no: 'FS-0001',
      });

      expect(created.name).toBe('MNTC-00001');

      // 2. Read
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => createResponse,
      });

      const fetched = await client.getMaintenanceVisit('MNTC-00001');
      expect(fetched.name).toBe('MNTC-00001');

      // 3. Update
      const updateResponse = {
        data: {
          ...createResponse.data,
          completion_status: 'Fully Completed',
          docstatus: 1,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => updateResponse,
      });

      const updated = await client.updateMaintenanceVisit('MNTC-00001', {
        completion_status: 'Fully Completed',
        docstatus: 1,
      });

      expect(updated.completion_status).toBe('Fully Completed');

      // 4. List
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: [updateResponse.data] }),
      });

      const list = await client.listMaintenanceVisits({ customer: 'Internal Operations' });
      expect(list).toHaveLength(1);

      // 5. Delete
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { message: 'Deleted' } }),
      });

      await client.deleteMaintenanceVisit('MNTC-00001');

      expect(global.fetch).toHaveBeenCalledTimes(5);
    });
  });
});
