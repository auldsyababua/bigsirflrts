# Agent Handoff Rules

**Purpose**: Define the file-based handoff architecture for agent-to-agent communication in the BigSirFLRTS multi-agent workflow.

**Related Documents**:
- [agent-addressing-system.md](agent-addressing-system.md) - Standard format for addressing
- [scratch-and-archiving-conventions.md](scratch-and-archiving-conventions.md) - Scratch directory usage

---

## Handoff Workflow Overview

The BigSirFLRTS workflow uses a **file-based handoff system** where:
1. Agents write handoffs to predetermined file locations
2. User triggers the next agent invocation
3. Next agent reads intake from predetermined location
4. Agents ALWAYS return control to Planning Agent (supervisor pattern)

### Complete Handoff Chain

```mermaid
graph TD
    Planning[Planning Agent<br/>Supervisor]
    Action[Action Agent<br/>Implementation]
    QA[QA Agent<br/>Verification]
    Tracking[Tracking Agent<br/>Git/Linear Ops]
    Researcher[Researcher Agent<br/>Evidence Gathering]

    Planning -->|Work Assignment| Action
    Action -->|Review Request| QA
    QA -->|Issues Found| Action
    QA -->|PASS| Planning
    Planning -->|Bookkeeping| Tracking
    Planning -->|Research Question| Researcher
    Researcher -->|Findings| Planning
    Tracking -->|Completion| Planning
    Planning -->|Session End| Planning
```

### Handoff Flow Rules

**CRITICAL RULES**:
1. **Action → QA** (ALWAYS after production code)
2. **QA → Action** (if issues found, retry loop until PASS)
3. **QA → Planning** (if PASS, return control to supervisor)
4. **Planning → Tracking** (large updates only, e.g., git/Linear bookkeeping)
5. **Planning → Researcher** (evidence gathering only, no code)
6. **Researcher → Planning** (ALWAYS return to supervisor)
7. **Tracking → Planning** (ALWAYS return to supervisor)
8. **Planning → Planning** (session handoff, read at start/overwrite at end)

**10N-275 EXCLUSIVE AUTHORITY**: Only the Planning Agent may update Linear issue 10N-275 (Master Dashboard). All other agents update their assigned work-block issues only.

---

## File-Based Handoff Architecture

### Standard Location Pattern
```
docs/.scratch/<issue-id>/handoffs/
```

### Naming Convention
```
{source-agent}-to-{target-agent}-{context}.md
```

**Examples**:
- `action-to-qa-review-request.md`
- `qa-to-action-retry.md`
- `qa-to-planning-pass.md`
- `planning-to-tracking-instructions.md`
- `planning-to-researcher-question.md`
- `researcher-to-planning-findings.md`
- `tracking-to-planning-complete.md`

**Exception**: Planning Agent session handoff uses fixed location:
- `docs/prompts/reference_docs/planning-handoff.md`

### Handoff File Structure

Each handoff file follows this structure:

1. **Header**: Agent addressing (see agent-addressing-system.md)
2. **Metadata**: Issue ID, dates, context
3. **Content**: Structured sections specific to handoff type
4. **Next Steps**: Clear action required from receiving agent

---

## Concurrency Guardrails ("Stay-in-Lane" Policy)

**Purpose**: Prevent conflicts and context pollution when multiple agents are active.

### Rules

1. **Single Work Item Per Agent**
   - Each agent works on ONE work-block issue at a time
   - No parallel work by the same agent type
   - Planning Agent coordinates all work assignments

2. **Strict Scope Boundaries**
   - Action Agent: Implementation ONLY (no QA, no bookkeeping)
   - QA Agent: Verification ONLY (no implementation, no Linear updates)
   - Tracking Agent: Git/Linear operations ONLY (no code, no decisions)
   - Researcher Agent: Evidence gathering ONLY (no code, no implementation decisions)
   - Planning Agent: Coordination ONLY (no code execution)

3. **Handoff Timing**
   - Complete current work item fully before starting next
   - Write handoff IMMEDIATELY when ready to hand off
   - Do NOT continue work after writing handoff

