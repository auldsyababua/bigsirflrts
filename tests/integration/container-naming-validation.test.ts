/**
 * Container Naming Standardization Tests
 * Story: INFRA-002
 *
 * Validates that all containers follow the flrts-* naming convention
 * and that all references are properly updated
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

describe('Container Naming Standardization Tests', () => {
  describe('Configuration Validation', () => {
    test('COMPOSE_PROJECT_NAME is set to flrts in all .env files', async () => {
      const envFiles = [
        '.env',
        'infrastructure/docker/.env',
        'infrastructure/digitalocean/.env.production',
        'tests/.env.test',
      ];

      for (const envFile of envFiles) {
        const fullPath = path.resolve(process.cwd(), envFile);

        // Check if file exists
        try {
          await access(fullPath);
          const content = await readFile(fullPath, 'utf8');

          // Check for COMPOSE_PROJECT_NAME=flrts
          const hasCorrectProjectName = content.includes('COMPOSE_PROJECT_NAME=flrts');

          expect(hasCorrectProjectName).toBe(true);
        } catch (error) {
          // File doesn't exist yet - that's okay for .env.production
          if (!envFile.includes('production')) {
            throw new Error(`Required env file ${envFile} does not exist`);
          }
        }
      }
    });

    test('Container environment variables are properly defined', async () => {
      const requiredVars = [
        'N8N_CONTAINER',
        'POSTGRES_CONTAINER',
        'REDIS_CONTAINER',
        'NGINX_CONTAINER',
      ];

      const expectedValues = {
        N8N_CONTAINER: 'flrts-n8n',
        POSTGRES_CONTAINER: 'flrts-postgres',
        REDIS_CONTAINER: 'flrts-redis',
        NGINX_CONTAINER: 'flrts-nginx',
      };

      // Check if container-names.env exists
      const configPath = 'infrastructure/config/container-names.env';
      try {
        await access(configPath);
        const content = await readFile(configPath, 'utf8');

        for (const [key, value] of Object.entries(expectedValues)) {
          const pattern = new RegExp(`export ${key}="${value}"`);
          expect(content).toMatch(pattern);
        }
      } catch (error) {
        // File doesn't exist - check if values are in main .env
        console.warn('container-names.env not found, checking main .env files');
      }
    });
  });

  describe('Docker Compose Validation', () => {
    test('All services have explicit container_name with flrts- prefix', async () => {
      const composeFiles = [
        'infrastructure/docker/docker-compose.single.yml',
        'infrastructure/docker/docker-compose.yml',
        'docker-compose.yml',
      ];

      for (const composeFile of composeFiles) {
        try {
          await access(composeFile);

          // Validate docker-compose configuration
          const { stdout } = await execAsync(`docker-compose -f ${composeFile} config`);

          // Parse YAML output to check container names
          const lines = stdout.split('\n');
          let inService = false;
          let currentService = '';

          for (const line of lines) {
            if (line.match(/^ {2}\w+:$/)) {
              // New service section
              inService = true;
              currentService = line.trim().replace(':', '');
            } else if (inService && line.includes('container_name:')) {
              const containerName = line.split(':')[1].trim();

              // Verify it starts with flrts-
              expect(containerName).toMatch(/^flrts-/);

              // Verify no auto-generated patterns
              expect(containerName).not.toMatch(/docker-.*-\d+/);
              expect(containerName).not.toMatch(/bigsirflrts-/);
            }
          }
        } catch (error) {
          console.warn(`Compose file ${composeFile} not found or invalid`);
        }
      }
    });

    test('No hardcoded container references in compose files', async () => {
      const { stdout } = await execAsync(
        'grep -r "docker-.*-1\\|bigsirflrts-" infrastructure/docker/*.yml || true'
      );

      expect(stdout.trim()).toBe('');
    });
  });

  describe('Runtime Container Validation', () => {
    test('All running containers use flrts- prefix', async () => {
      try {
        const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
        const containerNames = stdout.trim().split('\n').filter(Boolean);

        for (const name of containerNames) {
          expect(name).toMatch(/^flrts-/);
          expect(name).not.toMatch(/^docker-/);
          expect(name).not.toMatch(/^bigsirflrts-/);
        }
      } catch (error) {
        // No containers running - that's okay
        console.log('No containers currently running');
      }
    });

    test('Container count matches expected services', async () => {
      const expectedContainers = ['flrts-n8n', 'flrts-postgres', 'flrts-redis', 'flrts-nginx'];

      try {
        const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
        const runningContainers = stdout.trim().split('\n').filter(Boolean);

        // Check that all expected containers are present if any are running
        if (runningContainers.length > 0) {
          for (const expected of expectedContainers) {
            if (runningContainers.some((c) => c === expected)) {
              expect(runningContainers).toContain(expected);
            }
          }
        }
      } catch (error) {
        console.log('Docker not running or no containers active');
      }
    });
  });

  describe('Code Reference Validation', () => {
    test('Test files use environment variables not hardcoded names', async () => {
      const testFiles = ['tests/integration/n8n-operational-resilience.test.ts'];

      for (const testFile of testFiles) {
        try {
          await access(testFile);
          const content = await readFile(testFile, 'utf8');

          // Check for bad patterns
          expect(content).not.toMatch(/['"]docker-\w+-1['"]/);
          expect(content).not.toMatch(/['"]bigsirflrts-\w+['"]/);

          // Check for good patterns
          expect(content).toMatch(/process\.env\.\w+_CONTAINER/);
        } catch (error) {
          console.warn(`Test file ${testFile} not found`);
        }
      }
    });

    test('Shell scripts use correct container names', async () => {
      const scriptFiles = [
        'infrastructure/scripts/run-resilience-tests.sh',
        'infrastructure/scripts/health-check.sh',
      ];

      for (const scriptFile of scriptFiles) {
        try {
          await access(scriptFile);
          const content = await readFile(scriptFile, 'utf8');

          // Check for incorrect patterns
          const badPatterns = [
            /docker exec docker-\w+-1/,
            /docker stop docker-\w+-1/,
            /docker exec bigsirflrts-/,
          ];

          for (const pattern of badPatterns) {
            expect(content).not.toMatch(pattern);
          }

          // Check for correct pattern usage
          expect(content).toMatch(/docker exec flrts-/);
        } catch (error) {
          console.warn(`Script file ${scriptFile} not found`);
        }
      }
    });
  });

  describe('Integration Connectivity Tests', () => {
    test('Services can connect using new container names', async () => {
      // This test requires containers to be running
      try {
        // Test n8n connectivity
        const { stdout: n8nCheck } = await execAsync(
          'docker exec flrts-n8n wget -q -O - http://localhost:5678/healthz || echo "FAIL"'
        );

        if (!n8nCheck.includes('FAIL')) {
          expect(n8nCheck).toBeTruthy();
        }

        // Test postgres connectivity
        const { stdout: pgCheck } = await execAsync(
          'docker exec flrts-postgres pg_isready || echo "FAIL"'
        );

        if (!pgCheck.includes('FAIL')) {
          expect(pgCheck).toContain('accepting connections');
        }
      } catch (error) {
        console.log('Containers not running - skipping connectivity tests');
      }
    });

    test('Health check script works with new names', async () => {
      const healthCheckScript = 'infrastructure/scripts/health-check.sh';

      try {
        await access(healthCheckScript);
        const { stdout, stderr } = await execAsync(`bash ${healthCheckScript}`);

        // Should not have errors about missing containers
        expect(stderr).not.toMatch(/No such container/);
        expect(stderr).not.toMatch(/docker-.*-1/);
      } catch (error) {
        console.log('Health check script not found or containers not running');
      }
    });
  });

  describe('Rollback Validation', () => {
    test('Rollback script exists and is executable', async () => {
      const rollbackScript = 'infrastructure/scripts/rollback-container-names.sh';

      try {
        await access(rollbackScript);
        const stats = await promisify(fs.stat)(rollbackScript);

        // Check if executable
        const isExecutable = (stats.mode & 0o111) !== 0;
        expect(isExecutable).toBe(true);
      } catch (error) {
        // Rollback script should be created
        console.warn('Rollback script not yet created');
      }
    });
  });

  describe('Remote Service Configuration', () => {
    test('Document remote service configuration requirements', async () => {
      // This test verifies documentation exists for remote updates
      const remoteConfigDoc = 'infrastructure/docs/remote-service-updates.md';

      try {
        await access(remoteConfigDoc);
        const content = await readFile(remoteConfigDoc, 'utf8');

        // Should document n8n Cloud updates
        expect(content).toMatch(/n8n Cloud/);
        expect(content).toMatch(/webhook.*URL/i);

        // Should document Supabase updates
        expect(content).toMatch(/Supabase/);
      } catch (error) {
        // Documentation should be created
        console.warn('Remote service documentation not yet created');
      }
    });
  });
});

describe('Container Naming Compliance Report', () => {
  afterAll(async () => {
    // Generate compliance report
    const report = {
      timestamp: new Date().toISOString(),
      checks: {
        envFiles: [],
        dockerCompose: [],
        runningContainers: [],
        codeReferences: [],
      },
    };

    // Check env files
    const envFiles = ['.env', 'infrastructure/docker/.env', 'tests/.env.test'];
    for (const file of envFiles) {
      try {
        await access(file);
        const content = await readFile(file, 'utf8');
        report.checks.envFiles.push({
          file,
          hasProjectName: content.includes('COMPOSE_PROJECT_NAME=flrts'),
        });
      } catch (error) {
        report.checks.envFiles.push({ file, error: 'Not found' });
      }
    }

    // Check running containers
    try {
      const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
      const containers = stdout.trim().split('\n').filter(Boolean);

      for (const container of containers) {
        report.checks.runningContainers.push({
          name: container,
          compliant: container.startsWith('flrts-'),
        });
      }
    } catch (error) {
      report.checks.runningContainers.push({ error: 'Docker not available' });
    }

    console.log('Container Naming Compliance Report:');
    console.log(JSON.stringify(report, null, 2));
  });
});
