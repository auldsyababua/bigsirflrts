# BMAD Orchestrator Agent Prompt: Complete Linear Integration Setup

## Context
You are a BMAD Orchestrator agent tasked with completing the Linear integration setup for the BigSirFLRTS project. The integration code is already in place, but the project structure needs to be created in Linear and GitHub needs to be configured.

## Environment Information
- **Project**: BigSirFLRTS
- **Team**: 10netzero (ID: 2b0b568f-e5a6-40ac-866b-367a2564046a)
- **Project ID**: 9d089be4-a284-4879-9b67-f472abecf998
- **Linear API Key**: Already configured in .env file
- **Repository**: Current working directory

## Your Tasks

### Task 1: Create Epic Issues in Linear

Create the following epic issues to establish the project structure:

```bash
# Epic 1: OpenProject Infrastructure
node scripts/linear-cli.js create "[EPIC] OpenProject Deployment & Configuration" \
  -d "## Overview
This epic covers all infrastructure and deployment tasks for OpenProject on DigitalOcean.

### Scope
- Docker deployment on DigitalOcean droplet
- PostgreSQL migration to Supabase
- Cloudflare R2 storage configuration
- SSL/TLS setup via Cloudflare tunnel
- Monitoring and backup strategies

### Success Criteria
- OpenProject running in production at ops.10nz.tools
- Database hosted on Supabase PostgreSQL
- Files stored in Cloudflare R2
- Automated backups configured
- Monitoring dashboards active" \
  -p 1

# Epic 2: Linear Integration
node scripts/linear-cli.js create "[EPIC] Linear Integration & BMAD Workflow" \
  -d "## Overview
Complete integration between Linear and BMAD-Method development workflow.

### Scope
- Linear as Single Source of Truth
- BMAD agent integration with Linear API
- GitHub Actions automation
- Webhook configuration
- Sprint planning setup

### Success Criteria
- All development work flows through Linear
- Automated sync between Linear and GitHub
- BMAD agents read context from Linear
- PRs automatically linked to Linear issues
- Sprint cycles configured" \
  -p 1

# Epic 3: Infrastructure & DevOps
node scripts/linear-cli.js create "[EPIC] Infrastructure & DevOps" \
  -d "## Overview
Core infrastructure, CI/CD, and DevOps practices.

### Scope
- CI/CD pipelines
- Testing infrastructure
- Deployment automation
- Monitoring and alerting
- Security and compliance

### Success Criteria
- Automated testing on all PRs
- One-click deployments
- Comprehensive monitoring
- Security scanning integrated
- Documentation up to date" \
  -p 2

# Epic 4: Documentation & Knowledge Base
node scripts/linear-cli.js create "[EPIC] Documentation & Knowledge Base" \
  -d "## Overview
Comprehensive documentation and knowledge management.

### Scope
- Technical documentation
- API documentation
- User guides
- BMAD methodology docs
- Runbooks and SOPs

### Success Criteria
- All features documented
- API docs auto-generated
- Onboarding guide complete
- Runbooks tested
- Knowledge base searchable" \
  -p 3
```

After creating each epic, note the returned issue IDs (e.g., 10N-87, 10N-88, etc.) for reference.

### Task 2: Create Sub-Issues Under Epics

For the OpenProject epic, create these specific tasks:

```bash
# Get the epic ID first (replace 10N-XX with actual ID)
node scripts/linear-cli.js get 10N-XX

# Create sub-tasks
node scripts/linear-cli.js create "Migrate OpenProject data to Supabase PostgreSQL" \
  -d "Complete data migration from Docker PostgreSQL to Supabase" \
  -p 1

node scripts/linear-cli.js create "Configure Cloudflare R2 for file storage" \
  -d "Set up R2 bucket and configure OpenProject to use it" \
  -p 1

node scripts/linear-cli.js create "Set up automated backups for OpenProject" \
  -d "Configure daily backups of database and files" \
  -p 2

node scripts/linear-cli.js create "Create monitoring dashboards" \
  -d "Set up Grafana/Prometheus monitoring for OpenProject" \
  -p 2
```

### Task 3: Set Up Sprint Cycles

