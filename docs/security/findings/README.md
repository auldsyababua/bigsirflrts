# Security Findings Archive

This directory stores historical security findings for trend analysis and
compliance tracking.

## Purpose

- **Audit Trail**: Document all security issues discovered and resolved
- **Trend Analysis**: Track security posture over time
- **Compliance**: Maintain records for security audits
- **Learning**: Reference past issues to prevent recurrence

## File Naming Convention

```
YYYY-MM-DD-{severity}-{brief-description}.md
```

**Examples:**

- `2025-01-30-CRITICAL-telegram-webhook-signature.md`
- `2025-02-15-HIGH-sql-injection-parse-service.md`
- `2025-03-01-MEDIUM-cors-wildcard-api.md`

## Finding Template

Create new findings using this template:

````markdown
# [SEVERITY] Brief Description

**Date Discovered**: YYYY-MM-DD **Discovered By**: Name/Tool **Status**: Open |
Fixed | False Positive | Accepted Risk

## Description

Detailed description of the security issue.

## Impact

What could happen if exploited?

## Affected Files

- `path/to/file.ts:123`
- `path/to/another.ts:456`

## Reproduction Steps

1. Step one
2. Step two
3. Step three

## Fix

How was this resolved?

```diff
- // Vulnerable code
+ // Fixed code
```
````

## Prevention

How can we prevent this in the future?

## References

- [OWASP Link](https://owasp.org/...)
- [CWE-XXX](https://cwe.mitre.org/...)

````

## Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **CRITICAL** | Immediate exploitation possible, high impact | Fix immediately, block deployment |
| **HIGH** | Exploitation likely, significant impact | Fix within 24 hours |
| **MEDIUM** | Exploitation possible with effort, moderate impact | Fix within 1 week |
| **LOW** | Low likelihood or impact | Fix during refactoring |

## Metrics

Track security health with:

```bash
# Count findings by severity
ls -1 docs/security/findings/ | grep -c CRITICAL
ls -1 docs/security/findings/ | grep -c HIGH
ls -1 docs/security/findings/ | grep -c MEDIUM
ls -1 docs/security/findings/ | grep -c LOW

# Recent findings
ls -lt docs/security/findings/ | head -10

# Fixed vs Open
grep -l "Status: Fixed" docs/security/findings/*.md | wc -l
grep -l "Status: Open" docs/security/findings/*.md | wc -l
````

## Retention Policy

- **CRITICAL/HIGH**: Keep indefinitely
- **MEDIUM**: Keep for 2 years
- **LOW**: Keep for 1 year
- **False Positives**: Keep for 6 months (for reference)

## Access Control

- **Read**: All developers
- **Write**: Security team, CTO (Colin)
- **Delete**: CTO only

## Integration

Findings are automatically referenced by:

- Pre-push security review (`scripts/security-review.sh`)
- GitHub Actions security workflow
- Monthly security reports

---

**Remember**: Document findings promptly to maintain accurate security history.
