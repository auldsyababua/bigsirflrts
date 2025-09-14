# OpenAI Integration Architecture

## Overview

This document defines the OpenAI GPT-4o integration architecture for the FLRTS NLP service, focusing on Story 2.2 requirements for timezone-aware natural language parsing of task management commands.

## Architecture Flow

```
User → Telegram → FLRTS NLP → OpenAI GPT-4o → FLRTS NLP → OpenProject API → Supabase
                                    ↓
                            (timezone parsing)
                                    ↓
                            FLRTS NLP Service
                                    ↓
                            (timezone conversion)
```

## OpenAI API Integration

### API Configuration

```typescript
interface OpenAIConfig {
  apiKey: string;                    // From environment variable
  model: 'gpt-4o' | 'gpt-4o-mini';  // Use gpt-4o for production
  temperature: 0.3;                   // Low for deterministic parsing
  maxTokens: 2000;                   // Sufficient for response
  topP: 0.9;                         // Slight variability allowed
  frequencyPenalty: 0;               // No penalty needed
  presencePenalty: 0;                // No penalty needed
  responseFormat: { type: 'json_object' };  // Enforce JSON response
}
```

### Request Payload Structure

The FLRTS NLP service MUST send the following structured data to OpenAI for every parsing request:

```typescript
interface OpenAIRequestPayload {
  model: 'gpt-4o';
  messages: [
    {
      role: 'system';
      content: string;  // System prompt with instructions
    },
    {
      role: 'user';
      content: string;  // Structured context + user message
    }
  ];
  temperature: 0.3;
  response_format: { type: 'json_object' };
}
```

### System Prompt Template

```typescript
const SYSTEM_PROMPT = `You are a task parsing assistant for a distributed team task management system.
Parse natural language commands into structured JSON for task operations.

CRITICAL RULES:
1. Always return valid JSON matching the exact schema provided
2. Identify the operation type: CREATE, READ, UPDATE, or ARCHIVE (never DELETE)
3. Extract all entities mentioned (people, locations, times)
4. Identify time context: sender_time, assignee_time, or absolute
5. Parse relative dates based on sender's current time
6. Return confidence score between 0-1
7. Include parse_rationale: a concise explanation of parsing decisions
8. If parsing fails, return empty data with parse_errors array

TIMEZONE CONTEXT:
- When someone says "my time" or "his/her time", mark time_context appropriately
- Default to sender_time if ambiguous
- "EOD" means 5:00 PM in the respective timezone
- "COB" means 6:00 PM in the respective timezone
- "Morning" means 9:00 AM, "Afternoon" means 2:00 PM

OUTPUT SCHEMA:
{
  "operation": "CREATE|READ|UPDATE|ARCHIVE",
  "flrt_type": "TASK|LIST",
  "data": {
    "assigner": "string",
    "assignee": "string",
    "participants": ["array of strings"],
    "task_description": "string",
    "reminder_at": "ISO-8601 or null",
    "due_at": "ISO-8601 or null",
    "recurrence": "string or null",
    "location": "string or null",
    "assignee_timezone": "string",
    "status": "todo|in_progress|done|archived",
    "original_time_reference": "string",
    "time_context": "sender_time|assignee_time|absolute",
    "work_package_id": "string or null"
  },
  "confidence": number,
  "parse_rationale": "string",
  "parse_errors": ["array of error strings"]
}`;
```

### User Message Structure

```typescript
function buildUserMessage(rawInput: string, sender: TeamMember): string {
  const context = {
    message: rawInput,
    context: {
      sender: {
        name: sender.name,
        timezone: sender.timezone,
        current_time: new Date().toISOString()
      },
      team_members: {
        "Joel": { timezone: "America/New_York", role: "CEO" },
        "Bryan": { timezone: "America/New_York", role: "CFO" },
        "Taylor": { timezone: "America/Chicago", role: "Operator" },
        "Colin": { timezone: "America/Los_Angeles", role: "CTO" },
        "Bernie": { timezone: "America/Los_Angeles", role: "Investor" },
        "Ari": { timezone: "America/Los_Angeles", role: "Investor" }
      },
      available_projects: ["Site A", "Site B", "Site C"],
      supported_operations: ["CREATE", "READ", "UPDATE", "ARCHIVE"]
    }
  };
  
  return JSON.stringify(context);
}
```

