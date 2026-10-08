import * as cheerio from 'cheerio';
import { PageMetadata } from '@trustlens/shared';

export class UrlMetadataExtractor {
  /**
   * Extract structured metadata from raw HTML
   */
  extractMetadata(html: string, finalUrl: string): PageMetadata {
    const $ = cheerio.load(html);

    let domain = 'unknown';
    try {
      domain = new URL(finalUrl).hostname.replace(/^www\./, '');
    } catch {
      domain = 'web';
    }

    // 1. Title Extraction (OG title -> Twitter title -> <title> -> <h1>)
    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('title').first().text().trim() ||
      $('h1').first().text().trim() ||
      domain;

    // 2. Description Extraction
    const description =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[name="twitter:description"]').attr('content')?.trim() ||
      '';

    // 3. Publisher / Site Name Extraction
    let publisher =
      $('meta[property="og:site_name"]').attr('content')?.trim() ||
      $('meta[name="application-name"]').attr('content')?.trim() ||
      '';

    if (!publisher) {
      // Derive clean name from domain
      const parts = domain.split('.');
      if (parts.length >= 2) {
        const base = parts[parts.length - 2];
        publisher = base.charAt(0).toUpperCase() + base.slice(1);
      } else {
        publisher = domain;
      }
    }

    // 4. Author Extraction
    const author =
      $('meta[name="author"]').attr('content')?.trim() ||
      $('meta[property="article:author"]').attr('content')?.trim() ||
      $('[rel="author"]').first().text().trim() ||
      $('.author-name, .byline, .author').first().text().trim() ||
      null;

    // 5. Published Time Extraction
    const publishedAt =
      $('meta[property="article:published_time"]').attr('content')?.trim() ||
      $('meta[name="pubdate"]').attr('content')?.trim() ||
      $('meta[name="publish-date"]').attr('content')?.trim() ||
      $('time[datetime]').first().attr('datetime')?.trim() ||
      null;

    // 6. Modified Time Extraction
    const modifiedAt =
      $('meta[property="article:modified_time"]').attr('content')?.trim() ||
      $('meta[name="last-modified"]').attr('content')?.trim() ||
      null;

    // 7. Language
    const language = $('html').attr('lang')?.trim() || null;

    return {
      title,
      description,
      publisher,
      domain,
      author,
      publishedAt: this.normalizeDate(publishedAt),
      modifiedAt: this.normalizeDate(modifiedAt),
      retrievedAt: new Date().toISOString(),
      language,
    };
  }

  private normalizeDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch {
      // ignore
    }
    return dateStr;
  }
}

export const urlMetadataExtractor = new UrlMetadataExtractor();
