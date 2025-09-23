# n8n Scaling Guide: From Single Instance to Queue Mode

## Current Deployment (10 Users)

For the current 10-user deployment, **single instance mode is recommended**:

- Use `docker-compose.single.yml`
- Handles up to 100+ webhooks/hour easily
- Uses ~50% less resources than queue mode
- Simpler to operate and debug

### Quick Start for 10-User Deployment

```bash
# Generate secure environment
cd infrastructure/scripts
./generate-secure-env.sh

# Deploy single instance
cd ../docker
docker-compose -f docker-compose.single.yml up -d

# Check health
curl https://n8n.10nz.tools/healthz
```

## When to Scale to Queue Mode

Monitor these metrics to determine when to scale:

### Key Indicators

1. **Webhook Processing Time**
   - Current: < 2 seconds average
   - Warning: > 5 seconds average
   - Critical: > 10 seconds or timeouts

2. **Concurrent Executions**
   - Current capacity: 10 concurrent
   - Warning: Regularly hitting limit
   - Critical: Executions queuing/failing

3. **Memory Usage**
   - Current: ~500MB typical
   - Warning: > 1.5GB sustained
   - Critical: > 2GB or OOM errors

4. **User Growth**
   - 10-25 users: Single instance
   - 25-50 users: Consider queue mode
   - 50+ users: Queue mode required

### Monitoring Query

```sql
-- Run this weekly to track growth
SELECT
  DATE_TRUNC('day', started_at) as day,
  COUNT(DISTINCT workflow_id) as active_workflows,
  COUNT(*) as total_executions,
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (finished_at - started_at))) as max_duration_seconds,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
FROM execution_entity
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', started_at)
ORDER BY day DESC;
```

## Migration Path

### Step 1: Preparation (At 20 Users)

```bash
# Start monitoring closely
# Set up metrics dashboard
# Document current workflows
# Plan maintenance window
```

### Step 2: Pre-Migration (At 25 Users)

```bash
# Backup current data
docker exec n8n-postgres pg_dump -U n8n n8n > backup.sql

# Export all workflows
# Use n8n UI: Settings > Workflows > Export All

# Test queue mode in staging
docker-compose -f docker-compose.yml up -d
```

### Step 3: Migration (At 30+ Users)

```bash
# 1. Stop single instance
docker-compose -f docker-compose.single.yml down

# 2. Start queue mode
docker-compose up -d

# 3. Verify all services
./health-check.sh

# 4. Test webhook processing
curl -X POST https://n8n.10nz.tools/webhook/test
```

## Architecture Comparison

### Single Instance (Current - 10 Users)

```
Internet → Nginx → n8n → PostgreSQL
```

**Pros:**

- Simple architecture
- Low resource usage (1GB RAM total)
- Easy debugging
- Fast deployment
- Single log stream

**Cons:**

- No horizontal scaling
- Single point of failure
- Limited to ~100 concurrent executions

### Queue Mode (Future - 50+ Users)

```
Internet → Nginx Load Balancer
            ├→ n8n Main (UI/Triggers)
            └→ n8n Webhook Processors (1-3)
                    ↓
                  Redis
                    ↓
            n8n Workers (1-5) → PostgreSQL
```

**Pros:**

- Horizontal scaling
- Fault tolerance
- 500+ concurrent executions
- Worker specialization

**Cons:**

- Complex architecture
- 2-3x resource usage
- Multiple log streams
- Redis dependency

## Resource Requirements

### Single Instance (10 Users)

- **CPU**: 1 vCPU
- **RAM**: 2GB
- **Storage**: 20GB
- **Monthly Cost**: ~$20

### Queue Mode (50+ Users)

- **CPU**: 4 vCPUs
- **RAM**: 8GB
- **Storage**: 100GB
- **Monthly Cost**: ~$80-100

## Performance Benchmarks

### Single Instance Capacity

```yaml
Webhooks/hour: 100-200
Concurrent executions: 10
Response time p95: < 2s
Monthly executions: 5,000
```

### Queue Mode Capacity

```yaml
Webhooks/hour: 1000+
Concurrent executions: 100+
Response time p95: < 1s
Monthly executions: 50,000+
```

## Troubleshooting Guide

### Single Instance Issues

1. **High Memory Usage**

   ```bash
   # Check memory
   docker stats n8n

   # Restart if needed
   docker-compose -f docker-compose.single.yml restart n8n
   ```

2. **Slow Webhook Processing**

   ```bash
   # Check execution queue
   docker exec n8n-postgres psql -U n8n -d n8n -c \
     "SELECT COUNT(*) FROM execution_entity WHERE status = 'running';"
   ```

### When to Call for Help

Contact DevOps when:

- Webhook timeouts > 5/hour
- Memory usage > 80% sustained
- Error rate > 5%
- User complaints about performance

## Rollback Procedure

If queue mode has issues:

```bash
# 1. Export any new workflows from queue mode
# Use n8n UI: Settings > Workflows > Export All

# 2. Stop queue mode
docker-compose down

# 3. Restore single instance
docker-compose -f docker-compose.single.yml up -d

# 4. Import workflows if needed
# Use n8n UI: Settings > Workflows > Import
```

## Cost-Benefit Analysis

### Keep Single Instance Until

- 30+ active users
- 200+ webhooks/hour sustained
- 10+ workflow timeout errors/day
- Business requires HA/fault tolerance

### ROI of Queue Mode

- **Cost**: 3-4x infrastructure
- **Benefit**: 10x capacity
- **Break-even**: ~40 active users

## Recommendations

1. **Current (10 Users)**: Continue with single instance
2. **6-Month Plan**: Monitor growth metrics weekly
3. **12-Month Plan**: Prepare queue mode if approaching 25 users
4. **Long-term**: Automate scaling decisions based on metrics

## Additional Resources

- [n8n Scaling Documentation](https://docs.n8n.io/hosting/scaling/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

---

_This guide addresses ARCH-001 finding from QA review. The queue mode
implementation is ready but not recommended for current scale._
