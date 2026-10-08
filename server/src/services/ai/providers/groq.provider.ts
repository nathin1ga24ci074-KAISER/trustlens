import Groq from 'groq-sdk';
import { AIProvider } from '../ai.types';
import { env } from '../../../config/env';
import {
  AIConfigurationError,
  AIAuthenticationError,
  AIRateLimitError,
  AIProviderError,
  AITimeoutError,
  AIInvalidRequestError,
} from '../ai.errors';
import { AIResponse, AIGenerateOptions } from '@trustlens/shared';

export class GroqProvider implements AIProvider {
  readonly name = 'groq' as const;
  readonly defaultModel: string;
  private client: Groq | null = null;

  constructor() {
    this.defaultModel = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  isConfigured(): boolean {
    return Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0);
  }

  private getClient(): Groq {
    if (!this.isConfigured()) {
      throw new AIConfigurationError(
        'Groq API key is not configured. Please set GROQ_API_KEY in your environment.',
        this.name
      );
    }

    if (!this.client) {
      this.client = new Groq({ apiKey: env.GROQ_API_KEY });
    }
    return this.client;
  }

  async generateText(options: AIGenerateOptions): Promise<AIResponse> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new AIInvalidRequestError('Prompt text cannot be empty', this.name);
    }

    const client = this.getClient();
    const modelName = options.model || this.defaultModel;
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 30000;

    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.prompt });

      // Wrap in timeout race
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new AITimeoutError(`Groq request timed out after ${timeoutMs}ms`, this.name));
        }, timeoutMs);
      });

      const generatePromise = client.chat.completions.create({
        model: modelName,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
      });

      const completion = await Promise.race([generatePromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      const choice = completion.choices[0];
      const text = choice?.message?.content || '';

      const usage = completion.usage
        ? {
            inputTokens: completion.usage.prompt_tokens ?? null,
            outputTokens: completion.usage.completion_tokens ?? null,
            totalTokens: completion.usage.total_tokens ?? null,
          }
        : null;

      return {
        text,
        provider: this.name,
        model: modelName,
        usage,
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      if (error instanceof AITimeoutError) {
        throw error;
      }
      throw this.normalizeError(error, latencyMs);
    }
  }

  private normalizeError(error: any, _latencyMs: number): Error {
    const rawMsg = error?.message || String(error);
    const status = error?.status;

    // Authentication failure
    if (status === 401 || rawMsg.includes('Invalid API Key') || rawMsg.includes('unauthorized')) {
      return new AIAuthenticationError('Invalid or unauthorized Groq API key.', this.name);
    }

    // Rate limit
    if (status === 429 || rawMsg.includes('rate limit') || rawMsg.includes('quota')) {
      return new AIRateLimitError('Groq API rate limit reached.', this.name);
    }

    // Invalid request
    if (status === 400 || rawMsg.includes('bad_request') || rawMsg.includes('invalid_argument')) {
      return new AIInvalidRequestError(`Groq rejected request: ${rawMsg.replace(/gsk_[a-zA-Z0-9]+/g, 'gsk_***')}`, this.name);
    }

    // Provider / server error
    return new AIProviderError('Groq provider service error.', this.name, error);
  }
}

export const groqProvider = new GroqProvider();
