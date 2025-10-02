# Frappe Cloud Site Setup Guide

**Status**: Active **Supersedes**: OpenProject deployment documentation (see
`docs/archive/openproject/`) **Related**:
[ADR-006 ERPNext Frappe Cloud Migration](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)

> **⚠️ PRIVATE BENCH REQUIRED**: This guide assumes a **Frappe Cloud Private
> Bench** plan ($25/mo minimum). Features documented here (SSH access, bench
> CLI, manual backups, custom apps) are **not available** on shared/free plans.
> Verify your plan tier before following these instructions.

## Overview

This guide covers access, authentication, and secrets management for the
BigSirFLRTS ERPNext site hosted on Frappe Cloud Private Bench.

**Current Site**: `10netzero.v.frappe.cloud` (Frappe Cloud managed site)
**Custom Domain**: `ops.10nz.tools` (planned/future - DNS configuration pending)

## Prerequisites

- Frappe Cloud account with **Private Bench access** ($25/mo minimum plan)
- SSH public key for certificate-based authentication
- Access to Frappe Cloud dashboard at <https://frappecloud.com>

## SSH Access to Private Bench

### Certificate-Based Authentication

Frappe Cloud uses **certificate-based SSH authentication** with 6-hour validity
periods.

**Setup Process**:

1. **Add SSH Public Key to Frappe Cloud Dashboard**:
   - Navigate to Settings → SSH Key in your Frappe Cloud dashboard
   - Add your SSH public key (typically `~/.ssh/id_rsa.pub` or
     `~/.ssh/id_ed25519.pub`)

2. **Generate SSH Certificate**:
   - From your Bench Group dashboard, generate a new SSH certificate
   - Certificate is valid for **6 hours only**
   - Must regenerate when expired

3. **Connect to Bench**:

   ```bash
   # Find your SSH connection string in Frappe Cloud dashboard:
   # Navigate to: Bench Group → SSH Access → Copy SSH Command
   #
   # Example format (your actual values will differ):
   # ssh <bench-id>@ssh.frappe.cloud
   #
   # To find your specific SSH credentials:
   # 1. Log in to https://frappecloud.com
   # 2. Select your bench group
   # 3. Click "SSH Access" tab
   # 4. Copy the provided SSH command
   ```

**Important Notes**:

- Certificates expire after 6 hours - plan administrative sessions accordingly
- Re-generate certificate from dashboard when expired
- Keep SSH private key secure and never commit to version control

### Common Bench Commands

Once connected via SSH, use the Frappe Bench CLI:

```bash
# List all sites on this bench
bench --site all list

# Access site console (replace with your actual site name)
bench --site 10netzero.v.frappe.cloud console

# View logs
bench --site 10netzero.v.frappe.cloud logs

# Run migrations
bench --site 10netzero.v.frappe.cloud migrate

# Restart services
bench restart

# Note: Replace "10netzero.v.frappe.cloud" with your actual site name.
# Find your site name by running: bench --site all list
```

## Site Configuration (`site_config.json`)

### Overview

Site-specific configuration is stored in `site_config.json` within the site's
directory. This file contains:

- Database credentials (`db_name`, `db_password`)
- Admin password (`admin_password`)
- API keys and secrets
- Site-specific settings (encryption keys, etc.)

**Location**: `<bench-root>/sites/10netzero.v.frappe.cloud/site_config.json`

**Hierarchy**: Site-level config in `site_config.json` overrides bench-level
config in `common_site_config.json`.

### Viewing Configuration

```bash
# View site config
bench --site 10netzero.v.frappe.cloud console
>>> frappe.conf
# or
cat sites/10netzero.v.frappe.cloud/site_config.json
```

### Modifying Configuration

**Add/Update Config Values**:

```bash
bench --site 10netzero.v.frappe.cloud set-config <key> <value>

# Examples:
bench --site 10netzero.v.frappe.cloud set-config telegram_bot_token "YOUR_TOKEN_HERE"
bench --site 10netzero.v.frappe.cloud set-config openai_api_key "sk-..."
```

**Remove Config Values**:

```bash
bench --site 10netzero.v.frappe.cloud remove-config <key>
```

### Secrets Management

