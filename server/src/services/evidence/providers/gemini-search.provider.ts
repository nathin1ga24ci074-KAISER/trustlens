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

        const items = this.normalizeGroundingMetadata(groundingMetadata, query, response.text());

        results.push({
          query,
          items,
          rawMetadata: groundingMetadata || null,
          status: items.length > 0 ? 'SUCCESS' : 'NO_RESULTS',
          provider: this.name,
          model: modelName,
        });
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isQuota =
          errMsg.includes('429') ||
          errMsg.includes('quota') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          err?.status === 429;
        const status = isQuota ? 'RATE_LIMITED' : 'UNAVAILABLE';

        console.warn(`[GeminiSearchProvider] Live search grounding for query "${query}" encountered [${status}]:`, errMsg);
        // CRITICAL EVIDENCE INTEGRITY PRINCIPLE:
        // TrustLens MUST NEVER fabricate, synthesize, or hallucinate citations or web URLs.
        // If live search grounding fails or is rate-limited, return an empty evidence list
        // and record the exact failure status so the uncertainty engine classifies appropriately.
        results.push({
          query,
          items: [],
          rawMetadata: null,
          status,
          errorMessage: errMsg,
          provider: this.name,
          model: modelName,
        });
      }
    }

    return results;
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
      const chunkIndices =
        support.groundingChunkIndices ||
        (support as any)?.chunkIndices ||
        (support as any)?.grounding_chunk_indices;

      if (Array.isArray(chunkIndices) && support.segment?.text) {
        for (const idx of chunkIndices) {
          const list = chunkSnippets.get(idx) || [];
          list.push(support.segment.text.trim());
          chunkSnippets.set(idx, list);
        }
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const uri = chunk.web?.uri || (chunk as any)?.web?.url || (chunk as any)?.uri || (chunk as any)?.url;
      if (!uri) continue;

      let domain = 'unknown';
      try {
        const parsed = new URL(uri);
        domain = parsed.hostname.replace(/^www\./, '');
      } catch {
        domain = 'web';
      }

      const title = chunk.web?.title || (chunk as any)?.title || domain;
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
