import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
  override: false,
});
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

// Global test setup
beforeAll(() => {
  // Set test environment variables if not already set
  process.env.NODE_ENV = 'test';

  // Mock console methods to reduce noise in tests
  if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    global.console.log = () => {};
    global.console.info = () => {};
    global.console.warn = () => {};
  }
});

afterAll(() => {
  // Cleanup after all tests
});
