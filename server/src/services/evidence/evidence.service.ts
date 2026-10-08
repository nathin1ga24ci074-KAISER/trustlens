import { EvidenceItem } from '@trustlens/shared';
import { EvidenceProvider } from './evidence.types';
import { geminiSearchProvider } from './providers/gemini-search.provider';

export class EvidenceService {
  private provider: EvidenceProvider;

  constructor(customProvider?: EvidenceProvider) {
    this.provider = customProvider || geminiSearchProvider;
  }

  setProvider(provider: EvidenceProvider): void {
    this.provider = provider;
  }

  getProvider(): EvidenceProvider {
    return this.provider;
  }

  /**
   * Execute multi-query search across the evidence provider and assemble deduplicated evidence corpus
   */
  async retrieveEvidence(queries: string[], claim: string): Promise<EvidenceItem[]> {
    if (!queries || queries.length === 0) {
      return [];
    }

    const searchResults = await this.provider.search(queries, claim);
    const rawItems: EvidenceItem[] = [];

    for (const res of searchResults) {
      rawItems.push(...res.items);
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduplicated: EvidenceItem[] = [];

    for (const item of rawItems) {
      const normalizedUrl = this.normalizeUrl(item.url);
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        deduplicated.push(item);
      }
    }

    // Analyze source independence and provenance links
    this.analyzeSourceIndependence(deduplicated);

    return deduplicated;
  }

  private normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, '');
    } catch {
      return rawUrl.toLowerCase();
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

    // Mark items sharing domain or citing each other as derivative
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
