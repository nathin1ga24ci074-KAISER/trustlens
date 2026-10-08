import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIMultimodalOptions } from '../ai.types';
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

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  readonly defaultModel: string;
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    this.defaultModel = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  }

  isConfigured(): boolean {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.isConfigured()) {
      throw new AIConfigurationError(
        'Google Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.',
        this.name
      );
    }

    if (!this.client) {
      this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
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
    const timeoutMs = options.timeoutMs || 15000;

    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens,
        },
        systemInstruction: options.systemPrompt,
      });

      // Wrap in timeout race
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new AITimeoutError(`Gemini request timed out after ${timeoutMs}ms`, this.name));
        }, timeoutMs);
      });

      const generatePromise = model.generateContent(options.prompt);

      const result = await Promise.race([generatePromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      const response = await result.response;
      const text = response.text();

      // Extract usage metadata if present
      const usageMetadata = response.usageMetadata;
      const usage = usageMetadata
        ? {
            inputTokens: usageMetadata.promptTokenCount ?? null,
            outputTokens: usageMetadata.candidatesTokenCount ?? null,
            totalTokens: usageMetadata.totalTokenCount ?? null,
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

  async generateMultimodal(options: AIMultimodalOptions): Promise<AIResponse> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new AIInvalidRequestError('Prompt text cannot be empty', this.name);
    }
    if (!options.images || options.images.length === 0) {
      throw new AIInvalidRequestError('Multimodal request must contain at least one image', this.name);
    }

    const client = this.getClient();
    const modelName = options.model || this.defaultModel;
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 25000;

    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens,
        },
        systemInstruction: options.systemPrompt,
      });

      const parts: any[] = [];
      for (const img of options.images) {
        const base64Data = Buffer.isBuffer(img.data) ? img.data.toString('base64') : img.data;
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: img.mimeType,
          },
        });
      }
      parts.push(options.prompt);

      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new AITimeoutError(`Gemini multimodal request timed out after ${timeoutMs}ms`, this.name));
        }, timeoutMs);
      });

      const generatePromise = model.generateContent(parts);
      const result = await Promise.race([generatePromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      const response = await result.response;
      const text = response.text();

      const usageMetadata = response.usageMetadata;
      const usage = usageMetadata
        ? {
            inputTokens: usageMetadata.promptTokenCount ?? null,
            outputTokens: usageMetadata.candidatesTokenCount ?? null,
            totalTokens: usageMetadata.totalTokenCount ?? null,
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

  async transcribeAudio(options: import('../ai.types').AIAudioTranscriptionOptions): Promise<AIResponse> {
    if (!options.audio || !options.audio.data) {
      throw new AIInvalidRequestError('Audio data cannot be empty', this.name);
    }

    const client = this.getClient();
    const modelName = options.model || this.defaultModel;
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 30000;

    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature ?? 0.1,
        },
        systemInstruction:
          options.systemPrompt ||
          'You are an expert audio transcription and speech verification analyst. Provide a faithful, clean transcript of spoken dialogue. Output a JSON object: { "fullTranscript": string, "segments": [{ "startTime": number, "endTime": number, "text": string }] }',
      });

      const base64Data = Buffer.isBuffer(options.audio.data)
        ? options.audio.data.toString('base64')
        : options.audio.data;

      const parts: any[] = [
        {
          inlineData: {
            data: base64Data,
            mimeType: options.audio.mimeType,
          },
        },
        options.prompt ||
          'Transcribe all spoken dialogue in this audio file. Return a JSON structure with fullTranscript and timestamped segments: { "fullTranscript": string, "segments": [{ "startTime": number, "endTime": number, "text": string }] }',
      ];

      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new AITimeoutError(`Gemini audio transcription timed out after ${timeoutMs}ms`, this.name));
        }, timeoutMs);
      });

      const generatePromise = model.generateContent(parts);
      const result = await Promise.race([generatePromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      const response = await result.response;
      const text = response.text();

      const usageMetadata = response.usageMetadata;
      const usage = usageMetadata
        ? {
            inputTokens: usageMetadata.promptTokenCount ?? null,
            outputTokens: usageMetadata.candidatesTokenCount ?? null,
            totalTokens: usageMetadata.totalTokenCount ?? null,
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

    // Check for API key / Auth issues
    if (
      rawMsg.includes('API_KEY_INVALID') ||
      rawMsg.includes('API key not valid') ||
      error?.status === 401 ||
      error?.status === 403
    ) {
      return new AIAuthenticationError('Invalid or unauthorized Gemini API key.', this.name);
    }

    // Rate limits / quota
    if (
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.includes('quota') ||
      rawMsg.includes('rate limit') ||
      error?.status === 429
    ) {
      return new AIRateLimitError('Gemini API rate limit or quota exceeded.', this.name);
    }

    // Invalid parameters / blocked safety
    if (
      rawMsg.includes('INVALID_ARGUMENT') ||
      rawMsg.includes('SAFETY') ||
      rawMsg.includes('block') ||
      error?.status === 400
    ) {
      return new AIInvalidRequestError(`Gemini rejected request: ${rawMsg.replace(/key=[^&\s]+/gi, 'key=***')}`, this.name);
    }

    // Provider / server errors
    return new AIProviderError('Gemini provider service error.', this.name, error);
  }
}

export const geminiProvider = new GeminiProvider();
