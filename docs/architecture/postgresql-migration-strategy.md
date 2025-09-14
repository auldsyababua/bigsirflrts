# PostgreSQL Migration Strategy: 15.8.1 to 16+

## Current Situation
- **Production Database**: PostgreSQL 15.8.1 on Supabase (Project: FLRTS - `thnwlykidzhrsagyjncc`)
- **Requirement**: PostgreSQL 16+ for OpenProject integration
- **Inactive Alternative**: PostgreSQL 17 project exists (gpt-parser - `efedufzwziftrmlhbbzg`)
- **Schema Backup**: Complete backup saved in `supabase-schema-backup.sql`

## Migration Options Analysis

### Option 1: Upgrade Existing FLRTS Project
**Approach**: Contact Supabase support to upgrade from 15.8.1 to 16+

**Pros:**
- Preserves all existing data without migration
- Maintains existing connection strings
- No need to update application configurations
- Keeps existing Supabase project features/settings

**Cons:**
- Requires Supabase support intervention
- Potential downtime (estimated 2-4 hours)
- Risk of upgrade complications
- May not be immediately available

**Steps:**
1. Contact Supabase support for upgrade path
2. Schedule maintenance window (preferably weekend)
3. Backup all data before upgrade
4. Execute upgrade with Supabase support
5. Validate all tables and connections post-upgrade

### Option 2: Create New Supabase Project
**Approach**: Provision new project with PostgreSQL 16+ and migrate data

**Pros:**
- Clean start with latest PostgreSQL version
- Zero downtime migration possible (blue-green deployment)
- Full control over migration timing
- Opportunity to optimize schema during migration

**Cons:**
- Requires data migration scripts
- Need to update all connection strings
- Must recreate RLS policies and functions
- Additional cost during transition period

**Steps:**
1. Create new Supabase project with PostgreSQL 16+
2. Run schema creation script (`supabase-schema-backup.sql`)
3. Export data from old project using pg_dump
4. Import data to new project
5. Update application connection strings
6. Test thoroughly before cutover
7. Decommission old project after validation

### Option 3: Repurpose Inactive gpt-parser Project
**Approach**: Use existing PostgreSQL 17 project (`efedufzwziftrmlhbbzg`)

**Pros:**
- Already on PostgreSQL 17 (exceeds requirements)
- No need to create new project
- Immediate availability
- Cost-effective (already provisioned)

**Cons:**
- Need to clear any existing test data
- Project name doesn't match purpose
- May have different region/configuration

**Steps:**
1. Audit existing gpt-parser project for any data
2. Clear all existing tables if any
3. Run schema creation script
4. Migrate data from FLRTS project
5. Update connection strings
6. Rename project in Supabase dashboard if possible

## Recommendation

**Recommended Approach: Option 3 (Repurpose gpt-parser)**

**Rationale:**
1. Immediately available - no waiting for support
2. PostgreSQL 17 exceeds all requirements
3. Cost-effective - no additional project needed
4. Low risk - can test migration without affecting production

**Fallback**: If Option 3 has issues, proceed with Option 2 (new project)

## Migration Execution Plan

### Phase 1: Preparation (1-2 hours)
```bash
# 1. Audit target project
psql -h db.efedufzwziftrmlhbbzg.supabase.co -U postgres -d postgres -c "\dt"

# 2. Backup source data
pg_dump -h db.thnwlykidzhrsagyjncc.supabase.co -U postgres -d postgres \
  --data-only --no-owner --no-privileges > flrts_data_backup.sql

# 3. Count source records for validation
psql -h db.thnwlykidzhrsagyjncc.supabase.co -U postgres -d postgres \
  -f count_records.sql > source_counts.txt
```

### Phase 2: Schema Creation (30 minutes)
```bash
# 1. Clear target database (if needed)
psql -h db.efedufzwziftrmlhbbzg.supabase.co -U postgres -d postgres \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Create schema in target
psql -h db.efedufzwziftrmlhbbzg.supabase.co -U postgres -d postgres \
  -f supabase-schema-backup.sql
```

### Phase 3: Data Migration (1-2 hours)
```bash
# 1. Import data to target
psql -h db.efedufzwziftrmlhbbzg.supabase.co -U postgres -d postgres \
  -f flrts_data_backup.sql

# 2. Validate record counts
psql -h db.efedufzwziftrmlhbbzg.supabase.co -U postgres -d postgres \
  -f count_records.sql > target_counts.txt

# 3. Compare counts
diff source_counts.txt target_counts.txt
```

### Phase 4: Application Update (30 minutes)
```javascript
// Update Supabase connection in application
const supabase = createClient(
  'https://efedufzwziftrmlhbbzg.supabase.co',  // New URL
  'new-anon-key'  // New anon key
);

// Update OpenProject integration to use port 5432 (Session Mode)
const openProjectDb = {
  host: 'db.efedufzwziftrmlhbbzg.supabase.co',
  port: 5432,  // Session Mode for OpenProject
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD
};
```

### Phase 5: Validation (1 hour)
- [ ] Test Telegram bot task creation
- [ ] Verify OpenProject integration
- [ ] Check all CRUD operations
- [ ] Validate RLS policies
- [ ] Test real-time subscriptions
- [ ] Verify backup procedures

## Rollback Plan
If issues occur, immediately revert connection strings to original project:
```javascript
// Revert to original
const supabase = createClient(
  'https://thnwlykidzhrsagyjncc.supabase.co',
  'original-anon-key'
);
```

## Timeline
- **Total Estimated Time**: 4-6 hours
- **Recommended Window**: Weekend morning (minimal usage)
- **Team Required**: 1 developer, 1 tester
- **Notification**: Alert team 24 hours before migration

## Success Criteria
1. All data migrated successfully (record counts match)
2. OpenProject integration functional
3. Telegram bot operational
4. No data loss or corruption
5. Performance equal or better than original
6. All tests passing

## Post-Migration Tasks
1. Monitor error logs for 48 hours
2. Keep old project running for 1 week as backup
3. Document new connection details
4. Update all environment files
5. Schedule old project decommission after validation period