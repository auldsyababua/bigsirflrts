# Linear as Single Source of Truth (SSOT) Integration

## Architecture Overview

Linear serves as the authoritative source for all project planning, task
management, and development workflow orchestration. This document outlines how
Linear integrates with BMAD-Method and the BigSirFLRTS codebase.

## Core Principles

### 1. Linear Method Alignment

- **Issues, Not Stories**: Write clear, actionable tasks in plain language
- **Project-Focused**: All work tied to meaningful projects with clear outcomes
- **Cycles**: 1-2 week development cycles for focused execution
- **Ownership**: Developers write their own implementation issues

### 2. Information Flow

```
Linear (SSOT)
    ├── Projects & Roadmap (Strategic Direction)
    ├── Issues & Tasks (Execution Details)
    └── Documentation (Context & Decisions)
           ↓
    Automation Layer
    ├── Webhook Handler (Real-time sync)
    ├── Linear MCP Server (API access)
    └── Git Integration (Branch management)
           ↓
    BMAD Agents
    ├── Read context from Linear
    ├── Update issue status
    └── Generate artifacts
           ↓
    Codebase
    └── Implementation guided by Linear
```

## Project Structure

### BigSirFLRTS Project Organization

1. **Project Level** (BigSirFLRTS)
   - Overall product vision and milestones
   - Quarterly objectives
   - Release planning

2. **Epic Issues**
   - Major feature areas
   - Cross-functional initiatives
   - Integration points

3. **Implementation Issues**
   - Specific tasks (backend, frontend, infrastructure)
   - Bug fixes
   - Documentation updates

4. **Sub-issues**
   - Technical subtasks
   - Testing requirements
   - Deployment steps

## Integration Points

### 1. Linear → Repository

- **Webhook Events**: Issue creation, updates, comments
- **Automatic Actions**:
  - Create feature branches from issues
  - Update PR descriptions with issue context
  - Sync issue status with PR state

### 2. BMAD Agents → Linear

- **Context Retrieval**: Agents read project/issue details
- **Status Updates**: Agents update issue progress
- **Documentation**: Generated docs linked to issues

### 3. Git → Linear

- **Branch Naming**: `colin/10n-[issue-number]-[issue-title]`
- **Commit Messages**: Include Linear issue ID
- **PR Integration**: Auto-link PRs to Linear issues

## Workflow Automation

### Issue Lifecycle

```yaml
Backlog:
  trigger: Issue created
  actions:
    - Add to current cycle if priority > P2
    - Notify BMAD Orchestrator

Todo:
  trigger: Issue assigned
  actions:
    - Create feature branch
    - Generate BMAD story template

In Progress:
  trigger: Branch pushed
  actions:
    - Update Linear status
    - Start progress tracking

In Review:
  trigger: PR created
  actions:
    - Link PR to issue
    - Request reviews

Done:
  trigger: PR merged
  actions:
    - Close Linear issue
    - Update project progress
```

### BMAD Integration Triggers

1. **Planning Phase**
   - Linear Project created → Trigger PM Agent for PRD
   - Epic created → Trigger Architect Agent for design

2. **Development Phase**
   - Issue assigned → Trigger Dev Agent for implementation
   - Sub-issue created → Generate technical specs

3. **Review Phase**
   - PR created → Trigger QA Agent for testing
   - Issue completed → Update documentation

## Implementation Scripts

### Linear Webhook Handler

Location: `/scripts/linear-webhook.js`

- Receives Linear webhook events
- Triggers appropriate BMAD agents
- Updates repository state

### Linear Sync Script

Location: `/scripts/sync-linear.js`

- Periodic sync of Linear state
- Ensures consistency between systems
- Handles offline/missed events

### BMAD-Linear Bridge

Location: `/.bmad-core/integrations/linear.md`

- Configuration for BMAD agents to read Linear
- Templates for Linear-aware agents
- Context mapping rules

## Best Practices

### Issue Writing

1. **Title**: Action-oriented, specific (e.g., "Add user authentication to API")
2. **Description**: Context, acceptance criteria, technical notes
3. **Labels**: Component (frontend/backend), type (feature/bug), priority
4. **Project**: Always link to active project
5. **Cycle**: Assign to current or next cycle

### Project Management

1. **Cycles**: 2-week sprints aligned with Linear cycles
2. **Planning**: Review and groom backlog weekly
3. **Stand-ups**: Update Linear issues daily
4. **Retrospectives**: Create improvement issues

### Development Flow

1. Start with Linear issue
2. BMAD agents read context
3. Implement in codebase
4. Update Linear on progress
5. Link PR for review
6. Auto-close on merge

## Monitoring & Metrics

Track these in Linear:

- **Cycle velocity**: Issues completed per cycle
- **Lead time**: Backlog → Done duration
- **Project progress**: Milestone completion
- **Team health**: WIP limits, blockers

## Getting Started

### 1. Initial Setup

Run the setup script to configure your Linear API integration:

```bash
node scripts/setup-linear.js
```

This will:

- Prompt for your Linear API key
- Configure environment variables
- Test the connection
- Verify project access

### 2. Get Your Linear API Key

1. Go to [Linear Settings > API](https://linear.app/settings/api)
2. Click "Create new API key"
3. Name it "BigSirFLRTS Integration"
4. Copy the generated key (starts with `lin_api_`)
5. Run the setup script and paste when prompted

### 3. Test the Integration

After setup, verify everything works:

```bash
# List current issues
node scripts/linear-cli.js list

# Get specific issue details
node scripts/linear-cli.js get 10N-86

# View current cycle
node scripts/linear-cli.js cycle

# Create a test issue
node scripts/linear-cli.js create "Test issue from CLI" -d "Testing Linear integration"
```

### 4. Configure Git Branch Naming

Set up git to use Linear branch naming:

```bash
# Configure git alias for Linear branches
git config --global alias.linear-branch '!f() { git checkout -b colin/10n-$1-$(echo "$2" | tr "[:upper:]" "[:lower:]" | sed "s/[^a-z0-9]/-/g" | cut -c1-50); }; f'

# Usage: git linear-branch 86 "implement auth"
# Creates: colin/10n-86-implement-auth
```

### 5. Enable Webhook Integration (Optional)

For real-time sync between Linear and your repository:

1. Deploy the webhook handler (see Webhook Deployment section)
2. Configure Linear webhook in project settings
3. Add webhook secret to environment variables

## Support & Resources

- [Linear Method](https://linear.app/method)
- [Linear API Docs](https://developers.linear.app)
- [BMAD Integration Guide](/.bmad-core/docs/linear-integration.md)
- Team Channel: #linear-help

---

_This document is the source of truth for Linear integration. All changes should
be reflected in Linear project documentation._
