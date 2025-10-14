# Action Agent Workflow Gates (Hook-Enforced)

**Purpose**: Define mandatory gates in the theory→research→act→repeat cycle that Claude Code hooks enforce to prevent premature production code changes.

**Related Documents**:
- action-agent.md (lines 96-106: Iterative Development & Debugging Process)
- scratch-and-archiving-conventions.md (scratch workspace rules)

---

## The Enforced Cycle

```
Phase 1: THEORY/RESEARCH (gather context)
   ↓ [Gate: Must have research artifacts OR API validation]
Phase 2: SCRATCH (prototype in scratch/)
   ↓ [Gate: Must have scratch files AND validation passed]
Phase 3: PRODUCTION (edit production files)
   ↓ [Gate: Must have tests OR justification]
Phase 4: VALIDATE (run tests/checks)
   ↓ [Gate: Tests must pass]
Phase 5: ITERATE (repeat if needed)
```

---

## Gate 1: Research Phase Required

**Before Action Agent can use Write/Edit on production files**, one of these must exist:

### Research Artifacts (any one proves research was done):
```bash
# API validation evidence
docs/.scratch/<issue>/api-validation.md
docs/.scratch/<issue>/curl-outputs.txt
docs/.scratch/<issue>/api-spec-notes.md

# Module/DocType research
docs/.scratch/<issue>/doctype-comparison.md
docs/.scratch/<issue>/module-analysis.md

# Existing research cited
docs/erpnext/research/<relevant-module>.md
```

### OR: MCP Tool Usage (proves active research):
- Used `mcp__ref__ref_search_documentation`
- Used `mcp__perplexity-ask__perplexity_ask`
- Used `mcp__exasearch__web_search_exa`
- Used WebFetch on official docs

### Hook Implementation:
```json
{
  "event": "PreToolUse",
  "tool_pattern": "^(Write|Edit)$",
  "script": "~/.claude/hooks/check-research-phase.sh"
}
```

**Script Logic**:
```bash
#!/bin/bash
# check-research-phase.sh

TOOL_NAME="$1"
FILE_PATH="$2"  # from tool arguments
ISSUE=$(pwd | grep -oE '10[nN]-[0-9]+' | head -1)

# Allow scratch directory edits always
if [[ "$FILE_PATH" == *"docs/.scratch/"* ]]; then
  exit 0  # Allow
fi

# Check for research artifacts
if [[ -d "docs/.scratch/$ISSUE" ]]; then
  if ls docs/.scratch/$ISSUE/*validation*.md docs/.scratch/$ISSUE/*research*.md 2>/dev/null; then
    exit 0  # Allow - research exists
  fi
fi

# Block production file edit
echo "❌ GATE 1 FAILED: Research phase required before editing production files"
echo "Required: Create one of:"
echo "  - docs/.scratch/$ISSUE/api-validation.md"
echo "  - docs/.scratch/$ISSUE/research-findings.md"
echo "  - docs/.scratch/$ISSUE/doctype-comparison.md"
echo "Or cite existing research from docs/erpnext/research/"
exit 1  # Block
```

---

## Gate 2: Scratch Prototype Required

**Before editing production TypeScript/Python/JS files**, scratch prototype must exist and validate:

### Required Scratch Artifacts:
```bash
# Prototype code (proves non-destructive experimentation)
docs/.scratch/<issue>/prototype/*.ts
docs/.scratch/<issue>/prototype/*.js
docs/.scratch/<issue>/prototype/*.py

# Validation evidence
docs/.scratch/<issue>/validation-checklist.md  # showing tsc, tests, linting
```

### Hook Implementation:
```json
{
  "event": "PreToolUse",
  "tool_pattern": "^(Write|Edit)$",
  "script": "~/.claude/hooks/check-scratch-phase.sh"
}
```

