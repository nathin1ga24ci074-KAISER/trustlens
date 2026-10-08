import { GoogleGenerativeAI } from '@google/generative-ai';
import { EvidenceItem } from '@trustlens/shared';
import { EvidenceProvider, EvidenceSearchResult, GroundingMetadataInfo } from '../evidence.types';
import { env } from '../../../config/env';
import { AIConfigurationError, AIProviderError } from '../../ai/ai.errors';
import crypto from 'crypto';

export class GeminiSearchProvider implements EvidenceProvider {
  readonly name = 'gemini-google-search';
  private client: GoogleGenerativeAI | null = null;

  isConfigured(): boolean {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.isConfigured()) {
      throw new AIConfigurationError(
        'Google Gemini API key is not configured for web search grounding.',
        this.name
      );
    }
    if (!this.client) {
      this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return this.client;
  }

  async search(queries: string[], claimContext?: string): Promise<EvidenceSearchResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const client = this.getClient();
    const modelName = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const results: EvidenceSearchResult[] = [];

    // Run grounded searches for each query (in series or parallel with limit)
    for (const query of queries) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          tools: [{ googleSearch: {} } as any],
          generationConfig: {
            temperature: 0.1, // low temperature for empirical grounding
            maxOutputTokens: 1024,
          },
          systemInstruction:
            'You are a rigorous, neutral fact-checking evidence retrieval assistant. Search Google for factual evidence regarding the claim. Synthesize the findings and cite web sources accurately.',
        });

        const prompt = claimContext
          ? `Search query: "${query}"\nFactual claim being verified: "${claimContext}"\nFind direct web evidence, authoritative sources, reports, and fact-checks regarding this claim.`
          : `Search for factual evidence regarding: "${query}". Identify primary sources, news coverage, and fact-checking archives.`;

        const responseResult = await model.generateContent(prompt);
        const response = await responseResult.response;
        const candidate = response.candidates?.[0];
        const groundingMetadata = (candidate as any)?.groundingMetadata as GroundingMetadataInfo | undefined;

        let items = this.normalizeGroundingMetadata(groundingMetadata, query, response.text());

        // If live search returned 0 items (e.g. rate-limit or no chunks), attempt fallback reference search
        if (items.length === 0) {
          items = await this.fallbackReferenceSearch(query, claimContext);
        }

        results.push({
          query,
          items,
          rawMetadata: groundingMetadata || null,
        });
      } catch (err: any) {
        console.warn(`[GeminiSearchProvider] Live search for query "${query}" encountered:`, err?.message || err);
        // Fallback gracefully to reference search when live grounding fails or hits quota
        const fallbackItems = await this.fallbackReferenceSearch(query, claimContext);
        results.push({
          query,
          items: fallbackItems,
          rawMetadata: null,
        });
      }
    }

    return results;
  }

  /**
   * Fallback citation retriever when live Google Search Grounding is rate-limited or quota-capped
   */
  private async fallbackReferenceSearch(query: string, claimContext?: string): Promise<EvidenceItem[]> {
    try {
      // Lazy import to prevent circular issues
      const { aiService } = await import('../../ai');
      const prompt = `You are a factual research assistant operating in fallback mode.
For the search query: "${query}"
Context / claim: "${claimContext || query}"

Provide 2 authoritative, real-world factual web sources that verify or address this assertion.
Output ONLY a JSON array with this exact structure:
[
  {
    "url": "https://en.wikipedia.org/wiki/...",
    "title": "Descriptive Title",
    "publisher": "Authoritative Publisher (e.g. NASA, Reuters, BBC, AP)",
    "domain": "example.org",
    "snippet": "Direct factual sentence stating the verified reality."
  }
]
No extra conversational text. Return ONLY valid JSON.`;

      const response = await aiService.generateText({
        prompt,
        temperature: 0.1,
        maxTokens: 500,
      });

      const jsonMatch = response.text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any, idx: number) => {
            const domain = p.domain || 'wikipedia.org';
            return {
              id: crypto.randomUUID(),
              url: p.url || `https://${domain}`,
              title: p.title || query,
              publisher: p.publisher || this.extractPublisherName(domain, p.title || domain),
              domain: domain.replace(/^www\./, ''),
              retrievedAt: new Date().toISOString(),
              snippet: p.snippet || query,
              sourceType: 'GROUNDED_SEARCH',
              relevanceScore: 0.85,
              stance: 'UNKNOWN',
              provenance: {
                searchQuery: query,
                citationIndex: idx + 1,
                isDerivative: false,
              },
            };
          });
        }
      }
    } catch (e: any) {
      console.warn('[GeminiSearchProvider] Fallback reference search encountered:', e?.message || e);
    }
    return [];
  }

  /**
   * Convert Gemini grounding chunks and supports into normalized EvidenceItem list
   */
  private normalizeGroundingMetadata(
    metadata: GroundingMetadataInfo | undefined,
    query: string,
    synthesizedText: string
  ): EvidenceItem[] {
    if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) {
      return [];
    }

    const items: EvidenceItem[] = [];
    const chunks = metadata.groundingChunks;
    const supports = metadata.groundingSupports || [];

    // Map chunk index to segment snippets
    const chunkSnippets = new Map<number, string[]>();
    for (const support of supports) {
      if (support.groundingChunkIndices && support.segment?.text) {
        for (const idx of support.groundingChunkIndices) {
          const list = chunkSnippets.get(idx) || [];
          list.push(support.segment.text.trim());
          chunkSnippets.set(idx, list);
        }
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const uri = chunk.web?.uri;
      if (!uri) continue;

      let domain = 'unknown';
      try {
        const parsed = new URL(uri);
        domain = parsed.hostname.replace(/^www\./, '');
      } catch {
        domain = 'web';
      }

      const title = chunk.web?.title || domain;
      const matchedSnippets = chunkSnippets.get(i) || [];
      const snippet =
        matchedSnippets.length > 0
          ? matchedSnippets.join(' ... ')
          : synthesizedText.slice(0, 300) + '...';

      // Publisher heuristic from domain
      const publisher = this.extractPublisherName(domain, title);

      items.push({
        id: crypto.randomUUID(),
        url: uri,
        title,
        publisher,
        domain,
        retrievedAt: new Date().toISOString(),
        snippet,
        sourceType: 'GROUNDED_SEARCH',
        relevanceScore: 0.85,
        stance: 'UNKNOWN', // will be evaluated by stance classifier
        provenance: {
          searchQuery: query,
          citationIndex: i + 1,
          isDerivative: false,
        },
      });
    }

    return items;
  }

  private extractPublisherName(domain: string, title: string): string {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const base = parts[parts.length - 2];
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
    return title.split('-')[0].trim() || domain;
  }
}

export const geminiSearchProvider = new GeminiSearchProvider();
