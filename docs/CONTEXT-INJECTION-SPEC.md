# ERPNext Context Injection Specification

**Purpose:** Complete technical specification for fetching ERPNext context data
and injecting it into OpenAI prompts

**Last Updated:** October 2025

## Overview

The Telegram webhook handler must fetch real-time context from ERPNext (users,
site locations, current time) and inject it into the OpenAI prompt. This allows
OpenAI to parse natural language against actual entity names and provide
accurate field mappings.

## Context Data Structure

### Complete Context Object

```javascript
{
  "sender": {
    "name": "Colin",                          // Telegram username mapped to team member
    "email": "colin@10nz.tools",             // ERPNext user email
    "timezone": "America/Los_Angeles",        // User timezone (for MVP, hardcoded)
    "telegram_id": "123456789"               // Telegram user ID
  },
  "team_members": [
    {
      "email": "joel@10nz.tools",
      "fullName": "Joel",
      "timezone": "America/New_York",
      "enabled": true
    },
    {
      "email": "bryan@10nz.tools",
      "fullName": "Bryan",
      "timezone": "America/New_York",
      "enabled": true
    },
    {
      "email": "taylor@10nz.tools",
      "fullName": "Taylor",
      "timezone": "America/Chicago",
      "enabled": true
    },
    {
      "email": "colin@10nz.tools",
      "fullName": "Colin",
      "timezone": "America/Los_Angeles",
      "enabled": true
    }
  ],
  "site_locations": [
    "Big Sky",
    "Viper",
    "Crystal Peak",
    "Thunder Ridge"
  ],
  "current_time": {
    "utc": "2024-10-20T18:30:00Z",
    "sender_local": "2024-10-20T11:30:00-07:00"
  }
}
```

## Data Fetching Specification

### 1. Fetch Users from ERPNext

**Endpoint:** `GET https://ops.10nz.tools/api/resource/User`

**Query Parameters:**

```javascript
{
  fields: JSON.stringify(["email", "full_name", "time_zone", "enabled"]),
  filters: JSON.stringify([
    ["enabled", "=", 1],
    ["email", "like", "%@10nz.tools"]
  ]),
  limit_page_length: 50
}
```

**Request Headers:**

```javascript
{
  'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
  'Content-Type': 'application/json'
}
```

**Expected Response:**

```json
{
  "data": [
    {
      "email": "joel@10nz.tools",
      "full_name": "Joel Anderson",
      "time_zone": "America/New_York",
      "enabled": 1
    },
    {
      "email": "bryan@10nz.tools",
      "full_name": "Bryan Smith",
      "time_zone": "America/New_York",
      "enabled": 1
    }
  ]
}
```

**Error Handling:**

- `401 Unauthorized` → Throw error, alert admin
- `500 Server Error` → Use fallback data
- `Timeout (>10s)` → Use fallback data, log warning

**Data Transformation:**

```javascript
function transformUsers(erpnextResponse) {
  return erpnextResponse.data.map((user) => ({
    email: user.email,
    fullName: user.full_name?.split(' ')[0] || user.email.split('@')[0], // Extract first name
    timezone: user.time_zone || 'America/New_York', // Default timezone
    enabled: user.enabled === 1,
  }));
}
```

### 2. Fetch Site Locations from ERPNext

**Endpoint:** `GET https://ops.10nz.tools/api/resource/Location`

**Query Parameters:**

```javascript
{
  fields: JSON.stringify(["name", "location_name"]),
  filters: JSON.stringify([
    ["is_group", "=", 0],  // Only leaf locations (not parent groups)
    ["disabled", "=", 0]
  ]),
  limit_page_length: 100
}
```

**Expected Response:**

```json
{
  "data": [
    {
      "name": "LOC-0001",
      "location_name": "Big Sky Mining Site"
    },
    {
      "name": "LOC-0002",
      "location_name": "Viper Operations"
    }
  ]
}
```

**Error Handling:**

- Use fallback data on any error
- Log warning if fetch fails

**Data Transformation:**

```javascript
function transformLocations(erpnextResponse) {
  return erpnextResponse.data.map((loc) => loc.location_name || loc.name);
}
```

### 3. Determine Sender Context

**Mapping Logic:**

```javascript
function determineSender(telegramUsername, telegramUserId, teamMembers) {
  // Try to match by Telegram username first
  const usernameLower = telegramUsername?.toLowerCase();

  const matched = teamMembers.find((member) => {
    const firstNameLower = member.fullName.toLowerCase();
    return firstNameLower === usernameLower;
  });

  if (matched) {
    return {
      name: matched.fullName,
      email: matched.email,
      timezone: matched.timezone,
      telegram_id: telegramUserId,
    };
  }

  // Fallback: Use first enabled user (for MVP)
  const fallback = teamMembers.find((m) => m.enabled);
  return {
    name: fallback?.fullName || 'Unknown',
    email: fallback?.email || 'unknown@10nz.tools',
    timezone: fallback?.timezone || 'America/New_York',
    telegram_id: telegramUserId,
  };
}
```

