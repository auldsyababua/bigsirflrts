# Architecture Decision Record: MVP Scope Reduction to CREATE-Only Operations

## Status
PROPOSED

## Context
The FLRTS project needs to deliver a demonstrable NLP task management capability as quickly as possible. The initial scope included full CRUD (Create, Read, Update, Delete) operations via Telegram, which introduces significant complexity around:
- Bidirectional state synchronization between Telegram and OpenProject
- Complex UI requirements (inline keyboards, context management)
- Extensive error handling and recovery mechanisms
- Time-consuming implementation of features that don't demonstrate the core NLP value proposition

## Decision Drivers
1. **Time to Demo**: Need a working demonstration ASAP to show NLP capabilities
2. **Core Value Proposition**: The primary innovation is natural language task creation
3. **Complexity Reduction**: Avoid state management and sync issues
4. **User Experience**: Users can create via NLP, then manage in OpenProject's mature UI
5. **Technical Risk**: Minimize integration points and potential failure modes

## Decision
Reduce the MVP scope to CREATE operations only:
- Support natural language creation of tasks and lists via Telegram
- Defer all READ, UPDATE, and DELETE operations to post-MVP
- Use OpenProject's existing UI for task management after creation
- Focus engineering effort on perfecting the NLP parsing and creation flow

## Architecture Changes

### Before (Full CRUD)
```
User → Telegram Bot → Edge Function → n8n Workflows → OpenProject API ← → Supabase
                  ↑                          ↓
                  └──────── Bidirectional Sync ────────┘
```

### After (CREATE Only)
```
User → Telegram Bot → Edge Function → n8n Workflow → OpenProject API → Supabase
                                            ↓
                                   Simple Confirmation
```

### Simplified Component Interactions
1. **Telegram Bot**: Receives message, sends to Edge Function
2. **Edge Function**: Quick ACK, triggers n8n workflow
3. **n8n Workflow**: 
   - Calls OpenAI to parse NLP
   - Calls OpenProject API to create task/list
   - Returns simple confirmation to user
4. **No Return Path**: No webhooks, no sync, no state management

## Consequences

### Positive
- **Faster Delivery**: 5-day implementation vs 3-4 weeks
- **Reduced Complexity**: No state management or sync logic needed
- **Clear Demo Path**: Shows core NLP value immediately
- **Lower Risk**: Fewer integration points mean fewer failure modes
- **Cleaner Architecture**: Unidirectional data flow is simpler to reason about

### Negative
- **Limited Functionality**: Users must switch to OpenProject UI for management
- **No Immediate Feedback**: Can't query task status via Telegram
- **Potential User Friction**: Two-system workflow may feel disconnected

### Neutral
- **Technical Debt**: Post-MVP will need to architect bidirectional flow
- **User Training**: Clear communication about CREATE-only limitation needed

## Implementation Impact

### MVP Stories (4 Required)
1. **Story 2.1**: Telegram Task Creation (webhook setup)
2. **Story 2.2**: Command Parser (simplified for CREATE only)
3. **Story 3.1**: OpenProject API (CREATE operations only)
4. **Story 3.2**: OpenAI Context Injection (entity matching)

### Deferred Stories (15+ Moved to Post-MVP)
- All Epic 4 (Lists Management)
- Telegram reminders, keyboards, context
- OpenProject webhooks and sync
- Timezone conversion complexity
- Error recovery mechanisms

## Alternatives Considered

### Alternative 1: Read-Only + Create
Support CREATE and READ, but not UPDATE/DELETE.
- **Rejected**: READ requires state management and complex rendering

### Alternative 2: Fake CRUD via Caching
Implement local state management to simulate full CRUD.
- **Rejected**: Creates sync issues and false user expectations

### Alternative 3: Full CRUD Implementation
Proceed with original scope.
- **Rejected**: 3-4 week timeline unacceptable for demo needs

## References
- PRD v3.0: Focus on CREATE operations
- MVP Story Plan: 5-day implementation timeline
- Epic 1 Completion: Infrastructure ready for simplified scope

## Review Notes
_For Architect Review:_
- Validate unidirectional data flow architecture
- Confirm n8n workflow simplification approach
- Review OpenAI prompt strategy for entity matching
- Assess technical debt implications for post-MVP expansion