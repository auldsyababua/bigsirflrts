# Frappe Cloud Operations Playbook

**Status**: Active **Related**:
[Frappe Cloud Deployment Guide](../deployment/FRAPPE_CLOUD_DEPLOYMENT.md) |
[Frappe Cloud Site Setup](../setup/frappe-cloud-site.md) |
[ADR-006 ERPNext Frappe Cloud Migration](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)

> **⚠️ PRIVATE BENCH REQUIRED**: This playbook applies to **Frappe Cloud Private
> Bench** environments ($25/mo minimum).

## Overview

This document provides operational procedures for routine maintenance,
monitoring, incident response, and troubleshooting of BigSirFLRTS ERPNext on
Frappe Cloud.

**Scope**: Production site management for `10netzero.v.frappe.cloud` /
`ops.10nz.tools`

**Reference Documents**:

- [ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)
- [Frappe Cloud Deployment Guide](../deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
- [1Password API Keys](~/claude-references/1password-api-keys.md)

## Routine Maintenance

### Daily Operations

#### 1. Monitor Automated Backups

**Schedule**: Check daily backup completion each morning

```bash
# Via Frappe Cloud Dashboard
# 1. Log in to https://frappecloud.com
# 2. Navigate to site: 10netzero.v.frappe.cloud
# 3. Click "Backups" tab
# 4. Verify backup completed within last 24 hours

# Via SSH (if needed)
ssh <bench-id>@ssh.frappe.cloud
cd ~/frappe-bench/sites/10netzero.v.frappe.cloud/private/backups
ls -lth | head -5  # Show 5 most recent backups
```

**Acceptance Criteria**:

- Backup timestamp within last 24 hours
- Database backup file present (`.sql.gz`)
- Public files tarball present
- Private files tarball present
- No error logs in Frappe Cloud backup status

**Escalation**: If backup missing > 48 hours, contact Frappe Cloud support

#### 2. Review Error Logs

**Frequency**: Daily, first thing in the morning

```bash
# Via SSH
ssh <bench-id>@ssh.frappe.cloud
tail -100 ~/frappe-bench/sites/10netzero.v.frappe.cloud/logs/error.log

# Check for patterns:
grep -i "error\|exception\|failed" ~/frappe-bench/sites/10netzero.v.frappe.cloud/logs/error.log | tail -20
```

**Via Frappe Cloud Dashboard**:

1. Navigate to site → **Logs**
2. Filter by severity: Error, Critical
3. Review recent entries

**Common Issues to Watch**:

- Authentication failures (potential security issue)
- Database connection errors
- Worker job failures
- Telegram webhook timeouts
- OpenAI API rate limits

**Action Items**:

- < 5 errors/day: Monitor
- 5-20 errors/day: Investigate patterns
- \> 20 errors/day: Immediate investigation required

#### 3. Verify Scheduler Status

**Frequency**: Daily

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud scheduler status

# Expected output: "Scheduler is enabled and running"
```

**If Scheduler Disabled**:

```bash
bench --site 10netzero.v.frappe.cloud scheduler enable
bench --site 10netzero.v.frappe.cloud scheduler resume
bench restart
```

#### 4. Check Background Job Queue

**Frequency**: Daily

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud console

>>> from rq import Queue
>>> from frappe.utils.background_jobs import get_redis_conn
>>> conn = get_redis_conn()
>>> for queue_name in ['default', 'short', 'long']:
...     q = Queue(queue_name, connection=conn)
...     print(f"{queue_name}: {q.count} jobs")

# Expected: 0-5 jobs per queue (normal operation)
# Alert: > 100 jobs in any queue (backlog)
```

**If Queue Backed Up**:

1. Check worker logs for failures
2. Restart workers: `bench restart`
3. If persists, check Redis connectivity

### Weekly Operations

#### 1. Resource Usage Review

**Frequency**: Monday morning

**Via Frappe Cloud Dashboard**:

1. Navigate to site → **Monitoring**
2. Review last 7 days:
   - CPU usage (target: < 70% average)
   - Memory usage (target: < 80% average)
   - Disk usage (target: < 70% capacity)
   - Response time (target: < 500ms p95)

**Action Items**:

- CPU > 70%: Investigate slow queries, optimize background jobs
- Memory > 80%: Check for memory leaks, review worker configuration
- Disk > 70%: Review file storage, clean up old backups if needed
- Response time > 500ms: Profile slow endpoints, optimize database queries

#### 2. Custom App Updates

**Frequency**: As needed, typically weekly for active development

```bash
# Pull latest changes from Git
cd ~/local/flrts_extensions
git pull origin main

# Deploy to Frappe Cloud
git push frappe-cloud main

# Verify deployment
ssh <bench-id>@ssh.frappe.cloud
bench --site 10netzero.v.frappe.cloud migrate
bench --site 10netzero.v.frappe.cloud console
>>> import frappe
>>> frappe.get_installed_apps()
# Verify flrts_extensions version updated
```

**Pre-Deployment Checklist**:

- [ ] All tests passing locally
- [ ] Code reviewed
- [ ] Breaking changes documented
- [ ] Database migrations tested on staging (if available)
- [ ] Rollback plan documented

#### 3. Security Updates

**Frequency**: Weekly

**Frappe/ERPNext Updates**:

- Monitor [Frappe Forum](https://discuss.frappe.io/) for security advisories
- Frappe Cloud auto-updates minor versions
- Major version upgrades require manual coordination

**Custom App Dependencies**:

```bash
# Check for vulnerable dependencies
cd ~/local/flrts_extensions
npm audit  # For Node.js dependencies
pip list --outdated  # For Python dependencies

# Update and test
pip install -r requirements.txt --upgrade
npm run test
git commit -m "Update dependencies for security patches"
git push frappe-cloud main
```

### Monthly Operations

#### 1. Backup Integrity Test

**Frequency**: First Monday of each month

**Procedure**:

1. Download most recent backup from Frappe Cloud dashboard
2. Extract and inspect database dump:

   ```bash
   gunzip < backup-database.sql.gz | head -100
   # Verify SQL structure looks correct
   ```

3. Check file counts:

   ```bash
   tar -tzf backup-private-files.tar.gz | wc -l
   tar -tzf backup-public-files.tar.gz | wc -l
   ```

4. Document backup size trends in monitoring spreadsheet

**Red Flags**:

- Backup size suddenly decreased > 20% (data loss?)
- Backup size increased > 100% (runaway file uploads?)
- Backup extraction fails (corruption)

#### 2. User Access Audit

**Frequency**: Monthly

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud console

>>> users = frappe.get_all("User", filters={"enabled": 1}, fields=["name", "email", "last_login", "user_type"])
>>> import json
>>> print(json.dumps(users, indent=2))
```

**Review Checklist**:

- [ ] All active users have logged in within last 30 days
- [ ] No unknown user accounts
- [ ] System users (API keys) have appropriate permissions
- [ ] Disabled users with API keys: revoke keys

#### 3. Performance Baseline

**Frequency**: Monthly

**Metrics to Capture**:

- Average response time (p50, p95, p99)
- Largest DocType record counts
- Database size
- File storage size
- Background job processing time

**Benchmark Script** (via SSH):

```bash
bench --site 10netzero.v.frappe.cloud console

>>> import frappe
>>> from datetime import datetime
>>>
>>> # DocType counts
>>> for dt in ["Field Report", "Task", "Project", "User"]:
...     count = frappe.db.count(dt)
...     print(f"{dt}: {count}")
>>>
>>> # Database size (approximate)
>>> print(f"Database size: {frappe.db.sql('SELECT pg_size_pretty(pg_database_size(current_database()))', as_dict=True)}")
```

**Store Metrics**: Track in monitoring spreadsheet for trend analysis

## Monitoring & Alerting

### Built-in Frappe Cloud Monitoring

**Access**: Site Dashboard → Monitoring tab

**Key Metrics**:

- **Uptime**: Target 99.5%+
- **Response Time**: Target < 500ms p95
- **Error Rate**: Target < 0.1% of requests
- **Worker Queue Length**: Target < 10 jobs

**Alert Configuration** (via Frappe Cloud Dashboard):

1. Navigate to site → **Settings** → **Alerts**
2. Configure email alerts for:
   - Site downtime > 5 minutes
   - Error rate > 1% for > 10 minutes
   - Worker queue > 100 jobs for > 30 minutes
   - Disk usage > 80%

### Custom Monitoring (Optional)

**External Uptime Monitoring** (recommended):

- Service: UptimeRobot, Pingdom, or similar
- Check frequency: Every 5 minutes
- Endpoint: `https://ops.10nz.tools/api/method/ping`
- Alert: Email/SMS on downtime > 5 minutes

**Application-Level Monitoring**:

```python
# Add to flrts_extensions custom app
# File: flrts_extensions/monitoring/health_check.py

import frappe

@frappe.whitelist(allow_guest=True)
def health_check():
    """
    Health check endpoint for external monitoring.
    Returns 200 OK if all systems operational.
    """
    checks = {
        "database": check_database(),
        "redis": check_redis(),
        "scheduler": check_scheduler(),
        "workers": check_workers()
    }

    all_healthy = all(checks.values())
    frappe.response["message"] = {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks
    }
    frappe.response.http_status_code = 200 if all_healthy else 503
```

### Log Aggregation (Optional)

**For High-Volume Production**:

- Consider external log aggregation (Papertrail, Loggly, etc.)
- Forward logs via syslog or HTTP
- Set up alerts for error patterns

## Backup & Recovery

### Automated Backup Schedule

**Frappe Cloud Private Bench Backup Policy**:

- **Frequency**: Every 24 hours (round-robin schedule, no fixed time)
- **Components**:
  - Database (MariaDB dump, gzipped)
  - Public files (uploaded images, documents)
  - Private files (user-uploaded sensitive files)
- **Retention**:
  - 7 daily backups
  - 4 weekly backups
  - 12 monthly backups
  - 10 yearly backups

**Backup Verification**:

- Automated: Frappe Cloud verifies backup integrity
- Manual: Monthly backup download and inspection (see Monthly Operations)

### Manual Backup Procedures

**On-Demand Backup** (before major changes):

```bash
# Via SSH
ssh <bench-id>@ssh.frappe.cloud
bench --site 10netzero.v.frappe.cloud backup --with-files

# Backup files created in:
# ~/frappe-bench/sites/10netzero.v.frappe.cloud/private/backups/

# List backups
ls -lh ~/frappe-bench/sites/10netzero.v.frappe.cloud/private/backups/
```

**Via Frappe Cloud Dashboard**:

1. Navigate to site → **Backups**
2. Click **Create Backup**
3. Wait for completion (typically 1-5 minutes)
4. Download backup files if needed for local retention

### Restore Procedures

**⚠️ WARNING**: Restoration is **destructive** - replaces all current site data.

**Pre-Restore Checklist**:

- [ ] Verify backup integrity (download and inspect)
- [ ] Document current site state (in case rollback needed)
- [ ] Create fresh backup of current state
- [ ] Notify team of restoration window
- [ ] Schedule during low-traffic period

**Restore from Backup** (via Frappe Cloud Dashboard):

1. Navigate to site → **Backups**
2. Select backup to restore
3. Click **Restore**
4. Confirm restoration (acknowledge data loss warning)
5. Wait for completion (typically 5-15 minutes)
6. Verify restoration:

   ```bash
   ssh <bench-id>@ssh.frappe.cloud
   bench --site 10netzero.v.frappe.cloud console
   >>> frappe.db.count("User")  # Check critical data
   >>> frappe.db.get_value("Website Settings", None, "domain")
   ```

**Post-Restore Verification**:

- [ ] Site loads in browser
- [ ] Login with Administrator account
- [ ] Critical data present (users, projects, reports)
- [ ] Integrations functional (Telegram, n8n)
- [ ] Scheduled jobs running

### Disaster Recovery

**Recovery Time Objective (RTO)**: 4 hours **Recovery Point Objective (RPO)**:
24 hours

**Disaster Scenarios**:

1. **Site Corrupted/Deleted**:
   - Restore from most recent backup (see procedures above)
   - Estimated time: 30 minutes

2. **Frappe Cloud Platform Issue**:
   - Contact Frappe Cloud support immediately
   - Monitor status page: <https://status.frappecloud.com>
   - Escalate to Frappe Cloud emergency contact if > 2 hours downtime

3. **Data Breach/Security Incident**:
   - Follow Security Incident Response procedures (see below)
   - Restore from pre-breach backup
   - Rotate all credentials

4. **Custom App Bug Causing Data Corruption**:
   - Rollback app deployment: `git revert` + push
   - Restore from backup before bug was deployed
   - Fix bug in local environment with tests
   - Redeploy corrected version

## Incident Response

### Severity Levels

**P0 - Critical** (Response: Immediate)

- Site completely down (no user access)
- Data breach or security incident
- Data loss/corruption
- **SLA**: Acknowledge within 15 minutes, restore service within 4 hours

**P1 - High** (Response: Within 1 hour)

- Critical feature broken (Telegram bot down, API unavailable)
- Performance degradation > 80% (response times > 5 seconds)
- Scheduled jobs failing consistently
- **SLA**: Acknowledge within 1 hour, resolve within 8 hours

**P2 - Medium** (Response: Within 4 hours)

- Non-critical feature broken
- Intermittent errors (< 1% of requests)
- Performance degradation 20-80%
- **SLA**: Acknowledge within 4 hours, resolve within 2 business days

**P3 - Low** (Response: Next business day)

- Minor bugs, cosmetic issues
- Enhancement requests
- Documentation errors
- **SLA**: Acknowledge within 1 business day, resolve within 1 week

### Incident Response Workflow

#### 1. Detection & Triage (0-15 minutes)

**Detection Sources**:

- Automated monitoring alerts
- User reports (Telegram, email)
- Error log review
- External uptime monitoring

**Initial Triage**:

1. Confirm incident is real (not false positive)
2. Assign severity level (P0-P3)
3. Create incident record (Linear issue)
4. Notify team via Telegram/email

**Incident Record Template** (Linear):

```
Title: [P0/P1/P2/P3] Brief description (YYYY-MM-DD)
Description:
- Detected: [timestamp]
- Severity: [P0/P1/P2/P3]
- Impact: [description of user impact]
- Detection source: [monitoring alert / user report / etc]
- Initial observations: [what's broken, error messages]
```

#### 2. Investigation (15 minutes - 1 hour)

**Diagnostic Steps**:

1. **Check Site Status**:

   ```bash
   curl -I https://ops.10nz.tools
   # Expected: HTTP 200 OK
   ```

2. **Review Error Logs**:

   ```bash
   ssh <bench-id>@ssh.frappe.cloud
   tail -100 ~/frappe-bench/sites/10netzero.v.frappe.cloud/logs/error.log
   tail -100 ~/frappe-bench/sites/10netzero.v.frappe.cloud/logs/web.log
   ```

3. **Check Background Workers**:

   ```bash
   bench --site 10netzero.v.frappe.cloud doctor
   # Look for: worker failures, queue backlogs
   ```

4. **Test Database Connectivity**:

   ```bash
   bench --site 10netzero.v.frappe.cloud console
   >>> frappe.db.get_list("User", limit=1)
   ```

5. **Check Frappe Cloud Status**:
   - Visit: <https://status.frappecloud.com>
   - Look for platform-wide issues

6. **Review Recent Changes**:

   ```bash
   git log --oneline --since="24 hours ago"
   # Identify recent deployments that may have caused issue
   ```

**Document Findings**:

- Update Linear incident issue with investigation notes
- Include relevant log excerpts
- Note any correlation with recent changes

#### 3. Mitigation & Resolution (1-4 hours)

**Common Mitigation Actions**:

**Site Down**:

1. Check Frappe Cloud dashboard for site status
2. Restart services: `bench restart`
3. If persists, contact Frappe Cloud support
4. If custom app issue, rollback deployment

**Performance Degradation**:

1. Check resource usage (CPU, memory, disk)
2. Identify slow queries: Review database logs
3. Restart workers: `bench restart`
4. Scale resources if needed (contact Frappe Cloud)

**Custom App Bug**:

1. Identify problematic code change
2. Rollback app: `git revert <commit>` + `git push frappe-cloud main`
3. Verify rollback successful
4. Fix bug in local environment with tests
5. Redeploy fixed version

**Integration Failure** (Telegram, n8n, OpenAI):

1. Check integration logs
2. Verify API credentials valid
3. Test API connectivity from bench
4. Restart services: `bench restart`
5. If external service issue, notify users and monitor for resolution

**Database Issue**:

1. Check database connectivity
2. Review query logs for deadlocks/slow queries
3. Restart services: `bench restart`
4. If corruption suspected, restore from backup
5. Contact Frappe Cloud support if database unresponsive

#### 4. Post-Incident Review (Within 24 hours)

**Post-Mortem Template** (add to Linear incident issue):

```
## Post-Incident Review: [Incident Title]

### Timeline
- [HH:MM] Incident detected
- [HH:MM] Investigation began
- [HH:MM] Root cause identified
- [HH:MM] Mitigation applied
- [HH:MM] Service restored
- [HH:MM] Incident closed

### Root Cause
[Detailed description of what caused the incident]

### Impact
- Duration: X hours
- Users affected: [number or percentage]
- Features impacted: [list]
- Data loss: [yes/no, details if yes]

### Resolution
[Description of how the incident was resolved]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Monitoring improvement]
- [ ] [Documentation update]
- [ ] [Code fix / process change]

### Lessons Learned
- What went well:
- What could be improved:
- Preventive measures:
```

### Escalation Paths

**Internal Escalation**:

1. First responder (on-call engineer)
2. Technical lead
3. Project manager
4. Executive team (for P0 incidents only)

**External Escalation**:

**Frappe Cloud Support**:

- Support portal: <https://frappecloud.com/support>
- Email: <support@frappe.io>
- Response time: 24-48 hours (standard), 1-4 hours (critical)

**Emergency Contact** (P0 incidents only):

- Contact via Frappe Cloud dashboard "Emergency Support" button
- Provide: Site URL, description, impact, steps taken

**Third-Party Service Issues**:

- **Telegram**: Monitor <https://telegram.org/status>
- **OpenAI**: Monitor <https://status.openai.com>
- **Cloudflare**: Monitor <https://www.cloudflarestatus.com>

## Scaling & Performance Optimization

### When to Scale

**Indicators for Scaling**:

- CPU usage sustained > 70% for > 7 days
- Memory usage sustained > 80% for > 7 days
- Response time p95 > 1 second consistently
- Background job queue regularly > 50 jobs
- User reports of slowness

### Scaling Options

**Vertical Scaling** (upgrade plan):

1. Navigate to Frappe Cloud dashboard → site → **Plan**
2. Select higher-tier plan (more CPU/memory)
3. Confirm upgrade (prorated billing)
4. Monitor performance after upgrade

**Horizontal Scaling** (multiple sites):

- For very large deployments, consider splitting workload:
  - Production site: `ops.10nz.tools`
  - Development site: `ops-dev.10nz.tools`
  - Staging site: `ops-staging.10nz.tools`

### Performance Optimization

**Database Optimization**:

```bash
# Identify slow queries
bench --site 10netzero.v.frappe.cloud console

>>> frappe.db.sql("SELECT * FROM `tabError Log` WHERE error LIKE '%timeout%' ORDER BY creation DESC LIMIT 10")

# Add database indexes for frequently queried fields
# (Custom DocTypes only - ERPNext core tables already optimized)
```

**Background Job Optimization**:

- Review scheduled job frequency (reduce if not needed hourly)
- Use `enqueue_after_commit()` for database-dependent jobs
- Batch process records instead of per-record jobs

**File Storage Optimization**:

- Enable file compression in site settings
- Implement file retention policy (auto-delete old files)
- Consider Cloudflare R2 integration for large file storage

**Caching**:

- Enable Redis caching for frequently accessed data
- Use ERPNext's built-in caching decorators
- Cache external API responses (OpenAI, etc.)

## Security Operations

### Security Monitoring

**Daily Security Checks**:

1. Review authentication failures in logs
2. Check for unusual user activity (mass data exports)
3. Verify no unauthorized user accounts created

**Weekly Security Audit**:

```bash
# Check active sessions
bench --site 10netzero.v.frappe.cloud console

>>> frappe.get_all("Sessions", filters={"user": ["!=", "Guest"]}, fields=["user", "lastupdate", "device"])

# Check user permissions
>>> users_with_system_manager = frappe.get_all("Has Role", filters={"role": "System Manager"}, fields=["parent"])
>>> print(users_with_system_manager)
# Verify all users should have System Manager role
```

**Monthly Security Review**:

- Review API key usage logs
- Audit user role assignments
- Check for pending security updates (Frappe/ERPNext)
- Review site_config.json for exposed secrets

### Credential Rotation

**Schedule**:

- **API Keys**: Rotate every 90 days
- **Admin Password**: Rotate every 180 days
- **SSH Keys**: Rotate every 365 days

**API Key Rotation Procedure**:

```bash
# 1. Generate new API key via ERPNext UI (User doctype)
# 2. Store new key in 1Password
# 3. Update integrations to use new key:
#    - Telegram webhook
#    - n8n workflows
#    - External monitoring
# 4. Test integrations
# 5. Revoke old API key
```

**Admin Password Rotation**:

```bash
bench --site 10netzero.v.frappe.cloud console

>>> frappe.set_user("Administrator")
>>> from frappe.utils.password import update_password
>>> update_password("Administrator", "new_strong_password_here")
>>> frappe.db.commit()

# Store new password in 1Password immediately
```

### Security Incident Response

**Suspected Breach Actions** (execute immediately):

1. **Isolate**: Disable site access temporarily (contact Frappe Cloud support)
2. **Assess**: Review logs for unauthorized access
3. **Contain**: Revoke all API keys and user sessions
4. **Eradicate**: Change all passwords
5. **Recover**: Restore from pre-breach backup if needed
6. **Document**: Create detailed incident report

**Post-Breach Checklist**:

- [ ] All passwords rotated
- [ ] All API keys regenerated
- [ ] User access audit completed
- [ ] Security patches applied
- [ ] Monitoring enhanced to detect similar attacks
- [ ] Legal/compliance teams notified (if applicable)

## Troubleshooting Common Issues

### Issue: Site Slow or Unresponsive

**Symptoms**: High response times, timeouts

**Diagnosis**:

```bash
# Check resource usage
ssh <bench-id>@ssh.frappe.cloud
top  # Look for high CPU/memory processes

# Check database performance
bench --site 10netzero.v.frappe.cloud console
>>> from frappe.utils.response import build_response
>>> frappe.db.sql("SHOW PROCESSLIST", as_dict=True)
# Look for long-running queries

# Check worker queue
>>> from rq import Queue
>>> from frappe.utils.background_jobs import get_redis_conn
>>> Queue('default', connection=get_redis_conn()).count
```

**Resolution**:

1. Restart services: `bench restart`
2. Kill long-running queries if needed
3. Optimize slow queries (add indexes)
4. Scale resources if consistently slow

### Issue: Background Jobs Failing

**Symptoms**: Jobs stuck in queue, error logs showing job failures

**Diagnosis**:

```bash
# Check worker logs
tail -100 ~/frappe-bench/sites/10netzero.v.frappe.cloud/logs/worker.log

# Check specific job errors
bench --site 10netzero.v.frappe.cloud console
>>> from rq import Queue
>>> from rq.job import Job
>>> from frappe.utils.background_jobs import get_redis_conn
>>> conn = get_redis_conn()
>>> failed_jobs = Queue('failed', connection=conn)
>>> for job_id in failed_jobs.job_ids[:5]:
...     job = Job.fetch(job_id, connection=conn)
...     print(f"Job: {job.func_name}, Error: {job.exc_info}")
```

**Resolution**:

1. Fix underlying code issues causing failures
2. Restart workers: `bench restart`
3. Manually requeue failed jobs if needed
4. Clear failed queue: `bench clear-cache`

### Issue: Telegram Bot Not Responding

**Symptoms**: Users report bot not replying to messages

**Diagnosis**:

1. **Check Webhook Status**:

   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
   # Verify webhook URL correct
   # Check for pending_update_count > 0 (backlog)
   ```

2. **Test Webhook Endpoint**:

   ```bash
   curl -X POST https://ops.10nz.tools/api/method/flrts_extensions.telegram.webhook \
     -H "Content-Type: application/json" \
     -d '{"message":{"text":"test"}}'
   ```

3. **Check Logs**:

   ```bash
   ssh <bench-id>@ssh.frappe.cloud
   grep "telegram" ~/frappe-bench/sites/10netzero.v.frappe.cloud/logs/web.log | tail -20
   ```

**Resolution**:

1. Verify `telegram_bot_token` in site_config.json is correct
2. Re-set webhook URL:

   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://ops.10nz.tools/api/method/flrts_extensions.telegram.webhook"}'
   ```

3. Restart services: `bench restart`
4. Test with message to bot

### Issue: Custom Domain SSL Certificate Error

**Symptoms**: Browser shows SSL warning, "Certificate invalid"

**Diagnosis**:

1. Check certificate status:

   ```bash
   openssl s_client -connect ops.10nz.tools:443 -servername ops.10nz.tools
   # Look for certificate expiration, issuer
   ```

2. Check Frappe Cloud domain settings:
   - Navigate to site → **Domains**
   - Verify custom domain listed and "Active"
   - Check certificate renewal status

3. Verify DNS configuration:

   ```bash
   dig ops.10nz.tools
   # Ensure points to Frappe Cloud IP/hostname
   ```

**Resolution**:

1. Verify Cloudflare in "DNS Only" mode (gray cloud, not orange)
2. Wait for DNS propagation (up to 48 hours)
3. Contact Frappe Cloud support if certificate not provisioning

### Issue: SSH Certificate Expired

**Symptoms**: `Permission denied (publickey)` when connecting via SSH

**Resolution**:

1. Return to Frappe Cloud dashboard
2. Navigate to Bench Group → **SSH Certificates**
3. Click **Generate Certificate** (valid 6 hours)
4. Retry SSH connection immediately

**Prevention**: Generate certificate immediately before SSH session, expect
6-hour validity

## Change Management

### Change Request Process

**Types of Changes**:

- **Standard**: Routine updates (dependency patches, minor config changes)
- **Normal**: Feature additions, non-trivial code changes
- **Emergency**: Hotfixes for P0/P1 incidents

**Approval Requirements**:

- Standard: Auto-approved
- Normal: Technical lead approval
- Emergency: Post-implementation review

### Deployment Procedures

**Standard Deployment** (low-risk changes):

```bash
# 1. Test locally
cd ~/local/flrts_extensions
npm test

# 2. Deploy
git add .
git commit -m "Description of change"
git push frappe-cloud main

# 3. Verify
ssh <bench-id>@ssh.frappe.cloud
bench --site 10netzero.v.frappe.cloud migrate
# Test change in production
```

**High-Risk Deployment** (major features, breaking changes):

1. **Pre-Deployment**:
   - [ ] All tests passing
   - [ ] Code review completed
   - [ ] Database migrations tested
   - [ ] Rollback plan documented
   - [ ] Create manual backup
   - [ ] Schedule maintenance window

2. **Deployment**:
   - [ ] Announce maintenance window to users
   - [ ] Deploy changes
   - [ ] Run migrations
   - [ ] Smoke test critical features

3. **Post-Deployment**:
   - [ ] Monitor error logs for 1 hour
   - [ ] Verify integrations functional
   - [ ] Announce completion to users
   - [ ] Document any issues encountered

### Rollback Procedures

**App Rollback** (revert bad deployment):

```bash
# 1. Identify problematic commit
cd ~/local/flrts_extensions
git log --oneline

# 2. Revert commit
git revert <commit-hash>
git push frappe-cloud main

# 3. Verify rollback
ssh <bench-id>@ssh.frappe.cloud
bench --site 10netzero.v.frappe.cloud migrate
# Test that issue resolved
```

**Database Rollback** (restore from backup):

- Follow Backup & Recovery procedures (see above)
- Only use for critical data corruption issues

## Documentation Maintenance

### Keeping This Playbook Current

**Review Schedule**:

- **Quarterly**: Review entire playbook for accuracy
- **After Incidents**: Update troubleshooting section with new issues
- **After Process Changes**: Update relevant sections immediately

**Update Triggers**:

- Frappe Cloud platform changes (new features, UI updates)
- ERPNext version upgrades
- Custom app major changes
- New integrations added
- Incident post-mortems identify documentation gaps

**Documentation Standards**:

- All procedures tested before documenting
- Include actual command examples
- Reference
  [ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)
  for any new artifacts
- Link to related documentation
- Keep version history in git

## Related Documentation

- [Frappe Cloud Deployment Guide](../deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
- [Frappe Cloud Site Setup](../setup/frappe-cloud-site.md)
- [Frappe Cloud Environment Architecture](../architecture/frappe-cloud-environment.md)
- [ADR-006: ERPNext Frappe Cloud Migration](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
- [ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)

## External References

- [Frappe Cloud Documentation](https://frappecloud.com/docs)
- [Frappe Cloud Status Page](https://status.frappecloud.com)
- [Frappe Forum](https://discuss.frappe.io/)
- [ERPNext Documentation](https://docs.erpnext.com)
- [Bench CLI Reference](https://frappeframework.com/docs/user/en/bench)
