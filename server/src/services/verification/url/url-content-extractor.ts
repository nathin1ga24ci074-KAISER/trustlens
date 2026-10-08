import * as cheerio from 'cheerio';

export interface ExtractedPageContent {
  headline: string;
  paragraphs: string[];
  fullText: string;
  wordCount: number;
  isEmpty: boolean;
  canonicalUrl?: string | null;
}

const STRIP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'iframe',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'button',
  'input',
  'select',
  '.cookie',
  '.cookie-banner',
  '.cookie-notice',
  '.consent-modal',
  '.advertisement',
  '.ad',
  '.ads',
  '.sidebar',
  '.social-share',
  '.share-buttons',
  '.comments',
  '.newsletter',
  '.related-articles',
  '.recommended-posts',
  '#comments',
  '#nav',
  '#footer',
  '#header',
  '#sidebar',
];

const MAX_ARTICLE_CHARS = 20000;

export class UrlContentExtractor {
  /**
   * Extract clean, readable article content from raw HTML
   */
  extractContent(html: string): ExtractedPageContent {
    const $ = cheerio.load(html);

    // 1. Extract canonical URL if present
    const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || null;

    // 2. Extract best headline / title
    const headline =
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('title').first().text().trim() ||
      '';

    // 3. Remove non-content and noisy boilerplate elements
    STRIP_SELECTORS.forEach((selector) => {
      $(selector).remove();
    });

    // 4. Find the most relevant article container:
    // Look for <article>, <main>, [role="main"], or .article-body, .entry-content, .story-body
    let container = $('article, main, [role="main"], .article-body, .entry-content, .story-body, .content').first();
    if (!container.length) {
      container = $('body');
    }

    // 5. Extract meaningful paragraphs and headings from container
    const paragraphs: string[] = [];
    const seenParagraphs = new Set<string>();

    container.find('h1, h2, h3, h4, h5, h6, p, blockquote, li').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      // Filter out tiny snippets, copyright notices, or navigation remnants
      if (text.length > 25 && !seenParagraphs.has(text.toLowerCase())) {
        // Discard obvious disclaimer or privacy policy text
        if (
          !text.toLowerCase().startsWith('copyright') &&
          !text.toLowerCase().includes('all rights reserved') &&
          !text.toLowerCase().includes('terms of service') &&
          !text.toLowerCase().includes('privacy policy')
        ) {
          seenParagraphs.add(text.toLowerCase());
          paragraphs.push(text);
        }
      }
    });

    // 6. Assemble full text preserving paragraph structure
    let fullText = paragraphs.join('\n\n').trim();
    if (fullText.length > MAX_ARTICLE_CHARS) {
      fullText = fullText.slice(0, MAX_ARTICLE_CHARS) + '...';
    }

    const wordCount = fullText ? fullText.split(/\s+/).length : 0;
    const isEmpty = fullText.length < 50 || wordCount < 10;

    return {
      headline,
      paragraphs,
      fullText,
      wordCount,
      isEmpty,
      canonicalUrl,
    };
  }
}

export const urlContentExtractor = new UrlContentExtractor();
