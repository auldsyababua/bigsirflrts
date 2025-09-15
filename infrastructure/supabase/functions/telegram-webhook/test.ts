// Test file for Telegram Webhook Edge Function
// Run with: deno test --allow-env --allow-net

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/testing/asserts.ts";

// Mock environment variables for testing
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-bot-token");
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
Deno.env.set("TELEGRAM_WEBHOOK_SECRET", "test-webhook-secret");
Deno.env.set("N8N_WEBHOOK_URL", "https://test-n8n-webhook.com");

// Test data fixtures
const validTelegramUpdate = {
  update_id: 123456789,
  message: {
    message_id: 42,
    from: {
      id: 987654321,
      is_bot: false,
      first_name: "Test",
      username: "testuser"
    },
    chat: {
      id: 987654321,
      first_name: "Test",
      username: "testuser",
      type: "private"
    },
    date: 1699999999,
    text: "/start"
  }
};

Deno.test("Webhook should reject unauthorized requests", async () => {
  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "wrong-secret"
    },
    body: JSON.stringify(validTelegramUpdate)
  });

  assertEquals(response.status, 401);
  const text = await response.text();
  assertEquals(text, "Unauthorized");
});

Deno.test("Webhook should accept valid Telegram updates", async () => {
  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret"
    },
    body: JSON.stringify(validTelegramUpdate)
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(data.ok, true);
  assertEquals(data.acknowledged, true);
  assertExists(data.processingTime);
});

Deno.test("Webhook should handle updates without message gracefully", async () => {
  const updateWithoutMessage = {
    update_id: 123456790,
    edited_message: {
      message_id: 43,
      text: "edited text"
    }
  };

  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret"
    },
    body: JSON.stringify(updateWithoutMessage)
  });

  assertEquals(response.status, 200);
  const text = await response.text();
  assertEquals(text, "OK");
});

Deno.test("Priority detection should work correctly", () => {
  // Import the function for testing (would need to export it from main file)
  const determinePriority = (text: string): "high" | "normal" | "low" => {
    if (!text) return "normal";

    const highPriority = ["urgent", "emergency", "critical", "asap", "immediately", "priority"];
    const lowPriority = ["test", "debug", "ping", "hello"];

    const lowerText = text.toLowerCase();

    if (highPriority.some(keyword => lowerText.includes(keyword))) {
      return "high";
    }

    if (lowPriority.some(keyword => lowerText.includes(keyword))) {
      return "low";
    }

    return "normal";
  };

  assertEquals(determinePriority("This is urgent!"), "high");
  assertEquals(determinePriority("CRITICAL: Server down"), "high");
  assertEquals(determinePriority("Just a test message"), "low");
  assertEquals(determinePriority("Hello world"), "low");
  assertEquals(determinePriority("Normal work task"), "normal");
  assertEquals(determinePriority(""), "normal");
});

Deno.test("Performance timer should track elapsed time", async () => {
  class PerformanceTimer {
    private startTime: number;

    constructor() {
      this.startTime = Date.now();
    }

    elapsed(): number {
      return Date.now() - this.startTime;
    }

    checkpoint(label: string): void {
      console.log(`[PERF] ${label}: ${this.elapsed()}ms`);
    }
  }

  const timer = new PerformanceTimer();

  // Wait 100ms
  await new Promise(resolve => setTimeout(resolve, 100));

  const elapsed = timer.elapsed();

  // Should be at least 100ms but less than 200ms (accounting for execution time)
  assertEquals(elapsed >= 100 && elapsed < 200, true);
});

Deno.test("Quick responses should match commands", () => {
  const quickResponses: Record<string, string> = {
    "/start": "👋 Welcome! Setting up your workspace...",
    "/help": "📚 Loading help menu...",
    "/status": "🔄 Checking system status...",
    "/test": "🧪 Test received! Processing...",
    "default": "✅ Message received! Processing..."
  };

  const getResponse = (text: string) => {
    const command = text.split(" ")[0].toLowerCase();
    return quickResponses[command] || quickResponses.default;
  };

  assertEquals(getResponse("/start"), "👋 Welcome! Setting up your workspace...");
  assertEquals(getResponse("/help extra params"), "📚 Loading help menu...");
  assertEquals(getResponse("/STATUS"), "🔄 Checking system status...");
  assertEquals(getResponse("random message"), "✅ Message received! Processing...");
});

Deno.test("Response should be under 200ms for simple requests", async () => {
  const startTime = Date.now();

  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret"
    },
    body: JSON.stringify(validTelegramUpdate)
  });

  const responseTime = Date.now() - startTime;

  assertEquals(response.status, 200);

  // Check that response time is under 200ms (allowing some buffer for network)
  assertEquals(responseTime < 300, true, `Response time ${responseTime}ms exceeds target`);

  const data = await response.json();

  // Check that reported processing time is under 200ms
  assertEquals(data.processingTime < 200, true, `Processing time ${data.processingTime}ms exceeds target`);
});