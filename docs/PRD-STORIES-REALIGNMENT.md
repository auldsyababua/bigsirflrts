# PRD & Stories Realignment Plan
**Date:** December 13, 2024
**Status:** IN PROGRESS
**Context Loss Protection:** This document enables any PM to continue realignment work

---

## 🚨 CRITICAL ARCHITECTURE CLARIFICATIONS

### ✅ CONFIRMED Architecture Decisions

1. **PostgreSQL Version: 15.8**
   - NOT 16+ (that was an error)
   - Already validated as compatible
   - Action: ✅ COMPLETED - Removed ALL references to PostgreSQL 16+ from docs

2. **Single Supabase Database Architecture**
   - OpenProject uses Supabase (NOT separate database)
   - OpenProject tables in separate schema (e.g., `openproject` schema)
   - FLRTS tables in main/public schema
   - Personnel table duplicated as openproject.users with foreign key reference

3. **FLRTS is NOT Separate - It's the NLP Layer**
   - FLRTS = Field Reports, Lists, Reminders, Tasks, Sub-Tasks
   - FLRTS is the Telegram/NLP interface layer ON TOP of OpenProject
   - OpenProject contains ALL the business logic
   - FLRTS is worthless without OpenProject

4. **MVP Data Flow (No Preprocessing)**
   ```
   Telegram Message → Edge Function (<500ms ack) → n8n Workflow
                                                    ↓
                                            Fetch ALL valid options
                                            (users, sites, contractors)
                                                    ↓
                                            OpenAI API with full context
                                                    ↓
                                            Parse to JSON structure
                                                    ↓
                                            OpenProject REST API v3
                                                    ↓
                                            Updates openproject schema
                                            (within Supabase database)
   ```

5. **OpenAI MVP Approach (Context Injection)**
   - **INPUT**: Natural language + ALL valid options hardcoded in prompt
   - **INCLUDES**: Complete lists of users (with IDs/timezones), sites (with aliases), contractors
   - **INCLUDES**: Current UTC timestamp for relative date parsing
   - **OUTPUT**: Matched IDs and structured JSON for OpenProject API
   - **NO PREPROCESSING**: Let OpenAI handle everything for MVP
   - **POST-MVP**: Add @mentions and /commands preprocessing

6. **Timezone Handling (Only Processing We Do)**
   - All times assumed to be in assignee's timezone
   - Unless assigner (sender) says "my time" - then use assigner's timezone
   - System converts after OpenAI returns the parsed data
   - Assigner = person creating the task (sender of Telegram message)

7. **500ms Rule** (from n8n-performance-analyses.md)
   - Operations requiring <500ms: Supabase Edge Functions (Telegram acks only)
   - Everything else: n8n workflows
   - OpenAI API calls: Always through n8n (too slow for Edge)

---

## 🎯 THE CORRECT STORY STRUCTURE (What PRD Should Say)

### Epic 1: Infrastructure Foundation (7 stories)
1. **1.1: Deploy OpenProject via Docker on DigitalOcean** ✅ EXISTS
2. **1.2: PostgreSQL 15.8 Validation** ✅ EXISTS
3. **1.3: n8n Queue Mode Configuration** ✅ EXISTS
4. **1.4: Supabase Edge Functions Setup** ✅ EXISTS
5. **1.5: Supabase Webhooks Configuration** ✅ EXISTS
6. **1.6: Redis Queue Configuration** ❌ TODO
7. **1.7: Monitoring and Observability** ❌ TODO

### Epic 2: Telegram Interface (6 stories)
1. **2.1: Telegram Task Creation Workflow** ✅ EXISTS
2. **2.2: Telegram Reminder System** ✅ EXISTS
3. **2.3: Telegram Inline Keyboards** ✅ EXISTS
4. **2.4: Error Recovery Procedures** ✅ EXISTS
5. **2.5: Telegram Command Parser** ❌ TODO
6. **2.6: Telegram User Context** ❌ TODO

