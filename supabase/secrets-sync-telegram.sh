#!/usr/bin/env bash
set -euo pipefail

# Sync required secrets for the telegram-webhook Edge Function to Supabase.
# Prereqs: supabase CLI logged in; .env.supabase and .env.telegram present.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install: https://supabase.com/docs/reference/cli" >&2
  exit 1
fi

# Load env
if [ -f .env.supabase ]; then
  # shellcheck disable=SC1091
  source .env.supabase
fi
if [ -f .env.telegram ]; then
  # shellcheck disable=SC1091
  source .env.telegram
fi

REQUIRED_VARS=( \
  TELEGRAM_BOT_TOKEN \
  TELEGRAM_WEBHOOK_SECRET \
  SUPABASE_URL \
  SUPABASE_SERVICE_ROLE_KEY \
)

missing=false
for v in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!v:-}" ]; then
    echo "Missing required env var: $v" >&2
    missing=true
  fi
done
if [ "$missing" = true ]; then
  echo "Aborting. Provide the missing variables in .env.supabase and .env.telegram" >&2
  exit 1
fi

echo "Setting Supabase project secrets for Edge Function…"
ARGS=(
  TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
  TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET"
  SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
)
if [ -n "${N8N_WEBHOOK_URL:-}" ]; then
  ARGS+=( N8N_WEBHOOK_URL="$N8N_WEBHOOK_URL" )
fi
supabase secrets set "${ARGS[@]}"

echo "Done. You can now deploy: supabase functions deploy telegram-webhook --no-verify-jwt"