## Caching Strategy

### In-Memory Lambda Cache

**Cache Structure:**

```javascript
// Global scope (persists across warm Lambda invocations)
let contextCache = {
  users: null,
  sites: null,
  lastFetchTimestamp: null,
  ttlMs: 5 * 60 * 1000, // 5 minutes
};
```

**Cache Check Logic:**

```javascript
function isCacheValid() {
  if (!contextCache.lastFetchTimestamp) return false;

  const now = Date.now();
  const age = now - contextCache.lastFetchTimestamp;

  return age < contextCache.ttlMs;
}

async function getContext() {
  if (isCacheValid()) {
    logInfo('context_cache_hit', {
      age_ms: Date.now() - contextCache.lastFetchTimestamp,
    });
    return {
      users: contextCache.users,
      sites: contextCache.sites,
    };
  }

  logInfo('context_cache_miss', {
    reason: !contextCache.lastFetchTimestamp ? 'cold_start' : 'expired',
  });

  // Fetch fresh data
  const [users, sites] = await Promise.all([fetchUsers(), fetchSites()]);

  // Update cache
  contextCache.users = users;
  contextCache.sites = sites;
  contextCache.lastFetchTimestamp = Date.now();

  return { users, sites };
}
```

**Cache Invalidation:**

- TTL-based only (no manual invalidation for MVP)
- Cache cleared on Lambda cold start
- Cache refreshed every 5 minutes during warm invocations

**Memory Impact:**

- Users: ~10 users × 200 bytes = 2KB
- Sites: ~10 sites × 100 bytes = 1KB
- Total: ~3KB (negligible Lambda memory impact)

## Fallback Data

### Hardcoded Fallbacks (From PRD)

Used when ERPNext fetch fails:

```javascript
const FALLBACK_USERS = [
  {
    email: 'joel@10nz.tools',
    fullName: 'Joel',
    timezone: 'America/New_York',
    enabled: true,
  },
  {
    email: 'bryan@10nz.tools',
    fullName: 'Bryan',
    timezone: 'America/New_York',
    enabled: true,
  },
  {
    email: 'taylor@10nz.tools',
    fullName: 'Taylor',
    timezone: 'America/Chicago',
    enabled: true,
  },
  {
    email: 'colin@10nz.tools',
    fullName: 'Colin',
    timezone: 'America/Los_Angeles',
    enabled: true,
  },
];

const FALLBACK_SITES = ['Big Sky', 'Viper', 'Crystal Peak', 'Thunder Ridge'];
```

**When to Use Fallbacks:**

1. ERPNext API returns 500+ error
2. Request timeout (>10 seconds)
3. Network connectivity issues
4. Empty response from ERPNext

**Logging Requirements:**

- Always log when fallbacks are used
- Include error reason
- Alert if fallbacks used > 3 times in 1 hour

## OpenAI Prompt Construction

### System Prompt with Context Injection

```javascript
function buildSystemPromptWithContext(context) {
  const teamList = context.team_members
    .map((u) => `- ${u.fullName} (${u.email}) - ${u.timezone}`)
    .join('\n');

  const siteList = context.site_locations.map((s) => `- ${s}`).join('\n');

  return `You are a task extraction assistant for a distributed bitcoin mining operations team.

**Current Context:**
- Current UTC time: ${context.current_time.utc}
- Sender: ${context.sender.name} (${context.sender.email})
- Sender timezone: ${context.sender.timezone}
- Sender local time: ${context.current_time.sender_local}

**Team Members:**
${teamList}

**Site Locations:**
${siteList}

**Your Task:**
Extract task parameters from user messages. Match assignee names to the team members listed above (use email format in output). Match site references to the locations listed above.

**Output Fields:**
- description: The main task description (required, max 5000 chars)
- assignee: Person's email from team list above (null if not specified)
- dueDate: ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ) (null if not specified)
- priority: One of [Low, Medium, High, Urgent] (null if not specified, defaults to Medium)
- rationale: Brief explanation of your parsing logic (required, max 2000 chars)
- confidence: Confidence score 0.0-1.0 (required)

**Parsing Rules:**
1. Match names case-insensitively to team members
2. Convert relative dates ("tomorrow", "Friday") to absolute ISO dates based on sender's local time
3. Infer priority from urgency keywords (ASAP → Urgent, urgent → High)
4. Set confidence < 0.7 if any ambiguity exists
5. Include reasoning in rationale field

