# Linear Agents: Complete Guide

## What Are Linear Agents?

Linear agents are **AI-powered programmable teammates** that integrate directly into Linear workflows. They can be:
- **@mentioned** in comments
- **Assigned to issues** like human team members
- **Delegated work** through issue assignment
- **Participate in conversations** via comments and activities

## Creating a Linear Agent

### 1. Setup Process

1. **Create OAuth Application** in Linear settings
2. **Configure permissions**:
   - `app:assignable` - Allows agent to be assigned issues
   - `app:mentionable` - Allows @mentions of agent
3. **Enable webhook categories**:
   - **Agent session events** (required)
   - **Inbox notifications** (recommended)
   - **Permission changes** (optional)
4. **Set application identity**:
   - Name (displayed as agent's identity)
   - Icon/avatar

### 2. Authentication

Use OAuth with `actor=app` to get an app-scoped token (not user-scoped). This ensures actions are attributed to the agent, not individual users.

### 3. Webhook Receiver

Must respond within **5 seconds** to webhook delivery.

## Agent Session Lifecycle

### How Sessions Work

An `AgentSession` is automatically created when:
- User @mentions the agent
- Agent is assigned/delegated an issue
- User provides follow-up prompts

### Session States (managed automatically by Linear)

| State | Meaning |
|-------|---------|
| `pending` | Session created, waiting for first activity |
| `active` | Agent is working |
| `awaitingInput` | Agent needs user response (via `elicitation` activity) |
| `error` | Agent encountered an error |
| `complete` | Work finished |

### Key Webhooks

**`AgentSessionEvent` with action `created`:**
- New session started
- Agent has **10 seconds** to send first activity or will be marked unresponsive
- Context provided: `issue`, `comment`, `previousComments`, `guidance`

**`AgentSessionEvent` with action `prompted`:**
- User sent new message to existing session
- Find user input in `agentActivity.body`

## Agent Activities (How Agents Communicate)

Agents emit **semantic activities** to show progress. Use the `createAgentActivity` mutation:

### Activity Types

#### 1. `thought` - Internal reasoning (visible to users)

```json
{
  "type": "thought",
  "body": "I need to check the database schema first..."
}
```

#### 2. `action` - Tool/function execution

```json
{
  "type": "action",
  "action": "Searching codebase",
  "parameter": "authentication logic",
  "result": "Found in src/auth.ts"
}
```

*Note: `result` is optional, add after completion*

#### 3. `elicitation` - Request user input

```json
{
  "type": "elicitation",
  "body": "Which database should I check: production or staging?"
}
```

*Sets session to `awaitingInput` state*

#### 4. `response` - Final answer/completion

```json
{
  "type": "response",
  "body": "I've created the migration file and updated the schema."
}
```

*Transitions session to `complete` (unless `signal: "continue"` set)*

#### 5. `error` - Report failures

```json
{
  "type": "error",
  "body": "Cannot access database: permission denied"
}
```

### Advanced Features

**Ephemeral activities:**
- Mark `thought` or `action` as `ephemeral: true`
- Replaced by next activity (useful for loading states)

**Signals:**
- `signal: "stop"` (from user) - Stop work immediately
- `signal: "continue"` (from agent) - Don't auto-complete session after response

**Mentions in activities:**

Use Linear URLs in Markdown:

```markdown
https://linear.app/workspace/profiles/user-id I've created https://linear.app/workspace/issue/PROJ-123
```

Renders as: "@user I've created @PROJ-123"

## Best Practices

### Timing Requirements

-  First activity within **10 seconds** of `created` webhook
-  Follow-up activities allowed for **30 minutes**
-  Respond with `thought` immediately to acknowledge receipt

### Issue Management

- When delegated an issue, move it to first "started" status
- Set `Issue.delegate` to your agent when working on implementation
- Use **Agent Activities** (not comments) as source of truth - comments are editable

### Communication Style

- Communicate clearly and only when necessary
- Avoid spam or ambiguous interactions
- Clarify ambiguous requests instead of guessing
- Quality and reliability > cleverness

### Conversation Reconstruction

**Don't** parse comments (they're editable). **Do** use Agent Activities:

