# Module Research & Planning Agent Prompt

Use this prompt to have an agent research, document, and organize security audit
findings for any module.

---

## 🎯 Critical Context: Internal Bitcoin Company Tool

**IMPORTANT**: This is an internal tool for a Bitcoin company with 10-20 users
maximum. This is NOT:

- ❌ Enterprise software for thousands of users
- ❌ A product for sale to external customers
- ❌ Processing consumer PII or sensitive customer data
- ❌ Requiring customer-facing compliance (SOC2, ISO 27001, GDPR, etc.)

**What this IS**:

- ✅ Internal operations tool for company employees
- ✅ Processing company/business data and partner/supplier contacts
- ✅ Bitcoin network integration (public blockchain, no customer PII)
- ✅ **Handles significant Bitcoin holdings** - protecting company assets, not
  customer funds
- ✅ Pragmatic security appropriate for small team scale

**Security Context**:

- **Network**: Zero-trust architecture with Cloudflare Tunnel (already
  implemented)
  - No open ports, all traffic authenticated
  - This is for **our asset protection**, not compliance theater
- **Scale**: 10-20 internal users, not millions of customers
- **Threat Model**: Protect company Bitcoin holdings from external attackers
- **Not Our Problem**: Customer data breaches, regulatory audits, consumer
  privacy laws

**Research & Recommendations Should**:

- **DO** prioritize security protecting Bitcoin holdings and operations
- **DO** maintain zero-trust network security (Cloudflare Tunnel)
- **DO** focus on practical, maintainable solutions for small team
- **DON'T** over-engineer for customer scale (millions of users)
- **DON'T** add compliance features for regulations that don't apply
- **DON'T** recommend solutions requiring dedicated security team

**Examples**:

- ✅ Zero-trust network architecture (Cloudflare Tunnel) - protects our Bitcoin
  operations
- ✅ HMAC webhook validation - prevents unauthorized access to our systems
- ✅ Rate limiting to prevent service overwhelm - not DDoS for millions
- ❌ SOC2 compliance features - no customers to audit for
- ❌ HSM modules for password hashing - overkill for internal auth
- ❌ Real-time anomaly detection requiring 24/7 SOC team

---

## Prompt Template

````
I need you to research and document security audit findings for MODULE [X].

Follow this exact workflow:

### Step 1: Pull Linear Issues
Use the linear MCP to list all MODULE [X] issues:
- Search for: "MODULE [X]"
- Pull all related issues (completed and backlog)
- Get full details for each issue using get_issue

### Step 2: Run CodeRabbit Analysis (Optional but Recommended)
Before deep research, validate current code state:
- Run `coderabbit --prompt-only --type all` in background
- Continue with Step 3 while CodeRabbit analyzes
- Check findings later to identify actual code issues vs. theoretical concerns
- Use findings to prioritize which issues need immediate fixes vs. future enhancements

### Step 3: Research Best Practices
For each issue, use BetterST (sequential thinking), ref.tools, and exa search to research:
- Industry best practices for the specific vulnerability/concern
- Implementation patterns and code examples
- API documentation and official guides
- Security standards (OWASP, NIST, etc.) - **scaled for 10-20 user internal tools**
- Proven solutions from reputable sources

Focus your research on:
- Root cause understanding
- Concrete implementation approaches (pragmatic for small team)
- Environment configuration recommendations
- Testing strategies (realistic for startup scale)
- Relevant code libraries or tools (maintain dependencies conservatively)

### Step 4: Update Linear Issues
For each MODULE [X] issue, update the description with a "Research Findings" section containing:
- Summary of the problem/vulnerability
- Best practices from authoritative sources
- Implementation approach with code examples
- Environment variables or configuration needed
- References with URLs

