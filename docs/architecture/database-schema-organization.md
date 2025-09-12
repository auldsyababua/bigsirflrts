# Database Schema Organization

## Single Supabase PostgreSQL Instance Architecture

This document illustrates the logical schema organization within the single Supabase PostgreSQL database that serves OpenProject, FLRTS, and 10NetZero business operations.

## Schema Diagram

```mermaid
graph TB
    subgraph "Supabase PostgreSQL (Single Instance)"
        subgraph "openproject schema"
            OP1[work_packages]
            OP2[projects]
            OP3[users]
            OP4[attachments]
            OP5[workflows]
            OP6[custom_fields]
            OP7[journals]
            OP8[relations]
        end
        
        subgraph "business schema"
            BZ1[clients]
            BZ2[projects]
            BZ3[sites]
            BZ4[invoices]
            BZ5[carbon_credits]
            BZ6[equipment]
            BZ7[maintenance_logs]
            BZ8[energy_production]
        end
        
        subgraph "flrts schema"
            FL1[nlp_conversations]
            FL2[user_preferences]
            FL3[telegram_mappings]
            FL4[api_usage_logs]
            FL5[task_metadata]
            FL6[webhook_logs]
        end
        
        subgraph "public schema"
            PB1[migrations]
            PB2[schema_version]
        end
    end
    
    OPUI[OpenProject UI] -->|Direct DB Connection<br/>Port 5432 Session Mode| openproject
    FLRTS[FLRTS NLP Service] -->|OpenProject API| OPAPI[OpenProject API]
    OPAPI -->|Internal Access| openproject
    FLRTS -->|Supabase API| flrts
    BizApp[Business Apps] -->|Supabase API| business
```

## Schema Details

### openproject Schema
**Owner**: `openproject_user` role  
**Purpose**: OpenProject application tables managed by Rails migrations  
**Access**: Direct database connection via DATABASE_URL

Key tables:
- **work_packages**: Tasks, issues, features (core work items)
- **projects**: Project hierarchy and organization
- **users**: User accounts and authentication
- **attachments**: File attachments (metadata only, files in R2)
- **workflows**: Status transitions and rules
- **custom_fields**: User-defined fields
- **journals**: Audit trail and history
- **relations**: Work package relationships

### business Schema
**Owner**: `business_user` role  
**Purpose**: 10NetZero operational data  
**Access**: Supabase API with Row Level Security

Key tables:
- **clients**: Customer information
- **projects**: Business projects (distinct from OpenProject projects)
- **sites**: Physical locations/mining sites
- **invoices**: Billing and financial records
- **carbon_credits**: Carbon credit tracking
- **equipment**: Mining equipment inventory
- **maintenance_logs**: Equipment maintenance history
- **energy_production**: Energy generation metrics

### flrts Schema
**Owner**: `flrts_user` role  
**Purpose**: FLRTS metadata and user preferences  
**Access**: Supabase API with Row Level Security

Key tables:
- **nlp_conversations**: NLP processing history
- **user_preferences**: User settings and preferences
- **telegram_mappings**: Telegram user to system user mapping
- **api_usage_logs**: OpenAI API usage tracking
- **task_metadata**: Additional task metadata not in OpenProject
- **webhook_logs**: Webhook processing history

### public Schema
**Purpose**: Shared system tables  
**Access**: Read-only for all roles

Key tables:
- **migrations**: Database migration history
- **schema_version**: Current schema version

## Connection Configuration

### OpenProject Connection
```sql
-- Connection string (MUST use Session Mode)
DATABASE_URL=postgres://openproject_user:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require

-- Schema search path
SET search_path TO openproject, public;
```

### FLRTS Service Connection
```javascript
// Supabase client for FLRTS metadata
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'flrts' }
});

// OpenProject API for task operations
const openprojectApi = new OpenProjectAPI({
  baseUrl: 'http://openproject:8080/api/v3',
  apiKey: OPENPROJECT_API_KEY
});
```

### Business Applications
```javascript
// Supabase client for business data
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'business' }
});
```

## Security Model

