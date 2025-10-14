# Browser Agent Quick Start

**Purpose**: Quick reference for launching and using Browser Agent with automated (Kilo Code) or manual (Comet) modes.

---

## Launch Browser Agent

```bash
browseragent
```

Or manually:
```bash
cd ~/Desktop/bigsirflrts
claude "You are the Browser Agent. Read docs/prompts/browser-agent.md"
```

---

## Mode A: Automated (Preferred)

### Prerequisites

**1. Chrome must be running with remote debugging**:
```bash
# Check if Chrome is accessible
curl -s http://localhost:9222/json/version

# If not, launch Chrome with debugging
open -a "Google Chrome" --args --remote-debugging-port=9222
```

**2. Kilo Code browser feature enabled** (already done per your settings)
- Viewport: 900x600 (Small Desktop)
- Screenshot quality: 75%
- CDP connection: http://localhost:9222

### Workflow

1. **Verify connection**:
   ```bash
   curl http://localhost:9222/json/version
   ```

2. **Use computer use tool** to:
   - Navigate to URL
   - Click elements (by coordinates from screenshot)
   - Type text into forms
   - Scroll and navigate

3. **Screenshots automatic**: Kilo Code captures at each step

4. **Write handoff** to Planning Agent with results

### Example: Install Frappe Cloud App

```
Browser Agent receives handoff: docs/.scratch/10n-228/handoffs/planning-to-browser-instructions.md

Task: Install flrts-extensions app on Frappe Cloud

Steps (automated):
1. Use computer tool to navigate to https://frappecloud.com
2. Click login button (coordinates from screenshot)
3. Type credentials
4. Navigate to Apps section
5. Click "Install from GitHub"
6. Fill form with repo URL
7. Submit form
8. Monitor installation progress
9. Verify success

All screenshots captured automatically by Kilo Code.

Write handoff: docs/.scratch/10n-228/handoffs/browser-to-planning-results.md
```

---

## Mode B: Manual (Fallback)

### When to Use

- Chrome remote debugging not available
- Task too complex for automation
- First-time UI exploration
- Human judgment needed

### Workflow

1. **Browser Agent guides Colin** with step-by-step instructions

2. **Colin executes manually** in Comet/Chrome:
   - Opens URLs
   - Clicks buttons
   - Fills forms
   - Takes screenshots (CMD+SHIFT+4)

3. **Browser Agent documents** what Colin reports:
   - Screenshots saved to docs/.scratch/<issue>/screenshots/
   - Actual path taken (if UI differs from expectations)
   - Results and any errors

4. **Write handoff** to Planning Agent with findings

### Example: Explore New Dashboard

```
Browser Agent: "Colin, please open https://ops.10nz.tools in Comet browser and explore the following:
1. Navigate to System Settings
2. Look for API configuration options
3. Screenshot any relevant API settings
4. Report what you find"

Colin: [executes manually, provides screenshots and observations]

Browser Agent: [documents Colin's findings in handoff]
```

---

## Decision Tree: Which Mode?

```
Is task repeatable with known UI?
├─ YES → Try Mode A (Automated)
│         └─ Is Chrome accessible (localhost:9222)?
│            ├─ YES → Use Mode A ✅
│            └─ NO → Use Mode B (Manual)
│
└─ NO → Use Mode B (Manual)
    └─ After exploration, document UI path for future Mode A use
```

---

## Handoff Format

### Intake (from Planning)

**Location**: `docs/.scratch/<issue>/handoffs/planning-to-browser-instructions.md`

**Required sections**:
- Task description
- Starting URL
- Authentication method
- Navigation path (suggestions)
- Success criteria
- Screenshot requirements

See [agent-handoff-rules.md](agent-handoff-rules.md) Template #8 for full format.

### Output (to Planning)

**Location**: `docs/.scratch/<issue>/handoffs/browser-to-planning-results.md`

**Required sections**:
- Status (✅ Complete / ❌ Failed / ⚠️ Partial)
- Screenshots (list with descriptions)
- Actual path taken
- Success criteria status
- Any errors or blockers
- Time spent
- Lessons learned

See [agent-handoff-rules.md](agent-handoff-rules.md) Template #9 for full format.

---

## Troubleshooting

### Chrome not accessible

**Problem**: `curl http://localhost:9222/json/version` fails

**Solution**:
```bash
# Launch Chrome with remote debugging
open -a "Google Chrome" --args --remote-debugging-port=9222

# Verify
curl http://localhost:9222/json/version
```

### Computer use tool not working

**Problem**: Claude can't control browser

**Solution**: Fall back to Mode B (manual) and document for Planning Agent

### Screenshots not saving

**Mode A**: Kilo Code saves automatically (check Kilo Code output)
**Mode B**: Colin uses CMD+SHIFT+4, saves to docs/.scratch/<issue>/screenshots/

### UI different from instructions

**Not a problem!** Browser Agent is designed for adaptive navigation:
1. Try site search
2. Scan menus systematically
3. Document actual path found
4. Update handoff so Planning knows for future

---

## Tips for Success

**Mode A (Automated)**:
- Verify Chrome connection first
- Let computer use tool handle screenshots
- Be patient with page loads (wait for elements)
- Document coordinates used for clicks

**Mode B (Manual)**:
- Give Colin clear, numbered steps
- Ask for screenshots at key points
- Don't assume UI matches docs (it often doesn't)
- Document actual path for future automation

**Both Modes**:
- Always write handoff back to Planning
- Include screenshots showing success/failure
- Note any UI deviations from instructions
- Suggest improvements for future handoffs

---

**Last Updated**: 2025-10-14
**Version**: 1.0
**Status**: Active
