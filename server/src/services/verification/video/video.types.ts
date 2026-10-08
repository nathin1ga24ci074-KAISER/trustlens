import {
  VideoMetadata,
  VideoKeyframe,
  VideoTranscriptAnalysis,
  VideoTemporalAnalysis,
  VideoContextAssessment,
  VideoManipulationSignal,
  VideoClaimVerificationResult,
  VideoVerificationResult,
} from '@trustlens/shared';

export type VideoErrorCode =
  | 'VIDEO_EMPTY'
  | 'VIDEO_TOO_LARGE'
  | 'VIDEO_INVALID_TYPE'
  | 'VIDEO_TOO_LONG'
  | 'VIDEO_DIMENSIONS_TOO_LARGE'
  | 'VIDEO_CORRUPT'
  | 'VIDEO_PROCESSING_FAILED'
  | 'VIDEO_AUDIO_EXTRACTION_FAILED'
  | 'FFMPEG_UNAVAILABLE';

export class VideoSecurityError extends Error {
  public code: VideoErrorCode;
  public details?: unknown;

  constructor(message: string, code: VideoErrorCode, details?: unknown) {
    super(message);
    this.name = 'VideoSecurityError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, VideoSecurityError.prototype);
  }
}

export interface VideoProcessingInput {
  filePath: string;
  originalFilename: string;
  declaredMimeType?: string;
  fileSizeBytes: number;
  userContext?: string;
  userId: string;
}

export interface FrameExtractionResult {
  keyframes: VideoKeyframe[];
  deduplicatedCount: number;
  totalSampled: number;
}
