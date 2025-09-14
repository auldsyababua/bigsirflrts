# Epic 2: Core Entity Sync

**Epic ID**: FLRTS-EP02
**Epic Name**: Core Entity Sync
**Epic Type**: Core Business Logic

## Business Value Statement

As field operations managers and project coordinators, we need seamless synchronization of core business entities (tasks, users, sites) between FLRTS and OpenProject so that we can leverage OpenProject's powerful project visualization, Gantt charts, and resource planning capabilities while maintaining our operational workflow in FLRTS.

This epic delivers the core business value of the integration by making tasks visible in OpenProject for project planning while keeping FLRTS as the operational hub for field teams.

## Success Criteria

### Primary Success Metrics

- [ ] All FLRTS tasks automatically appear as OpenProject work packages with correct status, priority, and assignments
- [ ] Users can update task status and assignments in OpenProject, with changes reflected in FLRTS
- [ ] Site-based project organization enables clear project visibility in OpenProject
- [ ] Field teams continue using FLRTS without workflow disruption
- [ ] Project managers gain access to Gantt charts and resource planning views

### Acceptance Criteria

- 100% of FLRTS tasks sync to OpenProject within 30 seconds
- Status updates in OpenProject propagate to FLRTS bidirectionally
- User assignments work correctly in both directions
- Sites are properly organized as OpenProject projects or categories
- No data loss during sync operations
- Conflict resolution maintains FLRTS as SSOT

## Dependencies

### Prerequisites

- Epic 1 (Foundation & Authentication) must be completed
- Webhook infrastructure operational
- Authentication and error handling working

### External Dependencies

- FLRTS user base defined and stable
- OpenProject user accounts created and managed
- Site taxonomy decisions made (projects vs categories)

## Technical Overview

### Entity Mapping Strategy

| FLRTS Entity | OpenProject Entity | Mapping Notes |
|--------------|-------------------|---------------|
| tasks | work_packages | Core 1:1 mapping with status sync |
| flrts_users | users | Requires user mapping table |
| sites | projects OR categories | Business decision needed |
| task assignments | work_package assignees | Bidirectional with conflict resolution |
| task status | work_package status | Custom status mapping |
| task priority | work_package priority | Fixed mapping (High → 1, Medium → 2, Low → 3) |

### Sync Patterns

1. **Create Operations**: FLRTS → OpenProject (one-way for new entities)
2. **Update Operations**: Bidirectional with FLRTS precedence
3. **Delete Operations**: Soft delete in OpenProject, hard delete respects FLRTS
4. **Assignment Operations**: Bidirectional with user validation

### Data Consistency Model

- **Single Source of Truth**: FLRTS Supabase database
- **Conflict Resolution**: FLRTS data wins in all conflicts
- **Eventual Consistency**: Brief sync delays acceptable
- **Rollback Strategy**: Failed operations rollback automatically

## User Stories

### Task Synchronization Stories

1. **Task Creation Sync**: New FLRTS tasks automatically create OpenProject work packages
2. **Task Update Sync**: Changes to task details propagate bidirectionally
3. **Task Status Sync**: Status changes in either system sync to the other
4. **Task Priority Sync**: Fix and maintain correct priority mapping
5. **Task Deletion Sync**: Handle task deletion appropriately in both systems

### User Management Stories

6. **User Mapping Creation**: Create and maintain flrts_users ↔ OpenProject users mapping
7. **User Assignment Sync**: Task assignments sync bidirectionally
8. **User Validation**: Ensure assigned users exist in both systems
9. **User Creation Handling**: Handle users that exist in one system but not the other
10. **User Permission Sync**: Respect user roles and permissions across systems

### Site Organization Stories

11. **Site-Project Mapping**: Implement chosen approach (sites as projects OR categories)
12. **Site-Based Task Grouping**: Group tasks by site in OpenProject views
13. **Site Hierarchy Sync**: Maintain site relationships and hierarchies
14. **Site Access Control**: Respect site-based access permissions

### Advanced Synchronization Stories

15. **Bulk Sync Operations**: Handle large batches of changes efficiently
16. **Historical Data Migration**: Sync existing tasks and relationships
17. **Custom Field Mapping**: Map FLRTS custom fields to OpenProject custom fields
18. **Attachment Handling**: Plan for future file/attachment synchronization

