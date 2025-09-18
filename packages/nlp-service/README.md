# NLP Service for FLRTS

Natural Language Processing service that parses task requests into structured
OpenProject work packages.

## Features

- ✅ Pure OpenAI GPT-4o parsing (no complex NLP preprocessing)
- ✅ Structured output with Zod validation
- ✅ Reasoning capture for debugging and improvement
- ✅ Supabase integration for logging and analytics
- ✅ Hardcoded team/site/partner data for MVP simplicity

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env` and add your Supabase service key
   - OpenAI key is pulled from 1Password automatically

3. **Start the service:**

   ```bash
   # Development mode with hot reload
   npm run dev

   # Production build
   npm run build
   npm start
   ```

## API Endpoints

### POST /parse

Parse natural language input into structured task.

**Request:**

```json
{
  "input": "Task for @Taylor to inspect pump 3 by tomorrow 3pm",
  "userId": "optional-uuid",
  "context": {
    "timezone": "America/Chicago",
    "currentTime": "2025-09-06T10:00:00Z"
  }
}
```

**Response:**

```json
{
  "success": true,
  "parsed": {
    "operation": "CREATE",
    "workPackage": {
      "subject": "Inspect pump 3",
      "assignee": "Taylor",
      "dueDate": "2025-09-07T20:00:00Z",
      "priority": "normal"
    },
    "reasoning": "Identified @Taylor directly. 'Inspect pump 3' as subject..."
  },
  "metadata": {
    "parseTimeMs": 1234,
    "reasoning": "..."
  }
}
```

### GET /examples

Get example inputs for testing.

### GET /history

View recent parsing logs (last 20).

### GET /analytics

Get parsing success statistics.

### GET /health

Health check endpoint.

## Testing

Run the test suite with PRD examples:

```bash
npm test
```

This will:

1. Test all PRD example inputs
2. Show parsed outputs with reasoning
3. Display success statistics

## Schema

The service uses a fixed schema with:

- **Team Members:** Taylor, Colin, Bryan, Austin
- **Sites:** Site A, Site B, Site C
- **Partners:** Partner 1, Partner 2
- **Operations:** CREATE, UPDATE, DELETE, LIST
- **Priorities:** low, normal, high, immediate

## Reasoning Field

Every parse includes a `reasoning` field explaining:

1. How assignees were identified
2. Date/time parsing logic and timezone conversions
3. Priority level decisions
4. Ambiguity resolutions and assumptions

This helps debug parsing errors and improve prompts over time.

## Supabase Logging

All parses are logged to `parsing_logs` table with:

- Input text
- Parsed JSON output
- Reasoning explanation
- Success/failure status
- Error messages (if any)
- User ID (if authenticated)
- Timestamp

## Next Steps

1. **Connect to OpenProject API** - Transform parsed tasks into actual work
   packages
2. **Add Google OAuth** - Authenticate users via Supabase
3. **Dynamic Context** - Fetch real-time data from Supabase (V2)
4. **Improve Prompts** - Use reasoning data to refine parsing accuracy