## Response Processing

### OpenAI Response Schema

```typescript
interface OpenAIResponse {
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'ARCHIVE';
  flrt_type: 'TASK' | 'LIST';
  data: {
    assigner: string;
    assignee: string;
    participants: string[];
    task_description: string;
    reminder_at: string | null;
    due_at: string | null;
    recurrence: string | null;
    location: string | null;
    assignee_timezone: string;
    status: 'todo' | 'in_progress' | 'done' | 'archived';
    original_time_reference: string;
    time_context: 'sender_time' | 'assignee_time' | 'absolute';
    work_package_id?: string;
  };
  confidence: number;
  parse_rationale: string;
  parse_errors: string[];
}
```

### Timezone Conversion Logic

```typescript
import moment from 'moment-timezone';

class TimezoneConverter {
  private teamTimezones = {
    'Joel': 'America/New_York',
    'Bryan': 'America/New_York', 
    'Taylor': 'America/Chicago',
    'Colin': 'America/Los_Angeles',
    'Bernie': 'America/Los_Angeles',
    'Ari': 'America/Los_Angeles'
  };

  convertToAssigneeTime(
    timestamp: string,
    timeContext: string,
    senderTimezone: string,
    assigneeTimezone: string
  ): string {
    if (!timestamp) return null;

    let sourceTz: string;
    
    switch(timeContext) {
      case 'sender_time':
        sourceTz = senderTimezone;
        break;
      case 'assignee_time':
        // Already in assignee's timezone
        return timestamp;
      case 'absolute':
        // Assume UTC if absolute
        sourceTz = 'UTC';
        break;
      default:
        sourceTz = senderTimezone;
    }

    // Convert from source to assignee timezone
    const sourceTime = moment.tz(timestamp, sourceTz);
    const assigneeTime = sourceTime.clone().tz(assigneeTimezone);
    
    return assigneeTime.format();
  }

  parseRelativeTime(
    relativeRef: string,
    baseTime: string,
    timezone: string
  ): string {
    const base = moment.tz(baseTime, timezone);
    
    // Handle common patterns
    const patterns = {
      'tomorrow': () => base.add(1, 'day').hour(9).minute(0),
      'next week': () => base.add(1, 'week').startOf('week').hour(9).minute(0),
      'next Monday': () => base.day(8).hour(9).minute(0), // Next Monday
      'EOD': () => base.hour(17).minute(0),
      'COB': () => base.hour(18).minute(0),
      'in (\\d+) hours?': (match) => base.add(parseInt(match[1]), 'hours'),
      'in (\\d+) days?': (match) => base.add(parseInt(match[1]), 'days'),
    };

    for (const [pattern, handler] of Object.entries(patterns)) {
      const regex = new RegExp(pattern, 'i');
      const match = relativeRef.match(regex);
      if (match) {
        return handler(match).format();
      }
    }

    // Fallback to natural language parsing
    const parsed = moment.tz(relativeRef, timezone);
    return parsed.isValid() ? parsed.format() : null;
  }
}
```

## Error Handling

### Confidence Thresholds

```typescript
enum ConfidenceAction {
  AUTO_EXECUTE = 0.95,   // Proceed without confirmation
  CONFIRM = 0.80,        // Show for confirmation
  CLARIFY = 0.60,        // Request clarification
  REJECT = 0.0           // Cannot parse (< 0.60)
}

function handleParsedResponse(response: OpenAIResponse): Action {
  if (response.parse_errors.length > 0) {
    return { type: 'ERROR', errors: response.parse_errors };
  }
  
  if (response.confidence >= ConfidenceAction.AUTO_EXECUTE) {
    return { type: 'EXECUTE', data: response.data };
  }
  
  if (response.confidence >= ConfidenceAction.CONFIRM) {
    return { type: 'CONFIRM', data: response.data };
  }
  
  if (response.confidence >= ConfidenceAction.CLARIFY) {
    return { type: 'CLARIFY', data: response.data, suggestions: generateSuggestions(response) };
  }
  
  return { type: 'REJECT', reason: 'Low confidence parse' };
}
```

