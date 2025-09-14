# Epic MVP: Telegram Task App with OpenProject Integration

## Epic Overview

**Epic Goal**: Create a working Telegram Mini App that allows users to create, manage, and track tasks using natural language input, with bidirectional sync to OpenProject for project visualization.

**Timeline**: 2 weeks (2 sprints)
**Total Stories**: 6
**Business Value**: Fast, reliable task management through familiar Telegram interface with professional project visualization

## MVP Scope - What We're Building

### Core Functionality

- **Telegram Mini App** with natural language input for tasks
- **OpenAI parsing** to extract task details and assign to hardcoded employees
- **Tasks/Reminders/Lists** CRUD operations only
- **Bidirectional sync** between Supabase tasks table and OpenProject
- **Telegram reminders** sent at specified task due times
- **Lists support**: Both filtered task views AND simple bullet lists

### What's NOT in MVP

- ❌ Field reports (moved to post-MVP v2)
- ❌ User table sync (using hardcoded employee list)
- ❌ Complex custom integrations (using n8n workflows)
- ❌ Performance optimization (reliability over performance)
- ❌ Other Supabase tables beyond tasks

## Technical Architecture - Cloud-First

### Stack Components

- **n8n-cloud** (hosted, MCP available) - All workflow automation
- **OpenProject** (deploy to Cloudflare via Wrangler) - Task/project backend
- **Supabase** (existing) - Task storage and native webhooks
- **OpenAI** (via MCP) - Natural language parsing
- **Telegram Bot/Mini App** (Cloudflare Workers) - User interface
- **Cloudflare DBs** - LLM context and memory storage

### Integration Strategy

- **Native webhooks** over polling for reliability
- **n8n workflows** over custom code (unless <10 lines AND significantly better)
- **MCP tools** and CLI configuration over custom admin interfaces
- **OpenProject's mature backend** for task/reminder management

### Data Flow

```
Telegram Input → n8n Workflow → OpenAI Parsing → Supabase Tasks
                                      ↓
OpenProject ← Bidirectional Sync ← Supabase (via native webhooks)
                                      ↓
Telegram Reminders ← n8n Scheduler ← OpenProject Due Dates
```

## Success Criteria

### Sprint 1 Success

- ✅ OpenProject running on Cloudflare
- ✅ Supabase webhook triggering n8n workflow
- ✅ Telegram → OpenAI → Supabase task creation working
- ✅ Basic error handling and monitoring in place

### Sprint 2 Success  

- ✅ OpenProject webhook syncing status changes back to Supabase
- ✅ Scheduled reminders sending Telegram notifications
- ✅ Task lists (filtered queries) and simple bullet lists working
- ✅ Complete bidirectional sync with conflict resolution

### MVP Launch Criteria

- ✅ All 6 stories completed and tested
- ✅ Telegram Mini App responsive and functional
- ✅ < 5 second response time for task creation
- ✅ No data loss during sync operations
- ✅ Monitoring and error alerting operational

## Epic Stories

### Sprint 1: Infrastructure & Core Flow (Week 1)

**Story 1.1: Deploy OpenProject to Cloudflare**

- Deploy OpenProject using Wrangler
- Configure basic project structure
- Set up API keys and authentication
- Verify health check and basic functionality

**Story 1.2: Configure Supabase Native Webhooks**

- Set up webhook for tasks table INSERT/UPDATE/DELETE
- Configure webhook to trigger n8n-cloud workflow
- Test webhook delivery and error handling
- Add webhook monitoring and logging

**Story 1.3: Create Telegram → Task Creation Workflow**

- Build n8n workflow: Telegram Trigger → OpenAI → Supabase
- Configure OpenAI with hardcoded employee parsing
- Implement task creation with proper field mapping
- Add confirmation messages back to Telegram

### Sprint 2: Sync & User Features (Week 2)

**Story 2.1: Configure OpenProject Native Webhooks**

- Set up OpenProject webhooks for work package status changes
- Create n8n workflow to sync changes back to Supabase
- Implement conflict resolution (Supabase as source of truth)
- Add bidirectional sync monitoring

**Story 2.2: Implement Telegram Reminder System**

- Create n8n scheduled workflow to check due dates
- Query OpenProject for upcoming/overdue tasks
- Send Telegram notifications to assigned users
- Handle reminder scheduling and user preferences

**Story 2.3: Create Lists Interface**

- Implement task filtering queries (show my tasks, overdue tasks, etc.)
- Add simple bullet list creation (shopping lists, etc.)
- Create list CRUD operations via Telegram commands
- Add list sharing and collaboration features

## Risk Mitigation

### Technical Risks

- **OpenProject Production Deployment**: Test VM deployment early, ensure database connectivity
- **Webhook reliability**: Implement retry logic and dead letter queues
- **n8n-cloud limits**: Monitor usage, plan for scaling if needed
- **Telegram API limits**: Implement rate limiting and queue management

### Business Risks  

- **User adoption**: Focus on simple, familiar Telegram interface
- **Feature creep**: Strict 2-week timeline, defer everything not in MVP
- **Integration complexity**: Prefer configuration over custom code

## Dependencies

### External Dependencies

- VM provisioning and Docker deployment infrastructure
- OpenProject with managed PostgreSQL configuration
- Cloudflare Tunnel setup for secure public access
- n8n-cloud instance availability and configuration
- Telegram Bot API registration and tokens

### Internal Dependencies  

- Supabase tasks table schema (current)
- Employee list for hardcoded parsing
- OpenAI API key and model access
- MCP tools configuration

## Definition of Done - Epic Level

- [ ] All 6 user stories meet individual DoD criteria
- [ ] Complete end-to-end flow: Telegram → Task Creation → OpenProject Sync → Reminders
- [ ] Bidirectional sync working reliably with conflict resolution
- [ ] Error handling and monitoring operational
- [ ] User acceptance testing completed
- [ ] Documentation updated for deployment and operations
- [ ] Ready for limited beta testing with real users

## Post-MVP Roadmap

### Version 2.0 (4-6 weeks)

- Field reports integration
- User table synchronization  
- Equipment and maintenance tracking
- Advanced natural language features

### Version 3.0 (8-12 weeks)

- Financial integration (invoices, time tracking)
- Advanced reporting and analytics
- Multi-team and permission management
- Mobile app beyond Telegram

## Technical Debt Prevention

- **Configuration over Code**: Use n8n workflows, OpenProject settings, webhook configuration
- **Native Features First**: Leverage OpenProject's task management, Supabase's webhooks
- **MCP Tool Usage**: Use existing MCPs for OpenAI, n8n-cloud, Supabase operations
- **Cloud-Native Deployment**: Cloudflare Workers for scalability and reliability
- **Monitoring First**: Built-in error handling and alerting from day one

---

*Epic created following BMAD framework v4 standards*
*Total estimated effort: 10-15 story points across 2 weeks*
