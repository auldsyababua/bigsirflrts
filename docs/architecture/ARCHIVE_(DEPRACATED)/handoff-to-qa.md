# Architecture Handoff to QA/Testing Agent

## Executive Summary
Architecture phase complete. Critical testing requirements and documentation needs identified for QA validation before MVP launch.

## 🧪 Critical Testing Requirements

### 1. Database Connection Testing

**PostgreSQL Version Validation**
```sql
-- Test Case: Verify PostgreSQL version
-- Expected: Version >= 16.0
SELECT version();
-- Current Issue: FLRTS project on v15.8.1 (MUST be upgraded)
```

**Session Mode Connection Test**
```javascript
// Test Case: Verify Session Mode (port 5432) works correctly
const testConnection = {
  host: 'aws-0-[region].pooler.supabase.com',
  port: 5432,  // MUST be 5432, NOT 6543
  ssl: { mode: 'require' },
  expectedBehavior: 'Maintains connection state for prepared statements'
};

// Negative Test: Transaction Mode should FAIL for OpenProject
const failureTest = {
  port: 6543,  // Transaction mode - should fail
  expectedError: 'Prepared statements not supported in transaction mode'
};
```

### 2. Timezone Conversion Test Suite

**Required Test Coverage (Story 2.1)**
```typescript
interface TimezoneTestCases {
  // Edge Cases that MUST be tested:
  dstTransitions: [
    {
      input: "March 10, 2025 2:30 AM EST",  // During spring forward
      expectedOutput: "Correctly handles DST transition"
    },
    {
      input: "November 3, 2025 1:30 AM EST",  // During fall back
      expectedOutput: "Correctly handles DST ambiguity"
    }
  ],
  
  crossTimezoneScenarios: [
    {
      sender: "Joel (EST)",
      assignee: "Colin (PST)",
      input: "1pm my time",
      expectedAssigneeTime: "10:00 AM PST"
    },
    {
      sender: "Taylor (CST)",
      assignee: "Bryan (EST)",
      input: "EOD today",
      expectedAssigneeTime: "6:00 PM EST"  // CST 5pm = EST 6pm
    }
  ],
  
  relativeTimePatterns: [
    "tomorrow at 2pm",
    "next Monday",
    "in 3 hours",
    "EOD",
    "COB",
    "end of week"
  ]
}
```

### 3. OpenAI Integration Testing

**Parse Accuracy Test Dataset Requirements**
- **Current Gap**: Only 100 CREATE examples exist
- **Required**: 100 examples total covering:
  - 25 CREATE with timezone variations
  - 25 READ operations (list, filter, search)
  - 25 UPDATE operations (status, reassignment)
  - 25 ARCHIVE operations (soft delete only)

**Critical Validation Points**
```json
{
  "test_requirements": {
    "accuracy_target": "95%",
    "required_fields": [
      "operation",
      "confidence",
      "parse_rationale",  // NEW: Must be present in every response
      "time_context"
    ],
    "confidence_thresholds": {
      "auto_execute": 0.95,
      "require_confirmation": 0.80,
      "reject": 0.60
    }
  }
}
```

### 4. API Contract Testing

**OpenProject REST API v3 Test Cases**

```typescript
// CREATE Work Package Test
POST /api/v3/work_packages
Expected: 201 Created
Validate: Returns work_package_id

// READ with Filters Test  
GET /api/v3/work_packages?filters=[{"assignee":{"operator":"=","values":["taylor"]}}]
Expected: 200 OK
Validate: Only Taylor's tasks returned

// UPDATE Test (with lock version)
PATCH /api/v3/work_packages/:id
Body: { lockVersion: 1, subject: "Updated" }
Expected: 200 OK
Validate: lockVersion incremented to 2

// ARCHIVE Test (Soft Delete Only)
PATCH /api/v3/work_packages/:id
Body: { _links: { status: { href: "/api/v3/statuses/14" }}}
Expected: 200 OK
Validate: Status changed to "Archived", record NOT deleted
```

### 5. End-to-End Flow Testing

**Critical User Journey**
```
1. User sends Telegram message: "Hey @Taylor, review server logs by 1pm my time tomorrow"
2. FLRTS parses with OpenAI → Verify parse_rationale field present
3. Timezone conversion → Verify correct assignee timezone
4. API call to OpenProject → Verify work package created
5. Confirmation to user → Verify shows parsed JSON
6. Error recovery → Verify fallback to manual entry works
```

## 📋 Documentation Gaps for QA to Create

### 1. Test Plan Documentation
- [ ] Comprehensive test plan covering all architectural components
- [ ] Regression test suite for timezone conversions
- [ ] Performance benchmarks (< 5 second task creation)
- [ ] Load testing scenarios (5-10 concurrent users)

