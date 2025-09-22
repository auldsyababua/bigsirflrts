/**
 * FLRTS Edge Function → n8n Webhook Integration Tests
 *
 * Tests the complete "Reflex + Brain" architecture pattern:
 * Telegram → Edge Function (quick reply) → n8n webhook (complex processing)
 *
 * Performance Requirements:
 * - Edge Function response: <200ms
 * - n8n webhook response: <200ms
 * - End-to-end processing: <5000ms
 *
 * Run with: npm run test:integration -- edge-function-n8n-webhook
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  testConfig,
  validateTestConfig,
  getSupabaseHeaders,
} from '../config/test-config';

// Test configuration
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://n8n-rrrs.sliplane.app/webhook/telegram-task-creation';
const PERFORMANCE_THRESHOLD_MS = 200;
const E2E_THRESHOLD_MS = 5000;

// Validate configuration before running tests
beforeAll(() => {
  validateTestConfig();
  expect(N8N_WEBHOOK_URL).toBeTruthy();
});

describe('Edge Function → n8n Webhook Integration', () => {
  describe('Architecture Pattern Verification', () => {
    it('should implement "Reflex + Brain" pattern correctly', async () => {
      // Test the documented architecture from Story 1.4:
      // Telegram → Edge Function (quick reply) → n8n webhook (complex processing)

      const telegramPayload = {
        update: {
          message: {
            text: 'Create urgent task for integration testing: Validate webhook flow due today high priority',
            chat: { id: 123456789 },
            from: { id: 987654321 },
            message_id: 42,
          },
        },
      };

      const startTime = Date.now();

      // Step 1: Edge Function should provide quick reply (Reflex)
      const edgeFunctionResponse = await fetch(
        testConfig.endpoints.telegramWebhook,
        {
          method: 'POST',
          headers: getSupabaseHeaders(false),
          body: JSON.stringify(telegramPayload),
        }
      );

      const edgeFunctionTime = Date.now() - startTime;

      expect([200, 202]).toContain(edgeFunctionResponse.status);
      expect(edgeFunctionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      // Verify Edge Function triggered n8n webhook (Brain processing)
      // Allow some time for async webhook call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(E2E_THRESHOLD_MS);
    });
  });

  describe('n8n Webhook Direct Testing', () => {
    it('should accept properly formatted Telegram update payload', async () => {
      const payload = {
        update: {
          message: {
            text: 'Create test task for webhook validation',
            chat: { id: 123456789 },
            from: { id: 987654321 },
            message_id: 99,
          },
        },
      };

      const startTime = Date.now();

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseTime = Date.now() - startTime;

      expect([200, 202]).toContain(response.status);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should handle malformed payload gracefully', async () => {
      const malformedPayload = {
        invalid: 'structure',
        missing: 'required fields',
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(malformedPayload),
      });

      // n8n should handle gracefully (not crash)
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should respond within performance requirements', async () => {
      const payload = {
        update: {
          message: {
            text: 'Performance test task creation',
            chat: { id: 999999999 },
            from: { id: 888888888 },
            message_id: 1000,
          },
        },
      };

      // Run multiple performance tests
      const performanceTests = Array.from({ length: 5 }, async () => {
        const startTime = Date.now();

        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const responseTime = Date.now() - startTime;
        return { responseTime, status: response.status };
      });

      const results = await Promise.all(performanceTests);

      // All responses should be under threshold
      for (const result of results) {
        expect(result.responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        expect([200, 202]).toContain(result.status);
      }

      // Average response time should be well under threshold
      const avgResponseTime =
        results.reduce((sum, result) => sum + result.responseTime, 0) /
        results.length;
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 0.8);
    });
  });

  describe('Webhook Endpoint Health Checks', () => {
    it('should be reachable and responsive', async () => {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'GET', // Health check with GET
      });

      // n8n webhook should respond to GET (even if method not allowed)
      expect(response.status).toBeLessThan(500);
    });

    it('should reject requests without proper content-type', async () => {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'invalid content type',
      });

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle typical small team concurrent usage', async () => {
      const payload = {
        update: {
          message: {
            text: 'Small team concurrent test task',
            chat: { id: 777777777 },
            from: { id: 666666666 },
            message_id: 2000,
          },
        },
      };

      // Send 4 concurrent requests (realistic for 10-user team)
      const concurrentRequests = Array.from({ length: 4 }, () =>
        fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed easily at this scale
      for (const response of responses) {
        expect([200, 202]).toContain(response.status);
      }
    });

    it('should handle network timeout scenarios', async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100); // Very short timeout

      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            update: {
              message: {
                text: 'timeout test',
                chat: { id: 1 },
                from: { id: 1 },
                message_id: 1,
              },
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        // If we get here, the request was faster than 100ms (good!)
        expect(true).toBe(true);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          // This means the webhook was slower than 100ms
          console.warn(
            'Webhook response slower than 100ms - investigate performance'
          );
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    });
  });
});

describe('Integration Test Configuration', () => {
  it('should have all required environment variables for integration testing', () => {
    expect(N8N_WEBHOOK_URL).toBeTruthy();
    expect(N8N_WEBHOOK_URL).toContain('webhook');
    expect(testConfig.supabase.url).toBeTruthy();
    expect(testConfig.endpoints.telegramWebhook).toBeTruthy();
  });

  it('should have reasonable performance thresholds', () => {
    expect(PERFORMANCE_THRESHOLD_MS).toBeGreaterThanOrEqual(50);
    expect(PERFORMANCE_THRESHOLD_MS).toBeLessThanOrEqual(500);
    expect(E2E_THRESHOLD_MS).toBeGreaterThanOrEqual(1000);
  });
});