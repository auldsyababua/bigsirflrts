# Telegram Webhook (Supabase Edge Function)

Canonical path for Telegram integration. Replaces any dockerized bot.

## Deploy

Prereqs:

- Supabase CLI installed and logged in
- `BOT_TOKEN` exported (Telegram bot token)

Commands:

- `cd <repo-root>`
- `./supabase/deploy-telegram-webhook.sh`

This deploys the function and sets Telegram webhook to the function URL.

## Environment

- No JWT verification: function is deployed with `--no-verify-jwt` for Telegram
  webhook compatibility.
- Downstream: function forwards to n8n webhook (see Story 1.4) or processes
  directly based on your configuration.

## Test

- `curl -s https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo`
- Exercise typical Telegram actions and confirm logs in Supabase (see Story 1.4
  logging tables).
