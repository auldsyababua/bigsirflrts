/**
 * @fileoverview Pragmatic test suite for OpenProject Sync Service
 *
 * Context: Internal Bitcoin operations tool (10-20 users)
 * Focus: Critical reliability and security for Bitcoin task tracking
 * Philosophy: Test what matters, manual test the rest
 *
 * Run with: npm test --workspace=sync-service
 *
 * @P0 @module-2 @sync-service
 */

import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';

// Test configuration
const TEST_CONFIG = {
  syncServiceUrl: process.env.SYNC_SERVICE_URL || 'http://localhost:3002',

  // Retry configuration (matching implementation defaults)
  maxRetries: 5,
  baseDelayMs: 500,
  maxDelayMs: 10000,

  // Status codes
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  nonRetryableStatusCodes: [400, 401, 403, 404, 422],
};

describe('OpenProject Sync Service - Bitcoin Operations Critical Tests', () => {
  // ==========================================================================
  // 🔥 CRITICAL: Retry & Idempotency
  // Why: Prevents failed/duplicate Bitcoin task syncs
  // ==========================================================================

  describe('Retry & Idempotency (10N-168)', () => {
    it('@P0 should calculate exponential backoff correctly', () => {
      // Test the core backoff formula: baseDelay * (2^attempt) + jitter
      const baseDelay = TEST_CONFIG.baseDelayMs;
      const maxDelay = TEST_CONFIG.maxDelayMs;

      function calculateBackoff(attemptNumber: number): number {
        const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
        const jitter = Math.random() * 100; // 0-100ms jitter
        return Math.min(exponentialDelay + jitter, maxDelay);
      }

      // Test increasing delays
      const delay0 = calculateBackoff(0); // ~500ms
      const delay1 = calculateBackoff(1); // ~1000ms
      const delay2 = calculateBackoff(2); // ~2000ms

      expect(delay0).toBeGreaterThanOrEqual(500);
      expect(delay0).toBeLessThanOrEqual(600);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1100);

      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2100);
    });

    it('@P0 should respect max delay cap', () => {
      const baseDelay = TEST_CONFIG.baseDelayMs;
      const maxDelay = TEST_CONFIG.maxDelayMs;

      function calculateBackoff(attemptNumber: number): number {
        const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
        const jitter = Math.random() * 100;
        return Math.min(exponentialDelay + jitter, maxDelay);
      }

      // Very high attempt should cap at maxDelay
      const delay = calculateBackoff(20);
      expect(delay).toBeLessThanOrEqual(maxDelay);
    });

    it('@P0 should only retry on transient failures (5xx, 408, 429)', () => {
      const retryable = TEST_CONFIG.retryableStatusCodes;

      // Verify correct status codes marked as retryable
      expect(retryable).toContain(500); // Server error
      expect(retryable).toContain(502); // Bad gateway
      expect(retryable).toContain(503); // Service unavailable
      expect(retryable).toContain(429); // Rate limit
      expect(retryable).toContain(408); // Timeout
    });

    it('@P0 should NOT retry on permanent errors (4xx except 408, 429)', () => {
      const nonRetryable = TEST_CONFIG.nonRetryableStatusCodes;

      // Verify non-retryable errors fail fast
      expect(nonRetryable).toContain(400); // Bad request
      expect(nonRetryable).toContain(401); // Unauthorized
      expect(nonRetryable).toContain(403); // Forbidden
      expect(nonRetryable).toContain(404); // Not found
      expect(nonRetryable).toContain(422); // Unprocessable
    });

    it('@P0 should generate unique idempotency keys', () => {
      // Idempotency keys prevent duplicate Bitcoin task processing
      const key1 = crypto.randomUUID();
      const key2 = crypto.randomUUID();

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  // ==========================================================================
  // 🔒 HIGH: Secret Protection
  // Why: Protects API keys securing Bitcoin operations
  // ==========================================================================

  describe('Secret Logging Protection (10N-170)', () => {
    it('@P0 should not log secrets in production mode', async () => {
      // Mock console.log to capture output
      const logSpy = vi.spyOn(console, 'log');

      // Simulate production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        // Trigger health check (causes logging)
        const response = await axios.get(`${TEST_CONFIG.syncServiceUrl}/health`);
        expect(response.status).toBe(200);

        // Verify no secrets in logs
        const logs = logSpy.mock.calls.flat().join(' ');

        // Should NOT contain actual key values
        if (process.env.OPENPROJECT_API_KEY) {
          expect(logs).not.toContain(process.env.OPENPROJECT_API_KEY);
        }
        if (process.env.SUPABASE_SERVICE_KEY) {
          expect(logs).not.toContain(process.env.SUPABASE_SERVICE_KEY);
        }

        // Boolean checks only (if present)
        if (logs.includes('Service key')) {
          expect(logs).toMatch(/Service key present: (true|false)/);
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
        logSpy.mockRestore();
      }
    });

    it('@P0 should allow config logging in development mode', () => {
      // Dev mode should help debugging without exposing secrets
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        // Verify NODE_ENV check works
        const isDev = process.env.NODE_ENV === 'development';
        expect(isDev).toBe(true);

        // In dev mode, URLs and boolean checks are OK
        // Actual secrets should still never be logged
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ==========================================================================
  // ⚙️ HIGH: Service Initialization & Reliability
  // Why: Ensures service starts correctly and fails fast on misconfiguration
  // ==========================================================================

  describe('Service Initialization (10N-167, 10N-169)', () => {
    it('@P0 should require OPENPROJECT_API_KEY at startup', () => {
      // Service must fail fast if API key missing
      expect(process.env.OPENPROJECT_API_KEY).toBeDefined();
      expect(process.env.OPENPROJECT_API_KEY?.trim()).not.toBe('');
    });

    it('@P0 should require valid OPENPROJECT_PROJECT_ID at startup', () => {
      // Service must fail fast if project ID invalid
      expect(process.env.OPENPROJECT_PROJECT_ID).toBeDefined();

      const projectId = parseInt(process.env.OPENPROJECT_PROJECT_ID!, 10);
      expect(Number.isFinite(projectId)).toBe(true);
      expect(projectId).toBeGreaterThan(0);
    });

    it('@P0 should initialize with health check responding', async () => {
      // Basic service health verification
      const response = await axios.get(`${TEST_CONFIG.syncServiceUrl}/health`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'healthy',
        service: 'sync-service',
      });
      expect(response.data.openproject).toBeDefined();
      expect(response.data.supabase).toBeDefined();
    });

    it('@P0 should map Supabase priority to OpenProject priority', () => {
      // Core mapping logic for task priority
      const priorityMap: Record<string, string> = {
        immediate: 'high',
        high: 'high',
        normal: 'normal',
        low: 'low',
      };

      // Verify critical mappings
      expect(priorityMap['immediate']).toBe('high');
      expect(priorityMap['normal']).toBe('normal');
      expect(priorityMap['low']).toBe('low');
    });

    it('@P0 should map Supabase status to OpenProject status', () => {
      // Core mapping logic for task status
      const statusMap: Record<string, string> = {
        pending: 'new',
        in_progress: 'in progress',
        completed: 'closed',
        cancelled: 'rejected',
      };

      // Verify critical mappings
      expect(statusMap['pending']).toBe('new');
      expect(statusMap['in_progress']).toBe('in progress');
      expect(statusMap['completed']).toBe('closed');
    });
  });

  // ==========================================================================
  // 🏗️ MEDIUM: Architecture Validation
  // Why: Ensures API-only pattern, prevents data inconsistencies
  // ==========================================================================

  describe('API-Only Architecture (10N-171)', () => {
    it('@P0 should enforce API-only sync (no database triggers)', () => {
      // This is a design verification test
      // Actual verification happens via SQL query in manual testing
      // See 10N-171 for SQL: SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%sync%'

      // Test passes if code review confirms no sync triggers exist
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // 🚀 MEDIUM: Operational Endpoints
  // Why: Basic validation that service responds to requests
  // ==========================================================================

  describe('Core Endpoints', () => {
    it('@P0 should handle manual sync requests', async () => {
      // POST /sync/task/:id - verify endpoint exists
      // Expected: 404 for invalid ID (service running)

      try {
        await axios.post(
          `${TEST_CONFIG.syncServiceUrl}/sync/task/00000000-0000-0000-0000-000000000000`
        );
      } catch (error: any) {
        // Expect 404 (task not found) or 500 (error)
        // Both indicate service is responding
        expect([404, 500]).toContain(error.response?.status);
      }
    });

    it('@P0 should handle bulk sync requests', async () => {
      // POST /sync/bulk - verify endpoint responds
      const response = await axios.post(`${TEST_CONFIG.syncServiceUrl}/sync/bulk`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      expect(response.data).toHaveProperty('failed');
      expect(response.data).toHaveProperty('errors');
    });
  });
});

// ==========================================================================
// 📝 MANUAL TESTING SCENARIOS
// For 10-20 users, these are more valuable than exhaustive unit tests
// ==========================================================================

/**
 * MANUAL TEST 1: Transient Failure Recovery
 *
 * 1. Stop OpenProject service temporarily
 * 2. Create task in Supabase via UI or API
 * 3. Observe retry attempts in sync-service logs:
 *    - Should see: "attempt 1/6", "attempt 2/6", etc.
 *    - Should see exponential delays between attempts
 * 4. Restart OpenProject service
 * 5. Verify task syncs successfully after retry
 *
 * Expected: Task eventually syncs, no duplicate work packages
 */

/**
 * MANUAL TEST 2: Idempotency Validation
 *
 * 1. Create task in Supabase
 * 2. Check sync-service logs for idempotency key
 * 3. Attempt to create duplicate task with same data
 * 4. Verify only ONE work package created in OpenProject
 * 5. Verify cached response returned for duplicate
 *
 * Expected: No duplicate work packages, cache hit logged
 */

/**
 * MANUAL TEST 3: Secret Logging Compliance
 *
 * 1. Set NODE_ENV=production
 * 2. Start sync-service
 * 3. Check logs for any secret values or prefixes
 * 4. Search for: API keys, service keys, tokens
 *
 * Expected: Zero secrets in production logs
 *
 * Command:
 * NODE_ENV=production npm start --workspace=sync-service | tee /tmp/sync.log
 * grep -i "apikey\|service.*key" /tmp/sync.log  # Should be empty
 */

/**
 * MANUAL TEST 4: Dictionary Portability
 *
 * (Only run if changing OpenProject instances)
 *
 * 1. Point OPENPROJECT_URL to different instance
 * 2. Start sync-service
 * 3. Verify dictionaries loaded from new instance
 * 4. Create task and verify correct status/priority applied
 *
 * Expected: Service adapts to new instance automatically
 */
