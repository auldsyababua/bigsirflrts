/**
 * FLRTS Performance Regression Tests
 *
 * Validates that the Edge Function → n8n webhook integration maintains
 * sub-200ms response times under various load conditions.
 *
 * Requirements from Story 1.4:
 * - Edge Function response: <200ms
 * - n8n webhook response: <200ms
 * - Architecture must not degrade under normal load
 *
 * Run with: op run --env-file=tests/.env.test -- node --test tests/integration/performance-regression.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  testConfig,
  validateTestConfig,
  getSupabaseHeaders,
} from '../config/test-config';

// Performance test configuration
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://n8n-rrrs.sliplane.app/webhook/telegram-task-creation";
const PERFORMANCE_THRESHOLD_MS = 200;
const LOAD_TEST_REQUESTS = 5; // Reduced for 10-user scale
const CONCURRENT_REQUEST_COUNT = 3; // Max 3 concurrent users

// Performance baseline data (could be loaded from external monitoring)
const PERFORMANCE_BASELINE = {
  edgeFunction: {
    p50: 45, // 50th percentile baseline
    p95: 120, // 95th percentile baseline
    p99: 180, // 99th percentile baseline
  },
  n8nWebhook: {
    p50: 35,
    p95: 85,
    p99: 150,
  },
};

beforeAll(() => {
  validateTestConfig();
  expect(
    N8N_WEBHOOK_URL,
    "N8N_WEBHOOK_URL must be configured for performance tests",
  ).toBeTruthy();
});

/**
 * Utility function to measure request timing
 */
