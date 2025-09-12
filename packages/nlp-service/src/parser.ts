import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ParsedTaskSchema, type ParsedTask } from './schemas';
import { getSystemPrompt } from './prompt';

export class TaskParser {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async parseInput(
    input: string, 
    options?: {
      timezone?: string;
      currentTime?: string;
    }
  ): Promise<ParsedTask> {
    const currentTime = options?.currentTime || new Date().toISOString();
    const systemPrompt = getSystemPrompt(currentTime);

    try {
      const completion = await this.openai.chat.completions.parse({
        model: 'gpt-4o-2024-08-06',  // Use specific version that supports structured outputs
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        response_format: zodResponseFormat(ParsedTaskSchema, 'parsed_task'),
        temperature: 0.1, // Low temperature for consistent parsing
      });

      const parsed = completion.choices[0].message.parsed;
      
      if (!parsed) {
        throw new Error('Failed to parse input - no structured output received');
      }

      return parsed;
    } catch (error) {
      console.error('OpenAI parsing error:', error);
      
      // If it's a refusal or parsing error, try to extract useful info
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
      
      throw error;
    }
  }

  // Helper method to validate the parsed output
  validateParsedTask(task: ParsedTask): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate operation-specific requirements
    if (task.operation === 'CREATE' || task.operation === 'UPDATE') {
      if (!task.workPackage) {
        errors.push('CREATE/UPDATE operations require workPackage details');
      } else {
        if (task.operation === 'CREATE' && !task.workPackage.subject) {
          errors.push('CREATE operation requires a subject');
        }
      }
    }

    if (task.operation === 'LIST' && !task.query) {
      errors.push('LIST operation requires query parameters');
    }

    // Validate reasoning
    if (!task.reasoning || task.reasoning.length < 20) {
      errors.push('Reasoning must be detailed (at least 20 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}