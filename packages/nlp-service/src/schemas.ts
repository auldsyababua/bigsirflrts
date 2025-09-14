import { z } from 'zod';

// Hardcoded options for MVP
export const TEAM_MEMBERS = ['Taylor', 'Colin', 'Bryan', 'Austin'] as const;
export const SITES = ['Site A', 'Site B', 'Site C'] as const;
export const PARTNERS = ['Partner 1', 'Partner 2'] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'immediate'] as const;
export const OPERATIONS = ['CREATE', 'UPDATE', 'DELETE', 'LIST'] as const;

// Main schema for parsed tasks with reasoning
export const ParsedTaskSchema = z.object({
  operation: z.enum(OPERATIONS),

  workPackage: z
    .object({
      subject: z.string().describe('The title/subject of the task'),
      assignee: z.enum(TEAM_MEMBERS).nullable().describe('Team member to assign the task to'),
      site: z.enum(SITES).nullable().describe('Which site this task relates to'),
      partner: z.enum(PARTNERS).nullable().describe('Which partner this involves'),
      dueDate: z.string().datetime().nullable().describe('ISO 8601 datetime in UTC'),
      description: z.string().nullable().describe('Additional task details'),
      priority: z.enum(PRIORITIES).nullable().describe('Task priority level'),
      customFields: z.record(z.any()).nullable().describe('Any custom OpenProject fields'),
    })
    .nullable()
    .describe('Work package details for CREATE/UPDATE operations'),

  query: z
    .object({
      assignee: z.enum(TEAM_MEMBERS).nullable(),
      project: z.string().nullable(),
      status: z.string().nullable(),
      dateRange: z
        .object({
          start: z.string().datetime().nullable(),
          end: z.string().datetime().nullable(),
        })
        .nullable(),
    })
    .nullable()
    .describe('Query parameters for LIST operations'),

  reasoning: z
    .string()
    .describe(
      'REQUIRED: Explain your parsing decisions including: ' +
        '1) How you identified the assignee, ' +
        '2) How you parsed dates/times and converted to UTC, ' +
        '3) Why you chose the priority level, ' +
        '4) Any ambiguities you resolved and assumptions made'
    ),
});

export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

// Schema for API requests (not used for OpenAI, so can keep optional)
export const ParseRequestSchema = z.object({
  input: z.string().min(1).describe('Natural language task input'),
  userId: z.string().uuid().optional().describe('Supabase user ID for logging'),
  context: z
    .object({
      timezone: z.string().optional().default('America/Chicago').describe('User timezone'),
      currentTime: z.string().datetime().optional().describe('Override current time for testing'),
    })
    .optional(),
});

export type ParseRequest = z.infer<typeof ParseRequestSchema>;

// Schema for parsing logs in Supabase
export const ParsingLogSchema = z.object({
  input_text: z.string(),
  parsed_output: z.any(), // JSONB in postgres
  reasoning: z.string(),
  success: z.boolean().default(true),
  error_message: z.string().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export type ParsingLog = z.infer<typeof ParsingLogSchema>;
