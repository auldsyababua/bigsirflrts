# FLRTS Extensions Deployment Guide

## 1. Prerequisites

- Frappe Cloud Private Bench provisioned
- SSH access configured (6-hour certificate)
- GitHub repository created for flrts_extensions
- Git configured locally

## 2. Local Development Setup

- Clone the bigsirflrts repository
- Navigate to flrts_extensions directory
- Initialize Git repository
- Create initial commit

## 3. GitHub Repository Setup

- Create new repository: `auldsyababua/flrts_extensions`
- Add remote:
  `git remote add origin https://github.com/auldsyababua/flrts_extensions.git`
- Push to GitHub: `git push -u origin main`
- Verify repository is accessible

## 4. Frappe Cloud Deployment

### Step 4.1: Add App to Bench

1. Navigate to Frappe Cloud dashboard
2. Select bench: `bench-27276-000002-f1-virginia`
3. Go to "Apps" tab
4. Click "Add App"
5. Select "GitHub" as source
6. Enter repository URL: `https://github.com/auldsyababua/flrts_extensions.git`
7. Select branch: `main`
8. Click "Add App"
9. Wait for app to be pulled and installed on bench (5-10 minutes)

### Step 4.2: Install App on Site

1. Navigate to site: `builder-rbt-sjk.v.frappe.cloud`
2. Go to "Apps" tab
3. Find "flrts_extensions" in available apps list
4. Click "Install"
5. Wait for installation to complete (2-5 minutes)

### Step 4.3: Run Database Migrations

Frappe Cloud UI installation does NOT automatically run migrations. Must be done
via SSH:

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
set -e
cd ~/frappe-bench
bench --site builder-rbt-sjk.v.frappe.cloud migrate
bench restart
EOF
```

This command:

- Runs database migrations (creates DocTypes, adds custom fields)
- Restarts services to load new code
- Takes 1-2 minutes to complete

## 5. Verification Steps

### Step 5.1: Verify DocTypes Created

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud console
frappe.get_doc("DocType", "FLRTS Parser Log")
frappe.get_doc("DocType", "FLRTS User Preference")
EOF
```

Expected: Both commands return DocType objects without errors.

### Step 5.2: Verify Custom Fields on Maintenance Visit

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud console
frappe.get_meta("Maintenance Visit").get_field("custom_telegram_message_id")
EOF
```

Expected: Returns field object with fieldtype "Data".

### Step 5.3: Test REST API Access

```bash
curl -X GET "https://ops.10nz.tools/api/resource/FLRTS Parser Log" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"
```

Expected: Returns JSON with empty data array (no logs yet) and status 200.

### Step 5.4: Test Lambda Integration

Update Lambda environment variables and test task creation:

```bash
# From Lambda test event
{
  "message": {
    "text": "Colin check pump at Big Sky",
    "from": {"id": 123, "username": "colin"},
    "chat": {"id": 456}
  }
}
```

Expected:

- Lambda returns 200 OK
- Maintenance Visit created in ERPNext
- FLRTS Parser Log entry created
- Telegram confirmation sent

## 6. Rollback Procedure

If deployment fails or causes issues:

### Step 6.1: Uninstall App from Site

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
set -e
bench --site builder-rbt-sjk.v.frappe.cloud uninstall-app flrts_extensions
bench restart
EOF
```

### Step 6.2: Remove App from Bench

1. Navigate to Frappe Cloud dashboard
2. Select bench → Apps tab
3. Find flrts_extensions
4. Click "Remove"

### Step 6.3: Restore from Backup (if needed)

Frappe Cloud provides automated backups with PITR. Contact Frappe Cloud support
to restore if data corruption occurs.

## 7. Troubleshooting

### Issue: App installation fails

**Symptoms:** Frappe Cloud shows "Installation Failed" error **Causes:**

- Invalid setup.py or hooks.py syntax
- Missing required files (**init**.py)
- Git repository not accessible

**Solution:**

1. Check Frappe Cloud logs for specific error
2. Fix syntax errors in local repository
3. Commit and push fixes
4. Retry installation

### Issue: Migrations fail

**Symptoms:** `bench migrate` command fails with error **Causes:**

- Invalid DocType JSON syntax
- Duplicate field names
- Invalid field types

**Solution:**

1. Check error message for specific field/DocType
2. Fix JSON syntax in local repository
3. Commit and push fixes
4. Remove app from bench and reinstall

### Issue: Custom fields not appearing

**Symptoms:** Custom fields not visible in Maintenance Visit form **Causes:**

- Fixtures not loaded during installation
- Migration not run after installation