### Role-Based Access Control
```sql
-- OpenProject role (restricted to openproject schema)
GRANT ALL ON SCHEMA openproject TO openproject_user;
GRANT USAGE ON SCHEMA public TO openproject_user;
REVOKE ALL ON SCHEMA business, flrts FROM openproject_user;

-- Business role (restricted to business schema)
GRANT ALL ON SCHEMA business TO business_user;
GRANT USAGE ON SCHEMA public TO business_user;
REVOKE ALL ON SCHEMA openproject, flrts FROM business_user;

-- FLRTS role (restricted to flrts schema)
GRANT ALL ON SCHEMA flrts TO flrts_user;
GRANT USAGE ON SCHEMA public TO flrts_user;
REVOKE ALL ON SCHEMA openproject, business FROM flrts_user;
```

### Row Level Security (RLS)
```sql
-- Enable RLS on business tables
ALTER TABLE business.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on FLRTS tables
ALTER TABLE flrts.nlp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flrts.user_preferences ENABLE ROW LEVEL SECURITY;

-- OpenProject manages its own security through Rails
-- No RLS needed on openproject schema
```

## Data Flow

### Task Creation via FLRTS
1. User sends natural language input to FLRTS
2. FLRTS processes with OpenAI → generates JSON
3. FLRTS calls OpenProject API to create work_package
4. OpenProject writes to `openproject.work_packages`
5. FLRTS stores metadata in `flrts.task_metadata`

### Direct OpenProject Usage
1. User accesses OpenProject UI
2. Creates/updates work packages directly
3. Data written to `openproject` schema
4. Webhooks notify external systems (optional)

### Business Operations
1. Business apps use Supabase API
2. Data operations on `business` schema
3. Complete isolation from OpenProject data
4. Can reference work packages via IDs if needed

## Migration Path

### From Separate Databases
```sql
-- 1. Create schemas
CREATE SCHEMA IF NOT EXISTS openproject;
CREATE SCHEMA IF NOT EXISTS business;
CREATE SCHEMA IF NOT EXISTS flrts;

-- 2. Create roles
CREATE ROLE openproject_user WITH LOGIN PASSWORD 'secure_password';
CREATE ROLE business_user WITH LOGIN PASSWORD 'secure_password';
CREATE ROLE flrts_user WITH LOGIN PASSWORD 'secure_password';

-- 3. Grant permissions
GRANT ALL ON SCHEMA openproject TO openproject_user;
GRANT ALL ON SCHEMA business TO business_user;
GRANT ALL ON SCHEMA flrts TO flrts_user;

-- 4. Restore OpenProject data
pg_restore --schema=openproject --role=openproject_user \
  -h aws-0-region.pooler.supabase.com -p 5432 \
  -U postgres.projectref -d postgres openproject_backup.dump

-- 5. Import business data
-- (Application-specific migration)
```

## Benefits of This Architecture

1. **No Synchronization Needed**: Single source of truth
2. **Logical Separation**: Clear boundaries between systems
3. **Security**: Role-based access control at schema level
4. **Performance**: No cross-database queries or sync delays
5. **Simplicity**: One database to backup, monitor, and maintain
6. **Cost Effective**: Single managed database instance
7. **Scalability**: Supabase handles scaling automatically

## Monitoring Queries

### Check schema sizes
```sql
SELECT 
  schema_name,
  pg_size_pretty(sum(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)))::bigint) as size
FROM pg_tables
WHERE schemaname IN ('openproject', 'business', 'flrts')
GROUP BY schema_name;
```

### Active connections by schema
```sql
SELECT 
  schemaname,
  count(*) as connections
FROM pg_stat_activity
JOIN pg_tables ON pg_stat_activity.datname = current_database()
WHERE schemaname IN ('openproject', 'business', 'flrts')
GROUP BY schemaname;
```

### Table row counts
```sql
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname IN ('openproject', 'business', 'flrts')
ORDER BY schemaname, tablename;
```

## Backup Strategy

### Automated Backups
- Supabase provides automated daily backups
- 7-day retention for Pro tier
- Point-in-time recovery available

### Manual Backup Commands
```bash
# Full database backup
pg_dump -Fc -h aws-0-region.pooler.supabase.com -p 5432 \
  -U postgres.projectref -d postgres > full_backup.dump

# Schema-specific backups
pg_dump --schema=openproject ... > openproject_backup.dump
pg_dump --schema=business ... > business_backup.dump
pg_dump --schema=flrts ... > flrts_backup.dump
```

## Summary

This single-database architecture with logical schema separation provides the simplicity of one database while maintaining clear boundaries between OpenProject, business operations, and FLRTS metadata. The elimination of synchronization complexity dramatically reduces development effort and operational overhead while maintaining all required functionality.