**CRITICAL**: Never commit `site_config.json` to version control.

**Recommended Practices**:

1. **Use 1Password for Secret Storage**:
   - Store sensitive credentials in 1Password vaults
   - Reference: `~/claude-references/1password-api-keys.md`
   - Use 1Password CLI (`op`) for automated retrieval if needed

2. **Site Config Secrets** (stored in `site_config.json` on Frappe Cloud):
   - Database credentials (managed by Frappe Cloud)
   - Admin password
   - API keys (Telegram, OpenAI, etc.)
   - Encryption keys

3. **Environment-Specific Values**:
   - Development: Use test/sandbox API keys
   - Production: Use production API keys with appropriate access scopes

## API Key Management

### User API Keys (Token-Based)

ERPNext supports user-level API key/secret pairs for REST API authentication.

**Generate API Key via UI**:

1. Navigate to **User** doctype
2. Select the user account
3. Click **Generate Keys** or **Regenerate API Secret**
4. Copy the generated API Key and API Secret
5. Store in 1Password immediately

**API Authentication**:

```bash
curl -X GET https://10netzero.v.frappe.cloud/api/resource/Project \
  -H "Authorization: token <api_key>:<api_secret>"
```

### External Service API Keys

Store third-party API keys in `site_config.json`:

```bash
# Telegram Bot Token
bench --site 10netzero.v.frappe.cloud set-config telegram_bot_token "YOUR_BOT_TOKEN"

# OpenAI API Key
bench --site 10netzero.v.frappe.cloud set-config openai_api_key "sk-..."

# n8n Webhook URL (if needed)
bench --site 10netzero.v.frappe.cloud set-config n8n_webhook_url "https://..."
```

Access in custom apps:

```python
import frappe
telegram_token = frappe.conf.get("telegram_bot_token")
openai_key = frappe.conf.get("openai_api_key")
```

## OAuth2 / OIDC Authentication

ERPNext supports OAuth2 and OpenID Connect (OIDC) via the **Social Login**
feature.

**Setup Process**:

1. **Enable Social Login App** (if not already enabled):

   ```bash
   bench --site 10netzero.v.frappe.cloud install-app social_login
   ```

2. **Configure OAuth Provider**:
   - Navigate to **Social Login Key** doctype in ERPNext UI
   - Create new Social Login Key
   - Configure provider (Google, GitHub, custom OIDC, etc.)
   - Enter Client ID, Client Secret, and authorization/token URLs

3. **Use Cases**:
   - Single Sign-On (SSO) for team members
   - Third-party integrations requiring OAuth
   - Mobile app authentication

