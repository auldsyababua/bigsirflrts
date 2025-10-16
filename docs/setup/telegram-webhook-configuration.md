# Telegram Webhook Configuration

## Overview

Telegram bot webhook configured to route messages to ERPNext custom app endpoint
on Frappe Cloud.

## Configuration Details

### Webhook Endpoint

```
https://ops.10nz.tools/api/method/flrts_extensions.automations.telegram_api.handle_telegram_webhook
```

### Telegram Bot

- **Bot Token**: Stored in `.env` as `TELEGRAM_BOT_TOKEN`
- **Webhook Secret**: `wh_tg_flrts_1hx346bQ0w0qkzDQTA6ChGEB3Dj3TmuH` (stored in
  `.env` as `TELEGRAM_WEBHOOK_SECRET`)
- **Max Connections**: 40
- **Allowed Updates**: `["message", "callback_query"]`
- **IP Address**: 3.84.240.128 (Frappe Cloud)

### Configuration Date

**Configured**: 2025-10-15 **Issue**:
[10N-228](https://linear.app/10netzero/issue/10N-228/provision-erpnext-on-frappe-cloud-private-bench)
(Phase 6: Integration Setup)

## Verification

Check current webhook status:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Expected response:

```json
{
  "ok": true,
  "result": {
    "url": "https://ops.10nz.tools/api/method/flrts_extensions.automations.telegram_api.handle_telegram_webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "ip_address": "3.84.240.128",
    "allowed_updates": ["message", "callback_query"]
  }
}
```

## Update Webhook

To update the webhook configuration:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://ops.10nz.tools/api/method/flrts_extensions.automations.telegram_api.handle_telegram_webhook",
    "secret_token": "'"${TELEGRAM_WEBHOOK_SECRET}"'",
    "max_connections": 40,
    "allowed_updates": ["message", "callback_query"]
  }'
```

## Delete Webhook

To remove the webhook (for testing or maintenance):

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook"
```

## Webhook Handler Implementation

The webhook handler is implemented in the `flrts_extensions` custom app:

- **File**: `flrts_extensions/automations/telegram_api.py`
- **Function**: `handle_telegram_webhook()`
- **Repository**: <https://github.com/auldsyababua/flrts-extensions>

### Security Features

1. **Signature Validation**: Handler validates `X-Telegram-Bot-Api-Secret-Token`
   header against `TELEGRAM_WEBHOOK_SECRET`
2. **HTTPS Only**: Telegram only sends webhooks to HTTPS endpoints
3. **Allowed Updates**: Filtered to only `message` and `callback_query` to
   reduce noise

### Request Flow

```
Telegram Bot API
    ↓
HTTPS POST to webhook endpoint
    ↓
Frappe Cloud (ops.10nz.tools)
    ↓
flrts_extensions.automations.telegram_api.handle_telegram_webhook()
    ↓
Process message / callback_query
    ↓
Route to N8N workflow or direct ERPNext API
```

## Troubleshooting

### Webhook Not Receiving Messages

1. **Check webhook status**:

   ```bash
   curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
   ```

2. **Check for pending updates**:
   - If `pending_update_count` > 0, there may be an error in the handler
   - Check ERPNext logs: Site → Settings → Logs

3. **Check last error**:
   - `last_error_date`: Timestamp of last failed delivery
   - `last_error_message`: Error message from handler

4. **Test endpoint manually**:

   ```bash
   curl -X POST "https://ops.10nz.tools/api/method/flrts_extensions.automations.telegram_api.handle_telegram_webhook" \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Bot-Api-Secret-Token: ${TELEGRAM_WEBHOOK_SECRET}" \
     -d '{
       "update_id": 1,
       "message": {
         "message_id": 1,
         "from": {"id": 123456, "is_bot": false, "first_name": "Test"},
         "chat": {"id": 123456, "type": "private"},
         "date": 1634567890,
         "text": "/start"
       }
     }'
   ```

### Webhook Returns Error

1. **401 Unauthorized**: Check `X-Telegram-Bot-Api-Secret-Token` header matches
   `TELEGRAM_WEBHOOK_SECRET`
2. **404 Not Found**: Verify `flrts_extensions` app is installed on site
3. **500 Internal Server Error**: Check ERPNext error logs for Python exceptions

### Rate Limiting

Telegram enforces rate limits on webhook calls:

- **Max connections**: 40 (configured)
- **Delivery rate**: ~30 updates/second per bot

If rate limits are hit:

- Telegram will queue updates and deliver with backoff
- Check `pending_update_count` in webhook info
- Consider implementing message queue in handler

## Related Documentation

- [10N-228: Provision ERPNext on Frappe Cloud](https://linear.app/10netzero/issue/10N-228/provision-erpnext-on-frappe-cloud-private-bench)
- [Telegram Bot API: setWebhook](https://core.telegram.org/bots/api#setwebhook)
- [Telegram Bot API: Update](https://core.telegram.org/bots/api#update)
- [ERPNext API Documentation](https://frappeframework.com/docs/user/en/api)
