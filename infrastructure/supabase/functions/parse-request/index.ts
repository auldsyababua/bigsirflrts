// Parse Request Edge Function for FLRTS
// Handles direct parse requests from web UI and other clients
// Provides immediate response for simple parsing tasks

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL")!;

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
  DUE_DATE: /(due|by|before|until)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  ASSIGNEE: /@(\w+)/g,
  PRIORITY: /(urgent|high|medium|low|critical)/i,
  PROJECT: /#(\w+)/g,
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authorization: Accept either Supabase JWT or custom PARSE_AUTH_TOKEN
    const authHeader = req.headers.get('Authorization');
    const PARSE_AUTH_TOKEN = Deno.env.get('PARSE_AUTH_TOKEN');

    // If custom token is set and provided, validate it
    if (PARSE_AUTH_TOKEN && authHeader === `Bearer ${PARSE_AUTH_TOKEN}`) {
      // Custom token is valid, proceed
      console.log('Authenticated with custom PARSE_AUTH_TOKEN');
    } else {
      // Otherwise, Supabase JWT verification handles auth
      // (service role key or anon key with proper JWT)
      console.log('Authenticated with Supabase JWT');
    }

    // Parse request body
    const { input, context } = await req.json();

    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Input text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing input: ${input.substring(0, 100)}`);

    // Check if this is a simple pattern we can handle immediately
    const quickParse = attemptQuickParse(input);

    if (quickParse) {
      // Log the quick parse
      await logParse(input, quickParse, 'quick-parse', true);

      return new Response(
        JSON.stringify({
          success: true,
          data: quickParse,
          parseType: 'quick',
          confidence: quickParse.confidence
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // For complex parsing, queue to n8n and return pending status
    const queueId = await queueComplexParse(input, context, authHeader);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: 'pending',
          queueId: queueId,
          message: 'Complex parsing queued for processing',
          estimatedTime: '2-5 seconds'
        },
        parseType: 'complex'
      }),
      {
        status: 202, // Accepted for processing
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Parse request error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process parse request',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Attempt quick parsing for simple patterns
function attemptQuickParse(input: string): any | null {
  const normalized = input.toLowerCase().trim();

  // Check for simple task creation
  const createMatch = input.match(SIMPLE_PATTERNS.CREATE_TASK);
  if (!createMatch) return null;

  const taskDescription = createMatch[3];

  // Extract components
  const assignees = [...input.matchAll(SIMPLE_PATTERNS.ASSIGNEE)].map(m => m[1]);
  const projects = [...input.matchAll(SIMPLE_PATTERNS.PROJECT)].map(m => m[1]);
  const priorityMatch = input.match(SIMPLE_PATTERNS.PRIORITY);
  const dueDateMatch = input.match(SIMPLE_PATTERNS.DUE_DATE);

  // Build parsed result
  const parsed = {
    operation: 'CREATE',
    type: 'TASK',
    subject: taskDescription.replace(/@\w+/g, '').replace(/#\w+/g, '').trim(),
    assignees: assignees.length > 0 ? assignees : undefined,
    projects: projects.length > 0 ? projects : undefined,
    priority: priorityMatch ? normalizePriority(priorityMatch[1]) : 'normal',
    dueDate: dueDateMatch ? parseDueDate(dueDateMatch[2]) : undefined,
    confidence: calculateConfidence(input, assignees.length, projects.length),
    raw: input
  };

  // Only return if we have reasonable confidence
  return parsed.confidence >= 0.7 ? parsed : null;
}

// Normalize priority values
function normalizePriority(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'urgent' || p === 'critical') return 'high';
  if (p === 'low') return 'low';
  return 'normal';
}

// Parse relative date strings
function parseDueDate(dateStr: string): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateMap: Record<string, Date> = {
    'today': today,
    'tomorrow': tomorrow,
  };

  // Add weekdays
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = today.getDay();

  weekdays.forEach((day, index) => {
    const daysUntil = (index - currentDay + 7) % 7 || 7; // If same day, assume next week
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    dateMap[day] = targetDate;
  });

  const targetDate = dateMap[dateStr.toLowerCase()];
  return targetDate ? targetDate.toISOString().split('T')[0] : dateStr;
}

// Calculate parsing confidence
function calculateConfidence(input: string, assigneeCount: number, projectCount: number): number {
  let confidence = 0.5; // Base confidence for pattern match

  // Boost for specific elements
  if (assigneeCount > 0) confidence += 0.2;
  if (projectCount > 0) confidence += 0.1;
  if (input.match(SIMPLE_PATTERNS.DUE_DATE)) confidence += 0.1;
  if (input.match(SIMPLE_PATTERNS.PRIORITY)) confidence += 0.1;

  // Reduce for very short or very long inputs
  if (input.length < 10) confidence -= 0.2;
  if (input.length > 200) confidence -= 0.1;

  return Math.min(Math.max(confidence, 0), 1);
}

// Queue complex parsing to n8n
async function queueComplexParse(input: string, context: any, authHeader: string): Promise<string> {
  const queueId = crypto.randomUUID();

  const queueData = {
    queueId,
    timestamp: new Date().toISOString(),
    input,
    context,
    source: 'parse-edge-function',
    authHeader: authHeader.substring(0, 20) + '...', // Truncate for security
  };

  // Send to n8n webhook
  fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Queue-Type": "complex-parse"
    },
    body: JSON.stringify(queueData)
  }).catch(err => console.error("Failed to queue to n8n:", err));

  // Also store in Supabase for tracking
  await supabase.from("parse_queue").insert({
    queue_id: queueId,
    input: input.substring(0, 500),
    status: 'queued',
    created_at: new Date().toISOString()
  });

  return queueId;
}

// Log parse attempts for analytics
async function logParse(input: string, result: any, parseType: string, success: boolean): Promise<void> {
  try {
    await supabase.from("parse_logs").insert({
      input: input.substring(0, 200),
      result: result,
      parse_type: parseType,
      success,
      confidence: result?.confidence,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log parse:", error);
  }
}