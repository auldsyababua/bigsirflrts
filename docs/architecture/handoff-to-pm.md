# Architecture Handoff to PM - Critical Updates Required

## Executive Summary
Architecture review complete. Several critical issues discovered that require PRD and story updates before implementation can proceed.

## 🚨 CRITICAL ISSUE #1: PostgreSQL Version Mismatch

### Current State
- **FLRTS Supabase Project**: PostgreSQL 15.8.1 ❌
- **PRD Requirement (NFR6)**: PostgreSQL 16+ ✅
- **Impact**: OpenProject may have compatibility issues

### Required Story Updates

**NEW Story 1.2.5: Database Version Validation**
```
As a system administrator,
I want to ensure the Supabase database meets version requirements,
So that OpenProject runs without compatibility issues.

Acceptance Criteria:
1. IF existing FLRTS project (PostgreSQL 15.8.1):
   - Document upgrade path from v15 to v16
   - Schedule maintenance window for upgrade
   - Test OpenProject compatibility post-upgrade
2. OR create new Supabase project with PostgreSQL 16+
3. Verify version via SQL: SELECT version();
4. Document decision and rationale in migration log
```

## 🚨 CRITICAL ISSUE #2: OpenAI Response Missing Rationale Field

### Current State
The PRD's OpenAI response schema (Story 2.2) is missing a critical field for parsing rationale/explanation.

### Required PRD Update

**Update Story 2.2 OpenAI Response Schema** to include:
```json
{
  "operation": "CREATE|READ|UPDATE|ARCHIVE",
  "flrt_type": "TASK|LIST",
  "data": {
    // ... existing fields ...
  },
  "confidence": 0.95,
  "parse_rationale": "Identified 'Taylor' as assignee based on @mention. Interpreted '1pm his time' as 1:00 PM CST since Taylor is in CST timezone. Marked as CREATE operation because user wants to assign new task.",
  "parse_errors": []
}
```

### Why This Matters
- Provides transparency for debugging
- Helps users understand parsing decisions
- Critical for improving prompts based on reasoning patterns
- Required for audit trail and continuous improvement

## 📋 Missing/Incomplete Story Elements

### 1. Environment Variable Management
**Add to Story 1.2:**
```
Acceptance Criteria Addition:
5. Create .env file from .env.example template
6. Validate all required environment variables are set
7. Use 'op' command for secrets from 1Password where applicable
8. Document which values come from Supabase dashboard
```

### 2. Connection String Clarification
**Update Story 1.3:**
```
Current: "Connection string uses port 5432"
Update to: "Connection string uses Session Mode on port 5432 with format:
postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require"

Add Note: Never use port 6543 (transaction mode) as it's incompatible with OpenProject
```

### 3. Test Dataset Expansion
**Update Story 2.2:**
```
Current: "100 synthetic examples" (CREATE only)
Required: Expand test dataset to include:
- 25 CREATE examples with timezone variations
- 25 READ examples (list, filter, search patterns)
- 25 UPDATE examples (status changes, reassignments)
- 25 ARCHIVE examples (soft delete patterns)
- Each example must include:
  * Raw input
  * Expected parsed output with rationale
  * Timezone context scenarios
```

### 4. Error Recovery Procedures
**NEW Story 2.3.5: Error Recovery & Fallback**
```
As a user,
I want clear fallback options when NLP parsing fails,
So that I can still create tasks efficiently.

Acceptance Criteria:
1. On parse failure, bot responds with:
   - Error message explaining what couldn't be parsed
   - Suggestion for manual correction
   - Direct link to OpenProject mobile UI
2. Log failed parses for prompt improvement
3. If confidence < 80%, show parsed JSON for confirmation
4. Implement manual override command: /force {json}
```

### 5. Health Check Validation
**Add to Story 1.4:**
```
Acceptance Criteria Addition:
6. Verify all health endpoints:
   - OpenProject: GET /health_checks/default → 200
   - FLRTS NLP: GET /health → 200
   - Telegram Bot: GET /health → 200
   - Database: SELECT 1 succeeds
7. Set up automated health monitoring (every 30s)
8. Configure alerts for health check failures
```

## 📊 Architecture Decisions Requiring PM Validation

### 1. Schema Strategy
**Decision Made**: Three separate schemas
- `openproject` - Owned by OpenProject, managed via migrations
- `flrts` - For NLP logs and telegram sessions only
- `n8n` - Optional, for workflow automation

**PM Action Required**: Confirm this separation aligns with data governance requirements

### 2. Backup Strategy
**Proposed**: Daily automated backups with 7-day retention
**PM Action Required**: Validate retention period meets compliance requirements

### 3. Rate Limiting
**Proposed**: 20 requests per minute per user
**PM Action Required**: Confirm this meets expected usage patterns

### 4. Deployment Region
**Current**: Supabase in us-east-2
**PM Action Required**: Confirm VM deployment should also be in AWS us-east-2

## 🔄 Story Sequence Recommendations

### Phase 1: Foundation (Week 1)
1. **Story 1.2.5** (NEW) - Validate/upgrade PostgreSQL version
2. **Story 1.3** - Supabase setup with correct connection string
3. **Story 1.2** - VM provisioning in same region
4. **Story 1.4** - OpenProject deployment with health checks

### Phase 2: Core Services (Week 2)  
1. **Story 2.1** - Timezone conversion function with full test coverage
2. **Story 2.2** - OpenAI integration with rationale field
3. **Story 2.3** - OpenProject API integration
4. **Story 2.3.5** (NEW) - Error recovery procedures

### Phase 3: Interface (Week 3)
1. **Story 3.1** - Telegram bot setup
2. **Story 3.2** - Confirmation flow
3. **Story 3.3** - Basic notifications

## ✅ Completed Architecture Deliverables

1. **docker-compose.yml** - Production-ready with all services
2. **API Contract** - Complete FLRTS-OpenProject integration spec
3. **Migration Strategy** - Zero-downtime migration plan
4. **OpenAI Integration** - Comprehensive NLP architecture

## 🎯 Key Success Metrics to Add

Add to PRD's Success Metrics section:
- PostgreSQL version ≥ 16.0 verified
- All health endpoints return 200 within 5s
- OpenAI responses include parse_rationale field
- 95% parse accuracy on expanded 100-example test set
- Timezone conversion 100% accurate on test cases
- Error recovery path used < 5% of requests
- Average task creation time < 5 seconds
- Zero data loss during migration

## 🚦 Go/No-Go Checklist for MVP Launch

Before launching MVP, verify:
- [ ] Supabase on PostgreSQL 16+
- [ ] All environment variables configured
- [ ] Health checks passing
- [ ] 100-example test dataset created (all CRUD ops)
- [ ] OpenAI returning rationale in responses
- [ ] Timezone conversion tested across DST boundary
- [ ] Error recovery flow documented
- [ ] Backup strategy implemented
- [ ] Cloudflare Tunnel configured
- [ ] Manual snapshot taken

## 📝 Documentation Gaps to Fill

1. Create runbook for common operational tasks
2. Document troubleshooting guide for connection issues  
3. Create user guide for Telegram bot commands
4. Write deployment checklist
5. Document rollback procedures

---

**PM Next Steps:**
1. Update Story 1.2.5 for PostgreSQL version issue
2. Add parse_rationale to OpenAI response schema
3. Expand test dataset requirements
4. Validate architectural decisions above
5. Adjust story points based on new requirements
6. Schedule PostgreSQL upgrade or project creation

**Critical Decision Required**: 
Should we upgrade existing FLRTS project from v15 to v16, or create new project with v16+?