# OpenProject Deployment Documentation

## Overview

OpenProject has been successfully deployed to DigitalOcean with Supabase
PostgreSQL backend and Cloudflare R2 for file storage.

**Live URL**: https://ops.10nz.tools

## Infrastructure Components

### DigitalOcean Droplet

- **Name**: flrts-openproject-prod
- **IP**: 165.227.216.172
- **SSH Access**:
  ```bash
  ssh do-openproject
  ssh flrts-prod
  ssh root@165.227.216.172
  ```

### Supabase Database

- **Project**: FLRTS
- **Project ID**: thnwlykidzhrsagyjncc
- **Host**: db.thnwlykidzhrsagyjncc.supabase.co
- **Schema**: Currently using `public` (should be `openproject`)

### Cloudflare Services

- **R2 Bucket**: 10netzero-docs
- **Tunnel**: Managed tunnel providing HTTPS access
- **Domain**: ops.10nz.tools

## Configuration Files

### Local Files

- `.env` - Contains R2 credentials and API keys
- `.env.digitalocean` - OpenProject credentials and deployment config
- `~/.ssh/config` - SSH aliases for droplet access

### Server Files (on droplet)

- `/root/docker-compose.yml` - Main configuration
- `/root/.env` - Environment variables
- `/root/cloudflared-config.yml` - Tunnel configuration

## Docker Services

### Running Containers

```yaml
openproject: # Main application on port 8080
openproject-migrate: # Database migration container
cloudflared: # Cloudflare tunnel for HTTPS
```

## Known Issues

### Schema Configuration

- **Issue**: Data is being stored in `public` schema instead of `openproject`
  schema
- **Impact**: Task #38 and attachments are in public.work_packages
- **Status**: Configuration updated but needs migration decision

### Potential Solutions

1. Migrate existing data to openproject schema
2. Continue using public schema
3. Fresh installation with correct schema

## Credentials

### OpenProject Admin

- **Username**: admin
- **Password**: mqsgyCQNQ2q\*NCMT8QARXKJqz

### Database

- **Password**: See `.env.digitalocean`
- **SECRET_KEY_BASE**: See `.env.digitalocean`

## Common Operations

### Restart Services

```bash
ssh do-openproject
cd /root
docker compose down
docker compose up -d
```

### Check Logs

```bash
docker logs openproject
docker logs cloudflared
docker logs root-openproject-migrate-1
```

### Database Queries

```bash
# Using Supabase MCP tools
mcp__supabase__execute_sql
project_id: thnwlykidzhrsagyjncc
query: SELECT * FROM public.work_packages;
```

## Backup and Recovery

### Database

- Automatic backups via Supabase
- Manual backup: Use Supabase dashboard

### Configuration

- Docker compose backup: `/root/docker-compose.yml.backup-r2-config`
- Environment backup in `.env.digitalocean`

## Testing Checklist

- [x] OpenProject accessible via HTTPS
- [x] Admin login functional
- [x] Task creation works (Task #38)
- [x] Database connectivity confirmed
- [ ] R2 attachment storage verified
- [ ] Schema migration completed

## Support Information

- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Supabase Dashboard**: https://app.supabase.com
- **DigitalOcean Console**: https://cloud.digitalocean.com

## Last Updated

September 18, 2025 - Initial deployment with Supabase and R2 configuration