4. **10N-275 Single-Writer Guarantee**
   - ONLY Planning Agent updates 10N-275
   - All other agents update their assigned issues
   - If agent needs 10N-275 updated, hand off to Planning with request

---

## Error Handling

### Missing Handoff File

**When**: Agent expected intake handoff but file doesn't exist

**Action**:
1. Check alternative locations (`docs/.scratch/<issue>/` root, older naming conventions)
2. If not found, report to Planning Agent:
   ```
   BLOCKER: Expected handoff file not found.
   - Expected: docs/.scratch/10n-xxx/handoffs/{source}-to-{target}-{context}.md
   - Issue: 10N-XXX
   - Source agent: {expected source}
   - Request: Planning Agent to provide context or trigger source agent
   ```
3. DO NOT proceed without intake context

### Malformed Handoff Content

**When**: Handoff file exists but content is incomplete/malformed

**Action**:
1. Document specific missing fields or formatting issues
2. Report to Planning Agent with specific gaps:
   ```
   ISSUE: Handoff file malformed.
   - File: docs/.scratch/10n-xxx/handoffs/{file}.md
   - Missing: [list required sections]
   - Readable content: [summarize what IS present]
   - Request: Clarification from {source agent} or Planning Agent
   ```
3. If critical information is present, proceed with caution and note assumptions

### Conflicting Instructions

**When**: Handoff instructions conflict with Linear issue or other documentation

**Action**:
1. Assume **Linear issue description** is source of truth
2. Report discrepancy to Planning Agent:
   ```
   CONFLICT: Handoff differs from Linear.
   - Issue: 10N-XXX
   - Handoff says: [summary]
   - Linear says: [summary]
   - Action taken: Following Linear, flagging discrepancy
   ```

---

## Handoff Templates

### 1. Action→QA Review Request

**File**: `docs/.scratch/<issue>/handoffs/action-to-qa-review-request.md`
**When**: Action Agent completes production code delivery

```markdown
# Action Agent → QA Agent: Review Request

**Issue**: 10N-XXX
**Branch**: `feature/10n-xxx-description`
**Completion Date**: YYYY-MM-DD

## Deliverables
- [ ] List of files changed with key modifications
- [ ] Commit hash(es): `abc123`, `def456`
- [ ] Tests added/updated: list specific test files

## Validation Performed
- [ ] `npm run test:unit` - PASS/FAIL (counts, timing)
- [ ] `tsc --noEmit` - PASS/FAIL
- [ ] Security script - PASS/FAIL (note any warnings)
- [ ] Linter - PASS/FAIL

## External APIs Used
- API/endpoint validated: Yes/No
- Validation method: curl/spec citation
- Auth header format confirmed: Yes/No

## Scratch Artifacts
- Research notes: docs/.scratch/10n-xxx/research.md
- Prototype location: docs/.scratch/10n-xxx/prototype/
- Lessons draft: docs/.scratch/10n-xxx/lessons-draft.md

## Acceptance Criteria Status
- [x] Criterion 1 - met via files X, Y
- [x] Criterion 2 - met via test Z
- [ ] Criterion 3 - deferred to 10N-YYY (if applicable)

## Known Issues / Follow-ups
- None / List any known limitations

## Next Steps
Ready for QA review. Please verify against Linear issue 10N-XXX acceptance criteria.
```

---

### 2. QA→Action Retry

**File**: `docs/.scratch/<issue>/handoffs/qa-to-action-retry.md`
**When**: QA finds issues requiring Action Agent fixes

