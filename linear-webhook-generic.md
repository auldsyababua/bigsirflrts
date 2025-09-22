# Generic Linear Webhook Deployment Options

## Overview

These are project-agnostic webhook deployment options that can work with any repository using Linear.

## Option 1: GitHub Actions (No External Service Needed)

This approach uses GitHub's built-in webhook support and Actions - works for any GitHub repository.

### Setup GitHub Webhook Receiver

Create `.github/workflows/linear-webhook.yml`:

```yaml
name: Linear Webhook Handler

on:
  workflow_dispatch:
    inputs:
      linear_payload:
        description: 'Linear webhook payload'
        required: true
        type: string

  repository_dispatch:
    types: [linear-webhook]

jobs:
  process-webhook:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Process Linear Event
        env:
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
          PAYLOAD: ${{ github.event.client_payload || github.event.inputs.linear_payload }}
        run: |
          echo "$PAYLOAD" | jq '.'

          # Extract event type and data
          EVENT_TYPE=$(echo "$PAYLOAD" | jq -r '.type')
          ACTION=$(echo "$PAYLOAD" | jq -r '.action')

          # Handle different event types
          if [ "$EVENT_TYPE" = "Issue" ]; then
            if [ "$ACTION" = "create" ]; then
              # Create branch for new issue
              ISSUE_ID=$(echo "$PAYLOAD" | jq -r '.data.identifier')
              ISSUE_TITLE=$(echo "$PAYLOAD" | jq -r '.data.title' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | cut -c1-50)
              BRANCH_NAME="linear/${ISSUE_ID}-${ISSUE_TITLE}"

              git checkout -b "$BRANCH_NAME"
              git push -u origin "$BRANCH_NAME"
            fi
          fi
```

### Create Webhook Forwarder

Since Linear can't directly trigger GitHub Actions, use a simple forwarder:

1. **Using Pipedream (Free)**:
   - Create account at pipedream.com
   - Create HTTP webhook trigger
   - Add step to forward to GitHub:
   ```javascript
   async (event, steps) => {
     const { data } = event.body;

     await fetch('https://api.github.com/repos/YOUR_ORG/YOUR_REPO/dispatches', {
       method: 'POST',
       headers: {
         'Authorization': `token ${process.env.GITHUB_TOKEN}`,
         'Accept': 'application/vnd.github.v3+json'
       },
       body: JSON.stringify({
         event_type: 'linear-webhook',
         client_payload: data
       })
     });
   }
   ```

## Option 2: GitHub App (Self-Contained)

Create a GitHub App that receives webhooks directly:

### 1. Create GitHub App

```javascript
// github-app-linear-sync.js
const { App } = require('@octokit/app');
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const LINEAR_WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET;
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;

const githubApp = new App({
  appId: GITHUB_APP_ID,
  privateKey: GITHUB_APP_PRIVATE_KEY,
});

// Verify Linear webhook signature
function verifyLinearSignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', LINEAR_WEBHOOK_SECRET);
  hmac.update(JSON.stringify(payload));
  const expected = hmac.digest('hex');
  return signature === expected;
}

app.post('/webhook/linear', async (req, res) => {
  const signature = req.headers['linear-signature'];

  if (!verifyLinearSignature(req.body, signature)) {
    return res.status(401).send('Unauthorized');
  }

  const { type, action, data } = req.body;

  if (type === 'Issue') {
    await handleIssueEvent(action, data);
  }

  res.json({ success: true });
});

async function handleIssueEvent(action, data) {
  const { issue } = data;

  // Get installation for your repository
  const octokit = await githubApp.getInstallationOctokit(INSTALLATION_ID);

  if (action === 'create' && issue.assignee) {
    // Create branch
    const branchName = `linear/${issue.identifier.toLowerCase()}-${issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50)}`;

    const { data: ref } = await octokit.rest.git.getRef({
      owner: 'YOUR_ORG',
      repo: 'YOUR_REPO',
      ref: 'heads/main'
    });

    await octokit.rest.git.createRef({
      owner: 'YOUR_ORG',
      repo: 'YOUR_REPO',
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Linear webhook receiver running on port ${PORT}`);
});
```

### 2. Deploy to Free Services

**Option A: Vercel (Recommended)**
```javascript
// api/linear-webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle webhook
  // ... (webhook logic here)

  res.status(200).json({ success: true });
}
```

Deploy: `vercel deploy`

**Option B: Netlify Functions**
```javascript
// netlify/functions/linear-webhook.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const payload = JSON.parse(event.body);
  // ... handle webhook

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
```

## Option 3: Simple Polling (No Webhook Needed)

For simpler setups, use GitHub Actions to poll Linear:

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
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Linear SDK
        run: npm install @linear/sdk

      - name: Sync Linear Issues
        env:
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node << 'EOF'
          const { LinearClient } = require('@linear/sdk');
          const { Octokit } = require('@octokit/rest');

          const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
          const github = new Octokit({ auth: process.env.GITHUB_TOKEN });

          async function syncIssues() {
            // Get recent issues
            const issues = await linear.issues({
              filter: {
                updatedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 mins
              }
            });

            for (const issue of issues.nodes) {
              // Check if branch should exist
              if (issue.state.name === 'In Progress' && issue.assignee) {
                const branchName = `linear/${issue.identifier.toLowerCase()}`;

                try {
                  // Check if branch exists
                  await github.repos.getBranch({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    branch: branchName
                  });
                } catch (e) {
                  // Create branch if it doesn't exist
                  const { data: ref } = await github.git.getRef({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    ref: 'heads/main'
                  });

                  await github.git.createRef({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    ref: `refs/heads/${branchName}`,
                    sha: ref.object.sha
                  });

                  console.log(`Created branch ${branchName} for issue ${issue.identifier}`);
                }
              }
            }
          }

          syncIssues().catch(console.error);
          EOF
```

## Configuration in Linear

For any of these approaches:

1. Go to Linear Settings > API > Webhooks
2. Create new webhook with your endpoint URL
3. Select events:
   - Issue (create, update, delete)
   - Comment (create)
   - Project (update)

## Environment Variables

Add to your repository secrets:

```bash
LINEAR_API_KEY=lin_api_xxxxx
LINEAR_WEBHOOK_SECRET=lin_whs_xxxxx  # From webhook creation
GITHUB_TOKEN=ghp_xxxxx  # With repo permissions
```

## Benefits of Each Approach

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| GitHub Actions + Forwarder | No hosting needed, free | Requires external forwarder | Small teams |
| GitHub App | Self-contained, scalable | Needs hosting | Organizations |
| Polling | Simplest, no webhooks | 15min delay, API usage | Personal projects |

## Testing

Test any approach with:

```bash
# Create test issue in Linear
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { issueCreate(input: { teamId: \"YOUR_TEAM_ID\", title: \"Test webhook integration\" }) { issue { id identifier } } }"
  }'
```

Then check if:
1. Branch was created in GitHub
2. Action ran successfully
3. Logs show correct processing

---

*This setup is completely project-agnostic and can be reused across any repository that uses Linear for project management.*