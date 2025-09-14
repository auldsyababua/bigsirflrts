# FLRTS (Fast Low-friction Repeatable Task System) Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Enable natural language task creation that converts conversational commands into structured tasks within OpenProject
- Eliminate timezone conversion friction for distributed team (PST, CST, EST) through automatic localization
- Achieve sub-5 second task creation time from voice/text input to confirmed task in OpenProject
- Support full CRUD operations (Create, Read, Update, Delete) for tasks, work packages, and projects via NLP
- Provide multi-interface access through CLI, Web UI, and Telegram Mini App for maximum accessibility
- Maintain 95% accuracy in entity recognition and timezone conversion for team member assignments
- Integrate seamlessly with OpenProject's existing work package types, custom fields, and team structures
- Enable voice-to-task workflows for hands-free operation during field work at mining facilities

### Background Context

FLRTS addresses the critical operational challenge of rapid task management across a distributed team operating in an off-grid bitcoin mining environment. The current workflow requires manual entry through OpenProject's web interface, demanding timezone calculations and structured form completion that interrupts field operations. By leveraging OpenProject's mature API and custom field capabilities, FLRTS provides a natural language layer that preserves all enterprise features while dramatically reducing friction. The shift from tududi to OpenProject enables true team collaboration, work package hierarchies, and custom fields essential for tracking mining-specific metadata like facility locations, equipment IDs, and maintenance schedules.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-05 | v1.0 | Initial PRD creation with OpenProject integration | Product Owner (AI) |
| 2025-01-05 | v1.1 | Updated from tududi to OpenProject as backend platform | Product Owner (AI) |

## Requirements

### Functional

- **FR1**: System shall parse natural language input containing @mentions and convert them to OpenProject user assignments with proper timezone conversion
- **FR2**: System shall support all CRUD operations through natural language commands prefixed with "/" (e.g., /create, /update, /delete, /list)
- **FR3**: System shall integrate with OpenProject REST API v3 for all work package operations
- **FR4**: System shall map conversational time expressions ("tomorrow at 2pm Colin's time") to UTC timestamps for OpenProject storage
- **FR5**: System shall support creation of work packages with custom fields specific to mining operations (facility_id, equipment_type, priority_level)
- **FR6**: System shall provide confirmation UI showing parsed JSON before executing any OpenProject API call
- **FR7**: System shall handle bulk task creation from single input containing multiple action items
- **FR8**: System shall support voice input through speech-to-text for hands-free task creation
- **FR9**: System shall maintain user timezone preferences (PST for Colin/Bernie/Ari, CST for Taylor/Company, EST for Joel/Bryan)
- **FR10**: System shall provide fallback to manual entry when NLP parsing confidence is below 85%
- **FR11**: System shall support OpenProject work package types (Task, Bug, Feature, Epic, User Story)
- **FR12**: System shall enable parent-child relationships between work packages through natural language
- **FR13**: System shall integrate with OpenProject's project structure for automatic project assignment
- **FR14**: System shall provide Telegram Mini App interface for mobile field operations
- **FR15**: System shall support attachments and file references in task creation

### Non Functional

- **NFR1**: API response time shall be under 200ms for 95th percentile of requests
- **NFR2**: System shall maintain 99.9% availability during business hours (6am-10pm CST)
- **NFR3**: Total infrastructure costs shall not exceed $75/month (Digital Ocean VM + Supabase + storage)
- **NFR4**: OpenAI API costs shall not exceed $10/month for expected usage of 50 tasks/day  
- **NFR5**: System shall handle 100 concurrent users without performance degradation
- **NFR6**: All datetime values shall be stored in UTC format in OpenProject
- **NFR7**: System shall provide audit logging for all task modifications with user attribution
- **NFR8**: Authentication shall integrate with OpenProject's existing OAuth/API key infrastructure
- **NFR9**: System shall be deployed via Docker Compose on Digital Ocean VM
- **NFR10**: Voice recognition accuracy shall exceed 95% for technical terminology and team member names
- **NFR11**: System shall use Cloudflare Tunnel for secure access (no open ports required)