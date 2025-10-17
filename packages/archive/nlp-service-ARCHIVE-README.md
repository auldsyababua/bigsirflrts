# Archived: nlp-service Package

**Archived Date:** 2025-10-17
**Original Location:** /packages/nlp-service/
**Reason:** Built for deprecated OpenProject backend, never shipped to users

## Context

Natural Language Processing service that parsed task requests into structured
OpenProject work packages using OpenAI GPT-4o. High-quality implementation with
good patterns (Zod validation, circuit breakers, retry logic), but deeply coupled
to OpenProject API structure.

## Why Archived

- App never shipped (no production users)
- OpenProject deprecated per ADR-006 (2025-09-30)
- Every file references OpenProject work packages (not ERPNext Task DocTypes)
- ERPNext integration incomplete - better to build CRUD first, then add NLP
- Cleaner to rebuild fresh than refactor OpenProject → ERPNext

## Last Activity

- **Last Modified:** 2025-09-30 (6 weeks before archive)
- **Last Feature:** Circuit breaker, timeout/retry patterns for OpenAI (10N-167/10N-172)
- **Lines of Code:** 1,274 lines TypeScript
- **Files:** 7 source files (index.ts, parser.ts, prompt.ts, schemas.ts, logger.ts)

## Features (Reference for Rebuild)

- ✅ GPT-4o structured output with Zod validation
- ✅ Reasoning capture for debugging
- ✅ OpenAI timeout/retry/circuit breaker
- ✅ Supabase logging integration
- ✅ Hardcoded team/site/partner data for MVP

## Reusable Patterns

When rebuilding for ERPNext:

1. **GPT Prompting Logic:** prompt.ts contains good natural language → structured task prompting
2. **Zod Schemas:** schemas.ts validation patterns
3. **Resilience Patterns:** parser.ts circuit breaker, retry, timeout implementation
4. **Structured Output:** OpenAI structured output mode with validation

Discard: OpenProject work package output format, API client integration

## Recovery

```bash
git log --all -- packages/nlp-service/
git checkout <commit-hash> -- packages/nlp-service/
```

## Related

- PRD: docs/prd/README.md ("Natural language task management" = KEY INNOVATION)
- ADR-006: OpenProject → ERPNext migration
- Rebuild when: ERPNext Task CRUD works, DocType structure understood

## Breadcrumb

EVAL-001: packages/nlp-service/ → packages/archive/nlp-service/
