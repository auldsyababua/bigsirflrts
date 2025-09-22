# Linear Webhook Deployment Guide

## Overview

This guide explains how to deploy the Linear webhook handler to receive real-time updates from Linear and trigger BMAD agents automatically.

## Deployment Options

### Option 1: Supabase Edge Function (Recommended)

Since you already have Supabase configured, this is the most straightforward approach.

#### 1. Create Edge Function

```bash
# Create the webhook function
supabase functions new linear-webhook

# Copy webhook handler to function
cp scripts/linear-webhook.js supabase/functions/linear-webhook/index.ts
```

#### 2. Update Function for Deno

```typescript
// supabase/functions/linear-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINEAR_WEBHOOK_SECRET = Deno.env.get('LINEAR_WEBHOOK_SECRET')!
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('linear-signature')
    const body = await req.text()

    if (!verifySignature(body, signature, LINEAR_WEBHOOK_SECRET)) {
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = JSON.parse(body)
    const { action, data, type } = payload
    const event = `${type}.${action}`

    console.log(`Received Linear webhook: ${event}`)

    // Handle different event types
    if (type === 'Issue') {
      await handleIssueEvent(event, data)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal error', { status: 500 })
  }
})

async function handleIssueEvent(event: string, data: any) {
  const { issue } = data

  switch (event) {
    case 'Issue.created':
      // Create GitHub branch if assigned
      if (issue.assignee) {
        await createGitHubBranch(issue)
      }
      break

    case 'Issue.updated':
      // Handle status changes
      if (issue.state?.name === 'In Review') {
        await createPullRequest(issue)
      }
      break
  }
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  // Implement HMAC verification
  return true // TODO: Implement
}

async function createGitHubBranch(issue: any) {
  // Use GitHub API to create branch
  const branchName = `colin/10n-${issue.identifier.toLowerCase()}-${issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50)}`

  // TODO: Implement GitHub API call
  console.log(`Would create branch: ${branchName}`)
}

async function createPullRequest(issue: any) {
  // TODO: Implement PR creation
  console.log(`Would create PR for: ${issue.identifier}`)
}
```

#### 3. Deploy Function

```bash
# Set secrets
supabase secrets set LINEAR_WEBHOOK_SECRET=your_webhook_secret
supabase secrets set GITHUB_TOKEN=your_github_token

# Deploy
supabase functions deploy linear-webhook
```

#### 4. Get Webhook URL

Your webhook URL will be:
```
https://thnwlykidzhrsagyjncc.supabase.co/functions/v1/linear-webhook
```

### Option 2: Cloudflare Worker

Since you're already using Cloudflare for other services:

```javascript
// linear-webhook-worker.js
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const signature = request.headers.get('linear-signature')
    const body = await request.text()

    // Verify signature
    if (!await verifySignature(body, signature, env.LINEAR_WEBHOOK_SECRET)) {
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = JSON.parse(body)

    // Process webhook
    await processWebhook(payload, env)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function verifySignature(body, signature, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  )

  const expected = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signature === expected
}

async function processWebhook(payload, env) {
  const { action, data, type } = payload

  // Store in D1 or KV for processing
  await env.LINEAR_EVENTS.put(
    `${type}-${action}-${Date.now()}`,
    JSON.stringify(payload)
  )

  // Trigger GitHub Actions workflow or other automation
  if (type === 'Issue' && action === 'created') {
    await triggerGitHubWorkflow(data.issue, env.GITHUB_TOKEN)
  }
}
```

Deploy with:
```bash
wrangler publish linear-webhook-worker.js
```

### Option 3: GitHub Actions (Simple)

For basic automation without a dedicated webhook endpoint:

```yaml
# .github/workflows/linear-sync.yml
name: Linear Sync

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Sync Linear issues
        env:
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/sync-linear.js

      - name: Create branches for new issues
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          node scripts/create-branches.js

      - name: Update PR descriptions
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/update-prs.js
```

## Configuring Linear Webhook

Once your endpoint is deployed:

1. Go to Linear Settings > API > Webhooks
2. Click "New webhook"
3. Configure:
   - **URL**: Your deployed webhook endpoint
   - **Label**: BigSirFLRTS Integration
   - **Team**: 10netzero
   - **Events**:
     - Issue (created, updated, deleted)
     - Comment (created)
     - Project (updated)

4. Copy the webhook signing secret
5. Add to your environment:
   ```bash
   LINEAR_WEBHOOK_SECRET=lin_whs_xxxxx
   ```

## Testing the Webhook

### 1. Linear Test Event

Linear provides a test button in webhook settings. Use it to verify your endpoint receives events.

### 2. Manual Test

```bash
# Create a test event
curl -X POST https://your-webhook-url \
  -H "Content-Type: application/json" \
  -H "linear-signature: test" \
  -d '{
    "action": "create",
    "type": "Issue",
    "data": {
      "issue": {
        "id": "test-123",
        "identifier": "TEST-1",
        "title": "Test Issue"
      }
    }
  }'
```

### 3. Monitor Logs

- **Supabase**: `supabase functions logs linear-webhook`
- **Cloudflare**: `wrangler tail`
- **GitHub Actions**: Check workflow runs

## Security Considerations

1. **Always verify webhook signatures**
2. **Use environment variables for secrets**
3. **Implement rate limiting**
4. **Log events for debugging**
5. **Handle errors gracefully**

## Troubleshooting

### Webhook not receiving events
- Check Linear webhook settings
- Verify URL is publicly accessible
- Check webhook is enabled

### Signature verification failing
- Ensure webhook secret matches
- Check signature algorithm (HMAC-SHA256)
- Verify body is raw, not parsed

### Events not processing
- Check logs for errors
- Verify API keys are valid
- Test with simple event first

## Next Steps

1. Deploy webhook handler
2. Configure in Linear settings
3. Test with real events
4. Monitor and iterate

---

*For questions or issues, check the [Linear Webhook Documentation](https://developers.linear.app/docs/graphql/webhooks)*