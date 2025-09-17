#!/usr/bin/env bash
set -euo pipefail

# Helper to deploy the Telegram Edge Function and set the Telegram webhook.
# Prereqs: supabase CLI logged in; BOT_TOKEN exported; SUPABASE_URL set.

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install from https://supabase.com/docs/reference/cli" >&2
  exit 1
fi

if [ -z "${BOT_TOKEN:-}" ]; then
  echo "BOT_TOKEN environment variable is required (Telegram bot token)" >&2
  exit 1
fi

echo "Deploying telegram-webhook function…"
supabase functions deploy telegram-webhook --no-verify-jwt

EDGE_URL=$(supabase functions list | awk '/telegram-webhook/ {print $3}')
if [ -z "$EDGE_URL" ]; then
  echo "Failed to read function URL. Check supabase CLI output." >&2
  exit 1
fi
echo "Function URL: $EDGE_URL"

echo "Setting Telegram webhook to Supabase function…"
curl -sS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"${EDGE_URL}\"}"

echo "Done. Verify webhook: https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
