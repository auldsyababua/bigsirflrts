/**
 * Simple health check test to verify n8n is accessible
 */

import { describe, it, expect } from "vitest";
import axios from "axios";

const N8N_HOST = process.env.N8N_HOST || "localhost";
const N8N_PORT = process.env.N8N_PORT || "5678";
const N8N_BASE_URL = `http://${N8N_HOST}:${N8N_PORT}`;
const HEALTH_URL = `${N8N_BASE_URL}/healthz`;

describe("n8n Health Check", () => {
  it("should respond to health check endpoint", async () => {
    try {
      const response = await axios.get(HEALTH_URL, { timeout: 5000 });
      console.log("Health check response:", response.status);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.error("Health check failed:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  });

  it("should return valid health data", async () => {
    const response = await axios.get(HEALTH_URL, { timeout: 5000 });
    expect(response.data).toBeDefined();
    console.log("Health data:", JSON.stringify(response.data, null, 2));
  });

  it("should respond within reasonable time", async () => {
    const startTime = Date.now();
    await axios.get(HEALTH_URL, { timeout: 5000 });
    const responseTime = Date.now() - startTime;

    console.log(`Health check response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });
});
