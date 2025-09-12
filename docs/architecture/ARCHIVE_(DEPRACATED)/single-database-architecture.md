# Single Database Architecture: OpenProject + Supabase

## Overview

This document outlines the simplified single-database architecture where OpenProject uses Supabase PostgreSQL as its only database via DATABASE_URL configuration. This approach **eliminates all database synchronization complexity** by having both OpenProject and FLRTS services share the same Supabase PostgreSQL instance.

## Architecture Benefits

### Eliminated Complexity
- ❌ **No database sync services** - No complex bidirectional sync logic
- ❌ **No conflict resolution** - Single source of truth eliminates conflicts  
- ❌ **No webhook sync loops** - No need for loop prevention logic
- ❌ **No sync monitoring** - No sync health checks or failure recovery
- ❌ **No dual schema management** - One database schema to maintain

### Simplified Architecture
- ✅ **Single database** - Supabase PostgreSQL serves both systems
- ✅ **Direct integration** - OpenProject writes directly to Supabase
- ✅ **Real-time consistency** - No eventual consistency delays
- ✅ **Unified monitoring** - Single database to monitor and backup
- ✅ **Cost reduction** - No separate database infrastructure

## Technical Implementation

### Database Configuration

#### OpenProject Environment Variables
```bash
# Direct connection (recommended for production)
DATABASE_URL=postgres://postgres.projectref:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require

# Alternative: Pooled connection (for high concurrency)  
DATABASE_URL=postgres://postgres.projectref:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&prepared_statements=false

# Additional SSL configuration (if needed)
OPENPROJECT_DB_SSLMODE=require
OPENPROJECT_DB_SSL_MIN_PROTOCOL_VERSION=TLSv1.2
```

#### Connection Type Trade-offs
| Connection Type | Port | Pros | Cons | Use Case |
|-----------------|------|------|------|----------|
| **Direct** | 5432 | Full PostgreSQL compatibility, prepared statements | Limited connections (~60) | Standard deployment |
| **Pooled** | 6543 | Supports many connections, good for serverless | No prepared statements | High concurrency |

### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  openproject:
    image: openproject/openproject:14
    environment:
      DATABASE_URL: ${SUPABASE_DATABASE_URL}
      SECRET_KEY_BASE: ${OPENPROJECT_SECRET_KEY}
      OPENPROJECT_HOST: ${DOMAIN_NAME}
    # NO postgres service - using external Supabase
    
  nlp-service:
    build: ./packages/nlp-service
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      
  # No local PostgreSQL container needed
```

### Security Requirements

#### SSL/TLS Configuration
- **Mandatory**: Supabase requires SSL connections
- **Configuration**: `sslmode=require` in DATABASE_URL
- **Certificates**: Managed automatically by Supabase
- **Protocol**: TLS 1.2+ enforced

#### Connection Security
```bash
# Environment variables for secure configuration
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=$(op read "op://vault/supabase/password")
SUPABASE_REGION=us-west-1

# Generated DATABASE_URL
DATABASE_URL=postgres://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-${SUPABASE_REGION}.pooler.supabase.com:5432/postgres?sslmode=require
```

## Database Schema Considerations

### Shared Tables
Both OpenProject and FLRTS will operate on the same PostgreSQL instance but with clear separation:

```sql
-- OpenProject tables (managed by OpenProject migrations)
work_packages, projects, users, attachments, etc.

-- FLRTS tables (managed by FLRTS migrations)  
tasks_metadata, webhook_logs, user_preferences, etc.

-- Shared/Bridge tables (if needed)
user_mappings (flrts_user_id <-> openproject_user_id)
```

### Row Level Security (RLS)
Supabase RLS can be used to ensure data isolation:
```sql
-- Enable RLS on FLRTS tables
ALTER TABLE tasks_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- OpenProject tables use application-level security
-- (RLS not needed as OpenProject handles authorization)
```

## Migration Strategy

### From Two-Database Architecture

1. **Backup existing data**:
   ```bash
   # Backup OpenProject's current database
   pg_dump -Fc -h localhost -p 5432 -U openproject openproject > op_backup.dump
   ```

2. **Restore to Supabase**:
   ```bash
   # Restore to Supabase PostgreSQL
   pg_restore --clean --if-exists \
     -h aws-0-region.pooler.supabase.com \
     -p 5432 -U postgres.projectref \
     -d postgres op_backup.dump
   ```

3. **Update configuration**:
   ```bash
   # Update OpenProject configuration
   openproject config:set DATABASE_URL="postgres://postgres.projectref:password@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require"
   openproject reconfigure  # Skip database wizard
   ```

4. **Remove local PostgreSQL**:
   ```yaml
   # Remove from docker-compose.yml
   # services:
   #   db:  # DELETE THIS ENTIRE SERVICE
   ```

### Fresh Installation
1. Create Supabase project
2. Configure DATABASE_URL pointing to Supabase
3. Deploy OpenProject - it will run migrations automatically
4. Deploy FLRTS services with same Supabase configuration

## Monitoring and Operations

### Health Checks
```typescript
// Single database health check
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await supabase
      .from('work_packages')  // OpenProject table
      .select('id')
      .limit(1);
    
    return !result.error;
  } catch (error) {
    return false;
  }
}
```

### Backup Strategy
- **Automatic**: Supabase handles automated backups
- **Manual**: Use `pg_dump` for additional backup control
- **Point-in-time recovery**: Available through Supabase dashboard

### Performance Monitoring
```sql
-- Monitor connection usage
SELECT COUNT(*) as active_connections,
       application_name
FROM pg_stat_activity 
WHERE state = 'active'
GROUP BY application_name;

-- Monitor slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Impact on Existing Stories

### Stories That Become Obsolete
- **Story 2.1**: OpenProject webhooks sync - No longer needed
- **Epic 2**: Core Entity Sync - Completely eliminated
- All conflict resolution and sync monitoring stories

### Stories That Remain Relevant
- **Story 1.1**: OpenProject deployment (with DATABASE_URL config)
- **Story 1.2**: Webhook configuration (for external integrations)
- **Story 1.3**: Telegram integration (unchanged)

### New Requirements
- **Database Migration Story**: Migrate existing data to Supabase
- **SSL Configuration Story**: Ensure proper TLS setup
- **Connection Monitoring Story**: Monitor shared database health

## Cost Analysis

### Before (Two Databases)
- Digital Ocean VM: $48/month
- Supabase PostgreSQL: $25/month
- **Total**: $73/month + sync service complexity

### After (Single Database)  
- Digital Ocean VM: $48/month (no local PostgreSQL)
- Supabase PostgreSQL: $25/month (higher usage)
- **Total**: $73/month, **zero sync complexity**

**Net benefit**: Same cost, dramatically reduced complexity.

## Risk Assessment

### Low Risks
- **Supabase reliability**: 99.9% SLA, automatic backups
- **SSL/TLS**: Managed automatically by Supabase
- **Performance**: Dedicated database resources

### Mitigation Strategies
- **Connection limits**: Use pooled connections if needed
- **Backup strategy**: Implement additional manual backups
- **Monitoring**: Set up database performance alerts
- **Failover**: Document connection string switching process

## Next Steps

1. **Validate current OpenProject data requirements**
2. **Create migration scripts for existing data** 
3. **Update docker-compose.yml to remove local PostgreSQL**
4. **Test DATABASE_URL connection with SSL requirements**
5. **Update all documentation to reflect single database architecture**
6. **Revise Epic 2 and related stories to focus on OpenProject configuration**

This architecture change represents a significant simplification that maintains all functionality while eliminating the most complex aspects of the original design.