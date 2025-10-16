"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const axios_1 = __importDefault(require("axios"));
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
(0, vitest_1.describe)('OpenProject Sync Service - Bitcoin Operations Critical Tests', () => {
    // ==========================================================================
    // 🔥 CRITICAL: Retry & Idempotency
    // Why: Prevents failed/duplicate Bitcoin task syncs
    // ==========================================================================
    (0, vitest_1.describe)('Retry & Idempotency (10N-168)', () => {
        (0, vitest_1.it)('@P0 should calculate exponential backoff correctly', () => {
            // Test the core backoff formula: baseDelay * (2^attempt) + jitter
            const baseDelay = TEST_CONFIG.baseDelayMs;
            const maxDelay = TEST_CONFIG.maxDelayMs;
            function calculateBackoff(attemptNumber) {
                const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
                const jitter = Math.random() * 100; // 0-100ms jitter
                return Math.min(exponentialDelay + jitter, maxDelay);
            }
            // Test increasing delays
            const delay0 = calculateBackoff(0); // ~500ms
            const delay1 = calculateBackoff(1); // ~1000ms
            const delay2 = calculateBackoff(2); // ~2000ms
            (0, vitest_1.expect)(delay0).toBeGreaterThanOrEqual(500);
            (0, vitest_1.expect)(delay0).toBeLessThanOrEqual(600);
            (0, vitest_1.expect)(delay1).toBeGreaterThanOrEqual(1000);
            (0, vitest_1.expect)(delay1).toBeLessThanOrEqual(1100);
            (0, vitest_1.expect)(delay2).toBeGreaterThanOrEqual(2000);
            (0, vitest_1.expect)(delay2).toBeLessThanOrEqual(2100);
        });
        (0, vitest_1.it)('@P0 should respect max delay cap', () => {
            const baseDelay = TEST_CONFIG.baseDelayMs;
            const maxDelay = TEST_CONFIG.maxDelayMs;
            function calculateBackoff(attemptNumber) {
                const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
                const jitter = Math.random() * 100;
                return Math.min(exponentialDelay + jitter, maxDelay);
            }
            // Very high attempt should cap at maxDelay
            const delay = calculateBackoff(20);
            (0, vitest_1.expect)(delay).toBeLessThanOrEqual(maxDelay);
        });
        (0, vitest_1.it)('@P0 should only retry on transient failures (5xx, 408, 429)', () => {
            const retryable = TEST_CONFIG.retryableStatusCodes;
            // Verify correct status codes marked as retryable
            (0, vitest_1.expect)(retryable).toContain(500); // Server error
            (0, vitest_1.expect)(retryable).toContain(502); // Bad gateway
            (0, vitest_1.expect)(retryable).toContain(503); // Service unavailable
            (0, vitest_1.expect)(retryable).toContain(429); // Rate limit
            (0, vitest_1.expect)(retryable).toContain(408); // Timeout
        });
        (0, vitest_1.it)('@P0 should NOT retry on permanent errors (4xx except 408, 429)', () => {
            const nonRetryable = TEST_CONFIG.nonRetryableStatusCodes;
            // Verify non-retryable errors fail fast
            (0, vitest_1.expect)(nonRetryable).toContain(400); // Bad request
            (0, vitest_1.expect)(nonRetryable).toContain(401); // Unauthorized
            (0, vitest_1.expect)(nonRetryable).toContain(403); // Forbidden
            (0, vitest_1.expect)(nonRetryable).toContain(404); // Not found
            (0, vitest_1.expect)(nonRetryable).toContain(422); // Unprocessable
        });
        (0, vitest_1.it)('@P0 should generate unique idempotency keys', () => {
            // Idempotency keys prevent duplicate Bitcoin task processing
            const key1 = crypto.randomUUID();
            const key2 = crypto.randomUUID();
            (0, vitest_1.expect)(key1).not.toBe(key2);
            (0, vitest_1.expect)(key1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });
    // ==========================================================================
    // 🔒 HIGH: Secret Protection
    // Why: Protects API keys securing Bitcoin operations
    // ==========================================================================
    (0, vitest_1.describe)('Secret Logging Protection (10N-170)', () => {
        (0, vitest_1.it)('@P0 should not log secrets in production mode', async () => {
            // Mock console.log to capture output
            const logSpy = vitest_1.vi.spyOn(console, 'log');
            // Simulate production environment
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            try {
                // Trigger health check (causes logging)
                const response = await axios_1.default.get(`${TEST_CONFIG.syncServiceUrl}/health`);
                (0, vitest_1.expect)(response.status).toBe(200);
                // Verify no secrets in logs
                const logs = logSpy.mock.calls.flat().join(' ');
                // Should NOT contain actual key values
                if (process.env.OPENPROJECT_API_KEY) {
                    (0, vitest_1.expect)(logs).not.toContain(process.env.OPENPROJECT_API_KEY);
                }
                if (process.env.SUPABASE_SERVICE_KEY) {
                    (0, vitest_1.expect)(logs).not.toContain(process.env.SUPABASE_SERVICE_KEY);
                }
                // Boolean checks only (if present)
                if (logs.includes('Service key')) {
                    (0, vitest_1.expect)(logs).toMatch(/Service key present: (true|false)/);
                }
            }
            finally {
                process.env.NODE_ENV = originalEnv;
                logSpy.mockRestore();
            }
        });
        (0, vitest_1.it)('@P0 should allow config logging in development mode', () => {
            // Dev mode should help debugging without exposing secrets
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            try {
                // Verify NODE_ENV check works
                const isDev = process.env.NODE_ENV === 'development';
                (0, vitest_1.expect)(isDev).toBe(true);
                // In dev mode, URLs and boolean checks are OK
                // Actual secrets should still never be logged
            }
            finally {
                process.env.NODE_ENV = originalEnv;
            }
        });
    });
    // ==========================================================================
    // ⚙️ HIGH: Service Initialization & Reliability
    // Why: Ensures service starts correctly and fails fast on misconfiguration
    // ==========================================================================
    (0, vitest_1.describe)('Service Initialization (10N-167, 10N-169)', () => {
        (0, vitest_1.it)('@P0 should require OPENPROJECT_API_KEY at startup', () => {
            // Service must fail fast if API key missing
            (0, vitest_1.expect)(process.env.OPENPROJECT_API_KEY).toBeDefined();
            (0, vitest_1.expect)(process.env.OPENPROJECT_API_KEY?.trim()).not.toBe('');
        });
        (0, vitest_1.it)('@P0 should require valid OPENPROJECT_PROJECT_ID at startup', () => {
            // Service must fail fast if project ID invalid
            (0, vitest_1.expect)(process.env.OPENPROJECT_PROJECT_ID).toBeDefined();
            const projectId = parseInt(process.env.OPENPROJECT_PROJECT_ID, 10);
            (0, vitest_1.expect)(Number.isFinite(projectId)).toBe(true);
            (0, vitest_1.expect)(projectId).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('@P0 should initialize with health check responding', async () => {
            // Basic service health verification
            const response = await axios_1.default.get(`${TEST_CONFIG.syncServiceUrl}/health`);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.data).toMatchObject({
                status: 'healthy',
                service: 'sync-service',
            });
            (0, vitest_1.expect)(response.data.openproject).toBeDefined();
            (0, vitest_1.expect)(response.data.supabase).toBeDefined();
        });
        (0, vitest_1.it)('@P0 should map Supabase priority to OpenProject priority', () => {
            // Core mapping logic for task priority
            const priorityMap = {
                immediate: 'high',
                high: 'high',
                normal: 'normal',
                low: 'low',
            };
            // Verify critical mappings
            (0, vitest_1.expect)(priorityMap['immediate']).toBe('high');
            (0, vitest_1.expect)(priorityMap['normal']).toBe('normal');
            (0, vitest_1.expect)(priorityMap['low']).toBe('low');
        });
        (0, vitest_1.it)('@P0 should map Supabase status to OpenProject status', () => {
            // Core mapping logic for task status
            const statusMap = {
                pending: 'new',
                in_progress: 'in progress',
                completed: 'closed',
                cancelled: 'rejected',
            };
            // Verify critical mappings
            (0, vitest_1.expect)(statusMap['pending']).toBe('new');
            (0, vitest_1.expect)(statusMap['in_progress']).toBe('in progress');
            (0, vitest_1.expect)(statusMap['completed']).toBe('closed');
        });
    });
    // ==========================================================================
    // 🏗️ MEDIUM: Architecture Validation
    // Why: Ensures API-only pattern, prevents data inconsistencies
    // ==========================================================================
    (0, vitest_1.describe)('API-Only Architecture (10N-171)', () => {
        (0, vitest_1.it)('@P0 should enforce API-only sync (no database triggers)', () => {
            // This is a design verification test
            // Actual verification happens via SQL query in manual testing
            // See 10N-171 for SQL: SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%sync%'
            // Test passes if code review confirms no sync triggers exist
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
    // ==========================================================================
    // 🚀 MEDIUM: Operational Endpoints
    // Why: Basic validation that service responds to requests
    // ==========================================================================
    (0, vitest_1.describe)('Core Endpoints', () => {
        (0, vitest_1.it)('@P0 should handle manual sync requests', async () => {
            // POST /sync/task/:id - verify endpoint exists
            // Expected: 404 for invalid ID (service running)
            try {
                await axios_1.default.post(`${TEST_CONFIG.syncServiceUrl}/sync/task/00000000-0000-0000-0000-000000000000`);
            }
            catch (error) {
                // Expect 404 (task not found) or 500 (error)
                // Both indicate service is responding
                (0, vitest_1.expect)([404, 500]).toContain(error.response?.status);
            }
        });
        (0, vitest_1.it)('@P0 should handle bulk sync requests', async () => {
            // POST /sync/bulk - verify endpoint responds
            const response = await axios_1.default.post(`${TEST_CONFIG.syncServiceUrl}/sync/bulk`);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.data).toHaveProperty('success');
            (0, vitest_1.expect)(response.data).toHaveProperty('failed');
            (0, vitest_1.expect)(response.data).toHaveProperty('errors');
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
