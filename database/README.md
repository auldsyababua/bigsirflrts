# FLRTS Database Architecture

## Overview
Single Supabase PostgreSQL 15.8 database with schema separation for FLRTS and OpenProject.

## Directory Structure
```
database/
├── README.md                    # This file
├── backups/                    # Database backups
│   └── supabase-schema-backup.sql
├── migrations/                 # Schema migrations
│   ├── 001_initial_schema.sql
│   ├── 002_openproject_schema.sql
│   └── 003_flrts_tables.sql
├── schemas/                    # Current schema definitions
│   ├── public/                # FLRTS tables
│   │   ├── tables.sql
│   │   ├── functions.sql
│   │   └── policies.sql
│   └── openproject/           # OpenProject tables
│       ├── tables.sql
│       └── references.sql
└── seeds/                     # Sample data
    ├── development.sql
    └── test.sql
```

## Database Architecture

### Schema Separation
- **public schema**: FLRTS tables (lists, reminders, tasks)
- **openproject schema**: OpenProject tables with foreign key to public.personnel

### Key Tables

#### Public Schema (FLRTS)
- `personnel` - User management with Telegram integration
- `lists` - List management with JSONB items
- `reminders` - Scheduled notifications
- `tasks` - OpenProject task cache
- `list_templates` - Reusable list templates
- `list_shares` - Sharing and permissions

#### OpenProject Schema
- `openproject.users` - Duplicates personnel with FK reference
- `openproject.work_packages` - Tasks and sub-tasks
- `openproject.projects` - Project organization
- All other OpenProject tables as required

## PostgreSQL Version
**15.8** - Validated and confirmed compatible with both Supabase and OpenProject

## Key Features
- Row-Level Security (RLS) for multi-tenancy
- JSONB for flexible list items storage
- Temporal data types with timezone support
- Foreign key constraints between schemas
- Trigger-based sync between schemas

## Connection
All connections through Supabase:
- Edge Functions for <500ms operations
- n8n workflows for complex operations
- OpenProject connects to openproject schema