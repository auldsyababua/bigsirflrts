# PostgreSQL to Supabase Migration Strategy

## Executive Summary
This document outlines the zero-downtime migration strategy from local PostgreSQL to Supabase-hosted PostgreSQL for the FLRTS system. The migration focuses on Epic 1 requirements with OpenProject connecting directly to Supabase, eliminating all synchronization complexity.

## Pre-Migration Checklist

### 1. Environment Validation
- [ ] Verify Supabase project is on PostgreSQL 16+
- [ ] Confirm Session Mode availability on port 5432
- [ ] Test SSL connectivity with `sslmode=require`
- [ ] Validate network latency < 50ms
- [ ] Ensure VM is in same region as Supabase

### 2. Backup Strategy
- [ ] Take manual Supabase snapshot before migration
- [ ] Export existing Docker PostgreSQL data
- [ ] Document rollback procedure
- [ ] Store backups in multiple locations

## Migration Phases

### Phase 1: Supabase Setup (Story 1.3)

```sql
-- Create OpenProject schema and role
CREATE SCHEMA IF NOT EXISTS openproject;
CREATE ROLE openproject_app WITH LOGIN PASSWORD 'secure-password';

-- Grant permissions
GRANT USAGE, CREATE ON SCHEMA openproject TO openproject_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA openproject 
  GRANT ALL ON TABLES TO openproject_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA openproject 
  GRANT ALL ON SEQUENCES TO openproject_app;

-- Create FLRTS schema for logging (separate from OpenProject)
CREATE SCHEMA IF NOT EXISTS flrts;
GRANT USAGE, CREATE ON SCHEMA flrts TO openproject_app;

-- Create n8n schema (optional)
CREATE SCHEMA IF NOT EXISTS n8n;
GRANT USAGE, CREATE ON SCHEMA n8n TO openproject_app;
```

### Phase 2: Connection String Configuration

#### Session Mode Connection (Required for OpenProject)
```
postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

**Critical Settings**:
- Port: `5432` (Session Mode - maintains connection state)
- SSL Mode: `require` (mandatory for security)
- Application Name: Include for monitoring

### Phase 3: Data Migration Options

#### Option A: Fresh Install (Recommended for MVP)
1. Start with clean Supabase database
2. Let OpenProject run migrations
3. Manually recreate essential data
4. No complex ETL required

**Steps**:
```bash
# 1. Set DATABASE_URL in docker-compose.yml
DATABASE_URL="postgres://postgres.xxxxx:password@host:5432/postgres?sslmode=require"

# 2. Start OpenProject container
docker-compose up -d openproject

# 3. Run OpenProject migrations
docker-compose exec openproject bundle exec rake db:migrate

# 4. Seed initial data
docker-compose exec openproject bundle exec rake db:seed
```

#### Option B: Data Export/Import (If Historical Data Needed)
```bash
# 1. Export from existing PostgreSQL
docker-compose exec postgres pg_dump \
  -h localhost -U openproject -d openproject \
  --schema=public \
  --no-owner --no-acl \
  -f /tmp/openproject_backup.sql

# 2. Prepare dump for Supabase
# Remove any PostgreSQL-specific extensions
sed -i '/CREATE EXTENSION/d' openproject_backup.sql
sed -i '/COMMENT ON EXTENSION/d' openproject_backup.sql

# 3. Import to Supabase (using psql)
PGPASSWORD=your-password psql \
  "postgres://postgres.xxxxx:password@host:5432/postgres?sslmode=require" \
  -f openproject_backup.sql
```

### Phase 4: Schema Isolation

```sql
-- Ensure proper schema isolation
SET search_path TO openproject;

-- OpenProject tables go here
-- Examples:
-- work_packages
-- projects
-- users
-- attachments

SET search_path TO flrts;

