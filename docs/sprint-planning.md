# Sprint Planning - Telegram Task App MVP

## Project Overview
**MVP Goal**: Create a Telegram Mini App that allows natural language task creation with bidirectional sync to OpenProject for project visualization. Fast, reliable, 2-week delivery using existing cloud tools.

## MVP Scope - What We're Building
- **Telegram Mini App** with natural language input
- **OpenAI parsing** to assign tasks to hardcoded employees (no user table sync)
- **Tasks/Reminders/Lists** CRUD only (field reports moved to post-MVP)
- **Bidirectional sync** between Supabase tasks table and OpenProject
- **Cloud-first architecture** using n8n-cloud, Cloudflare, native webhooks

## Epic Summary

### Epic MVP: Telegram Task App
**File**: `/docs/prd/epic-mvp-telegram-task-app.md`
- **Timeline**: 2 weeks (2 sprints) 
- **Stories**: 6 total
- **Architecture**: Cloud-native using n8n-cloud, OpenProject on Cloudflare, native webhooks
- **Focus**: Tool-first approach, minimal custom code, reliable MVP delivery

## Sprint 1: Infrastructure & Core Flow (Week 1)

### Sprint Goal
Deploy cloud infrastructure and establish the core Telegram → Task Creation flow using n8n workflows and native webhooks.

### Committed Stories

| Story | Title | Points | Priority | Status |
|-------|-------|---------|----------|--------|
| 1.1 | Deploy OpenProject to Cloudflare | 5 | Critical | Draft |
| 1.2 | Configure Supabase Native Webhooks | 3 | Critical | Draft |
| 1.3 | Create Telegram → Task Creation Workflow | 8 | Critical | Draft |

**Total Points**: 16

### Success Criteria
- ✅ OpenProject running on Cloudflare with API access
- ✅ Supabase webhook triggering n8n-cloud workflow 
- ✅ Telegram input creates tasks in Supabase via OpenAI parsing
- ✅ Basic error handling and monitoring operational

## Sprint 2: Sync & User Features (Week 2)

### Sprint Goal
Complete bidirectional sync, add reminder system, and implement lists functionality for a fully working MVP.

### Committed Stories

| Story | Title | Points | Priority | Status |
|-------|-------|---------|----------|--------|
| 2.1 | Configure OpenProject Native Webhooks | 3 | High | Draft |
| 2.2 | Implement Telegram Reminder System | 5 | High | Draft |
| 2.3 | Create Lists Interface | 5 | High | Draft |

**Total Points**: 13

### Success Criteria
- ✅ OpenProject status changes sync back to Supabase
- ✅ Scheduled reminders sent via Telegram notifications
- ✅ Task lists (filtered queries) and simple bullet lists working
- ✅ Complete bidirectional sync with conflict resolution

## MVP Architecture - Tool-First Approach

### Core Stack
- **n8n-cloud** (hosted, MCP available) - All workflow automation
- **OpenProject** (Cloudflare deployment) - Mature task/reminder backend
- **Supabase** (existing) - Tasks table with native webhooks
- **OpenAI** (via MCP) - Natural language parsing with hardcoded employees
- **Telegram Bot** (Cloudflare Workers) - User interface
- **Cloudflare DBs** - LLM context storage

### Integration Philosophy
- **Native webhooks** over polling for reliability
- **n8n workflows** over custom code (unless <10 lines AND significantly better)
- **MCP tools** for all API configuration
- **OpenProject's mature features** for task management and reminders

### Data Flow
```
Telegram Input → n8n Workflow → OpenAI Parsing → Supabase Tasks
                                      ↓
OpenProject ← Bidirectional Sync ← Supabase (native webhooks)
                                      ↓
Telegram Reminders ← n8n Scheduler ← OpenProject Due Dates
```

## Definition of Done - MVP Focus

### Story Level
- [ ] n8n workflow configured and tested
- [ ] Native webhooks delivering reliably
- [ ] MCP tools used for all configuration
- [ ] Basic error handling implemented
- [ ] End-to-end flow tested
- [ ] Acceptance criteria met

### Sprint Level
- [ ] All committed stories meet DoD
- [ ] Sprint goal achieved
- [ ] Working demo available
- [ ] No critical bugs blocking usage
- [ ] Ready for limited beta testing

## Technical Standards - Configuration Over Code

### Workflow Standards
- n8n workflows version controlled and documented
- Native webhook signatures verified
- Retry logic and error handling built-in
- Monitoring and alerting configured

### Deployment Standards
- Cloudflare Wrangler for all deployments
- Environment variables for all API keys
- MCP tools for service configuration
- Automated health checks

### Documentation Standards
- n8n workflow documentation
- Webhook setup instructions
- MCP tool usage guides
- Troubleshooting runbooks

## Risk Register - MVP Focused

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenProject Cloudflare compatibility | High | Medium | Test deployment early, backup hosting plan |
| n8n-cloud execution limits | Medium | Low | Monitor usage, plan scaling approach |
| Webhook reliability | Medium | Medium | Implement retry logic and monitoring |
| 2-week timeline pressure | High | Medium | Strict scope control, defer non-essentials |

## Resources & Tools

### Cloud Services
- **n8n-cloud**: Hosted automation platform (MCP available)
- **Cloudflare Workers**: Telegram bot and OpenProject hosting
- **Supabase**: Task storage with native webhooks
- **OpenAI API**: Natural language processing

### MCP Tools Available
- `mcp__n8n-cloud__*` - Workflow management
- `mcp__supabase__*` - Database and webhook operations
- OpenAI MCP tools for parsing
- Cloudflare Wrangler for deployment

### Documentation References
- [MVP Architecture](/docs/mvp-architecture.md) - Detailed technical architecture
- [Epic MVP](/docs/prd/epic-mvp-telegram-task-app.md) - Complete epic definition
- [User Stories](/docs/stories/) - Individual story details

## Post-MVP Roadmap (Not in Scope)

### Version 2.0 (Post-MVP)
- Field reports integration
- User table synchronization
- Equipment and maintenance tracking
- Advanced natural language features

### Future Epics (Archived)
Comprehensive epics for full system integration available in `/docs/prd/future/` for reference but NOT part of current MVP scope.

## Next Actions

### Immediate (Week 1)
1. **Deploy OpenProject** to Cloudflare using Wrangler
2. **Configure Supabase webhooks** to trigger n8n-cloud
3. **Build core n8n workflow** for Telegram → OpenAI → Supabase

### Week 2
4. **Setup bidirectional sync** via OpenProject webhooks
5. **Implement reminder system** using n8n scheduled triggers
6. **Add lists functionality** for task filtering and bullet lists

### MVP Launch Criteria
- Complete end-to-end flow working
- All 6 stories delivered and tested
- Basic error handling and monitoring
- Ready for limited user testing

---

*Sprint planning focused on rapid MVP delivery using cloud-native, tool-first architecture*
*Total timeline: 2 weeks | Total stories: 6 | Focus: Working system over comprehensive features*