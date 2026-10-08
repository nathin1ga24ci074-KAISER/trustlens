import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DemoReelItem } from '@trustlens/shared';
import { videoProcessingService } from './video-processing.service';
import { DEMO_REELS_CONFIG } from './demo-reels.config';

export const DEMO_REELS: DemoReelItem[] = DEMO_REELS_CONFIG;

export class DemoReelsService {
  private demoDir: string;
  private clientPublicDir: string;

  constructor() {
    this.demoDir = path.resolve(process.cwd(), 'server', 'demo-videos');
    this.clientPublicDir = path.resolve(process.cwd(), 'client', 'public', 'demo-videos');
    this.ensureDirs();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.demoDir)) {
      fs.mkdirSync(this.demoDir, { recursive: true });
    }
    if (!fs.existsSync(this.clientPublicDir)) {
      fs.mkdirSync(this.clientPublicDir, { recursive: true });
    }
  }

  getDemoReels(): DemoReelItem[] {
    return DEMO_REELS;
  }

  getDemoReelById(id: string): DemoReelItem | undefined {
    return DEMO_REELS.find((r) => r.id === id);
  }

  getDemoReelFilePath(id: string): string | null {
    const reel = this.getDemoReelById(id);
    if (!reel || !reel.sourceFilename) {
      return null;
    }

    const primaryPath = path.join(this.demoDir, reel.sourceFilename);
    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }

    const clientPath = path.join(this.clientPublicDir, reel.sourceFilename);
    if (fs.existsSync(clientPath)) {
      return clientPath;
    }

    return null;
  }

  /**
   * Automatically provisions lightweight valid sample MP4 demo clips using FFmpeg if not yet present
   */
  ensureDemoVideos(): void {
    this.ensureDirs();
    const ffmpeg = videoProcessingService.getFfmpegPath();
    if (!ffmpeg) {
      return;
    }

    for (const reel of DEMO_REELS) {
      if (!reel.sourceFilename) continue;

      const serverFile = path.join(this.demoDir, reel.sourceFilename);
      const clientFile = path.join(this.clientPublicDir, reel.sourceFilename);

      if (!fs.existsSync(serverFile) || !fs.existsSync(clientFile)) {
        try {
          const duration = Math.min(reel.duration || 5, 8);
          // Generate a real lightweight valid MP4 test clip with audio tone
          const cmd = `"${ffmpeg}" -y -f lavfi -i testsrc=duration=${duration}:size=480x640:rate=10 -f lavfi -i sine=frequency=440:duration=${duration} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${serverFile}"`;
          execSync(cmd, { stdio: 'ignore', timeout: 15000 });

          if (fs.existsSync(serverFile)) {
            fs.copyFileSync(serverFile, clientFile);
          }
        } catch (err: any) {
          console.warn(`[DemoReelsService] Could not pre-generate ${reel.sourceFilename}:`, err.message);
        }
      }
    }
  }
}

export const demoReelsService = new DemoReelsService();
