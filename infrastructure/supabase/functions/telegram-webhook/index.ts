// Telegram Webhook Edge Function for FLRTS
// Provides sub-200ms response times for immediate acknowledgment
// Queues messages to n8n for complex processing

// serve import removed - using Deno.serve directly
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Environment variables
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')!;
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Performance timer utility
class PerformanceTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  checkpoint(label: string): void {
    console.log(`[PERF] ${label}: ${this.elapsed()}ms`);
  }
}

Deno.serve(async (req: Request) => {
  const timer = new PerformanceTimer();

  try {
    // 1. Validate webhook signature (Telegram's secret token)
    const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretToken !== WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    timer.checkpoint('Auth validated');

    // 2. Parse incoming update
    const update = await req.json();
    const chatId = update.message?.chat?.id;
    const messageText = update.message?.text;
    const userId = update.message?.from?.id;
    const messageId = update.message?.message_id;
    const username = update.message?.from?.username;

    timer.checkpoint('Payload parsed');

    // 3. Quick validation
    if (!chatId || !messageText) {
      return new Response('OK', { status: 200 });
    }

    // 4. Send immediate acknowledgment via Telegram API (fire and forget)
    const acknowledgmentPromise = sendQuickReply(chatId, messageId, messageText);

    // 5. Queue for n8n processing (non-blocking)
    const queuePromise = queueForProcessing(update, timer);

    // 6. Log to Supabase (non-blocking)
    const logPromise = logToSupabase(update, timer.elapsed());

    // Don't wait for async operations - respond immediately
    console.log(`[COMPLETE] Total sync time: ${timer.elapsed()}ms`);

    return new Response(
      JSON.stringify({
        ok: true,
        acknowledged: true,
        processingTime: timer.elapsed(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);

    // Even on error, return 200 to prevent Telegram retries
    return new Response(
      JSON.stringify({
        ok: true,
        error: true,
        message: 'Queued for retry',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Quick reply function - returns immediately
async function sendQuickReply(
  chatId: number,
  replyToId: number,
  originalText: string
): Promise<void> {
  const quickResponses: Record<string, string> = {
    '/start': '👋 Welcome! Setting up your workspace...',
    '/help': '📚 Loading help menu...',
    '/status': '🔄 Checking system status...',
    '/test': '🧪 Test received! Processing...',
    default: '✅ Message received! Processing...',
  };

  // Determine response based on command
  const command = originalText.split(' ')[0].toLowerCase();
  const responseText = quickResponses[command] || quickResponses.default;

  // Fire and forget - don't await
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: responseText,
      reply_to_message_id: replyToId,
      parse_mode: 'HTML',
    }),
  }).catch((err) => console.error('Failed to send acknowledgment:', err));
}

// Queue for n8n processing via webhook
async function queueForProcessing(update: any, timer: PerformanceTimer): Promise<void> {
  try {
    const queueData = {
      timestamp: new Date().toISOString(),
      update: update,
      source: 'edge-function',
      priority: determinePriority(update.message?.text),
      metadata: {
        chatId: update.message?.chat?.id,
        userId: update.message?.from?.id,
        username: update.message?.from?.username,
        messageId: update.message?.message_id,
      },
    };

    // Send to n8n webhook for processing
    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queueData),
    }).catch((err) => console.error('Failed to queue to n8n:', err));

    timer.checkpoint('Queued to n8n');
  } catch (error) {
    console.error('Queue error (non-blocking):', error);
    // Don't throw - this is non-critical path
  }
}

// Determine message priority for queue ordering
function determinePriority(text: string): 'high' | 'normal' | 'low' {
  if (!text) return 'normal';

  // High priority keywords
  const highPriority = ['urgent', 'emergency', 'critical', 'asap', 'immediately', 'priority'];
  const lowPriority = ['test', 'debug', 'ping', 'hello'];

  const lowerText = text.toLowerCase();

  if (highPriority.some((keyword) => lowerText.includes(keyword))) {
    return 'high';
  }

  if (lowPriority.some((keyword) => lowerText.includes(keyword))) {
    return 'low';
  }

  return 'normal';
}

// Log to Supabase for analytics
async function logToSupabase(update: any, responseTime: number): Promise<void> {
  try {
    await supabase.from('telegram_webhook_logs').insert({
      message_id: update.message?.message_id,
      chat_id: update.message?.chat?.id,
      user_id: update.message?.from?.id,
      username: update.message?.from?.username,
      text: update.message?.text?.substring(0, 100), // Truncate for privacy
      response_time_ms: responseTime,
      processed_by: 'edge-function',
      priority: determinePriority(update.message?.text),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Logging error (non-blocking):', error);
  }
}
