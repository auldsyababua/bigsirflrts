# ERPNext Deployment Monitoring Checklist

**Last Updated:** 2025-10-07 **Issue:** 10N-272 **Context:** Manual workflow for
Frappe Cloud Git push-to-deploy verification

---

## Overview

This checklist documents the approved MVP workflow for monitoring ERPNext custom
app deployments to Frappe Cloud. When you push code to the linked Git branch,
Frappe Cloud automatically triggers `bench migrate` during the deployment
process. Use this 4-step workflow to verify migrations complete successfully.

**Estimated Time:** ~12-20 minutes per deploy

**When to Use:**

- After pushing custom app code to production branch
- Following schema migrations or patch additions
- When troubleshooting deployment issues
- During scheduled auto-updates (1-4 AM window)

**Prerequisites:**

- Administrator access to <https://ops.10nz.tools>
- SSH access to Frappe Cloud bench (Private Bench plan required)
- Fresh SSH certificate from Frappe Cloud Developer Settings (expires 12-24h)

---

## Step 1: Check Deployment Status (2 min)

**Purpose:** Verify the deployment completed successfully and identify any
immediate failures.

### Navigation

1. Log into Frappe Cloud Dashboard
2. Navigate to your Bench Group
3. Click **Deploys** tab
4. Find the latest deployment by commit hash or timestamp

### What to Check

**Deployment Badge:**

- ✅ **Success** - Deployment completed without errors
- ⚠️ **Running** - Deployment in progress (wait for completion)
- ❌ **Failed** - Deployment encountered errors (proceed to troubleshooting)

**Stage Breakdown:** Expand the deployment to view stage-by-stage progress:

1. **Clone** - Fetch latest code from Git
2. **Build** - Install dependencies, run setup
3. **Migrate** - Execute `bench migrate` (schema changes, patches)
4. **Restart** - Reload application processes

**Migration Logs:**

- Click the **Migrate** stage
- Scan output for:
  - Patch execution confirmations
  - Schema sync operations
  - Warning messages (may be benign)
  - Error tracebacks (critical failures)

### Common Indicators

**Success Indicators:**

```
Migrating builder-rbt-sjk.v.frappe.cloud
Executing flrts_extensions.patches.v0_0.add_custom_fields
Syncing DocType schemas...
Migration complete for site builder-rbt-sjk.v.frappe.cloud
```

**Failure Indicators:**

```
frappe.exceptions.ValidationError: Field type mismatch
Patch execution failed: flrts_extensions.patches.v0_0.problematic_patch
Job timed out after 600 seconds
```

---

## Step 2: SSH Log Inspection (3-5 min, if issues suspected)

**Purpose:** Access detailed error logs when Deployment Dashboard doesn't
provide sufficient context.

### SSH Connection

Use the helper script to connect:

```bash
# From project root
./scripts/ssh-frappe-bench.sh
```

**Manual connection (if script unavailable):**

```bash
ssh bench-27276-000002-f1-virginia@n1-virginia.frappe.cloud -p 2222
# You will be in /home/frappe/frappe-bench
```

**SSH Certificate Refresh:** If connection fails with "Permission denied":

1. Frappe Cloud Dashboard → Developer Settings
2. Generate new SSH certificate (expires 12-24h)
3. Update local `~/.ssh/config` or use password from dashboard

### Log File Locations

Navigate to logs directory:

```bash
cd logs
ls -lh  # View available log files
```

**Key Log Files:**

- `web.log` / `web.err.log` - Web process STDOUT/STDERR (migration errors during
  sync)
- `worker.log` / `worker.err.log` - Background job logs (data migration patches)

### Inspection Commands

**Tail recent entries:**

```bash
tail -50 worker.err.log web.err.log
```

**Search for migration-related errors:**

```bash
grep -i "migration\|patch\|frappe.exceptions" worker.err.log | tail -20
```

**Follow logs in real-time (during active deploy):**

```bash
tail -f worker.err.log web.err.log
# Press Ctrl+C to stop
```

**Jump to end of file and scroll up:**

```bash
less +G worker.err.log
# Use arrow keys to navigate, / to search, q to quit
```

