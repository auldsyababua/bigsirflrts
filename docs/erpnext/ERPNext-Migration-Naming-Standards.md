# ERPNext Migration Naming Standards & Conventions

**Status:** Active **Purpose:** Pre-define naming conventions for all migration
artifacts to ensure consistency **Date Created:** 2025-09-30

## Critical Rule

**🚨 ALL naming decisions must be documented in the relevant phase deliverable
document.**

Agents MUST NOT invent names without following these standards. If a scenario
isn't covered, STOP and ask the user.

## Docker & Infrastructure Naming

### Container Names

**Format:** `flrts-{service}-{environment}`

**Examples:**

- `flrts-erpnext-dev` - Development ERPNext instance
- `flrts-erpnext-prod` - Production ERPNext instance
- `flrts-mariadb-dev` - Dedicated MariaDB instance (if using external managed
  DB)
- `flrts-redis-dev` - Redis cache for ERPNext

**Rules:**

- All lowercase
- Use hyphens, not underscores
- Environment suffix required: `-dev`, `-staging`, `-prod`

### Docker Network Names

**Format:** `flrts-{purpose}-network`

**Examples:**

- `flrts-erpnext-network` - Network for ERPNext services
- `flrts-integration-network` - Network for integration testing

### Volume Names

**Format:** `flrts-{service}-{data-type}-{environment}`

**Examples:**

- `flrts-erpnext-data-dev`
- `flrts-erpnext-config-dev`
- `flrts-postgres-data-dev`

## API & Service Naming

### API Endpoints

**Base URL Format:** `https://{service}.10nz.tools`

**Examples:**

- `https://erpnext.10nz.tools` - Production ERPNext (future)
- `https://ops.10nz.tools` - Development/Staging ERPNext (current)
- `https://api.10nz.tools` - FLRTS API gateway (if created)

**ERPNext API Paths:**

- `/api/resource/Work Order` - Standard ERPNext format (use their naming)
- `/api/resource/Location`
- `/api/resource/Supplier`
- `/api/resource/FLRTS Personnel` - Custom DocTypes

### Environment Variables

**Format:** `{SERVICE}_{CATEGORY}_{VARIABLE}`

**Examples:**

```bash
# ERPNext connection
ERPNEXT_API_URL=https://ops.10nz.tools
ERPNEXT_API_KEY=your-api-key-here
ERPNEXT_API_SECRET=your-api-secret-here

# Feature flags
USE_ERPNEXT=false  # Boolean flags in SCREAMING_SNAKE_CASE
ERPNEXT_ENABLED=false

# Database
SUPABASE_ERPNEXT_CACHE_TABLE=erpnext_work_orders_cache

# Webhooks
N8N_ERPNEXT_WEBHOOK_URL=https://n8n.10nz.tools/webhook/erpnext
ERPNEXT_WEBHOOK_SECRET=your-webhook-secret
```

**Rules:**

- SCREAMING_SNAKE_CASE
- Group by service prefix
- Use descriptive names, not abbreviations
- Document all env vars in `.env.example`

### Feature Flags

**Format:** `{SERVICE}_ENABLED` or `USE_{SERVICE}`

**Examples:**

```bash
USE_ERPNEXT=true
OPENPROJECT_ENABLED=false  # Keep for backward compatibility
ERPNEXT_SYNC_ENABLED=true
```

**Rules:**

- Boolean values: `true` or `false` (lowercase)
- Positive naming (USE_X, not DISABLE_X)
- Document default values in code comments

## Code Naming

### Package Names

**Format:** `@flrts/{package-name}` or `{package-name}` (for internal packages)

**Examples:**

- `@flrts/erpnext-client` - ERPNext API client library
- `@flrts/sync-service` - Sync service
- `@flrts/types` - Shared TypeScript types

**Directory Structure:**

```
packages/
  erpnext-client/          # ERPNext API client
  sync-service/            # Existing sync service
  types/                   # Shared types (create if needed)
```

### File Names

**TypeScript/JavaScript:**

- `kebab-case.ts` for files
- `PascalCase` for classes
- `camelCase` for functions/variables

**Examples:**

```
erpnext-client.ts          # Main client file
erpnext-types.ts           # Type definitions
work-order.service.ts      # Service files
location.repository.ts     # Repository files
```

