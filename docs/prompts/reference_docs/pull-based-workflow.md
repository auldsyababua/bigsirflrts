# Pull-Based Autonomous Workflow

**Purpose**: Define the pull-based autonomous workflow model where agents self-assign work from Linear issue 10N-275 (Master Dashboard) without requiring explicit handoff files or Colin's coordination for routine tasks.

**Related Documents**:
- [marquee-prompt-format.md](marquee-prompt-format.md) - Work block format specification
- [agent-addressing-system.md](agent-addressing-system.md) - Agent addressing conventions
- [agent-handoff-rules.md](agent-handoff-rules.md) - File-based handoff templates (optional in pull-based model)

---

## Vision: Minimal-Coordination Workflow

**Target State**:
```
Colin: `action` (starts Action Agent)
Agent → reads 10N-275 → finds assigned work → reads parent Linear issue → does work → reports completion

Colin: `planning` (starts Planning Agent)
Agent → updates 10N-275 status → checks off completed child issues → assigns next work → reports completion

Repeat with minimal Colin intervention
```

**Key Principle**: 10N-275 is the **single source of truth** for work assignment. Keep it fresh, and agents can operate autonomously.

---

## Pull-Based Model vs. Handoff Model

### Traditional Handoff Model (Still Supported)
```
Colin → tells agent "do X" → agent does X → writes handoff file →
Colin triggers next agent → reads handoff → does work → writes handoff → repeat
```

**Pros**: Explicit context transfer, good for complex multi-agent coordination
**Cons**: Requires Colin to trigger each agent, more manual coordination

### Pull-Based Model (Primary)
```
Agent startup → reads 10N-275 → finds next work block assigned to them →
reads parent Linear issue for full context → does work → reports completion →
Planning Agent updates 10N-275 + child issue → cycle repeats
```

**Pros**: Agents self-assign, minimal Colin involvement, faster iteration
**Cons**: Requires Planning Agent to keep 10N-275 fresh, less explicit context hand-offs

**When to Use Handoffs**: Complex multi-agent coordination with dependencies, research findings needing detailed writeup, error reports requiring structured diagnosis. For most work, the parent Linear issue has full context.

---

## Core Components

### 1. Master Dashboard (10N-275)

**Purpose**: Central coordination hub. All agents read this on startup to find their next work.

**Structure**:
```markdown
## Work Block 1: [Parent Issue Title] ([10N-XXX](link))

**Agent**: action-agent
**Status**: Not Started | In Progress | Blocked | Complete
**Parent Issue**: [10N-XXX](link)
**Estimated Time**: X hours

**Child Issues**:
- [ ] 10N-YYY: [child task description]
- [ ] 10N-ZZZ: [child task description]

### Preconditions
[What must be true before starting]

### Goal
[What we're achieving]

### Do
[Numbered action steps]

### Acceptance
[Testable completion criteria]

### References
[Links to docs, ADRs, specs]
```

**Rules**:
- Maximum 4 active work blocks at any time
- ONE work block = ONE parent Linear issue (epic)
- Child issues are checkboxes within parent's work block
- Status field drives agent priority (Not Started > In Progress > Blocked)
- Only Planning Agent updates 10N-275

### 2. Agent Startup Protocol

**All agents (Action, QA, Tracking, Researcher, Browser) follow this on session start**:

1. **Read Master Dashboard**: `mcp__linear-server__get_issue({ id: "10N-275" })`
2. **Find Your Work**: Scan for work blocks with:
   - `**Agent**: [your-agent-name]`
   - `**Status**: Not Started` (highest priority) or `In Progress` (resume)
3. **If work found**:
   - Read the **Parent Issue** linked in the work block for full context
   - Confirm preconditions are met
   - Begin work immediately on the Do section
   - Report blockers if prerequisites missing
4. **If no work found**:
   - Report: "No work assigned to [agent-name] in 10N-275 (checked: [timestamp])"
   - Wait for Planning Agent to assign work or Colin to provide instructions

**Priority order**: Not Started > In Progress > Blocked (requires Planning Agent intervention)

### 3. Planning Agent Responsibility: Keep 10N-275 Fresh

**CRITICAL**: Planning Agent must update 10N-275 IMMEDIATELY after agents complete work.

**After Agent Completion Report**:
1. Update Status field in relevant work block (In Progress → Complete)
2. Check off completed child issues in work block checklist
3. Move completed work blocks to "Completed Work Blocks" section at bottom
4. Assign next work by creating/updating work blocks for next agent

