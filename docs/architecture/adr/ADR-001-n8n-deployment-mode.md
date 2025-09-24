# Architecture Decision Record: n8n Deployment Mode

## ADR-001: Single-Instance vs Queue Mode for n8n

**Status:** Accepted **Date:** 2025-09-15 **Decision Makers:** Engineering Team,
Product Management

## Context

Initial architecture plans specified n8n queue mode with Redis for handling
"100+ users at scale." After QA review and requirements clarification, actual
scale is 10 concurrent users, not 100+.

n8n offers two deployment modes:

1. **Single-Instance Mode:** One n8n container handling all executions
2. **Queue Mode:** Multiple workers with Redis queue for horizontal scaling

## Decision

**Use single-instance mode for production deployment at current scale (10
users).**

Queue mode configuration preserved for future scaling when genuinely needed.

## Rationale

### Performance Analysis

- n8n single instance can handle 220 workflow executions/second (per official
  benchmarks)
- Our requirement: 100 webhooks/hour (0.028/second)
- **We're using 0.01% of single-instance capacity**
- Queue mode provides 25-50x our current needs - massive overengineering

### Complexity Comparison

#### Single-Instance (Chosen)

- 1 container to manage
- No Redis dependency
- Simple health checks
- Direct execution path
- Easier debugging
- 2GB RAM, 1 CPU sufficient

#### Queue Mode (Deferred)

- 4+ containers (main, workers, Redis)
- Redis persistence/backup concerns
- Complex queue monitoring
- Additional failure points
- Network overhead between components
- 4-6GB RAM, 2+ CPUs needed

### Cost Analysis

- Single-Instance: ~$20-40/month VM costs
- Queue Mode: ~$60-120/month (3x increase)
- ROI only justified at 50+ concurrent users

## Migration Triggers

Implement queue mode when ANY of these occur:

- Sustained 50+ active users
- > 500 webhooks/hour consistently
- Execution times >30 seconds regularly
- Memory usage >80% of 2GB allocation
- CPU usage consistently >70%

## Implementation

### Current Production Config

```yaml
# docker-compose.single.yml
services:
  n8n:
    image: n8nio/n8n:latest
    mem_limit: 2g
    cpus: 1.0
    environment:
      - N8N_CONCURRENCY=10
      - DB_POSTGRESDB_POOL_SIZE=4
```

### Future Queue Mode Config

```yaml
# docker-compose.yml (preserved for scaling)
services:
  n8n-main:
    environment:
      - EXECUTIONS_MODE=queue
  n8n-worker:
    replicas: 2
  redis:
    image: redis:alpine
```

## Consequences

### Positive

- 50% reduction in infrastructure costs
- Simplified operations and monitoring
- Faster deployment and updates
- Reduced attack surface
- Easier local development matching production

### Negative

- Manual migration required if scale exceeds expectations
- No horizontal scaling without architecture change
- Single point of failure for n8n (mitigated by container restart policies)

### Neutral

- Migration path well-documented and tested
- Both configurations maintained in codebase
- Can migrate in <1 hour when needed

## Monitoring Plan

Track these metrics to identify when migration needed:

```sql
-- Check concurrent executions
SELECT COUNT(*) FROM execution_entity
WHERE status = 'running';

-- Check hourly webhook volume
SELECT COUNT(*) FROM webhook_events
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Monitor execution times
SELECT AVG(duration), MAX(duration)
FROM execution_entity
WHERE finished_at > NOW() - INTERVAL '1 day';
```

## References

- [n8n Scaling Documentation](https://docs.n8n.io/hosting/scaling/)
- [n8n Performance Benchmarks](https://docs.n8n.io/hosting/scaling/performance-benchmarking/)
- QA Gate Decision: `/docs/qa/gates/1.3-n8n-queue-mode-configuration.yml`
- Scaling Guide: `/infrastructure/docs/SCALING_GUIDE.md`

## Review Schedule

Reassess this decision:

- After 3 months of production usage
- When user count reaches 25
- If performance metrics approach trigger thresholds
