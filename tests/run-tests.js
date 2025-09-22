#!/usr/bin/env node

/**
 * FLRTS Test Runner
 *
 * Secure test runner that uses 1Password Service Account for secret injection.
 * This script provides a simple interface for running tests with proper environment setup.
 *
 * Usage:
 *   node tests/run-tests.js              # Run all tests
 *   node tests/run-tests.js --api        # Run only API tests
 *   node tests/run-tests.js --watch      # Run tests in watch mode
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Parse command line arguments
const args = process.argv.slice(2);
const isWatchMode = args.includes("--watch");
const isApiOnly = args.includes("--api");

/**
 * Check if 1Password CLI is available
 */
function check1PasswordCLI() {
  return new Promise((resolve) => {
    const child = spawn("op", ["--version"], { stdio: "ignore" });
    child.on("close", (code) => {
      resolve(code === 0);
    });
    child.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Run tests with 1Password secret injection
 */
async function runTests() {
  console.log("🔐 FLRTS Secure Test Runner");
  console.log("============================");

  // Check if 1Password CLI is available
  const hasOp = await check1PasswordCLI();
  if (!hasOp) {
    console.error("❌ 1Password CLI not found!");
    console.error(
      "Please install 1Password CLI: https://developer.1password.com/docs/cli/get-started/",
    );
    process.exit(1);
  }

  // Check if service account is configured
  if (!process.env.OP_SERVICE_ACCOUNT_TOKEN) {
    console.error("❌ 1Password Service Account not configured!");
    console.error("Please set OP_SERVICE_ACCOUNT_TOKEN environment variable");
    console.error("or run: op signin --service-account");
    process.exit(1);
  }

  console.log("✅ 1Password CLI configured");

  // Determine test pattern
  let testPattern;
  if (isApiOnly) {
    testPattern = "tests/api/";
    console.log("🎯 Running API tests only");
  } else {
    testPattern = "tests/";
    console.log("🧪 Running all tests");
  }

  // Build command
  const envFile = join(__dirname, ".env.test");
  const nodeArgs = ["--test"];

  if (isWatchMode) {
    nodeArgs.push("--watch");
    console.log("👀 Watch mode enabled");
  }

  nodeArgs.push(testPattern);

  // Run with 1Password secret injection
  console.log("🚀 Starting tests with secure environment...\n");

  const child = spawn(
    "op",
    ["run", `--env-file=${envFile}`, "--", "tsx", ...nodeArgs],
    {
      stdio: "inherit",
      cwd: projectRoot,
    },
  );

  child.on("close", (code) => {
    if (code === 0) {
      console.log("\n✅ Tests completed successfully");
    } else {
      console.log(`\n❌ Tests failed with exit code ${code}`);
    }
    process.exit(code);
  });

  child.on("error", (error) => {
    console.error("❌ Failed to start tests:", error.message);
    process.exit(1);
  });
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
🔐 FLRTS Secure Test Runner

Usage:
  node tests/run-tests.js [options]

Options:
  --api     Run only API tests
  --watch   Run tests in watch mode
  --help    Show this help message

Environment Setup:
  1. Set up 1Password Service Account:
     export OP_SERVICE_ACCOUNT_TOKEN="your-token"

  2. Create test secrets in 1Password:
     - Vault: "Test-Secrets"
     - Item: "Supabase-FLRTS" with fields:
       - project-id
       - url
       - anon-key
       - service-role-key

Examples:
  node tests/run-tests.js              # Run all tests
  node tests/run-tests.js --api        # Run API tests only
  node tests/run-tests.js --watch      # Watch mode
`);
}

// Handle help flag
if (args.includes("--help") || args.includes("-h")) {
  showUsage();
  process.exit(0);
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Test runner failed:", error);
  process.exit(1);
});
