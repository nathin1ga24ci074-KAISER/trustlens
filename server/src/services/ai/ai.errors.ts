export type AIErrorCode =
  | 'AI_CONFIGURATION_ERROR'
  | 'AI_AUTHENTICATION_ERROR'
  | 'AI_RATE_LIMIT_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'AI_INVALID_REQUEST'
  | 'AI_TIMEOUT';

export interface AIErrorOptions {
  provider?: string;
  statusCode?: number;
  isRetryable?: boolean;
  cause?: unknown;
}

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly provider?: string;
  readonly statusCode: number;
  readonly isRetryable: boolean;

  constructor(message: string, code: AIErrorCode, options: AIErrorOptions = {}) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.provider = options.provider;
    this.statusCode = options.statusCode || (code === 'AI_INVALID_REQUEST' ? 400 : code === 'AI_RATE_LIMIT_ERROR' ? 429 : 502);
    this.isRetryable = options.isRetryable ?? (code === 'AI_RATE_LIMIT_ERROR' || code === 'AI_PROVIDER_ERROR' || code === 'AI_TIMEOUT');

    if (options.cause && options.cause instanceof Error) {
      this.cause = options.cause;
    }
  }
}

export class AIConfigurationError extends AIError {
  constructor(message: string, provider?: string) {
    super(message, 'AI_CONFIGURATION_ERROR', { provider, statusCode: 500, isRetryable: false });
  }
}

export class AIAuthenticationError extends AIError {
  constructor(message: string, provider?: string) {
    super(message, 'AI_AUTHENTICATION_ERROR', { provider, statusCode: 401, isRetryable: false });
  }
}

export class AIRateLimitError extends AIError {
  constructor(message: string, provider?: string) {
    super(message, 'AI_RATE_LIMIT_ERROR', { provider, statusCode: 429, isRetryable: true });
  }
}

export class AIProviderError extends AIError {
  constructor(message: string, provider?: string, cause?: unknown) {
    super(message, 'AI_PROVIDER_ERROR', { provider, statusCode: 502, isRetryable: true, cause });
  }
}

export class AIInvalidRequestError extends AIError {
  constructor(message: string, provider?: string) {
    super(message, 'AI_INVALID_REQUEST', { provider, statusCode: 400, isRetryable: false });
  }
}

export class AITimeoutError extends AIError {
  constructor(message: string, provider?: string) {
    super(message, 'AI_TIMEOUT', { provider, statusCode: 504, isRetryable: true });
  }
}
