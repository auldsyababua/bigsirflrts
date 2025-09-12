# Single Database Architecture: OpenProject + Supabase

## Overview

This document outlines the verified single-database architecture where OpenProject connects directly to Supabase PostgreSQL as its primary database. **FLRTS serves as an NLP interface layer** that uses OpenAI to translate natural language into OpenProject API calls - it does **NOT** replace the OpenProject UI, which remains fully available to users.

## Critical Architecture Points

### What FLRTS Is
- **NLP Interface Layer**: Natural language → OpenAI API → JSON → OpenProject API
- **Enhancement, Not Replacement**: Adds conversational capabilities to OpenProject
- **Multi-Channel Access**: Telegram, web UI, and future integrations
- **Smart Assistant**: Helps users create and manage tasks without learning OpenProject's interface

### What FLRTS Is NOT
- NOT a replacement for OpenProject UI
- NOT a database sync service
- NOT a separate project management system
- NOT middleware between OpenProject and its database

## Verified Technical Requirements

Based on the **OpenProject Architecture Verification Report**, the following requirements are **MANDATORY** for successful deployment:

### Database Connection Requirements

#### ✅ MUST Use Supavisor Session Mode
```bash
# CORRECT - Session Mode (Port 5432)
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require

# ❌ WRONG - Transaction Mode (Port 6543) - BREAKS RAILS
# DO NOT USE: Port 6543 breaks prepared statements required by Rails
```

**Critical**: OpenProject's Rails application **requires** prepared statements. Transaction mode (port 6543) is **incompatible** and will cause application failures.

### PostgreSQL Version Requirement
- **Minimum**: PostgreSQL 16
- **Recommended**: PostgreSQL 16 or 17
- **Verification**: Supabase provides PostgreSQL 16+ by default

### Security Configuration

#### Dedicated Database Role
```sql
-- Create dedicated role for OpenProject (NOT superuser)
CREATE ROLE openproject_user WITH LOGIN PASSWORD 'secure_password';

-- Grant necessary permissions
GRANT CREATE ON DATABASE postgres TO openproject_user;
GRANT ALL ON SCHEMA openproject TO openproject_user;
```

#### Schema Isolation
```sql
-- OpenProject schema (isolated from business data)
CREATE SCHEMA IF NOT EXISTS openproject AUTHORIZATION openproject_user;

-- Business data schema (10NetZero operations)
CREATE SCHEMA IF NOT EXISTS business;

-- FLRTS metadata schema
CREATE SCHEMA IF NOT EXISTS flrts;
```

### Object Storage Configuration

#### Cloudflare R2 Requirements
```bash
# MANDATORY: Disable direct uploads for R2 compatibility
OPENPROJECT_DIRECT__UPLOADS=false

# R2 Configuration
OPENPROJECT_FOG_PROVIDER=aws
OPENPROJECT_FOG_ENDPOINT=https://[ACCOUNT-ID].r2.cloudflarestorage.com
OPENPROJECT_FOG_REGION=auto
OPENPROJECT_FOG_AWS_ACCESS_KEY_ID=[R2_ACCESS_KEY]
OPENPROJECT_FOG_AWS_SECRET_ACCESS_KEY=[R2_SECRET_KEY]
OPENPROJECT_FOG_BUCKET=[BUCKET_NAME]
```

**Critical**: `OPENPROJECT_DIRECT__UPLOADS=false` is **mandatory** for R2. Direct uploads are not supported by R2's S3 compatibility layer.

## Architecture Benefits

### Eliminated Complexity
- ❌ **No database sync services** - Direct connection eliminates sync logic
- ❌ **No conflict resolution** - Single source of truth
- ❌ **No webhook sync loops** - No bidirectional sync to manage
- ❌ **No dual schema management** - One database, logical schema separation

### Simplified Architecture
- ✅ **Single database** - One Supabase PostgreSQL instance
- ✅ **Direct integration** - OpenProject connects natively
- ✅ **Real-time consistency** - No sync delays
- ✅ **NLP enhancement** - FLRTS adds natural language capabilities
- ✅ **Unified monitoring** - Single database to monitor

## Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  openproject:
    image: openproject/openproject:14
    environment:
      # MANDATORY: Use Session Mode (port 5432)
      DATABASE_URL: postgres://openproject_user:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
      
      # Schema configuration
      OPENPROJECT_DB_SCHEMA: openproject
      
      # R2 Object Storage (MANDATORY: direct_uploads=false)
      OPENPROJECT_DIRECT__UPLOADS: "false"
      OPENPROJECT_FOG_PROVIDER: aws
      OPENPROJECT_FOG_ENDPOINT: ${R2_ENDPOINT}
      OPENPROJECT_FOG_AWS_ACCESS_KEY_ID: ${R2_ACCESS_KEY}
      OPENPROJECT_FOG_AWS_SECRET_ACCESS_KEY: ${R2_SECRET_KEY}
      
      # Additional configuration
      SECRET_KEY_BASE: ${OPENPROJECT_SECRET_KEY}
      OPENPROJECT_HOST: ${DOMAIN_NAME}
    
    # NO local postgres service - using external Supabase
    
  flrts-nlp:
    build: ./packages/flrts-nlp
    environment:
      # FLRTS connects to OpenProject API, not database
      OPENPROJECT_API_URL: http://openproject:8080/api/v3
      OPENPROJECT_API_KEY: ${OPENPROJECT_API_KEY}
      
      # OpenAI for NLP processing
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      
      # Supabase for FLRTS metadata only
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
```

## Database Schema Organization

```sql
-- Three logical schemas in one Supabase instance

