export type VerificationType = 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO';

export type VerificationVerdict =
  | 'VERIFIED_TRUE'
  | 'MOSTLY_TRUE'
  | 'MISLEADING'
  | 'FALSE'
  | 'UNVERIFIED'
  | 'DISPUTED';

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
