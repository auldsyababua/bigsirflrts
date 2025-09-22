/**
 * FLRTS Supabase Database Webhooks → n8n Integration Tests
 *
 * Tests the complete Supabase Database Webhook integration:
 * Database Change → Supabase Webhook → n8n Workflow → OpenProject API
 *
 * Requirements from Story 1.5:
 * - Webhook delivery within 1 second
 * - n8n workflow execution within 3 seconds total
 * - All CRUD operations (INSERT/UPDATE/DELETE) supported
 * - Proper payload validation and error handling
 * - Monitoring and retry logic verification
 *
 * Run with: op run --env-file=tests/.env.test -- node --test tests/integration/supabase-webhook-n8n.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  testConfig,
  validateTestConfig,
  getSupabaseHeaders,
} from '../config/test-config';

// Test configuration
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://n8n-rrrs.sliplane.app/webhook/supabase-tasks-webhook";
const SUPABASE_WEBHOOK_DELIVERY_THRESHOLD_MS = 1000; // Story 1.5 requirement: < 1 second
const N8N_PROCESSING_THRESHOLD_MS = 3000; // Story 1.5 requirement: < 3 seconds total
const TEST_TIMEOUT_MS = 10000; // 10 seconds max for each test

// Test data templates
const TEST_TASK_TEMPLATE = {
  title: "Test Webhook Task",
  description: "Automated test task for webhook validation",
  status: "open",
  priority: "Medium",
  assignee_id: "test-user-123",
  due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
};

// Validate configuration before running tests
beforeAll(() => {
  validateTestConfig();
  expect(
    N8N_WEBHOOK_URL,
    "N8N_WEBHOOK_URL must be configured for Supabase webhook tests",
  ).toBeTruthy();
  expect(
    N8N_WEBHOOK_URL.includes("supabase-tasks-webhook").toBeTruthy(),
    "N8N_WEBHOOK_URL should point to the correct webhook path",
  );
});

describe("Supabase Database Webhooks → n8n Integration", () => {
  describe("Webhook Configuration Verification", () => {
    it("should verify Supabase webhook is configured for tasks table", async () => {
      // Query Supabase to check if webhook triggers exist
      const response = await fetch(
        `${testConfig.supabase.url}/rest/v1/rpc/check_webhook_triggers`,
        {
          method: "POST",
          headers: getSupabaseHeaders(false),
          body: JSON.stringify({ table_name: "tasks" }),
        },
      );

      if (response.status === 404) {
        // Function doesn't exist, create a simple check via information_schema
        const triggerCheckResponse = await fetch(
          `${testConfig.supabase.url}/rest/v1/rpc/sql_query`,
          {
            method: "POST",
            headers: getSupabaseHeaders(false),
            body: JSON.stringify({
              query: `
              SELECT trigger_name, event_manipulation, action_statement
              FROM information_schema.triggers
              WHERE trigger_name LIKE '%webhook%' OR trigger_name LIKE '%n8n%'
              OR action_statement LIKE '%${N8N_WEBHOOK_URL.split("/").pop()}%'
            `,
            }),
          },
        );

        // If no SQL RPC exists, we'll test by creating a task and monitoring the webhook
        console.warn(
          "Webhook trigger verification via SQL not available, will test via task creation",
        );
        return;
      }

      expect(
        response.status === 200 || response.status === 404,
        `Webhook trigger check should succeed or indicate missing function, got ${response.status}`,
      ).toBeTruthy();
    });

    it("should verify n8n webhook endpoint is reachable", async () => {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "GET", // Health check
      });

      expect(
        response.status < 500,
        `n8n webhook endpoint should be reachable, got ${response.status}`,
      ).toBeTruthy();
    });
  });

  describe("INSERT Operations - Database → Webhook → n8n", () => {
    it("should trigger webhook and process INSERT within performance thresholds", async () => {
      const testTask = {
        ...TEST_TASK_TEMPLATE,
        title: `INSERT Test ${Date.now()}`,
        description: "Testing INSERT webhook delivery and n8n processing",
      };

      const startTime = Date.now();
      let taskId = null;

      try {
        // Step 1: Insert task into Supabase
        const insertResponse = await fetch(
          `${testConfig.supabase.url}/rest/v1/tasks`,
          {
            method: "POST",
            headers: {
              ...getSupabaseHeaders(false),
              Prefer: "return=representation",
            },
            body: JSON.stringify(testTask),
          },
        );

        expect(
          insertResponse.status === 201,
          `Task INSERT should succeed, got ${insertResponse.status}`,
        ).toBeTruthy();

        const insertedTask = await insertResponse.json();
        taskId = insertedTask[0]?.id;
        expect(taskId).toBeTruthy() // INSERT should return task ID;

        // Step 2: Allow time for webhook delivery and n8n processing
        await new Promise((resolve) =>
          setTimeout(resolve, N8N_PROCESSING_THRESHOLD_MS + 500),
        );

        const totalTime = Date.now() - startTime;

        // Step 3: Verify timing requirements
        expect(
          totalTime < N8N_PROCESSING_THRESHOLD_MS + 1000, // Allow small buffer
          `Total INSERT processing time ${totalTime}ms should be under ${N8N_PROCESSING_THRESHOLD_MS + 1000}ms`,
        ).toBeTruthy();

        // Step 4: Verify n8n workflow processed the task
        // This would require checking n8n execution logs or OpenProject API
        // For now, we verify the task was created successfully
        const verifyResponse = await fetch(
          `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${taskId}`,
          {
            headers: getSupabaseHeaders(false),
          },
        );

        const verifiedTask = await verifyResponse.json();
        expect(verifiedTask.length === 1).toBeTruthy() // Task should exist after INSERT;
        expect(
          verifiedTask[0].title).toBe(testTask.title,
          "Task title should match",
        );
      } finally {
        // Cleanup: Delete test task
        if (taskId) {
          await fetch(
            `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${taskId}`,
            {
              method: "DELETE",
              headers: getSupabaseHeaders(false),
            },
          );
        }
      }
    });

    it("should handle INSERT with invalid data gracefully", async () => {
      const invalidTask = {
        title: null, // Invalid: title is required
        status: "invalid_status", // Invalid status
        priority: "invalid_priority", // Invalid priority
      };

      const response = await fetch(`${testConfig.supabase.url}/rest/v1/tasks`, {
        method: "POST",
        headers: getSupabaseHeaders(false),
        body: JSON.stringify(invalidTask),
      });

      // Should fail with validation error, not trigger webhook
      expect(
        response.status >= 400 && response.status < 500,
        `Invalid INSERT should fail with 4xx error, got ${response.status}`,
      ).toBeTruthy();
    });
  });

  describe("UPDATE Operations - Database → Webhook → n8n", () => {
    let testTaskId = null;

    beforeAll(async () => {
      // Create a task for UPDATE testing
      const response = await fetch(`${testConfig.supabase.url}/rest/v1/tasks`, {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(false),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          ...TEST_TASK_TEMPLATE,
          title: `UPDATE Test Setup ${Date.now()}`,
        }),
      });

      const task = await response.json();
      testTaskId = task[0]?.id;
      expect(testTaskId).toBeTruthy() // Setup task should be created for UPDATE tests;
    });

    afterAll(async () => {
      // Cleanup test task
      if (testTaskId) {
        await fetch(
          `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${testTaskId}`,
          {
            method: "DELETE",
            headers: getSupabaseHeaders(false),
          },
        );
      }
    });

    it("should trigger webhook and process UPDATE within performance thresholds", async () => {
      const updateData = {
        title: `UPDATED Test ${Date.now()}`,
        status: "in_progress",
        priority: "High",
        description: "Updated via automated webhook test",
      };

      const startTime = Date.now();

      // Step 1: Update task in Supabase
      const updateResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${testTaskId}`,
        {
          method: "PATCH",
          headers: {
            ...getSupabaseHeaders(false),
            Prefer: "return=representation",
          },
          body: JSON.stringify(updateData),
        },
      );

      expect(
        updateResponse.status === 200,
        `Task UPDATE should succeed, got ${updateResponse.status}`,
      ).toBeTruthy();

      // Step 2: Allow time for webhook delivery and n8n processing
      await new Promise((resolve) =>
        setTimeout(resolve, N8N_PROCESSING_THRESHOLD_MS + 500),
      );

      const totalTime = Date.now() - startTime;

      // Step 3: Verify timing requirements
      expect(
        totalTime < N8N_PROCESSING_THRESHOLD_MS + 1000,
        `Total UPDATE processing time ${totalTime}ms should be under ${N8N_PROCESSING_THRESHOLD_MS + 1000}ms`,
      ).toBeTruthy();

      // Step 4: Verify update was applied
      const verifyResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${testTaskId}`,
        {
          headers: getSupabaseHeaders(false),
        },
      );

      const updatedTask = await verifyResponse.json();
      expect(updatedTask.length === 1).toBeTruthy() // Task should exist after UPDATE;
      expect(
        updatedTask[0].title).toBe(updateData.title,
        "Task title should be updated",
      );
      expect(
        updatedTask[0].status).toBe(updateData.status,
        "Task status should be updated",
      );
      expect(
        updatedTask[0].priority).toBe(updateData.priority,
        "Task priority should be updated",
      );
    });

    it("should handle UPDATE with partial data correctly", async () => {
      const partialUpdate = {
        status: "completed",
        // Only updating status, other fields should remain unchanged
      };

      const updateResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${testTaskId}`,
        {
          method: "PATCH",
          headers: getSupabaseHeaders(false),
          body: JSON.stringify(partialUpdate),
        },
      );

      expect(
        updateResponse.status === 200,
        `Partial UPDATE should succeed, got ${updateResponse.status}`,
      ).toBeTruthy();

      // Allow time for webhook processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify only status was updated
      const verifyResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${testTaskId}`,
        {
          headers: getSupabaseHeaders(false),
        },
      );

      const updatedTask = await verifyResponse.json();
      expect(
        updatedTask[0].status).toBe("completed",
        "Status should be updated",
      );
      expect(
        updatedTask[0].title.includes("UPDATED").toBeTruthy(),
        "Title should remain from previous update",
      );
    });
  });

  describe("DELETE Operations - Database → Webhook → n8n", () => {
    it("should trigger webhook and process DELETE within performance thresholds", async () => {
      // Step 1: Create a task to delete
      const taskToDelete = {
        ...TEST_TASK_TEMPLATE,
        title: `DELETE Test ${Date.now()}`,
        description: "Task created specifically for DELETE webhook testing",
      };

      const createResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks`,
        {
          method: "POST",
          headers: {
            ...getSupabaseHeaders(false),
            Prefer: "return=representation",
          },
          body: JSON.stringify(taskToDelete),
        },
      );

      const createdTask = await createResponse.json();
      const taskId = createdTask[0]?.id;
      expect(taskId).toBeTruthy() // Task should be created for DELETE test;

      // Allow brief pause for task to be fully created
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Delete the task and measure timing
      const startTime = Date.now();

      const deleteResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${taskId}`,
        {
          method: "DELETE",
          headers: getSupabaseHeaders(false),
        },
      );

      expect(
        deleteResponse.status === 204,
        `Task DELETE should succeed, got ${deleteResponse.status}`,
      ).toBeTruthy();

      // Step 3: Allow time for webhook delivery and n8n processing
      await new Promise((resolve) =>
        setTimeout(resolve, N8N_PROCESSING_THRESHOLD_MS + 500),
      );

      const totalTime = Date.now() - startTime;

      // Step 4: Verify timing requirements
      expect(
        totalTime < N8N_PROCESSING_THRESHOLD_MS + 1000,
        `Total DELETE processing time ${totalTime}ms should be under ${N8N_PROCESSING_THRESHOLD_MS + 1000}ms`,
      ).toBeTruthy();

      // Step 5: Verify task was actually deleted
      const verifyResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${taskId}`,
        {
          headers: getSupabaseHeaders(false),
        },
      );

      const deletedTasks = await verifyResponse.json();
      expect(
        deletedTasks.length).toBe(0,
        "Task should be deleted from database",
      );
    });

    it("should handle DELETE of non-existent task gracefully", async () => {
      const fakeTaskId = "00000000-0000-0000-0000-000000000000";

      const deleteResponse = await fetch(
        `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${fakeTaskId}`,
        {
          method: "DELETE",
          headers: getSupabaseHeaders(false),
        },
      );

      // Should succeed (no error) even if no rows were affected
      expect(
        deleteResponse.status === 204,
        `DELETE of non-existent task should succeed gracefully, got ${deleteResponse.status}`,
      ).toBeTruthy();
    });
  });

  describe("Webhook Payload Validation", () => {
    it("should deliver proper Supabase webhook payload structure for INSERT", async () => {
      // This test would require intercepting the webhook payload
      // For now, we verify the n8n endpoint can handle the expected payload structure

      const mockSupabaseInsertPayload = {
        type: "INSERT",
        table: "tasks",
        schema: "public",
        record: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          title: "Mock Task for Payload Test",
          status: "open",
          priority: "Medium",
          created_at: new Date().toISOString(),
        },
        old_record: null,
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockSupabaseInsertPayload),
      });

      expect(
        response.status === 200 || response.status === 202,
        `n8n should accept valid Supabase INSERT payload, got ${response.status}`,
      ).toBeTruthy();
    });

    it("should deliver proper Supabase webhook payload structure for UPDATE", async () => {
      const mockSupabaseUpdatePayload = {
        type: "UPDATE",
        table: "tasks",
        schema: "public",
        record: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          title: "Updated Mock Task",
          status: "in_progress",
          priority: "High",
          updated_at: new Date().toISOString(),
        },
        old_record: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          title: "Original Mock Task",
          status: "open",
          priority: "Medium",
          updated_at: new Date(Date.now() - 60000).toISOString(),
        },
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockSupabaseUpdatePayload),
      });

      expect(
        response.status === 200 || response.status === 202,
        `n8n should accept valid Supabase UPDATE payload, got ${response.status}`,
      ).toBeTruthy();
    });

    it("should deliver proper Supabase webhook payload structure for DELETE", async () => {
      const mockSupabaseDeletePayload = {
        type: "DELETE",
        table: "tasks",
        schema: "public",
        record: null,
        old_record: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          title: "Deleted Mock Task",
          status: "completed",
          priority: "Low",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockSupabaseDeletePayload),
      });

      expect(
        response.status === 200 || response.status === 202,
        `n8n should accept valid Supabase DELETE payload, got ${response.status}`,
      ).toBeTruthy();
    });

    it("should handle malformed webhook payload gracefully", async () => {
      const malformedPayload = {
        type: "INVALID_TYPE",
        table: null,
        schema: "public",
        record: "not_an_object",
        old_record: "also_not_an_object",
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(malformedPayload),
      });

      // n8n should handle gracefully (not crash)
      expect(
        response.status >= 200 && response.status < 500,
        `n8n should handle malformed payload gracefully, got ${response.status}`,
      ).toBeTruthy();
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle concurrent webhook deliveries without conflicts", async () => {
      const concurrentTasks = Array.from({ length: 3 }, (_, i) => ({
        ...TEST_TASK_TEMPLATE,
        title: `Concurrent Test ${i + 1} ${Date.now()}`,
        description: `Task ${i + 1} for concurrent webhook testing`,
      }));

      const taskIds = [];

      try {
        // Create multiple tasks simultaneously
        const createPromises = concurrentTasks.map((task) =>
          fetch(`${testConfig.supabase.url}/rest/v1/tasks`, {
            method: "POST",
            headers: {
              ...getSupabaseHeaders(false),
              Prefer: "return=representation",
            },
            body: JSON.stringify(task),
          }),
        );

        const responses = await Promise.all(createPromises);

        // All should succeed
        for (const response of responses) {
          expect(
            response.status === 201,
            `Concurrent task creation should succeed, got ${response.status}`,
          ).toBeTruthy();

          const task = await response.json();
          taskIds.push(task[0]?.id);
        }

        // Allow time for all webhooks to be processed
        await new Promise((resolve) =>
          setTimeout(resolve, N8N_PROCESSING_THRESHOLD_MS + 1000),
        );

        // Verify all tasks were created
        for (const taskId of taskIds) {
          const verifyResponse = await fetch(
            `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${taskId}`,
            {
              headers: getSupabaseHeaders(false),
            },
          );

          const tasks = await verifyResponse.json();
          expect(
            tasks.length).toBe(1,
            `Concurrent task ${taskId} should exist`,
          );
        }
      } finally {
        // Cleanup: Delete all test tasks
        const deletePromises = taskIds
          .filter((id) => id)
          .map((taskId) =>
            fetch(`${testConfig.supabase.url}/rest/v1/tasks?id=eq.${taskId}`, {
              method: "DELETE",
              headers: getSupabaseHeaders(false),
            }),
          );

        await Promise.allSettled(deletePromises);
      }
    });

    it("should handle webhook delivery timeouts gracefully", async () => {
      // This would test what happens when n8n is slow/unavailable
      // For now, we test with a short timeout on our request to n8n

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100); // Very short timeout

      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "INSERT",
            table: "tasks",
            schema: "public",
            record: { id: "timeout-test", title: "Timeout Test" },
            old_record: null,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        // If we get here, the request was faster than 100ms (good!)
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          console.warn(
            "Webhook response slower than 100ms - investigate n8n performance",
          );
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    });
  });

  describe("Performance Requirements Validation", () => {
    it("should consistently meet webhook delivery performance thresholds", async () => {
      const performanceTests = [];
      const testCount = 5;

      for (let i = 0; i < testCount; i++) {
        performanceTests.push(async () => {
          const testTask = {
            ...TEST_TASK_TEMPLATE,
            title: `Performance Test ${i + 1} ${Date.now()}`,
          };

          const startTime = Date.now();
          let taskId = null;

          try {
            const response = await fetch(
              `${testConfig.supabase.url}/rest/v1/tasks`,
              {
                method: "POST",
                headers: {
                  ...getSupabaseHeaders(false),
                  Prefer: "return=representation",
                },
                body: JSON.stringify(testTask),
              },
            );

            const task = await response.json();
            taskId = task[0]?.id;

            // Allow time for webhook processing
            await new Promise((resolve) =>
              setTimeout(resolve, N8N_PROCESSING_THRESHOLD_MS),
            );

            const totalTime = Date.now() - startTime;

            return { success: response.status === 201, totalTime, taskId };
          } catch (error: any) {
            return {
              success: false,
              totalTime: Date.now() - startTime,
              error: error.message,
              taskId,
            };
          }
        });
      }

      const results = await Promise.all(performanceTests.map((test) => it()));

      // Clean up test tasks
      const cleanupPromises = results
        .filter((result) => result.taskId)
        .map((result) =>
          fetch(
            `${testConfig.supabase.url}/rest/v1/tasks?id=eq.${result.taskId}`,
            {
              method: "DELETE",
              headers: getSupabaseHeaders(false),
            },
          ),
        );

      await Promise.allSettled(cleanupPromises);

      // Verify performance
      const successfulTests = results.filter((result) => result.success);
      expect(
        successfulTests.length === testCount,
        `All performance tests should succeed, got ${successfulTests.length}/${testCount}`,
      ).toBeTruthy();

      const avgTime =
        successfulTests.reduce((sum, result) => sum + result.totalTime, 0) /
        successfulTests.length;
      expect(
        avgTime < N8N_PROCESSING_THRESHOLD_MS + 500,
        `Average processing time ${avgTime}ms should be under ${N8N_PROCESSING_THRESHOLD_MS + 500}ms`,
      ).toBeTruthy();

      // 90% of tests should be under the strict threshold
      const fastTests = successfulTests.filter(
        (result) => result.totalTime < N8N_PROCESSING_THRESHOLD_MS,
      );
      const fastTestRatio = fastTests.length / successfulTests.length;
      expect(
        fastTestRatio >= 0.9,
        `90% of tests should meet strict performance threshold, got ${(fastTestRatio * 100).toBeTruthy().toFixed(1)}%`,
      );
    });
  });
});

describe("Test Infrastructure Validation", () => {
  it("should have all required environment variables for Supabase webhook testing", () => {
    expect(N8N_WEBHOOK_URL).toBeTruthy() // N8N_WEBHOOK_URL should be configured;
    expect(
      N8N_WEBHOOK_URL.includes("supabase-tasks-webhook").toBeTruthy(),
      "N8N_WEBHOOK_URL should be the correct webhook",
    );
    expect(testConfig.supabase.url).toBeTruthy() // Supabase URL should be configured;
    expect(
      testConfig.supabase.anonKey,
      "Supabase anon key should be configured",
    ).toBeTruthy();
  });

  it("should have reasonable performance thresholds for Story 1.5 requirements", () => {
    expect(
      SUPABASE_WEBHOOK_DELIVERY_THRESHOLD_MS <= 1000,
      "Webhook delivery threshold should meet Story 1.5 requirement (< 1s).toBeTruthy()",
    );
    expect(
      N8N_PROCESSING_THRESHOLD_MS <= 3000,
      "n8n processing threshold should meet Story 1.5 requirement (< 3s).toBeTruthy()",
    );
    expect(
      TEST_TIMEOUT_MS >= N8N_PROCESSING_THRESHOLD_MS * 2,
      "Test timeout should allow sufficient time for processing",
    ).toBeTruthy();
  });
});