-- 1. OpenProject operational data (managed by OpenProject)
openproject.work_packages
openproject.projects  
openproject.users
openproject.attachments

-- 2. Business data (10NetZero operations)
business.clients
business.projects
business.invoices
business.carbon_credits

-- 3. FLRTS metadata (NLP processing and user preferences)
flrts.nlp_conversations
flrts.user_preferences
flrts.telegram_mappings
flrts.api_usage_logs
```

## FLRTS Integration Flow

```mermaid
graph LR
    User[User Input] -->|Natural Language| FLRTS[FLRTS NLP Service]
    FLRTS -->|Process with| OpenAI[OpenAI API]
    OpenAI -->|JSON Structure| FLRTS
    FLRTS -->|API Calls| OPApi[OpenProject API]
    OPApi -->|CRUD Operations| DB[(Supabase PostgreSQL)]
    
    User2[User] -->|Direct Access| OPUI[OpenProject UI]
    OPUI -->|Native Operations| DB
```

## Performance Optimization

### Caching Strategy
```nginx
# Cloudflare caching for static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Dynamic content - no cache
location /api/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### Connection Pool Management
```yaml
# OpenProject connection pool settings
OPENPROJECT_DATABASE_POOL: 25  # Adjust based on worker count
OPENPROJECT_DATABASE_TIMEOUT: 5000
```

## Regional Deployment Requirements

### Co-location Strategy
- **Supabase Region**: Choose based on primary user location
- **Digital Ocean VM**: **MUST** be in same region as Supabase
- **Cloudflare R2**: Auto-routed globally (region: auto)

Example regional setup:
```bash
# US West deployment
SUPABASE_REGION=us-west-1
DIGITALOCEAN_REGION=sfo3  # San Francisco (closest to us-west-1)

# Europe deployment  
SUPABASE_REGION=eu-central-1
DIGITALOCEAN_REGION=fra1  # Frankfurt (same region)
```

## Migration Path

### From Initial Architecture (D1 + Sync)
1. **Export data from Cloudflare D1**
2. **Import to Supabase PostgreSQL** 
3. **Configure OpenProject with DATABASE_URL**
4. **Deploy FLRTS NLP service**
5. **Remove all sync services and D1 dependencies**

### Fresh Deployment
1. **Create Supabase project** (PostgreSQL 16+)
2. **Configure schemas and roles**
3. **Deploy OpenProject** with DATABASE_URL
4. **Configure R2 object storage**
5. **Deploy FLRTS NLP service**
6. **Configure Telegram bot and webhooks**

## Cost Analysis

### Simplified Cost Structure
- **Digital Ocean VM**: $48/month (4GB RAM minimum)
- **Supabase PostgreSQL**: $25/month (Pro tier)
- **Cloudflare R2**: ~$5/month (usage-based)
- **OpenAI API**: ~$20/month (usage-based)
- **Total**: ~$98/month

**Savings**: Eliminated complexity reduces development and maintenance costs significantly.

## Risk Mitigation

### Connection Reliability
- **Primary**: Direct connection via Session Mode
- **Monitoring**: Health checks every 30 seconds
- **Alerting**: PagerDuty integration for downtime

### Backup Strategy
- **Automatic**: Supabase daily backups (7-day retention)
- **Manual**: Weekly pg_dump to R2
- **Point-in-time**: Available through Supabase dashboard

### Security Measures
- **Network**: SSL/TLS enforced (sslmode=require)
- **Database**: Dedicated role without superuser access
- **API**: Key rotation every 90 days
- **Monitoring**: Audit logs for all database operations

## Implementation Checklist

### Pre-deployment Verification
- [ ] Supabase PostgreSQL version ≥16
- [ ] Session Mode connection string (port 5432)
- [ ] Dedicated database role created
- [ ] Schemas created (openproject, business, flrts)
- [ ] R2 bucket configured
- [ ] VM in same region as Supabase

### Deployment Steps
- [ ] Configure DATABASE_URL with Session Mode
- [ ] Set OPENPROJECT_DIRECT__UPLOADS=false
- [ ] Deploy OpenProject container
- [ ] Verify database migrations
- [ ] Deploy FLRTS NLP service
- [ ] Configure Telegram webhook
- [ ] Test end-to-end flow

### Post-deployment Validation
- [ ] OpenProject UI accessible
- [ ] Database connections stable
- [ ] R2 file uploads working
- [ ] FLRTS NLP processing functional
- [ ] Telegram commands responding
- [ ] Monitoring alerts configured

## Obsolete Documentation

The following documents/stories are now **OBSOLETE** due to single-database architecture:
- Epic 2: Core Entity Sync (entire epic)
- Story 2.1: OpenProject webhooks sync
- Any sync service specifications
- Conflict resolution documentation
- Database synchronization monitoring

## Summary

This architecture leverages OpenProject's native PostgreSQL support to eliminate all synchronization complexity while adding an intelligent NLP layer through FLRTS. Users can choose to interact with OpenProject through its standard UI or use natural language via FLRTS - both operating on the same single source of truth in Supabase PostgreSQL.

**Key Success Factors**:
1. **MUST** use Supavisor Session Mode (port 5432)
2. **MUST** set OPENPROJECT_DIRECT__UPLOADS=false for R2
3. **MUST** use PostgreSQL ≥16
4. **MUST** deploy VM in same region as Supabase
5. **SHOULD** implement proper schema isolation
6. **SHOULD** configure comprehensive monitoring