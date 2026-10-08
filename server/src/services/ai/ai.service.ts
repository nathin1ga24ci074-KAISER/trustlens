import { AIProviderName, AIResponse, AIGenerateOptions } from '@trustlens/shared';
import { AIProvider } from './ai.types';
import { geminiProvider } from './providers/gemini.provider';
import { groqProvider } from './providers/groq.provider';
import {
  AIError,
  AIInvalidRequestError,
  AIConfigurationError,
  AIProviderError,
} from './ai.errors';
import { env } from '../../config/env';

export interface GenerateTextExecutionOptions extends AIGenerateOptions {
  targetProvider?: AIProviderName;
  disableFallback?: boolean;
}

export class AIService {
  private providers: Map<AIProviderName, AIProvider>;

  constructor(customProviders?: Map<AIProviderName, AIProvider>) {
    if (customProviders) {
      this.providers = customProviders;
    } else {
      this.providers = new Map<AIProviderName, AIProvider>([
        ['gemini', geminiProvider],
        ['groq', groqProvider],
      ]);
    }
  }

  /**
   * Register or replace a provider (useful for testing or modular extension)
   */
  registerProvider(name: AIProviderName, provider: AIProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Retrieve a specific provider instance
   */
  getProvider(name: AIProviderName): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new AIConfigurationError(`AI provider "${name}" is not registered.`, name);
    }
    return provider;
  }

  /**
   * Get primary and fallback provider identities from configuration
   */
  getConfiguredProviders(): { primary: AIProviderName; fallback: AIProviderName | 'none' } {
    return {
      primary: env.AI_PRIMARY_PROVIDER,
      fallback: env.AI_FALLBACK_PROVIDER,
    };
  }

  /**
   * Check status of registered providers
   */
  getProviderStatus(): Record<AIProviderName, { configured: boolean; defaultModel: string }> {
    const status: Partial<Record<AIProviderName, { configured: boolean; defaultModel: string }>> = {};
    for (const [name, provider] of this.providers.entries()) {
      status[name] = {
        configured: provider.isConfigured(),
        defaultModel: provider.defaultModel,
      };
    }
    return status as Record<AIProviderName, { configured: boolean; defaultModel: string }>;
  }

  /**
   * Generate text using primary provider with intelligent fallback strategy
   */
  async generateText(options: GenerateTextExecutionOptions): Promise<AIResponse> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new AIInvalidRequestError('Prompt text is required');
    }

    const { primary, fallback } = this.getConfiguredProviders();
    const primaryName = options.targetProvider || primary;
    const primaryProvider = this.getProvider(primaryName);

    // 1. Attempt Primary Provider
    try {
      return await primaryProvider.generateText(options);
    } catch (primaryError: any) {
      // 2. Evaluate if error allows fallback
      const shouldAttemptFallback =
        !options.disableFallback &&
        !options.targetProvider && // do not fallback if user explicitly requested a specific provider
        fallback !== 'none' &&
        fallback !== primaryName &&
        this.isFallbackEligible(primaryError);

      if (!shouldAttemptFallback) {
        throw primaryError;
      }

      console.warn(
        `[AIService] Primary provider (${primaryName}) encountered [${primaryError.code || 'ERROR'}]: "${primaryError.message}". Attempting fallback to ${fallback}...`
      );

      // 3. Attempt Fallback Provider
      try {
        const fallbackProvider = this.getProvider(fallback);
        return await fallbackProvider.generateText(options);
      } catch (fallbackError: any) {
        console.error(
          `[AIService] Fallback provider (${fallback}) also failed [${fallbackError.code || 'ERROR'}]: "${fallbackError.message}".`
        );
        // Throw aggregated or fallback error
        throw new AIProviderError(
          `Both primary (${primaryName}) and fallback (${fallback}) providers failed. Primary: ${primaryError.message} | Fallback: ${fallbackError.message}`,
          fallback,
          fallbackError
        );
      }
    }
  }

  /**
   * Determine if an error qualifies for provider fallback:
   * - Invalid requests (malformed input) should NOT fallback (it will fail on fallback too)
   * - Rate limits, timeouts, server 5xx errors, or missing primary keys CAN fallback
   */
  private isFallbackEligible(error: any): boolean {
    if (error instanceof AIInvalidRequestError || error.code === 'AI_INVALID_REQUEST') {
      return false;
    }
    if (
      error instanceof AIConfigurationError ||
      error.code === 'AI_CONFIGURATION_ERROR' ||
      error.code === 'AI_AUTHENTICATION_ERROR' ||
      error.code === 'AI_RATE_LIMIT_ERROR' ||
      error.code === 'AI_PROVIDER_ERROR' ||
      error.code === 'AI_TIMEOUT' ||
      error.isRetryable === true
    ) {
      return true;
    }
    // Default safe: if unknown error, allow fallback attempt
    return true;
  }

  /**
   * Multimodal vision analysis using Gemini primary provider
   */
  async generateMultimodal(options: import('./ai.types').AIMultimodalOptions): Promise<AIResponse> {
    const gemini = this.getProvider('gemini');
    if (!gemini.generateMultimodal) {
      throw new AIProviderError('Multimodal capability is not implemented on the Gemini provider', 'gemini');
    }
    return gemini.generateMultimodal(options);
  }

  /**
   * Audio transcription using Gemini audio capabilities
   */
  async transcribeAudio(options: import('./ai.types').AIAudioTranscriptionOptions): Promise<AIResponse> {
    const gemini = this.getProvider('gemini');
    if (!gemini.transcribeAudio) {
      throw new AIProviderError('Audio transcription capability is not implemented on the Gemini provider', 'gemini');
    }
    return gemini.transcribeAudio(options);
  }
}


export const aiService = new AIService();
