import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import crypto from 'crypto';
import { VideoMetadata, VideoTranscriptAnalysis, VideoTranscriptSegment } from '@trustlens/shared';
import { videoProcessingService } from './video-processing.service';
import { videoSecurityService } from './video-security.service';
import { aiService } from '../../ai';

export class VideoAudioService {
  /**
   * Extracts and transcribes audio from video file
   */
  async processAudio(
    videoPath: string,
    metadata: VideoMetadata
  ): Promise<VideoTranscriptAnalysis> {
    if (!metadata.hasAudio) {
      return {
        transcriptAvailable: false,
        fullTranscript: '',
        segments: [],
        status: 'Audio/transcription unavailable: Video does not contain an audio track.',
      };
    }

    const ffmpeg = videoProcessingService.getFfmpegPath();
    if (!ffmpeg) {
      return {
        transcriptAvailable: false,
        fullTranscript: '',
        segments: [],
        status: 'Audio/transcription unavailable: FFmpeg binary not found for audio extraction.',
      };
    }

    // Extract audio to temporary 16kHz mono WAV file
    const tempAudioDir = videoSecurityService.ensureTempDir();
    const tempAudioFile = path.join(tempAudioDir, `audio_${crypto.randomUUID()}.wav`);

    try {
      await this.extractAudioTrack(videoPath, tempAudioFile, ffmpeg);

      if (!fs.existsSync(tempAudioFile)) {
        return {
          transcriptAvailable: false,
          fullTranscript: '',
          segments: [],
          status: 'Audio/transcription unavailable: Audio stream could not be extracted.',
        };
      }

      const audioBuffer = fs.readFileSync(tempAudioFile);
      if (audioBuffer.length < 1024) {
        return {
          transcriptAvailable: false,
          fullTranscript: '',
          segments: [],
          status: 'Audio/transcription unavailable: Audio stream is silent or empty.',
        };
      }

      // Transcribe via AI Service (Gemini / Groq)
      const transcript = await this.transcribeAudioBuffer(audioBuffer);
      return transcript;
    } catch (err: any) {
      console.warn('[VideoAudioService] Audio processing encountered an error:', err.message);
      return {
        transcriptAvailable: false,
        fullTranscript: '',
        segments: [],
        status: `Audio/transcription unavailable: ${err.message || 'Processing error'}`,
      };
    } finally {
      // Guaranteed cleanup of temporary audio file
      videoSecurityService.cleanupTempFiles([tempAudioFile]);
    }
  }

  /**
   * Run FFmpeg command to extract WAV audio
   */
  private extractAudioTrack(
    videoPath: string,
    outputWavPath: string,
    ffmpeg: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Limit to first 60 seconds to conserve tokens and processing
      const cmd = `"${ffmpeg}" -y -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -t 60 "${outputWavPath}"`;
      exec(cmd, { timeout: 15000 }, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  /**
   * Transcribe audio buffer via AI Service
   */
  private async transcribeAudioBuffer(buffer: Buffer): Promise<VideoTranscriptAnalysis> {
    try {
      const response = await aiService.transcribeAudio({
        audio: {
          data: buffer,
          mimeType: 'audio/wav',
        },
      });

      const parsed = this.safeParseJson(response.text);
      if (parsed && typeof parsed.fullTranscript === 'string') {
        const segments: VideoTranscriptSegment[] = Array.isArray(parsed.segments)
          ? parsed.segments.map((s: any) => ({
              startTime: typeof s.startTime === 'number' ? s.startTime : 0,
              endTime: typeof s.endTime === 'number' ? s.endTime : 0,
              text: String(s.text || '').trim(),
            }))
          : [];

        return {
          transcriptAvailable: true,
          fullTranscript: parsed.fullTranscript.trim(),
          segments,
          status: 'TRANSCRIPTION_COMPLETE',
          language: parsed.language || 'en',
        };
      }

      if (response.text && response.text.trim().length > 0) {
        return {
          transcriptAvailable: true,
          fullTranscript: response.text.trim(),
          segments: [{ startTime: 0, endTime: 10, text: response.text.trim() }],
          status: 'TRANSCRIPTION_COMPLETE',
        };
      }
    } catch (err: any) {
      console.warn('[VideoAudioService] AI transcription failed:', err.message);
    }

    return {
      transcriptAvailable: false,
      fullTranscript: '',
      segments: [],
      status: 'Audio/transcription unavailable: Speech model could not extract discernible dialogue.',
    };
  }

  private safeParseJson(raw: string): any {
    try {
      let clean = raw.trim();
      if (clean.startsWith('```json')) {
        clean = clean.slice(7);
      } else if (clean.startsWith('```')) {
        clean = clean.slice(3);
      }
      if (clean.endsWith('```')) {
        clean = clean.slice(0, -3);
      }
      return JSON.parse(clean.trim());
    } catch {
      return null;
    }
  }
}

export const videoAudioService = new VideoAudioService();
