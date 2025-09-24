/**
 * Main Vitest Configuration
 *
 * IMPORTANT: This is the SINGLE source of truth for vitest configuration.
 * The root /vitest.config.ts file is just a pointer to this file.
 *
 * DO NOT CREATE additional vitest config files - use this one.
 * If you need specialized test runs, use test filters or tags instead.
 *
 * Structure:
 * - /vitest.config.ts -> points to this file (DO NOT EDIT)
 * - /tests/config/vitest.config.ts -> THIS FILE (EDIT HERE)
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      // Exclude the nlp-parser.test.ts as it's a script, not a test
      "tests/integration/services/nlp-parser.test.ts",
      // Exclude node:test JavaScript files
      "tests/integration/**/*.test.js",
      "tests/integration/**/*.spec.js",
    ],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