### What to Look For

**Critical Errors:**

- Python tracebacks with line numbers
- SQL errors (syntax errors, constraint violations)
- Import errors (missing dependencies)
- Timeout messages (large data patches)

**Benign Warnings (safe to ignore):**

- Deprecation warnings from dependencies
- Cache rebuild notices
- Non-critical permission warnings

### Example Error Investigation

```bash
# See full traceback for recent error
grep -A 20 "Traceback (most recent call last)" worker.err.log | tail -30

# Check if error occurred during specific patch
grep "flrts_extensions.patches" worker.err.log
```

---

## Step 3: Verify Patches Executed (2 min, via Patch Log DocType)

**Purpose:** Confirm individual patches ran successfully, even if deployment
shows "Success" (protects against silent failures).

### Access Bench Console

From SSH session:

```bash
bench --site builder-rbt-sjk.v.frappe.cloud console
```

**Important:** Use the internal site name `builder-rbt-sjk.v.frappe.cloud`, not
the custom domain `ops.10nz.tools`.

### Query Patch Log

**Check today's patches:**

```python
import frappe
patches = frappe.db.get_all('Patch Log',
    filters={'executed': ['>=', '2025-10-07']},  # Replace with today's date
    fields=['patch', 'executed', 'skipped'],
    order_by='executed desc')

for p in patches:
    print(f"{p.executed} - {p.patch} (skipped: {p.skipped})")
```

**Check custom app patches only:**

```python
patches = frappe.db.get_all('Patch Log',
    filters={'patch': ['like', '%flrts_extensions%']},
    fields=['patch', 'executed', 'skipped'],
    order_by='executed desc',
    limit=10)

for p in patches:
    print(f"{p.executed} - {p.patch}")
```

**Verify specific patch:**

```python
result = frappe.db.get_value('Patch Log',
    {'patch': 'flrts_extensions.patches.v0_0.add_custom_fields'},
    ['executed', 'skipped'])
print(f"Executed: {result[0]}, Skipped: {result[1]}")
```

### Interpreting Results

**Success Indicators:**

- Patch appears in results with recent `executed` timestamp
- `skipped` field is `0` (False)

**Failure Indicators:**

- Patch missing from results (never ran)
- `skipped` field is `1` (True) - indicates patch was skipped (check logs for
  why)
- `executed` timestamp is from previous deploy (patch didn't re-run when
  expected)

### Troubleshooting "Patch Already Executed" Errors

If a patch needs to re-run but shows as already executed:

```python
# Delete patch log entry (use with caution!)
frappe.db.delete('Patch Log', {'patch': 'flrts_extensions.patches.v0_0.problematic_patch'})
frappe.db.commit()

# Then SSH: bench --site builder-rbt-sjk.v.frappe.cloud migrate
```

**WARNING:** Only delete patch log entries if you understand the implications.
Re-running data migration patches may cause duplicate data or errors.

---

## Step 4: Functional Smoke Tests (5-10 min)

**Purpose:** Verify schema changes are live and critical workflows function
correctly.

### Access Production Site

1. Navigate to <https://ops.10nz.tools>
2. Log in as Administrator
3. Navigate to Desk (home screen)

### Schema Change Verification

**If custom fields added:**

1. Navigate to affected DocType (e.g., Maintenance Visit)
2. Click **+ Add [DocType]** to open form
3. Scroll to verify new custom fields visible
4. Check field labels, types, and default values match migration

**If new DocType created:**

1. Use Awesomebar (Ctrl+K / Cmd+K) to search for DocType name
2. Verify list view loads without errors
3. Create test record with sample data
4. Save and verify record appears in list view

### Critical Workflow Validation

**Maintenance Visit Flow (example):**

1. Navigate to Support → Maintenance Visit
2. Click **+ Add Maintenance Visit**
3. Fill required fields:
   - Customer (select from dropdown)
   - Maintenance Schedule (if applicable)
   - Custom fields (verify populated)
4. Click **Save**
5. Verify form saves without errors
6. Click **Submit** (if submittable DocType)
7. Navigate back to list view and confirm record appears

