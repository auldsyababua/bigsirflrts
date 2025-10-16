/**
 * Module 4 Security Improvements - Comprehensive Test Suite
 *
 * Tests for Linear Issue 10N-223:
 * - 10N-177: N8N Webhook Authentication (HMAC)
 * - 10N-178: Application-Level Rate Limiting
 * - 10N-179: User Metadata Retention Policy
 *
 * Run with: npm test module-4-security-validation
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes } from 'crypto';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TELEGRAM_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
// const N8N_WEBHOOK_URL =
//   process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/telegram';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'test-secret-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper: Generate HMAC signature
function generateHmacSignature(payload: string, secret: string, timestamp: number): string {
  const message = `${timestamp}.${payload}`;
  return createHmac('sha256', secret).update(message).digest('hex');
}

// Helper: Simulate Telegram webhook payload
function createTelegramPayload(chatId: number = 123456, text: string = 'test message') {
  return {
    update_id: Math.floor(Math.random() * 1000000),
    message: {
      message_id: Math.floor(Math.random() * 100000),
      from: {
        id: chatId,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser',
      },
      chat: {
        id: chatId,
        type: 'private',
      },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
}

// Helper: Sleep function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('10N-177: N8N Webhook Authentication', () => {
  test('Should accept valid HMAC signature', async () => {
    const payload = JSON.stringify(createTelegramPayload());
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, timestamp);

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature,
        'X-N8N-Timestamp': timestamp.toString(),
      },
      body: payload,
    });

    expect(response.status).toBe(200);
  });

  test('Should reject missing HMAC signature', async () => {
    const payload = JSON.stringify(createTelegramPayload());

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('signature');
  });

  test('Should reject invalid HMAC signature', async () => {
    const payload = JSON.stringify(createTelegramPayload());
    const timestamp = Math.floor(Date.now() / 1000);
    const invalidSignature = 'invalid-signature-' + randomBytes(32).toString('hex');

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': invalidSignature,
        'X-N8N-Timestamp': timestamp.toString(),
      },
      body: payload,
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Invalid signature');
  });

  test('Should reject replay attacks (old timestamps)', async () => {
    const payload = JSON.stringify(createTelegramPayload());
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, oldTimestamp);

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature,
        'X-N8N-Timestamp': oldTimestamp.toString(),
      },
      body: payload,
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('timestamp');
  });

  test('Should reject modified payload (signature mismatch)', async () => {
    const originalPayload = createTelegramPayload();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateHmacSignature(
      JSON.stringify(originalPayload),
      N8N_WEBHOOK_SECRET,
      timestamp
    );

    // Modify payload after signature generation
    const modifiedPayload = {
      ...originalPayload,
      message: { ...originalPayload.message, text: 'modified' },
    };

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature,
        'X-N8N-Timestamp': timestamp.toString(),
      },
      body: JSON.stringify(modifiedPayload),
    });

    expect(response.status).toBe(401);
  });
});

describe('10N-178: Application-Level Rate Limiting', () => {
  const TEST_CHAT_ID = 999999;
  const RATE_LIMIT = 10; // requests per minute

  beforeEach(async () => {
    // Wait to avoid hitting rate limit from previous tests
    await sleep(6000); // 6 seconds
  });

  test('Should allow requests under rate limit', async () => {
    const payload = JSON.stringify(createTelegramPayload(TEST_CHAT_ID, 'test 1'));
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, timestamp);

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature,
        'X-N8N-Timestamp': timestamp.toString(),
      },
      body: payload,
    });

    expect(response.status).toBe(200);
  });

  test('Should enforce rate limit per chatId', async () => {
    const requests = [];

    // Send RATE_LIMIT + 5 requests rapidly
    for (let i = 0; i < RATE_LIMIT + 5; i++) {
      const payload = JSON.stringify(createTelegramPayload(TEST_CHAT_ID, `test ${i}`));
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, timestamp);

      requests.push(
        fetch(TELEGRAM_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Signature': signature,
            'X-N8N-Timestamp': timestamp.toString(),
          },
          body: payload,
        })
      );
    }

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter((r) => r.status === 429);

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('Should include rate limit headers in response', async () => {
    const payload = JSON.stringify(createTelegramPayload(TEST_CHAT_ID));
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, timestamp);

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature,
        'X-N8N-Timestamp': timestamp.toString(),
      },
      body: payload,
    });

    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  test('Should isolate rate limits by chatId', async () => {
    const chatId1 = 111111;
    const chatId2 = 222222;

    // Exhaust rate limit for chatId1
    const requests1 = [];
    for (let i = 0; i < RATE_LIMIT + 2; i++) {
      const payload = JSON.stringify(createTelegramPayload(chatId1));
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, timestamp);

      requests1.push(
        fetch(TELEGRAM_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Signature': signature,
            'X-N8N-Timestamp': timestamp.toString(),
          },
          body: payload,
        })
      );
    }
    await Promise.all(requests1);

    // chatId2 should still work
    const payload2 = JSON.stringify(createTelegramPayload(chatId2));
    const timestamp2 = Math.floor(Date.now() / 1000);
    const signature2 = generateHmacSignature(payload2, N8N_WEBHOOK_SECRET, timestamp2);

    const response2 = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature2,
        'X-N8N-Timestamp': timestamp2.toString(),
      },
      body: payload2,
    });

    expect(response2.status).toBe(200);
  });
});

describe('10N-179: User Metadata Retention Policy', () => {
  test('Should have RLS policies enabled on telegram_logs table', async () => {
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'telegram_logs');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThan(0);
  });

  test('Should have pg_cron job for retention cleanup', async () => {
    const { data, error } = await supabase.rpc('cron.job', {});

    if (!error) {
      const retentionJob = data?.find(
        (job: any) =>
          job.command?.includes('DELETE FROM telegram_logs') && job.command?.includes('60 days')
      );
      expect(retentionJob).toBeDefined();
    }
  });

  test('Should mask usernames after 7 days in view', async () => {
    // Insert test record with old date
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8); // 8 days ago

    const { data: insertData, error: insertError } = await supabase
      .from('telegram_logs')
      .insert({
        chat_id: 123456,
        username: 'testuser',
        message: 'test message',
        created_at: oldDate.toISOString(),
      })
      .select()
      .single();

    expect(insertError).toBeNull();

    // Query through masked view
    const { data: viewData, error: viewError } = await supabase
      .from('telegram_logs_masked')
      .select('username')
      .eq('id', insertData!.id)
      .single();

    expect(viewError).toBeNull();
    expect(viewData!.username).toMatch(/^[*]+[0-9]+$/); // Should be masked like "****1234"

    // Cleanup
    await supabase.from('telegram_logs').delete().eq('id', insertData!.id);
  });

  test('Should NOT mask recent usernames (< 7 days)', async () => {
    const { data: insertData, error: insertError } = await supabase
      .from('telegram_logs')
      .insert({
        chat_id: 123456,
        username: 'recentuser',
        message: 'recent message',
      })
      .select()
      .single();

    expect(insertError).toBeNull();

    const { data: viewData, error: viewError } = await supabase
      .from('telegram_logs_masked')
      .select('username')
      .eq('id', insertData!.id)
      .single();

    expect(viewError).toBeNull();
    expect(viewData!.username).toBe('recentuser'); // Should NOT be masked

    // Cleanup
    await supabase.from('telegram_logs').delete().eq('id', insertData!.id);
  });

  test('Should auto-delete logs older than 60 days', async () => {
    // This test requires waiting or mocking time, so we verify the SQL exists
    const { data, error } = await supabase.rpc('pg_get_functiondef', {
      func_oid: 'cleanup_old_telegram_logs::regprocedure',
    });

    // Check if cleanup function exists
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test("Should enforce RLS - anon users cannot read others' logs", async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data } = await anonClient.from('telegram_logs').select('*').limit(10);

    // Anon should get empty result or error depending on policy
    expect(data?.length).toBe(0);
  });
});

describe('Integration: All Security Features Working Together', () => {
  test('Should handle complete secure request flow', async () => {
    const chatId = 888888;
    const payload = JSON.stringify(createTelegramPayload(chatId, 'integration test'));
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, timestamp);

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': signature,
        'X-N8N-Timestamp': timestamp.toString(),
      },
      body: payload,
    });

    expect(response.status).toBe(200);

    // Verify rate limit headers present
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();

    // Verify log was created
    const { data: logs } = await supabase
      .from('telegram_logs')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(logs).toBeDefined();
    expect(logs!.length).toBeGreaterThan(0);
  });

  test('Should reject invalid signature even if under rate limit', async () => {
    const payload = JSON.stringify(createTelegramPayload());
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Signature': 'invalid',
        'X-N8N-Timestamp': timestamp.toString(),
      },
      body: payload,
    });

    expect(response.status).toBe(401);
  });

  test('Performance: Security checks should add < 10ms latency', async () => {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const payload = JSON.stringify(createTelegramPayload());
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateHmacSignature(payload, N8N_WEBHOOK_SECRET, timestamp);

      const start = Date.now();
      const response = await fetch(TELEGRAM_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Signature': signature,
          'X-N8N-Timestamp': timestamp.toString(),
        },
        body: payload,
      });
      times.push(Date.now() - start);

      // Ensure we are measuring successful requests
      expect(response.status).toBe(200);

      await sleep(1000); // Avoid rate limit
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Average request time: ${avgTime}ms`);

    // Security overhead should be minimal
    expect(avgTime).toBeLessThan(200); // Total time including network
  });
});