### Epic 3: Integration Layer (5 stories)
1. **3.1: OpenProject API Workflows** ❌ TODO
2. **3.2: OpenProject Webhook Sync** ✅ EXISTS
3. **3.3: Batch Sync Workflows** ❌ TODO
4. **3.4: OpenAI Context Injection (MVP)** ✅ EXISTS
5. **3.5: Timezone Conversion Logic** ❌ TODO

### Epic 4: Lists Management (5 stories)
1. **4.1: Lists Interface** ✅ EXISTS
2. **4.2: List Management Commands** ✅ EXISTS
3. **4.3: List Templates System** ❌ TODO
4. **4.4: List Sharing & Permissions** ❌ TODO
5. **4.5: List Notifications** ❌ TODO

**TOTAL: 23 stories (13 exist, 10 to create)**

---

## 📋 REALIGNMENT TASKS

### Phase 1: Documentation Cleanup ✅ COMPLETED
- [x] Remove all PostgreSQL 16+ references from stories
- [x] Update architecture section to reflect single Supabase DB with schemas
- [x] Add OpenAI integration explanation to PRD

### Phase 2: Story File Reorganization ✅ COMPLETED
- [x] Create backup directory: `ARCHIVE_REALIGNMENT_2024-12-13/`
- [x] Copy all current stories to backup
- [x] Rename existing stories to match new structure

### Phase 3: PRD Update ⏳ IN PROGRESS
- [ ] Update PRD with the story structure shown above
- [ ] Remove old epic structure
- [ ] Add all missing stories to PRD

### Phase 4: Create Missing Stories
Priority order (most critical first):
1. [ ] 3.1: OpenProject API Workflows (critical for task creation)
2. [ ] 1.6: Redis Queue Configuration (needed for scaling)
3. [ ] 2.5: Telegram Command Parser (improves UX)
4. [ ] 3.5: Timezone Conversion Logic
5. [ ] 3.3: Batch Sync Workflows (efficiency)
6. [ ] Others as needed...

---

## 🔧 COMMANDS FOR NEXT PM

```bash
# 1. Check current state
ls -la docs/stories/*.md | wc -l  # Should show 23 stories when done

# 2. Verify PRD alignment
grep "### Story" docs/prd/prd.md | wc -l  # Should match story count

# 3. Check for PostgreSQL 16+ references (should return nothing)
grep -r "PostgreSQL 16\|postgres.*16" docs/

# 4. Verify architecture updates
grep -r "single.*Supabase\|openproject schema" docs/architecture/
```

---

## ⚠️ CRITICAL REMINDERS

1. **NEVER write code from training data** - Always use MCP tools to get current docs
2. **PostgreSQL is 15.8** - Not 16+, this is final
3. **Single Supabase database** - OpenProject uses separate schema, not separate DB
4. **OpenAI parses, doesn't write** - All DB writes go through OpenProject REST API
5. **Edge Functions for speed** - Only for <500ms operations (Telegram acks)
6. **n8n for everything else** - Complex logic, API calls, OpenAI integration

---

## 📊 PROGRESS TRACKING

| Task | Status | Completed By | Date |
|------|--------|--------------|------|
| Analyze current state | ✅ DONE | PM John | 2024-12-13 |
| Create realignment doc | ✅ DONE | PM John | 2024-12-13 |
| Remove PG 16+ refs | ✅ DONE | Claude | 2024-12-13 |
| Reorganize stories | ✅ DONE | Claude | 2024-12-13 |
| Update PRD | ⏳ TODO | - | - |
| Create missing stories | ⏳ TODO | - | - |
| Enrich with current docs | ⏳ TODO | - | - |

---

## 🚀 NEXT STEPS

1. Update the PRD to match the story structure above
2. Create the 10 missing story files
3. Ensure all new stories follow the architecture clarifications

**Note to next PM:** The story structure shown above is the SINGLE SOURCE OF TRUTH. Update the PRD to match this exactly.