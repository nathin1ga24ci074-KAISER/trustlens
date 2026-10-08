import { EvidenceItem } from '@trustlens/shared';
import { EvidenceProvider, EvidenceSearchResult } from './evidence.types';
import { geminiSearchProvider } from './providers/gemini-search.provider';
import { webSearchProvider } from './providers/web-search.provider';
import { imageDiagnosticLogger } from '../verification/image/image-diagnostic.logger';

export interface EvidenceRejection {
  url: string;
  domain: string;
  reason: string;
}

export interface EvidenceExecutionSummary {
  provider: string;
  model?: string;
  status: 'SUCCESS' | 'NO_RESULTS' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'ERROR';
  errorMessage?: string;
  totalFound: number;
  retained: number;
  rejectedCount: number;
  rejections: EvidenceRejection[];
}

export class EvidenceService {
  private provider: EvidenceProvider;
  private fallbackProvider: EvidenceProvider | null = null;
  private lastSummary: EvidenceExecutionSummary | null = null;

  constructor(customProvider?: EvidenceProvider, fallbackProvider?: EvidenceProvider) {
    this.provider = customProvider || geminiSearchProvider;
    this.fallbackProvider = fallbackProvider !== undefined ? fallbackProvider : webSearchProvider;
  }

  setProvider(provider: EvidenceProvider): void {
    this.provider = provider;
  }

  setFallbackProvider(provider: EvidenceProvider | null): void {
    this.fallbackProvider = provider;
  }

  getProvider(): EvidenceProvider {
    return this.provider;
  }

  getLastExecutionSummary(): EvidenceExecutionSummary | null {
    return this.lastSummary;
  }

  /**
   * Execute multi-query search across the evidence provider and assemble deduplicated evidence corpus
   */
  async retrieveEvidence(
    queries: string[],
    claim: string,
    options?: { verificationId?: string }
  ): Promise<EvidenceItem[]> {
    const { items } = await this.retrieveEvidenceWithStatus(queries, claim, options);
    return items;
  }

