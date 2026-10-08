import crypto from 'crypto';
import {
  ImageVerificationResult,
  ImageClaimVerificationResult,
  EvidenceItem,
  ContradictionAnalysisResult,
} from '@trustlens/shared';
import { imageSecurityService } from './image-security.service';
import { imageMetadataService } from './image-metadata.service';
import { imageAnalysisService } from './image-analysis.service';
import { imageClaimExtractor } from './image-claim-extractor';
import { imageContextService } from './image-context.service';
import { imageScoringService } from './image-scoring.service';
import { claimExtractor } from '../../text/claim-extractor';
import { evidenceService } from '../../evidence';
import { contradictionService } from '../../contradiction';
import { trustScoringService } from '../../scoring';
import { verificationHistoryService } from '../verification-history.service';
import { imageDiagnosticLogger } from './image-diagnostic.logger';

export interface VerifyImageInputOptions {
  buffer: Buffer;
  declaredMimeType?: string;
  originalFilename?: string;
  userContext?: string;
  userId: string;
}

export class ImageVerificationService {
  /**
   * Complete multi-stage image verification pipeline
   */
  async verifyImage(options: VerifyImageInputOptions): Promise<ImageVerificationResult> {
    const verificationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // -------------------------------------------------------------
    // STAGE 1: IMAGE SECURITY VALIDATION
    // -------------------------------------------------------------
    imageDiagnosticLogger.log({
      verificationId,
      stage: 'SECURITY_CHECK',
      status: 'STARTED',
      message: `Validating image security (${options.declaredMimeType || 'auto'}, ${options.buffer.length} bytes)`,
    });

    const validated = imageSecurityService.validateImage(
      options.buffer,
      options.declaredMimeType,
      options.originalFilename,
      options.userContext
    );
    validated.verificationId = verificationId;

    imageDiagnosticLogger.log({
      verificationId,
      stage: 'SECURITY_CHECK',
      status: 'COMPLETED',
      message: `Image security passed (${validated.mimeType}, ${validated.sizeBytes} bytes)`,
    });

    // -------------------------------------------------------------
    // STAGE 2: METADATA & PRIVACY SHIELD
    // -------------------------------------------------------------
    const metadataAnalysis = imageMetadataService.extractMetadata(validated);
    imageDiagnosticLogger.log({
      verificationId,
      stage: 'METADATA_PRIVACY',
      status: 'COMPLETED',
      message: 'Metadata and privacy analysis completed',
      data: {
        hasLocationData: metadataAnalysis.signals.hasLocationData,
        cameraMake: metadataAnalysis.signals.cameraMake,
        timestamp: metadataAnalysis.signals.timestamp,
      },
    });

    // -------------------------------------------------------------
    // STAGE 3: MULTIMODAL VISUAL UNDERSTANDING & OCR
    // -------------------------------------------------------------
    const visual = await imageAnalysisService.analyzeImage(validated);

    // -------------------------------------------------------------
    // STAGE 4: EMPIRICAL CLAIM EXTRACTION & PRIORITIZATION
    // -------------------------------------------------------------
    const extractedClaims = await imageClaimExtractor.extractClaims(visual, validated.userContext, {
      maxClaims: 4,
      verificationId,
    });

    // -------------------------------------------------------------
    // STAGE 5: INDEPENDENT WEB EVIDENCE GROUNDING (REUSING STAGE 3/4)
    // -------------------------------------------------------------
    const verifiedClaims: ImageClaimVerificationResult[] = [];
    const allEvidenceItems: EvidenceItem[] = [];
    const allContradictions: ContradictionAnalysisResult[] = [];

    for (const ec of extractedClaims) {
      try {
        // 5.1 Generate search queries
        const queries = await claimExtractor.generateSearchQueries(ec.claim, ec.entities);
        imageDiagnosticLogger.log({
          verificationId,
          stage: 'QUERY_GENERATION',
          status: 'COMPLETED',
          message: `Generated ${queries.length} search queries for claim "${ec.claim.slice(0, 50)}..."`,
          data: {
            claim: ec.claim,
            queries,
          },
        });

        // 5.2 Retrieve independent evidence from web grounding with full status
        const { items: rawEvidence, summary: searchSummary } =
          await evidenceService.retrieveEvidenceWithStatus(queries, ec.claim, { verificationId });

        // 5.3 Classify stances
        const classifiedEvidence = await contradictionService.classifyEvidenceStances(
          ec.claim,
          rawEvidence
        );

        const supporting = classifiedEvidence.filter((e) => e.stance === 'SUPPORTS');
        const contradicting = classifiedEvidence.filter((e) => e.stance === 'CONTRADICTS');
        const neutral = classifiedEvidence.filter((e) => e.stance === 'NEUTRAL');

        imageDiagnosticLogger.log({
          verificationId,
          stage: 'STANCE_CLASSIFICATION',
          status: 'COMPLETED',
          message: `Stance classification: ${supporting.length} supporting, ${contradicting.length} contradicting, ${neutral.length} neutral`,
          data: {
            claim: ec.claim,
            supportingCount: supporting.length,
            contradictingCount: contradicting.length,
            neutralCount: neutral.length,
          },
        });

        // 5.4 Contradiction analysis
        const contradictions = await contradictionService.analyzeContradictions(
          ec.claim,
          supporting,
          contradicting
        );

        // 5.5 Deterministic claim trust scoring
        const claimScoring = trustScoringService.evaluateClaim({
          supporting,
          contradicting,
          neutral,
          contradictions,
        });

        let searchExplanation: string;
        if (searchSummary.status === 'RATE_LIMITED') {
          searchExplanation = 'Search grounding provider hit API quota / rate limits. No synthetic evidence generated.';
        } else if (searchSummary.status === 'UNAVAILABLE') {
          searchExplanation = 'Search grounding provider was unavailable.';
        } else if (supporting.length > 0 && contradicting.length > 0) {
          searchExplanation = 'Independent sources present conflicting reporting on this claim.';
        } else if (supporting.length > 0) {
          searchExplanation = 'Substantiated by independent authoritative citations.';
        } else if (contradicting.length > 0) {
          searchExplanation = 'Contradicted or debunked by independent reporting.';
        } else if (neutral.length > 0) {
          searchExplanation = 'Retrieved sources discuss related background event/entities, but do not confirm or refute this specific claim.';
        } else {
          searchExplanation = 'No independent web sources found matching this specific claim.';
        }

        if (claimScoring.verdict === 'INCONCLUSIVE') {
          imageDiagnosticLogger.log({
            verificationId,
            stage: 'DETERMINISTIC_SCORING',
            status: 'INCONCLUSIVE',
            message: `Claim inconclusive: ${searchExplanation}`,
            data: {
              claim: ec.claim,
              trustScore: claimScoring.breakdown.overallScore,
              searchStatus: searchSummary.status,
              supporting: supporting.length,
              contradicting: contradicting.length,
              neutral: neutral.length,
            },
          });
        }

        verifiedClaims.push({
          claimId: ec.id,
          claim: ec.claim,
          claimType: ec.claimType,
          importance: ec.importance,
          source: ec.source,
          entities: ec.entities,
          timeContext: ec.timeContext,
          locationContext: ec.locationContext,
          verdict: claimScoring.verdict,
          trustScore: claimScoring.breakdown.overallScore,
          confidence: claimScoring.confidence,
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
          searchStatus: searchSummary.status,
          searchExplanation,
        });

        allEvidenceItems.push(...classifiedEvidence);
        allContradictions.push(contradictions);
      } catch (claimErr: any) {
        console.warn(`[ImageVerificationService] Claim verification failed: ${claimErr?.message || claimErr}`);
        verifiedClaims.push({
          claimId: ec.id,
          claim: ec.claim,
          claimType: ec.claimType,
          importance: ec.importance,
          source: ec.source,
          entities: ec.entities,
          timeContext: ec.timeContext,
          locationContext: ec.locationContext,
          verdict: 'INCONCLUSIVE',
          trustScore: 50,
          confidence: 'LOW',
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
          searchStatus: 'ERROR',
          searchExplanation: 'Evidence search pipeline encountered an unexpected error.',
        });
      }
    }

    // -------------------------------------------------------------
    // STAGE 6: IMAGE CONTEXT ASSESSMENT (LOCATION / DATE / EVENT)
    // -------------------------------------------------------------
    const contextAssessment = imageContextService.evaluateContext(
      visual,
      extractedClaims,
      allEvidenceItems,
      allContradictions,
      validated.userContext
    );

    imageDiagnosticLogger.log({
      verificationId,
      stage: 'CONTEXT_ASSESSMENT',
      status: 'COMPLETED',
      message: `Context assessment result: ${contextAssessment.verdict}`,
      data: {
        verdict: contextAssessment.verdict,
        explanation: contextAssessment.explanation,
      },
    });

    // -------------------------------------------------------------
    // STAGE 7: DETERMINISTIC SCORING & OVERALL VERDICT
    // -------------------------------------------------------------
    const manipulationAnalysis = {
      detected: visual.manipulationIndicators.detected,
      severity: visual.manipulationIndicators.severity,
      indicators: visual.manipulationIndicators.indicators,
      limitations: visual.manipulationIndicators.limitations,
    };

    const scoreEval = imageScoringService.evaluateImageTrust(
      verifiedClaims,
      contextAssessment,
      manipulationAnalysis,
      metadataAnalysis
    );

    imageDiagnosticLogger.log({
      verificationId,
      stage: 'DETERMINISTIC_SCORING',
      status: 'COMPLETED',
      message: `Overall verification determined: ${scoreEval.overallVerdict} (Trust Score: ${scoreEval.trustScore}, Confidence: ${scoreEval.confidence})`,
      data: {
        overallVerdict: scoreEval.overallVerdict,
        trustScore: scoreEval.trustScore,
        confidence: scoreEval.confidence,
      },
    });

    // Determine overall search status
    let overallSearchStatus: ImageVerificationResult['searchStatus'] = 'NO_RESULTS';
    if (verifiedClaims.some((c) => c.supportingEvidence.length > 0 || c.contradictingEvidence.length > 0)) {
      overallSearchStatus = 'SUCCESS';
    } else if (verifiedClaims.some((c) => c.neutralEvidence.length > 0)) {
      overallSearchStatus = 'PARTIAL';
    } else if (verifiedClaims.every((c) => c.searchStatus === 'RATE_LIMITED')) {
      overallSearchStatus = 'RATE_LIMITED';
    } else if (verifiedClaims.every((c) => c.searchStatus === 'UNAVAILABLE')) {
      overallSearchStatus = 'UNAVAILABLE';
    }

    // -------------------------------------------------------------
    // STAGE 8: SYNTHESIS & REASONING GENERATION
    // -------------------------------------------------------------
    const summary = this.generateSummary(
      scoreEval.overallVerdict,
      scoreEval.trustScore,
      verifiedClaims,
      contextAssessment,
      manipulationAnalysis
    );

    const reasoning = this.generateReasoning(
      scoreEval.overallVerdict,
      verifiedClaims,
      contextAssessment,
      scoreEval.formulaExplanation,
      overallSearchStatus
    );

    // Generate safe preview thumbnail data URL (capped at ~500KB to save memory)
    const previewUrl =
      validated.buffer.length <= 1_500_000
        ? `data:${validated.mimeType};base64,${validated.buffer.toString('base64')}`
        : undefined;

    const result: ImageVerificationResult = {
      verificationId,
      inputType: 'IMAGE',
      image: {
        fileType: validated.extension.toUpperCase(),
        width: metadataAnalysis.signals.width || 0,
        height: metadataAnalysis.signals.height || 0,
        sizeBytes: validated.sizeBytes,
        imageClassification: visual.classification,
        previewUrl,
      },
      userContext: validated.userContext || null,
      extractedText: visual.visibleText,
      visualAnalysis: {
        description: visual.description,
        entities: visual.entities,
        scene: visual.scene,
        possibleEvent: visual.possibleEvent,
        possibleLocation: visual.possibleLocation,
        possibleDate: visual.possibleDate,
        observations: visual.observations,
        inferredAspects: visual.inferredAspects,
        uncertainties: visual.uncertainties,
      },
      metadataAnalysis,
      manipulationAnalysis,
      claims: verifiedClaims,
      contextAssessment,
      overallVerdict: scoreEval.overallVerdict,
      trustScore: scoreEval.trustScore,
      confidence: scoreEval.confidence,
      summary,
      reasoning,
      limitations: scoreEval.limitations,
      createdAt,
      searchStatus: overallSearchStatus,
      searchExplanation: verifiedClaims[0]?.searchExplanation,
    };

    imageDiagnosticLogger.log({
      verificationId,
      stage: 'PIPELINE_COMPLETE',
      status: 'COMPLETED',
      message: `Image verification pipeline completed: ${result.overallVerdict}`,
      data: {
        claimsCount: verifiedClaims.length,
        ocrCount: visual.visibleText.length,
        searchStatus: overallSearchStatus,
      },
    });

    // -------------------------------------------------------------
    // STAGE 9: AUDIT PERSISTENCE (PER-USER ISOLATION)
    // -------------------------------------------------------------
    await verificationHistoryService.saveVerification(options.userId, result as any, 'IMAGE');

    return result;
  }

