import crypto from 'crypto';
import { aiService } from '../../ai';
import { RawVisualUnderstanding, ExtractedImageClaim } from './image.types';
import { ClaimImportance, ClaimSourceType, ClaimType } from '@trustlens/shared';

const CLAIM_EXTRACTION_SYSTEM_PROMPT = `You are the TrustLens Image Claim Formulation Specialist.
From visual analysis observations, visible OCR text, and user-provided context, formulate up to 4 central FALSIFIABLE EMPIRICAL CLAIMS that can be independently checked against web evidence.

CRITICAL RULES:
1. Distinguish the claim source:
   - "IMAGE_VISUAL": Claim derived from directly observed scene, entities, or event depiction.
   - "IMAGE_TEXT": Claim derived from visible text, headlines, signs, or screenshot overlays.
   - "USER_CONTEXT": Claim derived from user hypothesis (e.g., "User claims this is flood in Bengaluru").
2. Assign importance:
   - "PRIMARY": Central thesis or major claim.
   - "SUPPORTING": Corroborating empirical statement.
   - "MINOR": Secondary detail.
3. DO NOT formulate claims for subjective aesthetic opinions or trivial visual descriptions.
4. DO NOT accept user context as verified truth; formulate it as a falsifiable assertion.

OUTPUT JSON FORMAT ONLY:
{
  "claims": [
    {
      "claim": "Clear empirical factual statement",
      "claimType": "FACTUAL" | "EVENT" | "GEOGRAPHICAL" | "STATISTICAL" | "SCIENTIFIC" | "POLITICAL",
      "importance": "PRIMARY" | "SUPPORTING" | "MINOR",
      "source": "IMAGE_VISUAL" | "IMAGE_TEXT" | "USER_CONTEXT",
      "entities": ["entity1", "entity2"],
      "timeContext": "timeframe or null",
      "locationContext": "location or null",
      "verificationNeeded": true
    }
  ]
}`;

export class ImageClaimExtractor {
  /**
   * Formulate structured factual claims from visual understanding and context
   */
  async extractClaims(
    visual: RawVisualUnderstanding,
    userContext?: string,
    options?: { maxClaims?: number }
  ): Promise<ExtractedImageClaim[]> {
    const maxClaims = options?.maxClaims || 4;

    // 1. Prepare structured input context
    const inputContext = {
      description: visual.description,
      classification: visual.classification,
      visibleText: visual.visibleText,
      entities: visual.entities,
      scene: visual.scene,
      possibleEvent: visual.possibleEvent,
      possibleLocation: visual.possibleLocation,
      possibleDate: visual.possibleDate,
      observations: visual.observations,
      userProvidedContext: userContext || null,
    };

    // 2. Attempt AI-driven structured claim generation
    try {
      const prompt = `Synthesize verifiable factual claims from this image data:\n${JSON.stringify(
        inputContext,
        null,
        2
      )}`;

      const response = await aiService.generateText({
        prompt,
        systemPrompt: CLAIM_EXTRACTION_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 1024,
      });

      const parsed = this.parseClaimsResponse(response.text, maxClaims);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch (err: any) {
      console.warn('[ImageClaimExtractor] AI claim formulation failed, using heuristic extraction:', err?.message || err);
    }

    // 3. Heuristic fallback claim extraction
    return this.createHeuristicClaims(visual, userContext, maxClaims);
  }

  private parseClaimsResponse(rawText: string, maxClaims: number): ExtractedImageClaim[] | null {
    if (!rawText) return null;

    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      }

      const parsed = JSON.parse(cleaned);
      if (!parsed || !Array.isArray(parsed.claims)) return null;

      const results: ExtractedImageClaim[] = [];

      for (const c of parsed.claims.slice(0, maxClaims)) {
        if (!c.claim || typeof c.claim !== 'string' || c.claim.trim().length < 5) continue;

        const importance: ClaimImportance = ['PRIMARY', 'SUPPORTING', 'MINOR'].includes(c.importance)
          ? c.importance
          : results.length === 0
          ? 'PRIMARY'
          : 'SUPPORTING';

        const source: ClaimSourceType = ['IMAGE_VISUAL', 'IMAGE_TEXT', 'USER_CONTEXT'].includes(c.source)
          ? c.source
          : 'IMAGE_VISUAL';

        const claimType: ClaimType = [
          'FACTUAL',
          'EVENT',
          'GEOGRAPHICAL',
          'STATISTICAL',
          'SCIENTIFIC',
          'POLITICAL',
        ].includes(c.claimType)
          ? c.claimType
          : 'FACTUAL';

        results.push({
          id: crypto.randomUUID(),
          claim: c.claim.trim(),
          claimType,
          importance,
          source,
          entities: Array.isArray(c.entities) ? c.entities : [],
          timeContext: c.timeContext || null,
          locationContext: c.locationContext || null,
          verificationNeeded: c.verificationNeeded !== false,
        });
      }

      return results;
    } catch {
      return null;
    }
  }

  private createHeuristicClaims(
    visual: RawVisualUnderstanding,
    userContext?: string,
    maxClaims: number = 4
  ): ExtractedImageClaim[] {
    const claims: ExtractedImageClaim[] = [];

    // A. Priority 1: User Context claim (verification hypothesis)
    if (userContext && userContext.trim().length > 10) {
      claims.push({
        id: crypto.randomUUID(),
        claim: userContext.trim(),
        claimType: 'EVENT',
        importance: 'PRIMARY',
        source: 'USER_CONTEXT',
        entities: visual.entities.length > 0 ? visual.entities : [userContext.trim().slice(0, 40)],
        timeContext: visual.possibleDate,
        locationContext: visual.possibleLocation,
        verificationNeeded: true,
      });
    }

    // B. Priority 2: Text extracted from image (e.g. screenshot or headline)
    if (visual.visibleText && visual.visibleText.length > 0) {
      for (const text of visual.visibleText) {
        if (claims.length >= maxClaims) break;
        if (text.length > 15 && !claims.some((c) => c.claim === text)) {
          claims.push({
            id: crypto.randomUUID(),
            claim: text.trim(),
            claimType: visual.classification === 'SCREENSHOT' ? 'EVENT' : 'FACTUAL',
            importance: claims.length === 0 ? 'PRIMARY' : 'SUPPORTING',
            source: 'IMAGE_TEXT',
            entities: visual.entities,
            timeContext: visual.possibleDate,
            locationContext: visual.possibleLocation,
            verificationNeeded: true,
          });
        }
      }
    }

    // C. Priority 3: Visual event or scene description
    if (claims.length < maxClaims && visual.possibleEvent) {
      claims.push({
        id: crypto.randomUUID(),
        claim: `The image portrays ${visual.possibleEvent}${visual.possibleLocation ? ` at ${visual.possibleLocation}` : ''}.`,
        claimType: 'EVENT',
        importance: claims.length === 0 ? 'PRIMARY' : 'SUPPORTING',
        source: 'IMAGE_VISUAL',
        entities: visual.entities,
        timeContext: visual.possibleDate,
        locationContext: visual.possibleLocation,
        verificationNeeded: true,
      });
    }

    // D. Priority 4: General visual description
    if (claims.length === 0 && visual.description) {
      claims.push({
        id: crypto.randomUUID(),
        claim: visual.description,
        claimType: 'FACTUAL',
        importance: 'PRIMARY',
        source: 'IMAGE_VISUAL',
        entities: visual.entities,
        timeContext: null,
        locationContext: null,
        verificationNeeded: true,
      });
    }

    return claims.slice(0, maxClaims);
  }
}

export const imageClaimExtractor = new ImageClaimExtractor();