**Script Logic**:
```bash
#!/bin/bash
# check-scratch-phase.sh

FILE_PATH="$2"
ISSUE=$(pwd | grep -oE '10[nN]-[0-9]+' | head -1)

# Allow scratch edits
if [[ "$FILE_PATH" == *"docs/.scratch/"* ]]; then
  exit 0
fi

# Allow non-code files
if [[ ! "$FILE_PATH" =~ \.(ts|js|py)$ ]]; then
  exit 0
fi

# Check for scratch prototype
if [[ ! -d "docs/.scratch/$ISSUE/prototype" ]]; then
  echo "❌ GATE 2 FAILED: Scratch prototype required before production code"
  echo "Required: Create prototype in docs/.scratch/$ISSUE/prototype/"
  echo "Then validate with: tsc --noEmit, npm test, linter"
  exit 1
fi

# Check for validation checklist
if [[ ! -f "docs/.scratch/$ISSUE/validation-checklist.md" ]]; then
  echo "⚠️  WARNING: No validation checklist found"
  echo "Recommended: Create docs/.scratch/$ISSUE/validation-checklist.md"
  echo "  - [ ] tsc --noEmit (no type errors)"
  echo "  - [ ] Mock API validated"
  echo "  - [ ] Linter passed"
fi

exit 0  # Allow but warned
```

---

## Gate 3: Validation Before Handoff

**Before writing handoff to QA**, validation must be complete:

### Required Evidence:
```bash
# Test results
.test-results.log  # or embedded in scratch notes

# Type check results
.tsc-check.log

# Security scan results
security-findings.json  # with all items justified or fixed
```

### Hook Implementation:
```json
{
  "event": "PreToolUse",
  "tool_pattern": "^Write$",
  "script": "~/.claude/hooks/check-handoff-validation.sh"
}
```

**Script Logic**:
```bash
#!/bin/bash
# check-handoff-validation.sh

FILE_PATH="$2"

# Only check handoff files
if [[ ! "$FILE_PATH" == *"handoffs/action-to-qa"* ]]; then
  exit 0
fi

ISSUE=$(echo "$FILE_PATH" | grep -oE '10[nN]-[0-9]+')

echo "🔍 Checking validation requirements for QA handoff..."

# Check tests ran
if ! git log -1 --grep="test" -i > /dev/null 2>&1; then
  echo "⚠️  No test execution evidence in recent commits"
fi

# Check TypeScript validation (if TS project)
if ls *.ts 2>/dev/null | head -1; then
  if [[ ! -f "docs/.scratch/$ISSUE/tsc-check.log" ]]; then
    echo "❌ GATE 3 FAILED: TypeScript validation required"
    echo "Required: Run 'tsc --noEmit' and save output to docs/.scratch/$ISSUE/tsc-check.log"
    exit 1
  fi
fi

# Check security scan
if [[ ! -f "security-findings.json" ]]; then
  echo "⚠️  WARNING: No security scan results found"
  echo "Recommended: Run scripts/security-review.sh"
fi

exit 0  # Allow
```

---

## Gate 4: Iteration Checkpoint

**Periodically check that agent is progressing through cycle**, not stuck in one phase:

### Hook Implementation:
```json
{
  "event": "Stop",
  "script": "~/.claude/hooks/check-iteration-progress.sh"
}
```

**Script Logic**:
```bash
#!/bin/bash
# check-iteration-progress.sh

ISSUE=$(pwd | grep -oE '10[nN]-[0-9]+' | head -1)

if [[ -z "$ISSUE" ]]; then
  exit 0  # Not in issue context
fi

echo "📊 Iteration Progress Check for $ISSUE:"

# Check phase completion
PHASES=()
[[ -d "docs/.scratch/$ISSUE" ]] && PHASES+=("✅ Research")
[[ -d "docs/.scratch/$ISSUE/prototype" ]] && PHASES+=("✅ Scratch")
[[ $(git log -1 --oneline | grep -i "$ISSUE") ]] && PHASES+=("✅ Production")
[[ -f "docs/.scratch/$ISSUE/validation-checklist.md" ]] && PHASES+=("✅ Validation")

echo "${PHASES[@]}"

# Warn if stuck in research too long (>50 files in scratch)
SCRATCH_COUNT=$(find docs/.scratch/$ISSUE -type f 2>/dev/null | wc -l)
if [[ $SCRATCH_COUNT -gt 50 ]]; then
  echo "⚠️  WARNING: Large scratch directory ($SCRATCH_COUNT files)"
  echo "Consider: Are you over-researching? Time to prototype?"
fi

exit 0  # Informational only
```

