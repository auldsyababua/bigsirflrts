# Frappe Cloud Environment Architecture

> **⚠️ MIGRATION STATUS**: This document describes the **target infrastructure**
> for ERPNext on Frappe Cloud. **Application migration: Phase 1 complete**
> (config layer, stub client), **Phase 2 pending** (live API integration).
> Infrastructure is provisioned but **OpenProject remains the default backend**.
> See [ADR-006](./adr/ADR-006-erpnext-frappe-cloud-migration.md) for migration
> roadmap.

**Status**: Active **Supersedes**: OpenProject/Supabase/Cloudflare Tunnel
architecture (see `docs/archive/`) **Related**:
[ADR-006 ERPNext Frappe Cloud Migration](./adr/ADR-006-erpnext-frappe-cloud-migration.md)

> **⚠️ PRIVATE BENCH REQUIRED**: This document describes a **Frappe Cloud
> Private Bench** environment ($25/mo minimum plan). Features like SSH access,
> bench CLI, manual backups, and custom apps are **not available** on
> shared/free plans.

## Overview

BigSirFLRTS runs on **Frappe Cloud Private Bench**, a managed hosting platform
for ERPNext. This document describes the component architecture, managed
services, and how they interact.

**Current Site**: `10netzero.v.frappe.cloud` (Frappe Cloud managed) **Planned
Custom Domain**: `ops.10nz.tools` (future - pending DNS configuration)

## Architecture Diagram

