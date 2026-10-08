export type VerificationType = 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO' | 'MULTIMODAL';

export type PrimaryVerdict = 'LEGIT' | 'INCONCLUSIVE' | 'FAKE';

export type VerificationVerdict =
  | PrimaryVerdict
  | 'VERIFIED_TRUE'
  | 'MOSTLY_TRUE'
  | 'MISLEADING'
  | 'FALSE'
  | 'UNVERIFIED'
  | 'DISPUTED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ClaimType =
  | 'FACTUAL'
  | 'STATISTICAL'
  | 'HISTORICAL'
  | 'SCIENTIFIC'
  | 'POLITICAL'
  | 'ECONOMIC'
  | 'MEDICAL'
  | 'EVENT'
  | 'QUOTE'
  | 'GEOGRAPHICAL'
  | 'PRODUCT'
  | 'GENERAL_FACT'
  | 'OPINION'
  | 'PREDICTION'
  | 'NON_VERIFIABLE';

export type ClaimImportance = 'PRIMARY' | 'SUPPORTING' | 'MINOR';

export type EvidenceStance = 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL' | 'UNKNOWN';

export interface ClaimExtractionResult {
  originalText: string;
  claim: string;
  claimType: ClaimType;
  entities: string[];
  timeContext?: string | null;
  locationContext?: string | null;
  verificationNeeded: boolean;
  reasonNonVerifiable?: string | null;
}

export interface EvidenceItem {
  id: string;
  url: string;
  title: string;
  publisher: string;
  domain: string;
  retrievedAt: string;
  snippet: string;
  sourceType: 'NEWS' | 'ACADEMIC' | 'OFFICIAL' | 'WEB' | 'GROUNDED_SEARCH';
  relevanceScore?: number | null; // 0.0 - 1.0
  stance: EvidenceStance;
  stanceExplanation?: string | null;
  provenance?: {
    searchQuery?: string;
    originalSource?: string | null;
    parentSourceId?: string | null;
    isDerivative?: boolean;
    citationIndex?: number | null;
  } | null;
}

export interface ContradictionAnalysisResult {
  hasContradiction: boolean;
  severity: 'NONE' | 'LOW' | 'MODERATE' | 'SEVERE';
  details: string;
  conflictingAspects: Array<{
    claimSegment: string;
    contradictingEvidenceId?: string;
    contradictingEvidenceTitle?: string;
    explanation: string;
    isContextualDisagreement?: boolean;
  }>;
  contextualFactors?: string[];
}

export interface TrustScoreBreakdown {
  overallScore: number;           // 0 - 100
  supportingStrength: number;     // 0 - 100
  contradictingStrength: number;  // 0 - 100
  sourceCredibility: number;      // 0 - 100
  sourceIndependence: number;     // 0 - 100
  uncertaintyPenalty: number;     // 0 - 100
  formulaExplanation: string;
}

export interface TextVerificationResult {
  verificationId: string;
  input: string;
  claim: string;
  claimType: ClaimType;
  verificationNeeded: boolean;
  verdict: PrimaryVerdict;
  trustScore: number;             // 0 - 100
  confidence: ConfidenceLevel;
  summary: string;
  reasoning: string;
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  neutralEvidence: EvidenceItem[];
  contradictions: ContradictionAnalysisResult;
  scoreBreakdown: TrustScoreBreakdown;
  searchQueries: string[];
  provenance: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
  limitations: string[];
  createdAt: string;
}

export interface VerifyTextInput {
  text: string;
}

export interface VerifyTextResponse {
  success: boolean;
  data: TextVerificationResult;
}

// -------------------------------------------------------------
// STAGE 4 URL VERIFICATION TYPES
// -------------------------------------------------------------

export interface PageMetadata {
  title: string;
  description: string;
  publisher: string;
  domain: string;
  author: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  retrievedAt: string;
  language?: string | null;
}

