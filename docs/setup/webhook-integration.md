# FLRTS Webhook Integration Setup

## Overview

This document describes the current webhook integration architecture for FLRTS,
covering task synchronization and communication flows between Supabase, Edge
Functions, n8n, and OpenProject.

## Current Architecture (Updated 2025)

```
Telegram Bot API
    ↓ HTTPS Webhook
Supabase Edge Functions (telegram-webhook)
    ↓ HTTP Request
Self-hosted n8n (single instance)
    ↓ API Calls
OpenProject + PostgreSQL Database

Alternative Flow:
Supabase Database Changes
    ↓ Database Triggers/Functions
Supabase Edge Functions (database-webhook)
    ↓ HTTP Request
Self-hosted n8n (single instance)
    ↓ API Calls
OpenProject Sync
```

## Integration Components

### 1. Supabase Edge Functions

**Primary Integration Points:**

- **`telegram-webhook`**: Handles Telegram bot messages
- **`database-webhook`**: Handles database change events
- **`openproject-sync`**: Direct OpenProject API integration

### 2. Self-hosted n8n Configuration

**Current Setup:**

- **Deployment**: Single instance (not queue mode)
- **URL**: `http://localhost:5678` (development) or configured domain
- **Version**: v1.105.2+
- **Mode**: Docker container with persistent volume

**Key Webhooks:**

- `/webhook/telegram-commands` - Telegram message processing
- `/webhook/database-changes` - Database change notifications
- `/webhook/openproject-sync` - Bidirectional sync operations

### 3. Database Integration Patterns

#### Pattern 1: Database Triggers → Edge Functions

**Supabase Function SQL Trigger:**

```sql
-- Create function to call Edge Function on task changes
CREATE OR REPLACE FUNCTION notify_task_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM http_post(
    'https://{your-project-ref}.supabase.co/functions/v1/database-webhook',
    json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
    )::text,
    'application/json'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER task_change_webhook
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_change();
```

#### Pattern 2: Telegram Messages

**Telegram Update Payload** (from telegram-webhook Edge Function):

