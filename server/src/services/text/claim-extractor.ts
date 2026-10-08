import { ClaimExtractionResult, ClaimType } from '@trustlens/shared';
import { aiService } from '../ai';

const GREETING_PATTERNS = [
  /^(hello|hi|hey|greetings|howdy|good\s+(morning|afternoon|evening|day))([\s,!.?]+(there|how\s+are\s+you.*|what'?s\s+up.*|friend.*))?[\s!.?]*$/i,
  /^how\s+are\s+you(\s+(today|doing))?[\s!.?]*$/i,
  /^what('?s|\s+is)\s+up[\s!.,?]*$/i,
  /^(thanks|thank\s+you)(\s+(very\s+much|so\s+much))?[\s!.,?]*$/i,
  /^(who\s+are\s+you|what\s+can\s+you\s+do)[\s!.,?]*$/i,
];

export class ClaimExtractor {
  /**
   * Parse user natural language and determine if a verifiable factual claim exists
   */
  async extractClaim(input: string): Promise<ClaimExtractionResult> {
    const trimmed = input.trim();

    // 1. Fast conversational / greeting heuristic check
    for (const pattern of GREETING_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          originalText: trimmed,
          claim: trimmed,
          claimType: 'NON_VERIFIABLE',
          entities: [],
          timeContext: null,
          locationContext: null,
          verificationNeeded: false,
          reasonNonVerifiable: 'Input is a conversational greeting/phatic expression rather than a verifiable empirical claim.',
        };
      }
    }

    if (trimmed.length < 5) {
      return {
        originalText: trimmed,
        claim: trimmed,
        claimType: 'NON_VERIFIABLE',
        entities: [],
        timeContext: null,
        locationContext: null,
        verificationNeeded: false,
        reasonNonVerifiable: 'Input is too short to contain a verifiable factual statement.',
      };
    }

    // 2. Structured AI Claim Extraction via AIService
    const systemPrompt = `You are an expert linguistic analyst for a misinformation verification platform.
Analyze the user statement and determine if it makes a verifiable factual claim.
Respond ONLY with a valid JSON object matching this schema:
{
  "claim": "concise core assertion being claimed",
  "claimType": "FACTUAL" | "OPINION" | "PREDICTION" | "NON_VERIFIABLE",
  "entities": ["list of named entities, organizations, people, locations"],
  "timeContext": "referenced year, date, or timeframe, or null",
  "locationContext": "referenced geographical region, country, or null",
  "verificationNeeded": true | false,
  "reasonNonVerifiable": "explanation if verificationNeeded is false, otherwise null"
}`;

    const prompt = `Analyze this statement: "${trimmed}"`;

    try {
      const response = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature: 0.1,
      });

      const parsed = this.safeParseJson(response.text);
      if (parsed && typeof parsed.claim === 'string') {
        const claimType: ClaimType = ['FACTUAL', 'OPINION', 'PREDICTION', 'NON_VERIFIABLE'].includes(parsed.claimType)
          ? parsed.claimType
          : 'FACTUAL';

        return {
          originalText: trimmed,
          claim: parsed.claim.trim() || trimmed,
          claimType,
          entities: Array.isArray(parsed.entities) ? parsed.entities.filter((e: any) => typeof e === 'string') : [],
          timeContext: typeof parsed.timeContext === 'string' ? parsed.timeContext : null,
          locationContext: typeof parsed.locationContext === 'string' ? parsed.locationContext : null,
          verificationNeeded: typeof parsed.verificationNeeded === 'boolean' ? parsed.verificationNeeded : claimType === 'FACTUAL',
          reasonNonVerifiable: typeof parsed.reasonNonVerifiable === 'string' ? parsed.reasonNonVerifiable : null,
        };
      }
    } catch (err) {
      console.warn('[ClaimExtractor] AI extraction failed, falling back to deterministic extraction:', err);
    }

    // Fallback: treat input directly as a factual assertion
    return {
      originalText: trimmed,
      claim: trimmed,
      claimType: 'FACTUAL',
      entities: [],
      timeContext: null,
      locationContext: null,
      verificationNeeded: true,
      reasonNonVerifiable: null,
    };
  }

  /**
   * Generate 2-3 focused search queries for finding independent web evidence
   */
  async generateSearchQueries(claim: string, entities: string[]): Promise<string[]> {
    const systemPrompt = `You are a search intelligence specialist for a fact-checking organization.
Given a factual claim, generate 2 to 3 focused, neutral search queries to retrieve verification evidence from news, fact-checking archives, and public reporting.
CRITICAL RULES:
1. Strip sensationalized prefixes like "BREAKING:", "ALERT:", "JUST IN:", etc.
2. Formulate queries investigating BOTH:
   - The specific disputed assertion or detail (e.g. key figures, organizations, and specific actions).
   - The broader reported event or incident to retrieve foundational context.
3. DO NOT wrap entire sentences in quotes. Use keywords or short entity phrases.
Respond ONLY with a JSON array of strings, for example: ["query 1", "query 2"]`;

    const prompt = `Claim: "${claim}"\nEntities: ${entities.join(', ') || 'none'}`;

    try {
      const response = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature: 0.2,
      });

      const parsed = this.safeParseJson(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validQueries = parsed
          .filter((q) => typeof q === 'string' && q.trim().length > 3)
          .map((q) => q.replace(/^["'“”]|["'“”]$/g, '').trim())
          .slice(0, 3);
        if (validQueries.length > 0) {
          return validQueries;
        }
      }
    } catch (err) {
      console.warn('[ClaimExtractor] Query generation failed, using fallback query:', err);
    }

    // Clean claim by removing sensational headlines, quotes, punctuation
    const cleanClaim = claim
      .replace(/^(breaking|alert|just in|exclusive|urgent|update):\s*/i, '')
      .replace(/^["'“”]|["'“”]$/g, '')
      .trim();

    const fallbackQueries: string[] = [
      `${cleanClaim} fact check`,
    ];

    if (entities && entities.length > 0) {
      // Query preserving key entities and the core claim
      fallbackQueries.push(`${entities.join(' ')} ${cleanClaim.slice(0, 60)}`);
      // Broader incident query
      fallbackQueries.push(`${entities.join(' ')} incident news`);
    } else {
      // Shorter keyword query
      const keywords = cleanClaim
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 6)
        .join(' ');
      fallbackQueries.push(`${keywords} fact check`);
      fallbackQueries.push(`${cleanClaim} official source`);
    }

    return Array.from(new Set(fallbackQueries)).slice(0, 3);
  }

  private safeParseJson(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      // Look for JSON object or array substring
      const objMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (objMatch) {
        try {
          return JSON.parse(objMatch[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

export const claimExtractor = new ClaimExtractor();