```graphql
query AgentSession($agentSessionId: String!) {
  agentSession(id: $agentSessionId) {
    activities {
      edges {
        node {
          updatedAt
          content {
            ... on AgentActivityThoughtContent { body }
            ... on AgentActivityActionContent { action parameter result }
            ... on AgentActivityElicitationContent { body }
            ... on AgentActivityResponseContent { body }
            ... on AgentActivityErrorContent { body }
            ... on AgentActivityPromptContent { body }
          }
        }
      }
    }
  }
}
```

## Additional Webhooks

**Inbox Notifications** - Get notified when:
- Agent mentioned/assigned/unassigned
- Comment reactions/replies
- Status changes on assigned issues

**Permission Changes** - Track when:
- Agent gains/loses team access
- OAuth app is revoked

## Integration vs Agent: Which to Build?

| Build Integration if... | Build Agent if... |
|-------------------------|-------------------|
| Primarily reading Linear data | Want distinct workspace identity |
| Actions attributed to individual users | Actions attributed to app itself |
| No need for @mentions/assignments | Need @mentions/assignments |

## Example Workflow

1. User assigns agent to issue or @mentions it
2. `created` webhook received
3. Agent sends `thought` activity within 10s
4. Agent sends `action` activities as it works
5. Agent sends `elicitation` if needs clarification
6. User responds ’ `prompted` webhook
7. Agent sends final `response` activity
8. Session auto-completes

## TypeScript SDK Example

### Creating Agent Activities

```typescript
// Using the Linear TypeScript SDK
const { success, agentActivity } = await linearClient.createAgentActivity({
  agentSessionId: "session-uuid-here",
  content: {
    type: "thought",
    body: "Starting to analyze the codebase..."
  }
});

// Action with result
await linearClient.createAgentActivity({
  agentSessionId: "session-uuid-here",
  content: {
    type: "action",
    action: "Searched codebase",
    parameter: "authentication logic",
    result: "Found 3 implementations in src/auth/"
  }
});

// Request user input
await linearClient.createAgentActivity({
  agentSessionId: "session-uuid-here",
  content: {
    type: "elicitation",
    body: "Should I proceed with the migration or would you like to review first?"
  }
});

// Final response
await linearClient.createAgentActivity({
  agentSessionId: "session-uuid-here",
  content: {
    type: "response",
    body: "Migration complete! Updated 15 files. [View PR](https://github.com/org/repo/pull/123)"
  }
});
```

### Handling Webhooks

```typescript
import { LinearClient } from '@linear/sdk';

interface AgentSessionWebhook {
  type: 'AgentSessionEvent';
  action: 'created' | 'prompted';
  data: {
    agentSessionId: string;
    issue?: any;
    comment?: any;
    previousComments?: any[];
    guidance?: string;
    agentActivity?: any;
  };
}

async function handleWebhook(webhook: AgentSessionWebhook) {
  const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

  if (webhook.action === 'created') {
    // Acknowledge immediately (within 10 seconds!)
    await linearClient.createAgentActivity({
      agentSessionId: webhook.data.agentSessionId,
      content: {
        type: 'thought',
        body: 'I\'ve received your request and am starting to work on it...'
      }
    });

    // Start your agent logic here
    // Use context from webhook.data.issue, webhook.data.guidance, etc.
  }

  if (webhook.action === 'prompted') {
    // User sent follow-up message
    const userMessage = webhook.data.agentActivity?.content?.body;

    // Process user input and respond
    await linearClient.createAgentActivity({
      agentSessionId: webhook.data.agentSessionId,
      content: {
        type: 'response',
        body: `Got it! Processing: "${userMessage}"`
      }
    });
  }
}
```

### Reconstructing Conversation History

