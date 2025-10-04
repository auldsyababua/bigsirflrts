/**
 * ERPNext client tests
 * Phase 1 (10N-243): Stub behavior
 * Phase 2 (10N-246): Live HTTP with mocked axios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import {
  ERPNextClient,
  ERPNextError,
  type MaintenanceVisit,
} from '../../packages/sync-service/src/clients/erpnext';
import type { BackendConfig } from '../../packages/sync-service/src/config';

// Mock axios module
vi.mock('axios');

describe('ERPNextClient (Phase 1 Stub)', () => {
  describe('Constructor', () => {
    it('@P0 should throw if backend not erpnext', () => {
      const config: BackendConfig = {
        backend: 'openproject',
        apiUrl: 'http://localhost:8080',
        apiKey: 'test-key',
        projectId: 123,
      };

      expect(() => new ERPNextClient(config)).toThrow(/requires backend=erpnext/);
    });

    it('@P0 should construct with incomplete credentials (stub mode)', () => {
      const config: BackendConfig = {
        backend: 'erpnext',
        apiUrl: '',
        apiKey: '',
        // Missing apiSecret
      };

      const client = new ERPNextClient(config);
      expect(client).toBeDefined();
    });

    it('@P0 should construct with complete credentials', () => {
      const config: BackendConfig = {
        backend: 'erpnext',
        apiUrl: 'https://ops.10nz.tools',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      };

      const client = new ERPNextClient(config);
      expect(client).toBeDefined();
    });
  });

  describe('Stub operations (credentials missing)', () => {
    let client: ERPNextClient;

    beforeEach(() => {
      const config: BackendConfig = {
        backend: 'erpnext',
        apiUrl: '',
        apiKey: '',
        // Stub mode: credentials missing
      };
      client = new ERPNextClient(config);
    });

    it('@P0 createWorkOrder throws not configured error', async () => {
      await expect(client.createWorkOrder({ subject: 'Test' })).rejects.toThrow(
        /credentials not configured/
      );
    });

    it('@P0 updateWorkOrder throws not configured error', async () => {
      await expect(client.updateWorkOrder('WO-001', { subject: 'Updated' })).rejects.toThrow(
        /credentials not configured/
      );
    });

    it('@P0 deleteWorkOrder throws not configured error', async () => {
      await expect(client.deleteWorkOrder('WO-001')).rejects.toThrow(/credentials not configured/);
    });

    it('@P0 getWorkOrder throws not configured error', async () => {
      await expect(client.getWorkOrder('WO-001')).rejects.toThrow(/credentials not configured/);
    });

    it('@P0 getWorkOrders throws not configured error', async () => {
      await expect(client.getWorkOrders()).rejects.toThrow(/credentials not configured/);
    });

    it('@P0 getStatuses returns hardcoded values (no credentials needed)', async () => {
      const statuses = await client.getStatuses();
      expect(statuses).toEqual(['Draft', 'Open', 'In Progress', 'Completed', 'Cancelled']);
    });

    it('@P0 healthCheck returns false when not configured', async () => {
      const healthy = await client.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe('Stub operations (credentials present)', () => {
    let client: ERPNextClient;

    beforeEach(() => {
      const config: BackendConfig = {
        backend: 'erpnext',
        apiUrl: 'https://ops.10nz.tools',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      };
      client = new ERPNextClient(config);
    });

    it('@P0 createWorkOrder throws Phase 2 pending error', async () => {
      await expect(client.createWorkOrder({ subject: 'Test' })).rejects.toThrow(
        /Phase 2 implementation pending/
      );
    });

    it('@P0 updateWorkOrder throws Phase 2 pending error', async () => {
      await expect(client.updateWorkOrder('WO-001', { subject: 'Updated' })).rejects.toThrow(
        /Phase 2 implementation pending/
      );
    });

    it('@P0 deleteWorkOrder throws Phase 2 pending error', async () => {
      await expect(client.deleteWorkOrder('WO-001')).rejects.toThrow(
        /Phase 2 implementation pending/
      );
    });

    it('@P0 getWorkOrder throws Phase 2 pending error', async () => {
      await expect(client.getWorkOrder('WO-001')).rejects.toThrow(/Phase 2 implementation pending/);
    });

    it('@P0 getWorkOrders throws Phase 2 pending error', async () => {
      await expect(client.getWorkOrders()).rejects.toThrow(/Phase 2 implementation pending/);
    });

    it('@P0 getStatuses returns hardcoded values', async () => {
      const statuses = await client.getStatuses();
      expect(statuses).toEqual(['Draft', 'Open', 'In Progress', 'Completed', 'Cancelled']);
    });

    it('@P0 healthCheck returns true when configured', async () => {
      const healthy = await client.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Error messages', () => {
    it('@P0 should include documentation link in not configured errors', async () => {
      const config: BackendConfig = {
        backend: 'erpnext',
        apiUrl: '',
        apiKey: '',
      };
      const client = new ERPNextClient(config);

      await expect(client.createWorkOrder({ subject: 'Test' })).rejects.toThrow(
        /02-api-patterns-confirmed\.md/
      );
    });

    it('@P0 should mention ops.10nz.tools in error messages', async () => {
      const config: BackendConfig = {
        backend: 'erpnext',
        apiUrl: '',
        apiKey: '',
      };
      const client = new ERPNextClient(config);

      await expect(client.createWorkOrder({ subject: 'Test' })).rejects.toThrow(/ops\.10nz\.tools/);
    });
  });
});

// ============================================================================
// Phase 2 Tests: Live HTTP with Mocked Axios (10N-246)
// ============================================================================

describe('ERPNextClient (Phase 2 Live HTTP)', () => {
  let mockAxiosInstance: any;
  let config: BackendConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    // Mock axios.create to return our instance
    (axios.create as any) = vi.fn().mockReturnValue(mockAxiosInstance);
    (axios.isAxiosError as any) = vi.fn((error) => error?.isAxiosError === true);

    // Standard config with credentials
    config = {
      backend: 'erpnext',
      apiUrl: 'https://ops.10nz.tools',
      apiKey: 'test-api-key-1234567890',
      apiSecret: 'test-api-secret-abcdefghij',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMaintenanceVisit', () => {
    it('@P0 should create maintenance visit with correct response structure', async () => {
      const mockVisit: MaintenanceVisit = {
        name: 'MNT-VISIT-2025-00001',
        customer: 'CUST-001',
        maintenance_type: 'Scheduled',
        work_done: 'Replaced battery',
      };

      // Mock Frappe response: { data: <resource> }
      mockAxiosInstance.post.mockResolvedValue({ data: mockVisit });

      const client = new ERPNextClient(config);
      const result = await client.createMaintenanceVisit({
        customer: 'CUST-001',
        work_done: 'Replaced battery',
      });

      expect(result).toEqual(mockVisit);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/resource/Maintenance Visit', {
        customer: 'CUST-001',
        work_done: 'Replaced battery',
      });
    });

    it('@P1 should include auth headers', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { name: 'MNT-001', customer: 'CUST-001' } });

      const client = new ERPNextClient(config);
      await client.createMaintenanceVisit({ customer: 'CUST-001' });

      // Verify axios.create was called with auth header
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token test-api-key-1234567890:test-api-secret-abcdefghij',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('getMaintenanceVisit', () => {
    it('@P0 should get maintenance visit by name', async () => {
      const mockVisit: MaintenanceVisit = {
        name: 'MNT-VISIT-2025-00001',
        customer: 'CUST-001',
        maintenance_type: 'Unscheduled',
        work_done: 'Emergency repair',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockVisit });

      const client = new ERPNextClient(config);
      const result = await client.getMaintenanceVisit('MNT-VISIT-2025-00001');

      expect(result).toEqual(mockVisit);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/resource/Maintenance Visit/MNT-VISIT-2025-00001'
      );
    });

    it('@P0 should return null for 404 not found', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404, data: { message: 'Not found' } },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const client = new ERPNextClient(config);
      const result = await client.getMaintenanceVisit('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('@P1 should URL-encode names with spaces', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { name: 'Test Name', customer: 'CUST-001' },
      });

      const client = new ERPNextClient(config);
      await client.getMaintenanceVisit('Test Name With Spaces');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/resource/Maintenance Visit/Test%20Name%20With%20Spaces'
      );
    });
  });

  describe('getMaintenanceVisits', () => {
    it('@P0 should list maintenance visits', async () => {
      const mockVisits: MaintenanceVisit[] = [
        { name: 'MNT-001', customer: 'CUST-001' },
        { name: 'MNT-002', customer: 'CUST-002' },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockVisits });

      const client = new ERPNextClient(config);
      const result = await client.getMaintenanceVisits();

      expect(result).toEqual(mockVisits);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Maintenance Visit', {
        params: { fields: JSON.stringify(['*']) },
      });
    });

    it('@P0 should apply filters in Frappe format', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = new ERPNextClient(config);
      await client.getMaintenanceVisits({ customer: 'CUST-001', maintenance_type: 'Scheduled' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Maintenance Visit', {
        params: {
          fields: JSON.stringify(['*']),
          filters: JSON.stringify([
            ['customer', '=', 'CUST-001'],
            ['maintenance_type', '=', 'Scheduled'],
          ]),
        },
      });
    });

    it('@P1 should not add filters param when filters is empty object', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const client = new ERPNextClient(config);
      await client.getMaintenanceVisits({});

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Maintenance Visit', {
        params: { fields: JSON.stringify(['*']) },
      });
    });
  });

  describe('updateMaintenanceVisit', () => {
    it('@P0 should update maintenance visit', async () => {
      const mockUpdated: MaintenanceVisit = {
        name: 'MNT-001',
        customer: 'CUST-001',
        completion_status: 'Fully Completed',
      };

      mockAxiosInstance.put.mockResolvedValue({ data: mockUpdated });

      const client = new ERPNextClient(config);
      const result = await client.updateMaintenanceVisit('MNT-001', {
        completion_status: 'Fully Completed',
      });

      expect(result).toEqual(mockUpdated);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/api/resource/Maintenance Visit/MNT-001',
        { completion_status: 'Fully Completed' }
      );
    });
  });

  describe('deleteMaintenanceVisit', () => {
    it('@P0 should delete maintenance visit', async () => {
      mockAxiosInstance.delete.mockResolvedValue({});

      const client = new ERPNextClient(config);
      await client.deleteMaintenanceVisit('MNT-001');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        '/api/resource/Maintenance Visit/MNT-001'
      );
    });
  });

  describe('Error Handling', () => {
    it('@P0 should throw ERPNextError for 401 unauthorized', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 401, data: { message: 'Unauthorized' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const client = new ERPNextClient(config);

      await expect(client.createMaintenanceVisit({ customer: 'CUST-001' })).rejects.toThrow(
        ERPNextError
      );
      await expect(client.createMaintenanceVisit({ customer: 'CUST-001' })).rejects.toThrow(
        /Invalid credentials/
      );
    });

    it('@P0 should throw ERPNextError for 500 server error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 500, data: { message: 'Internal server error' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const client = new ERPNextClient(config);

      await expect(client.createMaintenanceVisit({ customer: 'CUST-001' })).rejects.toThrow(
        ERPNextError
      );
    });

    it('@P0 should include request ID in error messages', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 500, data: { message: 'Server error' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const client = new ERPNextClient(config);

      try {
        await client.createMaintenanceVisit({ customer: 'CUST-001' });
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).toBeInstanceOf(ERPNextError);
        expect((err as ERPNextError).requestId).toMatch(/^erpnext-\d+-[a-z0-9]+$/);
        expect((err as ERPNextError).message).toMatch(/requestId: erpnext-/);
      }
    });
  });

  describe('Retry Logic', () => {
    it('@P0 should retry on 500 server error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 500, data: { message: 'Server error' } },
      };

      // Fail twice, succeed third time
      mockAxiosInstance.post
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { name: 'MNT-001', customer: 'CUST-001' } });

      const client = new ERPNextClient(config);
      const result = await client.createMaintenanceVisit({ customer: 'CUST-001' });

      expect(result.name).toBe('MNT-001');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('@P0 should retry on network error ECONNREFUSED', async () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { name: 'MNT-001', customer: 'CUST-001' } });

      const client = new ERPNextClient(config);
      const result = await client.createMaintenanceVisit({ customer: 'CUST-001' });

      expect(result.name).toBe('MNT-001');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('@P0 should retry on network error ETIMEDOUT', async () => {
      const error = {
        isAxiosError: true,
        code: 'ETIMEDOUT',
        message: 'Request timeout',
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { name: 'MNT-001', customer: 'CUST-001' } });

      const client = new ERPNextClient(config);
      const result = await client.createMaintenanceVisit({ customer: 'CUST-001' });

      expect(result.name).toBe('MNT-001');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('@P0 should NOT retry on 4xx client errors', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 400, data: { message: 'Bad request' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const client = new ERPNextClient(config);

      await expect(client.createMaintenanceVisit({ customer: 'CUST-001' })).rejects.toThrow();
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1); // No retries
    });

    it('@P1 should exhaust retries and throw after 3 attempts', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 500, data: { message: 'Server error' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const client = new ERPNextClient(config);

      await expect(client.createMaintenanceVisit({ customer: 'CUST-001' })).rejects.toThrow(
        ERPNextError
      );
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('Secret Masking', () => {
    it('@P0 should mask API key in error logs', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = {
        isAxiosError: true,
        response: { status: 500, data: { message: 'Server error' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      // Set NODE_ENV to trigger logging
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const client = new ERPNextClient(config);

      try {
        await client.createMaintenanceVisit({ customer: 'CUST-001' });
      } catch {
        // Expected to fail
      }

      // Verify secret was masked (2 chars on each end)
      const logCalls = consoleSpy.mock.calls.map((call) => call.join(' '));
      const hasFullKey = logCalls.some((log) => log.includes('test-api-key-1234567890'));
      const hasMaskedKey = logCalls.some((log) => log.includes('te...90'));

      expect(hasFullKey).toBe(false);
      expect(hasMaskedKey).toBe(true);

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('@P1 should mask short secrets entirely', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = {
        isAxiosError: true,
        response: { status: 500, data: { message: 'Server error' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const shortKeyConfig = { ...config, apiKey: 'short' };
      const client = new ERPNextClient(shortKeyConfig);

      try {
        await client.createMaintenanceVisit({ customer: 'CUST-001' });
      } catch {
        // Expected
      }

      const logCalls = consoleSpy.mock.calls.map((call) => call.join(' '));
      const hasFullKey = logCalls.some((log) => log.includes('short'));
      const hasMasked = logCalls.some((log) => log.includes('***'));

      expect(hasFullKey).toBe(false);
      expect(hasMasked).toBe(true);

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('Request ID Propagation', () => {
    it('@P0 should include X-Request-ID header', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { name: 'MNT-001', customer: 'CUST-001' } });

      const client = new ERPNextClient(config);
      await client.createMaintenanceVisit({ customer: 'CUST-001' });

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.stringMatching(/^erpnext-\d+-[a-z0-9]+$/),
          }),
        })
      );
    });
  });

  describe('Utility Methods', () => {
    it('@P0 should return maintenance types', async () => {
      const client = new ERPNextClient(config);
      const types = await client.getMaintenanceTypes();

      expect(types).toEqual(['Scheduled', 'Unscheduled', 'Breakdown']);
    });

    it('@P0 should return completion statuses', async () => {
      const client = new ERPNextClient(config);
      const statuses = await client.getCompletionStatuses();

      expect(statuses).toEqual(['Partially Completed', 'Fully Completed']);
    });

    it('@P0 should return healthy when configured', async () => {
      const client = new ERPNextClient(config);
      const healthy = await client.healthCheck();

      expect(healthy).toBe(true);
    });
  });
});