**Reference**:
[Frappe Social Login Documentation](https://frappeframework.com/docs/user/en/guides/integration/social-login)

## Custom Domain Configuration

**Current Site URL**: `10netzero.v.frappe.cloud` (Frappe Cloud default)
**Planned Custom Domain**: `ops.10nz.tools` (requires DNS configuration)

### DNS Configuration (When Setting Up Custom Domain)

**Cloudflare DNS Settings**:

1. **Set to "DNS Only" mode** (gray cloud, not orange):
   - Frappe Cloud handles TLS termination
   - Cloudflare Tunnel is **NOT** used in new architecture

2. **Required DNS Records**:

   ```
   # Find exact DNS record requirements in Frappe Cloud dashboard:
   # 1. Navigate to your site in Frappe Cloud
   # 2. Click "Custom Domain" or "Domain Settings"
   # 3. Follow the provided DNS configuration instructions
   #
   # Typical format (verify with dashboard):
   # A    ops.10nz.tools    <frappe-cloud-ip-from-dashboard>
   # or
   # CNAME ops.10nz.tools   <provided-hostname>.frappe.cloud
   ```

3. **Verification**:
   - Frappe Cloud will verify DNS ownership during custom domain setup
   - Follow exact instructions in Frappe Cloud dashboard under Custom Domain
     settings
   - DNS propagation can take up to 48 hours (usually faster)

### SSL/TLS Certificates

**Managed by Frappe Cloud**:

- Automatic SSL certificate provisioning for custom domains
- Let's Encrypt certificates (industry standard)
- Auto-renewal handled by platform
- No manual certificate management required

## Backup and Recovery

### Automated Backups

**Available on $25+ plans**:

- **Frequency**: Every 24 hours (round-robin scheduling, no fixed time)
- **Components**:
  - Database backup (MariaDB dump)
  - Public files
  - Private files
- **Compression**: gzip

**Offsite Backup Retention Policy**:

- **7 daily** backups
- **4 weekly** backups
- **12 monthly** backups
- **10 yearly** backups

### On-Demand Backups

Create manual backups before major changes:

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud backup

# Via Frappe Cloud Dashboard
# Navigate to site → Backups → Create Backup
```

### Restore from Backup

**Via Frappe Cloud Dashboard**:

1. Navigate to site → Backups
2. Select backup to restore
3. Confirm restoration (destructive operation - replaces current site data)

**Via SSH** (if needed):

```bash
bench --site 10netzero.v.frappe.cloud restore <backup-file>
```

## Background Jobs and Workers

**Managed by Frappe Cloud**:

- **Redis Queue**: Job queue for async tasks
- **Worker Processes**: Automatically managed and scaled
- **Scheduler**: Cron-like task scheduling

**Monitor Background Jobs**:

```bash
# View job queue status
bench --site 10netzero.v.frappe.cloud doctor

# View scheduler status
bench --site 10netzero.v.frappe.cloud scheduler status
```

**Custom Background Jobs**:

Define in your custom app's `hooks.py`:

```python
scheduler_events = {
    "hourly": [
        "flrts_extensions.tasks.process_pending_reports"
    ],
    "daily": [
        "flrts_extensions.tasks.cleanup_old_data"
    ]
}
```

## Troubleshooting

### SSH Certificate Expired

**Symptom**: SSH connection refused after 6 hours

**Solution**:

1. Return to Frappe Cloud dashboard
2. Navigate to Bench Group → SSH Certificates
3. Generate new certificate
4. Retry SSH connection

### API Authentication Failing

**Symptom**: 401 Unauthorized errors

**Checklist**:

1. Verify API key/secret pair is correct (regenerate if unsure)
2. Check user has appropriate permissions for resource
3. Ensure API key is enabled (not disabled in User doctype)
4. Verify Authorization header format: `token <key>:<secret>`

### Custom Domain Not Resolving

**Symptom**: DNS or certificate errors

**Checklist**:

1. Verify DNS records point to Frappe Cloud IP/hostname
2. Ensure Cloudflare is in "DNS Only" mode (gray cloud)
3. Check Frappe Cloud dashboard for custom domain verification status
4. Wait for DNS propagation (up to 48 hours, usually faster)

### Site Config Changes Not Applying

**Symptom**: Configuration changes not reflected in app behavior

**Solution**:

```bash
# Restart bench services after config changes
bench restart
```

## Security Best Practices

1. **SSH Keys**:
   - Use Ed25519 or RSA 4096-bit keys
   - Never share private keys
   - Rotate keys periodically

2. **API Secrets**:
   - Store in 1Password, never in code or git
   - Use environment-specific keys (dev vs prod)
   - Rotate secrets if compromised

3. **User Permissions**:
   - Follow principle of least privilege
   - Regularly audit user roles and permissions
   - Disable unused API keys

4. **site_config.json**:
   - Treated as sensitive file by Frappe Cloud (not web-accessible)
   - Do not copy to unsecured locations
   - Do not share in support tickets (redact secrets first)

## Related Documentation

- [Frappe Cloud Environment Architecture](../architecture/frappe-cloud-environment.md)
- [ADR-006: ERPNext Frappe Cloud Migration](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)
- [FRAPPE_CLOUD_DEPLOYMENT.md](../deployment/FRAPPE_CLOUD_DEPLOYMENT.md) (TODO:
  pending creation)
- [Frappe Cloud Operations Playbook](../infrastructure/frappe-cloud-operations.md)
  (TODO: pending creation)

## External References

- [Frappe Cloud Documentation](https://frappecloud.com/docs)
- [Frappe Framework Documentation](https://frappeframework.com/docs)
- [ERPNext Documentation](https://docs.erpnext.com)
- [Bench CLI Reference](https://frappeframework.com/docs/user/en/bench)
