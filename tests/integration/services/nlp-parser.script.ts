#!/usr/bin/env tsx
/* eslint-disable no-console */
import dotenv from "dotenv";

dotenv.config();

const API_URL = "http://localhost:3001";

const testExamples = [
  "Task for @Taylor to inspect pump 3 by tomorrow 3pm",
  "Emergency: Conveyor belt down in sector 7, assign to @Bryan",
  "Schedule preventive maintenance for loader next Tuesday morning",
  "What tasks does @Colin have this week?",
  "Create high priority task for @Austin to move equipment from Site B to Site C by Friday",
  "Partner 1 delivering parts tomorrow at 10am, need someone to receive",
  "Urgent: Site C excavator needs immediate repair",
  "List all maintenance tasks for this month",
  "Assign @Taylor to check the main facility pumps today before 5pm",
];

async function testParser() {
  console.log("🧪 Testing NLP Parser with PRD Examples\n");
  console.log("=".repeat(60));

  for (const [index, example] of testExamples.entries()) {
    console.log(`\n📝 Test ${index + 1}/${testExamples.length}`);
    console.log(`Input: "${example}"`);
    console.log("-".repeat(40));

    try {
      const response = await fetch(`${API_URL}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: example }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Parsed successfully!");
        console.log(`Operation: ${result.parsed.operation}`);

        if (result.parsed.workPackage) {
          console.log("Work Package:");
          console.log(
            `  - Subject: ${result.parsed.workPackage.subject || "N/A"}`,
          );
          console.log(
            `  - Assignee: ${result.parsed.workPackage.assignee || "N/A"}`,
          );
          console.log(
            `  - Priority: ${result.parsed.workPackage.priority || "N/A"}`,
          );
          console.log(
            `  - Due Date: ${result.parsed.workPackage.dueDate || "N/A"}`,
          );
          console.log(`  - Site: ${result.parsed.workPackage.site || "N/A"}`);
        }

        if (result.parsed.query) {
          console.log("Query:");
          console.log(`  - Assignee: ${result.parsed.query.assignee || "N/A"}`);
          if (result.parsed.query.dateRange) {
            console.log(
              `  - Date Range: ${result.parsed.query.dateRange.start} to ${result.parsed.query.dateRange.end}`,
            );
          }
        }

        console.log(`\n💡 Reasoning: ${result.parsed.reasoning}`);
        console.log(`⏱️  Parse time: ${result.metadata.parseTimeMs}ms`);
      } else {
        console.log("❌ Parsing failed!");
        console.log(`Error: ${result.error}`);
        if (result.validation) {
          console.log("Validation errors:", result.validation);
        }
      }
    } catch (error) {
      console.log("❌ Request failed!");
      console.log(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    console.log("=".repeat(60));
  }

  // Get analytics
  console.log("\n📊 Fetching Analytics...\n");
  try {
    const analyticsResponse = await fetch(`${API_URL}/analytics`);
    const analytics = await analyticsResponse.json();

    console.log("Session Statistics:");
    console.log(`  - Total parses: ${analytics.total}`);
    console.log(`  - Successful: ${analytics.successful}`);
    console.log(`  - Failed: ${analytics.failed}`);
    console.log(`  - Success rate: ${analytics.successRate}`);
  } catch (error) {
    console.log("Failed to fetch analytics");
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const health = await response.json();
    console.log("✅ Server is healthy:", health);
    return true;
  } catch (error) {
    console.log("❌ Server is not running!");
    console.log("Please start the server with: npm run dev");
    return false;
  }
}

// Main
async function main() {
  const serverHealthy = await checkServer();
  if (!serverHealthy) {
    process.exit(1);
  }

  await testParser();
}

main().catch(console.error);
