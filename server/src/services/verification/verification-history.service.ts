import { TextVerificationResult, UrlVerificationResult, VerificationHistoryItem } from '@trustlens/shared';
import { prisma, isDbConnected } from '../../config/db';
import crypto from 'crypto';

interface StoredVerificationRecord {
  id: string;
  userId: string;
  type: 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO';
  originalInput: string;
  extractedClaim: string;
  verdict: any;
  trustScore: number;
  uncertaintyScore: number;
  confidenceScore: number;
  explanation: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory fallback map: verificationId -> StoredVerificationRecord
const memoryVerifications = new Map<string, StoredVerificationRecord>();

class VerificationHistoryService {
  /**
   * Save a completed verification (TEXT or URL) to the database associated with the user
   */
  async saveVerification(
    userId: string,
    result: TextVerificationResult | UrlVerificationResult,
    type: 'TEXT' | 'URL' = 'TEXT'
  ): Promise<string> {
    const isUrl = type === 'URL' || 'inputUrl' in result;
    const confidenceToScore = result.confidence === 'HIGH' ? 0.9 : result.confidence === 'MEDIUM' ? 0.6 : 0.3;
    const originalInput = isUrl ? (result as UrlVerificationResult).inputUrl : (result as TextVerificationResult).input;
    const extractedClaim = isUrl
      ? (result as UrlVerificationResult).page.title
      : (result as TextVerificationResult).claim;
    const verdict = isUrl
      ? (result as UrlVerificationResult).overallVerdict
      : (result as TextVerificationResult).verdict;
    const uncertaintyScore = isUrl
      ? 0.2
      : Math.max(0, Math.min(1, ((result as TextVerificationResult).scoreBreakdown?.uncertaintyPenalty || 0) / 100));

    if (isDbConnected()) {
      try {
        const record = await prisma.verificationHistory.create({
          data: {
            id: result.verificationId,
            userId,
            type: isUrl ? 'URL' : 'TEXT',
            originalInput,
            extractedClaim,
            verdict: verdict as any,
            trustScore: result.trustScore,
            uncertaintyScore,
            confidenceScore: confidenceToScore,
            explanation: result.summary,
            metadata: result as any,
          },
        });
        return record.id;
      } catch (err) {
        console.warn('[VerificationHistoryService] Prisma create failed, falling back to memory store:', err);
      }
    }

    const record: StoredVerificationRecord = {
      id: result.verificationId,
      userId,
      type: isUrl ? 'URL' : 'TEXT',
      originalInput,
      extractedClaim,
      verdict,
      trustScore: result.trustScore,
      uncertaintyScore,
      confidenceScore: confidenceToScore,
      explanation: result.summary,
      metadata: result,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryVerifications.set(result.verificationId, record);
    return record.id;
  }

  /**
   * Retrieve a specific verification ensuring strict user authorization
   */
  async getVerificationById(id: string, userId: string): Promise<TextVerificationResult | UrlVerificationResult | null> {
    if (isDbConnected()) {
      try {
        const record = await prisma.verificationHistory.findUnique({
          where: { id },
        });

        // Strict ownership check: NEVER return another user's record
        if (!record || record.userId !== userId) {
          return null;
        }

        if (record.metadata && typeof record.metadata === 'object') {
          return record.metadata as unknown as TextVerificationResult | UrlVerificationResult;
        }

        return this.mapRecordToResult(record);
      } catch (err) {
        console.warn('[VerificationHistoryService] Prisma findUnique failed, falling back to memory store:', err);
      }
    }

    const mem = memoryVerifications.get(id);
    if (!mem || mem.userId !== userId) {
      return null;
    }

    return (mem.metadata as TextVerificationResult | UrlVerificationResult) || this.mapRecordToResult(mem);
  }

  /**
   * Retrieve all verifications belonging to the user
   */
  async listUserVerifications(userId: string): Promise<VerificationHistoryItem[]> {
    if (isDbConnected()) {
      try {
        const records = await prisma.verificationHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        return records.map((r) => ({
          id: r.id,
          userId: r.userId,
          type: r.type,
          originalInput: r.originalInput,
          extractedClaim: r.extractedClaim,
          verdict: r.verdict as any,
          trustScore: r.trustScore,
          uncertaintyScore: r.uncertaintyScore,
          confidenceScore: r.confidenceScore,
          explanation: r.explanation,
          metadata: (r.metadata as Record<string, unknown>) || null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch (err) {
        console.warn('[VerificationHistoryService] Prisma findMany failed, falling back to memory store:', err);
      }
    }

    const userRecords: VerificationHistoryItem[] = [];
    for (const mem of memoryVerifications.values()) {
      if (mem.userId === userId) {
        userRecords.push({
          id: mem.id,
          userId: mem.userId,
          type: mem.type,
          originalInput: mem.originalInput,
          extractedClaim: mem.extractedClaim,
          verdict: mem.verdict,
          trustScore: mem.trustScore,
          uncertaintyScore: mem.uncertaintyScore,
          confidenceScore: mem.confidenceScore,
          explanation: mem.explanation,
          metadata: mem.metadata,
          createdAt: mem.createdAt.toISOString(),
          updatedAt: mem.updatedAt.toISOString(),
        });
      }
    }

    return userRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private mapRecordToResult(record: any): TextVerificationResult {
    return {
      verificationId: record.id,
      input: record.originalInput,
      claim: record.extractedClaim || record.originalInput,
      claimType: 'FACTUAL',
      verificationNeeded: true,
      verdict: record.verdict || 'INCONCLUSIVE',
      trustScore: record.trustScore || 50,
      confidence: record.confidenceScore >= 0.8 ? 'HIGH' : record.confidenceScore >= 0.5 ? 'MEDIUM' : 'LOW',
      summary: record.explanation || '',
      reasoning: record.explanation || '',
      supportingEvidence: [],
      contradictingEvidence: [],
      neutralEvidence: [],
      contradictions: {
        hasContradiction: false,
        severity: 'NONE',
        details: 'Loaded from historical audit archive.',
        conflictingAspects: [],
      },
      scoreBreakdown: {
        overallScore: record.trustScore || 50,
        supportingStrength: 50,
        contradictingStrength: 0,
        sourceCredibility: 70,
        sourceIndependence: 80,
        uncertaintyPenalty: 20,
        formulaExplanation: 'Historic record restored.',
      },
      searchQueries: [],
      provenance: [],
      limitations: [],
      createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
    };
  }
}

export const verificationHistoryService = new VerificationHistoryService();
