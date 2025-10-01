# Cloudflare Tunnel Configuration for ERPNext

## Overview

The Cloudflare Tunnel provides zero-trust secure access to ERPNext at
**ops.10nz.tools** without exposing any ports directly to the internet.

## Architecture

```
Internet → Cloudflare CDN → Cloudflare Tunnel → cloudflared container → erpnext-frontend:8080
```

## Current Configuration

- **Subdomain:** ops.10nz.tools
- **Target Service:** erpnext-frontend container (nginx on port 8080)
- **Network:** flrts_network (Docker bridge network)
- **Access:** Zero-trust via Cloudflare (no direct port exposure)

## Cloudflare Dashboard Setup

### 1. Tunnel Configuration

If creating a new tunnel or updating existing:

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Access** → **Tunnels**
3. Find tunnel: **FLRTS Production Tunnel** (or create new)
4. Under **Public Hostnames**, configure:
   - **Subdomain:** `ops`
   - **Domain:** `10nz.tools`
   - **Service Type:** HTTP
   - **URL:** `erpnext-frontend:8080`

### 2. DNS Configuration

The tunnel automatically creates a CNAME record:

```
ops.10nz.tools → <tunnel-id>.cfargotunnel.com
```

Verify in **DNS** → **Records**:

- Type: CNAME
- Name: ops
- Target: <tunnel-id>.cfargotunnel.com
- Proxied: Yes (orange cloud)

### 3. Security Settings

**SSL/TLS Mode:** Full (strict)

- Go to **SSL/TLS** → **Overview**
- Set encryption mode to "Full (strict)"

**Always Use HTTPS:** Enabled

- Go to **SSL/TLS** → **Edge Certificates**
- Enable "Always Use HTTPS"

**HSTS:** Enabled

- Enable HTTP Strict Transport Security with:
  - Max Age: 6 months
  - Include subdomains: Yes
  - Preload: Yes

## Docker Compose Configuration

The `docker-compose.erpnext.yml` includes the cloudflared service:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: flrts-cloudflared
  restart: unless-stopped
  command: tunnel --no-autoupdate run
  environment:
    TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
  networks:
    - flrts_network
  depends_on:
    - erpnext-frontend
```

## Environment Variables

In `.env.erpnext`:

```bash
CLOUDFLARE_TUNNEL_TOKEN=<your-tunnel-token>
```

**Get token from:**

1. Cloudflare Dashboard → Access → Tunnels
2. Click on your tunnel
3. Click **Configure**
4. Copy the token from the install command

**Store in 1Password:**

- Vault: Cloudflare
- Item: FLRTS Tunnel
- Field: Token

## Verification

After deployment, verify tunnel is working:

### 1. Check Container Status

```bash
docker ps | grep cloudflared
```

Should show:

```
flrts-cloudflared   cloudflare/cloudflared:latest   "tunnel --no-autoupdate run"   Up X minutes
```

### 2. Check Tunnel Logs

```bash
docker logs flrts-cloudflared
```

Look for:

```
INF Connection established
INF Registered tunnel connection
```

### 3. Test External Access

```bash
curl -I https://ops.10nz.tools
```

Should return:

```
HTTP/2 200
server: cloudflare
```

### 4. Verify in Cloudflare Dashboard

Go to **Access** → **Tunnels** → Your tunnel

Should show:

- Status: HEALTHY (green)
- Connectors: 1 connected

## Troubleshooting

### Tunnel Shows as Unhealthy

**Symptoms:**

- Dashboard shows tunnel as "UNHEALTHY" or "DOWN"
- Cannot access ops.10nz.tools

**Solutions:**

1. **Check cloudflared container:**

   ```bash
   docker logs flrts-cloudflared --tail 50
   ```

2. **Verify token is correct:**

   ```bash
   grep CLOUDFLARE_TUNNEL_TOKEN .env.erpnext
   ```

3. **Restart cloudflared:**

   ```bash
   docker compose -f docker-compose.erpnext.yml restart cloudflared
   ```

4. **Check network connectivity:**

   ```bash
   docker exec flrts-cloudflared ping -c 3 erpnext-frontend
   ```

### Cannot Access ERPNext Frontend

**Symptoms:**

- Tunnel is healthy
- Cannot load <https://ops.10nz.tools>
- 502 Bad Gateway error

**Solutions:**

1. **Check ERPNext frontend is running:**

   ```bash
   docker ps | grep erpnext-frontend
   docker logs flrts-erpnext-frontend --tail 50
   ```

2. **Test internal connectivity:**

   ```bash
   docker exec flrts-cloudflared curl -I http://erpnext-frontend:8080
   ```

3. **Check frontend health:**

   ```bash
   curl http://localhost:8080/api/method/ping
   ```

### SSL/TLS Errors

**Symptoms:**

- ERR_SSL_PROTOCOL_ERROR
- Certificate warnings

**Solutions:**

1. **Verify Cloudflare SSL mode:**
   - Should be "Full (strict)" not "Flexible"

2. **Check origin certificate:**
   - ERPNext serves HTTP internally
   - Cloudflare handles SSL termination

## Migration from OpenProject

When migrating from OpenProject to ERPNext:

1. **No tunnel changes needed** - Same subdomain (ops.10nz.tools)
2. **Update target service:**
   - Old: openproject:80
   - New: erpnext-frontend:8080
3. **Cloudflare DNS:** Already points to tunnel (no changes)
4. **Zero downtime:** Cloudflare caches during brief container swap

## Cloudflare Settings for ERPNext

### Caching

**Browser Cache TTL:** Respect Existing Headers

- ERPNext sets appropriate cache headers

**Caching Level:** Standard

- Go to **Caching** → **Configuration**

### Performance

**Auto Minify:** Disabled

- ERPNext serves pre-minified assets

**Rocket Loader:** Disabled

- Can interfere with ERPNext JavaScript

**Brotli Compression:** Enabled

- Better compression than gzip

### Firewall

**Bot Fight Mode:** Enabled

- Protects against automated attacks

**Security Level:** Medium

- Balance between security and usability

**Challenge Passage:** 30 minutes

- For legitimate users passing challenges

## Monitoring

### Check Tunnel Health

```bash
# From droplet
docker exec flrts-cloudflared cloudflared tunnel info
```

### View Traffic Analytics

1. Cloudflare Dashboard → Analytics → Traffic
2. Filter by hostname: ops.10nz.tools
3. Monitor:
   - Requests per second
   - Bandwidth
   - Response codes
   - Cache hit ratio

### Alerts

Set up Cloudflare alerts for:

- Tunnel going down
- High error rates (5xx responses)
- DDoS attacks

## References

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [ERPNext Behind Reverse Proxy](https://discuss.frappe.io/t/erpnext-behind-reverse-proxy/12345)
- [Zero Trust Network Access](https://www.cloudflare.com/learning/access-management/what-is-ztna/)

## Support

If tunnel issues persist:

1. Check Cloudflare Status: <https://www.cloudflarestatus.com/>
2. Review droplet logs: `docker compose logs -f cloudflared`
3. Contact Cloudflare Support with tunnel ID
