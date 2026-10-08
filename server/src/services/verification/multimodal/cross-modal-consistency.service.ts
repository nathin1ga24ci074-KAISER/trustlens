import {
  CrossModalConsistencyAnalysis,
  CrossModalConflict,
  CrossModalConsistencyVerdict,
  TextVerificationResult,
  UrlVerificationResult,
  ImageVerificationResult,
  VideoVerificationResult,
} from '@trustlens/shared';
import { aiService } from '../../ai';

export interface CrossModalInputs {
  textResult?: TextVerificationResult | null;
  urlResult?: UrlVerificationResult | null;
  imageResult?: ImageVerificationResult | null;
  videoResult?: VideoVerificationResult | null;
  userContextText?: string | null;
}

export class CrossModalConsistencyService {
  /**
   * Analyzes internal consistency across submitted modalities.
   * 
   * CRITICAL PRINCIPLE:
   * Cross-modal agreement is NOT independent external proof.
   * Agreement only indicates that the user-submitted inputs do not internally contradict each other.
   * Conflict (e.g. text claims Bengaluru, image depicts Mumbai, video dialogue says Delhi)
   * indicates unreliable, fabricated, or misattributed input.
   */
  async analyzeConsistency(inputs: CrossModalInputs): Promise<CrossModalConsistencyAnalysis> {
    const presentModalities: ('TEXT' | 'URL' | 'IMAGE' | 'VIDEO')[] = [];
    if (inputs.textResult) presentModalities.push('TEXT');
    if (inputs.urlResult) presentModalities.push('URL');
    if (inputs.imageResult) presentModalities.push('IMAGE');
    if (inputs.videoResult) presentModalities.push('VIDEO');

    if (presentModalities.length <= 1) {
      return {
        verdict: 'CONSISTENT',
        details: 'Single modality submitted; internal cross-modal consistency check passed by default.',
        conflicts: [],
      };
    }

    const conflicts: CrossModalConflict[] = [];

    // 1. Gather Context & Claims per Modality
    const textClaim = inputs.textResult?.claim || inputs.userContextText || null;
    const urlTitle = inputs.urlResult?.page?.title || null;
    const urlClaims = inputs.urlResult?.claims?.map((c) => c.claim) || [];
    const imageDesc = inputs.imageResult?.visualAnalysis?.description || null;
    const imageLocation = inputs.imageResult?.contextAssessment?.claimedLocation || null;
    const imageDate = inputs.imageResult?.contextAssessment?.claimedDate || null;
    const imageContextVerdict = inputs.imageResult?.contextAssessment?.verdict || null;
    const videoDesc = inputs.videoResult?.summary || null;
    const videoTranscript = inputs.videoResult?.transcript?.fullTranscript || null;
    const videoTemporalVerdict = inputs.videoResult?.temporalAnalysis?.verdict || null;
    const videoContextVerdict = inputs.videoResult?.contextAnalysis?.verdict || null;

    // 2. Heuristic Cross-Checks (Location, Date, Narrative Discordance)
    // Check if Image or Video has context mismatch
    if (imageContextVerdict === 'MISMATCH' && textClaim) {
      conflicts.push({
        type: 'EVENT_MISMATCH',
        description: `Image visual context conflicts with submitted text claim: "${textClaim}"`,
        modalitiesInvolved: ['TEXT', 'IMAGE'],
        severity: 'SEVERE',
      });
    }

    if (videoContextVerdict === 'MISMATCH' && textClaim) {
      conflicts.push({
        type: 'EVENT_MISMATCH',
        description: `Video context attribution conflicts with submitted text claim: "${textClaim}"`,
        modalitiesInvolved: ['TEXT', 'VIDEO'],
        severity: 'SEVERE',
      });
    }

    if (videoTemporalVerdict === 'TEMPORAL_INCONSISTENT') {
      conflicts.push({
        type: 'NARRATIVE_CONTRADICTION',
        description: 'Video contains internal temporal progression or narrative sequence contradictions.',
        modalitiesInvolved: ['VIDEO'],
        severity: 'MODERATE',
      });
    }

    // Heuristic date mismatch cross-check
    const dateRegex = /\b(19\d\d|20\d\d)\b/g;
    const textDates = textClaim ? textClaim.match(dateRegex) : null;
    const videoDate = inputs.videoResult?.contextAnalysis?.claimedDate || inputs.videoResult?.temporalAnalysis?.details;
    if (textDates && videoDate) {
      const vidYearMatch = videoDate.match(dateRegex);
      if (vidYearMatch && !textDates.includes(vidYearMatch[0])) {
        conflicts.push({
          type: 'DATE_MISMATCH',
          description: `Temporal mismatch: Text refers to ${textDates.join(', ')} while video context indicates ${videoDate}`,
          modalitiesInvolved: ['TEXT', 'VIDEO'],
          severity: 'SEVERE',
        });
      }
    }

    // 3. AI Cross-Examination (if AI available)
    const hasAiConfigured =
      aiService.getProvider('gemini').isConfigured() ||
      aiService.getProvider('groq').isConfigured();
    if (hasAiConfigured) {
      try {
        const prompt = `You are a forensic cross-modal intelligence investigator.
Analyze whether the submitted multimodal inputs internally contradict each other.

Inputs:
${textClaim ? `- TEXT CLAIM: ${textClaim}` : ''}
${urlTitle ? `- URL ARTICLE: ${urlTitle}. Claims: ${urlClaims.slice(0, 2).join('; ')}` : ''}
${imageDesc ? `- IMAGE CONTENT: ${imageDesc}. Location: ${imageLocation || 'unspecified'}. Date: ${imageDate || 'unspecified'}` : ''}
${videoTranscript ? `- VIDEO TRANSCRIPT / NARRATION: ${videoTranscript.slice(0, 300)}` : ''}

Evaluate:
1. Location mismatch: Does one input say City A while another depicts City B?
2. Date mismatch: Does one input assert Year X while another shows Year Y?
3. Event mismatch: Does one input claim an event occurred while another contradicts it?

Output ONLY a JSON object:
{
  "verdict": "CONSISTENT" | "INCONSISTENT" | "INCONCLUSIVE",
  "details": "Clear factual explanation of internal alignment or conflict across the inputs",
  "conflicts": [
    {
      "type": "LOCATION_MISMATCH" | "DATE_MISMATCH" | "EVENT_MISMATCH" | "NARRATIVE_CONTRADICTION",
      "description": "Specific discrepancy between inputs",
      "modalitiesInvolved": ["TEXT", "IMAGE"],
      "severity": "MINOR" | "MODERATE" | "SEVERE"
    }
  ]
}`;

        const response = await aiService.generateText({
          prompt,
          temperature: 0.1,
          maxTokens: 500,
        });

        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.conflicts) && parsed.conflicts.length > 0) {
            for (const c of parsed.conflicts) {
              if (!conflicts.some((existing) => existing.description === c.description)) {
                conflicts.push({
                  type: c.type || 'NARRATIVE_CONTRADICTION',
                  description: c.description,
                  modalitiesInvolved: c.modalitiesInvolved || presentModalities,
                  severity: c.severity || 'MODERATE',
                });
              }
            }
          }

          const finalVerdict: CrossModalConsistencyVerdict =
            conflicts.length === 0
              ? 'CONSISTENT'
              : conflicts.some((c) => c.severity === 'SEVERE')
              ? 'INCONSISTENT'
              : parsed.verdict || 'INCONCLUSIVE';

          return {
            verdict: finalVerdict,
            details: parsed.details || (finalVerdict === 'CONSISTENT'
              ? 'Submitted modalities are internally consistent.'
              : 'Discrepancies detected between submitted inputs.'),
            conflicts,
          };
        }
      } catch (err: any) {
        console.warn('[CrossModalConsistencyService] AI consistency check failed, using heuristic results:', err.message);
      }
    }

    // Heuristic fallback verdict
    const hasSevere = conflicts.some((c) => c.severity === 'SEVERE');
    const verdict: CrossModalConsistencyVerdict =
      conflicts.length === 0 ? 'CONSISTENT' : hasSevere ? 'INCONSISTENT' : 'INCONCLUSIVE';

    return {
      verdict,
      details:
        verdict === 'CONSISTENT'
          ? 'Submitted modalities are internally aligned.'
          : `Discrepancies detected across modalities (${conflicts.map((c) => c.type).join(', ')}). Note: internal agreement does not constitute independent external proof.`,
      conflicts,
    };
  }
}

export const crossModalConsistencyService = new CrossModalConsistencyService();
