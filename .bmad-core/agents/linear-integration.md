# Linear Integration for BMAD Agents

## CRITICAL: Linear-First Development

ALL BMAD agents MUST follow these Linear integration rules:

### Primary Rule
**NEVER create documentation files in `/docs` directories**. Use Linear instead.

### Linear MCP Tools Available

```yaml
linear_tools:
  - mcp__linear-server__create_issue: Create tasks/stories/bugs
  - mcp__linear-server__list_issues: Find existing work
  - mcp__linear-server__update_issue: Update status/details
  - mcp__linear-server__create_comment: Add updates to issues
  - mcp__linear-server__list_documents: Search documentation
  - mcp__linear-server__get_document: Retrieve specific docs
```

### Workflow Commands

Replace traditional BMAD commands with Linear equivalents:

```yaml
command_mapping:
  # OLD: *create-doc story-tmpl.yaml
  # NEW:
  - linear-story: |
      mcp__linear-server__create_issue with story template
      Set appropriate epic, labels, and sprint

  # OLD: *document-project
  # NEW:
  - linear-doc: |
      mcp__linear-server__create_document for project documentation
      Link to project and appropriate team

  # OLD: Write to docs/qa/gates/
  # NEW:
  - linear-qa: |
      mcp__linear-server__create_issue with qa-gate label
      Add test results as comments
      Link to story issue
```

### Task Execution Flow

1. **Before Starting Work**
   ```javascript
   // Check for existing issues
   await linearClient.list_issues({
     assignee: "me",
     state: "In Progress"
   });
   ```

2. **Create New Work**
   ```javascript
   // Create issue FIRST
   const issue = await linearClient.create_issue({
     title: "Task description",
     team: "10netzero",
     labels: ["bmad-generated"]
   });

   // Use Linear's branch name
   git checkout -b ${issue.gitBranchName}
   ```

3. **Document in Linear, Not Files**
   ```javascript
   // Instead of creating .md files
   await linearClient.create_document({
     title: "Architecture Decision",
     content: markdownContent,
     projectId: PROJECT_ID
   });
   ```

### Finding Information

```yaml
search_hierarchy:
  1_current_work:
    - Check Linear issues in current sprint
    - Review "In Progress" status items

  2_documentation:
    - Search Linear documents first
    - Check .archive/ only if needed
    - Never search archived directories directly

  3_historical:
    - Use Linear search for past issues
    - Reference completed sprints
```

### Enforcement Rules

1. **Pre-execution Check**
   - If task would create `/docs/*.md`, redirect to Linear
   - If task references old docs, check `.archive/` first

2. **Git Commit Format**
   ```bash
   # ALWAYS include Linear ID
   git commit -m "10N-XXX: Description of change"
   ```

3. **PR Description**
   - Auto-populated from Linear issue
   - Include Linear URL in PR body

### Quick Reference

| Old BMAD Action | New Linear Action |
|-----------------|-------------------|
| Create story doc | `linear-cli create --type story` |
| Update QA gate | `linear-cli update [ID] --label qa-gate` |
| Find templates | `linear-cli list --type documents --label template` |
| Track progress | `linear-cli list --assignee me --status in-progress` |

### Error Prevention

```yaml
forbidden_actions:
  - Creating files in: /docs/stories/*, /docs/qa/*, /docs/processes/*
  - Writing PRDs to filesystem (use Linear documents)
  - Creating handoff documents (use Linear comments)

required_actions:
  - Check Linear before creating any documentation
  - Reference Linear IDs in all commits
  - Update Linear status when changing work state
```

### Integration Points

1. **BMAD Master Agent**
   - Add `linear-status` command to show current work
   - Redirect `create-doc` to Linear document creation
   - Update `task` command to check Linear first

2. **QA Agent (Quinn)**
   - QA gates become Linear issues with `qa-gate` label
   - Test results as issue comments
   - Link to parent story

3. **PM Agent**
   - All stories created in Linear
   - Sprint planning via Linear cycles
   - Roadmap in Linear project view

### Environment Setup

```bash
# Required environment variables
export LINEAR_API_KEY="your-key"
export LINEAR_TEAM_ID="YOUR_LINEAR_PROJECT_ID"
export LINEAR_PROJECT_ID="9d089be4-a284-4879-9b67-f472abecf998"

# CLI availability
node scripts/linear-cli.js --help
```

## Summary

The repository is now optimized for Linear integration:
- 54 documents archived to `.archive/`
- `.rgignore` excludes archived content
- Linear MCP tools available for all operations
- Documentation lives in Linear, not filesystem

This reduces context window by ~90% while maintaining full access to historical information through Linear's search capabilities.