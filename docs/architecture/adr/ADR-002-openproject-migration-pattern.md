# ADR-001: OpenProject Database Migration Pattern for Slim Docker Images

## Status
Accepted

## Context
During deployment of OpenProject Community Edition using the `openproject:14-slim` Docker image, we encountered a critical issue where the container entered a restart loop with the following error:

```
ActiveRecord::PendingMigrationError
Migrations are pending. To resolve this issue, run:
bin/rails db:migrate RAILS_ENV=production
You have 301 pending migrations
```

Investigation revealed that the slim image is intentionally designed NOT to automatically run database migrations, unlike the all-in-one image. This is a production-oriented design decision that assumes migrations will be managed separately from application startup.

### Problem Statement
- The slim image provides better resource efficiency and separation of concerns
- However, it requires explicit migration management
- Our initial docker-compose configuration lacked any migration execution strategy
- The container cannot start without migrations being applied first

## Decision
We will implement a **migration init container pattern** using Docker Compose's `depends_on` with `service_completed_successfully` condition to ensure database migrations are executed before the main application container starts.

### Implementation Details

1. **Separate Migration Service**: Create a dedicated `openproject-migrate` service that:
   - Uses the same image as the main application
   - Runs `bundle exec rake db:migrate db:seed` command
   - Exits after completion (restart: "no")
   - Shares the same database connection and environment

2. **Dependency Chain**: Configure the main OpenProject service to:
   - Depend on migration service with `condition: service_completed_successfully`
   - Only start after migrations complete successfully
   - Maintain all other dependencies (database, memcached)

3. **Environment Configuration**: Ensure both services share:
   - DATABASE_URL for database connection
   - SECRET_KEY_BASE for Rails encryption
   - RAILS_ENV set to production
   - Memcached configuration for cache consistency

## Consequences

### Positive
- **Controlled Migrations**: Migrations run predictably and only when explicitly deployed
- **Better Visibility**: Migration logs are separate from application logs
- **Rollback Safety**: Failed migrations prevent application startup
- **Production Best Practice**: Aligns with industry standards for database schema management
- **Resource Efficiency**: Migration container releases resources after completion
- **Idempotent**: Safe to run multiple times (Rails migrations are idempotent)

### Negative
- **Additional Complexity**: Requires understanding of Docker Compose dependency management
- **Startup Time**: Adds migration execution time to initial deployment
- **Failure Handling**: Must manually intervene if migrations fail
- **Version Coordination**: Must ensure migration and app containers use same image version

### Neutral
- **Different from All-in-One**: Teams used to the all-in-one image need education
- **Monitoring Requirements**: Should monitor migration service separately

## Alternatives Considered

1. **Switch to All-in-One Image (`openproject:14`)**
   - Pros: Auto-runs migrations, simpler setup
   - Cons: Violates production best practices, less resource efficient, mixes concerns

2. **Manual Migration Execution**
   - Pros: Maximum control, can review migrations before running
   - Cons: Error-prone, requires manual intervention, not suitable for CI/CD

3. **Kubernetes Jobs/Helm Charts**
   - Pros: Native K8s pattern, better orchestration
   - Cons: Overkill for single-VM deployment, adds K8s complexity

## Implementation Example

```yaml
services:
  openproject-migrate:
    image: openproject/openproject:14-slim
    environment:
      DATABASE_URL: "${DATABASE_URL}"
      SECRET_KEY_BASE: "${SECRET_KEY_BASE}"
      RAILS_ENV: production
    command: bundle exec rake db:migrate db:seed
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  openproject:
    image: openproject/openproject:14-slim
    depends_on:
      openproject-migrate:
        condition: service_completed_successfully
      db:
        condition: service_healthy
    # ... rest of configuration
```

## References
- [OpenProject Docker Documentation](https://www.openproject.org/docs/installation-and-operations/installation/docker/)
- [Docker Compose Dependency Conditions](https://docs.docker.com/compose/compose-file/05-services/#depends_on)
- [Rails Migration Best Practices](https://guides.rubyonrails.org/active_record_migrations.html)
- Story: 1.1.deploy-openproject-docker-digitalocean.md

## Decision Date
2025-01-15

## Decision Makers
- Winston (System Architect)
- Development Team (Implementation)