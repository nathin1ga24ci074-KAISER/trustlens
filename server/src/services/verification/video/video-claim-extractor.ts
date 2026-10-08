import {
  VideoTranscriptAnalysis,
  VideoKeyframe,
  ClaimImportance,
  ClaimType,
  VideoClaimSource,
} from '@trustlens/shared';
import { aiService } from '../../ai';

export interface RawVideoClaim {
  id: string;
  claim: string;
  source: VideoClaimSource;
  claimType: ClaimType;
  importance: ClaimImportance;
  entities: string[];
  event?: string | null;
  dateContext?: string | null;
  locationContext?: string | null;
  timestamps: number[];
  verificationNeeded: boolean;
}

export class VideoClaimExtractor {
  /**
   * Synthesize and prioritize factual claims from audio transcript, visual frames, OCR text, and user context
   */
  async extractVideoClaims(
    transcript: VideoTranscriptAnalysis,
    keyframes: VideoKeyframe[],
    ocrItems: { timestamp: number; text: string }[],
    userContext?: string
  ): Promise<RawVideoClaim[]> {
    const claims: RawVideoClaim[] = [];

    // 1. Incorporate User Context as hypothesis (if provided)
    if (userContext && userContext.trim().length > 5) {
      claims.push({
        id: 'claim_ctx_1',
        claim: userContext.trim(),
        source: 'USER_CONTEXT',
        claimType: 'EVENT',
        importance: 'PRIMARY',
        entities: this.extractBasicEntities(userContext),
        timestamps: [],
        verificationNeeded: true,
      });
    }

    // 2. Synthesize claims via AI
    const candidateInputs = {
      userContext: userContext || null,
      transcript: transcript.transcriptAvailable ? transcript.fullTranscript.slice(0, 1000) : null,
      ocrText: ocrItems.map((o) => `[${o.timestamp}s]: ${o.text}`).slice(0, 10),
      visualObservations: keyframes
        .filter((k) => k.observed && k.observed.length > 0)
        .map((k) => `[${k.timestampSeconds}s]: ${k.observed.join('; ')}`)
        .slice(0, 5),
    };

    const systemPrompt = `You are an expert factual claim extractor for video analysis.
Extract up to 3 central, verifiable factual claims made by or depicted in the video.
Rules:
- Label source accurately: "VIDEO_AUDIO" for spoken claims, "VIDEO_VISUAL" for visible actions/phenomena, "VIDEO_TEXT" for OCR text.
- Assign importance: "PRIMARY" (central claim/thesis), "SUPPORTING" (corroborating fact), "MINOR" (auxiliary detail).
- Focus strictly on empirical claims that can be checked with independent web evidence (events, names, statistics, dates, locations).
- Avoid opinions, casual greetings, or vague remarks.

Output ONLY a JSON array of objects:
[
  {
    "claim": "Clear standalone factual sentence",
    "source": "VIDEO_AUDIO" | "VIDEO_VISUAL" | "VIDEO_TEXT",
    "claimType": "FACTUAL" | "EVENT" | "SCIENTIFIC" | "STATISTICAL" | "HISTORICAL" | "GEOGRAPHICAL",
    "importance": "PRIMARY" | "SUPPORTING" | "MINOR",
    "entities": ["entity1", "entity2"],
    "event": "event name or null",
    "dateContext": "date or null",
    "locationContext": "location or null",
    "timestamps": [number]
  }
]`;

    try {
      const response = await aiService.generateText({
        prompt: `Video Evidence Data:\n${JSON.stringify(candidateInputs, null, 2)}`,
        systemPrompt,
        temperature: 0.1,
      });

      const parsed = this.safeParseJson(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let count = 1;
        for (const item of parsed) {
          if (item && typeof item.claim === 'string' && item.claim.trim().length > 10) {
            // If userContext was already PRIMARY, mark subsequent claims as SUPPORTING or PRIMARY as appropriate
            const importance: ClaimImportance =
              item.importance === 'PRIMARY' || item.importance === 'SUPPORTING' || item.importance === 'MINOR'
                ? item.importance
                : 'SUPPORTING';

            claims.push({
              id: `claim_${count++}`,
              claim: item.claim.trim(),
              source: this.mapSource(item.source),
              claimType: this.mapClaimType(item.claimType),
              importance,
              entities: Array.isArray(item.entities) ? item.entities.map(String) : [],
              event: item.event || null,
              dateContext: item.dateContext || null,
              locationContext: item.locationContext || null,
              timestamps: Array.isArray(item.timestamps) ? item.timestamps.map(Number) : [],
              verificationNeeded: true,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[VideoClaimExtractor] AI claim extraction failed, using heuristic extraction:', err.message);
    }

    // 3. Fallback heuristic claims if AI returned nothing
    if (claims.length === 0) {
      if (transcript.transcriptAvailable && transcript.fullTranscript.length > 15) {
        claims.push({
          id: 'claim_audio_1',
          claim: transcript.fullTranscript.slice(0, 150).trim(),
          source: 'VIDEO_AUDIO',
          claimType: 'FACTUAL',
          importance: 'PRIMARY',
          entities: this.extractBasicEntities(transcript.fullTranscript),
          timestamps: [0],
          verificationNeeded: true,
        });
      } else if (ocrItems.length > 0) {
        claims.push({
          id: 'claim_ocr_1',
          claim: ocrItems[0].text,
          source: 'VIDEO_TEXT',
          claimType: 'FACTUAL',
          importance: 'PRIMARY',
          entities: this.extractBasicEntities(ocrItems[0].text),
          timestamps: [ocrItems[0].timestamp],
          verificationNeeded: true,
        });
      } else {
        claims.push({
          id: 'claim_visual_1',
          claim: 'Visual video recording depicts physical activity in recorded scene.',
          source: 'VIDEO_VISUAL',
          claimType: 'EVENT',
          importance: 'PRIMARY',
          entities: [],
          timestamps: [0],
          verificationNeeded: true,
        });
      }
    }

    // Limit to max 4 claims total
    return claims.slice(0, 4);
  }

  private mapSource(raw: any): VideoClaimSource {
    if (raw === 'VIDEO_AUDIO') return 'VIDEO_AUDIO';
    if (raw === 'VIDEO_TEXT') return 'VIDEO_TEXT';
    return 'VIDEO_VISUAL';
  }

  private mapClaimType(raw: any): ClaimType {
    const valid: ClaimType[] = [
      'FACTUAL',
      'STATISTICAL',
      'HISTORICAL',
      'SCIENTIFIC',
      'POLITICAL',
      'EVENT',
      'GEOGRAPHICAL',
    ];
    if (valid.includes(raw)) return raw;
    return 'FACTUAL';
  }

  private extractBasicEntities(text: string): string[] {
    const words = text.split(/\s+/);
    return words
      .filter((w) => /^[A-Z][a-z]{2,}/.test(w))
      .map((w) => w.replace(/[^\w]/g, ''))
      .slice(0, 5);
  }

  private safeParseJson(raw: string): any {
    try {
      let clean = raw.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      else if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      return JSON.parse(clean.trim());
    } catch {
      return null;
    }
  }
}

export const videoClaimExtractor = new VideoClaimExtractor();
