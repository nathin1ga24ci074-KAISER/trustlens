import fs from 'fs';
import { exec, execSync } from 'child_process';
import crypto from 'crypto';
import { env } from '../../../config/env';
import { VideoMetadata, VideoKeyframe, VideoFormat } from '@trustlens/shared';
import { VideoSecurityError, FrameExtractionResult } from './video.types';

export class VideoProcessingService {
  private ffmpegPath: string | null = null;
  private ffmpegChecked = false;

  /**
   * Resolves available FFmpeg binary
   */
  getFfmpegPath(): string | null {
    if (this.ffmpegChecked) {
      return this.ffmpegPath;
    }
    this.ffmpegChecked = true;

    // 1. Explicit env path
    if (env.FFMPEG_PATH && fs.existsSync(env.FFMPEG_PATH)) {
      this.ffmpegPath = env.FFMPEG_PATH;
      return this.ffmpegPath;
    }

    // 2. ffmpeg-static npm package
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const staticFfmpeg = require('ffmpeg-static');
      if (typeof staticFfmpeg === 'string' && fs.existsSync(staticFfmpeg)) {
        this.ffmpegPath = staticFfmpeg;
        return this.ffmpegPath;
      }
    } catch {
      // ffmpeg-static not available
    }

    // 3. System PATH check
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      this.ffmpegPath = 'ffmpeg';
      return this.ffmpegPath;
    } catch {
      this.ffmpegPath = null;
    }

    return this.ffmpegPath;
  }

  isFfmpegAvailable(): boolean {
    return Boolean(this.getFfmpegPath());
  }

  /**
   * Extract video duration, resolution, codecs, and stream properties
   */
  async extractMetadata(
    filePath: string,
    format: VideoFormat,
    fileSizeBytes: number
  ): Promise<VideoMetadata> {
    const ffmpeg = this.getFfmpegPath();

    if (ffmpeg) {
      try {
        const metadata = await this.probeWithFfmpeg(filePath, ffmpeg, format, fileSizeBytes);
        this.enforceLimits(metadata);
        return metadata;
      } catch (err: any) {
        if (err instanceof VideoSecurityError) {
          throw err;
        }
        console.warn('[VideoProcessingService] FFmpeg probe failed, attempting container parsing fallback:', err.message);
      }
    }

    // Fallback lightweight metadata parser (for tests or environments without FFmpeg)
    const fallbackMetadata = this.parseContainerFallback(filePath, format, fileSizeBytes);
    this.enforceLimits(fallbackMetadata);
    return fallbackMetadata;
  }

  private enforceLimits(metadata: VideoMetadata): void {
    if (metadata.durationSeconds > env.VIDEO_MAX_DURATION_SECONDS) {
      throw new VideoSecurityError(
        `Video duration (${metadata.durationSeconds.toFixed(1)}s) exceeds maximum allowed limit of ${env.VIDEO_MAX_DURATION_SECONDS}s`,
        'VIDEO_TOO_LONG'
      );
    }

    if (metadata.width > env.VIDEO_MAX_WIDTH || metadata.height > env.VIDEO_MAX_HEIGHT) {
      throw new VideoSecurityError(
        `Video resolution (${metadata.width}x${metadata.height}) exceeds maximum allowed dimensions (${env.VIDEO_MAX_WIDTH}x${env.VIDEO_MAX_HEIGHT})`,
        'VIDEO_DIMENSIONS_TOO_LARGE'
      );
    }
  }

  /**
   * Run ffmpeg -i and parse output from stderr
   */
  private probeWithFfmpeg(
    filePath: string,
    ffmpeg: string,
    format: VideoFormat,
    sizeBytes: number
  ): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      exec(`"${ffmpeg}" -i "${filePath}"`, { timeout: 10000 }, (err, _stdout, stderr) => {
        // ffmpeg -i returns exit code 1 because no output is specified, but output is in stderr
        const output = stderr || '';

        // Extract duration: "Duration: 00:01:23.45"
        const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
        let durationSeconds = 10;
        if (durationMatch) {
          const hours = parseFloat(durationMatch[1]);
          const minutes = parseFloat(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          durationSeconds = hours * 3600 + minutes * 60 + seconds;
        }

        // Extract video stream: "Video: h264 (...), 1920x1080 [SAR ...], 29.97 fps"
        const videoMatch = output.match(/Stream #\d+:\d+.*Video:\s*([a-zA-Z0-9_-]+).*?,\s*(\d{2,5})x(\d{2,5})(?:[,\s].*?(\d+(?:\.\d+)?)\s*fps)?/i);
        let width = 1280;
        let height = 720;
        let fps = 30;
        let videoCodec = 'h264';

        if (videoMatch) {
          videoCodec = videoMatch[1];
          width = parseInt(videoMatch[2], 10);
          height = parseInt(videoMatch[3], 10);
          if (videoMatch[4]) {
            fps = parseFloat(videoMatch[4]);
          }
        }

        // Extract audio stream: "Stream #0:1: Audio: aac"
        const hasAudio = /Stream #\d+:\d+.*Audio:/i.test(output);
        let audioCodec: string | undefined;
        const audioMatch = output.match(/Stream #\d+:\d+.*Audio:\s*([a-zA-Z0-9_-]+)/i);
        if (audioMatch) {
          audioCodec = audioMatch[1];
        }

        resolve({
          durationSeconds: Math.round(durationSeconds * 100) / 100,
          width,
          height,
          fps: Math.round(fps),
          format,
          sizeBytes,
          hasAudio,
          audioCodec,
          videoCodec,
        });
      });
    });
  }

  /**
   * Fallback container metadata parser for MP4/WebM when FFmpeg is not installed
   */
  private parseContainerFallback(
    filePath: string,
    format: VideoFormat,
    sizeBytes: number
  ): VideoMetadata {
    // Sensible defaults
    let durationSeconds = 15;
    let width = 1280;
    let height = 720;
    let hasAudio = false;

    try {
      const buffer = fs.readFileSync(filePath);
      // Quick MP4 mvhd search
      const mvhdIndex = buffer.indexOf('mvhd');
      if (mvhdIndex > 0 && mvhdIndex + 24 < buffer.length) {
        const timescale = buffer.readUInt32BE(mvhdIndex + 12);
        const duration = buffer.readUInt32BE(mvhdIndex + 16);
        if (timescale > 0 && duration > 0) {
          durationSeconds = Math.round((duration / timescale) * 100) / 100;
        }
      }

      // Quick MP4 tkhd search for width/height
      const tkhdIndex = buffer.indexOf('tkhd');
      if (tkhdIndex > 0 && tkhdIndex + 84 < buffer.length) {
        const w = buffer.readUInt32BE(tkhdIndex + 76) >> 16;
        const h = buffer.readUInt32BE(tkhdIndex + 80) >> 16;
        if (w > 0 && h > 0 && w <= 7680 && h <= 4320) {
          width = w;
          height = h;
        }
      }

      // Check for audio track (e.g. soun, mp4a)
      hasAudio = buffer.includes('soun') || buffer.includes('mp4a');
    } catch {
      // Use defaults
    }

    return {
      durationSeconds,
      width,
      height,
      fps: 30,
      format,
      sizeBytes,
      hasAudio,
    };
  }

  /**
   * Sample keyframes across video timeline with perceptual/content deduplication
   */
  async sampleKeyframes(
    filePath: string,
    metadata: VideoMetadata
  ): Promise<FrameExtractionResult> {
    const ffmpeg = this.getFfmpegPath();
    const duration = Math.max(1, metadata.durationSeconds);
    const maxFrames = Math.min(env.VIDEO_MAX_FRAMES, 8);

    // Compute sample timestamps
    const timestamps: { ts: number; reason: string }[] = [];
    timestamps.push({ ts: Math.min(0.5, duration * 0.1), reason: 'Opening / Introductory frame' });

    if (maxFrames >= 3) {
      timestamps.push({ ts: duration * 0.25, reason: 'Early development frame' });
      timestamps.push({ ts: duration * 0.50, reason: 'Central narrative midpoint' });
    }
    if (maxFrames >= 5) {
      timestamps.push({ ts: duration * 0.75, reason: 'Late narrative progression' });
    }
    timestamps.push({ ts: Math.max(0.5, duration * 0.90), reason: 'Closing / Concluding frame' });

    if (!ffmpeg) {
      // If FFmpeg is not available, return diagnostic keyframe notices without faking frames
      const keyframes: VideoKeyframe[] = timestamps.map((item, idx) => ({
        frameIndex: idx,
        timestampSeconds: Math.round(item.ts * 10) / 10,
        extractedImage: '',
        hash: `mock-hash-${idx}`,
        selectionReason: item.reason,
        observed: ['Visual frame sampling unavailable: FFmpeg binary not found on host system.'],
        inferred: [],
        ocrText: [],
      }));

      return {
        keyframes,
        deduplicatedCount: 0,
        totalSampled: timestamps.length,
      };
    }

    const keyframes: VideoKeyframe[] = [];
    const seenHashes = new Set<string>();
    let deduplicatedCount = 0;

    for (let i = 0; i < timestamps.length; i++) {
      const item = timestamps[i];
      try {
        const frameBuffer = await this.extractSingleFrame(filePath, ffmpeg, item.ts);
        if (frameBuffer && frameBuffer.length > 0) {
          const hash = this.computeFrameHash(frameBuffer);

          // Deduplication: if two consecutive frames share similar content hash, count deduplication
          if (seenHashes.has(hash)) {
            deduplicatedCount++;
            continue;
          }
          seenHashes.add(hash);

          const base64Data = frameBuffer.toString('base64');
          keyframes.push({
            frameIndex: keyframes.length,
            timestampSeconds: Math.round(item.ts * 10) / 10,
            extractedImage: `data:image/jpeg;base64,${base64Data}`,
            hash,
            selectionReason: item.reason,
            observed: [],
            inferred: [],
            ocrText: [],
          });
        }
      } catch (err) {
        console.warn(`[VideoProcessingService] Failed to extract frame at ${item.ts}s:`, err);
      }
    }

    return {
      keyframes,
      deduplicatedCount,
      totalSampled: timestamps.length,
    };
  }

  /**
   * Extract single JPEG frame buffer using FFmpeg pipe
   */
  private extractSingleFrame(
    filePath: string,
    ffmpeg: string,
    timestampSeconds: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const cmd = `"${ffmpeg}" -ss ${timestampSeconds} -i "${filePath}" -vframes 1 -f image2pipe -vcodec mjpeg -`;
      exec(cmd, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err) {
          return reject(err);
        }
        resolve(stdout);
      });
    });
  }

  /**
   * Compute a lightweight content hash to deduplicate visually identical frames
   */
  private computeFrameHash(buffer: Buffer): string {
    // Sample 256 bytes from the middle to create a content block fingerprint
    if (buffer.length < 512) {
      return crypto.createHash('md5').update(buffer).digest('hex');
    }
    const sample = Buffer.alloc(256);
    const offset = Math.floor(buffer.length / 2);
    buffer.copy(sample, 0, offset, offset + 256);
    return crypto.createHash('md5').update(sample).digest('hex');
  }
}

export const videoProcessingService = new VideoProcessingService();
