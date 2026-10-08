import crypto from 'crypto';
import {
  MultimodalVerificationResult,
  TextVerificationResult,
  UrlVerificationResult,
  ImageVerificationResult,
  VideoVerificationResult,
  EvidenceItem,
  ContradictionAnalysisResult,
  MultimodalInputsProvided,
} from '@trustlens/shared';
import { textVerificationService } from '../../text';
import { urlVerificationService } from '../url';
import { imageVerificationService } from '../image';
import { videoVerificationService, demoReelsService } from '../video';
import { claimFusionService } from './claim-fusion.service';
import { crossModalConsistencyService } from './cross-modal-consistency.service';
import { multimodalScoringService } from './multimodal-scoring.service';
import { verificationHistoryService } from '../verification-history.service';

export interface VerifyMultimodalInput {
  text?: string;
  url?: string;
  imageFile?: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
  };
  videoFile?: {
    filePath: string;
    originalFilename: string;
    mimeType?: string;
    sizeBytes: number;
  };
  demoId?: string;
  userId?: string;
}

export class MultimodalVerificationService {
  /**
   * Orchestrates unified multimodal verification across all available inputs.
   * 
   * Reuses existing Stage 3 (Text), Stage 4 (URL), Stage 5 (Image), and Stage 6 (Video) engines.
   * Merges extracted claims through the claim fusion layer to prevent double-counting.
   * Conducts cross-modal consistency analysis and calculates a unified deterministic score.
   */
  async verifyMultimodal(input: VerifyMultimodalInput): Promise<MultimodalVerificationResult> {
    const verificationId = crypto.randomUUID();
    const limitations: string[] = [
      'User-provided text, images, and videos are treated as unverified inputs/hypotheses, not independent proof.',
      'TrustLens cross-references all claims against independent external web evidence.',
    ];

    let textResult: TextVerificationResult | null = null;
    let urlResult: UrlVerificationResult | null = null;
    let imageResult: ImageVerificationResult | null = null;
    let videoResult: VideoVerificationResult | null = null;

    const effectiveUserId = input.userId || 'system';

    // 1. Execute Text Claim Verification (if provided)
    if (input.text && input.text.trim().length > 3) {
      try {
        textResult = await textVerificationService.verifyText(input.text.trim(), effectiveUserId);
      } catch (err: any) {
        console.warn('[MultimodalVerificationService] Text verification step failed:', err.message);
        limitations.push(`Text verification encountered: ${err.message}`);
      }
    }

    // 2. Execute URL Verification (if provided)
    if (input.url && input.url.trim().length > 5) {
      try {
        urlResult = await urlVerificationService.verifyUrl(input.url.trim(), effectiveUserId);
      } catch (err: any) {
        console.warn('[MultimodalVerificationService] URL verification step failed:', err.message);
        limitations.push(`URL verification encountered: ${err.message}`);
      }
    }

    // 3. Execute Image Verification (if provided)
    if (input.imageFile && input.imageFile.buffer.length > 0) {
      try {
        imageResult = await imageVerificationService.verifyImage({
          buffer: input.imageFile.buffer,
          declaredMimeType: input.imageFile.mimeType || 'image/jpeg',
          originalFilename: input.imageFile.originalFilename,
          userContext: input.text,
          userId: effectiveUserId,
        });
      } catch (err: any) {
        console.warn('[MultimodalVerificationService] Image verification step failed:', err.message);
        limitations.push(`Image verification encountered: ${err.message}`);
      }
    }

    // 4. Execute Video / Demo Reel Verification (if provided)
    let videoPathToProcess = input.videoFile?.filePath;
    let videoFilename = input.videoFile?.originalFilename || 'video.mp4';
    let videoMime = input.videoFile?.mimeType;
    let videoSize = input.videoFile?.sizeBytes || 0;

    if (!videoPathToProcess && input.demoId) {
      const demoPath = demoReelsService.getDemoReelFilePath(input.demoId);
      if (demoPath) {
        videoPathToProcess = demoPath;
        videoFilename = `${input.demoId}.mp4`;
        videoMime = 'video/mp4';
        videoSize = 1000;
      }
    }

    if (videoPathToProcess) {
      try {
        videoResult = await videoVerificationService.verifyVideo({
          filePath: videoPathToProcess,
          originalFilename: videoFilename,
          declaredMimeType: videoMime,
          fileSizeBytes: videoSize,
          userContext: input.text,
          userId: effectiveUserId,
        });
      } catch (err: any) {
        console.warn('[MultimodalVerificationService] Video verification step failed:', err.message);
        limitations.push(`Video verification encountered: ${err.message}`);
      }
    }

    // 5. Multimodal Claim Fusion
    const fusedClaims = claimFusionService.fuseClaims({
      textResult,
      urlResult,
      imageResult,
      videoResult,
      userContextText: input.text,
    });

    // 6. Cross-Modal Consistency Analysis
    const crossModalConsistency = await crossModalConsistencyService.analyzeConsistency({
      textResult,
      urlResult,
      imageResult,
      videoResult,
      userContextText: input.text,
    });

    // 7. Deterministic Unified Scoring
    const scoringOutcome = multimodalScoringService.evaluate(fusedClaims, crossModalConsistency);

    // 8. Deduplicate Evidence & Contradictions across Modalities
    const allSupporting = [
      ...(textResult?.supportingEvidence || []),
      ...(urlResult?.claims ? urlResult.claims.flatMap((c) => c.supportingEvidence || []) : []),
      ...(imageResult?.claims ? imageResult.claims.flatMap((c) => c.supportingEvidence || []) : []),
      ...(videoResult?.supportingEvidence || []),
    ];
    const allContradicting = [
      ...(textResult?.contradictingEvidence || []),
      ...(urlResult?.claims ? urlResult.claims.flatMap((c) => c.contradictingEvidence || []) : []),
      ...(imageResult?.claims ? imageResult.claims.flatMap((c) => c.contradictingEvidence || []) : []),
      ...(videoResult?.contradictingEvidence || []),
    ];
    const allNeutral = [
      ...(textResult?.neutralEvidence || []),
      ...(urlResult?.claims ? urlResult.claims.flatMap((c) => c.neutralEvidence || []) : []),
      ...(imageResult?.claims ? imageResult.claims.flatMap((c) => c.neutralEvidence || []) : []),
      ...(videoResult?.neutralEvidence || []),
    ];

    const deduplicateEvidence = (items: EvidenceItem[]): EvidenceItem[] => {
      const seen = new Set<string>();
      const out: EvidenceItem[] = [];
      for (const item of items) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          out.push(item);
        }
      }
      return out;
    };

    const uniqueSupporting = deduplicateEvidence(allSupporting);
    const uniqueContradicting = deduplicateEvidence(allContradicting);
    const uniqueNeutral = deduplicateEvidence(allNeutral);

    const allContradictions: ContradictionAnalysisResult[] = [];
    if (textResult?.contradictions?.hasContradiction) {
      allContradictions.push(textResult.contradictions);
    }
    if (urlResult?.claims) {
      allContradictions.push(
        ...urlResult.claims
          .map((c) => c.contradictions)
          .filter((c): c is ContradictionAnalysisResult => Boolean(c && c.hasContradiction))
      );
    }
    if (imageResult?.claims) {
      allContradictions.push(
        ...imageResult.claims
          .map((c) => c.contradictions)
          .filter((c): c is ContradictionAnalysisResult => Boolean(c && c.hasContradiction))
      );
    }
    if (videoResult?.contradictions) {
      allContradictions.push(...videoResult.contradictions.filter((c) => c && c.hasContradiction));
    }

    // 9. Synthesize Provenance
    const provenance = [
      ...(textResult?.provenance || []),
      ...(urlResult?.claims ? urlResult.claims.flatMap((c) => c.provenance || []) : []),
      ...(imageResult?.claims ? imageResult.claims.flatMap((c) => c.provenance || []) : []),
      ...(videoResult?.provenance || []),
    ];

    const inputsProvided: MultimodalInputsProvided = {
      text: input.text || null,
      url: input.url || null,
      hasImage: Boolean(input.imageFile),
      hasVideo: Boolean(input.videoFile || input.demoId),
      demoId: input.demoId || null,
      imageFilename: input.imageFile?.originalFilename || null,
      videoFilename: input.videoFile?.originalFilename || (input.demoId ? `${input.demoId}.mp4` : null),
    };

    const result: MultimodalVerificationResult = {
      verificationId,
      inputType: 'MULTIMODAL',
      inputsProvided,
      overallVerdict: scoringOutcome.verdict,
      verdict: scoringOutcome.verdict,
      trustScore: scoringOutcome.trustScore,
      confidence: scoringOutcome.confidence,
      summary: scoringOutcome.summary,
      reasoning: scoringOutcome.reasoning,
      claims: fusedClaims,
      supportingEvidence: uniqueSupporting,
      contradictingEvidence: uniqueContradicting,
      neutralEvidence: uniqueNeutral,
      contradictions: allContradictions,
      crossModalConsistency,
      provenance,
      limitations,
      createdAt: new Date().toISOString(),
      modalityResults: {
        ...(textResult ? { text: textResult } : {}),
        ...(urlResult ? { url: urlResult } : {}),
        ...(imageResult ? { image: imageResult } : {}),
        ...(videoResult ? { video: videoResult } : {}),
      },
    };

    // 10. Persist to Verification History
    if (input.userId) {
      await verificationHistoryService.saveVerification(
        input.userId,
        result as any,
        'MULTIMODAL'
      );
    }

    return result;
  }
}

export const multimodalVerificationService = new MultimodalVerificationService();
