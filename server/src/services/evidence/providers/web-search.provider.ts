import cheerio from 'cheerio';
import crypto from 'crypto';
import { EvidenceItem } from '@trustlens/shared';
import { EvidenceProvider, EvidenceSearchResult } from '../evidence.types';

export class WebSearchProvider implements EvidenceProvider {
  readonly name = 'web-search-live';

  isConfigured(): boolean {
    return true;
  }

  async search(queries: string[], claimContext?: string): Promise<EvidenceSearchResult[]> {
    const results: EvidenceSearchResult[] = [];

    for (const query of queries) {
      try {
        const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
          results.push({
            query,
            items: [],
            rawMetadata: null,
            status: 'UNAVAILABLE',
            errorMessage: `Live web search HTTP error ${res.status}: ${res.statusText}`,
            provider: this.name,
            model: 'live-web',
          });
          continue;
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        const items: EvidenceItem[] = [];

        $('.result').each((i, el) => {
          if (items.length >= 4) return;
          const titleEl = $(el).find('.result__title a');
          const title = titleEl.text().trim();
          const rawHref = titleEl.attr('href') || '';
          const snippet = $(el).find('.result__snippet').text().trim();

          let targetUrl = '';
          if (rawHref.includes('uddg=')) {
            try {
              const match = rawHref.match(/uddg=([^&]+)/);
              if (match && match[1]) {
                targetUrl = decodeURIComponent(match[1]);
              }
            } catch {
              // ignore
            }
          } else if (rawHref.startsWith('http')) {
            targetUrl = rawHref;
          }

          if (title && targetUrl && targetUrl.startsWith('http') && !targetUrl.includes('duckduckgo.com')) {
            let domain = 'web';
            try {
              domain = new URL(targetUrl).hostname.replace(/^www\./, '');
            } catch {
              domain = 'web';
            }

            const publisher = this.extractPublisherName(domain, title);

            items.push({
              id: crypto.randomUUID(),
              url: targetUrl,
              title,
              publisher,
              domain,
              retrievedAt: new Date().toISOString(),
              snippet: snippet || title,
              sourceType: 'GROUNDED_SEARCH',
              relevanceScore: 0.85,
              stance: 'UNKNOWN',
              provenance: {
                searchQuery: query,
                citationIndex: items.length + 1,
                isDerivative: false,
              },
            });
          }
        });

        results.push({
          query,
          items,
          rawMetadata: null,
          status: items.length > 0 ? 'SUCCESS' : 'NO_RESULTS',
          provider: this.name,
          model: 'live-web',
        });
      } catch (err: any) {
        results.push({
          query,
          items: [],
          rawMetadata: null,
          status: 'ERROR',
          errorMessage: err?.message || String(err),
          provider: this.name,
          model: 'live-web',
        });
      }
    }

    return results;
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

export const webSearchProvider = new WebSearchProvider();
