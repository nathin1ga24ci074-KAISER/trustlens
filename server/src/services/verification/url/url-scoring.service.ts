import {
  UrlClaimVerificationResult,
  HeadlineAnalysisResult,
  SelfConsistencyAnalysisResult,
  PrimaryVerdict,
  ConfidenceLevel,
} from '@trustlens/shared';

export interface UrlScoreEvaluation {
  trustScore: number;
  overallVerdict: PrimaryVerdict;
  confidence: ConfidenceLevel;
  formulaExplanation: string;
  limitations: string[];
}

export class UrlScoringService {
  /**
   * Deterministically evaluate overall webpage trust score and verdict
   * based on claim importance weights, contradiction impact, headline distortion,
   * and internal self-consistency.
   */
  evaluateUrlTrust(
    claims: UrlClaimVerificationResult[],
    headlineAnalysis: HeadlineAnalysisResult,
    selfConsistency: SelfConsistencyAnalysisResult,
    isEmptyContent: boolean
  ): UrlScoreEvaluation {
    const limitations: string[] = [];

    // 1. Handle Empty or Non-Verifiable Content
    if (isEmptyContent || claims.length === 0) {
      return {
        trustScore: 50,
        overallVerdict: 'INCONCLUSIVE',
        confidence: 'LOW',
        formulaExplanation: 'Neutral baseline: insufficient verifiable empirical claims extracted from the page.',
        limitations: ['Page contained insufficient readable article text or empirical factual statements.'],
      };
    }

    // 2. Calculate Weighted Claim Score
    // PRIMARY: 1.0, SUPPORTING: 0.5, MINOR: 0.25
    let weightedScoreSum = 0;
    let totalWeight = 0;
    let primaryClaimCount = 0;
    let primaryFakeCount = 0;
    let primaryLegitCount = 0;

    for (const claim of claims) {
      let weight = 0.5;
      if (claim.importance === 'PRIMARY') {
        weight = 1.0;
        primaryClaimCount++;
        if (claim.verdict === 'FAKE') primaryFakeCount++;
        if (claim.verdict === 'LEGIT') primaryLegitCount++;
      } else if (claim.importance === 'MINOR') {
        weight = 0.25;
      }

      weightedScoreSum += claim.trustScore * weight;
      totalWeight += weight;
    }

    const baseClaimScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 50;

    // 3. Headline Misalignment Penalty
    let headlinePenalty = 0;
    if (headlineAnalysis.severity === 'HIGH') {
      headlinePenalty = 15;
      limitations.push('Headline severely contradicts or misrepresents the article body findings.');
    } else if (headlineAnalysis.severity === 'MEDIUM') {
      headlinePenalty = 7;
      limitations.push('Headline exhibits sensationalized or exaggerated framing.');
    }

    // 4. Internal Inconsistency Penalty
    let consistencyPenalty = 0;
    if (selfConsistency.severity === 'HIGH') {
      consistencyPenalty = 15;
      limitations.push('Article contains severe internal contradictions between its own paragraphs.');
    } else if (selfConsistency.severity === 'MEDIUM') {
      consistencyPenalty = 7;
      limitations.push('Article contains minor internal narrative or chronological inconsistencies.');
    }

    // 5. Compute Final Raw Trust Score (0 - 100)
    let rawScore = baseClaimScore - headlinePenalty - consistencyPenalty;
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // 6. Controlled Verdict Rules
    let overallVerdict: PrimaryVerdict = 'INCONCLUSIVE';

    // Critical Rule: If a PRIMARY claim is FAKE (directly contradicted), whole URL cannot be LEGIT!
    if (primaryFakeCount > 0) {
      if (finalScore <= 45 || primaryFakeCount >= primaryClaimCount) {
        overallVerdict = 'FAKE';
      } else {
        overallVerdict = 'INCONCLUSIVE';
        limitations.push('Core primary claim was contradicted by independent evidence.');
      }
    } else if (finalScore >= 65 && primaryLegitCount > 0) {
      overallVerdict = 'LEGIT';
    } else if (finalScore <= 35) {
      overallVerdict = 'FAKE';
    } else {
      overallVerdict = 'INCONCLUSIVE';
      limitations.push('Independent evidence is mixed or insufficient to confirm the article conclusively.');
    }

    // 7. Confidence Calculation
    let confidence: ConfidenceLevel = 'LOW';
    const totalEvidenceCount = claims.reduce(
      (acc, c) => acc + c.supportingEvidence.length + c.contradictingEvidence.length,
      0
    );

    if (totalEvidenceCount >= 5 && claims.length >= 2 && headlinePenalty === 0) {
      confidence = 'HIGH';
    } else if (totalEvidenceCount >= 2) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    const formulaExplanation = `Weighted Claim Score (${Math.round(
      baseClaimScore
    )}) - Headline Penalty (${headlinePenalty}) - Consistency Penalty (${consistencyPenalty}) = ${finalScore}`;

    return {
      trustScore: finalScore,
      overallVerdict,
      confidence,
      formulaExplanation,
      limitations,
    };
  }
}

export const urlScoringService = new UrlScoringService();
