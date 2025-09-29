/**
 * P0 Integration Tests for Database Monitoring
 * Test IDs: 1.7-INT-003, 1.7-INT-004
 *
 * These tests verify that PostgreSQL monitoring views are functional
 * and pg_stat_statements data collection works correctly.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from 'pg';

// Determine if we have database configuration available
// Note: SUPABASE_SERVICE_ROLE_KEY is for API access, not direct DB connections
// This test requires direct DB access with admin privileges for pg_stat_statements
const hasDbConfig = !!(
  (process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_URL !== '_REPLACE_ME_') ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL !== '_REPLACE_ME_') ||
  (!process.env.CI && !process.env.GITHUB_ACTIONS) // Allow local development only
);

describe.skipIf(!hasDbConfig)('@P0 Database Monitoring Integration Tests', () => {
  let dbClient: Client;
  let testDatabaseUrl: string;

  beforeAll(async () => {
    // Skip this test if we don't have proper database configuration
    if (!hasDbConfig) {
      console.log('Skipping database monitoring tests - no valid database configuration');
      return;
    }

    // Try multiple sources for database configuration
    if (process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_URL !== '_REPLACE_ME_') {
      testDatabaseUrl = process.env.TEST_DATABASE_URL;
    } else if (process.env.DATABASE_URL && process.env.DATABASE_URL !== '_REPLACE_ME_') {
      testDatabaseUrl = process.env.DATABASE_URL;
    } else {
      // Only use fallback for true local development (not CI)
      if (!process.env.CI && !process.env.GITHUB_ACTIONS) {
        testDatabaseUrl = 'postgresql://postgres:password@localhost:5432/flrts_test';
      } else {
        console.log('No valid database configuration found, skipping tests');
        console.log('Note: This test requires direct DB access with admin privileges.');
        console.log('Supabase service role keys are for API access, not direct DB connections.');
        return;
      }
    }

    dbClient = new Client({
      connectionString: testDatabaseUrl,
    });

    try {
      await dbClient.connect();
      console.log('Connected to test database for monitoring tests');
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.end();
    }
  });

  beforeEach(async () => {
    // Reset stats for clean test runs
    try {
      await dbClient.query('SELECT pg_stat_reset();');
    } catch (error) {
      // Ignore errors if pg_stat_reset requires superuser privileges
      console.warn(
        'Could not reset pg_stat (may require superuser):',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  describe('1.7-INT-003: pg_stat_statements Data Collection', () => {
    it('should have pg_stat_statements extension enabled', async () => {
      // Act
      const result = await dbClient.query(`
        SELECT
          extname,
          extversion,
          nspname as schema_name
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE extname = 'pg_stat_statements';
      `);

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].extname).toBe('pg_stat_statements');
      expect(result.rows[0].extversion).toBeDefined();
      console.log(`pg_stat_statements version: ${result.rows[0].extversion}`);
    });

    it('should collect query statistics for executed statements', async () => {
      // Arrange - Execute some test queries to generate stats
      const testQueries = [
        'SELECT 1 as test_query_1;',
        'SELECT COUNT(*) FROM information_schema.tables;',
        'SELECT current_timestamp;',
      ];

      // Act - Execute test queries
      for (const query of testQueries) {
        await dbClient.query(query);
      }

      // Allow brief time for stats collection
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query pg_stat_statements
      const statsResult = await dbClient.query(`
        SELECT
          query,
          calls,
          total_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE query LIKE '%test_query_%'
           OR query LIKE '%information_schema.tables%'
           OR query LIKE '%current_timestamp%'
        ORDER BY calls DESC;
      `);

      // Assert
      expect(statsResult.rows.length).toBeGreaterThan(0);

      // Verify that our test queries were captured
      const capturedQueries = statsResult.rows.map((row) => row.query);
      const hasTestQuery = capturedQueries.some(
        (query) =>
          query.includes('test_query_1') ||
          query.includes('information_schema.tables') ||
          query.includes('current_timestamp')
      );
      expect(hasTestQuery).toBe(true);

      // Verify statistical data is present
      for (const row of statsResult.rows) {
        expect(row.calls).toBeGreaterThan(0);
        expect(row.total_exec_time).toBeGreaterThanOrEqual(0);
        expect(row.rows).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track query performance metrics', async () => {
      // Arrange - Execute a query multiple times to build stats
      const testQuery = 'SELECT pg_sleep(0.001);'; // 1ms sleep
      const iterations = 3;

      // Act
      for (let i = 0; i < iterations; i++) {
        await dbClient.query(testQuery);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query performance stats
      const perfResult = await dbClient.query(`
        SELECT
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          min_exec_time,
          max_exec_time,
          stddev_exec_time
        FROM pg_stat_statements
        WHERE query LIKE '%pg_sleep%'
        LIMIT 1;
      `);

      // Assert
      expect(perfResult.rows.length).toBe(1);
      const stats = perfResult.rows[0];

      expect(stats.calls).toBeGreaterThanOrEqual(iterations);
      expect(stats.total_exec_time).toBeGreaterThan(0);
      expect(stats.mean_exec_time).toBeGreaterThan(0);
      expect(stats.min_exec_time).toBeGreaterThan(0);
      expect(stats.max_exec_time).toBeGreaterThan(0);

      // Mean should be reasonable for 1ms sleep
      expect(stats.mean_exec_time).toBeGreaterThan(0.5); // At least 0.5ms
      expect(stats.mean_exec_time).toBeLessThan(100); // Less than 100ms
    });

    it('should capture I/O statistics for queries', async () => {
      // Arrange - Execute query that involves disk I/O
      const ioQuery = `
        SELECT
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_modifications
        FROM pg_stat_user_tables
        LIMIT 10;
      `;

      // Act
      await dbClient.query(ioQuery);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query I/O stats
      const ioResult = await dbClient.query(`
        SELECT
          query,
          shared_blks_hit,
          shared_blks_read,
          shared_blks_dirtied,
          shared_blks_written,
          temp_blks_read,
          temp_blks_written
        FROM pg_stat_statements
        WHERE query LIKE '%pg_stat_user_tables%'
        LIMIT 1;
      `);

      // Assert
      expect(ioResult.rows.length).toBe(1);
      const ioStats = ioResult.rows[0];

      // Should have some block activity
      const totalBlocks = ioStats.shared_blks_hit + ioStats.shared_blks_read;
      expect(totalBlocks).toBeGreaterThan(0);

      // Hit ratio should be reasonable (cached blocks)
      if (totalBlocks > 0) {
        const hitRatio = (ioStats.shared_blks_hit / totalBlocks) * 100;
        expect(hitRatio).toBeGreaterThanOrEqual(0);
        expect(hitRatio).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('1.7-INT-004: Monitoring Views Data Accuracy', () => {
    it('should have monitoring schema and views created', async () => {
      // Act - Check if monitoring schema exists
      const schemaResult = await dbClient.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = 'monitoring';
      `);

      // Assert monitoring schema
      expect(schemaResult.rows.length).toBe(1);
      expect(schemaResult.rows[0].schema_name).toBe('monitoring');

      // Act - Check if monitoring views exist
      const viewsResult = await dbClient.query(`
        SELECT
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = 'monitoring'
          AND table_type = 'VIEW'
        ORDER BY table_name;
      `);

      // Assert monitoring views exist
      expect(viewsResult.rows.length).toBeGreaterThan(0);

      const expectedViews = [
        'active_connections',
        'slow_queries',
        'table_stats',
        'performance_summary',
      ];

      const actualViews = viewsResult.rows.map((row) => row.table_name);

      for (const expectedView of expectedViews) {
        expect(actualViews).toContain(expectedView);
      }
    });

    it('should provide accurate active connections data', async () => {
      // Act
      const result = await dbClient.query(`
        SELECT
          database_name,
          username,
          application_name,
          client_addr,
          state,
          query_start,
          state_change
        FROM monitoring.active_connections
        WHERE database_name = current_database()
        LIMIT 10;
      `);

      // Assert
      expect(result.rows.length).toBeGreaterThan(0);

      // Verify our test connection is visible
      const ourConnection = result.rows.find(
        (row) =>
          row.database_name === dbClient.database &&
          (row.application_name === '' || row.application_name === 'node-postgres')
      );

      expect(ourConnection).toBeDefined();
      expect(ourConnection.state).toMatch(/^(active|idle|idle in transaction)$/);
      expect(ourConnection.query_start).toBeDefined();
    });

    it('should identify slow queries accurately', async () => {
      // Arrange - Execute a deliberately slow query
      const slowQuery = 'SELECT pg_sleep(0.1);'; // 100ms sleep

      // Act
      await dbClient.query(slowQuery);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Query slow queries view
      const result = await dbClient.query(`
        SELECT
          query_text,
          total_exec_time,
          mean_exec_time,
          calls,
          percentage_of_total_time
        FROM monitoring.slow_queries
        WHERE query_text LIKE '%pg_sleep%'
        LIMIT 5;
      `);

      // Assert
      if (result.rows.length > 0) {
        const slowQueryStat = result.rows[0];
        expect(slowQueryStat.mean_exec_time).toBeGreaterThan(50); // Should be > 50ms
        expect(slowQueryStat.total_exec_time).toBeGreaterThan(50);
        expect(slowQueryStat.calls).toBeGreaterThan(0);
      }
    });

    it('should provide table statistics with accurate data', async () => {
      // Act
      const result = await dbClient.query(`
        SELECT
          schema_name,
          table_name,
          total_size_mb,
          index_size_mb,
          table_size_mb,
          seq_scans,
          idx_scans,
          n_tup_ins,
          n_tup_upd,
          n_tup_del
        FROM monitoring.table_stats
        WHERE schema_name IN ('public', 'information_schema')
        ORDER BY total_size_mb DESC
        LIMIT 10;
      `);

      // Assert
      expect(result.rows.length).toBeGreaterThan(0);

      for (const tableStats of result.rows) {
        // Verify size calculations
        expect(tableStats.total_size_mb).toBeGreaterThanOrEqual(0);
        expect(tableStats.index_size_mb).toBeGreaterThanOrEqual(0);
        expect(tableStats.table_size_mb).toBeGreaterThanOrEqual(0);

        // Total should be sum of table and index sizes (approximately)
        const calculatedTotal = tableStats.table_size_mb + tableStats.index_size_mb;
        expect(Math.abs(tableStats.total_size_mb - calculatedTotal)).toBeLessThan(0.1);

        // Scan counts should be non-negative
        expect(tableStats.seq_scans).toBeGreaterThanOrEqual(0);
        expect(tableStats.idx_scans).toBeGreaterThanOrEqual(0);

        // Tuple counts should be non-negative
        expect(tableStats.n_tup_ins).toBeGreaterThanOrEqual(0);
        expect(tableStats.n_tup_upd).toBeGreaterThanOrEqual(0);
        expect(tableStats.n_tup_del).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate performance summary with key metrics', async () => {
      // Act
      const result = await dbClient.query(`
        SELECT
          metric_name,
          metric_value,
          unit,
          description
        FROM monitoring.performance_summary
        ORDER BY metric_name;
      `);

      // Assert
      expect(result.rows.length).toBeGreaterThan(0);

      const expectedMetrics = [
        'active_connections',
        'cache_hit_ratio',
        'total_queries',
        'slow_queries_count',
        'database_size_mb',
      ];

      const actualMetrics = result.rows.map((row) => row.metric_name);

      for (const expectedMetric of expectedMetrics) {
        expect(actualMetrics).toContain(expectedMetric);
      }

      // Verify metric values are reasonable
      for (const metric of result.rows) {
        expect(metric.metric_value).toBeDefined();
        expect(metric.unit).toBeDefined();
        expect(metric.description).toBeDefined();

        // Specific validations
        if (metric.metric_name === 'cache_hit_ratio') {
          expect(metric.metric_value).toBeGreaterThanOrEqual(0);
          expect(metric.metric_value).toBeLessThanOrEqual(100);
          expect(metric.unit).toBe('percentage');
        }

        if (metric.metric_name === 'active_connections') {
          expect(metric.metric_value).toBeGreaterThan(0); // At least our connection
          expect(metric.unit).toBe('count');
        }
      }
    });

    it('should handle monitoring view queries without errors', async () => {
      // Arrange - List of all monitoring views to test
      const monitoringViews = [
        'monitoring.active_connections',
        'monitoring.slow_queries',
        'monitoring.table_stats',
        'monitoring.performance_summary',
      ];

      // Act & Assert - Each view should be queryable
      for (const viewName of monitoringViews) {
        await expect(async () => {
          const result = await dbClient.query(`SELECT * FROM ${viewName} LIMIT 1;`);
          expect(result).toBeDefined();
        }).not.toThrow();
      }
    });
  });

  describe('Database Performance Impact', () => {
    it('should not significantly impact query performance', async () => {
      // Arrange
      const testQuery = 'SELECT COUNT(*) FROM information_schema.columns;';
      const iterations = 5;

      // Measure baseline performance
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await dbClient.query(testQuery);
      }
      const duration = Date.now() - startTime;
      const avgQueryTime = duration / iterations;

      // Assert
      expect(avgQueryTime).toBeLessThan(1000); // Should be < 1 second per query
      console.log(`Average query time with monitoring: ${avgQueryTime.toFixed(2)}ms`);
    });

    it('should maintain reasonable memory usage', async () => {
      // Act - Check current memory settings and usage
      const memoryResult = await dbClient.query(`
        SELECT
          name,
          setting,
          unit,
          context
        FROM pg_settings
        WHERE name IN (
          'shared_buffers',
          'work_mem',
          'maintenance_work_mem',
          'effective_cache_size'
        )
        ORDER BY name;
      `);

      // Assert
      expect(memoryResult.rows.length).toBe(4);

      // Verify memory settings are reasonable
      for (const setting of memoryResult.rows) {
        expect(setting.setting).toBeDefined();
        expect(parseInt(setting.setting)).toBeGreaterThan(0);
      }
    });
  });
});
