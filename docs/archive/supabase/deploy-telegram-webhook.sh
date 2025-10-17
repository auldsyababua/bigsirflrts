#!/usr/bin/env bash
set -euo pipefail

# Deploy the Telegram Edge Function and configure Telegram webhook with secret.
# Prereqs:
#  - supabase CLI logged in to the correct org/project
#  - Main .env file present (root of repo)
#  - Network access from the host running this script

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install: https://supabase.com/docs/reference/cli" >&2
  exit 1
fi

# Load env from main .env file
if [ -f .env ]; then
  # shellcheck disable=SC1091
  source .env
else
  echo "Main .env file not found" >&2
  exit 1
fi

# Validate required variables
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
  echo "Aborting. Provide the missing variables in .env" >&2
  exit 1
fi

echo "Syncing Supabase secrets (project-level) for Edge Function…"
# Note: Using project-level secrets so Deno.env can read them at runtime
ARGS=(
  TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
  TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET"
  SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
)
if [ -n "${N8N_WEBHOOK_URL:-}" ]; then
  ARGS+=( N8N_WEBHOOK_URL="$N8N_WEBHOOK_URL" )
fi
supabase secrets set "${ARGS[@]}"

echo "Deploying telegram-webhook function (JWT disabled for this function only)…"
supabase functions deploy telegram-webhook --no-verify-jwt

echo "Resolving deployed function URL…"
EDGE_URL=$(supabase functions list | awk '/telegram-webhook/ {print $3}')
if [ -z "${EDGE_URL:-}" ]; then
  echo "Failed to read function URL. Check supabase CLI output or project selection (supabase link)." >&2
  exit 1
fi
echo "Function URL: $EDGE_URL"

echo "Setting Telegram webhook with secret and dropping pending updates…"
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"${EDGE_URL}\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\",\"drop_pending_updates\":true}"

echo "Webhook configured. Verify: https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
