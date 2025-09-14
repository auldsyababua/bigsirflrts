# Wrangler Configuration Guide for Agents

## Overview

This guide provides complete instructions for agents to use Cloudflare Wrangler in the FLRTS project.

## Setup Completed

✅ Wrangler configuration files created
✅ Authentication with Cloudflare API configured
✅ Helper scripts for common operations
✅ Environment variables properly set

## Quick Start for Agents

### 1. Load Environment

```bash
cd /Users/colinaulds/Desktop/projects/bigsirflrts
source .env
```

### 2. Test Authentication

```bash
wrangler whoami
```

Expected output: Shows "Colin@10netzero.com's Account" with account ID

### 3. Available Commands

#### Using the Wrapper Script (Recommended)

```bash
./scripts/cf-wrangler <command>
```

This automatically loads credentials.

#### Direct Wrangler Commands (after sourcing .env)

```bash
# List zones
wrangler zones list

# Check DNS records
wrangler dns list --zone-id=$CLOUDFLARE_ZONE_ID

# View zone settings
wrangler zone settings list --zone-id=$CLOUDFLARE_ZONE_ID
```

## Credentials Configuration

### API Token Location

The Cloudflare API token is stored in 1Password and accessed via:

```
op://MCP Secrets/kiuuky5sklppnrwqqtjuefjvea/API-TOKEN
```

### Environment Variables

Located in `/Users/colinaulds/Desktop/projects/bigsirflrts/.env`:

- `CLOUDFLARE_API_TOKEN` - Authentication token
- `CLOUDFLARE_ACCOUNT_ID` - Account ID: c4d6c050d2b25309d953d9968592f742
- `CLOUDFLARE_ZONE_ID` - Zone ID for 10nz.tools: 26b8bc8be5ffa06c4850054639bdfbb0

### Loading Credentials

```bash
# Method 1: Source project env file
source /Users/colinaulds/Desktop/projects/bigsirflrts/.env

# Method 2: Use the wrapper script (auto-loads env)
./scripts/cf-wrangler <command>
```

## Project Configuration

### OpenProject Instance

- **URL**: https://ops.10nz.tools
- **VM IP**: 165.227.216.172 (DigitalOcean droplet)
- **Cloudflare Tunnel**: Configured for secure access
- **Port 8080**: Blocked by DigitalOcean firewall (security requirement)

### Wrangler Configuration File

Located at `/Users/colinaulds/Desktop/projects/bigsirflrts/wrangler.toml`:

```toml
name = "ops-10nz-tools"
compatibility_date = "2024-01-01"

[env.production]
name = "ops-10nz-tools-prod"

[[env.production.routes]]
pattern = "ops.10nz.tools/*"
zone_name = "10nz.tools"

[env.production.vars]
OPENPROJECT_URL = "https://ops.10nz.tools"
ENVIRONMENT = "production"
```

## Helper Scripts

### 1. `wrangler-setup.sh`

Location: `/Users/colinaulds/Desktop/projects/bigsirflrts/scripts/wrangler-setup.sh`

Configures Wrangler with Cloudflare credentials from 1Password.

### 2. `cf-wrangler`

Location: `/Users/colinaulds/Desktop/projects/bigsirflrts/scripts/cf-wrangler`

Wrapper script that auto-loads credentials:

```bash
./scripts/cf-wrangler whoami
./scripts/cf-wrangler zones list
```

### 3. `check-cf-dns`

Location: `/Users/colinaulds/Desktop/projects/bigsirflrts/scripts/check-cf-dns`

Checks DNS and SSL settings for ops.10nz.tools:

```bash
./scripts/check-cf-dns
```

### 4. `setup-cf-redirect.sh`

Location: `/Users/colinaulds/Desktop/projects/bigsirflrts/scripts/setup-cf-redirect.sh`

Attempts to set up HTTP->HTTPS redirect (requires additional permissions).

## Common Tasks

### Check Zone Information

```bash
source .env
wrangler zones list | grep 10nz.tools
```

### View DNS Records

```bash
source .env
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=ops.10nz.tools" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq
```

### Check SSL Settings

```bash
source .env
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq
```

## Troubleshooting

### Authentication Issues

1. Ensure MCP environment is sourced:

   ```bash
   source ~/.config/mcp/.env
   ```

2. Verify 1Password access:

   ```bash
   op read "op://MCP Secrets/kiuuky5sklppnrwqqtjuefjvea/API-TOKEN" | head -c 20
   ```

3. Re-run setup if needed:

   ```bash
   ./scripts/wrangler-setup.sh
   ```

### Permission Errors

The current API token has limited permissions. For page rules and advanced settings, use the Cloudflare Dashboard or request an enhanced token.

### Wrangler Command Not Found

Install Wrangler globally:

```bash
npm install -g wrangler
```

## API Token Permissions

Current token permissions:

- ✅ Zone Read
- ✅ DNS Read
- ✅ Account Read
- ❌ Page Rules (requires additional permissions)
- ❌ Zone Settings Edit (requires additional permissions)

For operations requiring additional permissions, use the Cloudflare Dashboard at:
https://dash.cloudflare.com/c4d6c050d2b25309d953d9968592f742

## Important Notes

1. **Always source the environment file** before using Wrangler commands directly
2. **Use the wrapper script** (`cf-wrangler`) for automatic credential loading
3. **The OpenProject instance** is accessible only via HTTPS at ops.10nz.tools
4. **Port 8080 is intentionally blocked** by DigitalOcean firewall for security
5. **HTTP->HTTPS redirect** needs to be configured in Cloudflare Dashboard (insufficient API permissions)

## Quick Reference

```bash
# Setup (run once)
./scripts/wrangler-setup.sh

# Daily use
source .env                          # Load credentials
wrangler whoami                      # Test auth
./scripts/cf-wrangler zones list     # Use wrapper
./scripts/check-cf-dns               # Check DNS settings
```

## Support

If you encounter issues:

1. Check this guide first
2. Verify credentials are loaded: `echo $CLOUDFLARE_API_TOKEN | head -c 20`
3. Re-run setup if needed: `./scripts/wrangler-setup.sh`
4. Check Cloudflare Dashboard for operations requiring elevated permissions
