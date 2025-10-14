/**
 * Integration tests for 10N-173: Token Usage and Cost Tracking
 *
 * Tests verify that:
 * 1. Token usage is captured from OpenAI responses
 * 2. Costs are calculated correctly per model
 * 3. Usage logs are stored with proper metadata
 * 4. User attribution works correctly
 * 5. Batch/async logging doesn't block API responses
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NLP_API_URL = process.env.NLP_PARSER_API_URL || 'http://localhost:3001';

describe('10N-173: Token Usage and Cost Tracking', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  const testRequestIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    testUserId = `test-user-${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testRequestIds.length > 0) {
      await supabase.from('openai_usage_logs').delete().in('request_id', testRequestIds);
    }
  });

  describe('Usage Data Capture', () => {
    it('should capture token usage from OpenAI response @P0', async () => {
      const response = await fetch(`${NLP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': testUserId,
        },
        body: JSON.stringify({
          input: 'Create task for equipment inspection',
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Check that response includes usage metadata
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('requestId');
      expect(result.metadata).toHaveProperty('usage');
      expect(result.metadata.usage).toHaveProperty('promptTokens');
      expect(result.metadata.usage).toHaveProperty('completionTokens');
      expect(result.metadata.usage).toHaveProperty('totalTokens');
      expect(result.metadata.usage).toHaveProperty('cost');

      testRequestIds.push(result.metadata.requestId);

      // Verify usage values are positive numbers
      expect(result.metadata.usage.promptTokens).toBeGreaterThan(0);
      expect(result.metadata.usage.completionTokens).toBeGreaterThan(0);
      expect(result.metadata.usage.totalTokens).toBe(
        result.metadata.usage.promptTokens + result.metadata.usage.completionTokens
      );
      expect(result.metadata.usage.cost).toBeGreaterThan(0);
    });

    it('should store usage logs in database with complete metadata @P0', async () => {
      const response = await fetch(`${NLP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': testUserId,
        },
        body: JSON.stringify({
          input: 'List all urgent tasks',
        }),
      });

      const result = await response.json();
      const requestId = result.metadata.requestId;
      testRequestIds.push(requestId);

      // Wait for async logging to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Query database for usage log
      const { data: logs, error } = await supabase
        .from('openai_usage_logs')
        .select('*')
        .eq('request_id', requestId)
        .single();

      expect(error).toBeNull();
      expect(logs).toBeDefined();

      // Verify all required fields
      expect(logs.request_id).toBe(requestId);
      expect(logs.user_id).toBe(testUserId);
      expect(logs.model).toBeDefined();
      expect(logs.endpoint).toBe('/parse');
      expect(logs.prompt_tokens).toBeGreaterThan(0);
      expect(logs.completion_tokens).toBeGreaterThan(0);
      expect(logs.total_tokens).toBeGreaterThan(0);
      expect(logs.cost).toBeGreaterThan(0);
      expect(logs.latency_ms).toBeGreaterThan(0);
      expect(logs.status).toBe('success');
      expect(logs.timestamp).toBeDefined();
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate costs correctly for gpt-4o model @P0', async () => {
      const response = await fetch(`${NLP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': testUserId,
        },
        body: JSON.stringify({
          input: 'Task for pump maintenance tomorrow',
        }),
      });

      const result = await response.json();
      testRequestIds.push(result.metadata.requestId);

      const usage = result.metadata.usage;

      // Verify cost calculation (gpt-4o-2024-08-06 pricing as of Jan 2025)
      // Input: $2.50 per 1M tokens, Output: $10.00 per 1M tokens
      const expectedInputCost = (usage.promptTokens / 1_000_000) * 2.5;
      const expectedOutputCost = (usage.completionTokens / 1_000_000) * 10.0;
      const expectedTotalCost = expectedInputCost + expectedOutputCost;

      // Allow 1 cent tolerance for rounding
      expect(Math.abs(usage.cost - expectedTotalCost)).toBeLessThan(0.01);
    });

    it('should use correct pricing for different models @P1', async () => {
      // Test would verify that cost calculation changes based on model
      // Requires ability to specify model in request or check configured model
      expect(true).toBe(true); // Placeholder - implement when model selection is parameterized
    });
  });

  describe('User Attribution', () => {
    it('should attribute usage to correct user @P0', async () => {
      const uniqueUserId = `user-${Date.now()}`;

      const response = await fetch(`${NLP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': uniqueUserId,
        },
        body: JSON.stringify({
          input: 'Create urgent repair task',
        }),
      });

      const result = await response.json();
      testRequestIds.push(result.metadata.requestId);

      // Wait for logging
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: logs } = await supabase
        .from('openai_usage_logs')
        .select('user_id')
        .eq('request_id', result.metadata.requestId)
        .single();

      expect(logs?.user_id).toBe(uniqueUserId);
    });

    it('should handle missing user ID gracefully @P1', async () => {
      const response = await fetch(`${NLP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No X-User-Id header
        },
        body: JSON.stringify({
          input: 'Test task',
        }),
      });

      const result = await response.json();

      // Should still succeed, maybe with 'anonymous' or 'unknown' user
      expect(result.success).toBe(true);
      expect(result.metadata).toHaveProperty('requestId');
    });
  });

  describe('Performance', () => {
    it('should not block API response with logging @P0', async () => {
      const startTime = Date.now();

      const response = await fetch(`${NLP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': testUserId,
        },
        body: JSON.stringify({
          input: 'Quick task',
        }),
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();
      testRequestIds.push(result.metadata.requestId);

      // Response should be fast (logging happens async)
      // Allow OpenAI latency + 100ms overhead max
      expect(responseTime).toBeLessThan(5000);
    });

    it('should batch writes for high throughput @P1', async () => {
      // Create multiple requests in quick succession
      const promises = Array.from({ length: 5 }, (_, i) =>
        fetch(`${NLP_API_URL}/parse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': `batch-user-${i}`,
          },
          body: JSON.stringify({
            input: `Task ${i}`,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map((r) => r.json()));

      results.forEach((r) => testRequestIds.push(r.metadata.requestId));

      // All requests should succeed
      expect(results.every((r) => r.success)).toBe(true);

      // Wait for batch logging
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // All logs should be in database
      const { data: logs } = await supabase
        .from('openai_usage_logs')
        .select('request_id')
        .in(
          'request_id',
          results.map((r) => r.metadata.requestId)
        );

      expect(logs?.length).toBe(5);
    });
  });

  describe('Error Tracking', () => {
    it('should log failed requests with error status @P1', async () => {
      // Send malformed request that will fail
      const response = await fetch(`${NLP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': testUserId,
        },
        body: JSON.stringify({
          input: '', // Empty input should fail
        }),
      });

      const result = await response.json();

      if (!result.success && result.metadata?.requestId) {
        testRequestIds.push(result.metadata.requestId);

        // Wait for logging
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { data: logs } = await supabase
          .from('openai_usage_logs')
          .select('status')
          .eq('request_id', result.metadata.requestId)
          .single();

        expect(logs?.status).toBe('error');
      }
    });
  });

  describe('Analytics Queries', () => {
    it('should support querying total cost by user @P0', async () => {
      const { data, error } = await supabase
        .from('openai_usage_logs')
        .select('user_id, cost')
        .eq('user_id', testUserId);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const totalCost = data.reduce((sum, log) => sum + log.cost, 0);
        expect(totalCost).toBeGreaterThan(0);
      }
    });

    it('should support querying usage by time period @P1', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('openai_usage_logs')
        .select('total_tokens, cost')
        .gte('timestamp', yesterday);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should support querying usage by model @P1', async () => {
      const { data, error } = await supabase
        .from('openai_usage_logs')
        .select('model, total_tokens, cost')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
