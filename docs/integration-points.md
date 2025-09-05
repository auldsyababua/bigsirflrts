# Integration Points Documentation

## Repository Structure

We now have both repositories cloned locally:
- **tududi**: Task management backend at `/tududi`
- **ui2**: Natural language input component at `/ui2`

## tududi Backend API

### Task Creation Endpoint
- **Endpoint**: `POST /api/task`
- **Location**: `tududi/backend/routes/tasks.js:1395`

### Required Fields for Task Creation
```javascript
{
  name: string,              // Task title (required)
  priority: integer,         // 0-2 (optional)
  due_date: datetime,        // ISO 8601 format (optional)
  status: string,           // Task status (optional)
  note: string,             // Description/notes (optional)
  project_id: integer,      // Project assignment (optional)
  tags: array,              // Tag names (optional)
  today: boolean,           // Mark for today (optional)
  recurrence_type: string,  // For recurring tasks (optional)
  // ... additional recurrence fields
}
```

### Key Observations
1. **Timezone Handling**: tududi uses `moment-timezone` and has utilities in `backend/utils/timezone-utils.js`
2. **Date Storage**: The `due_date` field is stored as DATE type in Sequelize
3. **User Context**: Routes expect `req.currentUser` for user identification
4. **Authentication**: Will need to handle auth tokens for API calls

## ui2 Component

### Installation
```bash
npm i ui2-sdk
```

### Key Features
- **Intent Detection**: Natural language understanding built-in
- **Context Awareness**: Can use app context for better intent detection
- **Instant Preview**: Shows what will happen before committing action

### Integration Approach
ui2 is designed to be integrated as an SDK that can:
1. Accept natural language input
2. Identify user intent
3. Trigger actions based on intent

## NLP Service Architecture

### Data Flow
1. **Input**: User types in ui2 component
2. **Processing**: 
   - ui2 sends text to our NLP service
   - NLP service calls OpenAI GPT-4o API
   - OpenAI returns structured JSON
3. **Validation**: Zod schema validates response
4. **Confirmation**: Show parsed task to user
5. **Submission**: Send to tududi API

### Key Integration Points

#### 1. OpenAI Prompt Engineering
Need to create prompt that includes:
- User/timezone mapping (Joel/Bryan: EST, Taylor: CST, Colin/Bernie/Ari: PST)
- JSON schema for output structure
- Timezone conversion rules
- Date parsing instructions

#### 2. tududi API Integration
- **Authentication**: Need to handle user session/tokens
- **User Mapping**: Map names to tududi user IDs
- **Date Format**: Convert parsed dates to ISO 8601
- **Timezone**: Ensure dates are in UTC for storage

#### 3. ui2 Component Setup
- Install ui2-sdk in frontend
- Configure intent handlers
- Set up preview functionality
- Handle correction loop

#### 4. Telegram Mini App (Fallback)
- Create simple form UI
- Direct tududi API integration
- Manual date/time entry

## Environment Variables Needed

```env
# OpenAI
OPENAI_API_KEY=

# tududi Backend
TUDUDI_API_URL=http://localhost:3002/api
TUDUDI_AUTH_TOKEN=

# User Mapping
USER_MAPPING_JSON='{"joel": {"id": 1, "tz": "America/New_York"}, ...}'
```

## Next Steps for Implementation

1. **Create OpenAI Prompt Template**
   - Define JSON schema
   - Include timezone conversion logic
   - Add user mapping context

2. **Build NLP Service**
   - Node.js/TypeScript setup
   - OpenAI API integration
   - Zod validation
   - REST endpoint

3. **Integrate ui2**
   - Install in frontend
   - Configure intent handlers
   - Connect to NLP service

4. **Connect to tududi**
   - Handle authentication
   - Format requests properly
   - Test timezone conversions

5. **Test with 100 Examples**
   - Load test cases from examples.md
   - Verify JSON output
   - Check timezone accuracy

## Critical Requirements

### Timezone Conversion (Most Important!)
- ALL times must be converted to assignee's local timezone
- Example: "1pm Colin's time" for Taylor = 3pm CST
- Store in UTC but display in local time

### User Recognition
Must correctly identify:
- Joel (CEO): EST
- Bryan (CFO): EST  
- Taylor (Operator): CST
- Colin (CTO): PST
- Bernie (Investor): PST
- Ari (Investor): PST

### Date Parsing
Handle:
- Relative dates: "tomorrow", "next Tuesday"
- Vague times: "afternoon", "EOD", "COB"
- Specific times: "3pm", "15:00"
- Context-aware: "his time", "Colin's timezone"