Format example:
```markdown
---

## Research Findings

### [Topic Area]
- **Key point**: Details
- **Another point**: More details

### Implementation Strategy
1. Step one
2. Step two
3. Step three

### Benefits
- Benefit 1
- Benefit 2

### References
- https://example.com/doc1
- https://example.com/doc2
````

### Step 5: Create Mother Issue

Create a parent Linear issue for MODULE [X] that:

- Title: "[Module X] [Module Name] - [Focus Area] Improvements"
- Lists all sub-issues with direct links
- Summarizes key findings for each
- Provides implementation sequence/phases
- Estimates effort for each sub-issue
- Defines success criteria
- Includes handoff notes for next developer
- Tags: ["module-[x]", "epic"]

Use this structure:

```markdown
# MODULE [X]: [Module Name] - Master Issue

## Overview

[Brief description of what this epic covers]

## Status Summary

- ✅ Completed issues
- 🔄 Remaining issues count

## Sub-Issues

### 1. [ISSUE-ID](link) - Title (SEVERITY)

**Priority**: [High/Medium/Low] (Rationale)

[Brief description]

**Key findings**:

- Finding 1
- Finding 2
- Finding 3

**Estimated effort**: [hours]

---

[Repeat for each sub-issue]

---

## Implementation Sequence

### Phase 1: [Name] ([time estimate])

1. Issue ID: Description

### Phase 2: [Name] ([time estimate])

2. Issue ID: Description

[Continue for all phases]

---

## Total Estimated Effort

**X-Y hours** (~Z days)

## Dependencies

- [Any dependencies between issues]

## Success Criteria

- ✅ Criterion 1
- ✅ Criterion 2
- ✅ Criterion 3

## Resources

All sub-issues contain detailed research findings with:

- Best practices and patterns
- Code examples and implementation approaches
- Environment variable configurations
- External references and documentation links

## Notes for Next Developer

1. [Important note 1]
2. [Important note 2]
3. [Important note 3]
```

### Step 6: Report Back

After completing all steps, provide:

- Summary of issues researched
- Key themes/patterns across the module
- Link to the mother issue you created
- Any critical findings that need immediate attention
- Recommended implementation order

---

## Example Usage

**For Module 3 (NLP/AI):**

```
I need you to research and document security audit findings for MODULE 3.

[Follow the workflow above]
```

**For Module 6 (Supabase):**

```
I need you to research and document security audit findings for MODULE 6.

[Follow the workflow above]
```

---

## Quality Standards

Your research should:

- ✅ Use authoritative sources (official docs, OWASP, industry leaders)
- ✅ Include specific code examples where applicable
- ✅ Provide actionable implementation guidance
- ✅ Link to original sources for further reading
- ✅ **Scale appropriately for 10-20 user internal tool** (not enterprise)
- ✅ Balance security with development velocity
- ✅ Estimate effort realistically (1-14 hours typical, maintainable by small
  team)
- ✅ Consider maintenance burden (prefer simple solutions)
- ✅ Focus on realistic threat models (internal employees, not public internet)

Avoid:

- ❌ Generic security advice without specifics
- ❌ Recommending enterprise solutions (dedicated security teams, HSMs, SOC2
  compliance)
- ❌ Over-engineering for scale we'll never hit (millions of users, distributed
  systems)
- ❌ Unverified or blog-only sources
- ❌ Missing implementation details
- ❌ Solutions requiring 24/7 monitoring or dedicated ops team
- ❌ Compliance requirements for consumer data (we don't have consumers)

---

## Tools to Use

**Required:**

- `mcp__linear-server__list_issues` - Find module issues
- `mcp__linear-server__get_issue` - Get issue details
- `mcp__linear-server__update_issue` - Add research findings
- `mcp__linear-server__create_issue` - Create mother issue
- `mcp__BetterST__sequentialthinking` - Structure your research process
- `mcp__ref__ref_search_documentation` - Search technical docs
- `mcp__exasearch__web_search_exa` - Search for best practices
- `mcp__perplexity-ask__perplexity_ask` - Get expert answers

**Code Quality & Security Analysis (CodeRabbit CLI):**

_Use CodeRabbit CLI to validate current code and find issues before researching
fixes:_

- `Bash: coderabbit auth status` - Verify authentication (should show logged in)
- `Bash: coderabbit --prompt-only --type uncommitted` - Review uncommitted
  changes only
- `Bash: coderabbit --prompt-only --type committed` - Review committed changes
  only
- `Bash: coderabbit --prompt-only --type all` - Review everything (committed +
  uncommitted)
- `Bash: coderabbit --prompt-only --base develop` - Compare against develop
  branch
- `Bash: coderabbit --plain` - Get detailed output with descriptions (slower)

**What CodeRabbit Detects:**

- Race conditions and concurrency issues
- Memory leaks and resource management
- Security vulnerabilities (injection, XSS, secrets)
- Logic errors and null pointer exceptions
- Code quality issues and best practices

**Built-in Tools Used:**

- ShellCheck (bash scripts)
- Gitleaks (secret scanning)
- Hadolint (Dockerfile linting)
- Checkov (IaC security - Docker, Terraform, Kubernetes)
- Language-specific linters (Biome, ESLint, Ruff, etc.)

**Workflow Integration:**

1. **Before research**: Run `coderabbit --prompt-only --type uncommitted` in
   background
2. **Wait for completion**: Reviews take 7-30+ minutes depending on changes
3. **Check output**: Use BashOutput tool to monitor progress
4. **Parse findings**: CodeRabbit outputs file:line:issue format for AI parsing
5. **After fixes**: Re-run to verify no new issues introduced

**Example Usage:**

```bash
# Start review in background (run_in_background=true)
Bash: coderabbit --prompt-only --type all 2>&1

