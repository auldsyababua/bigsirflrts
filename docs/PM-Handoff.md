# PM Handoff: NLP Task Management Service PRD Creation

## To: Product Manager
## From: Business Analyst Team
## Date: September 5, 2025
## Subject: Ready for PRD Creation - Ultra-Simplified MVP Approach

---

## Executive Brief

We've completed the research and planning phase for the NLP Task Management Service. The approach has been dramatically simplified based on stakeholder feedback:

**Key Decision**: Use a single OpenAI GPT-4o prompt for EVERYTHING - no preprocessing, no separate intent detection, no complex routing. All logic lives in the prompt.

**Timeline**: 1-2 days to production-ready MVP

**Cost**: ~$5/month in API costs (negligible for internal tool)

---

## Your Action Items

### 1. Review Core Documents

Please review these documents in order:
1. **Project Brief** (`/docs/brief.md`) - Updated with single-prompt approach
2. **Research Paper** (`/docs/NLP Library and Integration Plan.md`) - Shows why we chose this approach
3. **Integration Points** (`/docs/integration-points.md`) - Technical connection details

### 2. Critical Schema Update Needed

**IMPORTANT**: The synthetic test data at `/docs/examples.md` needs updating to reflect the new schema:

**Old Schema** (just task creation):
```json
{
  "assigner": "string",
  "assignee": "string",
  "task_description": "string",
  "due_at": "datetime",
  "reminder_at": "datetime"
}
```

**New MVP Schema** (full CRUD operations):
```json
{
  "operation": "CREATE | READ | UPDATE | DELETE",
  "type": "task | list | project",
  "assignee": "string (for CREATE/UPDATE)",
  "description": "string (for CREATE/UPDATE)",
  "due_at": "datetime ISO 8601 (for CREATE/UPDATE)",
  "assignee_timezone": "string (e.g., 'America/Chicago')",
  "task_id": "string (for UPDATE/DELETE)",
  "filters": "object (for READ operations)"
}
```

### 3. Key Changes from Original Plan

1. **No ui2 SDK needed** - Just a basic textarea (can add ui2 in V2 for better UX)
2. **No preprocessing** - Everything goes straight to OpenAI
3. **Single endpoint** - `/api/parse` that routes based on operation
4. **Syntax rules in prompt** - @mentions, /commands taught via examples

### 4. The Magic Prompt Structure

The entire system relies on ONE prompt that includes:
- Operation detection (CRUD)
- Syntax rules (@bryan = assignee, /newtask = CREATE)
- Timezone mappings (all 6 team members)
- 15-20 few-shot examples
- JSON schema enforcement

Example prompt snippet:
```
Syntax Rules (ALWAYS follow):
- @name = assignee (e.g., @taylor)
- /newtask = CREATE task
- /update = UPDATE operation
- /delete = DELETE operation
- "show me" = READ operation

Example:
Input: "/newtask @taylor Fix server by 3pm tomorrow"
Output: {
  "operation": "CREATE",
  "type": "task",
  "assignee": "taylor",
  "description": "Fix server",
  "due_at": "2025-09-06T15:00:00-05:00",
  "assignee_timezone": "America/Chicago"
}
```

### 5. Test Data Requirements

When updating `/docs/examples.md`, ensure coverage of:
- All 4 operations (CREATE, READ, UPDATE, DELETE)
- All 3 types (task, list, project)
- All 6 team members
- Timezone conversion edge cases
- Syntax patterns (@mentions, /commands)
- Natural language variations

### 6. PRD Focus Areas

When creating the PRD, emphasize:

1. **Speed to Market** - 1-2 day MVP, ship fast, iterate later
2. **Simplicity** - One API call handles everything
3. **Flexibility** - Changing behavior = updating the prompt
4. **Cost Efficiency** - $5/month is nothing compared to dev time
5. **Full CRUD** - Not just task creation, but complete management

### 7. Success Metrics

The MVP succeeds when:
- All 100 test examples parse correctly
- Response time <3 seconds (acceptable for internal tool)
- All CRUD operations work for tasks/lists/projects
- Timezone conversion is 100% accurate
- Team adopts within first week

---

## Ready for PRD

All research is complete, technical approach is validated, and the path to MVP is clear. The simplified approach means we can have a working system in production within 48 hours of starting development.

**Next Step**: Create the PRD with focus on the single-prompt architecture and immediate shipping.

**Critical Note**: Remember to update the test examples in `/docs/examples.md` to include all CRUD operations, not just CREATE. The current examples only show task creation, but the MVP handles much more.

---

*This handoff represents a pivot to maximum simplicity - let OpenAI do all the work, ship immediately, optimize later.*