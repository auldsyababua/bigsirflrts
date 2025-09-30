# Security Review Documentation

Automated security analysis for FLRTS codebase using AI-powered vulnerability
detection.

## Overview

FLRTS uses a multi-layered security review approach:

1. **Pre-Push Hook** - Automated checks before code leaves your machine
2. **Slash Command** - On-demand security reviews via Claude Code
3. **Manual Review** - Team security audits for sensitive changes

## 🚀 Quick Start

### Run Security Review Now

```bash
# Via Claude Code slash command (recommended)
/security-review

# Via script directly
bash scripts/security-review.sh

# Review specific file
/security-review file src/auth/login.ts
```

### Pre-Push Hook (Automatic)

Security review runs automatically before every `git push`:

```bash
# Normal push - includes security review
git push

# Skip security review (emergencies only)
SKIP_SECURITY=1 git push

# Skip all pre-push checks
SKIP_PREPUSH=1 git push
```

## 🔍 What Gets Checked

### Critical Severity

- **Hardcoded Secrets** - API keys, passwords, tokens in source code
- **SQL Injection** - Unsafe SQL query construction
- **Command Injection** - Unsafe shell command execution
- **Eval Usage** - Dynamic code execution risks

### High Severity

- **XSS Vulnerabilities** - innerHTML, dangerouslySetInnerHTML usage
- **Missing Authentication** - Unauthenticated API endpoints
- **Path Traversal** - Unsafe file path handling

### Medium Severity

- **CORS Misconfigurations** - Wildcard (`*`) allowed origins
- **Weak Cryptography** - MD5, SHA1 usage
- **Missing Input Validation** - Unvalidated user input
- **Information Disclosure** - Sensitive data in logs

### Low Severity

- **Missing Security Headers** - CSP, HSTS, etc.
- **Outdated Dependencies** - Known vulnerabilities in packages
- **Insecure Defaults** - Overly permissive configurations

## 📋 Configuration

### Project-Specific Focus Areas

For FLRTS, security reviews prioritize:

1. **Telegram Webhook Security**
   - Signature validation
   - Rate limiting
   - Input sanitization

2. **Database Access**
   - RLS policy enforcement
   - SQL injection prevention
   - Service role key protection

3. **API Security**
   - Authentication on all endpoints
   - CORS restrictions
   - Request validation

4. **Secrets Management**
   - Environment variable usage
   - No hardcoded credentials
   - Proper key rotation

## 🛠️ Handling Findings

### False Positives

If a finding is a false positive, add a security review comment:

```typescript
// SECURITY-REVIEWED: Quinn 2025-01-30
// viewName comes from predefined array, not user input
const result = await db.query(`SELECT * FROM ${viewName} LIMIT 1;`);
```

### Fixing Issues

1. **Critical/High** - Must be fixed before pushing
2. **Medium** - Should be fixed soon, doesn't block push
3. **Low** - Address during refactoring

### Requesting Exemptions

For legitimate cases that trigger false positives:

1. Add `// SECURITY-REVIEWED:` comment with explanation
2. Document in code review why the pattern is safe
3. Update `.security-ignore` if needed (see below)

## 📁 Files and Locations

```
.claude/commands/
  └── security-review.md          # Slash command definition

scripts/
  └── security-review.sh          # Automated security scanner

.husky/
  └── pre-push                    # Git hook configuration

docs/security/
  ├── SECURITY-REVIEW.md          # This file
  └── findings/                   # Historical security findings
```

## 🔧 Advanced Usage

### Custom Security Checks

Edit `scripts/security-review.sh` to add project-specific checks:

```bash
# Check for specific anti-patterns
echo "🔍 Checking for unsafe Telegram message handling..."
while IFS= read -r file; do
  if grep -nHE "update\.message.*\.text" "$file" | grep -v "sanitize"; then
    add_finding "HIGH" "Unsanitized Telegram message" "$file" ""
  fi
done <<< "$CHANGED_FILES"
```

### Environment Variables

```bash
# Skip security review
SKIP_SECURITY=1 git push

# Skip all pre-push checks
SKIP_PREPUSH=1 git push

# Run integration tests too
RUN_INTEGRATION=true git push
```

### CI/CD Integration

The security review can be integrated into GitHub Actions:

```yaml
# .github/workflows/security.yml
name: Security Review
on: [pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Security Review
        run: bash scripts/security-review.sh
```

## 📊 Security Metrics

Track security over time:

```bash
# Count findings by severity
grep -r "SECURITY-REVIEWED" src/ | wc -l

# Recent security fixes
git log --grep="security" --oneline --since="1 month ago"
```

## 🎓 Security Best Practices

### For Developers

1. **Never commit secrets** - Use environment variables
2. **Validate all input** - Never trust user data
3. **Use parameterized queries** - Prevent SQL injection
4. **Sanitize output** - Prevent XSS
5. **Fail securely** - Don't leak info in errors
6. **Principle of least privilege** - Minimal permissions
7. **Defense in depth** - Multiple security layers

### For Code Reviewers

1. **Check authentication** - All endpoints protected?
2. **Review access controls** - Proper authorization?
3. **Examine data flow** - Where does user input go?
4. **Verify secrets** - No hardcoded credentials?
5. **Test edge cases** - How does it fail?
6. **Consider threat model** - What could go wrong?

## 🚨 Incident Response

If a security issue is discovered:

1. **Do not commit the fix publicly** without assessment
2. **Notify team security contact** (Colin - CTO)
3. **Document the issue** in private channel
4. **Develop patch** in private branch
5. **Test thoroughly** before deploying
6. **Deploy fix** to production ASAP
7. **Post-mortem** to prevent recurrence

## 📚 Resources

### Internal

- [Coding Standards](../architecture/coding-standards.md)
- [Testing Strategy](../architecture/testing-strategy.md)
- [Audit Reports](../../audit-results/)

### External

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Database](https://cwe.mitre.org/)
- [Supabase Security](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Deno Security](https://deno.land/manual/basics/permissions)

## 🤝 Contributing

To improve security reviews:

1. Add new checks to `scripts/security-review.sh`
2. Update project focus in `.claude/commands/security-review.md`
3. Document false positive patterns
4. Share findings with team

## ❓ FAQ

**Q: Can I disable security reviews?** A: Yes, but not recommended. Use
`SKIP_SECURITY=1 git push` for emergencies only.

**Q: Why are test files flagged?** A: Test files should also follow security
best practices. Add `// SECURITY-REVIEWED` if intentionally testing unsafe
patterns.

**Q: How do I add project-specific checks?** A: Edit
`scripts/security-review.sh` and add your patterns to the appropriate severity
section.

**Q: What if I disagree with a finding?** A: Add a `// SECURITY-REVIEWED:`
comment explaining why it's safe, and document in PR.

**Q: How often should I run full codebase reviews?** A: Run
`/security-review full` monthly or before major releases.

---

**Remember: Security is everyone's responsibility!** 🔒