---

## Hook Configuration File

Create `~/.claude/settings.local.json` or add to existing:

```json
{
  "hooks": [
    {
      "event": "PreToolUse",
      "tool_pattern": "^(Write|Edit)$",
      "script": "~/.claude/hooks/check-research-phase.sh",
      "description": "Enforce research phase before production edits"
    },
    {
      "event": "PreToolUse",
      "tool_pattern": "^(Write|Edit)$",
      "script": "~/.claude/hooks/check-scratch-phase.sh",
      "description": "Require scratch prototype before production code"
    },
    {
      "event": "PreToolUse",
      "tool_pattern": "^Write$",
      "script": "~/.claude/hooks/check-handoff-validation.sh",
      "description": "Validate before QA handoff"
    },
    {
      "event": "Stop",
      "script": "~/.claude/hooks/check-iteration-progress.sh",
      "description": "Report iteration progress at session end"
    }
  ]
}
```

---

## Installation Instructions

### 1. Create hooks directory:
```bash
mkdir -p ~/.claude/hooks
chmod +x ~/.claude/hooks/*.sh
```

### 2. Create each hook script (see above)

### 3. Add hook configuration to settings:
```bash
# Merge with existing ~/.claude/settings.local.json
# Or create new if doesn't exist
```

### 4. Test hooks:
```bash
# Try editing production file without research - should block
# Try editing scratch file - should allow
# Create research artifact - should unblock
```

---

## Bypass Mechanism (For Emergencies)

Set environment variable to bypass gates:

```bash
export CLAUDE_BYPASS_WORKFLOW_GATES=1
```

**Use sparingly** - only for:
- Hotfixes requiring immediate production change
- Fixing broken gates themselves
- Colin explicitly requests bypass

---

## Action Agent Prompt Updates

Add to action-agent.md after Startup Protocol:

```markdown
## Workflow Gates (Hook-Enforced)

Your iterative development cycle is enforced by Claude Code hooks. You cannot skip phases:

**Phase 1: Research** - Create research artifacts in `docs/.scratch/<issue>/` OR use MCP tools (ref, perplexity, exa) before editing production files.

**Phase 2: Scratch** - Prototype in `docs/.scratch/<issue>/prototype/` with validation evidence before production code changes.

**Phase 3: Production** - Edit production files only after Gates 1 & 2 pass.

**Phase 4: Validation** - Run tests, type checks, security scans. Document results before QA handoff.

**Phase 5: Iterate** - Repeat based on results.

**If a gate blocks you**: The error message tells you exactly what artifact is missing. Create it, then retry.

See [action-agent-workflow-gates.md](reference_docs/action-agent-workflow-gates.md) for complete gate specifications.
```

---

## Benefits

1. **Prevents premature optimization**: Can't edit production until research done
2. **Enforces validation**: Can't hand off to QA without evidence
3. **Creates audit trail**: Scratch artifacts prove process followed
4. **Fails fast**: Agent knows immediately if skipping steps
5. **Self-documenting**: Gate errors tell agent what's needed

---

## Monitoring & Tuning

**Track gate violations**:
```bash
# Check how often gates block (logged by hooks)
grep "GATE.*FAILED" ~/.claude/history.jsonl | wc -l
```

**Adjust thresholds**:
- If gates block too often → loosen requirements
- If agents skip phases → tighten requirements
- If false positives → improve detection logic

---

**Last Updated**: 2025-10-14
**Version**: 1.0
**Status**: Draft (requires hook implementation)