**Examples:**
"Taylor check pump #3 by 2pm" →
{
  "description": "Check pump #3",
  "assignee": "taylor@10nz.tools",
  "dueDate": "2024-10-20T14:00:00-05:00",  // Taylor's timezone (CST)
  "priority": null,
  "rationale": "User mentioned 'Taylor' which matches team member taylor@10nz.tools. Time '2pm' converted to Taylor's timezone (CST).",
  "confidence": 0.85
}`;
}
```

### User Message Format

```javascript
{
  role: 'user',
  content: parsed.text  // Raw Telegram message text
}
```

## Error Handling Matrix

| Error Type       | Scenario                | Response             | Logging                    | User Impact                          |
| ---------------- | ----------------------- | -------------------- | -------------------------- | ------------------------------------ |
| ERPNext 401      | Invalid API credentials | Throw error          | Critical log + alert admin | "System error, please contact admin" |
| ERPNext 500      | Server error            | Use fallback data    | Warning log                | None (transparent fallback)          |
| ERPNext Timeout  | Request > 10s           | Use fallback data    | Warning log                | None (transparent fallback)          |
| Empty Response   | No users/sites returned | Use fallback data    | Warning log                | None (transparent fallback)          |
| Network Error    | DNS/connection failure  | Use fallback data    | Error log                  | None (transparent fallback)          |
| Cache Corruption | Invalid cached data     | Clear cache, refetch | Warning log                | Slight delay on next request         |

## Performance Requirements

### Latency Targets

- **Cache Hit:** <5ms (in-memory read)
- **Cache Miss (ERPNext Fetch):** <500ms
  - User fetch: <200ms
  - Site fetch: <200ms
  - Parallel execution: max(200ms, 200ms) = ~200ms total
- **Fallback (on error):** <1ms (hardcoded data)

### Retry Logic

**ERPNext API Calls:**

- Do NOT retry on 401 (auth errors are permanent)
- Do NOT retry on 417 (validation errors are permanent)
- DO retry on 500+ errors:
  - Retry 1: Immediate
  - Retry 2: 1 second delay
  - Retry 3: 2 seconds delay
  - After 3 failures → Use fallback data

**Timeout Configuration:**

```javascript
const FETCH_TIMEOUT_MS = 10000; // 10 seconds per request
const TOTAL_CONTEXT_TIMEOUT_MS = 15000; // 15 seconds for all context fetching
```

## Testing Specification

### Unit Tests

- [ ] Transforms ERPNext user response correctly
- [ ] Transforms ERPNext location response correctly
- [ ] Determines sender from Telegram username
- [ ] Falls back to hardcoded data on API error
- [ ] Cache returns valid data within TTL
- [ ] Cache refetches after TTL expires
- [ ] Cache survives Lambda warm starts
- [ ] Builds system prompt with injected context

### Integration Tests

- [ ] Fetches real users from ERPNext staging
- [ ] Fetches real sites from ERPNext staging
- [ ] Handles 401 errors gracefully
- [ ] Handles 500 errors with fallback
- [ ] Handles timeout with fallback
- [ ] Cache reduces ERPNext API calls (verify in logs)

### Load Tests

- [ ] 100 concurrent requests use cache efficiently
- [ ] Cache hit rate > 80% under normal load
- [ ] Fallback activates < 5% of requests
- [ ] Memory usage stays < 100MB with cache

## Monitoring & Alerting

### Metrics to Track

```javascript
// CloudWatch Metrics (custom)
- context_fetch_duration_ms (p50, p99)
- context_cache_hit_rate (percentage)
- context_fallback_usage_count (count)
- erpnext_api_error_count (count by error_code)
```

### Alerts

1. **Critical:** `erpnext_api_error_401_count > 0` (auth failure)
   - Action: Page admin immediately

2. **High:** `context_fallback_usage_count > 10 in 1 hour`
   - Action: Investigate ERPNext connectivity

3. **Medium:** `context_cache_hit_rate < 50% over 1 hour`
   - Action: Review cache TTL configuration

## References

- Field Mapping: `docs/FIELD-MAPPING.md`
- ERPNext API Docs: `https://frappeframework.com/docs/user/en/api/rest`
- OpenAI Client:
  `infrastructure/aws/lambda/telegram-bot/webhook_handler/lib/openai.mjs`
- Error Handling: `docs/ERROR-HANDLING-MATRIX.md`

---

**Document Owner:** Backend Team **Review Cycle:** After each ERPNext schema
change **Last Reviewed:** October 2025
