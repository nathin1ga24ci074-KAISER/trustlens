import { env } from '../../../config/env';

export interface ImageDiagnosticEvent {
  verificationId: string;
  stage:
    | 'SECURITY_CHECK'
    | 'METADATA_PRIVACY'
    | 'VISION_ANALYSIS'
    | 'OCR_EXTRACTION'
    | 'CLAIM_EXTRACTION'
    | 'QUERY_GENERATION'
    | 'SEARCH_GROUNDING'
    | 'EVIDENCE_NORMALIZATION'
    | 'RELEVANCE_FILTERING'
    | 'STANCE_CLASSIFICATION'
    | 'CONTEXT_ASSESSMENT'
    | 'DETERMINISTIC_SCORING'
    | 'PIPELINE_COMPLETE';
  status:
    | 'STARTED'
    | 'COMPLETED'
    | 'FAILED'
    | 'SKIPPED'
    | 'RATE_LIMITED'
    | 'INCONCLUSIVE'
    | 'NO_RESULTS'
    | 'UNAVAILABLE';
  message: string;
  data?: Record<string, any>;
}

export class ImageDiagnosticLogger {
  log(event: ImageDiagnosticEvent): void {
    // Silent in production
    if (env.isProduction) return;

    const prefix = `[TrustLens Diagnostic][${event.stage}][${event.verificationId.slice(0, 8)}]`;
    const payload = {
      timestamp: new Date().toISOString(),
      status: event.status,
      message: event.message,
      ...(event.data ? { data: this.sanitizeData(event.data) } : {}),
    };

    if (event.status === 'FAILED' || event.status === 'RATE_LIMITED') {
      console.warn(prefix, payload);
    } else {
      console.log(prefix, payload);
    }
  }

  /**
   * Ensure no API keys, authorization headers, or sensitive user secrets are logged
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('password') ||
        lowerKey.includes('token')
      ) {
        clean[key] = '[REDACTED]';
      } else if (Buffer.isBuffer(value)) {
        clean[key] = `[Buffer ${value.length} bytes]`;
      } else if (typeof value === 'string' && value.length > 500) {
        clean[key] = value.slice(0, 500) + '... [truncated]';
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }
}

export const imageDiagnosticLogger = new ImageDiagnosticLogger();
