import crypto from 'crypto';
import {
  VideoVerificationResult,
  VideoClaimVerificationResult,
  EvidenceItem,
  ContradictionAnalysisResult,
  PrimaryVerdict,
  ConfidenceLevel,
} from '@trustlens/shared';
import { VideoProcessingInput } from './video.types';
import { videoSecurityService } from './video-security.service';
import { videoProcessingService } from './video-processing.service';
import { videoAudioService } from './video-audio.service';
import { videoAnalysisService } from './video-analysis.service';
import { videoClaimExtractor } from './video-claim-extractor';
import { videoTemporalService } from './video-temporal.service';
import { videoContextService } from './video-context.service';
import { videoScoringService } from './video-scoring.service';
import { evidenceService } from '../../evidence';
import { contradictionService } from '../../contradiction';
import { trustScoringService } from '../../scoring';
import { verificationHistoryService } from '../verification-history.service';

export class VideoVerificationService {
  /**
   * Executes the full multi-stage evidence-backed video verification pipeline:
   * VIDEO
   * → validation & temp storage
   * → audio extraction & transcript
   * → keyframe sampling & deduplication
   * → multimodal visual analysis & OCR
   * → multi-source claim extraction
   * → temporal consistency check
   * → independent web evidence grounding
   * → stance & contradiction analysis
   * → context recycling evaluation
   * → deterministic trust scoring & primary claim veto
   * → user audit history persistence
   * → guaranteed temp file cleanup
   */
  async verifyVideo(input: VideoProcessingInput): Promise<VideoVerificationResult> {
    const verificationId = crypto.randomUUID();
    const limitations: string[] = [
      'Direct reverse-video indexing was not available; TrustLens verified the video by extracting claims, dialogue, and keyframes and evaluating them against independent web evidence.',
      'Visual manipulation indicators are observational signals and do not represent absolute proof of generative AI synthesis or video tampering.',
    ];

    try {
      // 1. Binary Security & Format Validation
      const { format } = await videoSecurityService.validateVideoFile(
        input.filePath,
        input.originalFilename,
        input.declaredMimeType,
        input.fileSizeBytes
      );

      // 2. Metadata Extraction & Limit Enforcement
      const videoMetadata = await videoProcessingService.extractMetadata(
        input.filePath,
        format,
        input.fileSizeBytes
      );

      // 3. Keyframe Sampling & Deduplication
      const frameResult = await videoProcessingService.sampleKeyframes(
        input.filePath,
        videoMetadata
      );
      let keyframes = frameResult.keyframes;

      if (frameResult.deduplicatedCount > 0) {
        limitations.push(
          `Identified and consolidated ${frameResult.deduplicatedCount} duplicate/near-identical keyframes during timeline sampling.`
        );
      }

      // 4. Audio Extraction & Speech Transcription
      const transcript = await videoAudioService.processAudio(
        input.filePath,
        videoMetadata
      );

      // 5. Multimodal Visual Analysis & OCR on Keyframes
      const visualAnalysis = await videoAnalysisService.analyzeFrames(
        keyframes,
        videoMetadata
      );
      keyframes = visualAnalysis.updatedKeyframes;
      const ocrItems = visualAnalysis.extractedOcrText;
      const manipulationSignals = visualAnalysis.manipulationSignals;

      // 6. Multi-Source Claim Extraction & Prioritization
      const rawClaims = await videoClaimExtractor.extractVideoClaims(
        transcript,
        keyframes,
        ocrItems,
        input.userContext
      );

      // 7. Ground Each Claim against Independent Web Evidence (Stage 3/4 engine reuse)
      const verifiedClaims: VideoClaimVerificationResult[] = [];
      const allSupporting: EvidenceItem[] = [];
      const allContradicting: EvidenceItem[] = [];
      const allNeutral: EvidenceItem[] = [];
      const allContradictions: ContradictionAnalysisResult[] = [];

      for (const rc of rawClaims) {
        const queries = this.generateSearchQueries(rc.claim, rc.entities);
        const retrievedItems = await evidenceService.retrieveEvidence(queries, rc.claim);

        // Circular source exclusion: do not treat the submitted video/filename as external corroboration
        const independentItems = retrievedItems.filter((item) => {
          const lowerUrl = item.url.toLowerCase();
          const cleanName = input.originalFilename.toLowerCase().replace(/\.[a-z0-9]+$/, '');
          return !lowerUrl.includes(cleanName) && !lowerUrl.includes('localhost');
        });

        // Stance classification
        const classifiedEvidence = await contradictionService.classifyEvidenceStances(
          rc.claim,
          independentItems
        );

        const supporting = classifiedEvidence.filter((e) => e.stance === 'SUPPORTS');
        const contradicting = classifiedEvidence.filter((e) => e.stance === 'CONTRADICTS');
        const neutral = classifiedEvidence.filter((e) => e.stance === 'NEUTRAL' || e.stance === 'UNKNOWN');

        allSupporting.push(...supporting);
        allContradicting.push(...contradicting);
        allNeutral.push(...neutral);

        // Contradiction analysis
        const contradictionAnalysis = await contradictionService.analyzeContradictions(
          rc.claim,
          supporting,
          contradicting
        );
        allContradictions.push(contradictionAnalysis);

        // Deterministic claim score
        const scoring = trustScoringService.evaluateClaim({
          supporting,
          contradicting,
          neutral,
          contradictions: contradictionAnalysis,
        });

        verifiedClaims.push({
          claimId: rc.id,
          claim: rc.claim,
          source: rc.source,
          claimType: rc.claimType,
          importance: rc.importance,
          entities: rc.entities,
          event: rc.event,
          dateContext: rc.dateContext,
          locationContext: rc.locationContext,
          timestamps: rc.timestamps,
          verdict: scoring.verdict,
          trustScore: scoring.breakdown.overallScore,
          confidence: scoring.confidence,
          supportingEvidence: supporting,
          contradictingEvidence: contradicting,
          neutralEvidence: neutral,
          contradictions: contradictionAnalysis,
          searchQueries: queries,
          provenance: independentItems.map((item) => ({
            source: item.title,
            domain: item.domain,
            relationship: item.stance,
          })),
        });
      }

      // 8. Temporal Consistency Analysis
      const temporalAnalysis = await videoTemporalService.analyzeTemporalConsistency(
        transcript,
        keyframes,
        ocrItems,
        [...allSupporting, ...allContradicting],
        input.userContext
      );

      // 9. Context Recycling vs Pixel Authenticity Assessment
      const contextAnalysis = await videoContextService.evaluateContext(
        input.userContext,
        keyframes,
        [...allSupporting, ...allContradicting]
      );

      // 10. Deterministic Video Trust Score & Veto Calculation
      const hasUserContext = Boolean(input.userContext && input.userContext.trim().length > 0);
      const scoringOutcome = videoScoringService.evaluateVideo(
        verifiedClaims,
        temporalAnalysis,
        contextAnalysis,
        manipulationSignals,
        hasUserContext
      );

      // Deduplicate global evidence items by URL
      const uniqueSupporting = this.deduplicateEvidence(allSupporting);
      const uniqueContradicting = this.deduplicateEvidence(allContradicting);
      const uniqueNeutral = this.deduplicateEvidence(allNeutral);

      const result: VideoVerificationResult = {
        verificationId,
        inputType: 'VIDEO',
        videoMetadata,
        userContext: input.userContext || null,
        transcript,
        keyframes,
        claims: verifiedClaims,
        overallVerdict: scoringOutcome.verdict,
        verdict: scoringOutcome.verdict,
        trustScore: scoringOutcome.trustScore,
        confidence: scoringOutcome.confidence,
        summary: scoringOutcome.summary,
        reasoning: scoringOutcome.reasoning,
        supportingEvidence: uniqueSupporting,
        contradictingEvidence: uniqueContradicting,
        neutralEvidence: uniqueNeutral,
        contradictions: allContradictions,
        temporalAnalysis,
        contextAnalysis,
        manipulationSignals,
        provenance: verifiedClaims.flatMap((c) => c.provenance),
        limitations,
        createdAt: new Date().toISOString(),
      };

      // 11. Persist to Verification History
      if (input.userId) {
        await verificationHistoryService.saveVerification(
          input.userId,
          result as any,
          'VIDEO'
        );
      }

      return result;
    } finally {
      // 12. Guaranteed cleanup of uploaded temporary file (on success AND failure)
      videoSecurityService.cleanupTempFiles([input.filePath]);
    }
  }

  private generateSearchQueries(claim: string, entities: string[]): string[] {
    const queries: string[] = [claim];
    if (entities.length > 0) {
      queries.push(`${entities.slice(0, 3).join(' ')} fact check`);
    } else {
      queries.push(`${claim} fact check`);
    }
    return queries.slice(0, 3);
  }

  private deduplicateEvidence(items: EvidenceItem[]): EvidenceItem[] {
    const seen = new Set<string>();
    const out: EvidenceItem[] = [];
    for (const item of items) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        out.push(item);
      }
    }
    return out;
  }
}

export const videoVerificationService = new VideoVerificationService();
