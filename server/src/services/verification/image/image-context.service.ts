import { ImageContextAssessment, EvidenceItem, ContradictionAnalysisResult } from '@trustlens/shared';
import { RawVisualUnderstanding, ExtractedImageClaim } from './image.types';

export class ImageContextService {
  /**
   * Evaluate whether the claimed context (location, date, event) matches
   * independent external evidence, distinguishing real images used in false contexts.
   */
  evaluateContext(
    visual: RawVisualUnderstanding,
    claims: ExtractedImageClaim[],
    evidence: EvidenceItem[],
    contradictions: ContradictionAnalysisResult[],
    userContext?: string
  ): ImageContextAssessment {
    const claimedLocation =
      claims.find((c) => c.locationContext)?.locationContext ||
      visual.possibleLocation ||
      null;

    const claimedDate =
      claims.find((c) => c.timeContext)?.timeContext ||
      visual.possibleDate ||
      null;

    const claimedEvent =
      claims.find((c) => c.source === 'USER_CONTEXT')?.claim ||
      visual.possibleEvent ||
      null;

    // Check if any contradiction analysis flagged severe/moderate contextual conflicts
    const hasSevereContradiction = contradictions.some(
      (c) => c.hasContradiction && (c.severity === 'SEVERE' || c.severity === 'MODERATE')
    );

    const hasContradictingEvidence = evidence.some((e) => e.stance === 'CONTRADICTS');
    const hasSupportingEvidence = evidence.some((e) => e.stance === 'SUPPORTS');

    // Contextual Disagreement Detection:
    // 1. If evidence explicitly contradicts the claims:
    if (hasSevereContradiction || hasContradictingEvidence) {
      const conflictingDetails = contradictions
        .filter((c) => c.hasContradiction)
        .map((c) => c.details)
        .join(' ');

      return {
        verdict: 'MISMATCH',
        claimedLocation,
        claimedDate,
        claimedEvent,
        explanation: conflictingDetails
          ? `Contextual mismatch identified: ${conflictingDetails}`
          : 'External evidence contradicts the purported location, timestamp, or narrative context of this image.',
      };
    }

    // 2. If evidence corroborates the event and no contradictions exist:
    if (hasSupportingEvidence && !hasContradictingEvidence) {
      return {
        verdict: 'CONSISTENT',
        claimedLocation,
        claimedDate,
        claimedEvent,
        explanation:
          'Independent sources corroborate that this visual depiction matches the claimed event, location, and timeframe.',
      };
    }

    // 3. Inconclusive baseline:
    return {
      verdict: 'INCONCLUSIVE',
      claimedLocation,
      claimedDate,
      claimedEvent,
      explanation: userContext
        ? 'Available independent evidence is insufficient to verify whether this image is authentically from the claimed context.'
        : 'No specific historical or geographic context was claimed or verified with definitive confidence.',
    };
  }
}

export const imageContextService = new ImageContextService();