  private generateSummary(
    verdict: string,
    score: number,
    claims: ImageClaimVerificationResult[],
    contextAssessment: any,
    manipulation: any
  ): string {
    const primary = claims.find((c) => c.importance === 'PRIMARY') || claims[0];
    const contextNote =
      contextAssessment.verdict === 'MISMATCH'
        ? ' Note: evidence contradicts the claimed location, date, or event context.'
        : '';
    const manipNote =
      manipulation.severity === 'HIGH'
        ? ' Warning: substantial visual manipulation indicators detected.'
        : '';

    if (verdict === 'LEGIT') {
      return `Image claims verified with Trust Score ${score}/100. Core assertions (e.g. "${primary?.claim || 'visual claims'}") are substantiated by independent external evidence.${contextNote}${manipNote}`;
    }
    if (verdict === 'FAKE') {
      return `Image claims contradicted with Trust Score ${score}/100. Core assertions or contextual attribution conflict directly with authoritative evidence.${contextNote}${manipNote}`;
    }

    // Inconclusive: clearly distinguish reason for uncertainty
    const anyRateLimited = claims.some((c) => c.searchStatus === 'RATE_LIMITED' || c.searchStatus === 'UNAVAILABLE');
    const hasNeutralContext = claims.some((c) => c.neutralEvidence && c.neutralEvidence.length > 0);
    const hasConflict = claims.some((c) => c.supportingEvidence.length > 0 && c.contradictingEvidence.length > 0);

    let uncertaintyReason = 'Available independent evidence is insufficient, ambiguous, or lacks consensus.';
    if (anyRateLimited) {
      uncertaintyReason = 'External search grounding was unavailable or rate-limited by provider; TrustLens does not manufacture synthetic citations.';
    } else if (hasConflict) {
      uncertaintyReason = 'Retrieved independent sources present conflicting accounts regarding the core assertion.';
    } else if (hasNeutralContext) {
      uncertaintyReason = 'Retrieved reporting corroborates the underlying event, but lacks definitive confirmation of this specific sub-claim.';
    } else {
      uncertaintyReason = 'No independent external sources corroborating or refuting this specific assertion were found.';
    }

    return `Image verification inconclusive with Trust Score ${score}/100. ${uncertaintyReason}${contextNote}${manipNote}`;
  }

  private generateReasoning(
    verdict: string,
    claims: ImageClaimVerificationResult[],
    contextAssessment: any,
    formula: string,
    searchStatus?: string
  ): string {
    const claimBreakdown = claims
      .map(
        (c) =>
          `• [${c.importance} / ${c.source}] "${c.claim.slice(0, 80)}...": ${c.verdict} (Score ${c.trustScore}) [Sources: ${c.supportingEvidence.length} sup / ${c.contradictingEvidence.length} con / ${c.neutralEvidence.length} neu]`
      )
      .join('\n');

    const searchNote = searchStatus ? `Search Grounding Status: ${searchStatus}\n` : '';

    return `Verification determined via multimodal claim grounding & context cross-examination:\n${searchNote}Context Assessment: ${contextAssessment.verdict} (${contextAssessment.explanation})\n\nClaims Breakdown:\n${claimBreakdown}\n\nFormula: ${formula}`;
  }
}

export const imageVerificationService = new ImageVerificationService();