```markdown
# QA Agent → Action Agent: Issues Found - Retry Required

**Issue**: 10N-XXX
**Branch**: `feature/10n-xxx-description`
**Review Date**: YYYY-MM-DD

## Issues Found

### Critical Issues (Must Fix)
1. [Issue description]
   - Location: file.ts:line
   - Expected: [behavior]
   - Actual: [behavior]
   - Fix required: [specific action]

### Major Issues (Should Fix)
1. [Issue description]
   - Location: file.ts:line
   - Concern: [reason]
   - Suggested fix: [action]

### Minor Issues (Consider Fixing)
1. [Issue description]
   - Location: file.ts:line
   - Note: [observation]

## Test Failures
- Test file: test.spec.ts
- Failure: [description]
- Expected vs Actual: [details]

## Red Flags Observed
- [ ] Tests weakened (fewer assertions, removed edge cases)
- [ ] Disabled tests (skip/only/todo) without documentation
- [ ] Security warnings suppressed without justification
- [ ] Other: [description]

## Missing Requirements
- Acceptance criterion X not met: [details]
- Documentation missing: [what's needed]
- Standards violation: [which standard, how violated]

## Next Steps
Please address critical and major issues, then write new review request handoff when ready.
```

---

### 3. QA→Planning PASS

**File**: `docs/.scratch/<issue>/handoffs/qa-to-planning-pass.md`
**When**: QA validates all requirements met

```markdown
# QA Agent → Planning Agent: PASS - Work Validated

**Issue**: 10N-XXX
**Branch**: `feature/10n-xxx-description`
**Review Date**: YYYY-MM-DD

## Verdict
✅ **READY TO MERGE** - All acceptance criteria met, no blocking issues found.

## Verification Summary
- [x] Branch matches issue scope
- [x] Diff reviewed - no red flags
- [x] Claude MCP review executed - findings: [none/addressed]
- [x] Tests executed - PASS (counts, timing)
- [x] Security script - PASS / warnings justified
- [x] Documentation verified
- [x] Lessons Learned present in Linear

## Test Results
- `npm run test:unit`: PASS (X tests, Y seconds)
- ERPNext path: PASS/SKIPPED (reason)
- Feature flags: PASS (USE_ERPNEXT ON/OFF both green)

## Security Review
- Security script: PASS / X findings (all justified in .security-ignore)

## Standards Compliance
- [x] ERPNext Migration Naming Standards followed
- [x] ADR-006 patterns implemented correctly
- [x] HTTP retry checklist complete
- [x] Secret masking policy enforced
- [x] Logging guards in place

## Deliverables Verified
- Files changed: [list with line refs]
- Commits: [hashes with messages]
- Linear updated: Description checklists + closure comment

## Follow-up Actions (if any)
- None / List any non-blocking follow-ups

## Recommendation
Work validated and ready for merge. Planning Agent to decide: merge directly (if small) or delegate to Tracking Agent for bookkeeping.
```

---

### 4. Planning→Tracking Instructions

**File**: `docs/.scratch/<issue>/handoffs/planning-to-tracking-instructions.md`
**When**: Planning delegates Linear/git bookkeeping to preserve context

```markdown
# Planning Agent → Tracking Agent: Bookkeeping Instructions

**Issue**: 10N-XXX
**Date**: YYYY-MM-DD
**Context**: Brief description of what was completed

## Git Operations (Execute in Order)

### 1. Branch Operations
\`\`\`bash
git checkout -b feat/10n-xxx-description
# OR
git checkout feat/10n-xxx-description
\`\`\`

### 2. Commit Operations
\`\`\`bash
git add [specific files]
git commit -m "feat(scope): description

Detailed commit message body if needed.

Refs: 10N-XXX"
\`\`\`

### 3. Push Operations
\`\`\`bash
git push origin feat/10n-xxx-description
# OR
git push origin feat/10n-xxx-description --force-with-lease  # if rebased
\`\`\`

## Linear Updates (Execute via Linear MCP or Manual)

### Update Issue 10N-XXX
- Status: [new status value]
- Add comment:
\`\`\`markdown
[Comment text to add]
\`\`\`
- Update description checklist:
\`\`\`markdown
- [x] Item completed
- [ ] Item pending
\`\`\`

### Update Issue 10N-YYY (if applicable)
- Status: [new status value]
- Labels: [add/remove labels]

## Timeline Updates

Update `docs/.scratch/10n-xxx/timeline.md`:
\`\`\`markdown
## YYYY-MM-DD HH:MM - [Event Title]
[Description of milestone/checkpoint]
- Key changes: [list]
- Status: Complete/In Progress
\`\`\`

## Archive Operations

### Move to Archive
\`\`\`bash
mv docs/.scratch/10n-xxx/ docs/.scratch/.archive/10n-xxx/
\`\`\`

### Before archiving, verify:
- [ ] "Next Steps" tracker: all items marked ✅ or ❌
- [ ] "FINAL STATE" summary added
- [ ] Deferred work documented with Linear issue references

## Documentation Updates (if applicable)

Update `docs/LINEAR-DOCUMENTATION-MAP.md`:
- Mark doc as complete/superseded
- Update status timestamps

## Verification Commands

After execution, run:
\`\`\`bash
git status
git log -1 --oneline
mcp__linear-server__get_issue({ id: "10N-XXX" })  # verify Linear issue updated
\`\`\`

## Blockers / Questions
None / [List any uncertainties for Planning Agent to clarify]

## Expected Completion Time
Estimated: [X minutes]

## Handoff Back
When complete, write handoff to: `docs/.scratch/<issue>/handoffs/tracking-to-planning-complete.md`
```

