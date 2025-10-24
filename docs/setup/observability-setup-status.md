# Observability Layer Setup Status

**Issue**:
[10N-293](https://linear.app/10netzero/issue/10N-293/add-multi-agent-observability-layer-to-workflow-system)
**Date**: 2025-10-14 **Status**: Phases 1-2 Complete, Phases 3-6 Pending

---

## Completed

### ✅ Phase 1: Setup Observability Server (30 min)

- [x] Cloned observability repo to
      `~/Desktop/claude-code-hooks-multi-agent-observability`
- [x] Verified dependencies installed (bun, uv)
- [x] Created .env file from .env.sample
- [ ] **PENDING**: Add ANTHROPIC_API_KEY to .env
- [ ] **PENDING**: Start server with `./scripts/start-system.sh`
- [ ] **PENDING**: Verify dashboard at <http://localhost:5173>

### ✅ Phase 2: Integrate into BigSirFLRTS (45 min)

- [x] Copied `send_event.py` to `.claude/hooks/`
- [x] Created `.claude/settings.json` with all hook configurations
  - PreToolUse
  - PostToolUse
  - UserPromptSubmit
  - Notification
  - Stop (with chat transcript)
  - SubagentStop
  - SessionStart
  - SessionEnd

---

## Pending

### ⏳ Phase 3: Agent Identification (30 min)

**Tasks**:

- [ ] Update shell aliases to set `AGENT_NAME` env var:
  - `planningagent` → `AGENT_NAME="planning-agent"`
  - `actionagent` → `AGENT_NAME="action-agent"`
  - `qaagent` → `AGENT_NAME="qa-agent"`
  - `browseragent` → `AGENT_NAME="browser-agent"`
- [ ] Modify `send_event.py` to use `AGENT_NAME` for `source_app` field
- [ ] Test: Run each agent and verify unique identification in dashboard

**Location**: User's shell rc file (`.zshrc`, `.bashrc`, etc.)

### ⏳ Phase 4: Custom Gate Events (1 hour)

**Tasks**:

- [ ] Enhance `~/.claude/hooks/check-research-phase.sh` to log gate pass/fail
      events
- [ ] Enhance `~/.claude/hooks/check-scratch-phase.sh` to log gate events
- [ ] Enhance `~/.claude/hooks/check-handoff-validation.sh` to log validation
      events
- [ ] Add payload to events:
      `{"gate": "research-phase", "status": "pass/fail", "issue": "10N-XXX"}`
- [ ] Test: Trigger each gate and verify events appear in dashboard

**Reference**: See integration guide for example enhanced hook scripts

### ⏳ Phase 5: Testing & Validation (30 min)

**Tasks**:

- [ ] Add ANTHROPIC_API_KEY to observability repo `.env`
- [ ] Start observability server:
      `cd ~/Desktop/claude-code-hooks-multi-agent-observability && ./scripts/start-system.sh`
- [ ] Run complete workflow: Planning → Action → QA
- [ ] Verify all events captured in dashboard
- [ ] Test filtering by agent, session, event type
- [ ] Verify chat transcripts captured on Stop events
- [ ] Check performance (no significant latency added)

### ⏳ Phase 6: Documentation (30 min)

**Tasks**:

- [ ] Update integration guide with actual implementation notes
- [ ] Add screenshots showing dashboard in action
- [ ] Document troubleshooting steps if hooks fail
- [ ] Add section to main workflow docs referencing observability
- [ ] Post response to Qodo code review

---

## How to Complete Setup

### 1. Add API Key

```bash
# Edit .env in observability repo
cd ~/Desktop/claude-code-hooks-multi-agent-observability
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### 2. Start Observability Server

```bash
cd ~/Desktop/claude-code-hooks-multi-agent-observability
./scripts/start-system.sh

# Server runs on http://localhost:4000
# UI runs on http://localhost:5173
```

### 3. Update Shell Aliases (Phase 3)

Add to your `.zshrc` or `.bashrc`:

```bash
# Planning Agent
alias planningagent='cd ~/Desktop/bigsirflrts && export AGENT_NAME="planning-agent" && claude --dangerously-skip-permissions "You are the Planning Agent..."'

# Action Agent
alias actionagent='cd ~/Desktop/bigsirflrts && export AGENT_NAME="action-agent" && claude --dangerously-skip-permissions "You are the Action Agent..."'

# QA Agent
alias qaagent='cd ~/Desktop/bigsirflrts && export AGENT_NAME="qa-agent" && claude --dangerously-skip-permissions "You are the QA Agent..."'

# Browser Agent
browseragent() {
  if [ -z "$1" ]; then
    echo "Usage: browseragent <issue>"
    return 1
  fi
  local issue="$1"
  export AGENT_NAME="browser-agent"
  cd ~/Desktop/bigsirflrts && claude --dangerously-skip-permissions "You are the Browser Agent. Initialize: 1) Read docs/prompts/browser-agent.md for your role, 2) Check for handoff at docs/.scratch/${issue}/handoffs/planning-to-browser-instructions.md, 3) Execute the browser operations specified"
}
```

### 4. Modify send_event.py (Phase 3)

Edit `.claude/hooks/send_event.py` to use `AGENT_NAME` environment variable for
better agent identification.

### 5. Enhance Workflow Gates (Phase 4)

Update existing hooks in `~/.claude/hooks/` to log events. See integration guide
for examples.

### 6. Test and Validate (Phase 5)

Run agents and watch events stream in dashboard at <http://localhost:5173>

---

## Files Created/Modified

- `.claude/hooks/send_event.py` - Event logging script
- `.claude/settings.json` - Hook configuration
- `docs/setup/observability-setup-status.md` - This file

---

## Reference

- **Integration Guide**:
  `docs/prompts/reference_docs/observability-integration-guide.md`
- **Observability Repo**:
  <https://github.com/disler/claude-code-hooks-multi-agent-observability>
- **Linear Issue**:
  [10N-293](https://linear.app/10netzero/issue/10N-293/add-multi-agent-observability-layer-to-workflow-system)
- **Claude Code Hooks Docs**:
  <https://docs.claude.com/en/docs/claude-code/hooks>
