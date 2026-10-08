import crypto from 'crypto';
import {
  UrlVerificationResult,
  UrlClaimVerificationResult,
  EvidenceItem,
  ConfidenceLevel,
} from '@trustlens/shared';
import { urlSafetyService } from './url-safety.service';
import { urlFetchService, UrlFetchError } from './url-fetch.service';
import { urlMetadataExtractor } from './url-metadata-extractor';
import { urlContentExtractor } from './url-content-extractor';
import { urlClaimExtractor } from './url-claim-extractor';
import { headlineAnalyzer } from './headline-analyzer';
import { selfConsistencyAnalyzer } from './self-consistency-analyzer';
import { urlScoringService } from './url-scoring.service';
import { claimExtractor } from '../../text/claim-extractor';
import { evidenceService } from '../../evidence';
import { contradictionService } from '../../contradiction';
import { trustScoringService } from '../../scoring';
import { verificationHistoryService } from '../verification-history.service';

export class UrlVerificationService {
  /**
   * Complete multi-stage URL verification pipeline:
   * 1. SSRF Safety Check
   * 2. Safe Webpage Fetch
   * 3. Metadata & Content Extraction
   * 4. Multi-claim Identification
   * 5. Reuse Stage 3 Evidence/Search Pipeline per Claim
   * 6. Headline & Self-Consistency Cross-Analysis
   * 7. Deterministic Scoring & Verdict
   * 8. History Persistence
   */
  async verifyUrl(rawUrl: string, userId: string): Promise<UrlVerificationResult> {
    const verificationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // -------------------------------------------------------------
    // STAGE 1: URL VALIDATION & SSRF SAFETY CHECK
    // -------------------------------------------------------------
    const safetyCheck = await urlSafetyService.validateUrl(rawUrl);
    if (!safetyCheck.safe) {
      throw new UrlFetchError(
        safetyCheck.reason || 'Requested URL failed safety and SSRF validation.',
        safetyCheck.errorCode || 'URL_BLOCKED'
      );
    }

    const validatedUrl = safetyCheck.normalizedUrl || rawUrl.trim();

    // -------------------------------------------------------------
    // STAGE 2: SAFE WEBPAGE FETCH
    // -------------------------------------------------------------
    const fetched = await urlFetchService.fetchWebpage(validatedUrl);

    // -------------------------------------------------------------
    // STAGE 3: METADATA & CONTENT EXTRACTION
    // -------------------------------------------------------------
    const page = urlMetadataExtractor.extractMetadata(fetched.html, fetched.finalUrl);
    const content = urlContentExtractor.extractContent(fetched.html);

    // If page is empty or unreadable
    if (content.isEmpty) {
      const emptyResult: UrlVerificationResult = {
        verificationId,
        inputUrl: rawUrl,
        finalUrl: fetched.finalUrl,
        canonicalUrl: content.canonicalUrl,
        page,
        overallVerdict: 'INCONCLUSIVE',
        trustScore: 50,
        confidence: 'LOW',
        summary: 'Insufficient readable article text could be extracted from this webpage.',
        reasoning:
          'The target URL returned minimal semantic text, paywalled boilerplate, or non-article content, preventing empirical claim verification.',
        claims: [],
        headlineAnalysis: {
          detected: false,
          severity: 'NONE',
          explanation: 'No body content available for headline comparison.',
        },
        selfConsistencyAnalysis: {
          hasInconsistency: false,
          severity: 'NONE',
          details: 'Insufficient text for self-consistency evaluation.',
        },
        limitations: [
          'Page content was too sparse, paywalled, or dynamic to extract verifiable factual claims.',
        ],
        createdAt,
      };

      await verificationHistoryService.saveVerification(userId, emptyResult, 'URL');
      return emptyResult;
    }

    // -------------------------------------------------------------
    // STAGE 4: CLAIM EXTRACTION (Prioritized up to 4 claims)
    // -------------------------------------------------------------
    const extractedClaims = await urlClaimExtractor.extractClaims(page.title, content.paragraphs, {
      maxClaims: 4,
    });

    if (extractedClaims.length === 0) {
      const noClaimsResult: UrlVerificationResult = {
        verificationId,
        inputUrl: rawUrl,
        finalUrl: fetched.finalUrl,
        canonicalUrl: content.canonicalUrl,
        page,
        overallVerdict: 'INCONCLUSIVE',
        trustScore: 50,
        confidence: 'LOW',
        summary: 'No verifiable factual empirical assertions were identified in the webpage content.',
        reasoning:
          'The webpage appears to consist of subjective opinions, commentary, or conversational remarks without falsifiable empirical claims.',
        claims: [],
        headlineAnalysis: {
          detected: false,
          severity: 'NONE',
          explanation: 'No factual claims identified for headline analysis.',
        },
        selfConsistencyAnalysis: {
          hasInconsistency: false,
          severity: 'NONE',
          details: 'No empirical claims to compare.',
        },
        limitations: ['Page does not assert empirical factual claims.'],
        createdAt,
      };

      await verificationHistoryService.saveVerification(userId, noClaimsResult, 'URL');
      return noClaimsResult;
    }

    // -------------------------------------------------------------
    // STAGE 5: REUSE STAGE 3 EVIDENCE ENGINE FOR EACH CLAIM
    // -------------------------------------------------------------
    const verifiedClaims: UrlClaimVerificationResult[] = [];

    for (const ec of extractedClaims) {
      try {
        // 5.1 Search Query Generation
        const queries = await claimExtractor.generateSearchQueries(ec.claim, ec.entities);

        // 5.2 Retrieve Independent Evidence
        const rawEvidence = await evidenceService.retrieveEvidence(queries, ec.claim);

        // 5.3 CRITICAL: Exclude the verified webpage itself as evidence!
        const independentEvidence = rawEvidence.filter(
          (e) => !this.isSameSource(e, rawUrl, fetched.finalUrl, page.domain)
        );

        // 5.4 Classify Stances
        const classifiedEvidence = await contradictionService.classifyEvidenceStances(
          ec.claim,
          independentEvidence
        );

        const supporting = classifiedEvidence.filter((e) => e.stance === 'SUPPORTS');
        const contradicting = classifiedEvidence.filter((e) => e.stance === 'CONTRADICTS');
        const neutral = classifiedEvidence.filter((e) => e.stance === 'NEUTRAL');

        // 5.5 Contradiction Analysis
        const contradictions = await contradictionService.analyzeContradictions(
          ec.claim,
          supporting,
          contradicting
        );

        // 5.6 Deterministic Trust Score
        const claimScoring = trustScoringService.evaluateClaim({
          supporting,
          contradicting,
          neutral,
          contradictions,
        });

        verifiedClaims.push({
          claimId: ec.id,
          claim: ec.claim,
          claimType: ec.claimType,
          importance: ec.importance,
          verdict: claimScoring.verdict,
          trustScore: claimScoring.breakdown.overallScore,
          confidence: claimScoring.confidence,
          sourceParagraph: ec.sourceParagraph,
          supportingEvidence: supporting,
          contradictingEvidence: contradicting,
          neutralEvidence: neutral,
          contradictions,
          searchQueries: queries,
          provenance: classifiedEvidence.map((e) => ({
            source: e.publisher,
            domain: e.domain,
            relationship: e.stance,
          })),
        });
      } catch (claimErr: any) {
        console.warn(`[UrlVerificationService] Verification of claim "${ec.claim}" failed:`, claimErr?.message || claimErr);
        // Fallback claim record
        verifiedClaims.push({
          claimId: ec.id,
          claim: ec.claim,
          claimType: ec.claimType,
          importance: ec.importance,
          verdict: 'INCONCLUSIVE',
          trustScore: 50,
          confidence: 'LOW',
          sourceParagraph: ec.sourceParagraph,
          supportingEvidence: [],
          contradictingEvidence: [],
          neutralEvidence: [],
          contradictions: {
            hasContradiction: false,
            severity: 'NONE',
            details: 'Evidence search encountered an error.',
            conflictingAspects: [],
          },
          searchQueries: [],
          provenance: [],
        });
      }
    }

    // -------------------------------------------------------------
    // STAGE 6: HEADLINE & SELF-CONSISTENCY CROSS-ANALYSIS
    // -------------------------------------------------------------
    const headlineAnalysis = await headlineAnalyzer.analyzeHeadlineFraming(
      page.title,
      content.fullText
    );
    const selfConsistency = await selfConsistencyAnalyzer.analyzeSelfConsistency(
      content.paragraphs
    );

    // -------------------------------------------------------------
    // STAGE 7: DETERMINISTIC URL SCORING & OVERALL VERDICT
    // -------------------------------------------------------------
    const scoreEval = urlScoringService.evaluateUrlTrust(
      verifiedClaims,
      headlineAnalysis,
      selfConsistency,
      content.isEmpty
    );

    // Generate concise synthesis summary
    const summary = this.generateSummary(
      scoreEval.overallVerdict,
      scoreEval.trustScore,
      verifiedClaims,
      headlineAnalysis
    );
    const reasoning = this.generateReasoning(
      scoreEval.overallVerdict,
      verifiedClaims,
      scoreEval.formulaExplanation
    );

    const result: UrlVerificationResult = {
      verificationId,
      inputUrl: rawUrl,
      finalUrl: fetched.finalUrl,
      canonicalUrl: content.canonicalUrl,
      page,
      overallVerdict: scoreEval.overallVerdict,
      trustScore: scoreEval.trustScore,
      confidence: scoreEval.confidence,
      summary,
      reasoning,
      claims: verifiedClaims,
      headlineAnalysis,
      selfConsistencyAnalysis: selfConsistency,
      limitations: scoreEval.limitations,
      createdAt,
    };

    // -------------------------------------------------------------
    // STAGE 8: PERSIST TO USER AUDIT HISTORY
    // -------------------------------------------------------------
    await verificationHistoryService.saveVerification(userId, result, 'URL');

    return result;
  }

