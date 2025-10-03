/**
 * ERPNext client tests - Phase 1 stub behavior
 * Phase 1: 10N-243
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ERPNextClient } from '../../packages/sync-service/src/clients/erpnext';
import type { BackendConfig } from '../../packages/sync-service/src/config';

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
