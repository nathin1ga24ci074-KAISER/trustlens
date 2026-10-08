import { AIProviderName, AIResponse, AIGenerateOptions } from '@trustlens/shared';

export interface AIProvider {
  readonly name: AIProviderName;
  readonly defaultModel: string;

  /**
   * Returns true if provider API key and essential configuration are loaded
   */
  isConfigured(): boolean;

  /**
   * Primary text-generation capability
   */
  generateText(options: AIGenerateOptions): Promise<AIResponse>;

  /**
   * Future multimodal capabilities (Stage 2+)
   */
  analyzeImage?(imageData: Buffer | string, mimeType: string, prompt: string): Promise<AIResponse>;
  analyzeVideo?(videoData: Buffer | string, mimeType: string, prompt: string): Promise<AIResponse>;
  extractClaims?(text: string): Promise<AIResponse>;
  classify?(text: string, categories: string[]): Promise<AIResponse>;
  summarize?(text: string): Promise<AIResponse>;
}
