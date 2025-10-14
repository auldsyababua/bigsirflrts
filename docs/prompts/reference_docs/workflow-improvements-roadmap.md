# Workflow System Improvements Roadmap

**Created**: 2025-10-14
**Owner**: Workflow Upgrade Assistant
**Status**: Planning Phase

---

## Executive Summary

This roadmap outlines critical improvements to the agentic workflow system to increase reliability, clarity, and determinism. The improvements address four core problem areas:

1. **Linear Structure Misunderstanding** - Planning agents don't consistently understand parent issue = work block, child issues = jobs
2. **Crash Recovery Gaps** - No formal protocol for recovering from agent crashes or session interruptions
3. **Scratch Folder Chain of Custody** - Unclear responsibilities for who creates, archives, and relies on handoff files
4. **Missing Workflow Features** - Prompt caching, session auditing, project context updates

These improvements will make the workflow system more robust and easier to use across all projects.

---

## Improvement Area 1: Linear Structure & Master Dashboard

**Parent Issue**: WI-001 - Fix Linear Structure Understanding
**Priority**: P0 (Critical - blocks correct agent operation)
**Estimated Total Time**: 4-5 hours

### Problem Statement

Planning agents have been inconsistently implementing the Master Dashboard pattern:
- Creating "phases" instead of child Linear issues for jobs
- Not understanding that parent issue = work block
- Missing the routing benefit: 10N-275 helps agents find their work, child issues contain full context

**Colin's Exact Specification**:
> "parent issue = workblock, jobs = child-issues of that parent issue. For some reason, planning agent has been labeling these as phases, but that is not what I specified. There should be child linear issues for each batch of work an agent can perform. These are listed below the marquee (the current job) with a single line with job #: title hyperlinked to child-linear issue."

### Child Tasks

#### WI-001-1: Add Master Dashboard Frontmatter to Planning Prompt
**Agent**: Action Agent
**Time**: 30 minutes
**Description**:
- Add frontmatter section to `docs/prompts/planning-agent.md`
- Include field: `Master Dashboard Issue: [issue-number]` (e.g., `10N-275`)
- If field is empty/missing, planning agent knows to read setup docs

**Acceptance Criteria**:
- Frontmatter exists at top of planning-agent.md
- Contains clear example of Master Dashboard issue number
- Instructions explain what to do if field is empty

#### WI-001-2: Create First-Time Master Dashboard Setup Documentation
**Agent**: Action Agent
**Time**: 1-2 hours
**Description**:
- Create `docs/prompts/reference_docs/master-dashboard-setup.md`
- Explain the Linear structure: parent issue = work block, child issues = jobs
- Provide step-by-step instructions for creating a Master Dashboard from scratch
- Include example Linear issue structure with proper parent/child relationships
- Explain the routing benefit: Dashboard helps agents find work, child issues contain context

**Acceptance Criteria**:
- Doc clearly explains parent issue = work block concept
- Step-by-step setup guide for first-time projects
- Examples of properly structured work blocks with child issues
- Explains marquee pattern (current job highlighted)
- Documents checklist format: `- [x] 10N-XXX: Completed job` and `- [ ] 10N-YYY: Pending job (CURRENT)`

#### WI-001-3: Update Planning Agent Startup Protocol
**Agent**: Action Agent
**Time**: 30 minutes
**Description**:
- Update planning-agent.md startup protocol
- Add step: Check frontmatter for Master Dashboard issue number
- If no issue number: Read master-dashboard-setup.md and create dashboard
- If issue number exists: Read that issue to get current work blocks