---

### 5. Planning→Researcher Question

**File**: `docs/.scratch/<issue>/handoffs/planning-to-researcher-question.md`
**When**: Planning needs evidence gathering, option analysis, API validation

```markdown
# Planning Agent → Researcher Agent: Research Question

**Issue**: 10N-XXX (context issue)
**Research ID**: RES-XXX (for tracking if multiple research efforts)
**Date**: YYYY-MM-DD
**Timebox**: [X hours/days]

## Research Question
[Clear, specific research question or investigation goal]

## Context & Background
- Why this research is needed: [rationale]
- Current understanding: [what we know]
- Gap to fill: [what we don't know]
- Decision depending on this research: [what decision will be made with findings]

## Scope & Constraints
- In scope: [what to research]
- Out of scope: [what NOT to research]
- Constraints: [time, resources, access limitations]

## Sources to Check
- [ ] `docs/erpnext/research/` for existing analysis
- [ ] Official ERPNext/Frappe docs
- [ ] ref.tools / exa search for current best practices
- [ ] ask perplexity for synthesis
- [ ] Specific API: [URL or endpoint to validate]
- [ ] Other: [additional sources]

## Required Outputs
- [ ] Findings summary with citations
- [ ] Options analysis (if applicable): 2-3 alternatives with pros/cons/risks
- [ ] Recommendation with confidence level
- [ ] Any blockers encountered

## Success Criteria
Research is successful if it provides:
- Actionable answer to question
- Supporting evidence (citations, curl outputs, spec links)
- Clear recommendation for next agent/action
- Documented in scratch: `docs/.scratch/10n-xxx/research-findings.md`

## Handoff Back
When complete, write handoff to: `docs/.scratch/<issue>/handoffs/researcher-to-planning-findings.md`
```

---

### 6. Researcher→Planning Findings

**File**: `docs/.scratch/<issue>/handoffs/researcher-to-planning-findings.md`
**When**: Researcher completes evidence gathering

```markdown
# Researcher Agent → Planning Agent: Research Findings

**Issue**: 10N-XXX
**Research ID**: RES-XXX
**Completion Date**: YYYY-MM-DD
**Time Spent**: [actual time]

## Research Question (Restated)
[Original question from Planning]

## Key Findings

### Finding 1: [Title]
**Source**: [URL, doc reference, or API endpoint]
**Summary**: [1-2 sentence finding]
**Evidence**:
- Quote/curl output/spec citation
- Validation performed: [how confirmed]
**Confidence**: High / Medium / Low
**Relevance**: [how this informs the decision]

### Finding 2: [Title]
[Repeat structure]

## Options Analysis (if applicable)

### Option A: [Name]
**Description**: [what this option entails]
**Pros**:
- [benefit 1]
- [benefit 2]

**Cons**:
- [drawback 1]
- [drawback 2]

**Risks**:
- [risk 1 with mitigation]

**Confidence**: High / Medium / Low

### Option B: [Name]
[Repeat structure]

### Option C: [Name]
[Repeat structure]

## Recommendation
**Suggested Next Action**: [specific recommendation]
**Next Agent**: [which agent should handle next, if applicable]
**Rationale**: [why this recommendation]
**Confidence Level**: High / Medium / Low

## Blockers Encountered
None / [List any blockers that prevented complete research]

## Scratch Artifacts
- Full findings: docs/.scratch/10n-xxx/research-findings.md
- Supporting evidence: docs/.scratch/10n-xxx/evidence/
- Draft comparisons: docs/.scratch/10n-xxx/options-comparison.md

## Follow-up Questions (if any)
- [Questions that arose during research]
- [Additional areas to investigate if needed]

## Next Steps for Planning Agent
Based on findings, suggest Planning Agent:
1. [First action]
2. [Second action]
3. [Third action]
```

