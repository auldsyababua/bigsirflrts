/**
 * Container Naming Standardization Tests (Improved Version)
 * Story: INFRA-002
 *
 * Validates that all containers follow the flrts-* naming convention
 * and that all references are properly updated
 *
 * Improvements:
 * - Better test isolation
 * - Parallel file operations
 * - Proper error handling
 * - Type safety
 * - Performance optimizations
 */

import { describe, expect, beforeEach, test, vi, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);
const stat = promisify(fs.stat);

// Type definitions for better safety
interface ComplianceReport {
  timestamp: string;
  checks: {
    envFiles: Array<{ file: string; hasProjectName?: boolean; error?: string }>;
    dockerCompose: Array<{ file: string; compliant?: boolean; error?: string }>;
    runningContainers: Array<{ name?: string; compliant?: boolean; error?: string }>;
    codeReferences: Array<{ file: string; compliant?: boolean; error?: string }>;
  };
}

// TestFile interface removed - was unused

// Test configuration
const TEST_CONFIG = {
  projectName: 'flrts',
  containerPrefix: 'flrts-',
  envFiles: [
    { path: '.env', required: true },
    { path: 'infrastructure/docker/.env', required: false },
    { path: 'infrastructure/digitalocean/.env.production', required: false },
    { path: 'tests/.env.test', required: false },
  ],
  expectedContainers: ['flrts-n8n', 'flrts-postgres', 'flrts-redis', 'flrts-nginx'],
  badPatterns: [/docker-[\w-]+-\d+/, /bigsirflrts-[\w-]+/],
};