export interface UrlExtractedClaim {
  id: string;
  claim: string;
  claimType: ClaimType;
  importance: ClaimImportance;
  entities: string[];
  timeContext?: string | null;
  locationContext?: string | null;
  sourceParagraph?: string | null;
  verificationNeeded: boolean;
}

export interface UrlClaimVerificationResult {
  claimId: string;
  claim: string;
  claimType: ClaimType;
  importance: ClaimImportance;
  verdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  sourceParagraph?: string | null;
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  neutralEvidence: EvidenceItem[];
  contradictions: ContradictionAnalysisResult;
  searchQueries: string[];
  provenance: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
}

export interface HeadlineAnalysisResult {
  detected: boolean;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
}

export interface SelfConsistencyAnalysisResult {
  hasInconsistency: boolean;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  details: string;
}

export interface UrlVerificationResult {
  verificationId: string;
  inputUrl: string;
  finalUrl: string;
  canonicalUrl?: string | null;
  page: PageMetadata;
  overallVerdict: PrimaryVerdict;
  trustScore: number;             // 0 - 100
  confidence: ConfidenceLevel;
  summary: string;
  reasoning: string;
  claims: UrlClaimVerificationResult[];
  headlineAnalysis: HeadlineAnalysisResult;
  selfConsistencyAnalysis: SelfConsistencyAnalysisResult;
  limitations: string[];
  createdAt: string;
}

export interface VerifyUrlInput {
  url: string;
}

export interface VerifyUrlResponse {
  success: boolean;
  data: UrlVerificationResult;
}

export interface VerificationHistoryItem {
  id: string;
  userId: string;
  type: VerificationType;
  originalInput: string;
  extractedClaim?: string | null;
  verdict?: VerificationVerdict | null;
  trustScore?: number | null;        // Scale: 0 - 100
  uncertaintyScore?: number | null;  // Scale: 0 - 1
  confidenceScore?: number | null;   // Scale: 0 - 1
  explanation?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationSummary {
  totalVerifications: number;
  averageTrustScore: number;
  recentVerifications: VerificationHistoryItem[];
}

// -------------------------------------------------------------
// STAGE 5 IMAGE VERIFICATION TYPES
// -------------------------------------------------------------

export type ImageClassification =
  | 'PHOTOGRAPH'
  | 'SCREENSHOT'
  | 'SCANNED_DOCUMENT'
  | 'MEME_OR_SOCIAL'
  | 'INFOGRAPHIC_OR_CHART'
  | 'DIGITAL_GRAPHIC'
  | 'UNKNOWN';

export type ClaimSourceType = 'IMAGE_VISUAL' | 'IMAGE_TEXT' | 'USER_CONTEXT';

export interface ImageMetadataAnalysis {
  metadataAvailable: boolean;
  signals: {
    mimeType?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    cameraMake?: string | null;
    cameraModel?: string | null;
    timestamp?: string | null;
    hasLocationData: boolean;
  };
  limitations: string[];
}

export interface ImageManipulationAnalysis {
  detected: boolean;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  indicators: string[];
  limitations: string[];
}

export interface ImageContextAssessment {
  verdict: 'CONSISTENT' | 'MISMATCH' | 'INCONCLUSIVE';
  claimedLocation?: string | null;
  claimedDate?: string | null;
  claimedEvent?: string | null;
  explanation: string;
}

export interface ImageClaimVerificationResult {
  claimId: string;
  claim: string;
  claimType: ClaimType;
  importance: ClaimImportance;
  source: ClaimSourceType;
  entities: string[];
  timeContext?: string | null;
  locationContext?: string | null;
  verdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  neutralEvidence: EvidenceItem[];
  contradictions: ContradictionAnalysisResult;
  searchQueries: string[];
  provenance: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
  searchStatus?: 'SUCCESS' | 'NO_RESULTS' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'ERROR';
  searchExplanation?: string;
}

export interface ImageVerificationResult {
  verificationId: string;
  inputType: 'IMAGE';
  image: {
    fileType: string;
    width: number;
    height: number;
    sizeBytes: number;
    imageClassification: ImageClassification;
    previewUrl?: string;
  };
  userContext?: string | null;
  extractedText: string[];
  visualAnalysis: {
    description: string;
    entities: string[];
    scene: string;
    possibleEvent?: string | null;
    possibleLocation?: string | null;
    possibleDate?: string | null;
    observations: string[];
    inferredAspects: string[];
    uncertainties: string[];
  };
  metadataAnalysis: ImageMetadataAnalysis;
  manipulationAnalysis: ImageManipulationAnalysis;
  claims: ImageClaimVerificationResult[];
  contextAssessment: ImageContextAssessment;
  overallVerdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  summary: string;
  reasoning: string;
  limitations: string[];
  createdAt: string;
  searchStatus?: 'SUCCESS' | 'NO_RESULTS' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'PARTIAL';
  searchExplanation?: string;
}

export interface VerifyImageResponse {
  success: boolean;
  data?: ImageVerificationResult;
  message?: string;
  errorCode?: string;
}

// -------------------------------------------------------------
// STAGE 6 VIDEO / REEL VERIFICATION TYPES
// -------------------------------------------------------------

export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'unknown';

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  fps?: number;
  format: VideoFormat;
  sizeBytes: number;
  hasAudio: boolean;
  audioCodec?: string;
  videoCodec?: string;
}

