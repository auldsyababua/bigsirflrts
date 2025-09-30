# Security Fix Summary - Hardcoded Credentials Remediation

**Date**: 2025-09-29 **Severity**: CRITICAL **Module**: Infrastructure
(Module 1) **Issue**: Hardcoded Supabase credentials in
docker-compose.supabase.yml

## Problem

The production Docker Compose file contained hardcoded database credentials:

```yaml
# BEFORE (INSECURE):
DATABASE_URL: 'postgresql://postgres:jda2NZG7czw0jau%40zxa@db.thnwlykidzhrsagyjncc.supabase.co:5432/postgres?schema=openproject'
SECRET_KEY_BASE: ${SECRET_KEY_BASE:-kCB6E+/0HzxTR0yBkBCqNdcntXTpMkLZvpL7K28mZIkiHuDaRVKx1gPihP4VHp2o}
OPENPROJECT_SEED_ADMIN_USER_PASSWORD: ${OPENPROJECT_ADMIN_PASSWORD:-mqsgyCQNQ2q*NCMT8QARXKJqz}
```

**Risks**:

- Database credentials exposed in version control
- Default SECRET_KEY_BASE compromises Rails session security
- Default admin password is publicly known
- Violates security best practices

## Solution

### 1. Created Environment Variable Template

**File**: `infrastructure/digitalocean/.env.example`

Provides a secure template with:

- All required Supabase connection parameters
- Placeholders for sensitive values
- Clear instructions for generating secure keys
- Documentation of each variable's purpose

### 2. Updated Docker Compose File

**File**: `infrastructure/digitalocean/docker-compose.supabase.yml`

**Changes**:

- Replaced hardcoded DATABASE_URL with environment variables:

  ```yaml
  DATABASE_URL: 'postgresql://${SUPABASE_DB_USER}:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}?schema=${SUPABASE_DB_SCHEMA}'
  ```

- Removed default values from SECRET_KEY_BASE (now required)
- Removed default values from admin credentials (now required)
- Made all sensitive configuration externalized

### 3. Updated Deployment Documentation

**File**: `infrastructure/digitalocean/DEPLOYMENT_GUIDE.md`

**Major Updates**:

- Updated architecture diagram to reflect Supabase (no local PostgreSQL)
- Added comprehensive environment variable setup instructions
- Documented Supabase connection parameters
- Added security checklist items for credential management
- Updated backup procedures for Supabase
- Corrected resource allocation (removed PostgreSQL container)
- Updated cost breakdown to include Supabase Pro
- Added security notes about credential rotation

## Deployment Instructions

### For New Deployments

1. Copy the environment template:

   ```bash
   cp infrastructure/digitalocean/.env.example /root/.env
   ```

2. Generate secure values:

   ```bash
   # Generate SECRET_KEY_BASE
   echo "SECRET_KEY_BASE=$(openssl rand -hex 64)" >> /root/.env

   # Generate admin password
   echo "OPENPROJECT_ADMIN_PASSWORD=$(openssl rand -base64 32)" >> /root/.env
   ```

3. Fill in Supabase credentials from dashboard:
   - Get from:
     <https://supabase.com/dashboard/project/thnwlykidzhrsagyjncc/settings/database>

4. Fill in Cloudflare R2 and Tunnel credentials

5. Deploy:

   ```bash
   cd /root
   docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml up -d
   ```

### For Existing Deployments

**CRITICAL**: Existing deployments need to migrate to environment variables!

1. SSH to the server:

   ```bash
   ssh root@165.227.216.172
   ```

2. Create `.env` file with current credentials:

   ```bash
   cd /root
   cat > .env << 'EOF'
   # Supabase Database
   SUPABASE_DB_USER=postgres
   SUPABASE_DB_PASSWORD=jda2NZG7czw0jau@zxa
   SUPABASE_DB_HOST=db.thnwlykidzhrsagyjncc.supabase.co
   SUPABASE_DB_PORT=5432
   SUPABASE_DB_NAME=postgres
   SUPABASE_DB_SCHEMA=openproject

   # OpenProject Security
   SECRET_KEY_BASE=kCB6E+/0HzxTR0yBkBCqNdcntXTpMkLZvpL7K28mZIkiHuDaRVKx1gPihP4VHp2o
   OPENPROJECT_ADMIN_USERNAME=admin
   OPENPROJECT_ADMIN_PASSWORD=mqsgyCQNQ2q*NCMT8QARXKJqz
   OPENPROJECT_HOST_NAME=ops.10nz.tools
   OPENPROJECT_HTTPS=true

   # Cloudflare R2 (fill in actual values)
   R2_ACCESS_KEY_ID=your-key-here
   R2_SECRET_ACCESS_KEY=your-secret-here
   R2_ENDPOINT=your-endpoint-here
   R2_BUCKET=10netzero-docs

   # Cloudflare Tunnel (fill in actual value)
   CLOUDFLARE_TUNNEL_TOKEN=your-token-here
   EOF

   chmod 600 .env
   ```

3. Pull latest compose file:

   ```bash
   git pull origin main
   ```

4. Restart with new configuration:

   ```bash
   docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml down
   docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml up -d
   ```

5. Verify deployment:

   ```bash
   docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml ps
   docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml logs openproject
   ```

6. **IMPORTANT**: Rotate credentials after migration:

   ```bash
   # Generate new SECRET_KEY_BASE
   openssl rand -hex 64

   # Update .env with new value
   nano .env

   # Restart
   docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml restart
   ```

## Security Checklist

- [x] Hardcoded credentials removed from docker-compose.supabase.yml
- [x] Environment variable template created (.env.example)
- [x] Documentation updated to reflect secure practices
- [x] .env file already in .gitignore
- [ ] Existing deployment migrated to use .env file
- [ ] Credentials rotated after migration
- [ ] Credentials stored in 1Password or secure password manager
- [ ] Admin password changed from default
- [ ] Quarterly credential rotation scheduled

## Files Modified

1. `infrastructure/digitalocean/docker-compose.supabase.yml` - Removed hardcoded
   credentials
2. `infrastructure/digitalocean/.env.example` - Created secure template
3. `infrastructure/digitalocean/DEPLOYMENT_GUIDE.md` - Updated for Supabase
   architecture
4. `infrastructure/digitalocean/SECURITY_FIX_SUMMARY.md` - This file

## References

- **Audit Report**: `audit-results/infrastructure-audit.json`
- **ADR-002**: Supabase-only architecture decision
- **ADR-003**: Supabase connection pooling approach
- **Production Server**: ssh root@165.227.216.172
- **OpenProject URL**: <https://ops.10nz.tools>

## Next Steps

1. Deploy this fix to production server (see "For Existing Deployments" above)
2. Rotate all credentials after migration
3. Store new credentials in 1Password
4. Update audit report to mark issue as resolved
5. Schedule quarterly credential rotation
6. Consider implementing automated secret scanning in CI/CD