**Solution:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud migrate
bench --site builder-rbt-sjk.v.frappe.cloud clear-cache
bench restart
EOF
```

### Issue: Server Script not executing

**Symptoms:** estimated_cost_usd field not calculated automatically **Causes:**

- Server Script not registered in hooks.py
- Syntax error in Server Script

**Solution:**

1. Verify doc_events registration in hooks.py
2. Check Server Script syntax
3. View error logs:
   `tail -50 sites/builder-rbt-sjk.v.frappe.cloud/logs/error.log`

## 8. Post-Deployment Tasks

### Update Lambda Environment Variables

Ensure Lambda has correct ERPNext credentials:

- `ERPNEXT_API_KEY`: API key from ERPNext user
- `ERPNEXT_API_SECRET`: API secret from ERPNext user
- `ERPNEXT_BASE_URL`: <https://ops.10nz.tools>

### Create Initial User Preferences

For each FLRTS user, create a FLRTS User Preference record:

1. Navigate to ERPNext: FLRTS → FLRTS User Preference
2. Click "New"
3. Select User
4. Set Telegram User ID (if known)
5. Set Timezone
6. Set Default Priority
7. Save

### Configure Monitoring Thresholds

Set alert thresholds via System Settings:

1. Navigate to: ERPNext → Settings → System Settings
2. Scroll to "Custom Fields" section (added by flrts_extensions)
3. Configure thresholds:
   - **FLRTS Success Rate Threshold:** 80.0 (alert if below)
   - **FLRTS Daily Cost Threshold:** 10.00 (alert if above)
   - **FLRTS Monthly Cost Threshold:** 300.00 (alert if above)
   - **FLRTS Alert Emails:** <dev-team@10nz.tools>,<finance@10nz.tools>
     (comma-separated)
4. Save System Settings

**Verify Scheduler Running:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud scheduler status
EOF
```

Expected output: `Scheduler is active`

If scheduler is inactive:

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud scheduler enable
bench --site builder-rbt-sjk.v.frappe.cloud scheduler resume
EOF
```

### Test Monitoring Features

**Test Success Rate Monitor:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud execute flrts_extensions.flrts.server_script.flrts_parser_log_success_rate_monitor.execute
EOF
```

Expected:

- If success rate <80%: Email sent to configured addresses
- If success rate >=80%: No email, success logged
- Check email inbox for alert (if triggered)

**Test Cost Monitor:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud execute flrts_extensions.flrts.server_script.flrts_daily_cost_monitor.execute
EOF
```

Expected:

- If daily cost >$10: Email sent to configured addresses
- If daily cost <=$10: No email, success logged

**Test Custom Reports:**

1. Log in to ERPNext: <https://ops.10nz.tools>
2. Navigate to: FLRTS → Reports
3. Open each report:
   - Parser Performance Dashboard
   - OpenAI Cost Tracking
   - Telegram Message Volume
4. Verify data loads correctly
5. Apply filters and verify results update
6. Export to PDF/Excel to verify export functionality

### Test End-to-End Flow

Send a test message via Telegram and verify:

1. Lambda receives webhook
2. OpenAI parses message
3. Maintenance Visit created with custom fields
4. FLRTS Parser Log entry created
5. Telegram confirmation sent

## 9. Monitoring

### Monitor App Health

**Check Scheduled Jobs:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
# View scheduler logs
tail -100 sites/builder-rbt-sjk.v.frappe.cloud/logs/scheduler.log

# Check for errors in scheduled jobs
grep -i error sites/builder-rbt-sjk.v.frappe.cloud/logs/scheduler.log | tail -20
EOF
```

**Check Custom Reports:**

- Navigate to: ERPNext → FLRTS → Reports
- Verify all 3 reports load without errors
- Check data freshness (should include today's data)

**Check Email Alerts:**

- Verify emails received at configured addresses
- Check spam folder if not received
- Verify email content includes all required metrics

**Monitor Parser Success Rate:**

- Target: >80%
- Check daily via Parser Performance Dashboard
- Investigate if drops below 70%

**Monitor OpenAI Costs:**

- Target: <$10/day, <$300/month
- Check daily via OpenAI Cost Tracking report
- Optimize prompts if costs trending upward

Reference: `docs/monitoring/telegram-bot-monitoring.md` for complete monitoring
guide.

## 10. Future Enhancements

### Add Unit Tests

Create test files in `flrts_extensions/flrts_extensions/tests/`:

- `test_flrts_parser_log.py` - Test validation logic
- `test_flrts_user_preference.py` - Test uniqueness constraints
- `test_cost_calculation.py` - Test Server Script

### Add Custom Reports

Create Custom Reports for analytics:

- Parser Performance Dashboard
- Failed Parse Analysis
- Cost Tracking Report

### Add Scheduled Jobs

Add scheduled jobs in hooks.py for:

- Daily cost summary emails
- Weekly parser success rate reports
- Monthly OpenAI spend alerts

Reference: `docs/reference/frappe-cloud-ssh-access-for-agents.md` for SSH
patterns and
`docs/research/A Git-Centric Development and Deployment Strategy for Custom ERPNext Applications on Frappe Cloud.md`
for deployment workflow details.