**Python (migration scripts):**

- `snake_case.py`

**Examples:**

```
migrate_sites_to_locations.py
migrate_contractors_to_suppliers.py
validate_migration_data.py
rollback_migration.py
```

### Class Names

**Format:** `{Entity}{Type}` in PascalCase

**Examples:**

```typescript
class ERPNextClient {}
class WorkOrderService {}
class LocationRepository {}
class ERPNextSyncService {}
```

### Function Names

**Format:** `{verb}{Noun}` in camelCase

**Examples:**

```typescript
// Good
createWorkOrder();
getLocationById();
syncERPNextData();
transformSiteToLocation();

// Bad
create(); // Too vague
getLocation(); // Missing "ById" specificity
sync(); // What are we syncing?
```

### Type Names

**Format:** `{Entity}{Purpose}` in PascalCase

**Examples:**

```typescript
// Input types
interface WorkOrderInput {}
interface LocationInput {}

// API response types
interface WorkOrder {}
interface Location {}

// Filter types
interface LocationFilters {}

// Config types
interface ERPNextConfig {}
interface ERPNextClientOptions {}
```

## ERPNext Naming

### Custom DocTypes

**Format:** `FLRTS {Entity}` (with space, PascalCase)

**Examples:**

- `FLRTS Personnel` - Custom personnel DocType
- `FLRTS List` - Custom list DocType
- `FLRTS Reminder` - Custom reminder DocType

**Rationale:** Prefix with "FLRTS" to distinguish from standard ERPNext DocTypes

### Custom Fields on Standard DocTypes

**Format:** `custom_{snake_case_field_name}`

**Examples:**

```json
{
  "fieldname": "custom_flrts_code", // For Location
  "fieldname": "custom_telegram_user_id", // For User
  "fieldname": "custom_aliases", // For Location
  "fieldname": "custom_assigned_sites" // For Supplier
}
```

**Rules:**

- All custom fields MUST start with `custom_`
- Use snake_case (ERPNext convention)
- Be descriptive, avoid abbreviations

### DocType Module Name

**Format:** `FLRTS`

**Example:**

```json
{
  "name": "FLRTS Personnel",
  "module": "FLRTS"
}
```

**Rationale:** All FLRTS custom DocTypes belong to "FLRTS" module

## Database Naming

### ERPNext Cache Tables (Optional)

For Frappe Cloud we rely on the managed MariaDB instance. If we provision an
external read replica or analytics database, follow this naming.

**Format:** `erpnext_{entity}_cache`

**Examples:**

- `erpnext_work_orders_cache` - Cached work orders for analytics
- `erpnext_locations_cache` - Cached locations
- `erpnext_sync_log` - Sync operation logs

**Rules:**

- Prefix with `erpnext_`
- Use plural for entity tables
- Use singular for log/config tables
- snake_case

### Migration Script Tables (if needed)

**Format:** `migration_{purpose}`

**Examples:**

- `migration_audit_log` - Track migration operations
- `migration_errors` - Log migration errors

## Documentation Naming

### Document Files

**Format:** `{topic}-{type}.md`

**Examples:**

```
docs/research/
  erpnext-schema-philosophy.md
  erpnext-vs-traditional-sql.md
  flrts-functional-requirements.md
  erpnext-feature-mapping.md
  erpnext-doctype-patterns.md
  erpnext-fsm-module-analysis.md

docs/migration/
  codebase-audit-report.md
  schema-mapping.md
  data-migration-strategy.md
  custom-doctypes-design.md
  data-audit-report.md
  data-transformation-logic.md
  sync-service-migration-plan.md
  telegram-bot-migration-plan.md
  n8n-workflows-migration-plan.md
  test-migration-report.md
  rollback-procedure.md

# Note: docs/prompts/ is no longer tracked in Git (local dev tools only)
# Agent prompts maintained in docs/.prompts-local/ for reference
```

**Rules:**

- kebab-case for all files
- Descriptive names
- Group by phase/purpose in subdirectories

### Migration Scripts

**Format:** `{phase}_{action}_{entity}.py`

**Examples:**

```
migration-scripts/
  01_migrate_sites_to_locations.py
  02_migrate_contractors_to_suppliers.py
  03_migrate_personnel_to_users.py
  04_migrate_tasks_to_work_orders.py
  rollback_01_sites.py
  rollback_02_contractors.py
  validate_migration_sites.py
  validate_migration_contractors.py
```