```typescript
// @linear/sdk@^53.0.0
const agentSession = await linearClient.agentSession(sessionId);
const agentSessionActivities = await agentSession.activities();

const conversationHistory: string[] = [];

agentSessionActivities.nodes.forEach(activity => {
  switch (activity.content.__typename) {
    case "AgentActivityThoughtContent":
      conversationHistory.push(`[Thought] ${activity.content.body}`);
      break;
    case "AgentActivityActionContent":
      conversationHistory.push(
        `[Action] ${activity.content.action} | ${activity.content.parameter}` +
        (activity.content.result ? ` ’ ${activity.content.result}` : '')
      );
      break;
    case "AgentActivityElicitationContent":
      conversationHistory.push(`[Question] ${activity.content.body}`);
      break;
    case "AgentActivityResponseContent":
      conversationHistory.push(`[Response] ${activity.content.body}`);
      break;
    case "AgentActivityErrorContent":
      conversationHistory.push(`[Error] ${activity.content.body}`);
      break;
    case "AgentActivityPromptContent":
      conversationHistory.push(`[User] ${activity.content.body}`);
      break;
  }
});
```

## GraphQL Mutations Reference

### Create Agent Session

```graphql
mutation CreateAgentSession($input: AgentSessionCreateOnIssueInput!) {
  agentSessionCreateOnIssue(input: $input) {
    success
    agentSession {
      id
      state
    }
  }
}
```

Variables:
```json
{
  "input": {
    "issueId": "issue-uuid-here"
  }
}
```

### Update Session External URL

```graphql
mutation UpdateSessionUrl($input: AgentSessionUpdateExternalUrlInput!) {
  agentSessionUpdateExternalUrl(input: $input) {
    success
    agentSession {
      id
      externalUrl
    }
  }
}
```

Variables:
```json
{
  "input": {
    "id": "session-uuid-here",
    "externalUrl": "https://your-dashboard.com/session/123"
  }
}
```

### Create Agent Activity

```graphql
mutation CreateAgentActivity($input: AgentActivityCreateInput!) {
  agentActivityCreate(input: $input) {
    success
    agentActivity {
      id
      content {
        __typename
      }
    }
  }
}
```

Variables (thought):
```json
{
  "input": {
    "agentSessionId": "session-uuid-here",
    "content": {
      "type": "thought",
      "body": "Analyzing the requirements..."
    }
  }
}
```

Variables (action with result):
```json
{
  "input": {
    "agentSessionId": "session-uuid-here",
    "content": {
      "type": "action",
      "action": "Searched",
      "parameter": "authentication code",
      "result": "Found in src/auth/login.ts"
    }
  }
}
```

Variables (ephemeral):
```json
{
  "input": {
    "agentSessionId": "session-uuid-here",
    "ephemeral": true,
    "content": {
      "type": "thought",
      "body": "Loading..."
    }
  }
}
```

## Resources

- **Official Docs**: [linear.app/developers/agents](https://linear.app/developers/agents)
- **API Explorer**: [GraphQL Schema](https://studio.apollographql.com/public/Linear-Webhooks/variant/current/schema/reference/objects)
- **TypeScript SDK**: [@linear/sdk on npm](https://www.npmjs.com/package/@linear/sdk)
- **Community**: #api-agents in [Linear Community Slack](https://linear.app/join-slack)
- **Webhook Docs**: [linear.app/developers/webhooks](https://linear.app/developers/webhooks)
- **Best Practices**: [linear.app/developers/agent-best-practices](https://linear.app/developers/agent-best-practices)

## Common Pitfalls

### L Don't

- Wait more than 10 seconds to send first activity after `created` webhook
- Parse comments as source of truth (they're editable)
- Use `prompt` type activities (only users can create these)
- Mark `response` or `error` activities as ephemeral
- Spam activities unnecessarily

###  Do

- Send immediate acknowledgment (`thought`) when session created
- Use Agent Activities for conversation history
- Set `externalUrl` on sessions for dashboard links
- Handle both `created` and `prompted` webhook actions
- Use ephemeral activities for temporary states (loading, progress)
- Include helpful links in Markdown (they auto-convert to mentions)
- Stop work immediately when receiving `signal: "stop"`
