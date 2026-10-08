import fs from 'fs';
import path from 'path';
import { env } from '../../../config/env';
import { VideoFormat } from '@trustlens/shared';
import { VideoSecurityError } from './video.types';

export class VideoSecurityService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.resolve(process.cwd(), 'server', 'tmp', 'video-uploads');
    this.ensureTempDir();
  }

  /**
   * Ensure secure temporary directory exists
   */
  ensureTempDir(): string {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    return this.tempDir;
  }

  /**
   * Sanitizes uploaded original filename to protect against directory traversal attacks
   */
  sanitizeFilename(rawFilename: string): string {
    if (!rawFilename || typeof rawFilename !== 'string') {
      return 'unnamed_video.mp4';
    }
    // Remove control characters, path separators and directory traversal sequences
    const sanitized = path.basename(rawFilename).replace(/[^\w.-]/g, '_');
    return sanitized || 'unnamed_video.mp4';
  }

  /**
   * Deep binary validation of uploaded video:
   * 1. File size limit
   * 2. Rejection of disguised executables / scripts
   * 3. Magic byte signature verification for MP4, WebM, MOV
   */
  async validateVideoFile(
    filePath: string,
    originalFilename: string,
    declaredMimeType?: string,
    declaredSize?: number
  ): Promise<{ format: VideoFormat; mimeType: string }> {
    if (!fs.existsSync(filePath)) {
      throw new VideoSecurityError('Uploaded video file does not exist on disk', 'VIDEO_EMPTY');
    }

    const stats = fs.statSync(filePath);
    const size = declaredSize || stats.size;

    if (size <= 0) {
      throw new VideoSecurityError('Uploaded video file is empty (0 bytes)', 'VIDEO_EMPTY');
    }

    const maxBytes = env.VIDEO_MAX_SIZE_MB * 1024 * 1024;
    if (size > maxBytes) {
      throw new VideoSecurityError(
        `Video size (${(size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${env.VIDEO_MAX_SIZE_MB}MB`,
        'VIDEO_TOO_LARGE'
      );
    }

    // Read header bytes for magic number analysis
    const headerBuffer = Buffer.alloc(128);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, headerBuffer, 0, Math.min(128, size), 0);
    } finally {
      fs.closeSync(fd);
    }

    // 1. Check for disguised executables
    // DOS / Windows PE executable ('MZ')
    if (headerBuffer[0] === 0x4d && headerBuffer[1] === 0x5a) {
      throw new VideoSecurityError(
        'Executable binary file disguised as video rejected.',
        'VIDEO_INVALID_TYPE'
      );
    }

    // Linux ELF binary
    if (
      headerBuffer[0] === 0x7f &&
      headerBuffer[1] === 0x45 &&
      headerBuffer[2] === 0x4c &&
      headerBuffer[3] === 0x46
    ) {
      throw new VideoSecurityError(
        'Linux ELF executable disguised as video rejected.',
        'VIDEO_INVALID_TYPE'
      );
    }

    // Script tags / Shell scripts
    const headerString = headerBuffer.toString('utf8', 0, 32).toLowerCase();
    if (
      headerString.startsWith('#!') ||
      headerString.startsWith('<?php') ||
      headerString.includes('<script') ||
      headerString.includes('<!doctype')
    ) {
      throw new VideoSecurityError(
        'Script file disguised as video rejected.',
        'VIDEO_INVALID_TYPE'
      );
    }

    // 2. Identify and validate video signatures
    const format = this.detectVideoFormat(headerBuffer, originalFilename, declaredMimeType);
    if (!format || format === 'unknown') {
      throw new VideoSecurityError(
        'Unsupported or malformed video format. Allowed formats: MP4, WebM, MOV.',
        'VIDEO_INVALID_TYPE'
      );
    }

    let mimeType = 'video/mp4';
    if (format === 'webm') mimeType = 'video/webm';
    if (format === 'mov') mimeType = 'video/quicktime';

    return { format, mimeType };
  }

  /**
   * Binary inspection of file signature
   */
  detectVideoFormat(
    buffer: Buffer,
    filename: string,
    declaredMime?: string
  ): VideoFormat {
    if (buffer.length < 8) {
      return 'unknown';
    }

    // Matroska / WebM EBML signature: 0x1A 0x45 0xDF 0xA3
    if (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      // Check for 'webm' string in first 64 bytes
      const headerStr = buffer.toString('binary', 0, Math.min(64, buffer.length));
      if (headerStr.includes('webm') || declaredMime?.includes('webm') || filename.endsWith('.webm')) {
        return 'webm';
      }
      return 'webm';
    }

    // MP4 / QuickTime ISO base media: 'ftyp' at offset 4..7
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp === 'ftyp') {
      const brand = buffer.toString('ascii', 8, 12).toLowerCase();
      if (brand.startsWith('qt')) {
        return 'mov';
      }
      return 'mp4';
    }

    // MOV classic atom: 'moov', 'wide', or 'mdat' at offset 4..7
    const atom = buffer.toString('ascii', 4, 8);
    if (atom === 'moov' || atom === 'wide' || atom === 'mdat') {
      return 'mov';
    }

    // Any file without recognized video atoms or EBML header is unknown
    return 'unknown';
  }

  /**
   * Safely deletes temporary video files on success OR failure
   */
  cleanupTempFiles(paths: (string | undefined | null)[]): void {
    for (const p of paths) {
      if (!p) continue;
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      } catch (err) {
        console.warn(`[VideoSecurityService] Failed to clean up temp file ${p}:`, err);
      }
    }
  }
}

export const videoSecurityService = new VideoSecurityService();
