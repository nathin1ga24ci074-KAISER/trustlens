import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const lookupAsync = promisify(dns.lookup);

export interface UrlSafetyCheckResult {
  safe: boolean;
  errorCode?: 'URL_INVALID' | 'URL_BLOCKED' | 'URL_UNSUPPORTED_PROTOCOL';
  reason?: string;
  normalizedUrl?: string;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
  '100.100.100.200',
  '0.0.0.0',
]);

export class UrlSafetyService {
  /**
   * Fast format validation (protocol, format)
   */
  isSafeUrlFormat(rawUrl: string): { valid: boolean; reason?: string } {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return { valid: false, reason: 'URL cannot be empty' };
    }

    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: 'Malformed URL format' };
    }
  }

  /**
   * Check if an IPv4 address belongs to private/internal/loopback/link-local ranges
   */
  isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // invalid IP treated as unsafe
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private: 172.16 - 172.31)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 (Carrier-grade NAT & cloud metadata like 100.100.100.200)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 192.0.0.0/24, 192.0.2.0/24 (Documentation/Test-Net)
    if (a === 192 && b === 0) return true;

    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 198.51.100.0/24, 203.0.113.0/24 (Documentation)
    if (a === 198 && b === 51) return true;
    if (a === 203 && b === 0) return true;

    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  /**
   * Check if an IPv6 address is private, loopback, or link-local
   */
  isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    // ::1 loopback
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // :: unspecified
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // fe80::/10 link-local
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
      return true;
    }
    // fc00::/7 unique local (fc00 - fdff)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.startsWith('::ffff:')) {
      const ipv4Part = normalized.substring(7);
      if (net.isIPv4(ipv4Part)) {
        return this.isPrivateIPv4(ipv4Part);
      }
    }
    return false;
  }

  /**
   * Comprehensive SSRF and safety check including hostname verification and DNS lookup
   */
  async validateUrl(rawUrl: string): Promise<UrlSafetyCheckResult> {
    const formatCheck = this.isSafeUrlFormat(rawUrl);
    if (!formatCheck.valid) {
      return {
        safe: false,
        errorCode: 'URL_INVALID',
        reason: formatCheck.reason,
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      return { safe: false, errorCode: 'URL_INVALID', reason: 'Invalid URL structure' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 1. Direct blocked hostname check
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return {
        safe: false,
        errorCode: 'URL_BLOCKED',
        reason: 'Access to internal or local network targets is prohibited.',
      };
    }

    // 2. Direct IP check if hostname is already an IP
    if (net.isIPv4(hostname)) {
      if (this.isPrivateIPv4(hostname)) {
        return {
          safe: false,
          errorCode: 'URL_BLOCKED',
          reason: 'Access to private or reserved IPv4 addresses is prohibited.',
        };
      }
    } else if (net.isIPv6(hostname)) {
      if (this.isPrivateIPv6(hostname)) {
        return {
          safe: false,
          errorCode: 'URL_BLOCKED',
          reason: 'Access to private or loopback IPv6 addresses is prohibited.',
        };
      }
    } else {
      // 3. DNS Resolution check (prevent DNS rebinding / host pointing to 127.0.0.1)
      try {
        const addresses = await lookupAsync(hostname, { all: true });
        for (const addr of addresses) {
          if (addr.family === 4 && this.isPrivateIPv4(addr.address)) {
            return {
              safe: false,
              errorCode: 'URL_BLOCKED',
              reason: 'Resolved host points to an internal or private network address.',
            };
          }
          if (addr.family === 6 && this.isPrivateIPv6(addr.address)) {
            return {
              safe: false,
              errorCode: 'URL_BLOCKED',
              reason: 'Resolved host points to an internal or loopback IPv6 address.',
            };
          }
        }
      } catch (dnsErr: any) {
        return {
          safe: false,
          errorCode: 'URL_INVALID',
          reason: `DNS resolution failed for host "${hostname}": ${dnsErr.code || dnsErr.message}`,
        };
      }
    }

    return {
      safe: true,
      normalizedUrl: parsed.href,
    };
  }
}

export const urlSafetyService = new UrlSafetyService();
