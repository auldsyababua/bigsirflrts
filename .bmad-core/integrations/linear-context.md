# Linear Context Integration for BMAD Agents

This file configures BMAD agents to read context from Linear as the Single Source of Truth.

## How BMAD Agents Use Linear

When a BMAD agent is triggered, it should:

1. **Check Linear for Context**
   - Read the current issue/project from Linear
   - Pull in related issues, comments, and attachments
   - Use Linear's roadmap and milestones for planning

2. **Update Linear on Progress**
   - Move issues through workflow states
   - Add comments with implementation details
   - Link generated artifacts

3. **Maintain Sync**
   - Git branches follow Linear naming: `colin/10n-[issue-number]-[title]`
   - PR descriptions auto-populate from Linear issues
   - Merge events close Linear issues

## Agent Context Retrieval

```javascript
// Example: PM Agent reads from Linear
async function getPMContext(issueId) {
  const linear = getLinearClient();
  const context = await linear.generateBMADContext(issueId);

  // PM Agent uses this context to:
  // - Understand project goals from Linear project
  // - Read requirements from issue description
  // - Check related issues for dependencies
  // - Review comments for stakeholder input

  return {
    projectBrief: context.project.description,
    requirements: context.issue.description,
    epics: context.context.parentIssues,
    userStories: context.context.subIssues,
    feedback: context.context.comments
  };
}
```

## Workflow Triggers

### Issue Created in Linear
1. If labeled "needs-prd" → Trigger PM Agent
2. If labeled "needs-architecture" → Trigger Architect Agent
3. If assigned to developer → Trigger Dev Agent

### Issue Status Changed
- **Backlog → Todo**: Prepare BMAD context
- **Todo → In Progress**: Create feature branch
- **In Progress → In Review**: Create PR
- **In Review → Done**: Merge and deploy

### Comment Added
- If mentions "@bmad" → Trigger appropriate agent
- If contains "??" → Trigger QA Agent
- If contains "ship it" → Trigger deployment

## Linear Data Mapping

### Linear → BMAD PRD
- Project Description → Product Vision
- Project Milestones → Release Plan
- Epic Issues → Major Features
- Sub-issues → User Stories
- Comments → Stakeholder Feedback

### Linear → BMAD Architecture
- Project Tech Labels → Tech Stack
- Issue Attachments → Design Docs
- Related Issues → System Dependencies
- Custom Fields → Non-functional Requirements

### Linear → BMAD Stories
- Issue Title → Story Title
- Issue Description → Acceptance Criteria
- Issue Estimate → Story Points
- Issue Labels → Story Tags
- Issue Priority → Story Priority

## CLI Commands

```bash
# Sync Linear issue to local context
node scripts/linear-sync.js --issue 10N-86

# Create issue from BMAD story
node scripts/linear-create.js --story "Implement user auth"

# Update Linear from git
node scripts/linear-update.js --branch $(git branch --show-current)

# Generate BMAD context from Linear
node scripts/linear-context.js --project BigSirFLRTS
```

## Environment Variables

```bash
# Required in .env
LINEAR_API_KEY=lin_api_xxxxx
LINEAR_TEAM_ID=2b0b568f-e5a6-40ac-866b-367a2564046a
LINEAR_PROJECT_ID=9d089be4-a284-4879-9b67-f472abecf998
```

## Best Practices

1. **Always Start in Linear**
   - Create issue first, then branch
   - Use Linear's templates for consistency
   - Add all context as comments

2. **Keep Linear Updated**
   - Move issues through states
   - Update estimates when they change
   - Close issues only when deployed

3. **Use Linear Features**
   - Cycles for sprint planning
   - Projects for feature grouping
   - Labels for categorization
   - Milestones for releases

4. **BMAD Agent Guidelines**
   - Read Linear before generating
   - Update Linear after completing
   - Link all artifacts to issues
   - Use Linear URLs in commits