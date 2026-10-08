export type VerificationType = 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO';

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
