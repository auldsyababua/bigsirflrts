# Supabase Edge Functions Archive

**Archived**: 2025-10-16
**Reason**: Webhook now routes directly to ERPNext (ops.10nz.tools)

## What Was Here

Telegram webhook edge functions deployed to Supabase Edge Functions platform:
- telegram-webhook function
- parse-request function
- Deployment scripts and configuration

## Why Archived

Per PR #150 (Phase 6: Telegram Webhook Configuration), webhook now routes directly to ERPNext custom app endpoint:
- Endpoint: `https://ops.10nz.tools/api/method/flrts_extensions.automations.telegram_api.handle_telegram_webhook`
- No longer using Supabase Edge Functions as intermediary
- Simplified architecture removes extra hop

## Related

- ADR-006: Supabase deprecated for primary backend (2025-09-30)
- 10N-228: ERPNext provisioning and Telegram webhook setup
- PR #150: Telegram webhook configuration

## Contents

- `functions/telegram-webhook/` - Deno edge function for Telegram webhooks
- `functions/parse-request/` - Request parsing edge function
- `deploy-telegram-webhook.sh` - Deployment script
- `secrets-sync-telegram.sh` - Secrets synchronization script
- `config.toml` - Supabase project configuration

## Last Active

Last modified: 2025-10-13
