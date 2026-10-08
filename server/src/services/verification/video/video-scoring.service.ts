import {
  PrimaryVerdict,
  ConfidenceLevel,
  VideoClaimVerificationResult,
  VideoTemporalAnalysis,
  VideoContextAssessment,
  VideoManipulationSignal,
} from '@trustlens/shared';

export interface VideoScoringOutcome {
  verdict: PrimaryVerdict;
  trustScore: number;
  confidence: ConfidenceLevel;
  summary: string;
  reasoning: string;
  scoreBreakdown: {
    baseScore: number;
    finalScore: number;
    contextDeduction: number;
    temporalDeduction: number;
    manipulationDeduction: number;
    contradictionDeduction: number;
    vetoTriggered: boolean;
    vetoReason?: string;
  };
}

export class VideoScoringService {
  /**
   * Deterministically calculates overall trust score and verdict for video verification
   */
  evaluateVideo(
    claims: VideoClaimVerificationResult[],
    temporal: VideoTemporalAnalysis,
    context: VideoContextAssessment,
    manipulationSignals: VideoManipulationSignal[],
    hasUserContext: boolean
  ): VideoScoringOutcome {
    if (claims.length === 0) {
      return {
        verdict: 'INCONCLUSIVE',
        trustScore: 50,
        confidence: 'LOW',
        summary: 'No verifiable factual claims could be extracted from this video.',
        reasoning: 'The video lacked clear spoken dialogue, legible OCR text, or distinct visual claims.',
        scoreBreakdown: {
          baseScore: 50,
          finalScore: 50,
          contextDeduction: 0,
          temporalDeduction: 0,
          manipulationDeduction: 0,
          contradictionDeduction: 0,
          vetoTriggered: false,
        },
      };
    }

    // 1. Calculate Weighted Base Claim Score
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

    // 2. Context Mismatch Deduction
    let contextDeduction = 0;
    if (context.verdict === 'MISMATCH') {
      contextDeduction = 25;
      currentScore -= 25;
    } else if (context.verdict === 'INCONCLUSIVE' && hasUserContext) {
      contextDeduction = 10;
      currentScore -= 10;
    }

    // 3. Temporal Inconsistency Deduction
    let temporalDeduction = 0;
    if (temporal.verdict === 'TEMPORAL_INCONSISTENT') {
      temporalDeduction = 15;
      currentScore -= 15;
    }

    // 4. Manipulation Signal Deduction
    let manipulationDeduction = 0;
    const hasHighManipulation = manipulationSignals.some((s) => s.severity === 'HIGH');
    const hasMediumManipulation = manipulationSignals.some((s) => s.severity === 'MEDIUM');

    if (hasHighManipulation) {
      manipulationDeduction = 15;
      currentScore -= 15;
    } else if (hasMediumManipulation) {
      manipulationDeduction = 8;
      currentScore -= 8;
    }

    // 5. Unresolved Severe Contradiction Deduction
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

    // 6. PRIMARY CLAIM VETO RULE
    const contradictedPrimary = claims.some(
      (c) => c.importance === 'PRIMARY' && c.verdict === 'FAKE'
    );
    const contextMismatch = context.verdict === 'MISMATCH';

    let vetoTriggered = false;
    let vetoReason: string | undefined;

    if (contradictedPrimary) {
      vetoTriggered = true;
      vetoReason = 'Primary factual claim contradicted by authoritative web evidence.';
    } else if (contextMismatch) {
      vetoTriggered = true;
      vetoReason = 'Video footage is authentic but weaponized with recycled/mismatched context.';
    }

    // 7. Final Verdict Determination
    let verdict: PrimaryVerdict = 'INCONCLUSIVE';

    if (vetoTriggered) {
      // Veto strictly prevents LEGIT
      verdict = 'FAKE';
    } else if (finalScore >= 65 && !contradictedPrimary && !contextMismatch) {
      verdict = 'LEGIT';
    } else if (finalScore <= 35) {
      verdict = 'FAKE';
    } else {
      verdict = 'INCONCLUSIVE';
    }

    // 8. Confidence Assessment
    let confidence: ConfidenceLevel = 'MEDIUM';
    const totalEvidence = claims.reduce(
      (sum, c) => sum + c.supportingEvidence.length + c.contradictingEvidence.length,
      0
    );

    if (totalEvidence >= 5 && (verdict === 'LEGIT' || verdict === 'FAKE')) {
      confidence = 'HIGH';
    } else if (totalEvidence <= 1 || verdict === 'INCONCLUSIVE') {
      confidence = 'LOW';
    }

    // 9. Structured Summary & Reasoning
    let summary = '';
    if (verdict === 'LEGIT') {
      summary = `Video content verified as LEGIT with a trust score of ${finalScore}/100. Spoken and visual claims are strongly corroborated by independent sources.`;
    } else if (verdict === 'FAKE') {
      if (contextMismatch) {
        summary = `Video evaluated as FAKE (Misleading Context). While visual footage may be genuine, external evidence confirms it is attributed to a false event, date, or location.`;
      } else {
        summary = `Video evaluated as FAKE with a trust score of ${finalScore}/100. Key empirical assertions are contradicted by independent authoritative sources.`;
      }
    } else {
      summary = `Video verification is INCONCLUSIVE (Trust Score: ${finalScore}/100). Available external evidence is insufficient or mixed.`;
    }

    const reasoning = [
      `Base claim score: ${baseScore}/100.`,
      contextDeduction > 0 ? `Context penalty: -${contextDeduction} points.` : null,
      temporalDeduction > 0 ? `Temporal inconsistency penalty: -${temporalDeduction} points.` : null,
      manipulationDeduction > 0 ? `Visual anomaly signal penalty: -${manipulationDeduction} points.` : null,
      contradictionDeduction > 0 ? `Contradiction penalty: -${contradictionDeduction} points.` : null,
      vetoTriggered ? `Primary Claim Veto: ${vetoReason}` : null,
      `Final calibrated score: ${finalScore}/100.`,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      verdict,
      trustScore: finalScore,
      confidence,
      summary,
      reasoning,
      scoreBreakdown: {
        baseScore,
        finalScore,
        contextDeduction,
        temporalDeduction,
        manipulationDeduction,
        contradictionDeduction,
        vetoTriggered,
        vetoReason,
      },
    };
  }
}

export const videoScoringService = new VideoScoringService();
