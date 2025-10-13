# Frappe Cloud Deployment Guide

> **⚠️ MIGRATION STATUS**: This deployment guide describes the **target
> infrastructure** for ERPNext on Frappe Cloud. **Application migration: Phase 1
> complete** (config layer, stub client), **Phase 2 pending** (live API
> integration). Infrastructure is provisioned but **OpenProject remains the
> default backend**. See
> [ADR-006](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md) for
> migration roadmap.

**Status**: Active **Related**:
[ADR-006 ERPNext Frappe Cloud Migration](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
| [Frappe Cloud Site Setup](../setup/frappe-cloud-site.md) |
[Frappe Cloud Environment Architecture](../architecture/frappe-cloud-environment.md)

> **⚠️ PRIVATE BENCH REQUIRED**: This guide requires a **Frappe Cloud Private
> Bench** plan ($25/mo minimum) for custom app deployment and SSH access.

## Overview

This document provides step-by-step instructions for deploying BigSirFLRTS
ERPNext environment on Frappe Cloud, from initial provisioning through
production deployment.

**Target Environment**: Frappe Cloud Private Bench **Custom App**:
`flrts_extensions` (Telegram bot, OpenAI integration, FSM customizations)
**Current Site**: `10netzero.v.frappe.cloud` **Planned Custom Domain**:
`ops.10nz.tools`

## Prerequisites

Before starting deployment:

- [ ] Active Frappe Cloud account (sign up at <https://frappecloud.com>)
- [ ] Private Bench plan subscription ($25/mo minimum)
- [ ] SSH public key for certificate-based authentication
- [ ] Git repository for `flrts_extensions` custom app
- [ ] Domain DNS access (Cloudflare for `ops.10nz.tools`)
- [ ] Backup of existing ERPNext site (if migrating data)

**Reference Documents**:

- [ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)
- [Frappe Cloud Site Setup Guide](../setup/frappe-cloud-site.md)
- [1Password API Keys Reference](~/claude-references/1password-api-keys.md)

## Phase 1: Initial Provisioning

### 1.1 Create Bench Group

**Bench Group**: Deployment template shared across multiple benches.

1. Log in to Frappe Cloud dashboard: <https://frappecloud.com>
2. Navigate to **Bench Groups** → **Create Bench Group**
3. Configure settings:
   - **Name**: `10netzero-production` (or per naming standards)
   - **Region**: Select closest to users (e.g., `us-east-1`, `eu-west-1`)
   - **Plan**: Private Bench ($25/mo minimum)
   - **Version**: Latest stable ERPNext (v15+)

4. Click **Create Bench Group**

**Naming Convention**: Follow
[ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)
for bench group names.

### 1.2 Create Site

1. From Bench Group dashboard, click **Create Site**
2. Configure site:
   - **Subdomain**: `10netzero` (becomes `10netzero.v.frappe.cloud`)
   - **Apps**: Select **ERPNext** (Frappe framework included automatically)
   - **Admin Password**: Generate strong password, store in 1Password
   - **Site Name**: `10netzero.v.frappe.cloud`

3. Click **Create Site**
4. Wait for provisioning (typically 5-10 minutes)

**Output**: Site accessible at `https://10netzero.v.frappe.cloud`

### 1.3 Initial Site Verification

Once provisioning completes:

```bash
# Test site accessibility
curl -I https://10netzero.v.frappe.cloud

# Expected: HTTP 200 OK
```

**Via Browser**:

1. Navigate to `https://10netzero.v.frappe.cloud`
2. Log in with Administrator account (password from step 1.2)
3. Verify ERPNext desk loads successfully

## Phase 2: SSH Access Setup

### 2.1 Add SSH Public Key

1. Generate SSH key pair if needed:

   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Or use existing key: ~/.ssh/id_ed25519.pub
   ```

2. Copy public key:

   ```bash
   cat ~/.ssh/id_ed25519.pub | pbcopy  # macOS
   # Or: cat ~/.ssh/id_ed25519.pub
   ```

3. Add to Frappe Cloud:
   - Navigate to **Settings** → **SSH Keys**
   - Click **Add SSH Key**
   - Paste public key
   - Save

### 2.2 Generate SSH Certificate

**Important**: Certificates expire after 6 hours.

1. Navigate to **Bench Group** dashboard
2. Click **SSH Access** tab
3. Click **Generate Certificate**
4. Certificate generated and valid for 6 hours

### 2.3 Connect to Bench

1. Copy SSH connection string from dashboard:

   ```bash
   # Example format (your values will differ):
   ssh <bench-id>@ssh.frappe.cloud
   ```

2. Test connection:

   ```bash
   ssh <bench-id>@ssh.frappe.cloud

   # Once connected, verify bench
   bench --version
   bench --site all list
   ```

**Expected Output**:

```
Sites in /home/frappe/frappe-bench/sites
10netzero.v.frappe.cloud
```

## Phase 3: Custom App Deployment

### 3.1 Prepare Custom App Repository

**Repository Structure**:

```
flrts_extensions/
├── flrts_extensions/
│   ├── __init__.py
│   ├── hooks.py           # App configuration
│   ├── config/
│   ├── public/
│   └── templates/
├── setup.py
├── requirements.txt       # Python dependencies
└── README.md
```

**Key File: `hooks.py`**:

```python
app_name = "flrts_extensions"
app_title = "FLRTS Extensions"
app_publisher = "10NetZero"
app_description = "Custom Field Service Management extensions"
app_version = "0.0.1"
app_license = "MIT"

# Required apps
required_apps = ["frappe", "erpnext"]

# Scheduler events
scheduler_events = {
    "hourly": [
        "flrts_extensions.tasks.sync_telegram_updates"
    ],
    "daily": [
        "flrts_extensions.tasks.cleanup_old_reports"
    ]
}

# Webhooks
webhooks = {
    "telegram": "flrts_extensions.telegram.webhook"
}
```

### 3.2 Deploy App to Frappe Cloud

**Method 1: Git-Based Deployment (Recommended)**

1. **Add Git Remote** (if not already done):

   ```bash
   cd flrts_extensions
   git remote add frappe-cloud https://frappecloud.com/api/git/<your-bench-id>.git
   ```

2. **Push to Deploy**:

   ```bash
   git add .
   git commit -m "Deploy flrts_extensions v0.0.1"
   git push frappe-cloud main
   ```

3. **Frappe Cloud Automatically**:
   - Pulls app code
   - Runs `bench get-app flrts_extensions`
   - Installs dependencies from `requirements.txt`
   - Runs migrations
   - Restarts services

**Method 2: Manual Installation via SSH**

1. **Connect via SSH**:

   ```bash
   ssh <bench-id>@ssh.frappe.cloud
   ```

2. **Get App from Git**:

   ```bash
   bench get-app flrts_extensions https://github.com/your-org/flrts_extensions.git
   ```

3. **Install App on Site**:

   ```bash
   bench --site 10netzero.v.frappe.cloud install-app flrts_extensions
   ```

4. **Run Migrations**:

   ```bash
   bench --site 10netzero.v.frappe.cloud migrate
   ```

5. **Restart Services**:

   ```bash
   bench restart
   ```

### 3.3 Verify Custom App Installation

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud console

>>> import frappe
>>> frappe.get_installed_apps()
['frappe', 'erpnext', 'flrts_extensions']

>>> # Test custom functionality
>>> from flrts_extensions.telegram import webhook
>>> webhook.__doc__
```

**Via ERPNext UI**:

1. Log in to site
2. Search for custom DocTypes (e.g., "Field Report", "Task")
3. Verify custom pages/workflows appear in navigation

## Phase 4: Configuration & Secrets

### 4.1 Configure Site Settings

```bash
# Connect via SSH
ssh <bench-id>@ssh.frappe.cloud

# Set site config values
bench --site 10netzero.v.frappe.cloud set-config telegram_bot_token "YOUR_TELEGRAM_BOT_TOKEN"
bench --site 10netzero.v.frappe.cloud set-config openai_api_key "sk-YOUR_OPENAI_KEY"
bench --site 10netzero.v.frappe.cloud set-config n8n_webhook_url "https://your-n8n-instance.com/webhook"

# Verify config
bench --site 10netzero.v.frappe.cloud console
>>> frappe.conf.get("telegram_bot_token")
'YOUR_TELEGRAM_BOT_TOKEN'
```

**Store Secrets in 1Password**:

- Never commit secrets to version control
- Use 1Password CLI (`op`) for secure retrieval if needed
- Reference: `~/claude-references/1password-api-keys.md`

### 4.2 Configure User API Keys

Generate API keys for external integrations:

1. **Via ERPNext UI**:
   - Navigate to **User** doctype
   - Select user account (or create integration user)
   - Click **Generate Keys** or **Regenerate API Secret**
   - Copy API Key and API Secret immediately
   - Store in 1Password

2. **Test API Authentication**:

   ```bash
   curl -X GET https://10netzero.v.frappe.cloud/api/resource/User \
     -H "Authorization: token <api_key>:<api_secret>"
   ```

## Phase 5: Data Migration (Optional)

### 5.1 Backup Existing Site

If migrating from self-hosted ERPNext:

```bash
# On old server/bench
bench --site old-site.example.com backup --with-files

# Backup files created in:
# sites/old-site.example.com/private/backups/
```

### 5.2 Restore to Frappe Cloud

**Option 1: Via Frappe Cloud Dashboard**

1. Navigate to site → **Backups** → **Upload Backup**
2. Upload database SQL file, private files, public files
3. Click **Restore from Upload**
4. Confirm restoration (destructive operation)

**Option 2: Via SSH**

```bash
# Transfer backup files to Frappe Cloud bench
scp backup-files.tar.gz <bench-id>@ssh.frappe.cloud:/tmp/

# Connect and restore
ssh <bench-id>@ssh.frappe.cloud
cd /home/frappe/frappe-bench
bench --site 10netzero.v.frappe.cloud restore /tmp/backup-database.sql --with-private-files /tmp/private-files.tar.gz --with-public-files /tmp/public-files.tar.gz
```

### 5.3 Verify Migration

```bash
# Check data integrity
bench --site 10netzero.v.frappe.cloud console

>>> frappe.db.count("User")
>>> frappe.db.count("Project")
>>> frappe.db.count("Task")  # Or custom DocType

# Run migrations for custom app
bench --site 10netzero.v.frappe.cloud migrate
```

## Phase 6: Custom Domain Configuration

### 6.1 Add Custom Domain in Frappe Cloud

1. Navigate to site dashboard → **Domains**
2. Click **Add Custom Domain**
3. Enter domain: `ops.10nz.tools`
4. Frappe Cloud provides DNS configuration instructions

**Expected DNS Records**:

```
# Values provided by Frappe Cloud dashboard
A    ops.10nz.tools    <ip-from-frappe-cloud>
# or
CNAME ops.10nz.tools   <hostname-from-frappe-cloud>.frappe.cloud
```

### 6.2 Configure Cloudflare DNS

1. Log in to Cloudflare dashboard
2. Select domain: `10nz.tools`
3. Add DNS record(s) from Frappe Cloud instructions
4. **Important**: Set to "DNS Only" mode (gray cloud icon, NOT orange)
   - Frappe Cloud handles SSL/TLS termination
   - Cloudflare proxying (orange cloud) will break custom domain

5. Save changes

**Verify DNS Propagation**:

```bash
dig ops.10nz.tools
nslookup ops.10nz.tools
```

### 6.3 Verify Custom Domain

1. Wait for DNS propagation (up to 48 hours, usually faster)
2. Frappe Cloud will provision SSL certificate (Let's Encrypt)
3. Test custom domain:

   ```bash
   curl -I https://ops.10nz.tools
   # Expected: HTTP 200 OK, valid SSL certificate
   ```

4. Update site URL in ERPNext (if needed):

   ```bash
   bench --site 10netzero.v.frappe.cloud console
   >>> frappe.db.set_value("Website Settings", None, "domain", "ops.10nz.tools")
   >>> frappe.db.commit()
   ```

## Phase 7: Integration Setup

### 7.1 Configure Telegram Webhook

**Webhook Endpoint**:

```
https://ops.10nz.tools/api/method/flrts_extensions.telegram.webhook
```

**Set Telegram Webhook**:

```bash
# Replace with your bot token
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ops.10nz.tools/api/method/flrts_extensions.telegram.webhook"}'
```

**Verify Webhook**:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### 7.2 Update External Integrations

**n8n Workflows** (if retained):

- Update n8n webhook URLs to point to `https://ops.10nz.tools`
- Update API authentication credentials
- Test workflows

**OpenAI Integration**:

- Already configured via `site_config.json` (Phase 4.1)
- No external URL updates needed (ERPNext calls OpenAI, not vice versa)

## Phase 8: Monitoring & Backups

### 8.1 Verify Automated Backups

**Backup Schedule** (Frappe Cloud Private Bench):

- Frequency: Every 24 hours (round-robin, no fixed time)
- Retention: 7 daily, 4 weekly, 12 monthly, 10 yearly
- Components: Database, public files, private files

**Check Backup Status**:

1. Navigate to site dashboard → **Backups**
2. Verify recent backups listed
3. Download a backup to test integrity

**Manual Backup**:

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud backup --with-files

# Via dashboard: Backups → Create Backup
```

### 8.2 Enable Monitoring

**Built-in Frappe Cloud Monitoring**:

- Navigate to site dashboard → **Monitoring**
- View metrics: uptime, response time, error rate
- Configure alerts (optional)

**Application Logs**:

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud logs

# Specific log files
tail -f sites/10netzero.v.frappe.cloud/logs/web.log
tail -f sites/10netzero.v.frappe.cloud/logs/worker.log
tail -f sites/10netzero.v.frappe.cloud/logs/error.log
```

**Health Check**:

```bash
bench --site 10netzero.v.frappe.cloud doctor
```

### 8.3 Configure Scheduler

**Verify Scheduler Status**:

```bash
bench --site 10netzero.v.frappe.cloud scheduler status
```

**Enable Scheduler** (if disabled):

```bash
bench --site 10netzero.v.frappe.cloud scheduler enable
bench --site 10netzero.v.frappe.cloud scheduler resume
```

**Monitor Scheduled Jobs**:

```bash
bench --site 10netzero.v.frappe.cloud console
>>> frappe.get_all("Scheduled Job Type", fields=["name", "frequency", "last_execution"])
```

## Phase 9: Production Verification

### 9.1 Smoke Tests

**Test Checklist**:

- [ ] Site accessible via custom domain (`ops.10nz.tools`)
- [ ] Login with Administrator account works
- [ ] ERPNext desk loads correctly
- [ ] Custom DocTypes visible (Field Report, Task, etc.)
- [ ] Telegram webhook receives messages
- [ ] Background jobs processing (check worker logs)
- [ ] Scheduler running (verify scheduled job execution)
- [ ] API authentication works (test with curl)

### 9.2 Performance Baseline

**Response Time**:

```bash
# Test site performance
curl -w "@curl-format.txt" -o /dev/null -s https://ops.10nz.tools

# curl-format.txt:
#   time_namelookup:  %{time_namelookup}\n
#   time_connect:  %{time_connect}\n
#   time_total:  %{time_total}\n
```

**Load Testing** (optional):

```bash
# Install ab (Apache Bench)
ab -n 100 -c 10 https://ops.10nz.tools/api/resource/User
```

### 9.3 Security Verification

**SSL/TLS**:

```bash
# Check SSL certificate
openssl s_client -connect ops.10nz.tools:443 -servername ops.10nz.tools
```

**Security Headers**:

```bash
curl -I https://ops.10nz.tools | grep -i "x-frame-options\|x-content-type-options\|strict-transport"
```

**API Permissions**:

- Verify API users have appropriate role permissions
- Test API endpoints with restricted user accounts
- Confirm unauthorized requests return 403/401

## Phase 10: Production Cutover

### 10.1 Pre-Cutover Checklist

- [ ] All smoke tests passing (Phase 9.1)
- [ ] Backups configured and verified
- [ ] Custom domain SSL certificate valid
- [ ] Integrations tested (Telegram, n8n, OpenAI)
- [ ] Team trained on new environment
- [ ] Rollback plan documented

### 10.2 Cutover Steps

1. **Announce Maintenance Window** (if needed)
2. **Final Backup of Old Environment**:

   ```bash
   bench --site old-site.example.com backup --with-files
   ```

3. **Update DNS** (if migrating):
   - Point production domain to Frappe Cloud
   - Wait for propagation

4. **Disable Old Environment**:
   - Stop old ERPNext containers/services
   - Keep old environment for 7 days (rollback safety)

5. **Verify Production Traffic**:
   - Monitor Frappe Cloud logs
   - Check Telegram bot responds
   - Verify user logins

### 10.3 Post-Cutover Monitoring

**First 24 Hours**:

- Monitor error logs every 2 hours
- Check background job queue for failures
- Verify scheduled jobs execute
- Monitor response times

**First Week**:

- Review backup completion
- Check disk/memory usage trends
- Gather user feedback
- Document any issues/workarounds

## Troubleshooting

### Issue: Custom App Not Installing

**Symptom**: `bench get-app` or push-to-deploy fails

**Diagnosis**:

```bash
# Check Frappe Cloud logs
# Via dashboard: Site → Logs → Deployment Logs

# Via SSH
tail -f ~/frappe-bench/logs/bench.log
```

**Common Causes**:

- Missing dependencies in `requirements.txt`
- Syntax errors in `hooks.py`
- Git authentication issues
- Incompatible app version with ERPNext

**Resolution**:

1. Fix errors in custom app code
2. Test locally: `bench get-app /path/to/local/flrts_extensions`
3. Re-push to Frappe Cloud

### Issue: SSH Certificate Expired

**Symptom**: `Permission denied (publickey)`

**Resolution**:

1. Return to Frappe Cloud dashboard
2. Bench Group → SSH Certificates
3. Generate new certificate (valid 6 hours)
4. Retry connection

### Issue: Site Config Changes Not Applying

**Symptom**: New config values not reflected in app behavior

**Resolution**:

```bash
# Restart bench services
bench restart

# Verify config loaded
bench --site 10netzero.v.frappe.cloud console
>>> frappe.conf
```

### Issue: Background Jobs Not Processing

**Symptom**: Jobs stuck in queue

**Diagnosis**:

```bash
# Check worker status
bench --site 10netzero.v.frappe.cloud doctor

# View queue
bench --site 10netzero.v.frappe.cloud console
>>> from rq import Queue
>>> from frappe.utils.background_jobs import get_redis_conn
>>> q = Queue('default', connection=get_redis_conn())
>>> q.count
```

**Resolution**:

```bash
# Restart workers
bench restart

# Or contact Frappe Cloud support if persists
```

### Issue: Custom Domain SSL Certificate Not Provisioning

**Symptom**: SSL error or untrusted certificate

**Diagnosis**:

1. Verify DNS records correct (Frappe Cloud dashboard instructions)
2. Check Cloudflare in "DNS Only" mode (gray cloud)
3. Wait for DNS propagation (up to 48 hours)

**Resolution**:

- Verify DNS: `dig ops.10nz.tools`
- Check Frappe Cloud domain verification status
- Contact Frappe Cloud support if > 48 hours

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Frappe Cloud

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Frappe Cloud
        env:
          FRAPPE_CLOUD_GIT_URL: ${{ secrets.FRAPPE_CLOUD_GIT_URL }}
        run: |
          git remote add frappe-cloud $FRAPPE_CLOUD_GIT_URL
          git push frappe-cloud main --force
```

### Pre-Commit Hooks

```bash
# Install pre-commit (if using)
pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: frappe-app-validate
        name: Validate Frappe App
        entry: python -m flrts_extensions.validate
        language: system
        pass_filenames: false
```

## Related Documentation

- [Frappe Cloud Site Setup Guide](../setup/frappe-cloud-site.md)
- [Frappe Cloud Environment Architecture](../architecture/frappe-cloud-environment.md)
- [ADR-006: ERPNext Frappe Cloud Migration](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
- [Frappe Cloud Operations Playbook](../infrastructure/frappe-cloud-operations.md)
  (TODO: pending creation per 10N-237)
- [ERPNext Migration Naming Standards](../erpnext/ERPNext-Migration-Naming-Standards.md)

## External References

- [Frappe Cloud Documentation](https://frappecloud.com/docs)
- [Frappe Cloud Private Bench Guide](https://frappecloud.com/docs/private-bench)
- [Frappe Framework Deployment](https://frappeframework.com/docs/user/en/production-setup)
- [ERPNext Custom App Development](https://docs.erpnext.com/docs/user/en/custom-app)
- [Bench CLI Reference](https://frappeframework.com/docs/user/en/bench)
