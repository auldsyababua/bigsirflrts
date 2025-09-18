# Retroactive Test Design Template

Use this template to create comprehensive test designs for stories that were
implemented without proper QA test planning.

## Command for QA Agent

```
*test-design {story_id}
```

**Example**: `*test-design 1.3` for Story 1.3

## Manual Process (if needed)

### Step 1: Story Analysis

```bash
# Read the story file
Read: docs/stories/{epic}.{story}.*.md

# Identify key components:
- Acceptance Criteria (AC1, AC2, etc.)
- Technical Requirements
- Implementation details
- Performance targets
- Security considerations
```

### Step 2: Test Level Assignment

Use this decision matrix for each testable scenario:

| Scenario Type                     | Test Level         | Priority Logic                                |
| --------------------------------- | ------------------ | --------------------------------------------- |
| Pure business logic, calculations | Unit               | P0 if revenue/security critical, P1 otherwise |
| API endpoints, data validation    | Integration        | P0 if user-facing, P1 if internal             |
| User workflows, critical paths    | E2E                | P0 if revenue-critical, P1 if core feature    |
| Configuration, setup              | Integration        | P1 typically                                  |
| Error handling                    | Unit + Integration | P0 for security/data, P1 otherwise            |

### Step 3: Risk-Based Prioritization

**P0 (Critical - Must Test)**:

- Revenue-impacting functionality
- Authentication/authorization
- Data persistence/integrity
- Security-critical paths
- Previously broken functionality

**P1 (High - Should Test)**:

- Core user journeys
- Frequently used features
- Complex business logic
- Integration points

**P2 (Medium - Nice to Test)**:

- Secondary features
- Admin functionality
- Configuration options

### Step 4: Test Scenario Creation

For each AC, create scenarios using this format:

```yaml
test_scenario:
  id: '{epic}.{story}-{LEVEL}-{SEQ}'
  requirement: 'AC{n}: {description}'
  priority: P0|P1|P2
  level: unit|integration|e2e
  description: 'What is being tested'
  justification: 'Why this level was chosen'
  implementation_status: missing|exists|needs_update
```

### Step 5: Generate Test Design Document

Create: `docs/qa/assessments/{epic}.{story}-test-design-{YYYYMMDD}.md`

Use the structure from Story 1.7 as the template.

## Required Outputs

1. **Test Design Document**: Complete test scenario breakdown
2. **Story Update**: Add QA Test Design section with reference
3. **Handoff Requirements**: Add Dev Team QA Handoff Requirements section
4. **Gap Analysis**: Document missing tests vs. what should exist

## Quality Checklist

- [ ] Every AC has test coverage
- [ ] Test levels are appropriate (not over-testing)
- [ ] No duplicate coverage across levels
- [ ] Priorities align with business risk
- [ ] P0 tests cover security/revenue scenarios
- [ ] Test IDs follow naming convention
- [ ] Implementation gaps identified
