import { TextVerificationResult, EvidenceItem } from '@trustlens/shared';
import { claimExtractor } from './claim-extractor';
import { evidenceService } from '../evidence';
import { contradictionService } from '../contradiction';
import { trustScoringService } from '../scoring';
import { verificationHistoryService } from '../verification/verification-history.service';
import { aiService } from '../ai';
import crypto from 'crypto';

export class TextVerificationService {
  /**
   * Complete multi-stage evidence-backed verification pipeline
   */
  async verifyText(input: string, userId: string): Promise<TextVerificationResult> {
    const verificationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // -------------------------------------------------------------
    // STAGE 1: CLAIM EXTRACTION & VERIFIABILITY CHECK
    // -------------------------------------------------------------
    const extraction = await claimExtractor.extractClaim(input);

    if (!extraction.verificationNeeded || extraction.claimType === 'NON_VERIFIABLE') {
      const nonVerifiableResult: TextVerificationResult = {
        verificationId,
        input,
        claim: extraction.claim,
        claimType: extraction.claimType,
        verificationNeeded: false,
        verdict: 'INCONCLUSIVE',
        trustScore: 50,
        confidence: 'LOW',
        summary:
          extraction.reasonNonVerifiable ||
          'The provided text does not contain an empirical factual assertion that can be substantiated with evidence.',
        reasoning:
          'No external web searches were executed because the statement is subjective, conversational, or a greeting rather than a verifiable claim.',
        supportingEvidence: [],
        contradictingEvidence: [],
        neutralEvidence: [],
        contradictions: {
          hasContradiction: false,
          severity: 'NONE',
          details: 'Non-verifiable statement; no cross-evidence conflict.',
          conflictingAspects: [],
        },
        scoreBreakdown: {
          overallScore: 50,
          supportingStrength: 0,
          contradictingStrength: 0,
          sourceCredibility: 50,
          sourceIndependence: 50,
          uncertaintyPenalty: 100,
          formulaExplanation: 'Default baseline for non-verifiable inputs.',
        },
        searchQueries: [],
        provenance: [],
        limitations: [
          extraction.reasonNonVerifiable || 'Statement cannot be objectively verified with web evidence.',
        ],
        createdAt,
      };

      await verificationHistoryService.saveVerification(userId, nonVerifiableResult);
      return nonVerifiableResult;
    }

    // -------------------------------------------------------------
    // STAGE 2: SEARCH QUERY GENERATION
    // -------------------------------------------------------------
    const searchQueries = await claimExtractor.generateSearchQueries(
      extraction.claim,
      extraction.entities
    );

    // -------------------------------------------------------------
    // STAGE 3: INDEPENDENT WEB EVIDENCE COLLECTION
    // -------------------------------------------------------------
    const rawEvidence = await evidenceService.retrieveEvidence(searchQueries, extraction.claim);

    // If zero evidence was retrieved
    if (rawEvidence.length === 0) {
      const scoringOutcome = trustScoringService.evaluateClaim({
        supporting: [],
        contradicting: [],
        neutral: [],
        contradictions: {
          hasContradiction: false,
          severity: 'NONE',
          details: 'Zero sources retrieved.',
          conflictingAspects: [],
        },
      });

      const zeroEvidenceResult: TextVerificationResult = {
        verificationId,
        input,
        claim: extraction.claim,
        claimType: extraction.claimType,
        verificationNeeded: true,
        verdict: 'INCONCLUSIVE',
        trustScore: scoringOutcome.breakdown.overallScore,
        confidence: 'LOW',
        summary: `No authoritative web evidence or public records were found to evaluate the claim: "${extraction.claim}".`,
        reasoning:
          'TrustLens could not confirm or disprove this assertion because search queries returned zero reliable external citations. Following TrustLens epistemic principles, ungrounded claims are classified as Inconclusive rather than fabricated.',
        supportingEvidence: [],
        contradictingEvidence: [],
        neutralEvidence: [],
        contradictions: {
          hasContradiction: false,
          severity: 'NONE',
          details: 'Zero independent sources found.',
          conflictingAspects: [],
        },
        scoreBreakdown: scoringOutcome.breakdown,
        searchQueries,
        provenance: [],
        limitations: scoringOutcome.limitations,
        createdAt,
      };

      await verificationHistoryService.saveVerification(userId, zeroEvidenceResult);
      return zeroEvidenceResult;
    }

    // -------------------------------------------------------------
    // STAGE 4: EVIDENCE STANCE CLASSIFICATION
    // -------------------------------------------------------------
    const classifiedEvidence = await contradictionService.classifyEvidenceStances(
      extraction.claim,
      rawEvidence
    );

    const supportingEvidence = classifiedEvidence.filter((e) => e.stance === 'SUPPORTS');
    const contradictingEvidence = classifiedEvidence.filter((e) => e.stance === 'CONTRADICTS');
    const neutralEvidence = classifiedEvidence.filter(
      (e) => e.stance === 'NEUTRAL' || e.stance === 'UNKNOWN'
    );

    // -------------------------------------------------------------
    // STAGE 5: CONTRADICTION DETECTION & CROSS-EXAMINATION
    // -------------------------------------------------------------
    const contradictions = await contradictionService.analyzeContradictions(
      extraction.claim,
      supportingEvidence,
      contradictingEvidence
    );

    // -------------------------------------------------------------
    // STAGE 6: TRUST SCORE & VERDICT CALCULATION
    // -------------------------------------------------------------
    const scoringOutcome = trustScoringService.evaluateClaim({
      supporting: supportingEvidence,
      contradicting: contradictingEvidence,
      neutral: neutralEvidence,
      contradictions,
    });

    // -------------------------------------------------------------
    // STAGE 7: SYNTHESIZE EXPLAINABLE VERDICT REASONING
    // -------------------------------------------------------------
    const { summary, reasoning } = await this.synthesizeExplanation(
      extraction.claim,
      scoringOutcome.verdict,
      supportingEvidence,
      contradictingEvidence,
      contradictions
    );

    // -------------------------------------------------------------
    // STAGE 8: PROVENANCE ASSEMBLY
    // -------------------------------------------------------------
    const provenance = Array.from(
      new Map(
        classifiedEvidence.map((e) => [
          e.domain,
          {
            source: e.publisher || e.title,
            domain: e.domain,
            relationship: e.provenance?.isDerivative ? 'Derivative syndication' : 'Direct primary source',
          },
        ])
      ).values()
    );

    const result: TextVerificationResult = {
      verificationId,
      input,
      claim: extraction.claim,
      claimType: extraction.claimType,
      verificationNeeded: true,
      verdict: scoringOutcome.verdict,
      trustScore: scoringOutcome.breakdown.overallScore,
      confidence: scoringOutcome.confidence,
      summary,
      reasoning,
      supportingEvidence,
      contradictingEvidence,
      neutralEvidence,
      contradictions,
      scoreBreakdown: scoringOutcome.breakdown,
      searchQueries,
      provenance,
      limitations: scoringOutcome.limitations,
      createdAt,
    };

    // Save to user's verification audit history
    await verificationHistoryService.saveVerification(userId, result);

    return result;
  }

