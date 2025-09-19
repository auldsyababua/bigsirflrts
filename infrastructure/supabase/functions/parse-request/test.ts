// Test file for Parse Request Edge Function
// Run with: deno test --allow-env --allow-net

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/testing/asserts.ts";

// Mock environment variables for testing
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
Deno.env.set("OPENAI_API_KEY", "test-openai-key");
Deno.env.set("N8N_WEBHOOK_URL", "https://test-n8n-webhook.com");

// Test helper functions
const attemptQuickParse = (input: string): any | null => {
  const SIMPLE_PATTERNS = {
    CREATE_TASK: /^(create|add|new)\s+(task|item|work)\s+(.+)/i,
    DUE_DATE:
      /(due|by|before|until)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    ASSIGNEE: /@(\w+)/g,
    PRIORITY: /(urgent|high|medium|low|critical)/i,
    PROJECT: /#(\w+)/g,
  };

  const createMatch = input.match(SIMPLE_PATTERNS.CREATE_TASK);
  if (!createMatch) return null;

  const taskDescription = createMatch[3];

  // Extract components
  const assignees = [...input.matchAll(SIMPLE_PATTERNS.ASSIGNEE)].map(
    (m) => m[1],
  );
  const projects = [...input.matchAll(SIMPLE_PATTERNS.PROJECT)].map(
    (m) => m[1],
  );
  const priorityMatch = input.match(SIMPLE_PATTERNS.PRIORITY);
  const dueDateMatch = input.match(SIMPLE_PATTERNS.DUE_DATE);

  // Build parsed result
  const parsed = {
    operation: "CREATE",
    type: "TASK",
    subject: taskDescription.replace(/@\w+/g, "").replace(/#\w+/g, "").trim(),
    assignees: assignees.length > 0 ? assignees : undefined,
    projects: projects.length > 0 ? projects : undefined,
    priority: priorityMatch ? normalizePriority(priorityMatch[1]) : "normal",
    dueDate: dueDateMatch ? parseDueDate(dueDateMatch[2]) : undefined,
    confidence: calculateConfidence(input, assignees.length, projects.length),
    raw: input,
  };

  // Only return if we have reasonable confidence
  return parsed.confidence >= 0.7 ? parsed : null;
};

const normalizePriority = (priority: string): string => {
  const p = priority.toLowerCase();
  if (p === "urgent" || p === "critical") return "high";
  if (p === "low") return "low";
  return "normal";
};

const parseDueDate = (dateStr: string): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateMap: Record<string, Date> = {
    today: today,
    tomorrow: tomorrow,
  };

  // Add weekdays
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const currentDay = today.getDay();

  weekdays.forEach((day, index) => {
    const daysUntil = (index - currentDay + 7) % 7 || 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    dateMap[day] = targetDate;
  });

  const targetDate = dateMap[dateStr.toLowerCase()];
  return targetDate ? targetDate.toISOString().split("T")[0] : dateStr;
};

const calculateConfidence = (
  input: string,
  assigneeCount: number,
  projectCount: number,
): number => {
  let confidence = 0.5;

  if (assigneeCount > 0) confidence += 0.2;
  if (projectCount > 0) confidence += 0.1;
  if (input.match(/(due|by|before|until)/i)) confidence += 0.1;
  if (input.match(/(urgent|high|medium|low|critical)/i)) confidence += 0.1;

  if (input.length < 10) confidence -= 0.2;
  if (input.length > 200) confidence -= 0.1;

  return Math.min(Math.max(confidence, 0), 1);
};

// Tests
Deno.test("Should handle OPTIONS request for CORS", async () => {
  const response = await fetch("http://localhost:8000/", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  assertEquals(response.status, 200);
  const text = await response.text();
  assertEquals(text, "ok");
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
});

Deno.test("Should reject requests without authorization", async () => {
  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: "Create task for testing" }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.error, "Missing authorization header");
});

