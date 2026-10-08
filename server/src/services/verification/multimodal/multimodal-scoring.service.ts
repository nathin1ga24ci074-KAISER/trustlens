import {
  PrimaryVerdict,
  ConfidenceLevel,
  UnifiedClaim,
  CrossModalConsistencyAnalysis,
} from '@trustlens/shared';

export interface MultimodalScoringOutcome {
  verdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  summary: string;
  reasoning: string;
  scoreBreakdown: {
    baseScore: number;
    finalScore: number;
    crossModalDeduction: number;
    contradictionDeduction: number;
    vetoTriggered: boolean;
    vetoReason?: string;
  };
}

export class MultimodalScoringService {
  /**
   * Deterministically calculates the unified trust score for multimodal verifications.
   * 
   * AVOIDS DOUBLE COUNTING:
   * Repeating an assertion across multiple modalities does NOT inflate the score.
   * Claims are weighted by epistemic importance (PRIMARY: 1.0, SUPPORTING: 0.5, MINOR: 0.25).
   * 
   * PRIMARY CLAIM VETO RULE:
   * If any PRIMARY claim is ruled FAKE or if severe cross-modal conflicts exist,
   * the overall verdict CANNOT be LEGIT.
   */
  evaluate(
    claims: UnifiedClaim[],
    consistency: CrossModalConsistencyAnalysis
  ): MultimodalScoringOutcome {
    if (claims.length === 0) {
      return {
        verdict: 'INCONCLUSIVE',
        trustScore: 50,
        confidence: 'LOW',
        summary: 'No verifiable factual claims were extracted from the submitted multimodal inputs.',
        reasoning: 'Evaluation was inconclusive because neither the text, URL, image, nor video contained verifiable factual assertions.',
        scoreBreakdown: {
          baseScore: 50,
          finalScore: 50,
          crossModalDeduction: 0,
          contradictionDeduction: 0,
          vetoTriggered: false,
        },
      };
    }

    // 1. Calculate Weighted Base Score
    const weights: Record<string, number> = {
      PRIMARY: 1.0,
      SUPPORTING: 0.5,
      MINOR: 0.25,
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const c of claims) {
      const weight = weights[c.importance] || 0.5;
      totalWeightedScore += c.trustScore * weight;
      totalWeight += weight;
    }

    const baseScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;
    let currentScore = baseScore;

    // 2. Cross-Modal Conflict Deduction
    let crossModalDeduction = 0;
    if (consistency.verdict === 'INCONSISTENT') {
      crossModalDeduction = 15;
      currentScore -= 15;
    } else if (consistency.verdict === 'INCONCLUSIVE' && consistency.conflicts.length > 0) {
      crossModalDeduction = 7;
      currentScore -= 7;
    }

    // 3. Severe Contradiction Deduction
    let contradictionDeduction = 0;
    const hasSevereContradiction = claims.some(
      (c) => c.contradictions?.hasContradiction && c.contradictions.severity === 'SEVERE'
    );
    if (hasSevereContradiction) {
      contradictionDeduction = 15;
      currentScore -= 15;
    }

    // Clamp score 0 - 100
    const finalScore = Math.max(0, Math.min(100, Math.round(currentScore)));

    // 4. PRIMARY CLAIM VETO RULE
    const contradictedPrimary = claims.some(
      (c) => c.importance === 'PRIMARY' && c.verdict === 'FAKE'
    );
    const severeCrossModalConflict =
      consistency.verdict === 'INCONSISTENT' &&
      consistency.conflicts.some((c) => c.severity === 'SEVERE');

    let vetoTriggered = false;
    let vetoReason: string | undefined;

    if (contradictedPrimary) {
      vetoTriggered = true;
      vetoReason = 'Primary factual claim contradicted by authoritative web evidence.';
    } else if (severeCrossModalConflict) {
      vetoTriggered = true;
      vetoReason = 'Severe internal contradiction detected between submitted modalities.';
    }

    // 5. Final Verdict Determination
    let verdict: PrimaryVerdict = 'INCONCLUSIVE';

    if (vetoTriggered) {
      // Forbidden from being LEGIT
      verdict = finalScore <= 35 ? 'FAKE' : 'INCONCLUSIVE';
    } else if (finalScore >= 65) {
      const allPrimaryLegitOrInconclusive = !claims.some(
        (c) => c.importance === 'PRIMARY' && c.verdict === 'FAKE'
      );
      if (allPrimaryLegitOrInconclusive) {
        verdict = 'LEGIT';
      }
    } else if (finalScore <= 35) {
      verdict = 'FAKE';
    } else {
      verdict = 'INCONCLUSIVE';
    }

    // 6. Confidence Assessment
    const totalEvidenceCount = claims.reduce(
      (sum, c) => sum + c.supportingEvidence.length + c.contradictingEvidence.length,
      0
    );

    let confidence: ConfidenceLevel = 'LOW';
    if (totalEvidenceCount >= 4 && !vetoTriggered) {
      confidence = 'HIGH';
    } else if (totalEvidenceCount >= 2) {
      confidence = 'MEDIUM';
    }

    // 7. Explanatory Summary and Reasoning
    const summary =
      verdict === 'LEGIT'
        ? 'Multimodal assertions are substantiated by independent external evidence.'
        : verdict === 'FAKE'
        ? vetoReason
          ? `Verdict: FAKE. ${vetoReason}`
          : 'Multimodal assertions are contradicted by independent web evidence.'
        : 'Available external evidence is inconclusive to decisively substantiate or refute the multimodal claims.';

    const reasoning = `TrustLens aggregated ${claims.length} claims across modalities (Base Score: ${baseScore}/100, Final Score: ${finalScore}/100). ${
      crossModalDeduction > 0 ? `Cross-modal conflict penalty of -${crossModalDeduction} applied. ` : ''
    }${contradictionDeduction > 0 ? `Severe contradiction deduction of -${contradictionDeduction} applied. ` : ''}${
      vetoTriggered ? `Primary claim veto triggered: ${vetoReason}. ` : ''
    }Cross-modal consistency: ${consistency.verdict}.`;

    return {
      verdict,
      trustScore: finalScore,
      confidence,
      summary,
      reasoning,
      scoreBreakdown: {
        baseScore,
        finalScore,
        crossModalDeduction,
        contradictionDeduction,
        vetoTriggered,
        vetoReason,
      },
    };
  }
}

export const multimodalScoringService = new MultimodalScoringService();