### 2. Testing Runbooks
- [ ] Database migration testing procedure
- [ ] Rollback testing procedures
- [ ] Health check validation runbook
- [ ] Error recovery testing guide

### 3. Validation Checklists
- [ ] Pre-deployment validation checklist
- [ ] Post-deployment smoke tests
- [ ] User acceptance test scenarios
- [ ] Security validation tests (SSL, authentication)

## 🔴 Blocking Issues for Testing

### Issue #1: PostgreSQL Version
- **Current**: v15.8.1
- **Required**: v16+
- **Impact**: Cannot proceed with OpenProject testing until resolved
- **Test Blocker**: YES

### Issue #2: Test Dataset Incomplete
- **Current**: Only CREATE examples
- **Required**: Full CRUD examples with timezone contexts
- **Impact**: Cannot validate 95% accuracy target
- **Test Blocker**: YES

### Issue #3: parse_rationale Field Missing
- **Current**: Not in PRD schema
- **Required**: For debugging and transparency
- **Impact**: Cannot validate parsing logic
- **Test Blocker**: NO (but should be added)

## 🎯 Testing Success Criteria

### Performance Metrics
- Task creation time: < 5 seconds (p95)
- API response time: < 500ms (p95)
- Timezone conversion: < 100ms
- OpenAI parsing: < 2 seconds

### Accuracy Metrics
- NLP parse accuracy: >= 95%
- Timezone conversion accuracy: 100%
- Entity recognition accuracy: >= 98%
- Operation type detection: 100%

### Reliability Metrics
- Health check uptime: > 99.9%
- Error recovery rate: > 95%
- Database connection stability: 0 connection drops
- No data loss during operations

## 🧪 Test Environment Requirements

### Infrastructure Setup
```yaml
test_environment:
  database:
    type: Supabase PostgreSQL
    version: ">= 16.0"  # CRITICAL
    mode: Session (port 5432)
    ssl: required
    
  services:
    - OpenProject: health endpoint working
    - FLRTS NLP: health endpoint working
    - Telegram Bot: test bot token configured
    
  test_data:
    - 100 synthetic test examples (full CRUD)
    - Test users in all timezones
    - Test projects configured
```

### Test Data Requirements
```sql
-- Test Users (must exist in OpenProject)
INSERT INTO users (name, timezone) VALUES
  ('Joel_Test', 'America/New_York'),
  ('Bryan_Test', 'America/New_York'),
  ('Taylor_Test', 'America/Chicago'),
  ('Colin_Test', 'America/Los_Angeles');

-- Test Projects
INSERT INTO projects (name, identifier) VALUES
  ('Site A Test', 'site-a-test'),
  ('Site B Test', 'site-b-test'),
  ('Site C Test', 'site-c-test');
```

## 🔄 Regression Test Priority

### P0 - Critical (Test First)
1. PostgreSQL Session Mode connectivity
2. Timezone conversion accuracy
3. OpenProject API CRUD operations
4. Soft delete (ARCHIVE) functionality

### P1 - High Priority
1. OpenAI parsing accuracy
2. Error recovery flows
3. Telegram bot message handling
4. Confirmation flow

### P2 - Medium Priority
1. Rate limiting
2. Health checks
3. Logging functionality
4. Backup procedures

## 📝 QA Action Items

1. **Immediate**:
   - Verify PostgreSQL version issue resolved before testing
   - Create missing CRUD test examples
   - Document test environment setup

2. **Before MVP**:
   - Execute full timezone test suite
   - Validate API contract with OpenProject
   - Performance testing under load
   - Security validation (SSL, auth)

3. **Documentation**:
   - Create test execution reports
   - Document known issues/limitations
   - Prepare user acceptance test scripts

## 🚀 Ready for Testing Checklist

Before QA can begin:
- [ ] PostgreSQL upgraded to v16+
- [ ] Test environment provisioned
- [ ] 100 test examples created (all CRUD types)
- [ ] Test users configured in OpenProject
- [ ] Health endpoints verified
- [ ] Test Telegram bot token obtained
- [ ] OpenAI API key configured for testing

## 🔗 Reference Documents

- Architecture Deliverables:
  - `/docs/architecture/api-contract.md` - API testing specs
  - `/docs/architecture/migration-strategy.md` - Migration test procedures
  - `/docs/architecture/openai-integration.md` - NLP testing requirements
  - `/docker-compose.yml` - Service configuration for test environment

---

**QA Contact Point**: For architecture clarifications, refer to handoff-to-pm.md for business context and this document for technical testing requirements.