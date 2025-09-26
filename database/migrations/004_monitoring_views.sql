-- Migration: 004_monitoring_views.sql
-- Created: 2025-09-24 (Story 1.7 critical fix)
-- Purpose: Create monitoring schema and views for production PostgreSQL monitoring

-- Enable pg_stat_statements extension if not already enabled
-- Note: In Supabase, this is typically already enabled, but we check anyway
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring schema for all performance views
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Database performance metrics view
CREATE OR REPLACE VIEW monitoring.database_metrics AS
SELECT
  current_database() as database_name,
  numbackends as active_connections,
  xact_commit as transactions_committed,
  xact_rollback as transactions_rolled_back,
  blks_read as blocks_read,
  blks_hit as blocks_hit,
  ROUND(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) as cache_hit_ratio,
  tup_returned as rows_returned,
  tup_fetched as rows_fetched,
  tup_inserted as rows_inserted,
  tup_updated as rows_updated,
  tup_deleted as rows_deleted,
  conflicts as replication_conflicts,
  deadlocks,
  NOW() - stats_reset as stats_collection_duration
FROM pg_stat_database
WHERE datname = current_database();

-- Slow query identification view
CREATE OR REPLACE VIEW monitoring.slow_queries AS
SELECT
  queryid,
  LEFT(query, 100) as query_preview,
  calls,
  ROUND(total_exec_time::numeric, 2) as total_exec_time_ms,
  ROUND(mean_exec_time::numeric, 2) as mean_exec_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_exec_time_ms,
  ROUND(stddev_exec_time::numeric, 2) as stddev_exec_time_ms,
  rows,
  ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_ratio
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries averaging over 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Active connections monitoring view
CREATE OR REPLACE VIEW monitoring.active_connections AS
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as idle_in_transaction_aborted
FROM pg_stat_activity
WHERE pid <> pg_backend_pid();

-- Table statistics view for monitoring table usage patterns
CREATE OR REPLACE VIEW monitoring.table_stats AS
SELECT
  schemaname,
  relname as table_name,
  seq_scan as sequential_scans,
  seq_tup_read as sequential_rows_read,
  idx_scan as index_scans,
  idx_tup_fetch as index_rows_fetched,
  n_tup_ins as rows_inserted,
  n_tup_upd as rows_updated,
  n_tup_del as rows_deleted,
  n_live_tup as estimated_live_rows,
  n_dead_tup as estimated_dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY (seq_tup_read + idx_tup_fetch) DESC;

-- Performance summary view for quick health check
CREATE OR REPLACE VIEW monitoring.performance_summary AS
SELECT
  (SELECT active_connections FROM monitoring.database_metrics) as active_connections,
  (SELECT cache_hit_ratio FROM monitoring.database_metrics) as cache_hit_ratio_percent,
  (SELECT count(*) FROM monitoring.slow_queries) as slow_queries_count,
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query != '<IDLE>') as active_queries,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
  NOW() as snapshot_time;

-- Grant access to monitoring schema
GRANT USAGE ON SCHEMA monitoring TO authenticated;
GRANT SELECT ON monitoring.database_metrics TO authenticated;
GRANT SELECT ON monitoring.slow_queries TO authenticated;
GRANT SELECT ON monitoring.active_connections TO authenticated;
GRANT SELECT ON monitoring.table_stats TO authenticated;
GRANT SELECT ON monitoring.performance_summary TO authenticated;

-- Comment the views for documentation
COMMENT ON SCHEMA monitoring IS 'PostgreSQL performance monitoring views created by FLRTS Story 1.7';
COMMENT ON VIEW monitoring.database_metrics IS 'Database-level performance metrics including connections, transactions, and I/O statistics';
COMMENT ON VIEW monitoring.slow_queries IS 'Top 20 slowest queries based on pg_stat_statements data (>100ms average)';
COMMENT ON VIEW monitoring.active_connections IS 'Current connection state breakdown by session status';
COMMENT ON VIEW monitoring.table_stats IS 'Per-table usage statistics ordered by total data access';
COMMENT ON VIEW monitoring.performance_summary IS 'Quick health check summary of key performance indicators';