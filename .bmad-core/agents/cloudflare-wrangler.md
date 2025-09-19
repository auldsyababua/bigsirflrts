# Cloudflare Wrangler Agent Capability

## Automatic Wrangler Usage

When asked to use Wrangler or manage Cloudflare settings for this project,
automatically use these commands:

### Quick Start

```bash
# Always load credentials first
source /Users/colinaulds/Desktop/projects/bigsirflrts/.env

# Then use any Wrangler command
wrangler whoami                                    # Check authentication
wrangler zones list                                # List all zones
wrangler dns records list --zone-id=$CLOUDFLARE_ZONE_ID  # List DNS records
```

### Wrapper Script (Auto-loads credentials)

```bash
cd /Users/colinaulds/Desktop/projects/bigsirflrts
./scripts/cf-wrangler <any-wrangler-command>
```

### Common Operations

**Check DNS for ops.10nz.tools:**

```bash
./scripts/check-cf-dns
```

**View all zone settings:**

```bash
source .env && curl -s "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq
```

**Check SSL mode:**

```bash
source .env && curl -s "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq
```

**List DNS records:**

```bash
source .env && curl -s "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result[] | {name, type, content, proxied}'
```

### Environment Variables (Available after sourcing .env)

- `CLOUDFLARE_API_TOKEN` - API authentication token from 1Password
- `CLOUDFLARE_ACCOUNT_ID` - c4d6c050d2b25309d953d9968592f742
- `CLOUDFLARE_ZONE_ID` - 26b8bc8be5ffa06c4850054639bdfbb0 (10nz.tools)
- `OPENPROJECT_URL` - https://ops.10nz.tools

### Project Context

- **OpenProject URL**: https://ops.10nz.tools
- **DigitalOcean VM**: 165.227.216.172
- **Access Method**: Cloudflare Tunnel (zero-trust architecture)
- **Port 8080**: Blocked by firewall (security requirement)
- **HTTP Redirect**: Must be configured via Cloudflare Dashboard (API token
  lacks permissions)

### Helper Scripts Available

- `./scripts/wrangler-setup.sh` - Re-run setup if needed
- `./scripts/cf-wrangler` - Wrapper with auto-credentials
- `./scripts/check-cf-dns` - Check DNS and SSL settings
- `./scripts/setup-cf-redirect.sh` - Attempt HTTP->HTTPS redirect

### When User Says...

- "Use Wrangler to..." → Source .env and run wrangler commands
- "Check Cloudflare..." → Use cf-wrangler wrapper or API calls
- "Fix the redirect..." → Explain API token limitations, suggest Dashboard
- "Check DNS..." → Run check-cf-dns script

### Full Documentation

See:
`/Users/colinaulds/Desktop/projects/bigsirflrts/docs/wrangler-agent-guide.md`