  private async synthesizeExplanation(
    claim: string,
    verdict: string,
    supporting: EvidenceItem[],
    contradicting: EvidenceItem[],
    contradictions: any
  ): Promise<{ summary: string; reasoning: string }> {
    const systemPrompt = `You are the lead verdict synthesizer for TrustLens, a transparent misinformation analysis platform.
Explain the verification outcome based ONLY on the provided empirical evidence items.
Do not introduce outside claims not supported by the citations.
Provide two structured outputs:
1. "summary": A concise 2-sentence executive verdict.
2. "reasoning": A detailed, multi-paragraph factual rationale explaining how the supporting and contradicting evidence justify the verdict.

Respond ONLY with JSON:
{
  "summary": "...",
  "reasoning": "..."
}`;

    const prompt = `Claim: "${claim}"
Assigned Verdict: ${verdict}
Supporting Evidence (${supporting.length}):
${supporting.map((s) => `- [${s.domain}] ${s.title}: ${s.snippet.slice(0, 200)}`).join('\n')}

Contradicting Evidence (${contradicting.length}):
${contradicting.map((c) => `- [${c.domain}] ${c.title}: ${c.snippet.slice(0, 200)}`).join('\n')}

Contradiction Status: ${contradictions.details}`;

    try {
      const response = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (parsed.summary && parsed.reasoning) {
        return {
          summary: parsed.summary,
          reasoning: parsed.reasoning,
        };
      }
    } catch (err) {
      console.warn('[TextVerificationService] Explanation synthesis failed, using rule-based synthesis:', err);
    }

    // Deterministic fallback
    const summary =
      verdict === 'LEGIT'
        ? `The claim is corroborated by ${supporting.length} authoritative source(s) with minimal counter-evidence.`
        : verdict === 'FAKE'
        ? `The claim is contradicted by ${contradicting.length} authoritative source(s) and public records.`
        : `Evidence regarding this claim remains inconclusive or divided across ${supporting.length + contradicting.length} sources.`;

    const reasoning = `Evaluation based on ${supporting.length} supporting citations and ${contradicting.length} contradicting citations. Contradiction severity is classified as ${contradictions.severity}.`;

    return { summary, reasoning };
  }
}

export const textVerificationService = new TextVerificationService();