```json
{
  "source": "telegram",
  "update_id": 123456,
  "user_id": 123456789,
  "chat_id": 123456789,
  "message_text": "Create task: Fix the pump",
  "username": "john_doe",
  "first_name": "John",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

## Edge Function Implementations

### 1. Database Webhook Handler

**File**: `supabase/functions/database-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();

    // Validate payload structure
    if (!payload.type || !payload.table) {
      return new Response('Invalid payload', { status: 400 });
    }

    // Forward to n8n with enhanced context
    const response = await fetch(
      `${N8N_WEBHOOK_URL}/webhook/database-changes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'supabase-database',
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          source: 'database',
        }),
      }
    );

    if (!response.ok) {
      console.error('n8n webhook failed:', response.statusText);
      return new Response('Processing failed', { status: 500 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Database webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
```

### 2. OpenProject Sync Handler

**File**: `supabase/functions/openproject-sync/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENPROJECT_API_URL = Deno.env.get('OPENPROJECT_API_URL');
const OPENPROJECT_API_KEY = Deno.env.get('OPENPROJECT_API_KEY');

interface TaskData {
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string;
}

// Field mappings
const STATUS_MAPPING = {
  open: 1, // New
  in_progress: 7, // In progress
  completed: 12, // Closed
  on_hold: 4, // On hold
};

const PRIORITY_MAPPING = {
  High: 1, // High
  Medium: 2, // Normal
  Low: 3, // Low
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { operation, data }: { operation: string; data: TaskData } =
      await req.json();

    const authHeader = `Basic ${btoa(`apikey:${OPENPROJECT_API_KEY}`)}`;

    switch (operation) {
      case 'create':
        const workPackage = {
          subject: data.title,
          description: { raw: data.description || '' },
          _links: {
            type: { href: '/api/v3/types/1' }, // Task type
            project: { href: '/api/v3/projects/1' }, // Default project
            status: { href: `/api/v3/statuses/${STATUS_MAPPING[data.status]}` },
            priority: {
              href: `/api/v3/priorities/${PRIORITY_MAPPING[data.priority]}`,
            },
          },
          ...(data.due_date && { dueDate: data.due_date }),
        };

        const createResponse = await fetch(
          `${OPENPROJECT_API_URL}/work_packages`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(workPackage),
          }
        );

        if (!createResponse.ok) {
          const error = await createResponse.text();
          throw new Error(`OpenProject API error: ${error}`);
        }

        const created = await createResponse.json();
        return new Response(JSON.stringify({ success: true, id: created.id }), {
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Unsupported operation', { status: 400 });
    }
  } catch (error) {
    console.error('OpenProject sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
```

## n8n Workflow Configurations

### 1. Telegram Command Processing

**Webhook Trigger Node:**

```json
{
  "httpMethod": "POST",
  "path": "telegram-commands",
  "responseMode": "responseNode"
}
```

**Function Node - Parse Telegram Message:**

```javascript
// Extract intent from Telegram message
const messageText = $json.message_text?.toLowerCase() || '';

let intent = 'unknown';
let extractedData = {};

if (messageText.includes('create task') || messageText.includes('new task')) {
  intent = 'create_task';
  extractedData.title = messageText.replace(
    /^(create task|new task):?\s*/i,
    ''
  );
} else if (
  messageText.includes('list tasks') ||
  messageText.includes('show tasks')
) {
  intent = 'list_tasks';
} else if (messageText.includes('help')) {
  intent = 'help';
}

return {
  intent,
  user_id: $json.user_id,
  chat_id: $json.chat_id,
  username: $json.username,
  extractedData,
};
```

### 2. Database Change Processing

**Webhook Trigger Node:**

```json
{
  "httpMethod": "POST",
  "path": "database-changes",
  "responseMode": "responseNode"
}
```

**Switch Node - Route by Operation:**

```json
{
  "mode": "expression",
  "output": "={{$json.type}}",
  "rules": {
    "INSERT": 0,
    "UPDATE": 1,
    "DELETE": 2
  }
}
```

## Testing Setup

### 1. Local Development Environment

```bash
# Terminal 1: Start n8n
docker run -it --rm --name n8n -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Terminal 2: Start Supabase locally
supabase start

# Terminal 3: Serve Edge Functions
supabase functions serve --env-file .env.local
```

### 2. Environment Variables

**`.env.local`** for Edge Functions:

```env
N8N_WEBHOOK_URL=http://host.docker.internal:5678
OPENPROJECT_API_URL=http://host.docker.internal:8080/api/v3
OPENPROJECT_API_KEY=your_api_key_here
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. Test Scenarios

#### Test Database Integration

```sql
-- In Supabase SQL Editor
INSERT INTO tasks (title, description, status, priority)
VALUES ('Test Integration', 'Testing webhook flow', 'open', 'High');
```

#### Test Telegram Integration

Send message to bot: "Create task: Fix the generator"

#### Test OpenProject API

```bash
curl -X POST http://localhost:54321/functions/v1/openproject-sync \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "title": "API Test Task",
      "description": "Testing direct API integration",
      "status": "open",
      "priority": "Medium"
    }
  }'
```

## Monitoring & Debugging

### Edge Function Logs

```bash
# View all function logs
supabase functions logs

# View specific function logs
supabase functions logs telegram-webhook
supabase functions logs database-webhook
supabase functions logs openproject-sync
```

### n8n Monitoring

- Access n8n UI at http://localhost:5678
- Check "Executions" tab for webhook triggers
- Review execution logs for detailed debugging

### OpenProject API Testing

```bash
# Test API connectivity
curl -H "Authorization: Basic $(echo -n 'apikey:YOUR_API_KEY' | base64)" \
  http://localhost:8080/api/v3/projects

# Check work packages
curl -H "Authorization: Basic $(echo -n 'apikey:YOUR_API_KEY' | base64)" \
  http://localhost:8080/api/v3/work_packages
```

## Production Deployment

### 1. Environment Setup

- Deploy n8n to persistent server/cloud instance
- Configure Supabase Edge Functions with production URLs
- Set up OpenProject with proper authentication
- Configure Telegram webhook with production Edge Function URL

### 2. Security Checklist

- [ ] All API keys stored in environment variables
- [ ] Webhook endpoints use HTTPS
- [ ] Telegram webhook secret configured
- [ ] OpenProject API access restricted to FLRTS services
- [ ] Rate limiting implemented on all webhooks
- [ ] Error logging configured (no sensitive data)

### 3. Monitoring Setup

- [ ] Edge Function logs aggregated
- [ ] n8n execution monitoring configured
- [ ] OpenProject API call monitoring
- [ ] Telegram webhook delivery monitoring
- [ ] Alert thresholds configured for failures

---

_Updated for current FLRTS architecture: Edge Functions + self-hosted n8n_
_Replaces obsolete n8n-cloud configuration_ _Security: All credentials removed
from documentation_
