# Project Brief: NLP Task Management Service

## Executive Summary

The NLP Task Management Service is an internal, low-friction natural language processing system that converts conversational task commands into structured JSON for integration with the Open Project task management backend. The service addresses the critical need for rapid, timezone-aware task creation across a distributed team operating in PST, CST, and EST zones at an off-grid bitcoin mining company. By parsing natural language inputs like "Hey Taylor, Colin needs the server logs by 1pm his time" into properly formatted, timezone-converted JSON structures, the system eliminates the friction of traditional form-based task entry. The key value proposition is enabling team members to create tasks using natural conversation patterns while ensuring accurate timezone conversion and structured data output for backend processing.

## Problem Statement

The current task management workflow requires users to manually enter structured data through forms, selecting specific fields for assignees, due dates, and converting times across multiple timezones. This creates significant friction for a distributed team where Joel (CEO) and Bryan (CFO) Taylor (Operator) works in CST and Colin (CTO) and investors Bernie & Ari are in PST, with the company officially operating on CST. 

The impact is measurable in lost productivity - each task creation requires mental timezone math, form navigation, and structured data entry that interrupts workflow. Team members avoid creating tasks for quick requests, leading to dropped balls and miscommunication. Existing solutions like Slack reminders lack integration with the company's Open Project project management system, while traditional NLP solutions fail to handle the complex timezone conversion requirements and informal communication patterns of a small, fast-moving team.

The urgency stems from the company's rapid growth phase where operational efficiency directly impacts bitcoin mining uptime and profitability. Every miscommunicated task or missed deadline due to timezone confusion can result in hours of mining downtime.

## Proposed Solution

The MVP solution uses a single OpenAI GPT-4o API call to handle ALL parsing logic - intent detection, entity extraction, timezone conversion, and data structuring. The system sends raw user input to OpenAI with a comprehensive prompt containing syntax rules, few-shot examples, and timezone mappings. No preprocessing, no separate intent detection, just one prompt that handles everything.

Key differentiators include:
- **Single API approach** - One OpenAI call determines operation type (CRUD) and parses all details
- **Syntax rules in prompt** - @mentions, /commands, and patterns taught via examples
- **Full CRUD support** - CREATE, READ, UPDATE, DELETE operations for tasks/lists/projects
- **Automatic timezone conversion** to assignee's local time (the most critical requirement)
- **1-2 day implementation** - Ship extremely fast, optimize later

This solution prioritizes shipping speed over optimization. All logic lives in the OpenAI prompt, making it instantly modifiable without code changes. The trade-off of slightly higher API costs (~$5/month) is negligible compared to development time savings.

## Target Users

### Primary User Segment: Distributed Team Members

**Profile:**
- Technical and operations staff working across 3 US timezones
- Ages 25-45, technically proficient
- Comfortable with command-line interfaces and text-based communication
- Working in fast-paced, informal communication environment

**Current Behaviors:**
- Using Slack/Discord for most communication
- Manually creating tasks in Open Project when remembered
- Often missing tasks communicated informally
- Struggling with timezone conversions for distributed team

**Specific Needs:**
- Rapid task creation without leaving communication flow
- Automatic handling of timezone complexity
- Natural language input matching their communication style
- Immediate feedback on task interpretation

**Goals:**
- Capture all actionable items from conversations
- Ensure nothing falls through the cracks
- Reduce cognitive load of timezone math
- Maintain team velocity without process overhead

### Secondary User Segment: Leadership & Investors

**Profile:**
- C-suite executives and investors
- Need visibility into operational tasks
- Less frequent task creators, more task reviewers
- Focused on accountability and tracking

**Current Behaviors:**
- Delegating tasks verbally or via message
- Expecting tasks to be tracked without direct entry
- Reviewing task completion in Open Project dashboard

**Needs:**
- Confidence that delegated tasks are captured
- Clear assignment and deadline tracking
- Visibility into team workload

## Goals & Success Metrics

### Business Objectives
- Reduce average task creation time from 45 seconds to under 5 seconds
- Achieve 95% accuracy in timezone conversion within first month
- Capture 80% more informal task requests compared to current baseline
- Reduce missed deadlines due to timezone confusion by 90%

