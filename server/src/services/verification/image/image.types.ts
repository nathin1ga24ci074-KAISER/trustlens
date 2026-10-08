import {
  ImageClassification,
  ClaimSourceType,
  ClaimType,
  ClaimImportance,
  PrimaryVerdict,
  ConfidenceLevel,
  EvidenceItem,
  ContradictionAnalysisResult,
  ImageMetadataAnalysis,
  ImageManipulationAnalysis,
  ImageContextAssessment,
  ImageClaimVerificationResult,
  ImageVerificationResult,
} from '@trustlens/shared';

export interface ValidatedImageInput {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'jpeg' | 'png' | 'webp';
  sizeBytes: number;
  originalFilename?: string;
  userContext?: string;
  verificationId?: string;
}

export interface RawVisualUnderstanding {
  description: string;
  classification: ImageClassification;
  visibleText: string[];
  entities: string[];
  scene: string;
  possibleEvent?: string | null;
  possibleLocation?: string | null;
  possibleDate?: string | null;
  observations: string[];
  inferredAspects: string[];
  uncertainties: string[];
  manipulationIndicators: {
    detected: boolean;
    severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    indicators: string[];
    limitations: string[];
  };
}

export interface ExtractedImageClaim {
  id: string;
  claim: string;
  claimType: ClaimType;
  importance: ClaimImportance;
  source: ClaimSourceType;
  entities: string[];
  timeContext?: string | null;
  locationContext?: string | null;
  verificationNeeded: boolean;
}

export class ImageSecurityError extends Error {
  readonly code:
    | 'IMAGE_EMPTY'
    | 'IMAGE_TOO_LARGE'
    | 'IMAGE_INVALID_TYPE'
    | 'IMAGE_MALFORMED'
    | 'IMAGE_DECOMPRESSION_BOMB';

  constructor(message: string, code: ImageSecurityError['code']) {
    super(message);
    this.name = 'ImageSecurityError';
    this.code = code;
  }
}