**Timing**: IMMEDIATE. Don't batch these updates. Agents depend on fresh status.

**Work Block Lifecycle**:
- **Create**: When starting a new parent epic
- **Update**: As child tasks progress (check off completed child issues)
- **Complete**: When ALL child issues in the parent are done
- **Archive**: Move completed work blocks to "Completed Work Blocks" section at bottom (don't delete)

---

## Work Block Hierarchy Rules

### Rule 1: One Work Block Per Parent Issue (Epic)

**Correct**:
```markdown
## Work Block 1: Provision ERPNext Dev ([10N-228](link))
**Parent Issue**: [10N-228](link)
**Child Issues**:
- [ ] 10N-229: Install flrts_extensions
- [ ] 10N-230: Configure secrets
- [ ] 10N-231: Setup domain
```

**Incorrect** (separate work blocks for children of same parent):
```markdown
## Work Block 1: Install flrts_extensions ([10N-229](link))
## Work Block 2: Configure secrets ([10N-230](link))
## Work Block 3: Setup domain ([10N-231](link))
```

### Rule 2: Maximum 4 Active Work Blocks

**Rationale**: Prevents agent conflicts, limits work-in-progress, maintains focus.

**Before adding work block 5**: Complete one of work blocks 1-4, move it to "Completed" section, then reuse the number.

**Example**:
- WB1 completes → moved to "Completed Work Blocks"
- New epic added as WB1 (number reused)

### Rule 3: Non-Overlapping Work Blocks

**Each work block must work on SEPARATE areas to prevent agent conflicts.**

**Good** (non-overlapping):
- WB1: ERPNext deployment (action-agent)
- WB2: Documentation updates (action-agent) - different files
- WB3: Security audit (qa-agent)
- WB4: Research API options (researcher-agent)

**Bad** (overlapping):
- WB1: Update auth module (action-agent)
- WB2: Test auth module (qa-agent) - conflicts with WB1
- Fix: Make WB2 dependent on WB1 completion, or combine into one work block

---

## Agent-Specific Startup Behaviors

### Action Agent

**On startup**:
- Read 10N-275
- Find work blocks with `Agent: action-agent` and `Status: Not Started`
- If found: Read parent Linear issue, confirm prerequisites, begin implementation
- If none: Report no work assigned, wait for Planning Agent

**Completion report**:
- Report to Planning Agent: "Completed 10N-XXX: [brief summary]. Ready for QA."
- Planning Agent updates 10N-275 + creates QA work block

### QA Agent

**On startup**:
- Read 10N-275
- Find work blocks with `Agent: qa-agent` and `Status: Not Started`
- If found: Read parent Linear issue, run QA workflow, report findings
- If none: Report no work assigned

**Completion report (PASS)**:
- Report to Planning Agent: "QA PASS for 10N-XXX. Ready to merge."
- Planning Agent updates 10N-275, marks work block complete

**Completion report (FAIL)**:
- Report to Planning Agent: "QA FAIL for 10N-XXX. Issues found: [summary]"
- Planning Agent updates 10N-275, changes work block back to action-agent with Status: Not Started

### Planning Agent

**On startup**:
- Read `docs/prompts/reference_docs/planning-handoff.md` for session context
- Check for incoming handoffs from other agents
- Read 10N-275 to understand current work state

**After agent completion**:
- Update 10N-275 immediately (Status, checkboxes, work block assignments)
- Update child Linear issues with completion status
- Assign next work block to appropriate agent

**Session end**:
- Update `docs/prompts/reference_docs/planning-handoff.md` with minimal session notes

---

## Status Field State Machine

```
Not Started → In Progress (agent starts work)
In Progress → Complete (all child issues done)
In Progress → Blocked (blocker encountered)
Blocked → Not Started (blocker resolved, reassigned)
Complete → [moved to "Completed Work Blocks" section]
```

**Planning Agent Triggers**:
- Agent reports "starting work" → update Status to In Progress
- Agent reports "completed" → update Status to Complete
- Agent reports "blocked" → update Status to Blocked, add blocker description

---

## Example Flow: Full Cycle

### Step 1: Colin Starts Action Agent

```
Colin: `action`

Action Agent startup:
1. Reads 10N-275
2. Finds: WB1 (Agent: action-agent, Status: Not Started, Parent: 10N-228)
3. Reads 10N-228 for full context
4. Confirms preconditions met
5. Begins implementation work on Do section
```

### Step 2: Action Agent Completes Work

```
Action Agent: "Completed 10N-228: Provisioned ERPNext dev site at ops.10nz.tools.
All acceptance criteria met. Ready for QA.
Branch: feat/10n-228-provision-erpnext
Commits: abc123, def456"

Colin: `planning`
```

### Step 3: Planning Agent Updates Dashboard

```
Planning Agent startup:
1. Reads completion report from Action Agent
2. Updates 10N-275:
   - WB1 Status: In Progress → Complete
   - Checks off child issues: [x] 10N-229, [x] 10N-230, [x] 10N-231
3. Creates WB2 for QA:
   Agent: qa-agent
   Status: Not Started
   Parent Issue: 10N-228
   Branch: feat/10n-228-provision-erpnext
4. Updates child issue 10N-228: Status → In Review
5. Reports: "Updated 10N-275: WB1 complete, WB2 assigned to qa-agent"
```

### Step 4: Colin Starts QA Agent

```
Colin: `qa`

QA Agent startup:
1. Reads 10N-275
2. Finds: WB2 (Agent: qa-agent, Status: Not Started, Parent: 10N-228)
3. Reads 10N-228 for acceptance criteria
4. Checks out branch feat/10n-228-provision-erpnext
5. Runs QA workflow (tests, security, standards compliance)
```

### Step 5: QA Agent Reports PASS

```
QA Agent: "QA PASS for 10N-228. All acceptance criteria met.
Tests: 45 passed
Security: PASS (0 findings)
Standards: PASS
Ready to merge."

Colin: `planning`
```

### Step 6: Planning Agent Finalizes

```
Planning Agent:
1. Updates 10N-275:
   - WB2 Status: Complete
   - Moves WB1 and WB2 to "Completed Work Blocks" section
2. Updates 10N-228: Status → Done
3. Reports: "Work complete on 10N-228. Ready for merge."
```

---

## Handoff Files: When to Use

**Pull-based model makes handoff files optional for most work.** The parent Linear issue contains full context.

**Still use handoff files for**:
1. **Complex multi-agent coordination** with dependencies (e.g., Action → Researcher → Action)
2. **Research findings** requiring detailed writeup with citations
3. **Error reports** needing structured diagnosis (e.g., QA → Action retry)
4. **Browser operations** with screenshots and step-by-step results

**Don't use handoff files for**:
- Simple Action → QA → Planning flows (10N-275 + parent issue has full context)
- Status updates (use 10N-275 Status field)
- Completion reports (verbal report to Planning Agent sufficient)

See [agent-handoff-rules.md](agent-handoff-rules.md) for handoff templates when needed.

---

## Benefits of Pull-Based Model

1. **Reduced Colin involvement**: Agents self-assign from 10N-275
2. **Faster iteration**: No waiting for Colin to trigger next agent
3. **Single source of truth**: 10N-275 Status field always current
4. **Clear priorities**: Not Started > In Progress > Blocked
5. **Scalable**: Can add more agents without changing workflow

---

## Troubleshooting

### Agent reports "No work assigned"

**Cause**: No work blocks with matching Agent and Status: Not Started/In Progress

**Solution**: Planning Agent needs to create/update work blocks in 10N-275

### Agent starts wrong work

**Cause**: 10N-275 Status field stale (not updated after previous agent completed)

**Solution**: Planning Agent must update 10N-275 IMMEDIATELY after agent completion reports

### Multiple work blocks for same parent issue

**Cause**: Planning Agent created separate work blocks for child issues of same parent

**Solution**: Consolidate into ONE work block per parent issue with child issues as checkboxes

### More than 4 active work blocks

**Cause**: Planning Agent didn't move completed work blocks to "Completed" section

**Solution**: Move completed work blocks to bottom, reuse work block numbers

---

## Migration from Handoff Model

**Existing handoff-based workflows continue to work.** This pull-based model is additive.

**For new work**: Use pull-based model as primary, handoff files as exception (see "Handoff Files: When to Use")

**For in-progress work**: Continue with handoff model, migrate to pull-based at natural boundaries (e.g., after current epic completes)

---

**Last Updated**: 2025-10-14
**Version**: 1.0
**Status**: Active
