import {
  ImageClaimVerificationResult,
  ImageContextAssessment,
  ImageManipulationAnalysis,
  ImageMetadataAnalysis,
  PrimaryVerdict,
  ConfidenceLevel,
} from '@trustlens/shared';

export interface ImageScoreEvaluation {
  trustScore: number;
  overallVerdict: PrimaryVerdict;
  confidence: ConfidenceLevel;
  formulaExplanation: string;
  limitations: string[];
}

export class ImageScoringService {
  /**
   * Deterministically evaluate image trust score and verdict
   * based on claim importance weights, contextual alignment, visual manipulation risk,
   * and evidence uncertainty.
   */
  evaluateImageTrust(
    claims: ImageClaimVerificationResult[],
    contextAssessment: ImageContextAssessment,
    manipulation: ImageManipulationAnalysis,
    metadata: ImageMetadataAnalysis
  ): ImageScoreEvaluation {
    const limitations: string[] = [];

    // Always record standard visual limitations
    limitations.push(
      'Direct reverse-image matching was not available; TrustLens verified the image claims and context using independent web evidence.'
    );

    // 1. Handle zero claims baseline
    if (claims.length === 0) {
      return {
        trustScore: 50,
        overallVerdict: 'INCONCLUSIVE',
        confidence: 'LOW',
        formulaExplanation: 'Baseline neutral: No falsifiable empirical claims could be derived from the image.',
        limitations: [
          ...limitations,
          'Image contained no verifiable text, identifiable event, or empirical claims.',
        ],
      };
    }

    // 2. Compute Weighted Base Claim Score
    // PRIMARY: 1.0, SUPPORTING: 0.5, MINOR: 0.25
    let weightedSum = 0;
    let totalWeight = 0;
    let primaryCount = 0;
    let primaryFakeCount = 0;
    let primaryLegitCount = 0;

    for (const c of claims) {
      let weight = 0.5;
      if (c.importance === 'PRIMARY') {
        weight = 1.0;
        primaryCount++;
        if (c.verdict === 'FAKE') primaryFakeCount++;
        if (c.verdict === 'LEGIT') primaryLegitCount++;
      } else if (c.importance === 'MINOR') {
        weight = 0.25;
      }

      weightedSum += c.trustScore * weight;
      totalWeight += weight;
    }

    const baseClaimScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

    // 3. Context Mismatch Penalty
    let contextPenalty = 0;
    if (contextAssessment.verdict === 'MISMATCH') {
      contextPenalty = 25;
      limitations.push('Image context mismatch: Independent evidence contradicts the claimed location, date, or event.');
    }

    // 4. Manipulation Risk Penalty
    let manipulationPenalty = 0;
    if (manipulation.detected) {
      if (manipulation.severity === 'HIGH') {
        manipulationPenalty = 15;
        limitations.push('High visual manipulation risk: Pronounced visual inconsistencies, compositing, or artifacts detected.');
      } else if (manipulation.severity === 'MEDIUM') {
        manipulationPenalty = 7;
        limitations.push('Moderate visual manipulation indicators observed.');
      }
    }

    // 5. Final Trust Score Calculation (0 - 100)
    const rawScore = baseClaimScore - contextPenalty - manipulationPenalty;
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // 6. PRIMARY CLAIM & CONTEXT VETO RULE:
    // A contradicted primary claim OR a contextual mismatch prevents a LEGIT verdict!
    let overallVerdict: PrimaryVerdict = 'INCONCLUSIVE';

    if (primaryFakeCount > 0 || contextAssessment.verdict === 'MISMATCH') {
      if (finalScore <= 45 || primaryFakeCount >= primaryCount || contextAssessment.verdict === 'MISMATCH') {
        overallVerdict = 'FAKE';
      } else {
        overallVerdict = 'INCONCLUSIVE';
      }
      limitations.push('Primary factual assertion or context was contradicted by authoritative evidence.');
    } else if (finalScore >= 65 && primaryLegitCount > 0 && manipulationPenalty === 0) {
      overallVerdict = 'LEGIT';
    } else if (finalScore <= 35) {
      overallVerdict = 'FAKE';
    } else {
      overallVerdict = 'INCONCLUSIVE';
      limitations.push('Independent evidence is mixed or insufficient to confirm image claims conclusively.');
    }

    // 7. Confidence Calculation
    const totalEvidenceCount = claims.reduce(
      (acc, c) => acc + c.supportingEvidence.length + c.contradictingEvidence.length,
      0
    );

    let confidence: ConfidenceLevel = 'LOW';
    if (totalEvidenceCount >= 5 && claims.length >= 2 && manipulationPenalty === 0) {
      confidence = 'HIGH';
    } else if (totalEvidenceCount >= 2) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    const formulaExplanation = `Weighted Claim Score (${Math.round(
      baseClaimScore
    )}) - Context Penalty (${contextPenalty}) - Manipulation Penalty (${manipulationPenalty}) = ${finalScore}`;

    return {
      trustScore: finalScore,
      overallVerdict,
      confidence,
      formulaExplanation,
      limitations,
    };
  }
}

export const imageScoringService = new ImageScoringService();