### User Success Metrics
- Less than 5% of tasks require manual correction after parsing
- User satisfaction score of 4.5/5 or higher

### Key Performance Indicators (KPIs)
- **Parse Accuracy**: 95% of inputs correctly parsed to valid JSON structure
- **Timezone Accuracy**: 100% of timezone conversions mathematically correct
- **Response Time**: 95th percentile response time under 200ms
- **System Uptime**: 99.9% availability during business hours
- **Error Rate**: Less than 1% of requests result in parsing errors

## MVP Scope

### Core Features (Must Have)
- **Single OpenAI Prompt:** One comprehensive prompt handling all CRUD operations and parsing
- **Full CRUD Operations:** CREATE, READ, UPDATE, DELETE for tasks, lists, and projects
- **Syntax Rules:** @mentions for assignees, /commands for operations, all defined in prompt
- **Timezone Conversion:** All times converted to assignee's local timezone via prompt logic
- **Entity Recognition:** Identify all team members and map to operations
- **Date Parsing:** Handle all relative dates, times, and expressions in one pass
- **Simple API:** Single endpoint that routes based on OpenAI's operation determination
- **Confirmation UI:** Show parsed result before executing operation
- **Error Handling:** If OpenAI fails, show error and suggest manual entry

### Out of Scope for MVP
- Recurring task parsing (use Open Project's existing recurring task UI)
- Sentiment analysis or priority inference
- Voice input or audio transcription
- Multi-language support
- Custom entity training or model fine-tuning
- Task modification or deletion via NLP
- Complex conditional logic ("if X then create task Y")
- Attachment or file handling
- Integration with external calendars

### MVP Success Criteria
The MVP is successful when it can correctly parse all 100 test examples from the synthetic dataset into valid JSON with proper timezone conversion, maintains sub-200ms response times, and achieves 90% user adoption within the first week of deployment.

## Post-MVP Vision

### Phase 2 Features
- **Recurring Task Support:** Parse natural language recurring patterns like "every Monday at 9am"
- **Context Awareness:** Understand project context and automatically assign tasks to relevant projects
- **Bulk Task Creation:** Parse multiple tasks from a single input paragraph
- **Smart Suggestions:** Suggest assignees based on task content and historical patterns
- **Voice Input:** Add speech-to-text capability for hands-free task creation

### Long-term Vision
Within 12-24 months, evolve the service into a comprehensive conversational task management system that can handle complex queries ("What's on Taylor's plate this week?"), provide intelligent task routing based on workload and expertise, and integrate with communication platforms for automatic task extraction from conversations. The system becomes the central nervous system for operational coordination.

### Expansion Opportunities
- **Multi-company SaaS offering** for small distributed teams
- **Integration marketplace** for Slack, Discord, Teams
- **AI-powered task prioritization** and resource allocation
- **Predictive deadline estimation** based on historical data
- **Cross-platform mobile apps** with voice-first interfaces

## Technical Considerations

### Platform Requirements
- **Target Platforms:** Web-based API service, accessible from any HTTP client
- **Browser/OS Support:** Backend service (OS-agnostic), frontend requires modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- **Performance Requirements:** <200ms response time for 95th percentile, support for 100 concurrent requests

### Technology Preferences
- **Frontend:** TypeScript, Zod for schema validation, ui2 component for input, Telegram Mini App
- **Backend:** Node.js/TypeScript NLP service, OpenAI GPT-4o API integration
- **Database:** Single Supabase PostgreSQL database (directly used by OpenProject, no sync needed)
- **Hosting/Infrastructure:** Digital Ocean VM with Docker Compose orchestration, Cloudflare Tunnel security

### Architecture Considerations
- **Repository Structure:** Containerized microservices architecture with Docker Compose
- **Service Architecture:** VM-based deployment with OpenProject (direct Supabase connection), FLRTS NLP service, n8n workflows
- **Integration Pattern:** FLRTS → OpenProject API (not database), OpenProject → Supabase DB (direct connection)
- **Database Architecture:** Single Supabase PostgreSQL instance with logical schema separation (openproject, business, flrts)
- **NLP Layer:** FLRTS provides natural language interface to OpenProject API, not a replacement for OpenProject UI
- **Security/Compliance:** SSL/TLS database connections, Cloudflare Tunnel zero-trust networking, container isolation

## Constraints & Assumptions

### Constraints
- **Budget:** Internal project with minimal budget for OpenAI API costs
- **Timeline:** MVP must be operational within 3-5 days
- **Resources:** Single developer (LLM-assisted), 10-15 hours allocated for initial development
- **Technical:** Must integrate with containerized Open Project deployment and Supabase PostgreSQL backend

### Key Assumptions
- OpenProject connects directly to Supabase PostgreSQL via DATABASE_URL (verified in architecture report)
- Supabase PostgreSQL provides reliable managed database service with SSL/TLS support
- Single database architecture completely eliminates synchronization complexity
- OpenProject UI remains fully available alongside FLRTS NLP interface
- FLRTS enhances but does not replace OpenProject's native functionality
- All team members are in US timezones (PST, CST, EST)
- Company operates officially on CST for business purposes
- Users will accept structured confirmation before task creation
- OpenAI GPT-4o API will reliably parse natural language with proper prompting
- API response times from OpenAI are acceptable for user experience (1-3 seconds)
- Digital Ocean VM provides sufficient resources for services (no local PostgreSQL needed)

## Risks & Open Questions

### Key Risks
- **API Dependency:** OpenAI service outages could make system unavailable (mitigation: Telegram Mini App fallback)
- **API Costs:** High usage could lead to unexpected OpenAI API costs (mitigation: rate limiting, usage monitoring)
- **Parsing Accuracy:** Complex or ambiguous commands might not parse correctly (mitigation: iterative correction loop)
- **Response Time:** OpenAI API latency could impact user experience (mitigation: async processing, loading states)

### Open Questions
- What happens when an unrecognized name is mentioned?
- Should the system handle task updates or only creation?
- How should the system handle ambiguous dates like "next Friday" on a Thursday?
- What's the fallback when parsing completely fails?
- Should there be user-specific parsing preferences?

### Areas Needing Further Research
- Optimal prompt engineering for consistent OpenAI structured output
- Best practices for handling partial parsing failures with iterative correction
- Integration patterns with containerized Open Project's authentication system
- Telegram Mini App framework and VM-based deployment
- Docker Compose service orchestration and resource management
- Cloudflare Tunnel configuration for secure external access

## Appendices

### A. Research Summary

**MVP Technology Decision:**
- OpenAI GPT-4o selected for MVP due to rapid development timeline
- Structured output guarantees eliminate need for complex parsing logic
- Natural language understanding handles ambiguity better than rule-based systems
- Trade-off: API costs and latency acceptable for internal tool

**V2 Considerations (Post-MVP):**
- SpaCy + dateparser for local processing and cost reduction
- Custom model training for company-specific language patterns
- Caching layer for frequently used timezone conversions

### B. Stakeholder Input

Based on handoff documentation from Mary (Business Analyst):
- Critical requirement: Timezone conversion to assignee's local time
- Must handle informal communication patterns
- 100 test examples provided as acceptance criteria
- Integration with existing Open Project system is non-negotiable

### C. References
- Handoff Documentation: NLP Task App - Synthetic Data & Parsing Logic
- Open Project Documentation: https://github.com/opf/openproject/tree/dev/docs/development
- SpaCy Documentation: https://spacy.io/
- dateparser Documentation: https://dateparser.readthedocs.io/
- Zod Schema Validation: https://zod.dev/

## Next Steps

### Immediate Actions
1. Write comprehensive OpenAI prompt with CRUD operations and syntax rules
2. Create simple Node.js API with single endpoint
3. Implement routing logic based on operation type
4. Update synthetic examples to new schema (CRUD operations)
5. Test all 100 examples against the prompt
6. Build minimal confirmation UI
7. Connect to Open Project API endpoints
8. Deploy and test with real users

### PM Handoff
This Project Brief provides the full context for NLP Task Management Service. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.