import crypto from 'crypto';
import { UrlExtractedClaim, ClaimType, ClaimImportance } from '@trustlens/shared';
import { aiService } from '../../ai';

export interface ExtractUrlClaimsOptions {
  maxClaims?: number;
}

const DEFAULT_MAX_CLAIMS = 4;

export class UrlClaimExtractor {
  /**
   * Extract prioritized, verifiable factual claims from an article
   */
  async extractClaims(
    headline: string,
    paragraphs: string[],
    options?: ExtractUrlClaimsOptions
  ): Promise<UrlExtractedClaim[]> {
    const maxClaims = options?.maxClaims || DEFAULT_MAX_CLAIMS;

    if (!paragraphs || paragraphs.length === 0) {
      return [];
    }

    // Combine top representative paragraphs (up to ~6000 chars)
    const contextBody = paragraphs.slice(0, 10).join('\n\n');

    const systemPrompt = `You are an expert fact-checking analyst extracting empirical claims from news and web articles.
Your task is to identify up to ${maxClaims} of the MOST IMPORTANT, factual, verifiable empirical claims made in this text.

Guidelines:
1. Focus on the central assertions of the article (the primary story or headline claim first).
2. Distinguish empirical claims from opinions, commentary, speculation, and value judgments. Only extract claims that can be empirically verified against independent web evidence.
3. Categorize importance:
   - "PRIMARY": The core central thesis or main event the article is about.
   - "SUPPORTING": Key supporting data, quotes, scientific findings, or official statements.
   - "MINOR": Secondary background details or minor assertions.
4. Categorize claimType: "SCIENTIFIC", "HISTORICAL", "STATISTICAL", "POLITICAL", "MEDICAL", "EVENT", "ECONOMIC", "QUOTE", or "FACTUAL".

Respond ONLY with a valid JSON array of claim objects matching this schema:
[
  {
    "claim": "concise, self-contained factual assertion",
    "claimType": "SCIENTIFIC" | "HISTORICAL" | "STATISTICAL" | "POLITICAL" | "MEDICAL" | "EVENT" | "ECONOMIC" | "QUOTE" | "FACTUAL",
    "importance": "PRIMARY" | "SUPPORTING" | "MINOR",
    "entities": ["key entities, organizations, people, locations"],
    "timeContext": "timeframe or null",
    "locationContext": "location or null",
    "sourceParagraphIndex": 0,
    "verificationNeeded": true
  }
]`;

    const prompt = `ARTICLE HEADLINE: "${headline}"

ARTICLE BODY:
${contextBody}

Extract the top ${maxClaims} verifiable claims as a JSON array:`;

    try {
      const response = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature: 0.1,
        maxTokens: 1200,
      });

      const parsed = this.parseClaimsJson(response.text, paragraphs);
      if (parsed.length > 0) {
        return parsed.slice(0, maxClaims);
      }
    } catch (err: any) {
      console.warn('[UrlClaimExtractor] AI claim extraction encountered error:', err?.message || err);
    }

    // Fallback: heuristic extraction from headline and first substantive paragraphs
    return this.fallbackHeuristicExtraction(headline, paragraphs, maxClaims);
  }

  private parseClaimsJson(rawJson: string, paragraphs: string[]): UrlExtractedClaim[] {
    const match = rawJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) return [];

    try {
      const items = JSON.parse(match[0]);
      if (!Array.isArray(items)) return [];

      const validClaimTypes = new Set([
        'FACTUAL',
        'STATISTICAL',
        'HISTORICAL',
        'SCIENTIFIC',
        'POLITICAL',
        'ECONOMIC',
        'MEDICAL',
        'EVENT',
        'QUOTE',
        'GEOGRAPHICAL',
        'PRODUCT',
        'GENERAL_FACT',
      ]);

      return items
        .filter((item) => typeof item.claim === 'string' && item.claim.trim().length > 10)
        .map((item, idx) => {
          const importance: ClaimImportance =
            item.importance === 'PRIMARY' || idx === 0
              ? 'PRIMARY'
              : item.importance === 'MINOR'
              ? 'MINOR'
              : 'SUPPORTING';

          const claimType: ClaimType = validClaimTypes.has(item.claimType) ? item.claimType : 'FACTUAL';

          const pIdx = typeof item.sourceParagraphIndex === 'number' ? item.sourceParagraphIndex : 0;
          const sourceParagraph = paragraphs[pIdx] || paragraphs[0] || null;

          return {
            id: crypto.randomUUID(),
            claim: item.claim.trim(),
            claimType,
            importance,
            entities: Array.isArray(item.entities) ? item.entities.filter((e: any) => typeof e === 'string') : [],
            timeContext: item.timeContext || null,
            locationContext: item.locationContext || null,
            sourceParagraph,
            verificationNeeded: typeof item.verificationNeeded === 'boolean' ? item.verificationNeeded : true,
          };
        });
    } catch {
      return [];
    }
  }

  private fallbackHeuristicExtraction(
    headline: string,
    paragraphs: string[],
    maxClaims: number
  ): UrlExtractedClaim[] {
    const claims: UrlExtractedClaim[] = [];

    // Headline is treated as Primary claim if substantive
    if (headline && headline.trim().length > 15) {
      claims.push({
        id: crypto.randomUUID(),
        claim: headline.trim(),
        claimType: 'FACTUAL',
        importance: 'PRIMARY',
        entities: [],
        timeContext: null,
        locationContext: null,
        sourceParagraph: paragraphs[0] || headline,
        verificationNeeded: true,
      });
    }

    // Additional substantive paragraphs
    for (let i = 0; i < paragraphs.length && claims.length < maxClaims; i++) {
      const p = paragraphs[i].trim();
      if (p.length > 40 && !claims.some((c) => c.claim === p)) {
        claims.push({
          id: crypto.randomUUID(),
          claim: p.length > 250 ? p.slice(0, 250) + '...' : p,
          claimType: 'FACTUAL',
          importance: claims.length === 0 ? 'PRIMARY' : 'SUPPORTING',
          entities: [],
          timeContext: null,
          locationContext: null,
          sourceParagraph: p,
          verificationNeeded: true,
        });
      }
    }

    return claims;
  }
}

export const urlClaimExtractor = new UrlClaimExtractor();