```
Users → Cloudflare DNS (DNS-only mode, if custom domain configured)
      ↓
Frappe Cloud Ingress (SSL termination)
      ↓
      ┌────────────────────────────────────────────────┐
      │         Frappe Cloud Private Bench             │
      │  (Docker-based managed environment)            │
      │                                                 │
      │  ┌──────────────────────────────────────────┐  │
      │  │  ERPNext Site: 10netzero.v.frappe.cloud  │  │
      │  │  - nginx (web server)                    │  │
      │  │  - gunicorn (WSGI application server)    │  │
      │  │  - Custom app: flrts_extensions          │  │
      │  └──────────────────────────────────────────┘  │
      │                     ↕                           │
      │  ┌──────────────────────────────────────────┐  │
      │  │  Managed Services                        │  │
      │  │  - MariaDB (ERPNext database)            │  │
      │  │  - Redis (queue, cache, realtime)        │  │
      │  │  - Background Workers (job processing)   │  │
      │  │  - Scheduler (cron tasks)                │  │
      │  └──────────────────────────────────────────┘  │
      │                                                 │
      └─────────────────────────────────────────────────┘
                          ↕
      ┌─────────────────────────────────────────────────┐
      │  External Services (HTTPS APIs)                 │
      │  - Telegram Bot API                             │
      │  - OpenAI API                                   │
      │  - n8n (if retained)                            │
      └─────────────────────────────────────────────────┘
                          ↕
      ┌─────────────────────────────────────────────────┐
      │  Frappe Cloud Platform Services                 │
      │  - Automated Backups (daily, offsite)           │
      │  - Monitoring & Logs                            │
      │  - SSH Certificate Authority (6-hour certs)     │
      └─────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Ingress & DNS

#### Cloudflare DNS (DNS-only mode)

- **Purpose**: (Future) Custom domain resolution for `ops.10nz.tools`
- **Current**: Site accessible via `10netzero.v.frappe.cloud`
- **Mode**: "DNS only" (gray cloud icon in Cloudflare dashboard)
- **Records**: (When configured) Points to Frappe Cloud ingress IP/hostname
- **Change from previous architecture**: No Cloudflare Tunnel (`cloudflared`
  container eliminated)

#### Frappe Cloud Ingress

- **Purpose**: HTTPS termination and routing
- **SSL/TLS**: Automatic provisioning and renewal (Let's Encrypt)
- **Managed by**: Frappe Cloud platform
- **No user configuration required**

### 2. Bench Architecture

#### What is a Bench?

A **Bench** is the core deployment unit in Frappe/ERPNext:

- **Definition**: Collection of Frappe apps and one or more sites
- **Structure**:

  ```
  bench-root/
    ├── apps/           # Frappe apps (erpnext, frappe, flrts_extensions)
    ├── sites/          # Sites using the apps
    │   ├── 10netzero.v.frappe.cloud/
    │   │   ├── site_config.json
    │   │   ├── private/
    │   │   └── public/
    │   └── common_site_config.json
    ├── config/         # nginx, supervisor configs
    └── env/            # Python virtualenv
  ```

#### Private Bench

BigSirFLRTS uses a **Private Bench** ($25/mo minimum):

- **Features**:
  - Custom app deployment (enables `flrts_extensions`)
  - SSH access via certificate-based authentication
  - Git-based "push to deploy" workflow
  - Full bench CLI access
- **Restrictions**:
  - No root access to host OS
  - Cannot install arbitrary system packages
  - Must use Frappe-compatible apps only

#### Bench Group

- **Definition**: Collection of benches sharing a deployment template
- **Purpose**: Consistent configuration across multiple benches
- **Used for**: SSH certificate generation, bench management

### 3. Application Stack

#### nginx (Web Server)

- **Role**: Reverse proxy and static file serving
- **Managed by**: Frappe Cloud (auto-configured)
- **Serves**:
  - Static assets (`/assets/*`)
  - Uploaded files (`/files/*`)
  - Proxies dynamic requests to gunicorn

#### gunicorn (WSGI Application Server)

- **Role**: Runs Python/Frappe application code
- **Workers**: Auto-scaled by Frappe Cloud based on traffic
- **Handles**: ERPNext business logic, API requests, background jobs

#### ERPNext (Core Application)

- **Version**: v15+ (current as of 2025)
- **Framework**: Built on Frappe Framework
- **Features**:
  - Field Service Management (FSM) module
  - REST API (`/api/resource/*`)
  - Webhooks and automation
  - Custom DocTypes and workflows

#### flrts_extensions (Custom App)

- **Purpose**: BigSirFLRTS-specific customizations
- **Deployment**: Git-based push-to-deploy
- **Contains**:
  - Custom DocTypes (Field Reports, Tasks, Reminders, etc.)
  - Telegram bot integration
  - OpenAI NLP processing
  - Custom workflows and automations

**Deployment Workflow**:

```bash
# Push custom app to Frappe Cloud
git push frappe-cloud main

# Frappe Cloud automatically:
# 1. Pulls updated app code
# 2. Runs bench get-app or bench update
# 3. Runs migrations
# 4. Restarts services
```

### 4. Managed Services (Database & Cache)

#### MariaDB (Database)

- **Purpose**: ERPNext data storage
- **Version**: MariaDB 10.6+ (Frappe-compatible)
- **Schema**: Managed by ERPNext ORM (DocType system)
- **Change from previous architecture**:
  - **Obsolete**: Supabase PostgreSQL (incompatible with ERPNext)
  - **New**: Frappe Cloud managed MariaDB (native compatibility)

**Key Tables**:

- `tabDocType` - DocType definitions
- `tabUser` - User accounts
- `tabProject` - Projects (if using ERPNext Projects module)
- Custom tables for `flrts_extensions` DocTypes

**Connection**:

- Managed by Frappe Cloud (credentials in `site_config.json`)
- No direct SQL access (use Frappe ORM via bench console or API)

#### Redis (Queue, Cache, Realtime)

- **Purpose**: Multiple subsystems
  - **Queue**: Background job queue (`rq` library)
  - **Cache**: Application-level caching
  - **Realtime**: Pub/sub for real-time updates (SocketIO)

**Managed by**: Frappe Cloud (no configuration needed)

**Background Job Queues**:

```python
# Common queues:
default    # General background jobs
short      # Quick tasks
long       # Long-running tasks
```

### 5. Background Processing

#### Workers (Job Processors)

- **Role**: Process async background jobs from Redis queue
- **Examples**:
  - Email sending
  - Report generation
  - Telegram message processing
  - OpenAI API calls

**Managed by**: Frappe Cloud (auto-scaled)

**Custom Background Jobs** (defined in `flrts_extensions/hooks.py`):

```python
scheduler_events = {
    "hourly": [
        "flrts_extensions.tasks.sync_telegram_updates"
    ],
    "daily": [
        "flrts_extensions.tasks.cleanup_old_reports"
    ]
}
```

#### Scheduler (Cron-like Task Execution)

- **Role**: Execute scheduled tasks (similar to cron)
- **Frequency Options**:
  - `all` - Every time scheduler runs
  - `hourly` - Every hour
  - `daily` - Daily at midnight (site timezone)
  - `weekly` - Weekly (configurable day)
  - `monthly` - Monthly (configurable date)
  - `cron` - Custom cron expression

**Monitoring**:

```bash
bench --site 10netzero.v.frappe.cloud scheduler status
bench --site 10netzero.v.frappe.cloud scheduler enable  # if disabled
```

### 6. External Integrations

#### Telegram Bot API

- **Purpose**: User interaction via Telegram
- **Integration**: Webhook-based (Telegram → ERPNext webhook endpoint)
- **Configuration**: `telegram_bot_token` in `site_config.json`
- **Custom Code**: `flrts_extensions` handles webhook parsing and response

**Webhook Endpoint** (example):

```
https://10netzero.v.frappe.cloud/api/method/flrts_extensions.telegram.webhook
```

#### OpenAI API

- **Purpose**: NLP processing for field reports
- **Integration**: Direct HTTPS API calls from background jobs
- **Configuration**: `openai_api_key` in `site_config.json`
- **Custom Code**: `flrts_extensions` modules for summarization, extraction,
  etc.

#### n8n (Optional Workflow Automation)

- **Status**: Reassess need after ERPNext automation is in place
- **Previous Role**: Workflow orchestration
- **Potential Replacement**: ERPNext native workflows + custom Python code

**Decision Pending**: Evaluate whether n8n is still needed or can be retired.

### 7. Platform Services

#### Automated Backups

- **Frequency**: Every 24 hours (round-robin, no fixed schedule)
- **Components**:
  - Database backup (compressed MariaDB dump)
  - Public files (uploaded documents, images)
  - Private files (user-uploaded sensitive files)
- **Compression**: gzip
- **Availability**: $25+ plans only

**Offsite Backup Retention**:

- **7 daily** backups
- **4 weekly** backups
- **12 monthly** backups
- **10 yearly** backups

**Restore Process**:

- Via Frappe Cloud dashboard (select backup → restore)
- Destructive operation (replaces current site data)
- Verify backup integrity before restoring

#### Monitoring & Logs

**Built-in Frappe Cloud Tools**:

- Container metrics (CPU, memory, disk)
- Application logs (accessible via SSH or dashboard)
- Error tracking (Frappe error log DocType)

**Access Logs**:

```bash
# Via SSH
bench --site 10netzero.v.frappe.cloud logs

# Specific log files
tail -f sites/10netzero.v.frappe.cloud/logs/web.log
tail -f sites/10netzero.v.frappe.cloud/logs/worker.log
```

**Future Enhancements** (optional):

- External observability platform (Prometheus, Grafana)
- Centralized logging (if multi-bench deployment needed)

#### SSH Certificate Authority

- **Purpose**: Secure, time-limited SSH access to Private Bench
- **Certificate Validity**: 6 hours
- **Workflow**:
  1. User adds SSH public key to Frappe Cloud dashboard
  2. User requests certificate from Bench Group dashboard
  3. Certificate issued and valid for 6 hours
  4. User connects via SSH using certificate
  5. Re-request certificate when expired

**Security Benefits**:

- Time-limited access (reduces exposure if credentials compromised)
- Centralized key management
- Audit trail of SSH access

## Data Flow Examples

### Example 1: User Creates Field Report via Telegram

```
1. User sends Telegram message
   ↓
2. Telegram Bot API → webhook to https://10netzero.v.frappe.cloud/api/method/flrts_extensions.telegram.webhook
   ↓
3. flrts_extensions.telegram.webhook handler (synchronous):
   - Parse message
   - Enqueue background job for NLP processing
   - Return immediate acknowledgment to Telegram
   ↓
4. Background worker picks up job from Redis queue:
   - Call OpenAI API for summarization/extraction
   - Create Field Report DocType record in MariaDB
   - Send confirmation message back to Telegram
```

### Example 2: Scheduled Daily Report Generation

```
1. Scheduler runs daily task (defined in hooks.py)
   ↓
2. flrts_extensions.tasks.generate_daily_report executes:
   - Query MariaDB via Frappe ORM for report data
   - Generate PDF report (using Frappe print format)
   - Store PDF in private files
   - Send notification to team via Telegram
```

### Example 3: API Request from External Service

```
1. External service (e.g., custom dashboard) sends API request:
   GET https://10netzero.v.frappe.cloud/api/resource/Project
   Authorization: token <api_key>:<api_secret>
   ↓
2. nginx receives request → forwards to gunicorn
   ↓
3. Frappe API handler:
   - Authenticate API key/secret
   - Check user permissions
   - Query MariaDB via ORM
   - Return JSON response
```

## Resource Allocation

**Private Bench Plan ($25/mo)**:

- **Compute**: Shared resources, auto-scaled by Frappe Cloud
- **Storage**: Includes database + file storage (limits vary by plan tier)
- **Bandwidth**: Unlimited on most plans
- **Backups**: Daily automated backups included

**Scaling Considerations**:

- Monitor resource usage via Frappe Cloud dashboard
- Upgrade to higher-tier plan if hitting limits
- Optimize custom code (database queries, background jobs) for efficiency

## Security Model

### Network Security

- **Public Exposure**: Only HTTPS on port 443 (via Frappe Cloud ingress)
- **No Direct Database Access**: MariaDB and Redis accessible only within Frappe
  Cloud environment
- **SSH Access**: Certificate-based, time-limited (6 hours)

### Application Security

- **Role-Based Access Control (RBAC)**: ERPNext permission system
- **API Authentication**: Token-based (API key + secret)
- **Session Management**: Frappe framework handles sessions, CSRF protection

### Secrets Management

- **Site Config**: Secrets stored in `site_config.json` (not web-accessible)
- **Environment Variables**: Not used (Frappe uses `site_config.json` instead)
- **External Storage**: Use 1Password for team-shared secrets (see
  `~/claude-references/1password-api-keys.md`)

## Comparison: Old vs New Architecture

| Component           | Old (Self-Hosted)                            | New (Frappe Cloud)                         |
| ------------------- | -------------------------------------------- | ------------------------------------------ |
| **Database**        | Supabase PostgreSQL (incompatible)           | Managed MariaDB (native compatibility)     |
| **Web Server**      | nginx (self-managed in Docker)               | nginx (managed by Frappe Cloud)            |
| **App Server**      | gunicorn (self-managed in Docker)            | gunicorn (managed by Frappe Cloud)         |
| **Cache/Queue**     | Redis (self-managed in Docker)               | Redis (managed by Frappe Cloud)            |
| **Ingress**         | Cloudflare Tunnel (`cloudflared` container)  | Frappe Cloud ingress (no tunnel needed)    |
| **DNS**             | Cloudflare (proxied/orange cloud)            | Cloudflare (DNS-only/gray cloud)           |
| **SSL/TLS**         | Cloudflare or manual Let's Encrypt           | Automatic (Frappe Cloud)                   |
| **Backups**         | Manual or custom scripts                     | Automated daily (offsite retention policy) |
| **Monitoring**      | Self-managed (Prometheus/Grafana/Jaeger)     | Frappe Cloud built-in (optional external)  |
| **Deployment**      | Docker Compose, manual migrations            | Git push-to-deploy                         |
| **Background Jobs** | Self-managed supervisor + workers            | Managed by Frappe Cloud                    |
| **Hosting Cost**    | DigitalOcean droplet + Supabase + Cloudflare | Frappe Cloud Private Bench ($25/mo+)       |

## Operational Workflows

### Deploying Custom App Updates

```bash
# Local development
cd flrts_extensions
git add .
git commit -m "Add new feature"

# Push to Frappe Cloud
git push frappe-cloud main

# Frappe Cloud automatically:
# 1. Pulls code
# 2. Runs bench update --app flrts_extensions
# 3. Runs migrations
# 4. Restarts services

# Verify deployment via SSH
ssh <bench-host>
bench --site 10netzero.v.frappe.cloud migrate
bench --site 10netzero.v.frappe.cloud console
>>> frappe.get_installed_apps()
```

### Running Database Migrations

```bash
# Automatic (triggered by push-to-deploy)
git push frappe-cloud main

# Manual (via SSH if needed)
ssh <bench-host>
bench --site 10netzero.v.frappe.cloud migrate
```

### Monitoring Site Health

```bash
# Via SSH
ssh <bench-host>
bench --site 10netzero.v.frappe.cloud doctor  # Health check
bench --site 10netzero.v.frappe.cloud scheduler status
bench --site 10netzero.v.frappe.cloud console
>>> frappe.db.get_value("User", {"name": "Administrator"}, "enabled")
```

**Via Frappe Cloud Dashboard**:

- Navigate to site dashboard
- View metrics: uptime, response time, error rate
- Check logs for errors or warnings

### Restoring from Backup

**Critical**: Backup restoration is destructive (replaces all site data).

**Process**:

1. **Verify Backup Integrity**:
   - Download backup from Frappe Cloud dashboard
   - Inspect contents (database dump, files)

2. **Restore** (via Frappe Cloud dashboard):
   - Navigate to site → Backups
   - Select backup to restore
   - Confirm restoration
   - Wait for restoration to complete

3. **Verify Restoration**:
   - Log in to site
   - Check critical data (users, projects, reports)
   - Run smoke tests

## Troubleshooting

### Common Issues

| Issue                           | Diagnosis                             | Resolution                                                                  |
| ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| **Site not accessible**         | DNS misconfiguration or SSL issue     | Check Cloudflare DNS (gray cloud), verify Frappe Cloud custom domain status |
| **Background jobs not running** | Scheduler disabled or worker crash    | `bench scheduler status`, `bench restart`                                   |
| **Database connection errors**  | Credentials changed or MariaDB down   | Check `site_config.json`, contact Frappe Cloud support                      |
| **SSH access denied**           | Certificate expired (6-hour validity) | Regenerate SSH certificate from Bench Group dashboard                       |
| **Custom app not updating**     | Push-to-deploy failure                | Check Frappe Cloud logs, re-push with `git push -f` if needed               |

### Diagnostic Commands

```bash
# Check site status
bench --site 10netzero.v.frappe.cloud doctor

# View error logs
bench --site 10netzero.v.frappe.cloud logs
tail -f sites/10netzero.v.frappe.cloud/logs/web.error.log

# Test database connectivity
bench --site 10netzero.v.frappe.cloud console
>>> frappe.db.get_list("User", limit=1)

# Check scheduler
bench --site 10netzero.v.frappe.cloud scheduler status

# Restart services
bench restart
```

## Related Documentation

- [Frappe Cloud Site Setup Guide](../setup/frappe-cloud-site.md)
- [ADR-006: ERPNext Frappe Cloud Migration](./adr/ADR-006-erpnext-frappe-cloud-migration.md)
- [FRAPPE_CLOUD_DEPLOYMENT.md](../deployment/FRAPPE_CLOUD_DEPLOYMENT.md) (TODO:
  pending creation)
- [Frappe Cloud Operations Playbook](../infrastructure/frappe-cloud-operations.md)
  (TODO: pending creation)

## External References

- [Frappe Cloud Documentation](https://frappecloud.com/docs)
- [Frappe Framework Architecture](https://frappeframework.com/docs/user/en/architecture)
- [ERPNext Documentation](https://docs.erpnext.com)
- [Bench CLI Reference](https://frappeframework.com/docs/user/en/bench)