---

### 7. Tracking→Planning Completion

**File**: `docs/.scratch/<issue>/handoffs/tracking-to-planning-complete.md`
**When**: Tracking completes bookkeeping operations

```markdown
# Tracking Agent → Planning Agent: Operations Complete

**Issue**: 10N-XXX
**Completion Date**: YYYY-MM-DD
**Operations Performed**: [brief summary]

## Status
✅ **COMPLETE** - All requested operations executed successfully.
❌ **BLOCKED** - Encountered issues (see Blockers section).
⚠️ **PARTIAL** - Some operations complete, some blocked (see details).

## Operations Executed

### Git Operations
- [x] Branch created/checked out: `feat/10n-xxx-description`
- [x] Files committed: [list files]
- [x] Commit hash: `abc123`
- [x] Pushed to origin: Success
- Verification: `git log -1 --oneline` output

### Linear Updates
- [x] Issue 10N-XXX status updated: [old] → [new]
- [x] Comment added: [timestamp]
- [x] Description checklist updated: [items marked]
- [x] Issue 10N-YYY updated (if applicable)
- Verification: Linear issue last updated timestamp matches

### Timeline Updates
- [x] `docs/.scratch/10n-xxx/timeline.md` updated
- [x] Milestone recorded: [milestone title]

### Archive Operations
- [x] Pre-archive checklist verified
- [x] Artifacts moved: docs/.scratch/10n-xxx/ → docs/.scratch/.archive/10n-xxx/
- Verification: `ls docs/.scratch/.archive/10n-xxx/` confirms presence

### Documentation Updates
- [x] `docs/LINEAR-DOCUMENTATION-MAP.md` updated (if applicable)
- [x] Status marked as complete

## Verification Results
\`\`\`bash
$ git status
[output]

$ git log -1 --oneline
[output]

$ ls docs/.scratch/.archive/10n-xxx/
[output]
\`\`\`

## Time Taken
Estimated: [X minutes]
Actual: [Y minutes]

## Blockers / Issues Encountered
None / [List any issues]

### Issue 1: [Description]
- What happened: [details]
- Why: [root cause]
- Current state: [where things stand]
- Recommendation: [how Planning should resolve]

## Next Steps for Planning Agent
- None (operations complete, ready for next assignment)
- OR [specific next steps if follow-up needed]

## Notes
[Any observations, warnings, or context Planning Agent should know]
```

---

### 8. Planning→Planning Session Handoff

**File**: `docs/prompts/reference_docs/planning-handoff.md`
**When**: Planning Agent session ends, needs to hand off to next Planning session

```markdown
# Planning Agent Session Handoff

**Last Updated**: YYYY-MM-DD HH:MM
**Session Duration**: [approx time]
**Context Checkpoint**: [brief phase description]

## CRITICAL CONTEXT (Not in Linear)

[ONLY include information that is NOT already captured in Linear issues. Assume next Planning Agent will read relevant Linear issues first.]

### Active Work in Progress
- Issue 10N-XXX: [status if unusual/not reflected in Linear yet]
- Waiting on: [blockers not yet documented in Linear]

### Recent Decisions Made
- [Decision]: [rationale] - [date]
- Context: [why this matters for next session]

### Imminent Next Steps
1. [Next immediate action]
2. [Second action]
3. [Why sequence matters]

## Linear Issues to Review First
Priority order for next Planning Agent:
1. 10N-275: Master Dashboard (current work blocks)
2. 10N-XXX: [active issue with latest context]
3. 10N-YYY: [related/dependent issue]

## Handoff Files to Check
- QA PASS awaiting decision: `docs/.scratch/10n-xxx/handoffs/qa-to-planning-pass.md`
- Tracking completion: `docs/.scratch/10n-yyy/handoffs/tracking-to-planning-complete.md`
- Research findings: `docs/.scratch/10n-zzz/handoffs/researcher-to-planning-findings.md`

## Pending Agent Coordination
- Action Agent: working on 10N-XXX (expected completion: [timeframe])
- QA Agent: reviewing 10N-YYY
- Tracking Agent: N/A / awaiting assignment
- Researcher Agent: N/A / awaiting assignment

## Session Notes
[Minimal notes about session flow, unexpected discoveries, lessons]
```

