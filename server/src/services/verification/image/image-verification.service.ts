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
    const validated = imageSecurityService.validateImage(
      options.buffer,
      options.declaredMimeType,
      options.originalFilename,
      options.userContext
    );

    // -------------------------------------------------------------
    // STAGE 2: METADATA & PRIVACY SHIELD
    // -------------------------------------------------------------
    const metadataAnalysis = imageMetadataService.extractMetadata(validated);

    // -------------------------------------------------------------
    // STAGE 3: MULTIMODAL VISUAL UNDERSTANDING & OCR
    // -------------------------------------------------------------
    const visual = await imageAnalysisService.analyzeImage(validated);

    // -------------------------------------------------------------
    // STAGE 4: EMPIRICAL CLAIM EXTRACTION & PRIORITIZATION
    // -------------------------------------------------------------
    const extractedClaims = await imageClaimExtractor.extractClaims(visual, validated.userContext, {
      maxClaims: 4,
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

        // 5.2 Retrieve independent evidence from web grounding
        const rawEvidence = await evidenceService.retrieveEvidence(queries, ec.claim);

        // 5.3 Classify stances
        const classifiedEvidence = await contradictionService.classifyEvidenceStances(
          ec.claim,
          rawEvidence
        );

        const supporting = classifiedEvidence.filter((e) => e.stance === 'SUPPORTS');
        const contradicting = classifiedEvidence.filter((e) => e.stance === 'CONTRADICTS');
        const neutral = classifiedEvidence.filter((e) => e.stance === 'NEUTRAL');

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
      scoreEval.formulaExplanation
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
    };

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
    return `Image verification inconclusive with Trust Score ${score}/100. Available independent evidence is insufficient, ambiguous, or lacks consensus.${contextNote}${manipNote}`;
  }

  private generateReasoning(
    verdict: string,
    claims: ImageClaimVerificationResult[],
    contextAssessment: any,
    formula: string
  ): string {
    const claimBreakdown = claims
      .map(
        (c) =>
          `• [${c.importance} / ${c.source}] "${c.claim.slice(0, 80)}...": ${c.verdict} (Score ${c.trustScore})`
      )
      .join('\n');

    return `Verification determined via multimodal claim grounding & context cross-examination:\nContext Assessment: ${contextAssessment.verdict} (${contextAssessment.explanation})\n\nClaims Breakdown:\n${claimBreakdown}\n\nFormula: ${formula}`;
  }
}

export const imageVerificationService = new ImageVerificationService();