**Acceptance Criteria**:
- Startup protocol includes frontmatter check
- Clear instructions for both scenarios (dashboard exists vs. doesn't exist)
- Planning agent knows to create child Linear issues for each job, not phases

#### WI-001-4: Add Linear Structure Examples to Agent Handoff Rules
**Agent**: Action Agent
**Time**: 45 minutes
**Description**:
- Update `docs/prompts/reference_docs/agent-handoff-rules.md`
- Add examples showing correct vs. incorrect Linear structure
- Include example work block with child issues properly formatted
- Show how marquee pattern works with checkmarks for completed jobs

**Acceptance Criteria**:
- Clear examples of correct Linear structure
- Anti-patterns documented (phases instead of child issues, etc.)
- Templates show child issue links with checkmarks

#### WI-001-5: QA Validation of Linear Structure Changes
**Agent**: QA Agent
**Time**: 1 hour
**Description**:
- Test that planning agent reads frontmatter correctly
- Verify planning agent creates Master Dashboard if missing
- Verify planning agent reads existing Master Dashboard if present
- Confirm planning agent creates child Linear issues for jobs (not phases)
- Test marquee pattern with checkmarks for completed work

**Acceptance Criteria**:
- All five test scenarios pass
- Planning agent consistently implements correct Linear structure
- No regression in existing functionality

### Dependencies
- WI-001-1 must complete before WI-001-3 (frontmatter must exist before startup protocol references it)
- WI-001-2 must complete before WI-001-3 (setup doc must exist before startup protocol references it)
- WI-001-1, WI-001-2, WI-001-3, WI-001-4 must all complete before WI-001-5 (QA tests all changes)

### Success Criteria
- Planning agent consistently understands parent issue = work block, child issues = jobs
- Planning agent creates child Linear issues for jobs, not phases
- Planning agent reads Master Dashboard from frontmatter on every startup
- Planning agent creates Master Dashboard if missing (first-time setup)
- All agents can find their work via Master Dashboard routing

---

## Improvement Area 2: Crash Recovery Protocol

**Parent Issue**: WI-002 - Define Crash Recovery Protocol
**Priority**: P1 (High - prevents context loss during crashes)
**Estimated Total Time**: 2-3 hours

### Problem Statement

When a planning agent spawns a sub-agent and the session crashes, there's no formal recovery protocol. The Master Dashboard may be out of sync, and the sub-agent may be partially complete without proper handoff.

**Colin's Insight**:
> "if the planning agent is very diligent and hooked into making updates to the master project tracking dashboard, then that sort of becomes a reliable SSOT funnel for agents to find the context they need."

### Child Tasks

#### WI-002-1: Research Crash Recovery Best Practices
**Agent**: Researcher Agent
**Time**: 1 hour
**Description**:
- Research crash recovery patterns for agentic systems
- Check Colin's previous agentic system attempts for crash recovery approaches
- Identify common crash scenarios (session timeout, network error, user interruption)
- Document recovery strategies from other workflow systems

**Acceptance Criteria**:
- Research report in `docs/.scratch/workflow-crash-recovery/handoffs/researcher-to-workflow-assistant-findings.md`
- 3-5 crash scenarios documented
- 3-5 recovery strategies documented with pros/cons

#### WI-002-2: Define Pre-Spawn Update Protocol
**Agent**: Action Agent
**Time**: 45 minutes
**Description**:
- Update planning-agent.md with pre-spawn protocol
- Before spawning sub-agent, planning agent MUST update Master Dashboard:
  - Set work block Status to "In Progress"
  - Add comment: "Spawning [agent-type] agent for [job-title] at [timestamp]"
  - Update child issue with pre-spawn status
- This creates a recovery checkpoint

**Acceptance Criteria**:
- Planning agent prompt has clear pre-spawn update protocol
- Protocol includes Master Dashboard status update
- Protocol includes child issue comment
- Timestamp requirement documented

#### WI-002-3: Define Post-Completion Update Protocol
**Agent**: Action Agent
**Time**: 45 minutes
**Description**:
- Update planning-agent.md with post-completion protocol
- After sub-agent completes, planning agent MUST update Master Dashboard:
  - Check off completed child issue (change `- [ ]` to `- [x]`)
  - Update work block Status (if all child issues done: "Complete", else keep "In Progress")
  - Add comment: "Completed [job-title] at [timestamp]"
  - Graduate next job to marquee (CURRENT) if more work remains

**Acceptance Criteria**:
- Planning agent prompt has clear post-completion update protocol
- Protocol includes checkbox updates
- Protocol includes Status field updates
- Protocol includes marquee graduation logic

#### WI-002-4: Define Crash Recovery Checklist
**Agent**: Action Agent
**Time**: 30 minutes
**Description**:
- Create `docs/prompts/reference_docs/crash-recovery-checklist.md`
- Checklist for planning agent to use when recovering from crash:
  1. Read Master Dashboard work block statuses
  2. Check for "In Progress" work blocks
  3. Look for last comment timestamp on child issues
  4. Determine if sub-agent completed before crash (check for handoff file)
  5. If completed: Follow post-completion protocol
  6. If incomplete: Check with Colin before re-spawning (may be stale context)

**Acceptance Criteria**:
- Checklist covers all crash recovery scenarios
- Clear decision tree for completed vs. incomplete work
- Protocol for handling stale context (check with Colin)

#### WI-002-5: QA Validation of Crash Recovery
**Agent**: QA Agent
**Time**: 1 hour
**Description**:
- Simulate crash scenarios:
  1. Planning agent spawns sub-agent, then session ends
  2. Planning agent reads Master Dashboard on new session startup
  3. Verify planning agent follows crash recovery checklist
- Test pre-spawn update protocol creates proper checkpoint
- Test post-completion protocol updates Master Dashboard correctly

**Acceptance Criteria**:
- Crash recovery checklist successfully guides recovery
- Pre-spawn updates create usable checkpoints
- Post-completion updates maintain Master Dashboard integrity
- No data loss or duplicate work in test scenarios

### Dependencies
- WI-002-1 must complete before WI-002-2, WI-002-3, WI-002-4 (research informs protocol design)
- WI-002-2, WI-002-3, WI-002-4 must complete before WI-002-5 (QA tests all protocols)
- WI-001 (Linear Structure) should complete first to ensure Master Dashboard exists and is correct

### Success Criteria
- Planning agent consistently updates Master Dashboard before spawning sub-agents
- Planning agent consistently updates Master Dashboard after sub-agent completion
- Crash recovery checklist enables successful recovery from session interruptions
- No context loss when planning agent session crashes

---

## Improvement Area 3: Scratch Folder Chain of Custody

**Parent Issue**: WI-003 - Define Scratch Folder Chain of Custody
**Priority**: P1 (High - prevents handoff confusion and context loss)
**Estimated Total Time**: 2-3 hours

### Problem Statement

The current scratch folder conventions are "grey" - not black and white. It's unclear:
- Who creates handoff files and when?
- Who archives scratch folders and when?
- Who relies on whom to do each step correctly?
- How can we enforce deterministic behavior?

**Colin's Requirement**:
> "What needs to happen every single job cycle? Who needs to do each and when? who relies on who to do that correctly, and how can we enforce it to make it more deterministic."

### Child Tasks

#### WI-003-1: Audit Current Scratch Folder Documentation
**Agent**: Researcher Agent
**Time**: 45 minutes
**Description**:
- Read `docs/prompts/reference_docs/scratch-and-archiving-conventions.md`
- Identify "grey" areas (ambiguous instructions)
- List all handoff file creation points
- List all archival trigger points
- Document current chain of custody assumptions

**Acceptance Criteria**:
- Report in `docs/.scratch/workflow-scratch-custody/handoffs/researcher-to-workflow-assistant-findings.md`
- List of grey areas with line number references
- Current chain of custody mapped out
- Gaps identified

#### WI-003-2: Define Job Cycle Phases
**Agent**: Action Agent
**Time**: 1 hour
**Description**:
- Create `docs/prompts/reference_docs/job-cycle-phases.md`
- Define phases of every job cycle:
  1. **Job Assignment** (Planning → Sub-agent)
  2. **Job Execution** (Sub-agent works)
  3. **Job Completion** (Sub-agent → Planning)
  4. **Verification** (Planning or QA)
  5. **Archival** (Planning or Tracking)
- For each phase, specify:
  - Who creates what files?
  - Who reads what files?
  - Who updates what files?
  - Who archives what files?
  - What happens if a step is skipped?

**Acceptance Criteria**:
- All 5 phases clearly defined
- Each phase has responsibility matrix (who does what)
- Failure modes documented (what if step skipped?)
- Enforcement mechanisms suggested (checklist, validation, etc.)

#### WI-003-3: Update Agent Prompts with Chain of Custody Rules
**Agent**: Action Agent
**Time**: 1-2 hours
**Description**:
- Update all agent prompts with clear chain of custody instructions:
  - **Planning Agent**: Creates handoff files before spawning, archives after verification
  - **Action Agent**: Reads handoff from planning, writes completion handoff back
  - **QA Agent**: Reads completion handoff, writes pass/fail handoff back
  - **Tracking Agent**: Reads instructions handoff, writes completion handoff back
  - **Researcher Agent**: Reads question handoff, writes findings handoff back
  - **Browser Agent**: Reads instructions handoff, writes results handoff back
- Each agent should have explicit instructions on:
  - What files to create
  - What files to read
  - What files NOT to touch (another agent's responsibility)

**Acceptance Criteria**:
- All 6 agent prompts updated with chain of custody rules
- Each agent knows exactly what files they create/read
- No overlap or ambiguity between agents
- Enforcement checklist added to each prompt

#### WI-003-4: Add Handoff Validation to Startup Protocols
**Agent**: Action Agent
**Time**: 45 minutes
**Description**:
- Update each agent's startup protocol to validate expected handoff files exist
- Planning agent: Check if `*-to-planning-*.md` exists when resuming work
- Sub-agents: Check if `planning-to-[agent]-*.md` exists before starting
- If handoff missing: Agent should alert Colin and refuse to proceed (prevents silent failures)

**Acceptance Criteria**:
- All agent startup protocols validate expected handoffs
- Clear error messages when handoffs missing
- Agents refuse to proceed without required context

#### WI-003-5: QA Validation of Chain of Custody
**Agent**: QA Agent
**Time**: 1 hour
**Description**:
- Test full job cycle with chain of custody rules:
  1. Planning creates handoff → verify file exists
  2. Sub-agent reads handoff → verify correct file read
  3. Sub-agent writes completion handoff → verify file exists
  4. Planning reads completion → verify correct file read
  5. Planning archives scratch folder → verify moved to .archive/
- Test failure modes:
  - Missing handoff file → agent refuses to proceed
  - Incomplete handoff → agent alerts Colin

**Acceptance Criteria**:
- Full job cycle completes with all handoffs created correctly
- No files created by wrong agent
- Failure modes handled gracefully (agent alerts instead of proceeding blindly)

### Dependencies
- WI-003-1 must complete first (audit informs design)
- WI-003-2 must complete before WI-003-3 (phases define chain of custody)
- WI-003-3 must complete before WI-003-4 (can't validate until rules exist)
- WI-003-4 must complete before WI-003-5 (QA tests validation)

### Success Criteria
- Every agent knows exactly what handoff files to create/read
- Job cycle phases clearly defined with responsibility matrix
- Chain of custody is deterministic (no ambiguity)
- Agents validate handoffs on startup and refuse to proceed if missing
- Archival happens consistently after verification

---

## Improvement Area 4: Missing Workflow Features

**Parent Issue**: WI-004 - Implement Missing Workflow Features
**Priority**: P2 (Medium - quality of life improvements)
**Estimated Total Time**: 4-6 hours

### Problem Statement

Several workflow features are missing that would improve reliability and developer experience:
1. **Prompt Caching** - No caching strategy for agent prompts (wastes tokens, slows startup)
2. **Project Context Updates** - Planning agent doesn't routinely update project-context.md
3. **Session Auditing** - No automated review of agent sessions to suggest prompt improvements

### Child Tasks

#### WI-004-1: Research Prompt Caching Strategies
**Agent**: Researcher Agent
**Time**: 1-2 hours
**Description**:
- Research prompt caching strategies for LLM workflows
- Focus on auto-update when prompts change (cache invalidation)
- Investigate:
  - File hash-based caching (MD5/SHA256 of prompt files)
  - Timestamp-based caching (check last modified time)
  - Claude API prompt caching features (if available)
  - Token savings estimates
- Document trade-offs and recommendations

**Acceptance Criteria**:
- Research report in `docs/.scratch/workflow-prompt-caching/handoffs/researcher-to-workflow-assistant-findings.md`
- 3-5 caching strategies documented with pros/cons
- Recommendation for best approach
- Token savings estimates

#### WI-004-2: Implement Simple Prompt Caching (If Feasible)
**Agent**: Action Agent
**Time**: 2-3 hours (depends on complexity)
**Description**:
- Based on research findings, implement simple prompt caching
- Likely approach: File hash-based with auto-invalidation on change
- Update agent instantiation code (if in codebase) or document manual caching strategy
- Test that cache invalidates when prompts change

**Acceptance Criteria**:
- Caching implementation complete (or manual strategy documented)
- Cache automatically invalidates when prompts change
- Token usage reduced for repeated agent spawns
- No stale prompt issues

#### WI-004-3: Add Project Context Update Protocol to Planning Agent
**Agent**: Action Agent
**Time**: 45 minutes
**Description**:
- Update planning-agent.md with project context update protocol
- After each job completes, planning agent should:
  1. Read `project-context.md` (external project directory)
  2. Check if any information is outdated based on completed work
  3. Update project-context.md if needed (usually won't change, but good to check)
  4. Commit changes if updated
- This prevents deprecated info poisoning context

**Acceptance Criteria**:
- Planning agent prompt includes project context update protocol
- Protocol runs after each job completion (part of post-completion checklist)
- Instructions on what to check for (outdated assumptions, deprecated features, etc.)

#### WI-004-4: Create Agent Session Auditor Agent
**Agent**: Action Agent
**Time**: 2-3 hours
**Description**:
- Create `docs/prompts/agent-session-auditor.md`
- This agent reviews completed job sessions and provides recommendations
- Responsibilities:
  1. Read handoff files from completed job
  2. Read agent conversation logs (if available)
  3. Identify patterns: repeated mistakes, unclear instructions, common blockers
  4. Suggest prompt improvements to avoid issues in future
  5. Output recommendations report
- Should be called programmatically at end of each job (by planning agent)

**Acceptance Criteria**:
- Agent prompt created with clear responsibilities
- Agent knows how to analyze session artifacts
- Agent provides actionable prompt improvement recommendations
- Planning agent updated to call session auditor after job completion

#### WI-004-5: QA Validation of New Features
**Agent**: QA Agent
**Time**: 1 hour
**Description**:
- Test prompt caching (if implemented) - verify cache invalidates on change
- Test project context update protocol - verify planning agent checks after jobs
- Test session auditor agent - run on sample completed job, verify recommendations useful

**Acceptance Criteria**:
- Prompt caching works correctly (or manual strategy documented)
- Project context update protocol runs consistently
- Session auditor provides useful recommendations

### Dependencies
- WI-004-1 must complete before WI-004-2 (research informs implementation)
- WI-004-2, WI-004-3, WI-004-4 can run in parallel (independent features)
- WI-004-5 waits for all previous tasks to complete (QA tests everything)

### Success Criteria
- Prompt caching reduces token usage for repeated agent spawns (or manual strategy documented)
- Planning agent routinely updates project-context.md to prevent stale info
- Session auditor agent helps improve prompts based on real usage patterns
- Overall workflow reliability and developer experience improved

---

## Improvement Area 5: Historical Analysis & Knowledge Transfer

**Parent Issue**: WI-005 - Audit Previous Agentic Systems for Best Practices
**Priority**: P2 (Medium - captures institutional knowledge)
**Estimated Total Time**: 3-4 hours

### Problem Statement

Colin has attempted multiple agentic systems before this one. Those attempts likely contain good ideas and lessons that should be incorporated into the current system.

**Colin's Request**:
> "we should also add to it a task to have the assistant agent audit my previous attempts at agentic systems to get some good ideas in the documentation in them."

### Child Tasks

#### WI-005-1: Locate Previous Agentic System Attempts
**Agent**: Researcher Agent
**Time**: 30 minutes
**Description**:
- Search Colin's directories for previous agentic system documentation
- Look for:
  - Agent prompt files
  - Workflow documentation
  - README files describing agentic systems
  - Handoff protocols
  - Linear issues or project tracking docs
- Create inventory of found systems

**Acceptance Criteria**:
- Inventory report in `docs/.scratch/workflow-historical-audit/handoffs/researcher-to-workflow-assistant-findings.md`
- List of directories/repos with agentic system artifacts
- Brief description of each system found

#### WI-005-2: Audit Each Previous System for Good Ideas
**Agent**: Researcher Agent
**Time**: 2-3 hours
**Description**:
- For each previous system found:
  1. Read agent prompts and documentation
  2. Identify successful patterns (what worked well)
  3. Identify failure patterns (what didn't work, why)
  4. Extract good ideas worth incorporating into current system
- Document findings with:
  - Pattern name
  - Context (which system, when used)
  - Why it worked (or didn't)
  - Recommendation for current system

**Acceptance Criteria**:
- Comprehensive audit report with 10-20 patterns documented
- Clear recommendations for each pattern (adopt, adapt, or reject)
- Rationale for each recommendation
- References to source files

#### WI-005-3: Prioritize Ideas for Current System
**Agent**: Workflow Upgrade Assistant (you!)
**Time**: 30 minutes
**Description**:
- Review researcher's findings
- Prioritize ideas into:
  - **P0**: Critical patterns we should adopt immediately
  - **P1**: Valuable patterns to adopt soon
  - **P2**: Nice-to-have patterns for future consideration
  - **Rejected**: Patterns that don't fit current system
- Create implementation roadmap for P0 and P1 patterns

**Acceptance Criteria**:
- Prioritized list of patterns
- Implementation roadmap for high-priority patterns
- Clear rationale for rejected patterns

#### WI-005-4: Implement High-Priority Patterns
**Agent**: Action Agent
**Time**: Varies by pattern (track separately)
**Description**:
- Implement P0 patterns immediately
- Create work blocks for P1 patterns
- Update agent prompts, reference docs, or create new docs as needed
- Document each pattern integration

**Acceptance Criteria**:
- All P0 patterns implemented
- P1 patterns have work blocks created
- Documentation updated to reflect new patterns

#### WI-005-5: Document Institutional Knowledge
**Agent**: Action Agent
**Time**: 1 hour
**Description**:
- Create `docs/prompts/reference_docs/institutional-knowledge.md`
- Document lessons learned from previous agentic systems
- Include:
  - What worked well (patterns to keep)
  - What didn't work (anti-patterns to avoid)
  - Key insights about agentic workflow design
  - References to source systems
- This serves as a knowledge base for future workflow improvements

**Acceptance Criteria**:
- Institutional knowledge doc created
- 10-20 lessons documented with examples
- Clear guidance on what to do and what to avoid
- References to original sources

### Dependencies
- WI-005-1 must complete first (need to find systems before auditing)
- WI-005-2 depends on WI-005-1 (can't audit until systems located)
- WI-005-3 depends on WI-005-2 (can't prioritize until audit complete)
- WI-005-4 depends on WI-005-3 (can't implement until prioritized)
- WI-005-5 can start after WI-005-2 completes (doesn't need prioritization)

### Success Criteria
- All previous agentic systems audited
- Good ideas extracted and incorporated into current system
- Failure patterns documented to avoid repeating mistakes
- Institutional knowledge preserved in documentation

---

## Implementation Priority Order

Recommended order for implementing improvement areas:

1. **WI-001 (Linear Structure)** - P0, blocks correct agent operation
2. **WI-002 (Crash Recovery)** - P1, depends on WI-001 for Master Dashboard
3. **WI-003 (Scratch Folder)** - P1, can run parallel with WI-002
4. **WI-005 (Historical Audit)** - P2, can run parallel with WI-002/WI-003
5. **WI-004 (Missing Features)** - P2, run after WI-001/WI-002/WI-003 complete

## Overall Success Criteria

This roadmap is successful when:
- Planning agents consistently implement Linear structure correctly (parent = work block, child = jobs)
- Master Dashboard setup is automatic (frontmatter guides agents)
- Crash recovery protocol prevents context loss during session interruptions
- Scratch folder chain of custody is deterministic (no ambiguity)
- Prompt caching reduces token usage (or manual strategy documented)
- Project context stays fresh (planning agent updates after each job)
- Session auditor helps improve prompts based on usage patterns
- Historical knowledge preserved and incorporated into current system

## Next Steps

1. **Workflow Upgrade Assistant**: Review this roadmap with Colin, get approval
2. **Create Linear Issues**: Convert each improvement area to parent issue, each child task to child issue
3. **Start with WI-001**: Begin with Linear Structure fix (highest priority)
4. **Delegate to Sub-Agents**: Use action, researcher, QA, tracking agents to implement tasks
5. **Track Progress**: Update this roadmap as tasks complete

---

**Note**: This roadmap follows the same Master Dashboard pattern it's trying to improve. Each improvement area (WI-001 through WI-005) is a parent issue, and each child task is a separate child issue. This dogfooding approach helps validate the workflow improvements as we implement them.
