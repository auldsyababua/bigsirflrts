import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { TaskParser } from './parser';
import { ParseRequestSchema, type ParsedTask } from './schemas';
import { parseExamples } from './prompt';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Debug: Check if API key is loaded
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found in environment');
  process.exit(1);
}
console.log('✅ OpenAI API key loaded (length:', apiKey.length, ')');

const parser = new TaskParser(apiKey);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'nlp-service',
    timestamp: new Date().toISOString() 
  });
});

// Main parsing endpoint
app.post('/parse', async (req, res) => {
  try {
    // Validate request
    const validatedRequest = ParseRequestSchema.parse(req.body);
    const { input, userId, context } = validatedRequest;

    console.log('Parsing input:', input);

    // Parse with OpenAI
    const startTime = Date.now();
    const parsed = await parser.parseInput(input, {
      timezone: context?.timezone,
      currentTime: context?.currentTime
    });
    const parseTime = Date.now() - startTime;

    // Validate the parsed output
    const validation = parser.validateParsedTask(parsed);
    
    // Log to Supabase
    const logEntry = {
      input_text: input,
      parsed_output: parsed,
      reasoning: parsed.reasoning,
      success: validation.valid,
      error_message: validation.valid ? null : validation.errors.join('; '),
      user_id: userId || null
    };

    const { error: logError } = await supabase
      .from('parsing_logs')
      .insert(logEntry);

    if (logError) {
      console.error('Failed to log to Supabase:', logError);
    }

    // Return response
    res.json({
      success: validation.valid,
      parsed,
      validation: validation.valid ? undefined : validation.errors,
      metadata: {
        parseTimeMs: parseTime,
        reasoning: parsed.reasoning
      }
    });

  } catch (error) {
    console.error('Parse error:', error);
    
    // Log error to Supabase
    try {
      await supabase.from('parsing_logs').insert({
        input_text: req.body.input || 'INVALID_INPUT',
        parsed_output: {},
        reasoning: 'Error during parsing',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        user_id: req.body.userId || null
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse input',
      hint: 'Check that your input is a valid task request'
    });
  }
});

// Test endpoint with examples
app.get('/examples', (req, res) => {
  res.json({
    examples: parseExamples,
    usage: 'POST /parse with { "input": "your task here" }'
  });
});

// Get parsing history (requires auth in production)
app.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parsing_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      logs: data,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history'
    });
  }
});

// Analytics endpoint
app.get('/analytics', async (req, res) => {
  try {
    // Get success rate
    const { data: stats, error } = await supabase
      .from('parsing_logs')
      .select('success');

    if (error) throw error;

    const total = stats?.length || 0;
    const successful = stats?.filter(s => s.success).length || 0;
    const failed = total - successful;

    res.json({
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : 'N/A'
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NLP Service running at http://localhost:${PORT}`);
  console.log(`📝 Examples available at http://localhost:${PORT}/examples`);
  console.log(`🔍 Parse endpoint: POST http://localhost:${PORT}/parse`);
});