  /**
   * Execute search and return both normalized evidence items and full search execution summary
   */
  async retrieveEvidenceWithStatus(
    queries: string[],
    claim: string,
    options?: { verificationId?: string }
  ): Promise<{ items: EvidenceItem[]; summary: EvidenceExecutionSummary }> {
    const vId = options?.verificationId || 'unknown-id';

    if (!queries || queries.length === 0) {
      const summary: EvidenceExecutionSummary = {
        provider: this.provider.name,
        status: 'NO_RESULTS',
        totalFound: 0,
        retained: 0,
        rejectedCount: 0,
        rejections: [],
      };
      this.lastSummary = summary;
      return { items: [], summary };
    }

    imageDiagnosticLogger.log({
      verificationId: vId,
      stage: 'SEARCH_GROUNDING',
      status: 'STARTED',
      message: `Executing search grounding queries with provider ${this.provider.name}`,
      data: {
        provider: this.provider.name,
        queries,
      },
    });

    let searchResults: EvidenceSearchResult[] = [];
    let activeProvider = this.provider;

    try {
      searchResults = await this.provider.search(queries, claim);
    } catch (err: any) {
      console.warn(`[EvidenceService] Primary provider search error:`, err?.message || err);
    }

    const hasErrorsOrQuota = searchResults.some(
      (r) => r.status === 'RATE_LIMITED' || r.status === 'UNAVAILABLE' || r.status === 'ERROR'
    );
    const totalItems = searchResults.reduce((acc, r) => acc + r.items.length, 0);

    // Fall back to secondary web search provider if primary hit quota or was unavailable
    if (totalItems === 0 && this.fallbackProvider && (hasErrorsOrQuota || searchResults.length === 0)) {
      imageDiagnosticLogger.log({
        verificationId: vId,
        stage: 'SEARCH_GROUNDING',
        status: 'RATE_LIMITED',
        message: `Primary provider (${this.provider.name}) rate-limited or unavailable. Activating fallback provider (${this.fallbackProvider.name}).`,
        data: {
          primaryProvider: this.provider.name,
          fallbackProvider: this.fallbackProvider.name,
          primaryStatuses: searchResults.map((s) => s.status),
        },
      });

      try {
        const fallbackResults = await this.fallbackProvider.search(queries, claim);
        if (fallbackResults.some((r) => r.items.length > 0)) {
          searchResults = fallbackResults;
          activeProvider = this.fallbackProvider;
        }
      } catch (fbErr: any) {
        console.warn(`[EvidenceService] Fallback provider search error:`, fbErr?.message || fbErr);
      }
    }

    const rawItems: EvidenceItem[] = [];
    let detectedStatus: EvidenceExecutionSummary['status'] = 'NO_RESULTS';
    let errorMessage: string | undefined;

    for (const res of searchResults) {
      rawItems.push(...res.items);
      if (res.status === 'SUCCESS' && detectedStatus !== 'SUCCESS') {
        detectedStatus = 'SUCCESS';
      } else if (res.status === 'RATE_LIMITED' && detectedStatus !== 'SUCCESS') {
        detectedStatus = 'RATE_LIMITED';
        errorMessage = res.errorMessage;
      } else if (res.status === 'UNAVAILABLE' && detectedStatus !== 'SUCCESS' && detectedStatus !== 'RATE_LIMITED') {
        detectedStatus = 'UNAVAILABLE';
        errorMessage = res.errorMessage;
      }
    }

    if (rawItems.length > 0) {
      detectedStatus = 'SUCCESS';
    }

    // Relevance filtering and deduplication
    const rejections: EvidenceRejection[] = [];
    const deduplicated: EvidenceItem[] = [];
    const seenUrls = new Set<string>();

    for (const item of rawItems) {
      // 1. URL validity filter
      if (!item.url || typeof item.url !== 'string' || !item.url.startsWith('http')) {
        rejections.push({
          url: item.url || 'missing',
          domain: item.domain || 'unknown',
          reason: 'Malformed or missing URL scheme',
        });
        continue;
      }

      // 2. Search engine page filter
      const lowerUrl = item.url.toLowerCase();
      if (
        lowerUrl.includes('duckduckgo.com') ||
        lowerUrl.includes('google.com/search') ||
        lowerUrl.includes('bing.com/search')
      ) {
        rejections.push({
          url: item.url,
          domain: item.domain,
          reason: 'Search engine navigation page rather than source article',
        });
        continue;
      }

      // 3. Substantive content filter
      if (!item.snippet || item.snippet.trim().length < 15) {
        rejections.push({
          url: item.url,
          domain: item.domain,
          reason: 'Snippet lacks substantive context (< 15 characters)',
        });
        continue;
      }

      // 4. URL deduplication
      const normalizedUrl = this.normalizeUrl(item.url);
      if (seenUrls.has(normalizedUrl)) {
        rejections.push({
          url: item.url,
          domain: item.domain,
          reason: 'Duplicate canonical source URL',
        });
        continue;
      }

      seenUrls.add(normalizedUrl);
      deduplicated.push(item);
    }

    // Source independence analysis
    this.analyzeSourceIndependence(deduplicated);

    const summary: EvidenceExecutionSummary = {
      provider: activeProvider.name,
      status: detectedStatus,
      errorMessage,
      totalFound: rawItems.length,
      retained: deduplicated.length,
      rejectedCount: rejections.length,
      rejections,
    };
    this.lastSummary = summary;

    imageDiagnosticLogger.log({
      verificationId: vId,
      stage: 'EVIDENCE_NORMALIZATION',
      status: detectedStatus === 'SUCCESS' ? 'COMPLETED' : detectedStatus,
      message: `Retrieved ${rawItems.length} sources, retained ${deduplicated.length}, rejected ${rejections.length}`,
      data: {
        provider: activeProvider.name,
        searchStatus: detectedStatus,
        totalFound: rawItems.length,
        retained: deduplicated.length,
        rejectedCount: rejections.length,
        sampleRejections: rejections.slice(0, 3),
      },
    });

    return { items: deduplicated, summary };
  }

  private normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const path = parsed.pathname.toLowerCase().replace(/\/$/, '');
      return `${host}${path}`;
    } catch {
      return rawUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    }
  }

  /**
   * Detect derivative / non-independent citations:
   * Identifies when multiple articles originate from the same wire service or domain.
   */
  private analyzeSourceIndependence(items: EvidenceItem[]): void {
    const domainCounts = new Map<string, number>();

    for (const item of items) {
      const count = domainCounts.get(item.domain) || 0;
      domainCounts.set(item.domain, count + 1);
    }

    // Mark items sharing domain as derivative
    for (const item of items) {
      const domainCount = domainCounts.get(item.domain) || 1;
      if (domainCount > 1) {
        if (!item.provenance) {
          item.provenance = {};
        }
        item.provenance.isDerivative = true;
      }
    }
  }
}

export const evidenceService = new EvidenceService();
