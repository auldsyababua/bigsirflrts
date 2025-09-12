# OpenProject Integration Plan

## Current State
- **Supabase**: Complete FLRTS business system with 74 tables
- **OpenProject**: Project management tool with rigid work_packages schema
- **Goal**: Use OpenProject for project visualization while Supabase remains SSOT

## User Stories

### Epic 1: Task Management Integration
**As a** field operations manager  
**I want to** see all FLRTS tasks in OpenProject  
**So that I can** use OpenProject's Gantt charts and project views for planning

#### Story 1.1: Create Tasks in Supabase → Appear in OpenProject
- When a task is created in Supabase
- Then it should automatically create a work package in OpenProject
- And track the sync status in Supabase

#### Story 1.2: Update Task Status in OpenProject → Sync to Supabase
- When a work package status changes in OpenProject
- Then it should update the corresponding task in Supabase
- And maintain Supabase as SSOT

#### Story 1.3: Assign Tasks to Personnel
- Map Supabase flrts_users to OpenProject users
- Handle assignment changes in both directions
- Deal with users that exist in one system but not the other

### Epic 2: Field Operations Visualization
**As a** project manager  
**I want to** visualize field operations in OpenProject  
**So that I can** track equipment, sites, and personnel assignments

#### Story 2.1: Site-Based Work Packages
- Group tasks by site_id
- Create OpenProject projects or categories for each site
- Show site-specific timelines

#### Story 2.2: Equipment Maintenance Tracking
- Map equipment maintenance tasks to OpenProject
- Create recurring work packages for scheduled maintenance
- Track equipment downtime

#### Story 2.3: Field Report Integration
- Link field reports to related work packages
- Attach photos/documents from Supabase storage
- Show field report status in OpenProject

### Epic 3: Resource Management
**As a** resource coordinator  
**I want to** manage personnel and partner assignments  
**So that I can** optimize resource allocation

#### Story 3.1: Personnel Availability
- Show personnel assignments in OpenProject
- Track availability and workload
- Handle PTO and scheduling conflicts

#### Story 3.2: Partner/Contractor Management
- Map partners table to OpenProject
- Track partner assignments to tasks
- Monitor partner performance metrics

### Epic 4: Financial Integration
**As a** finance manager  
**I want to** track project costs in OpenProject  
**So that I can** monitor budgets and expenses

#### Story 4.1: Invoice Tracking
- Link invoices to work packages
- Show cost summaries in OpenProject
- Track payment status

#### Story 4.2: Budget Management
- Set budgets for OpenProject projects
- Track actual vs planned costs
- Generate financial reports

## Technical Architecture

### Data Flow
```
Supabase (SSOT) ←→ Sync Service ←→ OpenProject (Visualization)
```

### Sync Strategy
1. **Phase 1: One-way sync** (Supabase → OpenProject)
   - Real-time via webhooks for creates/updates
   - Batch sync for initial load
   - Error recovery and retry logic

2. **Phase 2: Bidirectional sync**
   - OpenProject webhooks → Sync Service → Supabase
   - Conflict resolution (Supabase wins as SSOT)
   - Field-level sync tracking

3. **Phase 3: Advanced features**
   - File attachments sync
   - Comments/discussions sync
   - Custom field mapping

### Entity Mapping

| Supabase Table | OpenProject Entity | Notes |
|----------------|-------------------|-------|
| tasks | work_packages | Core mapping done |
| flrts_users | users | Need user mapping table |
| sites | projects or categories | TBD |
| partners | users (type=contractor) | TBD |
| field_reports | work_packages (type=report) | TBD |
| equipment | assets or work_packages | TBD |
| invoices | cost_entries | TBD |
| maintenance_schedules | recurring work_packages | TBD |

### Priority Mapping Fix
Current issue: Supabase "High" → OpenProject "Normal"

```javascript
// Current (incorrect)
function mapPriority(supabasePriority: string | null): number {
  const priorityMap: Record<string, number> = {
    'immediate': 1,  // High
    'high': 1,       // High
    'normal': 2,     // Normal
    'low': 3,        // Low
  };
  return priorityMap[supabasePriority || 'normal'] || 2;
}

// Should be (Supabase uses High/Medium/Low)
function mapPriority(supabasePriority: string | null): number {
  const priorityMap: Record<string, number> = {
    'High': 1,       // OpenProject High
    'Medium': 2,     // OpenProject Normal  
    'Low': 3,        // OpenProject Low
  };
  return priorityMap[supabasePriority || 'Medium'] || 2;
}
```

## Implementation Phases

### Phase 1: MVP (Current Sprint)
- [x] Basic task sync (Supabase → OpenProject)
- [ ] Fix priority mapping
- [ ] Set up Supabase webhooks
- [ ] Handle sync errors gracefully
- [ ] Create user mapping table

### Phase 2: Bidirectional Sync
- [ ] OpenProject webhooks setup
- [ ] Status sync (OpenProject → Supabase)
- [ ] Assignment sync
- [ ] Conflict resolution

### Phase 3: Full Integration
- [ ] Site/Project mapping
- [ ] Field reports integration
- [ ] Equipment tracking
- [ ] Partner management
- [ ] Financial integration

## Open Questions
1. Should sites map to OpenProject projects or categories?
2. How to handle users that exist in one system but not the other?
3. Should we sync comments/discussions?
4. How to handle file attachments?
5. What's the sync frequency for batch operations?
6. How to handle deleted items?

## Next Steps
1. Fix priority mapping bug
2. Create user mapping table in Supabase
3. Set up Supabase webhook for tasks table
4. Implement error handling and retry logic
5. Create OpenProject webhook handler