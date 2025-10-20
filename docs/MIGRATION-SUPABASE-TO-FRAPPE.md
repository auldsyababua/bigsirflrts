# Supabase → Frappe Cloud Migration Guide

**For Developers Joining Post-Migration**

## Quick Context

In September 2025, BigSirFLRTS migrated from Supabase to ERPNext on Frappe Cloud
(ADR-006).

If you see references to Supabase in old issues, PRs, or archived docs:

1. Supabase was our PostgreSQL backend (deprecated Sept 2025)
2. ERPNext on Frappe Cloud is now the primary backend
3. Archived Supabase docs: docs/archive/supabase-era/
4. Migration decision: ADR-006

## Quick Translation Table

| Old (Supabase Era)              | New (Frappe Cloud)               |
| ------------------------------- | -------------------------------- |
| Supabase PostgreSQL 15.8        | Frappe Cloud MariaDB 10.6+       |
| Supabase Edge Functions         | AWS Lambda → n8n → ERPNext API   |
| Direct SQL queries              | ERPNext REST API calls           |
| Supabase tables                 | ERPNext DocTypes                 |
| Prisma ORM                      | Frappe ORM (Python)              |
| Supavisor connection pooling    | Frappe Cloud managed connections |
| Cloudflare Tunnel (cloudflared) | Direct DNS (Cloudflare DNS-only) |
| OpenProject                     | ERPNext (field service focus)    |

## Architecture Before/After

### Before (Supabase Era)

```
Telegram → Edge Function → OpenAI → Supabase PostgreSQL
                ↓
         OpenProject API
```

### After (Current)

```
Telegram → AWS Lambda → n8n → ERPNext REST API → Frappe Cloud MariaDB
                ↓
           OpenAI GPT-4o
```

## Key Changes

1. **Data Storage**: PostgreSQL tables → ERPNext DocTypes
2. **API Access**: Direct Supabase client → ERPNext REST API
3. **Deployment**: Self-hosted containers → Frappe Cloud managed
4. **Database**: Manual backups → Automated with PITR
5. **Platform**: OpenProject → ERPNext (field service management)

## Code Migration Examples

### Before: Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Query data
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('status', 'open');
```

### After: ERPNext REST API

```typescript
import axios from 'axios';

const erpnext = axios.create({
  baseURL: 'https://ops.10nz.tools/api',
  headers: {
    Authorization: `token ${API_KEY}:${API_SECRET}`,
    'Content-Type': 'application/json',
  },
});

// Query data
const { data } = await erpnext.get('/resource/Task', {
  params: {
    fields: '["*"]',
    filters: '[["status","=","Open"]]',
  },
});
```

## Database Schema Migration

### Before: SQL Schema

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  status VARCHAR(20),
  assigned_to UUID REFERENCES users(id)
);
```

### After: ERPNext DocType

DocTypes are created via ERPNext UI or JSON schema files in the
`flrts_extensions` custom app:

```json
{
  "doctype": "DocType",
  "name": "Task",
  "fields": [
    {
      "fieldname": "title",
      "label": "Title",
      "fieldtype": "Data",
      "reqd": 1
    },
    {
      "fieldname": "status",
      "label": "Status",
      "fieldtype": "Select",
      "options": "Open\nIn Progress\nCompleted"
    },
    {
      "fieldname": "assigned_to",
      "label": "Assigned To",
      "fieldtype": "Link",
      "options": "User"
    }
  ]
}
```

## Migration Checklist for Developers

### Understanding Current Architecture

- [ ] Read
      [ADR-006](./architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md) -
      Migration decision
- [ ] Review
      [Current Frappe Cloud Architecture](./architecture/current-frappe-cloud-architecture.md) -
      Canonical reference
- [ ] Check [Tech Stack](./architecture/tech-stack.md) - Updated technology list
- [ ] Review [PRD](./prd/prd.md) - Updated product requirements

### Code Updates

- [ ] Replace Supabase client imports with ERPNext API calls
- [ ] Convert SQL queries to ERPNext filters
- [ ] Update table references to DocType names
- [ ] Remove Supabase Edge Functions (replaced by AWS Lambda)
- [ ] Update connection strings (if any direct DB access remains)

### Testing

- [ ] Run schema migration tests:
      `tests/integration/10n-256-schema-migration.test.sh`
- [ ] Verify ERPNext API connectivity
- [ ] Test DocType CRUD operations
- [ ] Validate n8n workflow triggers

### Documentation

- [ ] Update README with ERPNext references
- [ ] Add ERPNext API examples to code comments
- [ ] Document custom DocTypes in `flrts_extensions` app
- [ ] Archive obsolete Supabase documentation

## Common Pitfalls

### 1. Direct Database Access

**Don't:**

```typescript
// Direct DB query (no longer works)
const result = await db.query('SELECT * FROM tasks');
```

**Do:**

```typescript
// Use ERPNext REST API
const response = await erpnext.get('/resource/Task');
```

### 2. Supabase-Specific Features

**Edge Functions** → AWS Lambda + n8n workflows **Realtime subscriptions** →
ERPNext webhooks **Row Level Security (RLS)** → ERPNext permissions system
**PostgREST filters** → ERPNext REST API filters

### 3. Schema Assumptions

**Don't assume:**

- UUID primary keys (ERPNext uses varchar `name` field)
- PostgreSQL-specific functions (now MariaDB)
- Direct foreign key constraints (use Link fields)

## Current Architecture Documentation

- **Canonical Reference**:
  [docs/architecture/current-frappe-cloud-architecture.md](./architecture/current-frappe-cloud-architecture.md)
- **Tech Stack**:
  [docs/architecture/tech-stack.md](./architecture/tech-stack.md)
- **PRD**: [docs/prd/prd.md](./prd/prd.md)
- **Migration Decision**:
  [docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md](./architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)

## Archived Documentation

All Supabase-era documentation is archived in:

- `docs/archive/supabase-era/` - Architecture docs, ADRs, setup guides
- `tests/archive/supabase-era/` - Deprecated test files

These are historical references only - **do not use for current development**.

## Getting Help

- **ERPNext docs**: <https://docs.erpnext.com/>
- **Frappe Framework**: <https://frappeframework.com/docs>
- **REST API guide**: <https://frappeframework.com/docs/user/en/api>
- **Custom apps**:
  <https://frappeframework.com/docs/user/en/guides/app-development>

## Questions?

If you encounter Supabase references that need updating:

1. Check if the file is in `docs/archive/supabase-era/` (leave archived)
2. Update active files to use ERPNext patterns
3. Add this migration guide link to context
4. Document the change in commit message

**Last Updated:** October 2025 (Post-ADR-006 migration)