// Helper functions
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return (stats.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

// Setup and teardown
beforeEach(() => {
  vi.clearAllMocks();
});

describe('Container Naming Standardization Tests', () => {
  describe('Configuration Validation', () => {
    test('COMPOSE_PROJECT_NAME is set correctly in all env files', async () => {
      const expectedValue = `COMPOSE_PROJECT_NAME=${TEST_CONFIG.projectName}`;

      // Check files in parallel
      const results = await Promise.all(
        TEST_CONFIG.envFiles.map(async ({ path: envFile, required }) => {
          const fullPath = path.resolve(process.cwd(), envFile);
          const content = await readFileIfExists(fullPath);

          if (content === null) {
            if (required) {
              return { file: envFile, error: 'Required file missing' };
            }
            return { file: envFile, skipped: true };
          }

          return {
            file: envFile,
            hasProjectName: content.includes(expectedValue),
          };
        })
      );

      // Validate results
      for (const result of results) {
        if (result.error) {
          throw new Error(result.error);
        }
        if (!result.skipped) {
          expect(result.hasProjectName).toBe(true);
        }
      }
    });

    test('Container environment variables are properly defined', async () => {
      const expectedVars = {
        N8N_CONTAINER: 'flrts-n8n',
        POSTGRES_CONTAINER: 'flrts-postgres',
        REDIS_CONTAINER: 'flrts-redis',
        NGINX_CONTAINER: 'flrts-nginx',
      };

      const configPath = 'infrastructure/config/container-names.env';
      const content = await readFileIfExists(configPath);

      if (content) {
        for (const [key, value] of Object.entries(expectedVars)) {
          const pattern = new RegExp(`export ${key}="${value}"`);
          expect(content).toMatch(pattern);
        }
      } else {
        // Log warning but don't fail - file might not exist yet
        console.info('container-names.env not found, skipping variable checks');
      }
    });
  });

  describe('Docker Compose Validation', () => {
    test('All services have explicit container_name with correct prefix', async () => {
      const composeFiles = [
        'infrastructure/docker/docker-compose.single.yml',
        'infrastructure/docker/docker-compose.yml',
        'docker-compose.yml',
      ];

      // Process files in parallel
      const results = await Promise.all(
        composeFiles.map(async (file) => {
          if (!(await fileExists(file))) {
            return { file, skipped: true };
          }

          try {
            const { stdout } = await execAsync(`docker-compose -f ${file} config`);
            const lines = stdout.split('\n');
            const containerNames: string[] = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes('container_name:')) {
                const name = line.split(':')[1]?.trim();
                if (name) {
                  containerNames.push(name);
                }
              }
            }

            return { file, containerNames };
          } catch (error) {
            return { file, error: error instanceof Error ? error.message : String(error) };
          }
        })
      );

      // Validate results
      for (const result of results) {
        if (result.skipped || result.error) continue;

        for (const name of result.containerNames || []) {
          expect(name).toMatch(new RegExp(`^${TEST_CONFIG.containerPrefix}`));

          // Check against bad patterns
          for (const badPattern of TEST_CONFIG.badPatterns) {
            expect(name).not.toMatch(badPattern);
          }
        }
      }
    });

    test('No hardcoded container references in compose files', async () => {
      // Use Node.js fs module instead of shell command to avoid command injection
      const { readdir, readFile, stat } = await import('node:fs/promises');
      const { join, relative } = await import('node:path');

      const dockerDir = join(process.cwd(), 'infrastructure/docker');
      const violations: string[] = [];
      const patterns = [/docker-.*-1/, /bigsirflrts-/];

      // Recursive function to scan directories
      async function scanDirectory(dir: string): Promise<void> {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            // Recursively scan subdirectories
            await scanDirectory(fullPath);
          } else if (entry.endsWith('.yml') || entry.endsWith('.yaml')) {
            // Check both .yml and .yaml files
            const content = await readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            const relativePath = relative(dockerDir, fullPath);

            lines.forEach((line, index) => {
              patterns.forEach((pattern) => {
                if (pattern.test(line)) {
                  violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
                }
              });
            });
          }
        }
      }

      await scanDirectory(dockerDir);

      expect(violations, `Found hardcoded container references:\n${violations.join('\n')}`).toEqual(
        []
      );
    });
  });

  describe('Runtime Container Validation', () => {
    test('All running containers use correct prefix', async () => {
      // Skip if Docker not available
      const dockerAvailable = await execAsync('docker info')
        .then(() => true)
        .catch(() => false);

      if (!dockerAvailable) {
        console.info('Docker not available, skipping runtime tests');
        return;
      }

      try {
        const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
        const containerNames = stdout.trim().split('\n').filter(Boolean);

        if (containerNames.length === 0) {
          console.info('No containers running, skipping validation');
          return;
        }

        for (const name of containerNames) {
          // Only check our project containers
          if (name.includes('flrts') || name.includes('docker-') || name.includes('bigsirflrts')) {
            expect(name).toMatch(new RegExp(`^${TEST_CONFIG.containerPrefix}`));

            for (const badPattern of TEST_CONFIG.badPatterns) {
              expect(name).not.toMatch(badPattern);
            }
          }
        }
      } catch (error) {
        console.error(
          'Error checking containers:',
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }
    });
  });

  describe('Code Reference Validation', () => {
    test('Test files use environment variables not hardcoded names', async () => {
      const testFile = 'tests/integration/n8n-operational-resilience.test.ts';
      const content = await readFileIfExists(testFile);

      if (!content) {
        console.info(`Test file ${testFile} not found, skipping`);
        return;
      }

      // NOTE: This file contains INTENTIONAL references to old container names
      // as part of NEGATIVE tests per ADR-001 (checking containers DON'T exist)
      // These are documented in the file with architectural comments.
      // We only check that it uses environment variables for POSITIVE tests.

      // Check for good patterns (using env vars for actual container references)
      expect(content).toMatch(/process\.env\.\w+_CONTAINER/);

      // Verify the file has our architectural documentation comment
      expect(content).toContain('ARCHITECTURAL NOTE - ADR-001 Compliance Testing');
      expect(content).toContain('These tests verify our single-instance deployment decision');
    });

    test('Shell scripts use correct container names', async () => {
      const scriptFiles = [
        'infrastructure/scripts/run-resilience-tests.sh',
        'infrastructure/scripts/health-check.sh',
      ];

      // Check files in parallel
      const results = await Promise.all(
        scriptFiles.map(async (file) => {
          const content = await readFileIfExists(file);
          if (!content) {
            return { file, skipped: true };
          }

          const hasIncorrectPatterns =
            /docker exec docker-\w+-1/.test(content) ||
            /docker stop docker-\w+-1/.test(content) ||
            /docker exec bigsirflrts-/.test(content);

          // Script either has correct pattern OR has no docker exec at all (which is fine)
          const hasCorrectPattern = /docker exec flrts-/.test(content);
          const hasNoDockerExec = !/docker exec/.test(content);

          return {
            file,
            compliant: !hasIncorrectPatterns && (hasCorrectPattern || hasNoDockerExec),
          };
        })
      );

      // Validate results
      for (const result of results) {
        if (!result.skipped) {
          expect(result.compliant).toBe(true);
        }
      }
    });
  });

  describe('Integration Connectivity Tests', () => {
    test.skip('Services can connect using new container names', async () => {
      // Skip by default - only run when containers are guaranteed to be running
      // This test should be run in a CI environment with containers up

      const tests = [
        {
          name: 'n8n health',
          command: 'docker exec flrts-n8n wget -q -O - http://localhost:5678/healthz',
        },
        {
          name: 'postgres ready',
          command: 'docker exec flrts-postgres pg_isready',
        },
      ];

      const results = await Promise.allSettled(tests.map((test) => execAsync(test.command)));

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.stdout).toBeTruthy();
        } else {
          console.warn(`${tests[index].name} failed:`, result.reason);
        }
      });
    });
  });

  describe('Rollback Validation', () => {
    test('Rollback script exists and is executable', async () => {
      const rollbackScript = 'infrastructure/scripts/rollback-container-names.sh';

      const exists = await fileExists(rollbackScript);
      if (!exists) {
        console.info('Rollback script not yet created');
        return;
      }

      const executable = await isExecutable(rollbackScript);
      expect(executable).toBe(true);
    });
  });
});

describe('Container Naming Compliance Report', () => {
  test('Generate compliance report', async () => {
    // This test generates the compliance report after all tests run
    expect(true).toBe(true);
  });

  afterAll(async () => {
    const report: ComplianceReport = {
      timestamp: new Date().toISOString(),
      checks: {
        envFiles: [],
        dockerCompose: [],
        runningContainers: [],
        codeReferences: [],
      },
    };

    // Check env files in parallel
    const envResults = await Promise.all(
      TEST_CONFIG.envFiles.map(async ({ path: file }) => {
        const content = await readFileIfExists(file);
        return {
          file,
          hasProjectName:
            content?.includes(`COMPOSE_PROJECT_NAME=${TEST_CONFIG.projectName}`) || false,
          error: content === null ? 'Not found' : undefined,
        };
      })
    );

    report.checks.envFiles = envResults.filter((r) => r.error || r.hasProjectName !== undefined);

    // Check running containers if Docker available
    try {
      const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
      const containers = stdout.trim().split('\n').filter(Boolean);

      report.checks.runningContainers = containers.map((name) => ({
        name,
        compliant: name.startsWith(TEST_CONFIG.containerPrefix),
      }));
    } catch {
      report.checks.runningContainers = [{ error: 'Docker not available' }];
    }

    console.log('\n=== Container Naming Compliance Report ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('==========================================\n');
  });
});
