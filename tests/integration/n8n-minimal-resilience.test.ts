/**
 * Minimal n8n Operational Resilience Tests
 * Tests what we can verify without Docker container manipulation
 */

import { describe, it, expect } from "vitest";
import axios from "axios";

const N8N_HOST = process.env.N8N_HOST || "localhost";
const N8N_PORT = process.env.N8N_PORT || "5678";
const N8N_BASE_URL = `http://${N8N_HOST}:${N8N_PORT}`;
const HEALTH_URL = `${N8N_BASE_URL}/healthz`;
const WEBHOOK_URL = `${N8N_BASE_URL}/webhook-test`;

describe("n8n Minimal Resilience Tests", () => {
  describe("HEALTH-ENDPOINT-005: Health check reliability", () => {
    it("should respond correctly during normal operation", async () => {
      const response = await axios.get(HEALTH_URL);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status", "ok");
    });

    it("should have sub-500ms response time", async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await axios.get(HEALTH_URL);
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;
      console.log(
        `Average health check response time: ${avgResponseTime.toFixed(1)}ms`,
      );

      expect(avgResponseTime).toBeLessThan(500);

      // No single response should exceed 1000ms
      const maxResponseTime = Math.max(...measurements);
      expect(maxResponseTime).toBeLessThan(1000);
    });

    it("should handle rapid successive health checks", async () => {
      const monitoringChecks = [];

      // Rapid succession health checks (monitoring pattern)
      for (let i = 0; i < 5; i++) {
        monitoringChecks.push(axios.get(HEALTH_URL, { timeout: 2000 }));
      }

      const results = await Promise.allSettled(monitoringChecks);
      const successful = results.filter((r) => r.status === "fulfilled");

      // All rapid checks should succeed
      expect(successful.length).toBe(5);
    });
  });

  describe("WEBHOOK-TIMEOUT-003: Concurrent request handling", () => {
    it("should handle multiple concurrent webhooks", async () => {
      const concurrentRequests = 5;
      const webhookPromises = [];

      console.log(`Sending ${concurrentRequests} concurrent webhooks...`);

      for (let i = 0; i < concurrentRequests; i++) {
        webhookPromises.push(
          axios
            .post(
              `${WEBHOOK_URL}/concurrent-${i}`,
              { test: `concurrent_${i}`, timestamp: Date.now() },
              {
                timeout: 5000,
                validateStatus: () => true, // Accept any status
              },
            )
            .catch((error) => ({
              status: error.code === "ECONNABORTED" ? "timeout" : "error",
              error: error.message,
            })),
        );
      }

      const results = await Promise.allSettled(webhookPromises);
      const successful = results.filter(
        (r) =>
          r.status === "fulfilled" &&
          r.value.status &&
          r.value.status >= 200 &&
          r.value.status < 500,
      );

      console.log(
        `${successful.length}/${concurrentRequests} webhooks processed`,
      );

      // At least some should succeed (system is responsive)
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Baseline Tests", () => {
    it("should maintain consistent response times under light load", async () => {
      const iterations = 10;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        try {
          await axios.post(
            `${WEBHOOK_URL}/perf-test-${i}`,
            { iteration: i, timestamp: Date.now() },
            { timeout: 5000, validateStatus: () => true },
          );
        } catch (error) {
          // Continue even if some fail
        }

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const avgResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(
        `Average webhook response time: ${avgResponseTime.toFixed(1)}ms`,
      );

      // Basic performance check
      expect(avgResponseTime).toBeLessThan(10000); // 10 second average
    });

    it("should maintain health endpoint availability during load", async () => {
      // Send some load
      const loadPromises = [];
      for (let i = 0; i < 3; i++) {
        loadPromises.push(
          axios
            .post(
              `${WEBHOOK_URL}/load-${i}`,
              { load_test: true },
              { timeout: 5000, validateStatus: () => true },
            )
            .catch(() => null),
        );
      }

      // Check health during load
      const healthPromise = axios.get(HEALTH_URL, { timeout: 2000 });

      // Wait for health check (not load tests)
      const healthResponse = await healthPromise;
      expect(healthResponse.status).toBe(200);

      // Clean up load tests
      await Promise.allSettled(loadPromises);
    });
  });

  describe("Configuration Validation", () => {
    it("should have n8n accessible on expected port", async () => {
      try {
        const response = await axios.get(`${N8N_BASE_URL}/`, {
          timeout: 2000,
          maxRedirects: 0,
          validateStatus: (status) => status < 500,
        });

        // n8n should respond (might redirect to login)
        expect(response.status).toBeLessThan(500);
      } catch (error: any) {
        if (error.code === "ECONNREFUSED") {
          throw new Error(`n8n not accessible on ${N8N_HOST}:${N8N_PORT}`);
        }
        // Other errors might be OK (like redirects)
      }
    });

    it("should have consistent health check format", async () => {
      const response = await axios.get(HEALTH_URL);

      // Verify response structure
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.data).toBeDefined();
      expect(typeof response.data).toBe("object");

      // Should have status field
      if (response.data.status) {
        expect(["ok", "error"]).toContain(response.data.status);
      }
    });
  });
});

// Export test summary for documentation
export const minimalTestSummary = {
  "HEALTH-ENDPOINT-005":
    "Partial - Testing response time and availability only",
  "WEBHOOK-TIMEOUT-003":
    "Partial - Testing concurrent handling without timeout simulation",
  "CONTAINER-RESILIENCE-001":
    "Skipped - Requires Docker container manipulation",
  "DATABASE-CONNECTION-002": "Skipped - Requires network manipulation",
  "MEMORY-PRESSURE-004": "Skipped - Requires Docker stats access",
};