-- FLRTS logging tables only
CREATE TABLE IF NOT EXISTS nlp_requests (
  id SERIAL PRIMARY KEY,
  request_id UUID DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  raw_input TEXT NOT NULL,
  parsed_output JSONB,
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_sessions (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE NOT NULL,
  user_context JSONB,
  last_activity TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 5: Validation & Testing

#### Connection Test Script
```javascript
// test-connection.js
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase');
    
    // Test schema access
    const result = await client.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('openproject', 'flrts')"
    );
    console.log('✅ Schemas found:', result.rows);
    
    // Test write capability
    await client.query(
      "INSERT INTO flrts.nlp_requests (user_id, raw_input) VALUES ($1, $2) RETURNING id",
      ['test-user', 'test input']
    );
    console.log('✅ Write test successful');
    
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  } finally {
    await client.end();
  }
}

testConnection();
```

### Phase 6: Cutover Procedure

#### Zero-Downtime Migration Steps
1. **Preparation** (T-24 hours)
   - Take final backup of existing system
   - Verify Supabase setup complete
   - Test all connection strings

2. **Maintenance Window** (T-0, ~15 minutes)
   ```bash
   # Stop existing services
   docker-compose down
   
   # Update .env with Supabase credentials
   cp .env.supabase .env
   
   # Start services with new configuration
   docker-compose up -d
   
   # Verify health checks
   docker-compose ps
   curl http://localhost:8080/health_checks/default
   ```

3. **Validation** (T+15 minutes)
   - Create test work package via UI
   - Send test Telegram message
   - Verify NLP parsing works
   - Check logs for errors

4. **Rollback Plan** (if needed)
   ```bash
   # Restore original configuration
   cp .env.backup .env
   docker-compose down
   docker-compose up -d
   ```

## Post-Migration Tasks

### Monitoring Setup
```sql
-- Create monitoring views
CREATE VIEW flrts.api_performance AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as request_count,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN confidence < 0.8 THEN 1 END) as low_confidence_count
FROM flrts.nlp_requests
GROUP BY 1;

-- Connection monitoring
SELECT 
  datname,
  numbackends as active_connections,
  xact_commit as transactions,
  blks_hit / NULLIF(blks_read, 0) as cache_hit_ratio
FROM pg_stat_database
WHERE datname = 'postgres';
```

### Backup Configuration
```yaml
# Add to docker-compose.yml
backup:
  image: postgres:16-alpine
  command: |
    sh -c "
    while true; do
      PGPASSWORD=$$SUPABASE_DB_PASSWORD pg_dump \
        -h $$SUPABASE_HOST \
        -U postgres.$$SUPABASE_PROJECT_REF \
        -d postgres \
        --schema=openproject \
        --schema=flrts \
        -f /backups/backup_$$(date +%Y%m%d_%H%M%S).sql
      find /backups -name 'backup_*.sql' -mtime +7 -delete
      sleep 86400
    done
    "
  environment:
    - SUPABASE_HOST
    - SUPABASE_PROJECT_REF
    - SUPABASE_DB_PASSWORD
  volumes:
    - ./backups:/backups
```

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Connection Pool Exhaustion
**Symptom**: `too many connections` error
**Solution**: 
- Use Session Mode (port 5432) for persistent connections
- Implement connection pooling in application
- Monitor with: `SELECT count(*) FROM pg_stat_activity;`

#### 2. SSL Connection Failures
**Symptom**: `SSL connection required` error
**Solution**:
- Always include `sslmode=require` in connection string
- For Node.js: `ssl: { rejectUnauthorized: false }`

#### 3. Schema Permission Issues
**Symptom**: `permission denied for schema`
**Solution**:
```sql
GRANT USAGE ON SCHEMA openproject TO openproject_app;
GRANT ALL ON ALL TABLES IN SCHEMA openproject TO openproject_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA openproject TO openproject_app;
```

#### 4. Transaction Mode Incompatibility
**Symptom**: Prepared statements fail
**Solution**: 
- Never use port 6543 (transaction mode)
- Always use port 5432 (session mode)
- Disable prepared statements if necessary

## Success Metrics

- [ ] OpenProject health check returns 200
- [ ] Work packages created successfully via API
- [ ] Telegram bot processes messages
- [ ] NLP service parses with >95% accuracy
- [ ] Database connections stable (<50 active)
- [ ] Response times <500ms p95
- [ ] Zero data loss during migration