# Monitor progress
BashOutput: <bash_id>

# Check if complete (status: completed)
BashOutput: <bash_id>
```

**Tips:**

- Use `--prompt-only` for AI-optimized output (token efficient)
- Use `--plain` when you need human-readable details
- Run in background to avoid blocking research
- CodeRabbit reads your CLAUDE.md for project-specific standards
- Authentication enhances review quality (uses learned patterns)

**Optional:**

- `Read` - Review current code implementation
- `WebFetch` - Get specific documentation pages
- `mcp__context7__resolve-library-id` + `get-library-docs` - Library-specific
  docs

---

## Tips for Success

1. **Start with thinking tool**: Use BetterST to plan your research approach
   before diving in
2. **Batch your searches**: Make multiple research calls in parallel when
   possible
3. **Read current code**: Understanding the existing implementation helps guide
   research
4. **Prioritize by severity**: Focus deeper research on HIGH/CRITICAL issues
5. **Think implementation**: Research should lead to actionable next steps, not
   just theory
6. **Link everything**: Use full URLs in Linear issues so developers can dig
   deeper
7. **Estimate conservatively**: Better to under-promise and over-deliver
8. **Use CodeRabbit CLI**: Run `coderabbit --prompt-only --type uncommitted` (in
   background) to find issues before researching fixes
9. **Validate with AI review**: After implementing fixes, re-run CodeRabbit to
   verify no new issues introduced

---

## Success Checklist

Before reporting completion, verify:

- [ ] All MODULE [X] issues identified and detailed
- [ ] Each issue updated with research findings section
- [ ] All research includes authoritative references
- [ ] Implementation approaches are concrete and specific
- [ ] Mother issue created with all sub-issues linked
- [ ] Effort estimates provided for each issue
- [ ] Implementation sequence defined with phases
- [ ] Success criteria clearly stated
- [ ] Handoff notes written for next developer
- [ ] Summary report provided back to user

---

## Module Reference

Common modules in this codebase:

- **Module 1**: Infrastructure (Docker, networking, secrets)
- **Module 2**: OpenProject Integration
- **Module 3**: NLP/AI (OpenAI, parsing)
- **Module 4**: N8N Automation
- **Module 5**: Telegram Bot
- **Module 6**: Supabase (Database, Auth, Storage)
- **Module 7**: Browser Extension
- **Module 8**: CI/CD Pipeline

Each module has its own security considerations and best practices to research.