### Retry Logic

```typescript
class OpenAIClient {
  private maxRetries = 3;
  private retryDelay = 1000;

  async callOpenAI(payload: OpenAIRequestPayload): Promise<OpenAIResponse> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          // Rate limited - exponential backoff
          await this.delay(this.retryDelay * Math.pow(2, attempt));
          continue;
        }

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
        
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw new OpenAIError('Max retries exceeded', error);
        }
        await this.delay(this.retryDelay);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Monitoring & Observability

### Metrics to Track

```typescript
interface NLPMetrics {
  // Performance Metrics
  openai_response_time_ms: Histogram;
  parsing_confidence_score: Histogram;
  timezone_conversion_success_rate: Counter;
  
  // Business Metrics
  operations_by_type: Counter;  // CREATE, READ, UPDATE, ARCHIVE
  tasks_by_assignee: Counter;
  tasks_by_project: Counter;
  
  // Error Metrics
  openai_api_errors: Counter;
  parsing_failures: Counter;
  low_confidence_parses: Counter;
}
```

### Logging Structure

```typescript
interface NLPLogEntry {
  request_id: string;
  timestamp: string;
  user_id: string;
  raw_input: string;
  openai_request: object;
  openai_response: object;
  converted_times: {
    original: string;
    converted: string;
    timezone_from: string;
    timezone_to: string;
  };
  confidence: number;
  parse_rationale?: string;
  operation: string;
  success: boolean;
  error?: string;
  duration_ms: number;
}
```

## Cost Optimization

### Token Usage Estimation

```typescript
class TokenEstimator {
  // Rough estimation: 1 token ≈ 4 characters
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    // GPT-4o pricing as of 2025
    const INPUT_COST_PER_1M = 2.50;    // $2.50 per 1M input tokens
    const OUTPUT_COST_PER_1M = 10.00;  // $10.00 per 1M output tokens

    return (inputTokens / 1_000_000 * INPUT_COST_PER_1M) +
           (outputTokens / 1_000_000 * OUTPUT_COST_PER_1M);
  }
}
```

### Optimization Strategies

1. **Use GPT-4o-mini for simple commands**: Detect simple patterns locally
2. **Cache common phrases**: Store frequently used task templates
3. **Batch similar requests**: Group timezone conversions
4. **Implement local validation**: Reject invalid inputs before API call
5. **Progressive enhancement**: Start with regex, fallback to AI

## Security Considerations

1. **Never log API keys**: Use environment variables only
2. **Sanitize user input**: Remove potential injection attempts
3. **Rate limit by user**: Prevent abuse
4. **Validate timezone data**: Ensure valid IANA timezone strings
5. **Audit trail**: Log all operations for compliance

## Testing Strategy

### Unit Tests for Timezone Logic

```typescript
describe('TimezoneConverter', () => {
  it('converts sender time to assignee time correctly', () => {
    const converter = new TimezoneConverter();
    const result = converter.convertToAssigneeTime(
      '2025-01-15T14:00:00',
      'sender_time',
      'America/New_York',
      'America/Los_Angeles'
    );
    expect(result).toBe('2025-01-15T11:00:00-08:00');
  });

  it('handles DST transitions', () => {
    // Test cases for DST boundaries
  });

  it('parses relative times correctly', () => {
    // Test "tomorrow", "next week", etc.
  });
});
```

### Integration Tests

- Mock OpenAI responses for consistent testing
- Test full flow: Telegram → NLP → OpenAI → OpenProject
- Validate timezone conversion accuracy
- Test error handling and retries
