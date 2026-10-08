import { urlSafetyService } from './url-safety.service';

export interface FetchedWebpage {
  finalUrl: string;
  statusCode: number;
  contentType: string;
  html: string;
  contentLength: number;
  redirectsFollowed: number;
}

export class UrlFetchError extends Error {
  readonly code:
    | 'URL_INVALID'
    | 'URL_UNSUPPORTED_PROTOCOL'
    | 'URL_BLOCKED'
    | 'URL_REDIRECT_BLOCKED'
    | 'URL_TIMEOUT'
    | 'URL_TOO_LARGE'
    | 'URL_NOT_HTML'
    | 'URL_FETCH_FAILED';

  constructor(message: string, code: UrlFetchError['code']) {
    super(message);
    this.name = 'UrlFetchError';
    this.code = code;
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  maxRedirects?: number;
  userAgent?: string;
}

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_USER_AGENT = 'TrustLens-Verifier/1.0 (+https://trustlens.ai/bot)';

export class UrlFetchService {
  /**
   * Safely fetch a public webpage with SSRF revalidation at every redirect hop,
   * size limits, content-type verification, and controlled error handling.
   */
  async fetchWebpage(initialUrl: string, options?: FetchOptions): Promise<FetchedWebpage> {
    const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
    const maxSizeBytes = options?.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
    const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    const userAgent = options?.userAgent || DEFAULT_USER_AGENT;

    let currentUrl = initialUrl;
    let redirectsFollowed = 0;

    while (redirectsFollowed <= maxRedirects) {
      // 1. Validate safety of current URL (including DNS SSRF check)
      const safetyCheck = await urlSafetyService.validateUrl(currentUrl);
      if (!safetyCheck.safe) {
        if (redirectsFollowed > 0) {
          throw new UrlFetchError(
            `Redirect to ${currentUrl} was blocked: ${safetyCheck.reason}`,
            'URL_REDIRECT_BLOCKED'
          );
        }
        throw new UrlFetchError(
          safetyCheck.reason || 'Requested URL is blocked by safety policy.',
          safetyCheck.errorCode || 'URL_BLOCKED'
        );
      }

      currentUrl = safetyCheck.normalizedUrl || currentUrl;

      // 2. Execute GET request with abort timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'manual', // handle redirects manually to revalidate each hop!
          signal: controller.signal,
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError' || controller.signal.aborted) {
          throw new UrlFetchError(`Webpage fetch timed out after ${timeoutMs}ms.`, 'URL_TIMEOUT');
        }
        throw new UrlFetchError(
          `Failed to connect to host: ${err.message || 'Network error'}`,
          'URL_FETCH_FAILED'
        );
      } finally {
        clearTimeout(timeoutId);
      }

      // 3. Handle HTTP Redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectsFollowed++;
        if (redirectsFollowed > maxRedirects) {
          throw new UrlFetchError(
            `Maximum redirect limit of ${maxRedirects} hops exceeded.`,
            'URL_REDIRECT_BLOCKED'
          );
        }

        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          throw new UrlFetchError('Redirect response missing Location header.', 'URL_FETCH_FAILED');
        }

        // Resolve relative redirects against current URL
        try {
          const nextUrl = new URL(locationHeader, currentUrl).href;
          currentUrl = nextUrl;
          continue; // Loop to validate next hop!
        } catch {
          throw new UrlFetchError('Malformed redirect Location header received.', 'URL_REDIRECT_BLOCKED');
        }
      }

      // 4. Verify HTTP Status Code
      if (!response.ok) {
        throw new UrlFetchError(
          `Remote server responded with HTTP status ${response.status} (${response.statusText}).`,
          'URL_FETCH_FAILED'
        );
      }

      // 5. Verify Content-Type (Only HTML allowed)
      const rawContentType = response.headers.get('content-type') || '';
      const contentType = rawContentType.toLowerCase().split(';')[0].trim();
      const isHtml =
        contentType.includes('text/html') ||
        contentType.includes('application/xhtml+xml') ||
        contentType.includes('text/plain'); // some minimal pages return text/plain with HTML

      if (!isHtml) {
        throw new UrlFetchError(
          `Unsupported Content-Type "${rawContentType}". TrustLens only verifies readable HTML webpages.`,
          'URL_NOT_HTML'
        );
      }

      // 6. Verify Content-Length header if present
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredSize = parseInt(contentLengthHeader, 10);
        if (!isNaN(declaredSize) && declaredSize > maxSizeBytes) {
          throw new UrlFetchError(
            `Webpage size exceeds maximum allowable limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`,
            'URL_TOO_LARGE'
          );
        }
      }

      // 7. Stream / Read Body with byte limit tracking
      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback for environments where getReader is not available
        const text = await response.text();
        if (text.length > maxSizeBytes) {
          throw new UrlFetchError(
            `Webpage body exceeds maximum allowable limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`,
            'URL_TOO_LARGE'
          );
        }
        return {
          finalUrl: currentUrl,
          statusCode: response.status,
          contentType: rawContentType,
          html: text,
          contentLength: text.length,
          redirectsFollowed,
        };
      }

      const chunks: Uint8Array[] = [];
      let totalReceived = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalReceived += value.length;
          if (totalReceived > maxSizeBytes) {
            reader.cancel();
            throw new UrlFetchError(
              `Webpage download exceeded maximum limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`,
              'URL_TOO_LARGE'
            );
          }
          chunks.push(value);
        }
      }

      // Assemble HTML string
      const decoder = new TextDecoder('utf-8');
      const html = chunks.map((c) => decoder.decode(c, { stream: true })).join('') + decoder.decode();

      return {
        finalUrl: currentUrl,
        statusCode: response.status,
        contentType: rawContentType,
        html,
        contentLength: totalReceived,
        redirectsFollowed,
      };
    }

    throw new UrlFetchError('Exceeded maximum redirect hops.', 'URL_REDIRECT_BLOCKED');
  }
}

export const urlFetchService = new UrlFetchService();