export interface VideoKeyframe {
  frameIndex: number;
  timestampSeconds: number;
  extractedImage: string; // Base64 JPEG data URL or thumbnail
  hash: string;
  selectionReason: string;
  visualDescription?: string;
  observed: string[];
  inferred: string[];
  ocrText?: string[];
}

export interface VideoTranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface VideoTranscriptAnalysis {
  transcriptAvailable: boolean;
  fullTranscript: string;
  segments: VideoTranscriptSegment[];
  status: string;
  language?: string;
}

export type VideoTemporalVerdict = 'TEMPORAL_CONSISTENT' | 'TEMPORAL_INCONSISTENT' | 'TEMPORAL_INCONCLUSIVE';

export interface VideoTemporalInconsistency {
  type: 'TIMESTAMP_ORDER' | 'LOCATION_CONFLICT' | 'DATE_CONFLICT' | 'EVENT_CONFLICT' | 'NARRATION_MISMATCH';
  description: string;
  timestamps?: number[];
}

export interface VideoTemporalAnalysis {
  verdict: VideoTemporalVerdict;
  details: string;
  inconsistencies: VideoTemporalInconsistency[];
}

export interface VideoContextAssessment {
  verdict: 'CONSISTENT' | 'MISMATCH' | 'INCONCLUSIVE';
  claimedDate?: string | null;
  claimedLocation?: string | null;
  claimedEvent?: string | null;
  explanation: string;
}

export interface VideoManipulationSignal {
  type: 'EDITING_CUTS' | 'AUDIO_DESYNC' | 'SPEED_ALTERATION' | 'VISUAL_ARTIFACT' | 'GENERATIVE_SIGNS';
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  timestampSeconds?: number;
}

export type VideoClaimSource =
  | 'VIDEO_AUDIO'
  | 'VIDEO_VISUAL'
  | 'VIDEO_TEXT'
  | 'USER_CONTEXT'
  | 'MULTIMODAL_SYNTHESIS';

export interface VideoClaimVerificationResult {
  claimId: string;
  claim: string;
  source: VideoClaimSource;
  claimType: ClaimType;
  importance: ClaimImportance;
  entities: string[];
  event?: string | null;
  dateContext?: string | null;
  locationContext?: string | null;
  timestamps: number[];
  verdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  neutralEvidence: EvidenceItem[];
  contradictions: ContradictionAnalysisResult;
  searchQueries: string[];
  provenance: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
}

