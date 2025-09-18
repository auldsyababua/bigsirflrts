#!/usr/bin/env node
/**
 * FLRTS Integration Test Runner
 *
 * Runs integration tests for Edge Function → n8n webhook flow with proper
 * environment validation and 1Password secret injection.
 *
 * Usage:
 *   # Run all integration tests
 *   npm run test:integration
 *
 *   # Run specific test suite
 *   npm run test:integration -- --suite=edge-function-n8n-webhook
 *   npm run test:integration -- --suite=performance-regression
 *
 *   # Run with verbose output
 *   npm run test:integration -- --verbose
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Test configuration
const TEST_SUITES = {
  "edge-function-n8n-webhook": {
    file: "tests/integration/edge-function-n8n-webhook.test.js",
    description: "Edge Function → n8n webhook integration tests",
    timeout: 60000,
  },
  "performance-regression": {
    file: "tests/integration/performance-regression.test.js",
    description: "Performance regression tests for <200ms requirements",
    timeout: 120000,
  },
};

const DEFAULT_ENV_FILE = "tests/.env.test";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    suite: null,
    verbose: false,
    envFile: DEFAULT_ENV_FILE,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg.startsWith("--suite=")) {
      options.suite = arg.split("=")[1];
    } else if (arg.startsWith("--env-file=")) {
      options.envFile = arg.split("=")[1];
    }
  }

  return options;
}

// Display help information
function showHelp() {
  console.log(`
FLRTS Integration Test Runner

Usage:
  node tests/run-integration-tests.js [options]

Options:
  --suite=<name>      Run specific test suite (edge-function-n8n-webhook, performance-regression)
  --env-file=<path>   Use custom environment file (default: tests/.env.test)
  --verbose           Enable verbose output
  --help              Show this help message

Available Test Suites:
`);

  for (const [name, config] of Object.entries(TEST_SUITES)) {
    console.log(`  ${name.padEnd(25)} ${config.description}`);
  }

  console.log(`
Examples:
  # Run all integration tests
  node tests/run-integration-tests.js

  # Run only webhook integration tests
  node tests/run-integration-tests.js --suite=edge-function-n8n-webhook

  # Run performance tests with verbose output
  node tests/run-integration-tests.js --suite=performance-regression --verbose

Note: This runner requires 1Password CLI and proper environment configuration.
See README.md for setup instructions.
`);
}

// Validate environment and dependencies
function validateEnvironment(envFile) {
  console.log("🔍 Validating test environment...");

  // Check if environment file exists
  if (!existsSync(envFile)) {
    console.error(`❌ Environment file not found: ${envFile}`);
    console.error(
      "Create the environment file or specify a different one with --env-file",
    );
    return false;
  }

  // Check if 1Password CLI is available (for secret injection)
  try {
    const result = spawn("op", ["--version"], { stdio: "pipe" });
    if (result.error) {
      console.warn(
        "⚠️  1Password CLI not found. Secrets will not be injected.",
      );
      console.warn(
        "Install 1Password CLI and authenticate to use secure secret management.",
      );
    }
  } catch (error) {
    console.warn("⚠️  Could not verify 1Password CLI availability.");
  }

  console.log("✅ Environment validation complete");
  return true;
}

// Run a specific test suite
function runTestSuite(suiteName, config, options) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${config.description}...`);
    console.log(`📁 File: ${config.file}`);
    console.log(`⏱️  Timeout: ${config.timeout}ms`);

    // Check if test file exists
    if (!existsSync(config.file)) {
      console.error(`❌ Test file not found: ${config.file}`);
      reject(new Error(`Test file not found: ${config.file}`));
      return;
    }

    // Prepare command
    const useOP = existsSync("op") || process.env.OP_SERVICE_ACCOUNT_TOKEN;
    const command = useOP ? "op" : "node";
    const args = useOP
      ? [
          "run",
          `--env-file=${options.envFile}`,
          "--",
          "node",
          "--test",
          config.file,
        ]
      : ["--test", config.file];

    if (options.verbose) {
      console.log(`🔧 Running: ${command} ${args.join(" ")}`);
    }

    // Spawn the test process
    const testProcess = spawn(command, args, {
      stdio: options.verbose ? "inherit" : "pipe",
      env: {
        ...process.env,
        TEST_TIMEOUT: config.timeout.toString(),
        NODE_ENV: "test",
      },
    });

    let stdout = "";
    let stderr = "";

    if (!options.verbose) {
      testProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      testProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
    }

    // Handle timeout
    const timeoutId = setTimeout(() => {
      console.error(
        `❌ Test suite ${suiteName} timed out after ${config.timeout}ms`,
      );
      testProcess.kill("SIGTERM");
      reject(new Error(`Test timeout: ${suiteName}`));
    }, config.timeout + 5000); // Add 5s buffer

    testProcess.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        console.log(`✅ ${config.description} completed successfully`);
        if (!options.verbose && stdout) {
          console.log(stdout);
        }
        resolve();
      } else {
        console.error(`❌ ${config.description} failed with exit code ${code}`);
        if (!options.verbose) {
          if (stdout) console.log("STDOUT:", stdout);
          if (stderr) console.error("STDERR:", stderr);
        }
        reject(new Error(`Test failed: ${suiteName} (exit code ${code})`));
      }
    });

    testProcess.on("error", (error) => {
      clearTimeout(timeoutId);
      console.error(`❌ Failed to start test: ${error.message}`);
      reject(error);
    });
  });
}

// Main execution function
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log("🚀 FLRTS Integration Test Runner");
  console.log("📋 Testing Edge Function → n8n webhook integration\n");

  // Validate environment
  if (!validateEnvironment(options.envFile)) {
    process.exit(1);
  }

  // Determine which tests to run
  const suitesToRun = options.suite
    ? { [options.suite]: TEST_SUITES[options.suite] }
    : TEST_SUITES;

  if (options.suite && !TEST_SUITES[options.suite]) {
    console.error(`❌ Unknown test suite: ${options.suite}`);
    console.error("Available suites:", Object.keys(TEST_SUITES).join(", "));
    process.exit(1);
  }

  // Run tests
  let passedCount = 0;
  let failedCount = 0;
  const startTime = Date.now();

  for (const [suiteName, config] of Object.entries(suitesToRun)) {
    try {
      await runTestSuite(suiteName, config, options);
      passedCount++;
    } catch (error) {
      failedCount++;
      console.error(`Test suite failed: ${error.message}`);
    }
  }

  // Summary
  const totalTime = Date.now() - startTime;
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  console.log(`Total test suites: ${passedCount + failedCount}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⏱️  Total time: ${totalTime}ms`);

  if (failedCount > 0) {
    console.log("\n❌ Some integration tests failed!");
    console.log("The Edge Function → n8n webhook integration may be broken.");
    console.log("Check the test output above for details.");
    process.exit(1);
  } else {
    console.log("\n✅ All integration tests passed!");
    console.log('The "Reflex + Brain" architecture is working correctly.');
    process.exit(0);
  }
}

// Run the script
main().catch((error) => {
  console.error("❌ Unexpected error:", error.message);
  process.exit(1);
});
