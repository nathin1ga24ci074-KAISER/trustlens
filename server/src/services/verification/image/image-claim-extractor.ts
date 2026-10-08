import crypto from 'crypto';
import { aiService } from '../../ai';
import { RawVisualUnderstanding, ExtractedImageClaim } from './image.types';
import { ClaimImportance, ClaimSourceType, ClaimType } from '@trustlens/shared';
import { imageDiagnosticLogger } from './image-diagnostic.logger';

const CLAIM_EXTRACTION_SYSTEM_PROMPT = `You are the TrustLens Image Claim Formulation Specialist.
From visual analysis observations, visible OCR text, and user-provided context, formulate up to 4 central FALSIFIABLE EMPIRICAL CLAIMS that can be independently checked against web evidence.

CRITICAL RULES:
1. Distinguish the claim source:
   - "IMAGE_TEXT": Any claim derived from visible text, headlines, signs, or screenshot overlays visible in the image.
   - "IMAGE_VISUAL": Claim derived from directly observed scene, entities, or event depiction without text.
   - "USER_CONTEXT": Claim derived purely from user-submitted hypothesis not visible in the image.
2. If text is visibly present in the image (e.g. headline in screenshot), it MUST ALWAYS be assigned "IMAGE_TEXT", even if the user also submitted the same headline as context hypothesis!
3. Assign importance:
   - "PRIMARY": Central thesis or major claim.
   - "SUPPORTING": Corroborating empirical statement.
   - "MINOR": Secondary detail.
4. DO NOT formulate claims for subjective aesthetic opinions or trivial visual descriptions.
5. DO NOT accept user context as verified truth; formulate it as a falsifiable assertion.

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
   * Helper to check if a claim or hypothesis text originates from visible image text
   */
  isTextDerivedFromImage(claimText: string, visibleTexts: string[]): boolean {
    if (!visibleTexts || visibleTexts.length === 0) return false;
    const normClaim = claimText.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    for (const vt of visibleTexts) {
      const normVt = vt.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      if (normClaim.includes(normVt) || normVt.includes(normClaim)) return true;

      const claimWords = normClaim.split(/\s+/).filter((w) => w.length >= 4);
      const vtWords = new Set(normVt.split(/\s+/).filter((w) => w.length >= 4));
      if (claimWords.length >= 2) {
        const matchCount = claimWords.filter((w) => vtWords.has(w)).length;
        if (matchCount / claimWords.length >= 0.5) return true;
      }
    }
    return false;
  }

  /**
   * Formulate structured factual claims from visual understanding and context
   */
  async extractClaims(
    visual: RawVisualUnderstanding,
    userContext?: string,
    options?: { maxClaims?: number; verificationId?: string }
  ): Promise<ExtractedImageClaim[]> {
    const maxClaims = options?.maxClaims || 4;
    const vId = options?.verificationId || 'unknown-id';

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
    let claims: ExtractedImageClaim[] = [];
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

      const parsed = this.parseClaimsResponse(response.text, maxClaims, visual, userContext);
      if (parsed && parsed.length > 0) {
        claims = parsed;
      }
    } catch (err: any) {
      console.warn('[ImageClaimExtractor] AI claim formulation failed, using heuristic extraction:', err?.message || err);
    }

    // 3. Fallback to heuristic claim extraction if AI gave empty/invalid response
    if (claims.length === 0) {
      claims = this.createHeuristicClaims(visual, userContext, maxClaims);
    }

    imageDiagnosticLogger.log({
      verificationId: vId,
      stage: 'CLAIM_EXTRACTION',
      status: 'COMPLETED',
      message: `Formulated ${claims.length} claims`,
      data: {
        claimCount: claims.length,
        claims: claims.map((c) => ({
          claim: c.claim,
          source: c.source,
          importance: c.importance,
        })),
      },
    });

    return claims;
  }

  private parseClaimsResponse(
    rawText: string,
    maxClaims: number,
    visual: RawVisualUnderstanding,
    userContext?: string
  ): ExtractedImageClaim[] | null {
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

        // CRITICAL PROVENANCE ENFORCEMENT:
        // If the claim text originates from visible image text (e.g. headline in screenshot),
        // its source MUST be IMAGE_TEXT regardless of whether userContext also matches.
        let source: ClaimSourceType = ['IMAGE_VISUAL', 'IMAGE_TEXT', 'USER_CONTEXT'].includes(c.source)
          ? c.source
          : 'IMAGE_VISUAL';

        if (this.isTextDerivedFromImage(c.claim, visual.visibleText)) {
          source = 'IMAGE_TEXT';
        } else if (
          userContext &&
          userContext.trim().length > 5 &&
          !this.isTextDerivedFromImage(userContext, visual.visibleText) &&
          (c.claim.toLowerCase().includes(userContext.toLowerCase()) ||
            userContext.toLowerCase().includes(c.claim.toLowerCase()))
        ) {
          source = 'USER_CONTEXT';
        }

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

    // Priority 1: Text extracted directly from the image (OCR).
    // Screenshots or documents with visible text are primary empirical evidence carriers.
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

    // Priority 2: User Context hypothesis (only if distinct from visible image text)
    if (userContext && userContext.trim().length > 10 && claims.length < maxClaims) {
      const isAlreadyCoveredByImageText = this.isTextDerivedFromImage(userContext, visual.visibleText);

      // If user context is not already covered by visible image text, add as USER_CONTEXT claim
      if (!isAlreadyCoveredByImageText) {
        claims.push({
          id: crypto.randomUUID(),
          claim: userContext.trim(),
          claimType: 'EVENT',
          importance: claims.length === 0 ? 'PRIMARY' : 'SUPPORTING',
          source: 'USER_CONTEXT',
          entities: visual.entities.length > 0 ? visual.entities : [userContext.trim().slice(0, 40)],
          timeContext: visual.possibleDate,
          locationContext: visual.possibleLocation,
          verificationNeeded: true,
        });
      }
    }

    // Priority 3: Visual event or scene description (IMAGE_VISUAL)
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

    // Priority 4: General visual description (IMAGE_VISUAL)
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
