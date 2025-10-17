import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ParsedTaskSchema, type ParsedTask } from './schemas';
import { getSystemPrompt } from './prompt';

export class TaskParser {
  private openai: OpenAI;

  // Resilience config
  private timeoutMs: number;
  private maxRetries: number;
  private baseDelayMs: number;
  private jitterMaxMs: number;
  private circuitThreshold: number;
  private circuitCooldownMs: number;

  // Circuit breaker state
  private consecutiveFailures = 0;
  private breakerOpenUntil = 0;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });

    // Configurable via env with safe defaults
    this.timeoutMs = parseInt(process.env.OPENAI_TIMEOUT_MS || '12000', 10);
    this.maxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || '2', 10);
    this.baseDelayMs = parseInt(process.env.OPENAI_BACKOFF_BASE_MS || '500', 10);
    this.jitterMaxMs = parseInt(process.env.OPENAI_BACKOFF_JITTER_MS || '200', 10);
    this.circuitThreshold = parseInt(process.env.OPENAI_CIRCUIT_THRESHOLD || '5', 10);
    this.circuitCooldownMs = parseInt(process.env.OPENAI_CIRCUIT_COOLDOWN_MS || '60000', 10); // 60s
    // Validate resilience config with upper bounds to prevent misconfiguration
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 120000) {
      throw new Error('OPENAI_TIMEOUT_MS must be between 1 and 120000 (2 minutes)');
    }
    if (!Number.isFinite(this.maxRetries) || this.maxRetries < 0 || this.maxRetries > 10) {
      throw new Error('OPENAI_MAX_RETRIES must be between 0 and 10');
    }
    if (!Number.isFinite(this.baseDelayMs) || this.baseDelayMs < 0 || this.baseDelayMs > 60000) {
      throw new Error('OPENAI_BACKOFF_BASE_MS must be between 0 and 60000 (1 minute)');
    }
    if (!Number.isFinite(this.jitterMaxMs) || this.jitterMaxMs < 0 || this.jitterMaxMs > 5000) {
      throw new Error('OPENAI_BACKOFF_JITTER_MS must be between 0 and 5000');
    }
    if (
      !Number.isFinite(this.circuitThreshold) ||
      this.circuitThreshold <= 0 ||
      this.circuitThreshold > 100
    ) {
      throw new Error('OPENAI_CIRCUIT_THRESHOLD must be between 1 and 100');
    }
    if (
      !Number.isFinite(this.circuitCooldownMs) ||
      this.circuitCooldownMs <= 0 ||
      this.circuitCooldownMs > 600000
    ) {
      throw new Error('OPENAI_CIRCUIT_COOLDOWN_MS must be between 1 and 600000 (10 minutes)');
    }
    if (this.jitterMaxMs > this.baseDelayMs) {
      this.jitterMaxMs = this.baseDelayMs;
    }
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calcBackoff(attempt: number): number {
    const expo = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * this.jitterMaxMs);
    return expo + jitter;
  }

  private openBreakerIfNeeded() {
    if (this.consecutiveFailures >= this.circuitThreshold) {
      this.breakerOpenUntil = Date.now() + this.circuitCooldownMs;
    }
  }

  private ensureBreakerClosed() {
    if (Date.now() < this.breakerOpenUntil) {
      throw new Error('OpenAI circuit breaker open - temporarily rejecting requests');
    }
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

    // Allow model/temperature override via env
    const model = process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06';
    const parsedTemp = process.env.OPENAI_TEMPERATURE
      ? Number(process.env.OPENAI_TEMPERATURE)
      : undefined;
    const temperature =
      Number.isFinite(parsedTemp) && (parsedTemp as number) >= 0 && (parsedTemp as number) <= 2
        ? (parsedTemp as number)
        : 0.1;

    this.ensureBreakerClosed();

    let lastError: any;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const completion = await this.openai.chat.completions.parse({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input },
          ],
          response_format: zodResponseFormat(ParsedTaskSchema, 'parsed_task'),
          temperature,
          signal: controller.signal,
        });

        clearTimeout(timer);

        // Defensive checks for response shape
        if (!completion.choices?.[0]?.message?.parsed) {
          throw new Error('Failed to parse input - no structured output received');
        }

        const parsed = completion.choices[0].message.parsed;

        // Success → reset breaker state
        this.consecutiveFailures = 0;
        this.breakerOpenUntil = 0;
        return parsed;
      } catch (error: any) {
        clearTimeout(timer);
        lastError = error;
        console.error('OpenAI parsing error:', error?.message || error);

        // 4xx (non-429) considered non-retryable; others may retry
        const status = error?.status || error?.response?.status;
        const code = error?.code;
        const aborted = error?.name === 'AbortError' || code === 'ABORT_ERR';
        const isRateLimited = status === 429;
        const isServerError = status >= 500 || status === undefined; // network
        const isRetryable = aborted || isRateLimited || isServerError;

        if (attempt < this.maxRetries && isRetryable) {
          const delay = this.calcBackoff(attempt);
          await this.sleep(delay);
          continue; // retry
        }

        // Map SDK API error nicely when available
        if (error instanceof OpenAI.APIError) {
          throw new Error(`OpenAI API Error: ${error.message}`);
        }
        throw error;
      }
    }

    // All retries exhausted - update circuit breaker
    this.consecutiveFailures++;
    this.openBreakerIfNeeded();

    // Map SDK API error nicely when available
    if (lastError instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API Error: ${lastError.message}`);
    }
    throw lastError || new Error('OpenAI parsing failed after retries');
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
      errors,
    };
  }
}
