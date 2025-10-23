# Frappe Cloud Custom App Deployment Workflow

**Research ID**: RES-377 **Date**: 2025-10-21 **Work Block**: 10N-377
**Researcher**: Research Agent **Topic**: Frappe Cloud deployment best practices
for flrts-extensions custom app

## Executive Summary

This research provides a comprehensive guide for deploying custom apps to Frappe
Cloud private bench environments, with specific focus on the `flrts-extensions`
app deployment to `ops.10nz.tools`. The workflow covers git push-to-deploy
mechanics, migration execution, custom DocType/Field verification, API testing,
common pitfalls, and rollback strategies.

**Key Finding**: Frappe Cloud uses a **two-step deployment process**: (1) Deploy
bench from Git (UI-triggered), (2) Run migrations via SSH. The second step is
CRITICAL and often missed, leading to deployment appearing successful but custom
DocTypes not actually available.

---

## Table of Contents

1. [Deployment Workflow Overview](#deployment-workflow-overview)
2. [Step-by-Step Deployment Guide](#step-by-step-deployment-guide)
3. [Migration Execution Best Practices](#migration-execution-best-practices)
4. [Custom DocType/Field Verification](#custom-doctypefield-verification)
5. [ERPNext API Testing](#erpnext-api-testing)
6. [Common Pitfalls](#common-pitfalls)
7. [Rollback Strategies](#rollback-strategies)
8. [Fixtures and Server-Side Customizations](#fixtures-and-server-side-customizations)
9. [References](#references)

---

## Deployment Workflow Overview

### High-Level Process

```
┌─────────────────────┐
│ 1. Git Push to Main │──────┐
└─────────────────────┘      │
                             │
┌─────────────────────┐      │
│ 2. Frappe Cloud     │◄─────┘
│    Detects Change   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ 3. Deploy Bench via │
│    Frappe Cloud UI  │
│    (Show Updates >  │
│     Deploy)         │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ 4. SSH into Bench   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ 5. Run Migrations   │
│    bench migrate    │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ 6. Verify via API   │
│    and UI           │
└─────────────────────┘
```

### Why Two Steps?

**Frappe Cloud architectural decision**:

- **Deploy** pulls latest code from Git and rebuilds the bench (Python packages,
  assets)
- **Migrate** applies database schema changes (DocTypes, Custom Fields, patches)

Without Step 5 (migrate), your code is deployed but DocTypes won't exist in the
database.

**Source**:
[Frappe Cloud Official Docs - Custom App Installation](https://docs.frappe.io/cloud/benches/custom-app)

---

## Step-by-Step Deployment Guide

### Prerequisites

1. **Private Bench Group** (required for custom apps)
   - Minimum: $25/mo plan
   - Source:
     [ADR-006](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)

2. **GitHub Repository Connected**
   - GitHub app integration configured
   - Frappe Cloud has read access to your repository

3. **SSH Key Added**
   - Public key uploaded to Frappe Cloud account
   - Source: [Frappe Cloud SSH Docs](https://frappecloud.com/docs/benches/ssh)

### Step 1: Push Code to GitHub

```bash
cd /Users/colinaulds/Desktop/flrts-extensions

# Ensure all changes committed
git status

# Push to main branch (or configured deployment branch)
git push origin main
```

**Verification**:

```bash
git log origin/main --oneline -1
# Should show your latest commit
```

### Step 2: Deploy Bench via Frappe Cloud UI

**Manual UI Steps** (as of 2025-10-21):

1. Navigate to your private bench dashboard on Frappe Cloud
2. Click **"Apps"** tab
3. You'll see a banner: **"Updates Available"**
4. Click **"Show Updates"** button
5. Review the commit/changes shown
6. Click **"Deploy"** button
7. Wait for deployment to complete (typically 2-5 minutes)
   - Status will show "Deploying..." then "Active"

**Important**: The bench is now rebuilt with your latest code, BUT database
schema has NOT been updated yet.

**Source**:
[Frappe Cloud Custom App Docs](https://docs.frappe.io/cloud/benches/custom-app)

### Step 3: Generate SSH Certificate

**Certificate Lifespan**: 6 hours (must regenerate after expiration)

1. Navigate to bench group dashboard
2. Click three-dot menu next to bench version
3. Select **"SSH Access"**
4. Click **"Generate SSH Certificate"**
5. Copy the two commands shown in the dialog

**Example Commands** (will look similar to this):

```bash
# Command 1: Write certificate to local filesystem
cat > ~/.ssh/id_rsa-cert.pub <<EOF
ssh-rsa-cert-v01@openssh.com AAAAHHNzaC1...
EOF

# Command 2: SSH into bench
ssh bench-0001-000001-f1-mumbai@n1-mumbai.frappe.cloud -p 2222
```

**Troubleshooting**:

- **"Too many authentication failures"**: Add
  `-o "IdentitiesOnly=yes" -i ~/.ssh/id_rsa`
- **Windows PowerShell**: Run `$PSDefaultParameterValues['*:Encoding'] = 'utf8'`
  before pasting certificate
- **Permission denied**: Verify fingerprint from `ssh-add -l` matches Frappe
  Cloud dashboard

**Source**:
[Frappe Cloud SSH Access Docs](https://frappecloud.com/docs/benches/ssh)

### Step 4: Run Migrations via SSH

Once connected via SSH:

```bash
# Navigate to bench directory (usually already in correct location)
cd ~/frappe-bench

# CRITICAL: Run migrations for your site
bench --site ops.10nz.tools migrate

# Expected output:
# Migrating ops.10nz.tools
# Executing frappe.patches...
# Executing erpnext.patches...
# Executing flrts_extensions.patches...  # <-- Your custom app patches
```

**What `bench migrate` does**:

1. Syncs DocType JSON definitions to database (`tabDocType` table)
2. Creates/updates database tables for each DocType
3. Applies Custom Fields from fixtures
4. Runs migration patches (if any in `patches.txt`)
5. Rebuilds search index

**Common Output Patterns**:

```bash
# Success Pattern
Migrating ops.10nz.tools
Executing frappe.patches.v14_0...
...
Executing flrts_extensions.patches...  # Your app's patches
Syncing FLRTS Parser Log  # Your custom DocType
Syncing FLRTS User Preference  # Your custom DocType
Installing fixtures...
Migration complete for ops.10nz.tools

# Warning Pattern (usually safe)
UserWarning: Cannot set standard field property X for DocType Y
# This is normal for Custom Fields on standard DocTypes

# Error Pattern (STOP and debug)
pymysql.err.OperationalError: (1050, "Table 'tabFLRTS Parser Log' already exists")
# Indicates duplicate migration - may need to drop table or skip patch
```

**Source**:
[Perplexity Research - Frappe Migration Commands](https://www.perplexity.ai/search/what-is-the-correct-workflow-f)

### Step 5: Restart Services (if needed)

```bash
# Restart all bench services
bench restart

# Or restart specific services
bench restart gunicorn  # Web server
bench restart worker    # Background jobs
bench restart scheduler # Scheduled tasks
```

**When to restart**:

- After installing/updating Python dependencies
- After modifying hooks.py
- After changing server-side scripts
- Generally NOT needed just for migrations

### Step 6: Verify Deployment

See [Custom DocType/Field Verification](#custom-doctypefield-verification)
section below.

---

## Migration Execution Best Practices

### Pre-Migration Checklist

```bash
# 1. Check current site status
bench --site ops.10nz.tools doctor

# 2. Verify installed apps list
bench --site ops.10nz.tools list-apps
# Should show: frappe, erpnext, flrts_extensions

# 3. Check for pending migrations
bench --site ops.10nz.tools migrate --dry-run
# Shows what WOULD be migrated (safe to run)

# 4. Create manual backup BEFORE migration
bench --site ops.10nz.tools backup --with-files
# Creates backup in sites/ops.10nz.tools/private/backups/
```

### During Migration

**DO**:

- Run migrations during low-traffic periods
- Monitor migration output for errors
- Keep SSH session alive (use `screen` or `tmux` for long migrations)

**DON'T**:

- Run multiple migrations simultaneously on same site
- Ctrl+C during migration (can leave database in inconsistent state)
- Modify code while migration is running

### Post-Migration Verification

```bash
# 1. Check site is accessible
bench --site ops.10nz.tools doctor

# 2. Verify new DocTypes exist
bench --site ops.10nz.tools console

# In Frappe console:
>>> import frappe
>>> frappe.get_meta("FLRTS Parser Log")
# Should return DocType metadata (not error)

>>> frappe.get_installed_apps()
# Should include 'flrts_extensions'

>>> exit()

# 3. Check for error logs
tail -f logs/web.error.log
# Watch for errors when accessing your custom DocTypes
```

---

## Custom DocType/Field Verification

### Method 1: ERPNext Web UI

**Verify Custom DocTypes**:

1. Login to <https://ops.10nz.tools>
2. Search bar (Ctrl+K or Cmd+K)
3. Type "FLRTS Parser Log"
   - Should appear in search results
   - Click to open DocType form

**Verify Custom Fields**:

1. Navigate to "Maintenance Visit" DocType
2. Create new or edit existing document
3. Scroll through form
4. Look for fields starting with `custom_`:
   - `custom_assigned_to`
   - `custom_flrts_priority`
   - `custom_parse_rationale`
   - etc. (7 total per commit 6fa03a8)

### Method 2: SSH Console Verification

```bash
ssh <bench-name>@<proxy>.frappe.cloud -p 2222
bench --site ops.10nz.tools console
```

**Verify Custom DocTypes exist**:

```python
import frappe

# Check FLRTS Parser Log
meta = frappe.get_meta("FLRTS Parser Log")
print(f"Fields: {len(meta.fields)}")  # Should be 30+ fields
for field in meta.fields:
    print(f"  {field.fieldname} ({field.fieldtype})")

# Check FLRTS User Preference
meta = frappe.get_meta("FLRTS User Preference")
print(f"Fields: {len(meta.fields)}")  # Should be 11+ fields
```

**Verify Custom Fields on Maintenance Visit**:

```python
import frappe

meta = frappe.get_meta("Maintenance Visit")

# List all custom fields (start with 'custom_')
custom_fields = [f for f in meta.fields if f.fieldname.startswith('custom_')]
print(f"Found {len(custom_fields)} custom fields:")
for field in custom_fields:
    print(f"  {field.fieldname} ({field.fieldtype}): {field.label}")

# Expected output (7 fields):
# custom_assigned_to (Link): Assigned To
# custom_flrts_priority (Select): FLRTS Priority
# custom_parse_rationale (Long Text): Parse Rationale
# custom_parse_confidence (Float): Parse Confidence
# custom_telegram_message_id (Data): Telegram Message ID
# custom_flrts_source (Data): FLRTS Source
# custom_flagged_for_review (Check): Flagged for Review
```

### Method 3: Database Direct Query

```bash
ssh <bench-name>@<proxy>.frappe.cloud -p 2222
bench --site ops.10nz.tools mariadb
```

```sql
-- Check DocType exists in database
SELECT name, module, custom, istable
FROM `tabDocType`
WHERE name IN ('FLRTS Parser Log', 'FLRTS User Preference');

-- Check Custom Fields exist
SELECT name, dt, fieldname, fieldtype, label
FROM `tabCustom Field`
WHERE dt = 'Maintenance Visit'
  AND fieldname LIKE 'custom_%';

-- Count records in custom DocType table (will be 0 initially)
SELECT COUNT(*) FROM `tabFLRTS Parser Log`;
```

---

## ERPNext API Testing

### Authentication Setup

**Generate API Key/Secret**:

1. Login to <https://ops.10nz.tools>
2. Navigate to **User** list
3. Open your user document
4. Scroll to **API Access** section
5. Click **Generate Keys**
6. Copy the API Key and API Secret shown (one-time display)

**Store in environment variables** (for curl examples):

```bash
export ERPNEXT_URL="https://ops.10nz.tools"
export ERPNEXT_API_KEY="1a2b3c4d5e6f7g8h"
export ERPNEXT_API_SECRET="9i8h7g6f5e4d3c2b"
```

### API Verification Examples

#### 1. Test Authentication

```bash
curl -X GET "${ERPNEXT_URL}/api/method/frappe.auth.get_logged_user" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  -H "Accept: application/json"
```

**Expected Response**:

```json
{
  "message": "your-username@10nz.tools"
}
```

**HTTP Status**: 200 OK

**Error Patterns**:

- **401 Unauthorized**: Invalid API key/secret
- **403 Forbidden**: User lacks permissions

#### 2. Verify Custom DocType Accessible via API

**Get DocType Metadata** (v1 API):

```bash
curl -X GET "${ERPNEXT_URL}/api/resource/DocType/FLRTS Parser Log" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  -H "Accept: application/json"
```

**Expected Response** (200 OK):

```json
{
  "data": {
    "name": "FLRTS Parser Log",
    "module": "FLRTS",
    "custom": 0,
    "fields": [
      {
        "fieldname": "telegram_message_id",
        "fieldtype": "Data",
        "label": "Telegram Message ID"
      }
      // ... 30 more fields
    ]
  }
}
```

**Alternative: v2 API** (Frappe v15+):

```bash
curl -X GET "${ERPNEXT_URL}/api/v2/document/DocType/FLRTS Parser Log" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  -H "Accept: application/json"
```

#### 3. List Documents from Custom DocType

```bash
curl -X GET "${ERPNEXT_URL}/api/resource/FLRTS Parser Log?fields=[\%22name\%22,\%22telegram_message_id\%22,\%22creation\%22]&limit=5" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  -H "Accept: application/json"
```

**Expected Response** (200 OK):

```json
{
  "data": []
}
```

(Empty array is CORRECT for newly deployed DocType with no records)

#### 4. Create Test Document in Custom DocType

```bash
curl -X POST "${ERPNEXT_URL}/api/resource/FLRTS Parser Log" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "telegram_message_id": "12345",
    "telegram_user_id": "test_user",
    "prompt_tokens": 100,
    "completion_tokens": 50
  }'
```

**Expected Response** (200 OK):

```json
{
  "data": {
    "name": "FLRTS-PL-0001", // Auto-generated
    "telegram_message_id": "12345",
    "creation": "2025-10-21 14:30:00"
  }
}
```

**Error Patterns**:

- **417 Expectation Failed**: Missing required field
- **403 Forbidden**: Insufficient permissions
- **500 Internal Server Error**: Validation hook failed

#### 5. Verify Custom Field via API

**Fetch Maintenance Visit with Custom Fields**:

```bash
curl -X GET "${ERPNEXT_URL}/api/resource/Maintenance Visit?fields=[\%22name\%22,\%22custom_assigned_to\%22,\%22custom_flrts_priority\%22]&limit=1" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  -H "Accept: application/json"
```

**Expected Response** (200 OK):

```json
{
  "data": [
    {
      "name": "MV-0001",
      "custom_assigned_to": null, // Custom field exists
      "custom_flrts_priority": null
    }
  ]
}
```

**Verification**: Custom fields appear in response (even if null) = SUCCESS

#### 6. Test Whitelisted Custom Method (if applicable)

```bash
curl -X POST "${ERPNEXT_URL}/api/method/flrts_extensions.automations.telegram_api.handle_telegram_webhook" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: your-webhook-secret" \
  -d '{
    "message": {
      "message_id": 999,
      "from": {"id": 123},
      "text": "Test message"
    }
  }'
```

**Note**: This specific endpoint requires Telegram signature validation. Use for
structure testing only.

### API Response Status Codes Reference

| Status Code               | Meaning           | Common Causes                             |
| ------------------------- | ----------------- | ----------------------------------------- |
| 200 OK                    | Success           | Request processed successfully            |
| 401 Unauthorized          | Auth failure      | Invalid API key/secret format             |
| 403 Forbidden             | Permission denied | User lacks DocType read/write permission  |
| 404 Not Found             | Resource missing  | DocType doesn't exist (migration not run) |
| 417 Expectation Failed    | Validation error  | Missing required field, type mismatch     |
| 500 Internal Server Error | Server error      | Python exception in validation hook       |

**Source**:
[Frappe API Docs (Unofficial)](https://github.com/alyf-de/frappe_api-docs),
[Frappe Forum - cURL Tutorial](https://discuss.frappe.io/t/tutorial-using-curl-for-rest-and-rpc-api-calls/72649)

---

## Common Pitfalls

### Pitfall 1: Deploying Without Running Migrations

**Symptom**: Code deployed, but custom DocTypes return 404 in API/UI

**Cause**: Frappe Cloud "Deploy" only updates code, NOT database schema

**Solution**: Always run `bench --site ops.10nz.tools migrate` after deploy

**Source**:
[Frappe Cloud Custom App Docs](https://docs.frappe.io/cloud/benches/custom-app) -
"After pushing updates to your app, you need to deploy a new version of your
bench group, then update your site as well to see the changes in your site."

### Pitfall 2: Fixtures Override Production Changes

**Symptom**: Production customizations (Custom Fields, Server Scripts) get wiped
out on next deployment

**Cause**: Fixtures directory becomes single source of truth - migrate
overwrites database with fixture JSON

**Example**: You add a Custom Field via UI in production, then deploy code with
old fixtures → Custom Field deleted

**Solution**:

1. **Option A (Recommended)**: Remove fixtures from `fixtures/` directory after
   initial deployment
   - Move to `flrts_extensions/data/` for archival
   - Use `after_app_installation` hook for one-time setup instead

2. **Option B**: Keep fixtures synchronized
   - Before each deployment, export current production state:
     `bench --site ops.10nz.tools export-fixtures`
   - Commit updated fixtures to Git
   - Deploy (fixtures will match production)

**Source**:
[Perplexity Research - Frappe Cloud Pitfalls](https://www.perplexity.ai/search/what-are-common-pitfalls-when)

### Pitfall 3: SSH Certificate Expiration

**Symptom**: SSH connection fails with "Permission denied (publickey)"

**Cause**: SSH certificate valid for only 6 hours

**Solution**: Regenerate certificate via Frappe Cloud UI (see Step 3)

**Source**: [Frappe Cloud SSH Docs](https://frappecloud.com/docs/benches/ssh)

### Pitfall 4: Migration Interrupted Mid-Execution

**Symptom**: Database in inconsistent state, some DocTypes exist, others don't

**Cause**: Ctrl+C during migration, network disconnect, or out-of-memory error

**Solution**:

1. Check `tabPatch Log` table to see which patches completed:

   ```sql
   SELECT patch_name, executed
   FROM `tabPatch Log`
   WHERE executed = 1
   ORDER BY creation DESC
   LIMIT 20;
   ```

2. Re-run migration:

   ```bash
   bench --site ops.10nz.tools migrate
   ```

   (Frappe skips already-executed patches via `tabPatch Log`)

3. If migration continues failing, check error logs:

   ```bash
   tail -100 logs/bench.log
   tail -100 logs/web.error.log
   ```

**Prevention**: Use `screen` or `tmux` for long migrations

### Pitfall 5: Missing Python Dependencies

**Symptom**: Migration fails with `ImportError: No module named 'xyz'`

**Cause**: `requirements.txt` not installed or Frappe Cloud build cache issue

**Solution**:

1. Verify dependencies listed in `setup.py` or `requirements.txt`
2. Trigger rebuild by pushing commit to GitHub
3. If persistent, SSH and install manually:

   ```bash
   pip install -e /home/frappe/frappe-bench/apps/flrts_extensions
   ```

### Pitfall 6: Asset 404 Errors (Multi-Bench)

**Symptom**: CSS/JS files return 404, UI looks broken

**Cause**: Asset build failed or assets not served from correct bench directory

**Solution**:

```bash
bench --site ops.10nz.tools build
bench --site ops.10nz.tools clear-cache
bench restart
```

**Source**:
[Frappe Forum - Asset Build Issues](https://discuss.frappe.io/t/frappe-dockerized-multibench-asset-building-problems/144187)

### Pitfall 7: Wrong Branch Deployed

**Symptom**: Old code deployed despite pushing to main

**Cause**: Frappe Cloud configured to deploy from different branch (e.g.,
`production` instead of `main`)

**Solution**:

1. Check configured branch in Frappe Cloud UI → Apps tab → App details
2. Either:
   - Push to the configured branch, OR
   - Change configured branch in Frappe Cloud UI → Update App

---

## Rollback Strategies

### Strategy 1: Git Revert (Preferred)

**When to use**: Migration succeeded but introduced bug in code

**Process**:

```bash
# On local machine
cd /Users/colinaulds/Desktop/flrts-extensions

# Option A: Revert specific commit
git revert 6fa03a8
git push origin main

# Option B: Reset to previous commit (destructive)
git reset --hard 7d8cd44  # Previous working commit
git push origin main --force

# Wait for Frappe Cloud to detect change
# Deploy via UI (Step 2)
# SSH and run migrations (Step 4)
```

**Pros**:

- Clean git history (if using `revert`)
- Reproducible
- Works with Frappe Cloud git-based workflow

**Cons**:

- Requires re-deploy and re-migrate (2-10 minutes)
- Database changes NOT automatically reverted

### Strategy 2: Database Backup Restore

**When to use**: Migration corrupted database or introduced breaking schema
changes

**Prerequisites**: Backup taken BEFORE migration (see Pre-Migration Checklist)

**Process**:

1. **Via Frappe Cloud UI**:
   - Navigate to site dashboard
   - Click "Actions" tab
   - Click "Restore from Backup"
   - Select backup from dropdown (before migration)
   - Click "Restore"
   - Wait 5-15 minutes

2. **Via SSH** (if UI restore unavailable):

   ```bash
   ssh <bench-name>@<proxy>.frappe.cloud -p 2222

   # List available backups
   ls -lh sites/ops.10nz.tools/private/backups/

   # Restore database backup
   bench --site ops.10nz.tools --force restore \
     sites/ops.10nz.tools/private/backups/20251021_143000-ops_10nz_tools-database.sql.gz

   # Restart services
   bench restart
   ```

**Pros**:

- Complete rollback of database state
- Guaranteed consistency

**Cons**:

- Loses any data created AFTER backup
- Requires downtime (5-15 minutes)

**Source**:
[Frappe Cloud Restore Docs](https://docs.frappe.io/cloud/sites/migrate-an-existing-site)

### Strategy 3: Manual Schema Rollback

**When to use**: Need to remove specific DocType without full database restore

**Process**:

```bash
ssh <bench-name>@<proxy>.frappe.cloud -p 2222
bench --site ops.10nz.tools console
```

```python
import frappe

# Delete custom DocType (DESTRUCTIVE - deletes all records)
frappe.delete_doc("DocType", "FLRTS Parser Log", force=1)
frappe.db.commit()

# Remove custom field from standard DocType
frappe.delete_doc("Custom Field", "Maintenance Visit-custom_assigned_to", force=1)
frappe.db.commit()

# Clear caches
frappe.clear_cache()
```

**Pros**:

- Surgical removal of specific changes
- No downtime

**Cons**:

- Manual, error-prone
- Deletes all data in DocType
- Doesn't revert code changes

### Strategy 4: Blue/Green Deployment (Advanced)

**When to use**: High-availability requirement, zero downtime

**Process**:

1. Create second Frappe Cloud site (e.g., `ops-staging.10nz.tools`)
2. Deploy new version to staging
3. Run migrations on staging
4. Verify functionality
5. If successful, deploy to production
6. If failure, production remains untouched

**Pros**:

- Zero production downtime
- Safe testing environment

**Cons**:

- Requires second site (additional cost)
- Data sync complexity

**Source**:
[General Blue/Green Pattern](https://stackoverflow.com/questions/48154237/revert-failed-cloud-foundry-deploy)

### Rollback Decision Matrix

| Scenario            | Recommended Strategy          | Downtime | Data Loss Risk       |
| ------------------- | ----------------------------- | -------- | -------------------- |
| Bug in Python code  | Git Revert (Strategy 1)       | 2-5 min  | None                 |
| Broken migration    | Database Restore (Strategy 2) | 5-15 min | Data since backup    |
| Unwanted DocType    | Manual Rollback (Strategy 3)  | None     | DocType records only |
| Critical production | Blue/Green (Strategy 4)       | None     | None                 |

---

## Fixtures and Server-Side Customizations

### What are Fixtures?

**Fixtures** = JSON files representing DocType configurations that should be
version-controlled and deployed with your app.

**Common Fixture Types**:

- Custom Field definitions
- Custom DocTypes
- Server Scripts
- Print Formats
- Report configurations

**Location**: `flrts_extensions/fixtures/*.json`

**Example from commit 6fa03a8**:

```json
// flrts_extensions/fixtures/custom_field.json
[
  {
    "doctype": "Custom Field",
    "dt": "Maintenance Visit",
    "fieldname": "custom_assigned_to",
    "fieldtype": "Link",
    "options": "User",
    "label": "Assigned To"
  }
  // ... 6 more custom fields
]
```

### Fixture Workflow

1. **Initial Creation** (via UI or code):
   - Option A: Create Custom Field via ERPNext UI
   - Option B: Define in `fixtures/` directory directly

2. **Export to Fixture** (if created via UI):

   ```bash
   bench --site ops.10nz.tools export-fixtures
   ```

   This writes current database state to `fixtures/` directory

3. **Commit to Git**:

   ```bash
   git add flrts_extensions/fixtures/
   git commit -m "feat: Add custom fields for Maintenance Visit"
   ```

4. **Deploy to Production** (see deployment workflow above)

5. **Migration Syncs Fixtures**:

   ```bash
   bench --site ops.10nz.tools migrate
   ```

   This writes fixture JSON → database

### The Fixtures Overwrite Problem

**Critical Understanding**: Once fixtures are committed, they become the
**single source of truth**.

**Scenario**:

1. Deploy custom app with fixtures (7 custom fields)
2. Via production UI, add 8th custom field manually
3. Deploy new code update (fixtures still show 7 fields)
4. Run migration → **8th field DELETED** (fixtures overwrite database)

**Solutions**:

**Option 1: Remove Fixtures After Initial Deployment** (Recommended for
development environments)

```bash
# After first successful deployment
git mv flrts_extensions/fixtures/ flrts_extensions/data/
git commit -m "chore: Move fixtures to data/ for archival"
```

Now production changes won't be overwritten.

**Option 2: Always Sync Fixtures Before Deploy** (Recommended for production)

```bash
# Before each deployment
ssh <bench-name>@<proxy>.frappe.cloud -p 2222
bench --site ops.10nz.tools export-fixtures

# Copy updated fixtures from server to local
scp -P 2222 <bench-name>@<proxy>.frappe.cloud:~/frappe-bench/apps/flrts_extensions/fixtures/*.json \
  /Users/colinaulds/Desktop/flrts-extensions/flrts_extensions/fixtures/

# Commit updated fixtures
git add flrts_extensions/fixtures/
git commit -m "chore: Sync production fixtures"
git push origin main
```

**Option 3: Use `after_app_installation` Hook**

```python
# hooks.py
after_app_installation = [
    "flrts_extensions.setup.install.install_custom_fields"
]

# flrts_extensions/setup/install.py
def install_custom_fields():
    """One-time installation of custom fields (not fixture-based)"""
    from frappe.custom.doctype.custom_field.custom_field import create_custom_field

    if not frappe.db.exists("Custom Field", "Maintenance Visit-custom_assigned_to"):
        create_custom_field("Maintenance Visit", {
            "fieldname": "custom_assigned_to",
            "fieldtype": "Link",
            "options": "User",
            "label": "Assigned To"
        })
```

**Source**:
[Perplexity Research - Fixture Pitfalls](https://www.perplexity.ai/search/what-are-common-pitfalls-when)

---

## References

### Official Documentation

1. **Frappe Cloud - Custom App Installation**
   - URL: <https://docs.frappe.io/cloud/benches/custom-app>
   - Accessed: 2025-10-21
   - Coverage: GitHub integration, deployment workflow, private repo notes

2. **Frappe Cloud - SSH Access**
   - URL: <https://frappecloud.com/docs/benches/ssh>
   - Accessed: 2025-10-21
   - Coverage: Certificate generation, troubleshooting, SSH limitations

3. **Frappe Cloud - Site Migration**
   - URL: <https://docs.frappe.io/cloud/sites/migrate-an-existing-site>
   - Accessed: 2025-10-21
   - Coverage: Backup/restore process, encryption keys

4. **Frappe Framework - REST API v2**
   - URL: <https://docs.frappe.io/framework/user/en/guides/integration/rest_api>
   - Accessed: 2025-10-21
   - Coverage: API endpoints, authentication, CRUD operations

### Community Resources

5. **Frappe Forum - cURL API Tutorial**
   - URL:
     <https://discuss.frappe.io/t/tutorial-using-curl-for-rest-and-rpc-api-calls/72649>
   - Accessed: 2025-10-21
   - Coverage: curl examples, authentication patterns

6. **GitHub - Frappe API Docs (Unofficial)**
   - URL: <https://github.com/alyf-de/frappe_api-docs>
   - Accessed: 2025-10-21
   - Coverage: OpenAPI spec, authentication examples

7. **Frappe Forum - Docker Migration Best Practices**
   - URL:
     <https://discuss.frappe.io/t/best-practices-for-migrating-frappe-apps-versions-using-custom-docker-images-and-docker-compose/133659>
   - Accessed: 2025-10-21
   - Coverage: Version compatibility, backup strategies

8. **Frappe Forum - Rollback Discussion**
   - URL: <https://discuss.frappe.io/t/rollback-on-frappe-cloud/134988>
   - Accessed: 2025-10-21
   - Coverage: Rollback limitations, community recommendations

### Project-Specific References

9. **ADR-006 - ERPNext Frappe Cloud Migration**
   - Path: docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md
   - Coverage: Private bench selection, deployment architecture

10. **flrts-extensions Repository**
    - URL: <https://github.com/auldsyababua/flrts-extensions>
    - Commit: 6fa03a8 (2025-10-21)
    - Coverage: Custom DocTypes, Custom Fields, fixtures

### AI Research Tools Used

11. **Perplexity AI - Deployment Workflow Query**
    - Query: "What is the correct workflow for deploying custom DocTypes and
      Custom Fields to ERPNext on Frappe Cloud?"
    - Date: 2025-10-21
    - Key Findings: Two-step process (deploy + migrate), bench commands

12. **Perplexity AI - Common Pitfalls Query**
    - Query: "What are common pitfalls when deploying custom apps to Frappe
      Cloud private bench?"
    - Date: 2025-10-21
    - Key Findings: Fixture override problem, migration failures, rollback
      strategies

13. **Perplexity AI - API Verification Query**
    - Query: "How do I verify that custom DocTypes and Custom Fields are
      successfully deployed to ERPNext using the REST API?"
    - Date: 2025-10-21
    - Key Findings: curl examples, authentication methods, status codes

14. **Exa Search - Recent Deployment Guides**
    - Query: "Frappe Cloud custom app deployment 2025 best practices migrations
      SSH"
    - Date: 2025-10-21
    - Results: Community blog posts, GitHub examples, recent forum discussions

---

**Document Version**: 1.0 **Last Updated**: 2025-10-21 **Next Review**: Before
next major deployment (10N-377 completion)
