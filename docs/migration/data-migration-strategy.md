# ERPNext Data Migration Strategy

**Status:** Not Started **Phase:** Phase 1.5 **Related Linear:**
[10N-232](https://linear.app/10netzero/issue/10N-232) **Date Created:**
2025-10-01

## Purpose

Define the strategy for migrating production data from OpenProject/Supabase to
ERPNext. This document outlines the approach, validation requirements, rollback
procedures, and testing strategy.

## Prerequisites

- [ ] Schema mapping completed (schema-mapping.md)
- [ ] ERPNext instance deployed to production
- [ ] Backup procedures tested
- [ ] Migration scripts developed
- [ ] Test data migration completed successfully

## Migration Approach

### Decision: Big Bang vs Incremental

_To be decided during Phase 1.5 execution_

#### Option 1: Big Bang Migration

**Pros:**

- Clean cutover
- No dual-write complexity
- Simpler to reason about

**Cons:**

- Higher risk
- Requires downtime
- No gradual rollout

#### Option 2: Incremental Migration

**Pros:**

- Lower risk
- Can validate in production
- Gradual rollout by feature

**Cons:**

- Complex dual-write logic
- More development effort
- Longer migration period

### Recommended Approach

_To be filled during Phase 1.5 execution based on data volume, business
constraints, and risk tolerance_

---

## Entity Migration Order

Entities must be migrated in dependency order:

1. **[Entity with no dependencies]**
   - No parent relationships
   - Safe to migrate first

2. **[Entity with dependencies]**
   - Depends on: #1
   - Migration order critical

3. **[Continue...]**

---

## Data Validation Requirements

### Pre-Migration Validation

- [ ] Verify all source data is accessible
- [ ] Check for data integrity issues
- [ ] Validate foreign key relationships
- [ ] Identify orphaned records
- [ ] Check for duplicate data

### Post-Migration Validation

- [ ] Record counts match (source vs target)
- [ ] Sample data spot checks
- [ ] Relationship integrity verified
- [ ] Custom field values correct
- [ ] Timestamps preserved
- [ ] User assignments correct

### Validation Scripts

Location: `scripts/migration/validation/`

Required scripts:

- `validate-counts.ts` - Compare record counts
- `validate-relationships.ts` - Verify foreign keys
- `validate-sample-data.ts` - Spot check data quality
- `validate-completeness.ts` - Check all entities migrated

---

## Migration Scripts

### Script Structure

```
scripts/migration/
├── extract/          # Extract data from OpenProject/Supabase
├── transform/        # Transform to ERPNext format
├── load/            # Load into ERPNext
├── validation/      # Validate migration success
└── rollback/        # Rollback procedures
```

### Key Scripts

1. **extract-entities.ts**
   - Extract all entities from source
   - Export to JSON/CSV
   - Preserve relationships

2. **transform-to-erpnext.ts**
   - Map fields to ERPNext schema
   - Apply transformations
   - Generate ERPNext import format

3. **load-to-erpnext.ts**
   - Import into ERPNext via API
   - Handle errors gracefully
   - Log progress

4. **validate-migration.ts**
   - Run all validation scripts
   - Generate migration report
   - Flag issues

---

## Rollback Procedures

### Rollback Triggers

Rollback if:

- Validation fails (>5% error rate)
- Critical data missing
- System performance degraded
- Business operations impacted

### Rollback Steps

1. **Immediate Actions**
   - [ ] Stop migration scripts
   - [ ] Switch application back to OpenProject
   - [ ] Restore database from backup if needed
   - [ ] Notify stakeholders

2. **Data Cleanup**
   - [ ] Delete partial ERPNext data
   - [ ] Restore OpenProject to last known good state
   - [ ] Verify rollback successful

3. **Post-Mortem**
   - [ ] Document what went wrong
   - [ ] Identify root cause
   - [ ] Update migration scripts
   - [ ] Plan retry

### Backup Strategy

- **Pre-Migration Backup:**
  - Full Supabase database dump
  - Export all OpenProject data
  - Backup ERPNext instance (empty state)

- **During Migration:**
  - Checkpoint backups every N records
  - Log all operations for replay

- **Retention:**
  - Keep backups for 30 days post-migration

---

## Testing Strategy

### Test Environments

1. **Dev Environment**
   - Test with synthetic data
   - Validate script functionality
   - Test error handling

2. **Staging Environment**
   - Use production data copy
   - Full end-to-end migration test
   - Performance testing

3. **Production Environment**
   - Final migration
   - Monitoring and validation

### Test Scenarios

#### Scenario 1: Happy Path

- Migrate all entities successfully
- All validations pass
- System operational

#### Scenario 2: Partial Failure

- Migration fails mid-way
- Rollback procedure works
- Data integrity maintained

#### Scenario 3: Performance Test

- Large data volume
- Migration completes within SLA
- System remains responsive

### Test Data

- **Minimum:** 100 records per entity
- **Recommended:** Full production data copy
- **Edge Cases:** Orphaned records, nulls, edge values

---

## Migration Timeline

### Phase 1: Preparation (Estimated: [Duration])

- [ ] Develop migration scripts
- [ ] Create validation scripts
- [ ] Set up test environments
- [ ] Create backups

### Phase 2: Testing (Estimated: [Duration])

- [ ] Dev environment migration
- [ ] Staging environment migration
- [ ] Performance testing
- [ ] Rollback testing

### Phase 3: Production Migration (Estimated: [Duration])

- [ ] Final backup
- [ ] Execute migration
- [ ] Run validations
- [ ] Switch over
- [ ] Monitor

### Phase 4: Validation & Stabilization (Estimated: [Duration])

- [ ] 24-hour monitoring
- [ ] User acceptance testing
- [ ] Fix any issues
- [ ] Final sign-off

---

## Downtime Requirements

### Estimated Downtime

- **Best Case:** [X hours]
- **Expected:** [Y hours]
- **Worst Case:** [Z hours]

### Maintenance Window

- **Date/Time:** TBD
- **Duration:** [Hours]
- **Communication:** [How users will be notified]

---

## Monitoring & Observability

### During Migration

Monitor:

- Migration script progress
- Error rates
- API response times
- Database performance

### Post-Migration

Monitor:

- Application errors
- User-reported issues
- System performance
- Data discrepancies

### Alerts

Set up alerts for:

- Migration failures
- Validation errors
- System performance degradation
- User-facing errors

---

## Success Criteria

Migration is successful when:

- [ ] All entities migrated (100%)
- [ ] Validation passes (<1% error rate)
- [ ] Application functional
- [ ] Users can access data
- [ ] Performance acceptable
- [ ] No critical bugs
- [ ] Stakeholder sign-off

---

## Communication Plan

### Before Migration

- Notify users 2 weeks in advance
- Provide training on ERPNext changes
- Set expectations for downtime

### During Migration

- Status updates every hour
- Escalation contacts available
- Real-time progress dashboard

### After Migration

- Success announcement
- User support available
- Feedback collection

---

## References

- [Schema Mapping](schema-mapping.md)
- [ERPNext API Documentation](https://docs.erpnext.com/api)
- [Migration Scripts](../../scripts/migration/)