  /**
   * Prevent circular validation: Ensure the webpage being verified is never counted
   * as independent evidence confirming itself!
   */
  private isSameSource(
    item: EvidenceItem,
    inputUrl: string,
    finalUrl: string,
    domain: string
  ): boolean {
    const itemDomain = item.domain.toLowerCase().replace(/^www\./, '');
    const pageDomain = domain.toLowerCase().replace(/^www\./, '');

    if (itemDomain === pageDomain) return true;

    try {
      const normItemUrl = new URL(item.url).pathname.toLowerCase();
      const normInputUrl = new URL(inputUrl).pathname.toLowerCase();
      const normFinalUrl = new URL(finalUrl).pathname.toLowerCase();

      if (normItemUrl === normInputUrl || normItemUrl === normFinalUrl) {
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  }

  private generateSummary(
    verdict: string,
    score: number,
    claims: UrlClaimVerificationResult[],
    headlineAnalysis: any
  ): string {
    const primary = claims.find((c) => c.importance === 'PRIMARY') || claims[0];
    const clickbaitNote =
      headlineAnalysis.severity === 'HIGH' || headlineAnalysis.severity === 'MEDIUM'
        ? ` Note: headline exhibits ${headlineAnalysis.severity.toLowerCase()} framing distortion.`
        : '';

    if (verdict === 'LEGIT') {
      return `Article factual claims verified with Trust Score ${score}/100. Core assertions are substantiated by independent external sources.${clickbaitNote}`;
    }
    if (verdict === 'FAKE') {
      return `Article claims contradicted with Trust Score ${score}/100. Core assertions (e.g. "${primary?.claim || 'primary claim'}") conflict directly with authoritative evidence.${clickbaitNote}`;
    }
    return `Article verification inconclusive with Trust Score ${score}/100. Available independent evidence is insufficient, ambiguous, or lacks consensus.${clickbaitNote}`;
  }

  private generateReasoning(verdict: string, claims: UrlClaimVerificationResult[], formula: string): string {
    const claimBreakdown = claims
      .map((c) => `• [${c.importance}] "${c.claim.slice(0, 80)}...": ${c.verdict} (Score ${c.trustScore})`)
      .join('\n');

    return `Verification calculated via deterministic multi-claim weighting:\n${claimBreakdown}\n\nFormula: ${formula}`;
  }
}

export const urlVerificationService = new UrlVerificationService();
