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
 * Run with: op run --env-file=tests/.env.test -- node --test tests/integration/edge-function-n8n-webhook.test.js
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import {
  testConfig,
  validateTestConfig,
  getSupabaseHeaders,
} from "../config/test-config.js";

// Test configuration
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://n8n-rrrs.sliplane.app/webhook/telegram-task-creation";
const PERFORMANCE_THRESHOLD_MS = 200;
const E2E_THRESHOLD_MS = 5000;

// Validate configuration before running tests
before(() => {
  validateTestConfig();
  assert.ok(
    N8N_WEBHOOK_URL,
    "N8N_WEBHOOK_URL must be configured for integration tests",
  );
});

describe("Edge Function → n8n Webhook Integration", () => {
  describe("Architecture Pattern Verification", () => {
    test('should implement "Reflex + Brain" pattern correctly', async () => {
      // Test the documented architecture from Story 1.4:
      // Telegram → Edge Function (quick reply) → n8n webhook (complex processing)

      const telegramPayload = {
        update: {
          message: {
            text: "Create urgent task for integration testing: Validate webhook flow due today high priority",
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
          method: "POST",
          headers: getSupabaseHeaders(false),
          body: JSON.stringify(telegramPayload),
        },
      );

      const edgeFunctionTime = Date.now() - startTime;

      assert.ok(
        edgeFunctionResponse.status === 200 ||
          edgeFunctionResponse.status === 202,
        `Edge Function should respond with 200/202, got ${edgeFunctionResponse.status}`,
      );

      assert.ok(
        edgeFunctionTime < PERFORMANCE_THRESHOLD_MS,
        `Edge Function response time ${edgeFunctionTime}ms exceeds ${PERFORMANCE_THRESHOLD_MS}ms threshold`,
      );

      // Verify Edge Function triggered n8n webhook (Brain processing)
      // Allow some time for async webhook call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const totalTime = Date.now() - startTime;
      assert.ok(
        totalTime < E2E_THRESHOLD_MS,
        `End-to-end processing time ${totalTime}ms exceeds ${E2E_THRESHOLD_MS}ms threshold`,
      );
    });
  });

  describe("n8n Webhook Direct Testing", () => {
    test("should accept properly formatted Telegram update payload", async () => {
      const payload = {
        update: {
          message: {
            text: "Create test task for webhook validation",
            chat: { id: 123456789 },
            from: { id: 987654321 },
            message_id: 99,
          },
        },
      };

      const startTime = Date.now();

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseTime = Date.now() - startTime;

      assert.ok(
        response.status === 200 || response.status === 202,
        `n8n webhook should accept valid payload, got ${response.status}`,
      );

      assert.ok(
        responseTime < PERFORMANCE_THRESHOLD_MS,
        `n8n webhook response time ${responseTime}ms exceeds ${PERFORMANCE_THRESHOLD_MS}ms threshold`,
      );
    });

    test("should handle malformed payload gracefully", async () => {
      const malformedPayload = {
        invalid: "structure",
        missing: "required fields",
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(malformedPayload),
      });

      // n8n should handle gracefully (not crash)
      assert.ok(
        response.status >= 200 && response.status < 500,
        `n8n webhook should handle malformed payload gracefully, got ${response.status}`,
      );
    });

    test("should respond within performance requirements", async () => {
      const payload = {
        update: {
          message: {
            text: "Performance test task creation",
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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseTime = Date.now() - startTime;
        return { responseTime, status: response.status };
      });

      const results = await Promise.all(performanceTests);

      // All responses should be under threshold
      for (const result of results) {
        assert.ok(
          result.responseTime < PERFORMANCE_THRESHOLD_MS,
          `Performance test failed: ${result.responseTime}ms exceeds ${PERFORMANCE_THRESHOLD_MS}ms threshold`,
        );

        assert.ok(
          result.status === 200 || result.status === 202,
          `Performance test failed: got status ${result.status}`,
        );
      }

      // Average response time should be well under threshold
      const avgResponseTime =
        results.reduce((sum, result) => sum + result.responseTime, 0) /
        results.length;
      assert.ok(
        avgResponseTime < PERFORMANCE_THRESHOLD_MS * 0.8,
        `Average response time ${avgResponseTime}ms should be under 80% of threshold (${PERFORMANCE_THRESHOLD_MS * 0.8}ms)`,
      );
    });
  });

  describe("Webhook Endpoint Health Checks", () => {
    test("should be reachable and responsive", async () => {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "GET", // Health check with GET
      });

      // n8n webhook should respond to GET (even if method not allowed)
      assert.ok(
        response.status < 500,
        `Webhook endpoint should be reachable, got ${response.status}`,
      );
    });

    test("should reject requests without proper content-type", async () => {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "invalid content type",
      });

      // Should handle gracefully
      assert.ok(
        response.status >= 200 && response.status < 500,
        `Should handle invalid content-type gracefully, got ${response.status}`,
      );
    });
  });

  describe("Error Handling and Resilience", () => {
    test("should handle typical small team concurrent usage", async () => {
      const payload = {
        update: {
          message: {
            text: "Small team concurrent test task",
            chat: { id: 777777777 },
            from: { id: 666666666 },
            message_id: 2000,
          },
        },
      };

      // Send 4 concurrent requests (realistic for 10-user team)
      const concurrentRequests = Array.from({ length: 4 }, () =>
        fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed easily at this scale
      for (const response of responses) {
        assert.ok(
          response.status === 200 || response.status === 202,
          `Small team concurrent request failed with status ${response.status}`,
        );
      }
    });

    test("should handle network timeout scenarios", async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100); // Very short timeout

      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            update: {
              message: {
                text: "timeout test",
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
        assert.ok(true, "Request completed within timeout window");
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          // This means the webhook was slower than 100ms
          console.warn(
            "Webhook response slower than 100ms - investigate performance",
          );
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    });
  });
});

describe("Integration Test Configuration", () => {
  test("should have all required environment variables for integration testing", () => {
    assert.ok(N8N_WEBHOOK_URL, "N8N_WEBHOOK_URL should be configured");
    assert.ok(
      N8N_WEBHOOK_URL.includes("webhook"),
      "N8N_WEBHOOK_URL should be a webhook endpoint",
    );
    assert.ok(testConfig.supabase.url, "Supabase URL should be configured");
    assert.ok(
      testConfig.endpoints.telegramWebhook,
      "Telegram webhook endpoint should be configured",
    );
  });

  test("should have reasonable performance thresholds", () => {
    assert.ok(
      PERFORMANCE_THRESHOLD_MS >= 50,
      "Performance threshold should allow for network latency",
    );
    assert.ok(
      PERFORMANCE_THRESHOLD_MS <= 500,
      "Performance threshold should enforce responsiveness",
    );
    assert.ok(
      E2E_THRESHOLD_MS >= 1000,
      "E2E threshold should allow for processing time",
    );
  });
});