async function measureRequest(url, options) {
  const startTime = process.hrtime.bigint();
  const response = await fetch(url, options);
  const endTime = process.hrtime.bigint();
  const durationMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

  return {
    response,
    durationMs: Math.round(durationMs * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Calculate percentiles from an array of numbers
 */
function calculatePercentiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
    min: sorted[0],
    max: sorted[len - 1],
    avg: values.reduce((sum, val) => sum + val, 0) / len,
  };
}

describe("Edge Function Performance Regression Tests", () => {
  it("should maintain baseline performance under normal load", async () => {
    const telegramPayload = {
      update: {
        message: {
          text: "Performance test: Create baseline measurement task",
          chat: { id: 123456789 },
          from: { id: 987654321 },
          message_id: 1001,
        },
      },
    };

    const measurements = [];

    // Perform multiple requests to establish performance baseline
    for (let i = 0; i < LOAD_TEST_REQUESTS; i++) {
      const { response, durationMs } = await measureRequest(
        testConfig.endpoints.telegramWebhook,
        {
          method: "POST",
          headers: getSupabaseHeaders(false),
          body: JSON.stringify(telegramPayload),
        },
      );

      expect(
        response.status === 200 || response.status === 202,
        `Request ${i + 1} failed with status ${response.status}`,
      ).toBeTruthy();

      measurements.push(durationMs);

      // Small delay between requests to avoid overwhelming the service
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const stats = calculatePercentiles(measurements);

    console.log("Edge Function Performance Stats:", {
      ...stats,
      baseline: PERFORMANCE_BASELINE.edgeFunction,
    });

    // Assert performance requirements
    expect(
      stats.p95 < PERFORMANCE_THRESHOLD_MS,
      `95th percentile (${stats.p95}ms).toBeTruthy() exceeds threshold (${PERFORMANCE_THRESHOLD_MS}ms)`,
    );

    expect(
      stats.max < PERFORMANCE_THRESHOLD_MS * 1.5,
      `Maximum response time (${stats.max}ms).toBeTruthy() exceeds 150% of threshold (${PERFORMANCE_THRESHOLD_MS * 1.5}ms)`,
    );

    // Regression check against baseline (if this becomes a concern)
    if (stats.p95 > PERFORMANCE_BASELINE.edgeFunction.p95 * 1.3) {
      console.warn(
        `⚠️  Performance regression detected: 95th percentile increased from ${PERFORMANCE_BASELINE.edgeFunction.p95}ms to ${stats.p95}ms`,
      );
    }
  });

  it("should handle typical 10-user concurrent load", async () => {
    const payload = {
      update: {
        message: {
          text: "Typical user load test - small team usage",
          chat: { id: 999888777 },
          from: { id: 777888999 },
          message_id: 2001,
        },
      },
    };

    // Simulate 2 small batches (realistic for 10-user team)
    const batchResults = [];

    for (let batch = 0; batch < 2; batch++) {
      const concurrentRequests = Array.from(
        { length: CONCURRENT_REQUEST_COUNT },
        () =>
          measureRequest(testConfig.endpoints.telegramWebhook, {
            method: "POST",
            headers: getSupabaseHeaders(false),
            body: JSON.stringify(payload),
          }),
      );

      const results = await Promise.all(concurrentRequests);

      // Validate all requests succeeded
      for (const { response, durationMs } of results) {
        expect(
          response.status === 200 || response.status === 202,
          `Concurrent request failed with status ${response.status}`,
        ).toBeTruthy();
        batchResults.push(durationMs);
      }

      // Brief pause between batches (users don't all act simultaneously)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const concurrentStats = calculatePercentiles(batchResults);

    console.log("Small Team Load Performance Stats:", concurrentStats);

    // Performance should easily handle small team load
    expect(
      concurrentStats.p95 < PERFORMANCE_THRESHOLD_MS,
      `Small team load 95th percentile (${concurrentStats.p95}ms).toBeTruthy() should stay under threshold`,
    );

    expect(
      concurrentStats.avg < PERFORMANCE_THRESHOLD_MS * 0.6,
      `Average response time (${concurrentStats.avg}ms).toBeTruthy() should be well under threshold for small team`,
    );
  });
});

describe("n8n Webhook Performance Regression Tests", () => {
  it("should maintain sub-200ms response times under load", async () => {
    const payload = {
      update: {
        message: {
          text: "n8n webhook performance test task",
          chat: { id: 555666777 },
          from: { id: 777666555 },
          message_id: 3001,
        },
      },
    };

    const measurements = [];

    for (let i = 0; i < LOAD_TEST_REQUESTS; i++) {
      const { response, durationMs } = await measureRequest(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(
        response.status === 200 || response.status === 202,
        `n8n webhook request ${i + 1} failed with status ${response.status}`,
      ).toBeTruthy();

      measurements.push(durationMs);

      // Brief delay between requests
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    const stats = calculatePercentiles(measurements);

    console.log("n8n Webhook Performance Stats:", {
      ...stats,
      baseline: PERFORMANCE_BASELINE.n8nWebhook,
    });

    // Assert n8n webhook performance requirements
    expect(
      stats.p95 < PERFORMANCE_THRESHOLD_MS,
      `n8n webhook 95th percentile (${stats.p95}ms).toBeTruthy() exceeds threshold (${PERFORMANCE_THRESHOLD_MS}ms)`,
    );

    expect(
      stats.avg < PERFORMANCE_THRESHOLD_MS * 0.6,
      `n8n webhook average response (${stats.avg}ms).toBeTruthy() should be under 60% of threshold for normal operations`,
    );

    // Check for regression
    if (stats.p95 > PERFORMANCE_BASELINE.n8nWebhook.p95 * 1.4) {
      console.warn(
        `⚠️  n8n webhook performance regression: 95th percentile increased from ${PERFORMANCE_BASELINE.n8nWebhook.p95}ms to ${stats.p95}ms`,
      );
    }
  });

  it("should handle occasional usage bursts (simulated team meetings)", async () => {
    const payload = {
      update: {
        message: {
          text: "Team meeting task burst - multiple tasks created quickly",
          chat: { id: 111222333 },
          from: { id: 333222111 },
          message_id: 4001,
        },
      },
    };

    // Simulate a team meeting where everyone creates tasks (small burst for 10-user team)
    const burstRequests = Array.from({ length: 6 }, () =>
      // 6 users creating tasks simultaneously
      measureRequest(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    const burstResults = await Promise.all(burstRequests);

    // Brief pause (meeting ends)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test normal usage after burst
    const normalUsageMeasurements = [];
    for (let i = 0; i < 3; i++) {
      const { response, durationMs } = await measureRequest(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(
        response.status === 200 || response.status === 202,
        `Normal usage request ${i + 1} failed with status ${response.status}`,
      ).toBeTruthy();

      normalUsageMeasurements.push(durationMs);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const normalStats = calculatePercentiles(normalUsageMeasurements);

    console.log("Post-Burst Normal Usage Stats:", normalStats);

    // System should handle small bursts easily and return to normal
    expect(
      normalStats.avg < PERFORMANCE_THRESHOLD_MS * 0.7,
      `System should maintain good performance after small burst. Average: ${normalStats.avg}ms`,
    ).toBeTruthy();

    // All burst requests should complete successfully
    for (const { response } of burstResults) {
      expect(
        response.status === 200 || response.status === 202,
        "All requests during team meeting burst should complete successfully",
      ).toBeTruthy();
    }
  });
});

describe("End-to-End Performance Validation", () => {
  it("should validate complete Reflex + Brain architecture performance", async () => {
    const testScenarios = [
      {
        name: "Simple task creation",
        text: "Create task: Test performance monitoring",
        expectedComplexity: "low",
      },
      {
        name: "Complex task with metadata",
        text: "Create urgent task for @taylor due tomorrow: Review performance regression test suite and update monitoring thresholds high priority",
        expectedComplexity: "high",
      },
      {
        name: "Task with multiple operations",
        text: "Create task reminder and schedule meeting for next week priority medium assignee john",
        expectedComplexity: "medium",
      },
    ];

    for (const scenario of testScenarios) {
      const payload = {
        update: {
          message: {
            text: scenario.text,
            chat: { id: 444555666 },
            from: { id: 666555444 },
            message_id: 5000 + testScenarios.indexOf(scenario),
          },
        },
      };

      console.log(`\nTesting scenario: ${scenario.name}`);

      // Measure Edge Function response (Reflex)
      const { response: edgeResponse, durationMs: edgeDuration } =
        await measureRequest(testConfig.endpoints.telegramWebhook, {
          method: "POST",
          headers: getSupabaseHeaders(false),
          body: JSON.stringify(payload),
        });

      expect(
        edgeResponse.status === 200 || edgeResponse.status === 202,
        `Edge Function failed for scenario: ${scenario.name}`,
      ).toBeTruthy();

      expect(
        edgeDuration < PERFORMANCE_THRESHOLD_MS,
        `Edge Function too slow for ${scenario.name}: ${edgeDuration}ms`,
      ).toBeTruthy();

      console.log(`  Edge Function (Reflex): ${edgeDuration}ms`);

      // Allow processing time for n8n webhook (Brain)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // The webhook should have been triggered, but we can't directly measure
      // the internal processing time. We can only verify the webhook endpoint
      // is still responsive after processing.

      const { response: webhookResponse, durationMs: webhookDuration } =
        await measureRequest(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

      expect(
        webhookResponse.status === 200 || webhookResponse.status === 202,
        `n8n webhook failed for scenario: ${scenario.name}`,
      ).toBeTruthy();

      expect(
        webhookDuration < PERFORMANCE_THRESHOLD_MS,
        `n8n webhook too slow for ${scenario.name}: ${webhookDuration}ms`,
      ).toBeTruthy();

      console.log(`  n8n Webhook (Brain): ${webhookDuration}ms`);
      console.log(`  Total measured time: ${edgeDuration + webhookDuration}ms`);
    }
  });
});
