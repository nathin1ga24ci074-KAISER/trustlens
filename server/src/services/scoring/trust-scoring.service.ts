import {
  EvidenceItem,
  ContradictionAnalysisResult,
  TrustScoreBreakdown,
  PrimaryVerdict,
  ConfidenceLevel,
} from '@trustlens/shared';

// High-credibility domains (TLDs and major established fact-checking/reporting entities)
const HIGH_AUTHORITY_DOMAINS = new Set([
  'gov',
  'edu',
  'mil',
  'who.int',
  'un.org',
  'nasa.gov',
  'cdc.gov',
  'nih.gov',
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'bbc.co.uk',
  'factcheck.org',
  'politifact.com',
  'snopes.com',
  'nature.com',
  'science.org',
  'wikipedia.org',
]);

export interface ScoringInputs {
  supporting: EvidenceItem[];
  contradicting: EvidenceItem[];
  neutral: EvidenceItem[];
  contradictions: ContradictionAnalysisResult;
}

export interface ScoringOutcome {
  verdict: PrimaryVerdict;
  confidence: ConfidenceLevel;
  breakdown: TrustScoreBreakdown;
  limitations: string[];
}

export class TrustScoringService {
  /**
   * Transparently compute Trust Score (0-100), Verdict, Confidence, and Limitation factors
   */
  evaluateClaim(inputs: ScoringInputs): ScoringOutcome {
    const { supporting, contradicting, neutral, contradictions } = inputs;
    const totalSources = supporting.length + contradicting.length + neutral.length;
    const limitations: string[] = [];

    // 1. Calculate Source Credibility Factor (0 - 100)
    let credibilitySum = 0;
    const allItems = [...supporting, ...contradicting, ...neutral];

    if (allItems.length > 0) {
      for (const item of allItems) {
        credibilitySum += this.rateDomainCredibility(item.domain);
      }
    }
    const sourceCredibility = allItems.length > 0 ? Math.round(credibilitySum / allItems.length) : 50;

    // 2. Calculate Source Independence Factor (0 - 100)
    const uniqueDomains = new Set(allItems.map((i) => i.domain.toLowerCase()));
    let sourceIndependence = 100;
    if (allItems.length > 1) {
      const diversityRatio = uniqueDomains.size / allItems.length;
      sourceIndependence = Math.round(diversityRatio * 100);
      if (sourceIndependence < 60) {
        limitations.push('Multiple retrieved articles share underlying domains or derivative wire syndication.');
      }
    }

    // 3. Supporting Evidence Strength (0 - 100)
    let supportingStrength = 0;
    if (supporting.length === 1) {
      supportingStrength = Math.round(55 * (sourceCredibility / 100));
    } else if (supporting.length === 2) {
      supportingStrength = Math.round(80 * (sourceCredibility / 100));
    } else if (supporting.length >= 3) {
      supportingStrength = Math.min(100, Math.round(95 * (sourceCredibility / 100)));
    }

    // 4. Contradicting Evidence Strength (0 - 100)
    let contradictingStrength = 0;
    if (contradicting.length === 1) {
      contradictingStrength = Math.round(55 * (sourceCredibility / 100));
    } else if (contradicting.length === 2) {
      contradictingStrength = Math.round(80 * (sourceCredibility / 100));
    } else if (contradicting.length >= 3) {
      contradictingStrength = Math.min(100, Math.round(95 * (sourceCredibility / 100)));
    }

    // 5. Uncertainty Penalty (0 - 100)
    let uncertaintyPenalty = 0;

    if (totalSources === 0) {
      uncertaintyPenalty = 100;
      limitations.push('Zero verifiable independent web evidence was located for this specific assertion.');
    } else if (totalSources < 2) {
      uncertaintyPenalty += 35;
      limitations.push('Limited source coverage: analysis relies on a single evidence reference.');
    }

    if (contradictions.severity === 'SEVERE') {
      uncertaintyPenalty += 40;
      limitations.push('Severe factual contradictions detected across major authoritative sources.');
    } else if (contradictions.severity === 'MODERATE') {
      uncertaintyPenalty += 20;
      limitations.push('Conflicting accounts or context divergence identified between sources.');
    }

    if (neutral.length > supporting.length + contradicting.length) {
      uncertaintyPenalty += 15;
      limitations.push('Most retrieved evidence provides background context rather than direct affirmation.');
    }

    uncertaintyPenalty = Math.min(100, uncertaintyPenalty);

    // 6. Overall Trust Score Calculation (0 - 100)
    let rawScore = 50; // neutral prior

    if (totalSources === 0) {
      rawScore = 50;
    } else {
      rawScore =
        supportingStrength * 0.55 +
        sourceCredibility * 0.20 +
        sourceIndependence * 0.10 -
        contradictingStrength * 0.55 -
        uncertaintyPenalty * 0.15;
    }

    // Clamp score between 0 and 100
    const overallScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // 7. Controlled Verdict Determination (LEGIT | INCONCLUSIVE | FAKE)
    let verdict: PrimaryVerdict = 'INCONCLUSIVE';

    if (totalSources === 0) {
      verdict = 'INCONCLUSIVE';
    } else if (
      overallScore >= 65 &&
      supportingStrength >= 35 &&
      contradictingStrength < 30 &&
      contradictions.severity !== 'SEVERE'
    ) {
      verdict = 'LEGIT';
    } else if (
      overallScore <= 35 &&
      contradictingStrength >= 40 &&
      supportingStrength < 30
    ) {
      verdict = 'FAKE';
    } else {
      verdict = 'INCONCLUSIVE';
      if (!limitations.some((l) => l.includes('Inconclusive'))) {
        limitations.push('Available evidence is ambiguous or balanced between competing perspectives, precluding definitive validation.');
      }
    }

    // 8. Confidence Level (HIGH | MEDIUM | LOW)
    let confidence: ConfidenceLevel = 'LOW';
    if (totalSources >= 3 && uniqueDomains.size >= 2 && uncertaintyPenalty <= 25 && sourceCredibility >= 70) {
      confidence = 'HIGH';
    } else if (totalSources >= 2 && uncertaintyPenalty <= 50) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    const breakdown: TrustScoreBreakdown = {
      overallScore,
      supportingStrength,
      contradictingStrength,
      sourceCredibility,
      sourceIndependence,
      uncertaintyPenalty,
      formulaExplanation:
        'TrustScore = (SupportingStrength × 0.55) + (Credibility × 0.20) + (Independence × 0.10) - (ContradictingStrength × 0.55) - (Uncertainty × 0.15)',
    };

    return {
      verdict,
      confidence,
      breakdown,
      limitations,
    };
  }

  private rateDomainCredibility(domain: string): number {
    const cleanDomain = domain.toLowerCase();
    const tld = cleanDomain.split('.').pop() || '';

    if (HIGH_AUTHORITY_DOMAINS.has(cleanDomain) || HIGH_AUTHORITY_DOMAINS.has(tld)) {
      return 92;
    }

    // Major academic or institutional domains
    if (cleanDomain.includes('.edu.') || cleanDomain.includes('.ac.') || cleanDomain.includes('.gov.')) {
      return 90;
    }

    // Known news indicators
    if (
      cleanDomain.includes('news') ||
      cleanDomain.includes('times') ||
      cleanDomain.includes('post') ||
      cleanDomain.includes('tribune') ||
      cleanDomain.includes('journal')
    ) {
      return 75;
    }

    // Default internet source
    return 60;
  }
}

export const trustScoringService = new TrustScoringService();