**Rules:**

- Number prefix for execution order
- Descriptive action verb
- Matching rollback scripts
- Matching validation scripts

## Webhook & Integration Naming

### Webhook URLs

**Format:** `/webhook/{source}/{event}`

**Examples:**

```
# n8n webhooks (receiving from ERPNext)
https://n8n.10nz.tools/webhook/erpnext/work-order-created
https://n8n.10nz.tools/webhook/erpnext/work-order-updated
https://n8n.10nz.tools/webhook/erpnext/work-order-completed

# ERPNext webhooks (receiving from FLRTS services)
https://erpnext.10nz.tools/api/method/flrts.webhooks.telegram_message
```

**Rules:**

- kebab-case for URLs
- Descriptive event names
- Include source system

### Webhook Secret Keys

**Format:** `{SOURCE}_{TARGET}_WEBHOOK_SECRET`

**Examples:**

```bash
ERPNEXT_N8N_WEBHOOK_SECRET=abc123...
N8N_ERPNEXT_WEBHOOK_SECRET=def456...
```

## Test Naming

### Test Files

**Format:** `{file-being-tested}.test.ts` or `{file-being-tested}.spec.ts`

**Examples:**

```
erpnext-client.test.ts
work-order.service.test.ts
location.repository.test.ts
```

### Test Suites & Descriptions

**Examples:**

```typescript
describe('ERPNextClient', () => {
  describe('createWorkOrder', () => {
    it('should create a work order with valid input', async () => {
      // Test
    });

    it('should throw error when location is missing', async () => {
      // Test
    });
  });
});
```

**Rules:**

- Use `describe` for test suites (match class/function names)
- Use `it` for test cases (should read like a sentence)
- Be specific about what's being tested

## Git & Version Control

### Branch Names

**Format:** `{type}/{issue-id}-{brief-description}`

**Examples:**

- `feature/10n-227-erpnext-backend-adoption`
- `feature/10n-xxx-erpnext-api-client`
- `docs/10n-xxx-migration-workflow`
- `fix/10n-xxx-webhook-auth-issue`

**Rules:**

- Include Linear issue ID
- kebab-case for description
- Use type prefix: `feature/`, `fix/`, `docs/`, `refactor/`

### Git Tags

**Format:** `v{major}.{minor}.{patch}-{label}`

**Examples:**

- `v0.1.0-pre-erpnext` - Baseline before migration
- `v0.2.0-erpnext-mvp` - First working ERPNext integration
- `v1.0.0-erpnext-production` - Production deployment

### Commit Messages

**Format:** `{type}({scope}): {description}`

**Examples:**

```
feat(erpnext): add API client library
docs(migration): create phase 1 research templates
fix(sync): handle ERPNext webhook authentication
test(erpnext): add integration tests for work orders
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `chore` - Maintenance

## When Standards Don't Apply

**If you encounter a scenario not covered here:**

1. **STOP** - Don't make up a name
2. **Check existing code** - Is there a pattern already in use?
3. **Ask the user** - Get explicit approval for new naming
4. **Document it** - Add to this file for future reference

## Agent Responsibilities

When working on migration tasks, agents MUST:

1. ✅ **Read this document first** before naming anything
2. ✅ **Document all names** in their deliverable documents
3. ✅ **Use exact naming patterns** specified here
4. ✅ **Ask for clarification** if unsure
5. ❌ **Never invent names** that don't follow these standards
6. ❌ **Never use generic names** like "Service", "Helper", "Util"
7. ❌ **Never abbreviate** unless specified in standards

## Validation Checklist

Before submitting work, verify:

- [ ] All container names follow format: `flrts-{service}-{env}`
- [ ] All env vars follow format: `{SERVICE}_{CATEGORY}_{VAR}`
- [ ] All API endpoints documented with full URLs
- [ ] All file names use kebab-case (or snake_case for Python)
- [ ] All class names use PascalCase
- [ ] All function names use camelCase
- [ ] All ERPNext custom fields start with `custom_`
- [ ] All custom DocTypes prefixed with `FLRTS`
- [ ] All names documented in deliverable documents
- [ ] No generic/ambiguous names used