**API Integration Checks (if applicable):**

1. Navigate to System Settings → API Access
2. Verify API keys visible (mask secrets in screenshots)
3. Test webhook endpoints if configured (Telegram, n8n)

### Test Cleanup

**Important:** Delete test records after validation to avoid cluttering
production data.

1. Navigate to created test record
2. Click **Actions** → **Delete**
3. Confirm deletion
4. Verify record removed from list view

**Exception:** Keep test records if needed for demo/training purposes, but
clearly label them (e.g., prefix name with "[TEST]").

---

## Common Failure Modes & Troubleshooting

### Deployment Stuck at "Migrating" Stage

**Symptom:** Deployment runs for 10+ minutes without completing.

**Likely Causes:**

- Large data migration patch (processing thousands of records)
- Database deadlock or lock timeout
- Infinite loop in patch logic

**Troubleshooting Steps:**

1. SSH into bench and tail `worker.err.log` for errors
2. Check database process list (if you have MariaDB access - rare on Frappe
   Cloud)
3. If timeout confirmed, split patch into smaller batches or use background jobs

**Mitigation:**

```python
# In patch file, process in batches
def execute():
    batch_size = 100
    total = frappe.db.count('DocType Name')
    for start in range(0, total, batch_size):
        records = frappe.db.get_all('DocType Name',
            fields=['name'],
            limit=batch_size,
            offset=start)
        # Process batch
        frappe.db.commit()  # Commit after each batch
```

---

### Deployment Succeeds but New Fields Not Visible

**Symptom:** Deployment shows "Success" but custom fields missing in UI.

**Likely Causes:**

- Patch executed but skipped (check Patch Log)
- Schema sync failed silently
- Cache not cleared after migration

**Troubleshooting Steps:**

1. Verify patch in Patch Log (Step 3)
2. SSH and check `web.err.log` for schema sync errors
3. Force cache clear:

   ```bash
   bench --site builder-rbt-sjk.v.frappe.cloud clear-cache
   ```

4. Verify field exists in Custom Field DocType:

   ```python
   # In bench console
   frappe.db.exists('Custom Field', {'fieldname': 'your_field_name', 'dt': 'Maintenance Visit'})
   ```

---

### Schema Sync Conflict (Incompatible Data Type)

**Symptom:** Migration fails with
`OperationalError: (1265, "Data truncated for column 'field_name'")`.

**Likely Causes:**

- Changing field type from Text to Int/Float with non-numeric existing data
- Reducing field length below existing data size
- Changing field from nullable to non-nullable with NULL values

**Troubleshooting Steps:**

1. Review migration error traceback for column name and constraint
2. Write data cleanup patch to run BEFORE schema change:

   ```python
   # In patch file (run before schema change patch)
   def execute():
       # Convert empty strings to NULL before changing to Int
       frappe.db.sql("""
           UPDATE `tabMaintenance Visit`
           SET custom_duration = NULL
           WHERE custom_duration = '' OR custom_duration IS NULL
       """)
       frappe.db.commit()
   ```

3. Update `patches.txt` to ensure cleanup patch runs first
4. Re-push and re-deploy

---

### Patch Execution Error (Missing Dependency)

**Symptom:** Migration fails with `ModuleNotFoundError` or `ImportError`.

**Likely Causes:**

- Patch imports module not in `requirements.txt`
- Typo in import statement
- Circular import dependency

**Troubleshooting Steps:**

1. Check error traceback for missing module name
2. Add dependency to `requirements.txt`:

   ```txt
   # flrts_extensions/requirements.txt
   pandas==2.0.0
   ```

3. Commit and push changes
4. Frappe Cloud will reinstall dependencies during next deployment

**Alternative (if dependency temporary):**

```python
# In patch file, lazy import
def execute():
    try:
        import pandas as pd
    except ImportError:
        frappe.log_error("pandas not installed, skipping patch")
        return
    # Proceed with patch logic
```

---

### Silent Failure (Deployment Success, No Patch Execution)

**Symptom:** Deployment shows "Success" but patch never appears in Patch Log.

