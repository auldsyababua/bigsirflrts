# Digital Ocean Research for OpenProject Deployment

## Key Findings from MCP Research Session

### Optimal Digital Ocean Configuration

- **Region**: NYC3 (New York 3) - optimal latency to Supabase us-east-2
- **Droplet Size**: s-4vcpu-8gb
  - 4 vCPU cores
  - 8GB RAM
  - 160GB SSD storage
  - 5TB monthly transfer
  - Cost: $0.07143/hour = $48/month

### OpenProject System Requirements Validation

- **Minimum**: 2 vCPU, 4GB RAM for <100 users
- **Recommended**: 4 vCPU, 8GB RAM for 200-500 users
- **Performance Settings**:

  ```yaml
  OPENPROJECT_WEB_WORKERS: "4"          # 4 worker processes
  OPENPROJECT_WEB_MIN__THREADS: "4"     # 4 threads per worker
  OPENPROJECT_WEB_MAX__THREADS: "8"     # 4-8 threads per worker
  OPENPROJECT_WEB_TIMEOUT: "30"         # 30 second timeout
  ```

### Network Architecture

- **Database**: Managed PostgreSQL (Supabase) in us-east-2
- **Expected Latency**: 2-5ms between NYC3 and us-east-2
- **Access**: Cloudflare Tunnel for secure public access
- **Storage**: Cloudflare R2 for file attachments via S3 API

### Total Infrastructure Cost

- Digital Ocean VM: $48/month
- Supabase PostgreSQL: ~$25/month (starter tier)
- Cloudflare R2: $0.015/GB/month
- **Total**: ~$75/month for production-ready infrastructure
