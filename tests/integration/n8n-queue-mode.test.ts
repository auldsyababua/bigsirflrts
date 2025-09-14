/**
 * Integration tests for n8n Queue Mode configuration
 */

import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);
const fsAsync = fs.promises;

describe('n8n Queue Mode Configuration', () => {
  const infraDir = path.join(process.cwd(), 'infrastructure');
  const dockerDir = path.join(infraDir, 'docker');
  const scriptsDir = path.join(infraDir, 'scripts');
  const testsDir = path.join(infraDir, 'tests');

  describe('Directory Structure', () => {
    it('should have all required directories', async () => {
      const requiredDirs = [
        dockerDir,
        path.join(dockerDir, 'redis'),
        path.join(dockerDir, 'postgres'),
        path.join(dockerDir, 'nginx'),
        scriptsDir,
        testsDir
      ];

      for (const dir of requiredDirs) {
        const exists = await fsAsync.access(dir).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('Configuration Files', () => {
    it('should have docker-compose.yml', async () => {
      const composePath = path.join(dockerDir, 'docker-compose.yml');
      const exists = await fsAsync.access(composePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fsAsync.readFile(composePath, 'utf-8');
      // Check for required services
      expect(content).toContain('postgres:');
      expect(content).toContain('redis:');
      expect(content).toContain('n8n-main:');
      expect(content).toContain('n8n-worker-1:');
      expect(content).toContain('n8n-worker-2:');
      expect(content).toContain('n8n-webhook:');
      expect(content).toContain('nginx:');
    });

    it('should have .env.example file', async () => {
      const envPath = path.join(dockerDir, '.env.example');
      const exists = await fsAsync.access(envPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fsAsync.readFile(envPath, 'utf-8');
      // Check for required environment variables
      expect(content).toContain('POSTGRES_USER=');
      expect(content).toContain('POSTGRES_PASSWORD=');
      expect(content).toContain('REDIS_PASSWORD=');
      expect(content).toContain('N8N_ENCRYPTION_KEY=');
      expect(content).toContain('N8N_HOST=');
      expect(content).toContain('WEBHOOK_URL=');
    });

    it('should have Redis configuration', async () => {
      const redisConfPath = path.join(dockerDir, 'redis', 'redis.conf');
      const exists = await fsAsync.access(redisConfPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fsAsync.readFile(redisConfPath, 'utf-8');
      // Check for critical Redis settings
      expect(content).toContain('appendonly yes');
      expect(content).toContain('maxmemory 512mb');
      expect(content).toContain('maxmemory-policy allkeys-lru');
    });

    it('should have PostgreSQL tuning script', async () => {
      const pgTunePath = path.join(dockerDir, 'postgres', 'tune.sql');
      const exists = await fsAsync.access(pgTunePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fsAsync.readFile(pgTunePath, 'utf-8');
      // Check for performance settings
      expect(content).toContain('ALTER SYSTEM SET max_connections');
      expect(content).toContain('ALTER SYSTEM SET shared_buffers');
      expect(content).toContain('CREATE INDEX');
    });

    it('should have Nginx configuration', async () => {
      const nginxPath = path.join(dockerDir, 'nginx', 'nginx.conf');
      const exists = await fsAsync.access(nginxPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fsAsync.readFile(nginxPath, 'utf-8');
      // Check for load balancing configuration
      expect(content).toContain('upstream n8n_main');
      expect(content).toContain('upstream n8n_webhooks');
      expect(content).toContain('location ~ ^/webhook/');
    });
  });

  describe('Deployment Scripts', () => {
    it('should have deployment script', async () => {
      const deployPath = path.join(scriptsDir, 'deploy-queue-mode.sh');
      const exists = await fsAsync.access(deployPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const stats = await fsAsync.stat(deployPath);
      // Check if script is executable
      expect(stats.mode & 0o111).toBeTruthy();

      const content = await fsAsync.readFile(deployPath, 'utf-8');
      // Check for required functionality
      expect(content).toContain('docker-compose up -d postgres');
      expect(content).toContain('docker-compose up -d redis');
      expect(content).toContain('docker-compose up -d n8n-main');
      expect(content).toContain('N8N_ENCRYPTION_KEY');
    });

    it('should have health check script', async () => {
      const healthPath = path.join(scriptsDir, 'health-check.sh');
      const exists = await fsAsync.access(healthPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const stats = await fsAsync.stat(healthPath);
      // Check if script is executable
      expect(stats.mode & 0o111).toBeTruthy();

      const content = await fsAsync.readFile(healthPath, 'utf-8');
      // Check for health check functionality
      expect(content).toContain('pg_isready');
      expect(content).toContain('redis-cli');
      expect(content).toContain('curl -s http://localhost:5678/healthz');
    });
  });

  describe('Load Testing Configuration', () => {
    it('should have Artillery test configuration', async () => {
      const artilleryPath = path.join(testsDir, 'artillery-test.yml');
      const exists = await fsAsync.access(artilleryPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fsAsync.readFile(artilleryPath, 'utf-8');
      // Check for test phases
      expect(content).toContain('phases:');
      expect(content).toContain('scenarios:');
      expect(content).toContain('/webhook/telegram-test');
    });

    it('should have test data file', async () => {
      const testDataPath = path.join(testsDir, 'test-data.csv');
      const exists = await fsAsync.access(testDataPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should have load test runner script', async () => {
      const runnerPath = path.join(testsDir, 'run-load-test.sh');
      const exists = await fsAsync.access(runnerPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const stats = await fsAsync.stat(runnerPath);
      // Check if script is executable
      expect(stats.mode & 0o111).toBeTruthy();
    });
  });

  describe('Docker Compose Validation', () => {
    it('should validate docker-compose configuration', async () => {
      try {
        const { stdout, stderr } = await execAsync(
          `docker-compose -f ${path.join(dockerDir, 'docker-compose.yml')} config`
        );
        // If command succeeds, configuration is valid
        expect(stderr).toBe('');
      } catch (error: any) {
        // Skip test if docker-compose is not installed
        if (error.message.includes('command not found')) {
          console.warn('Docker Compose not installed, skipping validation');
          return;
        }
        throw error;
      }
    });
  });

  describe('Environment Variables', () => {
    it('should have all required variables documented', async () => {
      const envExamplePath = path.join(dockerDir, '.env.example');
      const content = await fsAsync.readFile(envExamplePath, 'utf-8');

      const requiredVars = [
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'POSTGRES_HOST',
        'REDIS_PASSWORD',
        'N8N_ENCRYPTION_KEY',
        'N8N_HOST',
        'WEBHOOK_URL'
      ];

      for (const varName of requiredVars) {
        expect(content).toContain(`${varName}=`);
      }
    });
  });

  describe('Queue Mode Configuration', () => {
    it('should configure n8n for queue mode', async () => {
      const composePath = path.join(dockerDir, 'docker-compose.yml');
      const content = await fsAsync.readFile(composePath, 'utf-8');

      // Check for queue mode environment variables
      expect(content).toContain('EXECUTIONS_MODE: queue');
      expect(content).toContain('QUEUE_BULL_REDIS_HOST: redis');
      expect(content).toContain('QUEUE_BULL_REDIS_PORT: 6379');
      expect(content).toContain('N8N_GRACEFUL_SHUTDOWN_TIMEOUT: 30');
    });

    it('should configure workers with proper concurrency', async () => {
      const composePath = path.join(dockerDir, 'docker-compose.yml');
      const content = await fsAsync.readFile(composePath, 'utf-8');

      // Check worker configuration
      expect(content).toContain('command: worker --concurrency=10');
      expect(content).toContain('n8n-worker-1:');
      expect(content).toContain('n8n-worker-2:');
    });

    it('should configure webhook processor', async () => {
      const composePath = path.join(dockerDir, 'docker-compose.yml');
      const content = await fsAsync.readFile(composePath, 'utf-8');

      // Check webhook processor configuration
      expect(content).toContain('n8n-webhook:');
      expect(content).toContain('command: webhook');
    });
  });
});

describe('Deployment Script Functionality', () => {
  const deployScript = path.join(process.cwd(), 'infrastructure', 'scripts', 'deploy-queue-mode.sh');

  it('should check for Docker prerequisites', async () => {
    const content = await fsAsync.readFile(deployScript, 'utf-8');
    expect(content).toContain('command -v docker');
    expect(content).toContain('command -v docker-compose');
  });

  it('should generate encryption key if not provided', async () => {
    const content = await fsAsync.readFile(deployScript, 'utf-8');
    expect(content).toContain('openssl rand -hex 32');
    expect(content).toContain('N8N_ENCRYPTION_KEY=');
  });

  it('should start services in correct order', async () => {
    const content = await fsAsync.readFile(deployScript, 'utf-8');

    // Check service startup order
    const postgresIndex = content.indexOf('docker-compose up -d postgres');
    const redisIndex = content.indexOf('docker-compose up -d redis');
    const mainIndex = content.indexOf('docker-compose up -d n8n-main');
    const workerIndex = content.indexOf('docker-compose up -d n8n-worker-1');

    expect(postgresIndex).toBeLessThan(redisIndex);
    expect(redisIndex).toBeLessThan(mainIndex);
    expect(mainIndex).toBeLessThan(workerIndex);
  });

  it('should wait for services to be ready', async () => {
    const content = await fsAsync.readFile(deployScript, 'utf-8');
    expect(content).toContain('pg_isready');
    expect(content).toContain('redis-cli --pass');
    expect(content).toContain('curl -s http://localhost:5678/healthz');
  });
});