### Data Quality & Validation Stories

19. **Data Validation**: Ensure data meets both systems' validation rules
20. **Orphaned Record Handling**: Clean up orphaned records from failed syncs
21. **Duplicate Prevention**: Prevent duplicate entries in either system
22. **Data Consistency Checks**: Regular validation of sync accuracy

## Technical Implementation Details

### Priority Mapping Fix

```typescript
// Current incorrect mapping
function mapPriority(flrtsPriority: string | null): number {
  const priorityMap: Record<string, number> = {
    'immediate': 1,  // Wrong - doesn't exist in FLRTS
    'high': 1,       // Wrong - FLRTS uses 'High' (capital H)
    'normal': 2,     // Wrong - FLRTS uses 'Medium'
    'low': 3,        // Wrong - FLRTS uses 'Low' (capital L)
  };
  return priorityMap[flrtsPriority || 'normal'] || 2;
}

// Corrected mapping
function mapPriority(flrtsPriority: string | null): number {
  const priorityMap: Record<string, number> = {
    'High': 1,       // OpenProject High priority
    'Medium': 2,     // OpenProject Normal priority  
    'Low': 3,        // OpenProject Low priority
  };
  return priorityMap[flrtsPriority || 'Medium'] || 2;
}
```

### User Mapping Table Schema

```sql
CREATE TABLE user_mappings (
  id SERIAL PRIMARY KEY,
  flrts_user_id UUID REFERENCES flrts_users(id),
  openproject_user_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  sync_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(flrts_user_id, openproject_user_id)
);
```

### Site Organization Decision Matrix

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| Sites as Projects | Clear hierarchy, better reporting | More complex, potential project bloat | < 50 sites |
| Sites as Categories | Simpler structure, easier management | Less hierarchy, limited reporting | > 50 sites |

## Technical Debt & Known Issues

### Issues from Epic 1 to Address

1. **Priority Mapping Bug**: Fix the priority mapping as detailed above
2. **User Mapping Missing**: Implement user_mappings table and logic
3. **Authentication Issues**: Ensure service can authenticate properly

### New Technical Debt Items

- Implement proper database indexing for sync performance
- Add comprehensive logging for sync operations
- Create automated testing for all sync scenarios
- Implement sync performance monitoring

## Risk Assessment

### High Risks

- **User Mapping Complexity**: Users may exist in one system but not the other
- **Data Volume**: Large task volumes may impact sync performance
- **Site Taxonomy Decision**: Wrong choice impacts entire integration

### Medium Risks

- **Bidirectional Sync Conflicts**: Race conditions during simultaneous updates
- **OpenProject Schema Constraints**: Work package validation may reject FLRTS data

### Low Risks

- **Priority Mapping**: Clear fix identified and straightforward to implement
- **Status Mapping**: Both systems have compatible status concepts

## Timeline Estimate

**Duration**: 4-5 sprints (8-10 weeks)

### Sprint Breakdown

- **Sprint 1**: Task sync (FLRTS → OpenProject), priority mapping fix
- **Sprint 2**: User mapping table, user assignment sync
- **Sprint 3**: Bidirectional task updates, status sync
- **Sprint 4**: Site organization implementation
- **Sprint 5**: Historical data migration, testing, refinement

## Definition of Done

- [ ] All FLRTS tasks visible in OpenProject with correct data
- [ ] Task status and assignments sync bidirectionally
- [ ] User mapping system operational and maintained
- [ ] Site organization provides clear project structure
- [ ] Sync operates within performance SLAs (< 30 seconds)
- [ ] Comprehensive testing covers all sync scenarios
- [ ] Data integrity maintained across all operations
- [ ] Documentation complete for troubleshooting and maintenance

## Success Metrics

### Quantitative Metrics

- Sync latency: < 30 seconds for 95% of operations
- Sync accuracy: > 99.9% of operations complete successfully
- System uptime: > 99.5% availability
- Data consistency: Zero data loss events

### Qualitative Metrics

- Field teams report no workflow disruption
- Project managers successfully use OpenProject views
- Support requests related to sync issues < 5% of total tickets

## Next Epic

Epic 3: Field Operations Integration will extend the core entity sync to include field reports, equipment, and maintenance schedules, bringing operational field data into project management visibility.