---

## Handoff Validation & Schema Evolution

### Envelope Types

Handoffs use structured formats for machine-readability and future automation. Three primary envelope types exist:

#### 1. Code Delivery Envelope (Action→QA)

**Purpose**: Package implementation deliverables with validation evidence.

**Required Fields**:
- `deliverables`: Files changed, commits, tests added/updated
- `validation_performed`: Test results, type checks, security scan, linter output
- `external_apis`: Validation method (curl/spec), auth format confirmation
- `scratch_artifacts`: Research notes, prototype location, lessons draft
- `acceptance_criteria_status`: Which criteria met, which deferred
- `known_issues`: Any limitations or related work

**Example YAML Frontmatter**:
```yaml
---
envelope_type: code_delivery
envelope_version: 1.0
source_agent: action
target_agent: qa
issue: 10N-228
branch: feature/10n-228-erpnext-deployment
date: 2025-10-13
---
```

#### 2. Research Findings Envelope (Researcher→Planning)

**Purpose**: Package evidence, analysis, and recommendations with citations.

**Required Fields**:
- `findings`: Key findings with sources and citations
- `options_analysis`: 2-3 alternatives with pros/cons/risks (if applicable)
- `recommendation`: Suggested next action with confidence level
- `blockers`: Any blockers encountered
- `scratch_artifacts`: Research findings, evidence files

**Example YAML Frontmatter**:
```yaml
---
envelope_type: research_findings
envelope_version: 1.0
source_agent: researcher
target_agent: planning
issue: 10N-228
research_id: RES-001
date: 2025-10-13
timebox: 2 hours
---
```

#### 3. Operations Completion Envelope (Tracking→Planning)

**Purpose**: Confirm bookkeeping operations with verification evidence.

**Required Fields**:
- `operations_executed`: Git operations, Linear updates, timeline updates, archive operations
- `verification_results`: Command outputs proving completion
- `time_taken`: Estimated vs actual
- `blockers`: Any issues encountered
- `next_steps`: Follow-up actions for Planning

**Example YAML Frontmatter**:
```yaml
---
envelope_type: operations_completion
envelope_version: 1.0
source_agent: tracking
target_agent: planning
issue: 10N-228
date: 2025-10-13
status: complete
---
```

### Validation Strategy

**Current State**: Manual validation by receiving agent
- Agents check handoff content against expected template
- Missing fields or malformed content triggers error handling (see Error Handling section)
- Receiving agent reports discrepancies to Planning Agent

**Future State**: Automated JSON schema validation
- Handoff files will include JSON or YAML frontmatter with envelope metadata
- Schema version field (`envelope_version`) supports evolution
- Validation tools can verify structure before agent reads content
- Enables CI/CD integration and automated handoff auditing

**Schema Version Evolution**:
- Version 1.0: Current manual validation
- Version 2.0: JSON Schema validation with backward compatibility
- Version 3.0+: Enhanced validation with cross-agent consistency checks

### References

For multi-agent handoff patterns and structured outputs:
- OpenAI Cookbook: "Structured Outputs for Multi-Agent Systems"
- JSON Schema specification: https://json-schema.org/
- YAML frontmatter conventions: https://jekyllrb.com/docs/front-matter/

---

**Last Updated**: 2025-10-13
**Version**: 1.0
**Status**: Active
