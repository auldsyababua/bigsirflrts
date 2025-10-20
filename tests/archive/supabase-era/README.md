# Supabase-Era Test Archive

**Archived:** October 2025 **Reason:** Tests depend on deprecated Supabase
infrastructure

These tests were written for the Supabase/PostgreSQL architecture and are no
longer applicable after the Frappe Cloud migration (ADR-006).

## Archived Test Files

- **retention-policy.test.ts** - 10N-174: Data retention and secret detection
  (Supabase-specific)
- **service-role-logging.test.ts** - 10N-176: Service role key logging
  (Supabase-specific)
- **token-tracking.test.ts** - 10N-173: Token usage and cost tracking
  (Supabase-specific)
- **sentry-edge-function.test.ts** - Edge Function Sentry integration (Supabase
  Edge Functions deprecated)
- (See git history for full list)

## Current Testing

For current ERPNext-based tests, see:

- tests/integration/10n-256-schema-migration.test.sh (ERPNext DocType
  verification)
- tests/ (active test directory)

**Note:** ERPNext equivalents for these tests are planned but not yet
implemented.
