# Epic MVP: Telegram Task Management App

## Overview
A focused MVP for a Telegram Mini App that allows natural language task management with intelligent parsing and seamless integration with OpenProject and Supabase. This MVP emphasizes cloud-first architecture and tool-first implementation approach.

## Epic Goals
- **Primary Goal**: Enable users to manage tasks through natural language via Telegram Mini App
- **Technical Goal**: Demonstrate seamless bidirectional sync between Supabase and OpenProject
- **Business Goal**: Validate user demand for natural language task management interface

## Real MVP Scope (2 weeks total)

### Core Features
1. **Telegram Mini App Interface**
   - Natural language input for task creation
   - Simple UI for viewing and managing tasks
   - Task lists (filters OR simple bullet lists like shopping lists)
   - Reminder notifications via Telegram

2. **AI-Powered Task Processing**
   - OpenAI parses natural language text
   - Assigns tasks to hardcoded employees (no user table sync needed)
   - Extracts task details, priorities, and due dates from natural language

3. **Task & Data Management**
   - Tasks/Reminders/Lists CRUD operations only
   - Tasks stored in Supabase with OpenProject sync
   - Reminders are Telegram notifications at specified times
   - Lists are either task filters OR simple bullet lists

4. **Bidirectional Sync**
   - Supabase ↔ OpenProject task synchronization
   - Native webhooks (no polling)
   - Real-time updates between systems

## Architecture Principles

### Cloud-First Architecture
- **n8n-cloud**: Already hosted and available via MCP
- **OpenProject**: Deployed to Cloudflare using Wrangler
- **Supabase**: Native webhooks for real-time sync
- **OpenProject**: Native webhooks for bidirectional sync
- **OpenAI**: Accessed via MCP
- **Cloudflare DBs**: LLM context storage

### Tool-First Approach
- Default to n8n workflows for integrations
- Use native webhooks instead of custom polling
- Use MCPs and CLIs for configuration
- Only write custom code if it's <10 lines AND significantly better than n8n
- Leverage OpenProject's mature task/reminder backend

## User Stories

### Sprint 1 (Week 1): Foundation & Core Workflows
1. **Deploy OpenProject to Cloudflare** - Set up the mature task management backend
2. **Setup Supabase Webhook Infrastructure** - Configure native webhooks for real-time sync
3. **Create Telegram→OpenAI→Supabase Workflow** - Enable natural language task creation

### Sprint 2 (Week 2): Integration & User Experience
4. **Configure OpenProject Webhook Integration** - Enable bidirectional sync with Supabase
5. **Implement Telegram Reminder System** - Set up notification workflows
6. **Create Task Lists Interface** - Enable task filtering and simple list management

## Success Criteria

### Week 1 Milestones
- OpenProject deployed and accessible via Cloudflare
- Supabase webhooks configured and tested
- Users can create tasks via natural language in Telegram
- Tasks appear in both Supabase and OpenProject

### Week 2 Milestones
- Bidirectional sync working reliably
- Users receive reminder notifications via Telegram
- Task lists and filtering functional
- Basic error handling and logging in place

## Technical Constraints

### Must Use Existing Tools
- n8n-cloud workflows for all integrations
- Native webhooks (Supabase + OpenProject)
- MCP tools for OpenAI integration
- Cloudflare Workers for OpenProject hosting

### Hardcoded Simplifications
- Fixed employee list (no dynamic user management)
- Predetermined task categories/projects
- Simple notification schedules
- Basic error handling only

## Post-MVP Scope (Moved to Future)
- Field reports and advanced workflows
- User authentication and management
- Advanced analytics and reporting
- Complex task dependencies and workflows
- Advanced notification customization
- Mobile app development beyond Telegram Mini App

## Risk Mitigation
- **Technical Risk**: Heavy reliance on n8n workflows - Mitigation: Have backup custom code approach ready
- **Integration Risk**: Webhook reliability - Mitigation: Implement basic retry mechanisms
- **User Experience Risk**: Natural language parsing accuracy - Mitigation: Provide fallback manual input options
- **Timeline Risk**: 2-week constraint - Mitigation: Focus on core functionality first, defer nice-to-haves

## Acceptance Criteria for Epic
1. Users can create tasks by typing natural language in Telegram
2. Tasks are automatically parsed and assigned to appropriate team members
3. Tasks sync bidirectionally between Supabase and OpenProject
4. Users receive reminder notifications via Telegram
5. Users can view and filter task lists
6. System uses native webhooks for all real-time updates
7. All integrations built with n8n workflows where possible
8. MVP is fully functional and deployed within 2 weeks

## Dependencies
- n8n-cloud MCP server access
- OpenAI API access via MCP
- Supabase project with webhook capabilities
- Cloudflare Workers account for OpenProject deployment
- Telegram Bot API access

## Definition of Done
- All 6 user stories completed and deployed
- End-to-end user flow tested and working
- Basic monitoring and error handling in place
- Documentation updated for handoff
- Demo-ready system with real task management capability