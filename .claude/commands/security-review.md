# Security Review Command

Performs a comprehensive security analysis of code changes or the entire
codebase.

## Usage

```bash
/security-review [scope]
```

**Scopes:**

- `current` (default) - Review uncommitted changes
- `pr` - Review changes in current PR/branch vs main
- `full` - Full codebase security audit
- `file <path>` - Review specific file

## What It Checks

### 1. Input Validation & Injection

- SQL injection vulnerabilities
- Command injection risks
- Path traversal issues
- Template injection

### 2. Authentication & Authorization

- Missing authentication checks
- Weak session management
- Improper access controls
- JWT vulnerabilities

### 3. Data Exposure

- Hardcoded secrets/credentials
- Sensitive data in logs
- PII handling issues
- Information disclosure

### 4. Cryptography

- Weak hashing algorithms
- Insecure random number generation
- Inadequate encryption
- Key management issues

### 5. Cross-Site Issues

- XSS vulnerabilities
- CSRF protection gaps
- CORS misconfigurations
- Clickjacking risks

### 6. Configuration & Dependencies

- Insecure defaults
- Missing security headers
- Vulnerable dependencies
- Exposed debug/admin features

### 7. Business Logic

- Race conditions
- Access control bypasses
- Insecure workflows
- Data integrity issues

### 8. Supply Chain

- Dependency vulnerabilities
- Malicious packages
- Outdated libraries
- License compliance

## Output Format

The security review provides:

1. **Executive Summary** - Overall security posture
2. **Critical Findings** - Issues requiring immediate attention
3. **Medium/Low Findings** - Issues to address soon
4. **Recommendations** - Specific remediation steps
5. **Code References** - Direct links to problematic code

## Integration with Pre-Push Hook

This command is automatically run before pushing code if enabled in your git
hooks. To skip security check (not recommended):

```bash
git push --no-verify
```

## Examples

```bash
# Review current uncommitted changes
/security-review

# Review full codebase
/security-review full

# Review specific file
/security-review file src/auth/login.ts

# Review PR changes
/security-review pr
```

## Project-Specific Security Focus

**FLRTS Security Priorities:**

1. **Telegram Integration** - Webhook signature validation
2. **Database Access** - RLS policies, SQL injection
3. **API Keys** - Supabase service role key protection
4. **CORS** - Restrict origins for edge functions
5. **Rate Limiting** - DoS prevention for webhooks
6. **Secrets Management** - Environment variable usage
7. **Input Validation** - Natural language parsing safety

## False Positive Handling

If a finding is a false positive:

1. Add `// SECURITY-REVIEWED: [reason]` comment above the code
2. Document why the pattern is safe in this context
3. Include reviewer name and date

Example:

```typescript
// SECURITY-REVIEWED: Quinn 2025-01-30
// viewName comes from predefined array, not user input
const result = await db.query(`SELECT * FROM ${viewName}`);
```

## Configuration

Edit this file to customize:

- Security focus areas for your project
- Severity thresholds
- Ignored patterns
- Additional checks

---

**Remember:** Security is everyone's responsibility. When in doubt, ask for a
security review!
