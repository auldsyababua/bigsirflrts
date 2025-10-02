# ERPNext Deployment Plan - Replace OpenProject at ops.10nz.tools

## Executive Summary

This document outlines the complete plan to replace OpenProject with ERPNext at
`https://ops.10nz.tools` on the DigitalOcean production droplet.

**Key Details:**

- **URL:** ops.10nz.tools (existing subdomain, no DNS changes needed)
- **Database:** Supabase PostgreSQL (external managed database)
- **Storage:** Cloudflare R2 (S3-compatible object storage)
- **Access:** Cloudflare Tunnel (zero-trust, no port exposure)
- **Downtime:** ~5-10 minutes during container swap

## Architecture Overview

### Current (OpenProject)

```
Internet → Cloudflare → Tunnel → openproject:80 → PostgreSQL (local)
                                                 → Memcached
```

### New (ERPNext)

```
Internet → Cloudflare → Tunnel → erpnext-frontend:8080 → erpnext-backend:8000
                                                        → Redis (cache + queue)
                                                        → Supabase PostgreSQL
```

## Files Created

All deployment files are ready in `infrastructure/digitalocean/`:

1. **docker-compose.erpnext.yml** - Complete ERPNext stack configuration
2. **.env.erpnext.example** - Environment variable template
3. **deploy-erpnext.sh** - Automated deployment script
4. **CLOUDFLARE-TUNNEL-SETUP.md** - Tunnel configuration guide
5. **ERPNEXT-DEPLOYMENT-PLAN.md** - This file

## ERPNext Services

The deployment includes 9 services:

| Service              | Purpose                      | Port | Resources           |
| -------------------- | ---------------------------- | ---- | ------------------- |
| erpnext-configurator | One-time setup (exits after) | -    | Minimal             |
| erpnext-backend      | Gunicorn Python app          | 8000 | 1.5 CPU, 3GB RAM    |
| erpnext-frontend     | Nginx web server             | 8080 | 0.5 CPU, 512MB RAM  |
| erpnext-websocket    | Socket.IO real-time          | 9000 | 0.5 CPU, 512MB RAM  |
| erpnext-queue-short  | Fast background jobs         | -    | 0.5 CPU, 1GB RAM    |
| erpnext-queue-long   | Slow background jobs         | -    | 0.5 CPU, 1GB RAM    |
| erpnext-scheduler    | Cron-like scheduler          | -    | 0.25 CPU, 512MB RAM |
| redis-cache          | LRU cache                    | 6379 | 0.25 CPU, 384MB RAM |
| redis-queue          | Job queue                    | 6379 | 0.25 CPU, 384MB RAM |
| cloudflared          | Cloudflare tunnel            | -    | 0.25 CPU, 256MB RAM |

**Total Resources:** ~4 vCPU, ~7GB RAM (within droplet capacity)

## Prerequisites

### 1. Supabase PostgreSQL Credentials

