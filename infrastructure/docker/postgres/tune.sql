-- PostgreSQL Performance Tuning for n8n Queue Mode
-- Execute these settings after PostgreSQL initialization

-- Performance settings for n8n
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';

-- Apply changes
SELECT pg_reload_conf();

-- Create indexes for n8n performance
-- Note: These should be created after n8n initializes its database schema
CREATE INDEX IF NOT EXISTS idx_execution_workflow ON execution_entity(workflowId);
CREATE INDEX IF NOT EXISTS idx_execution_status ON execution_entity(status);
CREATE INDEX IF NOT EXISTS idx_execution_started ON execution_entity(startedAt);