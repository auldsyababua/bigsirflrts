# Telegram Bot Configuration

⚠️ **SECURITY NOTICE**: This document has been updated to remove exposed credentials and match current architecture.

## Bot Details

- **Bot Name**: FLRTS Assistant (or configure as needed)
- **Username**: To be configured via BotFather
- **Bot ID**: To be obtained from BotFather
- **Token**: **NEVER STORE IN DOCUMENTATION** - Use environment variables only

## Current Architecture

```
Telegram Bot API
    ↓ HTTPS Webhook
Supabase Edge Functions (webhook endpoint)
    ↓ HTTP Request
Self-hosted n8n (single instance)
    ↓ API Calls
OpenProject + Database operations
```

## Bot Setup Process

### 1. Create Bot via BotFather

1. Message @BotFather on Telegram
2. Use `/newbot` command
3. Choose bot name and username
4. Save the token securely (see Environment Variables section)

### 2. Configure Bot Commands

Use BotFather's `/setcommands` to configure:

- `/start` - Welcome message and instructions
- `/help` - Show available commands
- `/task` - Create a new task (alternative to natural language)
- `/list` - Show my open tasks
- `/reminders` - Show upcoming reminders
- `/status` - Show system status

## Webhook Configuration

### Current Pattern (Edge Functions)

The bot uses webhooks via Supabase Edge Functions:

```
https://{your-project-ref}.supabase.co/functions/v1/telegram-webhook
```

### Required Environment Variables

```env
# Store in Supabase Edge Functions environment
TELEGRAM_BOT_TOKEN={your-bot-token-from-botfather}
TELEGRAM_WEBHOOK_SECRET={generate-random-secret-32-chars}
N8N_WEBHOOK_URL=http://localhost:5678/webhook/telegram-commands
OPENPROJECT_API_URL=http://localhost:8080/api/v3
OPENPROJECT_API_KEY={your-openproject-api-key}
```

**⚠️ CRITICAL**: Never commit actual tokens to version control!

## Edge Function Implementation

Create `supabase/functions/telegram-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

serve(async (req) => {
  // Verify webhook secret if provided
  const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const update: TelegramUpdate = await req.json();

    // Forward to n8n for processing
    const response = await fetch(N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'telegram',
        update_id: update.update_id,
        user_id: update.message?.from.id,
        chat_id: update.message?.chat.id,
        message_text: update.message?.text,
        username: update.message?.from.username,
        first_name: update.message?.from.first_name,
      }),
    });

    if (!response.ok) {
      console.error('n8n webhook failed:', response.statusText);
      return new Response('Processing failed', { status: 500 });
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
```

## Security Implementation

### 1. Webhook Verification

```bash
# Set webhook with secret token
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://{your-project-ref}.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "{your-32-char-secret}"
  }'
```

### 2. Rate Limiting

Implement in Edge Function:

```typescript
const rateLimiter = new Map<number, { count: number; resetTime: number }>();

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (userLimit.count >= 10) { // 10 messages per minute
    return false;
  }

  userLimit.count++;
  return true;
}
```

## n8n Workflow Integration

### Webhook Trigger Node Configuration

```json
{
  "httpMethod": "POST",
  "path": "telegram-commands",
  "responseMode": "responseNode",
  "options": {}
}
```

### Expected Webhook Payload

```json
{
  "source": "telegram",
  "update_id": 123456,
  "user_id": 123456789,
  "chat_id": 123456789,
  "message_text": "Create task: Fix the pump",
  "username": "john_doe",
  "first_name": "John"
}
```

## Testing Setup

### 1. Local Development

```bash
# Start n8n locally
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n

# Start Supabase Edge Functions locally
supabase functions serve telegram-webhook --env-file .env.local
```

### 2. Test Webhook

```bash
# Test with ngrok for local development
ngrok http 54321

# Set temporary webhook for testing
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok-url.ngrok.io/functions/v1/telegram-webhook"}'
```

## Deployment Checklist

- [ ] Bot created via BotFather
- [ ] Bot token stored in Supabase environment variables
- [ ] Edge Function deployed to Supabase
- [ ] Webhook URL set via Telegram API
- [ ] n8n workflow configured and active
- [ ] Rate limiting implemented
- [ ] Error handling configured
- [ ] Monitoring setup (logs accessible)

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check webhook URL is accessible
   - Verify bot token is correct
   - Check Supabase Edge Function logs

2. **n8n not processing messages**
   - Verify n8n webhook URL is accessible
   - Check n8n workflow is active
   - Review n8n execution logs

3. **Rate limiting issues**
   - Check rate limit configuration
   - Monitor user request patterns
   - Adjust limits as needed

### Debug Commands

```bash
# Check current webhook status
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# View Supabase Edge Function logs
supabase functions logs telegram-webhook

# Remove webhook (for testing)
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook"
```

## Security Best Practices

1. **Never expose bot tokens** in code or documentation
2. **Use webhook secrets** for request verification
3. **Implement rate limiting** to prevent abuse
4. **Validate all input** from Telegram API
5. **Log security events** for monitoring
6. **Rotate tokens periodically** if compromised
7. **Use HTTPS only** for all communications

---

*Updated for current FLRTS architecture - Edge Functions + self-hosted n8n*
*Security: All credentials removed from documentation*