Deno.test("Should reject requests without input", async () => {
  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify({ context: {} }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertEquals(data.error, "Input text is required");
});

Deno.test("Quick parse should handle simple task creation", () => {
  const result = attemptQuickParse("Create task Review PR for @john #backend");

  assertExists(result);
  assertEquals(result.operation, "CREATE");
  assertEquals(result.type, "TASK");
  assertEquals(result.subject, "Review PR for");
  assertEquals(result.assignees, ["john"]);
  assertEquals(result.projects, ["backend"]);
  assertEquals(result.priority, "normal");
});

Deno.test("Quick parse should detect priority", () => {
  const urgentResult = attemptQuickParse("Create task urgent bug fix @alice");
  assertExists(urgentResult);
  assertEquals(urgentResult.priority, "high");

  const lowResult = attemptQuickParse("Create task low priority cleanup");
  assertExists(lowResult);
  assertEquals(lowResult.priority, "low");
});

Deno.test("Quick parse should parse due dates", () => {
  const todayResult = attemptQuickParse("Create task Submit report due today");
  assertExists(todayResult);
  assertExists(todayResult.dueDate);

  const tomorrowResult = attemptQuickParse("Add task Meeting prep by tomorrow");
  assertExists(tomorrowResult);
  assertExists(tomorrowResult.dueDate);

  const weekdayResult = attemptQuickParse("New task Presentation due friday");
  assertExists(weekdayResult);
  assertExists(weekdayResult.dueDate);
});

Deno.test("Quick parse should return null for non-matching patterns", () => {
  const result1 = attemptQuickParse("Just a random message");
  assertEquals(result1, null);

  const result2 = attemptQuickParse("Update existing task");
  assertEquals(result2, null);

  const result3 = attemptQuickParse("Delete task #123");
  assertEquals(result3, null);
});

Deno.test("Priority normalization should work correctly", () => {
  assertEquals(normalizePriority("urgent"), "high");
  assertEquals(normalizePriority("critical"), "high");
  assertEquals(normalizePriority("URGENT"), "high");
  assertEquals(normalizePriority("low"), "low");
  assertEquals(normalizePriority("medium"), "normal");
  assertEquals(normalizePriority("random"), "normal");
});

Deno.test("Confidence calculation should reflect input quality", () => {
  // High confidence: has assignee and project
  const high = calculateConfidence(
    "Create task Review PR for @john #backend",
    1,
    1,
  );
  assertEquals(high >= 0.8, true);

  // Medium confidence: basic task
  const medium = calculateConfidence("Create task Basic work item", 0, 0);
  assertEquals(medium >= 0.5 && medium < 0.8, true);

  // Low confidence: very short input
  const low = calculateConfidence("Create task x", 0, 0);
  assertEquals(low < 0.5, true);
});

Deno.test("Date parsing should handle relative dates", () => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  assertEquals(parseDueDate("today"), todayStr);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  assertEquals(parseDueDate("tomorrow"), tomorrowStr);

  // Test weekday parsing
  const result = parseDueDate("monday");
  assertExists(result);
  assertEquals(result.length, 10); // Should be YYYY-MM-DD format
});

Deno.test("Full parse request with quick parse pattern", async () => {
  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify({
      input: "Create task Review documentation @sarah #docs urgent",
      context: { userId: "test-user" },
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(data.parseType, "quick");
  assertExists(data.data);
  assertEquals(data.data.operation, "CREATE");
  assertEquals(data.data.assignees, ["sarah"]);
  assertEquals(data.data.projects, ["docs"]);
  assertEquals(data.data.priority, "high");
});

Deno.test("Complex parse should queue to n8n", async () => {
  const response = await fetch("http://localhost:8000/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify({
      input:
        "Schedule a meeting with the team next week to discuss Q4 planning and review budget allocations",
      context: { userId: "test-user" },
    }),
  });

  assertEquals(response.status, 202); // Accepted for processing
  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(data.parseType, "complex");
  assertEquals(data.data.status, "pending");
  assertExists(data.data.queueId);
  assertEquals(data.data.estimatedTime, "2-5 seconds");
});
