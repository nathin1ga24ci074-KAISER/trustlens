export type AIProviderName = 'gemini' | 'groq';

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens?: number | null;
}

export interface AIResponse {
  text: string;
  provider: AIProviderName;
  model: string;
  usage: AIUsage | null;
  latencyMs: number;
  structuredOutput?: Record<string, unknown> | null;
}

export interface AIGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  structuredSchema?: Record<string, unknown>;
}

export interface AITestRequest {
  prompt: string;
  provider?: AIProviderName;
}

export interface AITestResponse {
  success: boolean;
  provider: AIProviderName;
  model: string;
  response: string;
  usage: AIUsage | null;
  latencyMs: number;
}
