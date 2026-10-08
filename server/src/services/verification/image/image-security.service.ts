import { ValidatedImageInput, ImageSecurityError } from './image.types';
import imageSize from 'image-size';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_DIMENSION = 10000; // 10,000 px max width/height
export const MAX_IMAGE_PIXELS = 40_000_000; // 40 megapixels

export class ImageSecurityService {
  /**
   * Strictly inspect and validate an uploaded image buffer:
   * - Empty check
   * - Size limit (<= 10MB)
   * - Magic byte content verification (never trust only filename or declared mime)
   * - Decompression bomb & dimension limits
   */
  validateImage(
    buffer: Buffer,
    declaredMimeType?: string,
    originalFilename?: string,
    userContext?: string
  ): ValidatedImageInput {
    // 1. Empty check
    if (!buffer || buffer.length === 0) {
      throw new ImageSecurityError('Uploaded image file is empty.', 'IMAGE_EMPTY');
    }

    // 2. Size limit
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new ImageSecurityError(
        `Image size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed limit of 10MB.`,
        'IMAGE_TOO_LARGE'
      );
    }

    // 3. Magic byte signature verification
    const format = this.detectImageFormat(buffer);
    if (!format) {
      throw new ImageSecurityError(
        'File content does not match a supported image format. Only authentic JPEG, PNG, and WEBP files are permitted.',
        'IMAGE_INVALID_TYPE'
      );
    }

    // 4. Validate dimensions and guard against decompression bombs
    try {
      const dimensions = imageSize(buffer);
      if (dimensions && dimensions.width && dimensions.height) {
        if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
          throw new ImageSecurityError(
            `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum allowed dimension of ${MAX_IMAGE_DIMENSION}px.`,
            'IMAGE_DECOMPRESSION_BOMB'
          );
        }

        const totalPixels = dimensions.width * dimensions.height;
        if (totalPixels > MAX_IMAGE_PIXELS) {
          throw new ImageSecurityError(
            `Image resolution (${totalPixels.toLocaleString()} pixels) exceeds safe processing limits.`,
            'IMAGE_DECOMPRESSION_BOMB'
          );
        }
      }
    } catch (err: any) {
      if (err instanceof ImageSecurityError) throw err;
      throw new ImageSecurityError(
        `Image stream is corrupted or malformed: ${err.message || 'Unable to decode header'}`,
        'IMAGE_MALFORMED'
      );
    }

    // 5. Sanitize original filename (prevent path traversal / directory injection)
    const sanitizedFilename = this.sanitizeFilename(originalFilename);

    return {
      buffer,
      mimeType: format.mimeType,
      extension: format.extension,
      sizeBytes: buffer.length,
      originalFilename: sanitizedFilename,
      userContext: userContext ? userContext.trim().slice(0, 1000) : undefined,
    };
  }

  /**
   * Determine exact image format using file signature magic bytes
   */
  private detectImageFormat(
    buffer: Buffer
  ): { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; extension: 'jpg' | 'png' | 'webp' } | null {
    if (buffer.length < 12) return null;

    // JPEG: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mimeType: 'image/jpeg', extension: 'jpg' };
    }

    // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mimeType: 'image/png', extension: 'png' };
    }

    // WEBP: "RIFF" .... "WEBP"
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { mimeType: 'image/webp', extension: 'webp' };
    }

    return null;
  }

  /**
   * Sanitize user-provided filename: strip directory traversal, special characters
   */
  sanitizeFilename(raw?: string): string {
    if (!raw) return 'upload.img';
    // Remove directory path components and null bytes
    const base = raw.replace(/^.*[\\\/]/, '').replace(/\0/g, '');
    // Allow only alphanumeric, dash, underscore, dot
    const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    return clean.slice(0, 100) || 'upload.img';
  }
}

export const imageSecurityService = new ImageSecurityService();
