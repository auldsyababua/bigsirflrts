# Telegram Bot Configuration

## Bot Details

- **Bot Name**: 10NZ-Assistant
- **Username**: @TenNetZeroAssistantBot  
- **Bot ID**: 7742923819
- **Token**: `7742923819:AAFjSv7DEOCC8oFRwhhvAjH_EEo8uhe7JK8`

## Webhook Configuration

The bot will use webhooks to receive messages. The webhook URL pattern will be:

```
https://{cloudflare-worker-domain}/telegram-webhook
```

## Bot Commands

To be configured in BotFather:

- `/start` - Welcome message and instructions
- `/help` - Show available commands
- `/task` - Create a new task (alternative to natural language)
- `/list` - Show my open tasks
- `/reminders` - Show upcoming reminders

## Security Notes

- Store bot token in environment variables, never in code
- Verify webhook requests using Telegram's secret token
- Implement rate limiting in Cloudflare Worker

## n8n Webhook Endpoint

The n8n-cloud webhook that will process messages:

```
https://{n8n-instance}.n8n.cloud/webhook/telegram-task-creation
```

## Environment Variables Required

```env
TELEGRAM_BOT_TOKEN=7742923819:AAFjSv7DEOCC8oFRwhhvAjH_EEo8uhe7JK8
TELEGRAM_WEBHOOK_SECRET={generate-random-secret}
N8N_WEBHOOK_URL={n8n-cloud-webhook-url}
```

## Next Steps

1. Set webhook URL using Telegram API
2. Configure n8n webhook trigger
3. Deploy Cloudflare Worker for message routing
4. Test end-to-end flow