Create 3 two-week sprint cycles starting from next Monday:

```bash
# This will prompt you to confirm
node scripts/setup-linear-cycles.js create -w 2 -c 3

# When prompted "Create these cycles? (y/N):", type: y
```

Expected output:
- Sprint 1: [dates]
- Sprint 2: [dates]
- Sprint 3: [dates]

### Task 4: Assign Issues to First Sprint

Assign the high-priority items to Sprint 1:

```bash
# List current issues first
node scripts/linear-cli.js list --limit 20

# Assign high-priority issues to current cycle (replace with actual IDs)
node scripts/setup-linear-cycles.js assign 10N-86
node scripts/setup-linear-cycles.js assign 10N-87
node scripts/setup-linear-cycles.js assign 10N-88

# Verify assignments
node scripts/setup-linear-cycles.js current
```

### Task 5: Configure GitHub Secrets

**Note**: This step requires browser access to GitHub. If you cannot access the browser, provide these instructions to the user:

1. Navigate to the repository settings:
   ```
   https://github.com/[username]/bigsirflrts/settings/secrets/actions
   ```

2. Click "New repository secret" and add these three secrets:

   **Secret 1:**
   - Name: `LINEAR_API_KEY`
   - Value: `[YOUR_LINEAR_API_KEY]`

   **Secret 2:**
   - Name: `LINEAR_TEAM_ID`
   - Value: `2b0b568f-e5a6-40ac-866b-367a2564046a`

   **Secret 3:**
   - Name: `LINEAR_PROJECT_ID`
   - Value: `9d089be4-a284-4879-9b67-f472abecf998`

3. After adding all secrets, trigger a test run:
   ```bash
   gh workflow run linear-sync.yml
   ```

### Task 6: Verify Integration

Run these commands to verify everything is working:

```bash
# Check Linear connection
node scripts/linear-cli.js list

# Check current sprint
node scripts/setup-linear-cycles.js current

# Verify GitHub Actions (if secrets are configured)
gh run list --workflow=linear-sync.yml --limit 5

# Create a test issue to verify full workflow
node scripts/linear-cli.js create "Test: Integration verification" \
  -d "Test issue to verify Linear-GitHub integration is working" \
  -p 4

# Check if the test issue appears
node scripts/linear-cli.js list --limit 5
```

## Success Criteria

✅ All 4 epic issues created in Linear
✅ Sub-tasks created and linked to epics
✅ 3 sprint cycles configured
✅ High-priority issues assigned to Sprint 1
✅ GitHub secrets configured (or instructions provided)
✅ Test issue created and visible

## Troubleshooting

If any command fails:

1. **"LINEAR_API_KEY environment variable is required"**
   - Run: `source .env` or `node scripts/setup-linear.js`

2. **"Issue not found"**
   - Check the issue ID with: `node scripts/linear-cli.js list`

3. **"No active cycle"**
   - Create cycles first: `node scripts/setup-linear-cycles.js create -w 2 -c 1`

4. **GitHub Actions not running**
   - Verify secrets are added correctly
   - Check: `gh secret list`

## Report Format

After completing all tasks, report back with:

```markdown
## Linear Setup Complete ✅

### Created Epics:
- 10N-XX: OpenProject Deployment & Configuration
- 10N-XX: Linear Integration & BMAD Workflow
- 10N-XX: Infrastructure & DevOps
- 10N-XX: Documentation & Knowledge Base

### Sprint Cycles:
- Sprint 1: [dates] - X issues assigned
- Sprint 2: [dates] - Ready for planning
- Sprint 3: [dates] - Ready for planning

### GitHub Integration:
- [ ] Secrets configured (provide status)
- [ ] First sync completed
- [ ] Test issue created: 10N-XX

### Next Steps:
1. Team to review and refine epic descriptions
2. Break down epics into more detailed stories
3. Estimate story points in planning session
4. Begin Sprint 1 execution

Linear project URL: https://linear.app/10netzero/project/bigsirflrts
```

---

**Note to Agent**: Execute these tasks in order. Each task builds on the previous one. If you encounter any errors, document them and continue with the next task if possible. The goal is to establish the project structure in Linear so the team can begin using it immediately.