Get from
[Supabase Dashboard](https://supabase.com/dashboard/project/thnwlykidzhrsagyjncc/settings/database):

- Host: `aws-0-us-west-1.pooler.supabase.com`
- Port: `5432` (Session mode, NOT transaction mode)
- Database: `postgres`
- User: `postgres.thnwlykidzhrsagyjncc`
- Password: [Get from 1Password: Supabase / BigSirFLRTS / Database Password]

### 2. Cloudflare Tunnel Token

Get from [Cloudflare Dashboard](https://one.dash.cloudflare.com/):

1. Navigate to Zero Trust → Network → Tunnels
2. Find tunnel **ERPNext-ops** (created for the ERPNext deployment)
3. Click _Install connector_ and copy the token from the
   `cloudflared tunnel run --token …` command
4. Store in 1Password: Cloudflare / FLRTS Tunnel / Token

### 3. Cloudflare R2 Credentials (Optional)

For file attachments (can configure later):

- Access Key ID: [1Password: Cloudflare / R2 / Access Keys]
- Secret Access Key: [1Password]
- Endpoint: `https://<account_id>.r2.cloudflarestorage.com`
- Bucket: `10netzero-docs`

### 4. SSH Access to Droplet

Ensure you can SSH to the droplet:

```bash
ssh root@165.227.216.172
# or
ssh do-openproject
```

## Deployment Steps

### Step 1: Prepare Environment File

On the DigitalOcean droplet:

```bash
cd /root  # or wherever the infrastructure files are located
cd infrastructure/digitalocean

# Copy example to actual env file
cp .env.erpnext.example .env.erpnext

# Edit with your credentials
nano .env.erpnext
```

Fill in these REQUIRED variables:

```bash
ERPNEXT_VERSION=latest
SUPABASE_DB_HOST=aws-0-us-east-2.pooler.supabase.com
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.thnwlykidzhrsagyjncc
SUPABASE_DB_PASSWORD=<from-1password>
FRAPPE_ADMIN_PASSWORD=<create-strong-password>
CLOUDFLARE_TUNNEL_TOKEN=<from-cloudflare-dashboard>
```

### Step 2: Run Deployment Script

The script handles everything automatically:

```bash
# Full deployment with backups
sudo bash deploy-erpnext.sh

# Skip backup if you're confident (faster)
sudo bash deploy-erpnext.sh --skip-backup

# Keep OpenProject data for rollback
sudo bash deploy-erpnext.sh --keep-openproject-data
```

The script will:

1. ✓ Check prerequisites (Docker, env file, etc.)
2. ✓ Backup OpenProject database and volumes
3. ✓ Stop OpenProject containers
4. ✓ Remove OpenProject containers (optionally keep volumes)
5. ✓ Pull ERPNext images
6. ✓ Start Redis containers
7. ✓ Run ERPNext configurator
8. ✓ Create ERPNext site at ops.10nz.tools
9. ✓ Install ERPNext application
10. ✓ Enable scheduler
11. ✓ Start all ERPNext services
12. ✓ Verify deployment

### Step 3: Verify Deployment

After deployment completes:

**Check Container Status:**

```bash
docker ps | grep erpnext
```

Should show 7-8 running containers (configurator exits after setup).

**Test Internal Access:**

```bash
curl http://localhost:8080/api/method/ping
```

Should return: `{"message":"pong"}`

**Test External Access:**

```bash
curl -I https://ops.10nz.tools
```

Should return: `HTTP/2 200` with `server: cloudflare`

**Check Cloudflare Tunnel:**

```bash
docker logs flrts-cloudflared --tail 20
```

Look for: `INF Registered tunnel connection`

### Step 4: Access ERPNext UI

1. Open browser: <https://ops.10nz.tools>
2. Login with:
   - **Username:** Administrator
   - **Password:** (from FRAPPE_ADMIN_PASSWORD in .env.erpnext)

3. Complete setup wizard:
   - Company: 10NetZero
   - Country: United States
   - Timezone: America/Los_Angeles
   - Currency: USD

4. Enable Field Service Management module:
   - Go to: Setup → Modules → Field Service Management
   - Click "Enable"

### Step 5: Configure Custom Fields

Add custom fields to Maintenance Visit DocType:

```bash
docker exec -it flrts-erpnext-backend bench --site ops.10nz.tools console
```

Then in the console:

```python
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

# Add custom fields for FLRTS integration
fields = [
    {
        'dt': 'Maintenance Visit',
        'fieldname': 'custom_site',
        'label': 'Site',
        'fieldtype': 'Link',
        'options': 'Location',
        'insert_after': 'customer'
    },
    {
        'dt': 'Maintenance Visit',
        'fieldname': 'custom_assignee',
        'label': 'Assignee',
        'fieldtype': 'Link',
        'options': 'User',
        'insert_after': 'custom_site'
    },
    {
        'dt': 'Maintenance Visit',
        'fieldname': 'custom_due_date',
        'label': 'Due Date',
        'fieldtype': 'Date',
        'insert_after': 'custom_assignee'
    },
    {
        'dt': 'Maintenance Visit',
        'fieldname': 'custom_due_time',
        'label': 'Due Time',
        'fieldtype': 'Time',
        'insert_after': 'custom_due_date'
    },
    {
        'dt': 'Maintenance Visit',
        'fieldname': 'custom_priority',
        'label': 'Priority',
        'fieldtype': 'Select',
        'options': 'low\nnormal\nhigh\nurgent',
        'insert_after': 'custom_due_time'
    },
    {
        'dt': 'Maintenance Visit',
        'fieldname': 'custom_telegram_message_id',
        'label': 'Telegram Message ID',
        'fieldtype': 'Data',
        'insert_after': 'custom_priority'
    },
    {
        'dt': 'Maintenance Visit',
        'fieldname': 'custom_parser_log_id',
        'label': 'Parser Log ID',
        'fieldtype': 'Data',
        'insert_after': 'custom_telegram_message_id'
    }
]

for field in fields:
    create_custom_field(field)
```

### Step 6: Create API Keys

For FLRTS services to connect:

1. Go to: User → Administrator → API Access
2. Click "Generate Keys"
3. Copy API Key and API Secret
4. Store in 1Password: ERPNext / ops.10nz.tools / API Credentials

Update FLRTS services with:

```bash
ERPNEXT_URL=https://ops.10nz.tools
ERPNEXT_API_KEY=<api-key>
ERPNEXT_API_SECRET=<api-secret>
```

## Verification Checklist

After deployment:

- [ ] ERPNext web UI accessible at <https://ops.10nz.tools>
- [ ] Can login as Administrator
- [ ] Field Service Management module enabled
- [ ] Custom fields added to Maintenance Visit
- [ ] API keys generated and stored
- [ ] All containers running (docker ps)
- [ ] Cloudflare tunnel healthy (green in dashboard)
- [ ] Health endpoint responding: /api/method/ping
- [ ] No errors in logs: `docker compose logs -f`

## Troubleshooting

### Container Won't Start

```bash
# Check logs for specific service
docker logs flrts-erpnext-backend --tail 50

# Check all ERPNext services
docker compose -f docker-compose.erpnext.yml logs -f
```

### Database Connection Failed

Check Supabase credentials:

```bash
grep SUPABASE .env.erpnext
```

Test connection:

```bash
docker exec flrts-erpnext-backend \
  psql -h aws-0-us-west-1.pooler.supabase.com \
       -p 5432 \
       -U postgres.thnwlykidzhrsagyjncc \
       -d postgres -c "SELECT version();"
```

### Cloudflare Tunnel Not Working

```bash
# Restart tunnel
docker compose -f docker-compose.erpnext.yml restart cloudflared

# Check tunnel logs
docker logs flrts-cloudflared --tail 50

# Verify tunnel in Cloudflare dashboard
# Should show "HEALTHY" status
```

### 502 Bad Gateway

ERPNext frontend can't reach backend:

```bash
# Check backend is running
docker ps | grep erpnext-backend

# Test internal connectivity
docker exec flrts-cloudflared curl -I http://erpnext-frontend:8080
```

## Rollback Plan

If deployment fails, rollback to OpenProject:

```bash
# Stop ERPNext
docker compose -f docker-compose.erpnext.yml down

# Start OpenProject
docker compose -f docker-compose.prod.yml up -d openproject openproject-db memcached cloudflared

# Restore database if needed
gunzip -c backups/openproject_db_TIMESTAMP.sql.gz | \
  docker exec -i flrts-openproject-db psql -U openproject -d openproject
```

## Post-Deployment

### Monitor Resources

```bash
# Check container resource usage
docker stats

# Monitor droplet resources
htop
df -h
```

### Configure Backups

Edit crontab for daily ERPNext backups:

```bash
crontab -e
```

Add:

```
0 2 * * * docker exec flrts-erpnext-backend bench --site ops.10nz.tools backup
0 3 * * * find /root/infrastructure/digitalocean/backups -name "*.sql.gz" -mtime +7 -delete
```

### Update Linear Issue

Update [10N-228](https://linear.app/10netzero/issue/10N-228) with:

- Deployment completion date
- Admin credentials location (1Password)
- Any issues encountered
- Mark task as complete

## Next Steps (Phase 2)

After ERPNext is deployed and verified:

1. **Configure FLRTS Services**
   ([10N-232](https://linear.app/10netzero/issue/10N-232))
   - Update sync-service to use ERPNext API
   - Update nlp-service with ERPNext endpoints
   - Test Telegram → ERPNext flow

2. **Data Migration** (if needed)
   - Export OpenProject data
   - Transform to ERPNext format
   - Import into ERPNext

3. **Custom DocTypes** (if needed)
   - FLRTS List (for list feature)
   - Additional custom fields

4. **Integration Testing**
   - End-to-end Telegram bot flow
   - API endpoint testing
   - Performance testing

## Support & References

- **ERPNext Documentation:** <https://docs.erpnext.com/>
- **frappe_docker GitHub:** <https://github.com/frappe/frappe_docker>
- **Cloudflare Tunnel Docs:**
  <https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/>
- **Linear Epic:**
  [10N-227](https://linear.app/10netzero/issue/10N-227/erpnext-backend-adoption)

## Summary

This deployment replaces OpenProject with ERPNext at the same URL
(ops.10nz.tools) with minimal downtime. The automated script handles the
complete migration, including backups, container swap, and verification.

**Estimated Time:** 15-30 minutes (depending on image download speed)

**Risk Level:** Low (backups created, rollback available, zero-trust tunnel
remains active)

**Success Criteria:** ERPNext accessible at <https://ops.10nz.tools> with FSM
module enabled and API keys generated.