**Likely Causes:**

- Patch not listed in `patches.txt`
- Patch file syntax error (import fails before execution)
- Patch already executed in previous deploy (not re-run)

**Troubleshooting Steps:**

1. Verify patch listed in `flrts_extensions/patches.txt`:

   ```txt
   flrts_extensions.patches.v0_0.add_custom_fields
   flrts_extensions.patches.v0_0.update_maintenance_visit_data
   ```

2. Check patch file syntax (run locally):

   ```bash
   python -m py_compile flrts_extensions/patches/v0_0/add_custom_fields.py
   ```

3. SSH and manually run patch:

   ```bash
   bench --site builder-rbt-sjk.v.frappe.cloud console
   ```

   ```python
   import frappe
   from flrts_extensions.patches.v0_0 import add_custom_fields
   add_custom_fields.execute()
   frappe.db.commit()
   ```

---

## Rollback Decision Criteria

**When to roll back immediately:**

- Critical DocType inaccessible (e.g., Maintenance Visit returns 500 error)
- Data corruption detected (records missing fields, incorrect values)
- Site completely unresponsive after deploy

**How to roll back:**

1. Frappe Cloud Dashboard → Bench Group → Deploys tab
2. Find previous successful deployment
3. Click **Actions** → **Redeploy**
4. Monitor rollback deployment (same 4-step process)
5. Verify site functional after rollback
6. Fix issue locally, test, and re-deploy

**When to proceed with caution (non-critical issues):**

- Non-essential fields missing
- Visual UI bugs (no data loss)
- Performance degradation (not complete failure)

**Mitigation without rollback:**

- Deploy hotfix patch to address issue
- Disable feature flag if using feature-gated rollout
- Document issue as known bug and schedule fix

---

## When to Revisit Automation

This manual workflow is appropriate for MVP deployments at **<3 deploys/week**.
Consider automating when:

### Triggers

1. **High Deploy Frequency:** >3 deploys/week for 2+ consecutive weeks
2. **Missed Failures:** Production issue discovered hours after failed deploy
   (no immediate alert)
3. **Team Growth:** Second engineer joins team and needs deploy notifications
4. **Off-Hours Deploys:** Scheduled auto-updates (1-4 AM) run frequently and
   require monitoring

### Automation Options (Backlog)

Refer to `docs/.scratch/10n-256/migration-monitoring-observations.md` for
detailed implementation strategies:

**Option 1: Slack Notifications (~8 hours)**

- Create "Deployment Log" DocType in `flrts_extensions`
- Configure Slack Notification via Notification DocType
- Add `after_migrate` hook to log deployments
- **Dependency:** Slack webhook setup

**Option 2: Daily Patch Audit Email (~4 hours)**

- Scheduled job (daily 9 AM) to query Patch Log for last 24 hours
- Compare against expected patches from `patches.txt`
- Send email summary to engineering team

**Option 3: GitHub Actions → Discord Webhook (variable complexity)**

- Post-deploy GitHub Action step
- SSH into bench and query Patch Log via bench console
- Parse output and POST to Discord webhook
- Notify team of deploy success/failure with patch summary

---

## References

### Documentation

- [Frappe Cloud - Updating a Bench](https://frappecloud.com/docs/benches/updating_a_bench)
- [Frappe Cloud - Logs](https://frappecloud.com/docs/logs)
- [Frappe Framework - Migrations](https://docs.frappe.io/framework/user/en/guides/deployment/migrations)
- [Migration Monitoring Research](../docs/.scratch/10n-256/migration-monitoring-observations.md) -
  10N-256 approved workflow

### Internal Resources

- ERPNext Access Guide: `docs/auth/erpnext-access.md`
- SSH Helper Script: `scripts/ssh-frappe-bench.sh`
- ERPNext Admin Map: `docs/erpnext/ERPNext-admin-map.md`

### Related Issues

- 10N-256: ERPNext migration monitoring strategy research
- 10N-272: ERPNext admin map automation & documentation

---

**Last Reviewed:** 2025-10-07 **Next Review:** When deploy frequency changes or
automation becomes necessary
