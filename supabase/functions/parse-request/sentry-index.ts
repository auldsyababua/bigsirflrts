// Sentry-Enhanced Parse Request Edge Function for FLRTS
// Example implementation with Sentry error tracking and performance monitoring
// Based on the original parse-request function with Sentry integration

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';

// Initialize Sentry for error tracking and performance monitoring
Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  defaultIntegrations: false, // Disabled due to Deno.serve scope issues
  tracesSampleRate: 1.0, // 100% of transactions for development/testing
  profilesSampleRate: 1.0, // Performance profiling
  environment: Deno.env.get('SUPABASE_ENVIRONMENT') || 'development',
  release: Deno.env.get('SUPABASE_FUNCTION_VERSION') || '1.0.0',
});

// Set region and execution_id as custom tags for better tracking
Sentry.setTag('region', Deno.env.get('SB_REGION') || 'unknown');
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID') || 'unknown');
Sentry.setTag('function_name', 'parse-request');

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple parse patterns for immediate response
const SIMPLE_PATTERNS = {
  CREATE_TASK: /^(create|add|new)\s+(task|item|work)\s+(.+)/i,
  DUE_DATE:
    /(due|by|before|until)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  ASSIGNEE: /@(\w+)/g,
  PRIORITY: /(urgent|high|medium|low|critical)/i,
  PROJECT: /#(\w+)/g,
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Use Sentry scope isolation for proper request tracking
  return await Sentry.withScope(async (scope) => {
    const startTime = Date.now();

    // Set request context for this scope
    scope.setTag('request_method', req.method);
    scope.setTag('request_url', req.url);
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    try {
      // Start performance transaction
      const transaction = Sentry.startTransaction({
        name: 'parse-request-handler',
        op: 'http.server',
      });

      scope.setSpan(transaction);

      // Authorization: Accept either Supabase JWT or custom PARSE_AUTH_TOKEN
      const authHeader = req.headers.get('Authorization');
      const PARSE_AUTH_TOKEN = Deno.env.get('PARSE_AUTH_TOKEN');

      // Add authentication span
      const authSpan = transaction.startChild({
        op: 'auth.validate',
        description: 'Validate authentication',
      });

      scope.setUser({
        id: authHeader ? 'authenticated' : 'anonymous',
        authMethod:
          PARSE_AUTH_TOKEN && authHeader === `Bearer ${PARSE_AUTH_TOKEN}`
            ? 'custom_token'
            : 'supabase_jwt',
      });

      authSpan.finish();

      // Parse request body with error handling
      const parseSpan = transaction.startChild({
        op: 'request.parse',
        description: 'Parse request body',
      });

      let requestData;
      try {
        requestData = await req.json();
      } catch (parseError) {
        parseSpan.setStatus('invalid_argument');
        parseSpan.finish();
        transaction.finish();

        Sentry.captureException(new Error('Invalid JSON in request body'), {
          extra: { originalError: parseError.message },
        });

        await Sentry.flush(2000);

        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      parseSpan.finish();

      const { input, context } = requestData;

      if (!input) {
        transaction.setStatus('invalid_argument');
        transaction.finish();

        scope.setContext('validation', { missingField: 'input' });
        Sentry.captureMessage('Missing required input field', 'warning');

        await Sentry.flush(2000);

        return new Response(JSON.stringify({ error: 'Input text is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Parsing input: ${input.substring(0, 100)}`);
      scope.setContext('parsing', {
        inputLength: input.length,
        inputPreview: input.substring(0, 100),
      });

      // Quick parse attempt with performance tracking
      const quickParseSpan = transaction.startChild({
        op: 'parse.quick',
        description: 'Attempt quick pattern matching',
      });

      const quickParse = attemptQuickParse(input);
      quickParseSpan.setData('found_quick_match', !!quickParse);
      quickParseSpan.finish();

      if (quickParse) {
        // Log successful quick parse
        const logSpan = transaction.startChild({
          op: 'database.insert',
          description: 'Log quick parse result',
        });

        await logParse(input, quickParse, 'quick-parse', true);
        logSpan.finish();

        scope.setTag('parse_type', 'quick');
        scope.setTag('parse_confidence', quickParse.confidence.toString());

        transaction.setStatus('ok');
        transaction.finish();

        const responseTime = Date.now() - startTime;
        scope.setContext('performance', { responseTime });

        return new Response(
          JSON.stringify({
            success: true,
            data: quickParse,
            parseType: 'quick',
            confidence: quickParse.confidence,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Complex parsing queue
      const queueSpan = transaction.startChild({
        op: 'queue.submit',
        description: 'Queue complex parsing request',
      });

      const queueId = await queueComplexParse(input, context, authHeader);
      queueSpan.setData('queue_id', queueId);
      queueSpan.finish();

      scope.setTag('parse_type', 'complex');
      scope.setContext('queue', { queueId });

      transaction.setStatus('ok');
      transaction.finish();

      const responseTime = Date.now() - startTime;
      scope.setContext('performance', { responseTime });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'pending',
            queueId: queueId,
            message: 'Complex parsing queued for processing',
            estimatedTime: '2-5 seconds',
          },
          parseType: 'complex',
        }),
        {
          status: 202, // Accepted for processing
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Parse request error:', error);

      // Capture detailed error context
      scope.setLevel('error');
      scope.setContext('error_details', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      Sentry.captureException(error);
      await Sentry.flush(2000);

      return new Response(
        JSON.stringify({
          error: 'Failed to process parse request',
          message: error.message,
          requestId: scope.getTag('execution_id'),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  });
});

// Attempt quick parsing for simple patterns (unchanged from original)
function attemptQuickParse(input: string): any | null {
  const normalized = input.toLowerCase().trim();

  const createMatch = input.match(SIMPLE_PATTERNS.CREATE_TASK);
  if (!createMatch) return null;

  const taskDescription = createMatch[3];
  const assignees = [...input.matchAll(SIMPLE_PATTERNS.ASSIGNEE)].map((m) => m[1]);
  const projects = [...input.matchAll(SIMPLE_PATTERNS.PROJECT)].map((m) => m[1]);
  const priorityMatch = input.match(SIMPLE_PATTERNS.PRIORITY);
  const dueDateMatch = input.match(SIMPLE_PATTERNS.DUE_DATE);

  const parsed = {
    operation: 'CREATE',
    type: 'TASK',
    subject: taskDescription.replace(/@\w+/g, '').replace(/#\w+/g, '').trim(),
    assignees: assignees.length > 0 ? assignees : undefined,
    projects: projects.length > 0 ? projects : undefined,
    priority: priorityMatch ? normalizePriority(priorityMatch[1]) : 'normal',
    dueDate: dueDateMatch ? parseDueDate(dueDateMatch[2]) : undefined,
    confidence: calculateConfidence(input, assignees.length, projects.length),
    raw: input,
  };

  return parsed.confidence >= 0.7 ? parsed : null;
}

function normalizePriority(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'urgent' || p === 'critical') return 'high';
  if (p === 'low') return 'low';
  return 'normal';
}

function parseDueDate(dateStr: string): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateMap: Record<string, Date> = {
    today: today,
    tomorrow: tomorrow,
  };

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = today.getDay();

  weekdays.forEach((day, index) => {
    const daysUntil = (index - currentDay + 7) % 7 || 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    dateMap[day] = targetDate;
  });

  const targetDate = dateMap[dateStr.toLowerCase()];
  return targetDate ? targetDate.toISOString().split('T')[0] : dateStr;
}

function calculateConfidence(input: string, assigneeCount: number, projectCount: number): number {
  let confidence = 0.5;

  if (assigneeCount > 0) confidence += 0.2;
  if (projectCount > 0) confidence += 0.1;
  if (input.match(SIMPLE_PATTERNS.DUE_DATE)) confidence += 0.1;
  if (input.match(SIMPLE_PATTERNS.PRIORITY)) confidence += 0.1;

  if (input.length < 10) confidence -= 0.2;
  if (input.length > 200) confidence -= 0.1;

  return Math.min(Math.max(confidence, 0), 1);
}

async function queueComplexParse(input: string, context: any, authHeader: string): Promise<string> {
  const queueId = crypto.randomUUID();

  const queueData = {
    queueId,
    timestamp: new Date().toISOString(),
    input,
    context,
    source: 'parse-edge-function-sentry',
    authHeader: authHeader.substring(0, 20) + '...',
  };

  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Queue-Type': 'complex-parse',
      },
      body: JSON.stringify(queueData),
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { operation: 'n8n_webhook_queue' },
      extra: { queueId, webhookUrl: N8N_WEBHOOK_URL },
    });
    console.error('Failed to queue to n8n:', err);
  }

  try {
    await supabase.from('parse_queue').insert({
      queue_id: queueId,
      input: input.substring(0, 500),
      status: 'queued',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { operation: 'supabase_queue_insert' },
      extra: { queueId },
    });
  }

  return queueId;
}

async function logParse(
  input: string,
  result: any,
  parseType: string,
  success: boolean
): Promise<void> {
  try {
    await supabase.from('parse_logs').insert({
      input: input.substring(0, 200),
      result: result,
      parse_type: parseType,
      success,
      confidence: result?.confidence,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: 'parse_log_insert' },
      extra: { parseType, success },
    });
    console.error('Failed to log parse:', error);
  }
}
