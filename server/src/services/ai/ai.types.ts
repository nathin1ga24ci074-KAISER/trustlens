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
   * Multimodal image capability (Stage 5+)
   */
  generateMultimodal?(options: AIMultimodalOptions): Promise<AIResponse>;
  analyzeImage?(imageData: Buffer | string, mimeType: string, prompt: string): Promise<AIResponse>;
  analyzeVideo?(videoData: Buffer | string, mimeType: string, prompt: string): Promise<AIResponse>;
  extractClaims?(text: string): Promise<AIResponse>;
  classify?(text: string, categories: string[]): Promise<AIResponse>;
  summarize?(text: string): Promise<AIResponse>;
}

export interface AIMultimodalImage {
  data: Buffer | string;
  mimeType: string;
}

export interface AIMultimodalOptions {
  prompt: string;
  images: AIMultimodalImage[];
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}