export interface VideoVerificationResult {
  verificationId: string;
  inputType: 'VIDEO';
  videoMetadata: VideoMetadata;
  userContext?: string | null;
  transcript: VideoTranscriptAnalysis;
  keyframes: VideoKeyframe[];
  claims: VideoClaimVerificationResult[];
  overallVerdict: PrimaryVerdict;
  verdict: PrimaryVerdict; // Convenience alias
  trustScore: number;      // 0 - 100
  confidence: ConfidenceLevel;
  summary: string;
  reasoning: string;
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  neutralEvidence: EvidenceItem[];
  contradictions: ContradictionAnalysisResult[];
  temporalAnalysis: VideoTemporalAnalysis;
  contextAnalysis: VideoContextAssessment;
  manipulationSignals: VideoManipulationSignal[];
  provenance: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
  limitations: string[];
  createdAt: string;
}

export interface VerifyVideoResponse {
  success: boolean;
  data?: VideoVerificationResult;
  message?: string;
  errorCode?: string;
}

export interface DemoReelItem {
  id: string;
  title: string;
  description: string;
  claimedContext: string;
  duration: number;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  sourceFilename?: string;
}

// -------------------------------------------------------------
// STAGE 7 UNIFIED & MULTIMODAL TYPES
// -------------------------------------------------------------

export type CrossModalConsistencyVerdict = 'CONSISTENT' | 'INCONSISTENT' | 'INCONCLUSIVE';

export interface CrossModalConflict {
  type: 'LOCATION_MISMATCH' | 'DATE_MISMATCH' | 'EVENT_MISMATCH' | 'NARRATIVE_CONTRADICTION';
  description: string;
  modalitiesInvolved: ('TEXT' | 'URL' | 'IMAGE' | 'VIDEO')[];
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
}

export interface CrossModalConsistencyAnalysis {
  verdict: CrossModalConsistencyVerdict;
  details: string;
  conflicts: CrossModalConflict[];
}

export type UnifiedClaimSource =
  | 'TEXT'
  | 'URL'
  | 'USER_TEXT'
  | 'URL_TEXT'
  | 'IMAGE_VISUAL'
  | 'IMAGE_TEXT'
  | 'VIDEO_AUDIO'
  | 'VIDEO_VISUAL'
  | 'VIDEO_TEXT'
  | 'USER_CONTEXT'
  | 'MULTIMODAL_SYNTHESIS';

export interface UnifiedClaim {
  claimId: string;
  claim: string;
  sources: UnifiedClaimSource[];
  claimType: ClaimType;
  importance: ClaimImportance;
  entities: string[];
  verdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  observedAspects?: string[];
  inferredAspects?: string[];
  timestamps?: number[];
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  neutralEvidence: EvidenceItem[];
  contradictions: ContradictionAnalysisResult;
  provenance: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
}

export interface MultimodalInputsProvided {
  text?: string | null;
  url?: string | null;
  hasImage: boolean;
  hasVideo: boolean;
  demoId?: string | null;
  imageFilename?: string | null;
  videoFilename?: string | null;
}

export interface MultimodalVerificationResult {
  verificationId: string;
  inputType: 'MULTIMODAL';
  inputsProvided: MultimodalInputsProvided;
  overallVerdict: PrimaryVerdict;
  verdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  summary: string;
  reasoning: string;
  claims: UnifiedClaim[];
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  neutralEvidence: EvidenceItem[];
  contradictions: ContradictionAnalysisResult[];
  crossModalConsistency: CrossModalConsistencyAnalysis;
  provenance: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
  limitations: string[];
  createdAt: string;
  modalityResults?: {
    text?: TextVerificationResult;
    url?: UrlVerificationResult;
    image?: ImageVerificationResult;
    video?: VideoVerificationResult;
  };
}

export type UnifiedVerificationResult =
  | TextVerificationResult
  | UrlVerificationResult
  | ImageVerificationResult
  | VideoVerificationResult
  | MultimodalVerificationResult;

export interface VerifyMultimodalResponse {
  success: boolean;
  data?: MultimodalVerificationResult;
  message?: string;
  errorCode?: string;
}


