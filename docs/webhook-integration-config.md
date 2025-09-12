# Supabase → n8n → OpenProject Webhook Configuration

## Overview
This document describes the webhook integration setup for syncing tasks from Supabase to OpenProject via n8n middleware.

## Architecture

```
Supabase Database (tasks table) 
    ↓ Database Webhooks
n8n Cloud Workflow 
    ↓ OpenProject API
OpenProject (work_packages)
```

## Components

### 1. n8n Workflow
- **Workflow Name**: "Supabase Tasks → OpenProject Sync"
- **Workflow ID**: `xeXX1rxX2chJdQis`
- **Webhook URL**: `https://n8n-rrrs.sliplane.app/webhook/supabase-tasks-webhook`
- **Status**: Created, not yet activated

### 2. Supabase Database Webhook Configuration
**⚠️ Manual Configuration Required**

Access Supabase Dashboard at:
`https://supabase.com/dashboard/project/thnwlykidzhrsagyjncc`

Navigate to: **Database → Webhooks**

Create webhook with these settings:

| Setting | Value |
|---------|-------|
| **Name** | `n8n Tasks Sync Webhook` |
| **Table** | `tasks` |
| **Events** | `INSERT`, `UPDATE`, `DELETE` |
| **URL** | `https://n8n-rrrs.sliplane.app/webhook/supabase-tasks-webhook` |
| **HTTP Method** | `POST` |
| **Content-Type** | `application/json` |
| **Custom Headers** | `X-Webhook-Source: Supabase-FLRTS` |

### 3. Webhook Payload Format

#### INSERT/UPDATE Events
```json
{
  "type": "INSERT" | "UPDATE",
  "table": "tasks",
  "schema": "public",
  "record": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "status": "open" | "in_progress" | "completed" | "on_hold",
    "priority": "High" | "Medium" | "Low",
    "due_date": "2024-01-15T10:00:00Z",
    "assignee_id": "uuid",
    "openproject_work_package_id": "number"
  },
  "old_record": null | {...}
}
```

#### DELETE Events
```json
{
  "type": "DELETE",
  "table": "tasks", 
  "schema": "public",
  "record": null,
  "old_record": {
    "id": "uuid",
    "title": "string",
    // ... full deleted record
  }
}
```

## Field Mappings

### Priority Mapping (Fixed)
| Supabase | OpenProject | ID |
|----------|-------------|-----|
| High     | High        | 1   |
| Medium   | Normal      | 2   |
| Low      | Low         | 3   |

### Status Mapping
| Supabase Status | OpenProject Status | ID |
|----------------|-------------------|-----|
| open           | New               | 1   |
| in_progress    | In progress       | 7   |
| completed      | Closed            | 12  |
| on_hold        | On hold           | 4   |

## n8n Workflow Logic

1. **Webhook Trigger**: Receives POST from Supabase
2. **Data Processing**: Validates table and extracts data
3. **Operation Routing**: Routes by INSERT/UPDATE/DELETE
4. **Data Transformation**: Maps Supabase fields to OpenProject format
5. **Response**: Returns success/error status to Supabase

### Error Handling
- Invalid table names rejected
- Missing required data throws errors
- Malformed payloads return 500 status
- All operations logged for debugging

## Testing Procedure

### Prerequisites
1. Supabase webhook configured (manual step above)
2. n8n workflow activated
3. OpenProject API accessible

### Test Steps

#### Test 1: INSERT
```sql
-- In Supabase SQL Editor
INSERT INTO tasks (title, description, status, priority, due_date)
VALUES ('Test Webhook Task', 'Testing webhook integration', 'open', 'High', '2024-01-15 10:00:00+00');
```

#### Test 2: UPDATE
```sql
UPDATE tasks 
SET status = 'in_progress', priority = 'Medium'
WHERE title = 'Test Webhook Task';
```

#### Test 3: DELETE
```sql
DELETE FROM tasks WHERE title = 'Test Webhook Task';
```

### Expected Results
1. Each operation should trigger webhook within 1 second
2. n8n workflow execution appears in logs
3. Success response returned to Supabase
4. Changes reflected in OpenProject (once API integration complete)

## Monitoring

### Supabase
- Database → Webhooks → View delivery logs
- Check for failed deliveries and retry attempts

### n8n
- Workflow executions list shows each webhook trigger
- Detailed logs show data processing steps
- Error messages visible in failed executions

## Next Steps (Not Yet Implemented)

1. **Activate n8n workflow** (currently inactive)
2. **Add OpenProject API integration nodes** to complete the sync
3. **Implement user mapping** between Supabase users and OpenProject users
4. **Add retry logic** for failed OpenProject API calls
5. **Set up monitoring alerts** for webhook failures

## Configuration Files

- n8n workflow config: `packages/sync-service/supabase-webhook-config.json`
- This documentation: `docs/webhook-integration-config.md`

## Security Notes

- n8n webhook endpoint is public but validates data structure
- OpenProject API calls will require authentication tokens
- Consider adding webhook signature verification for production

---

*Configuration completed: 2025-01-09*  
*Story: 1.2 Configure Supabase Native Webhooks to Trigger n8n-cloud*