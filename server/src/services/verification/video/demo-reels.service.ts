import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DemoReelItem } from '@trustlens/shared';
import { videoProcessingService } from './video-processing.service';

export const DEMO_REELS: DemoReelItem[] = [
  {
    id: 'moon-landing',
    title: 'Apollo 11 Lunar Landing Historical Footage',
    description: 'Archival video showing Apollo 11 lunar module landing on the Moon with astronaut commentary.',
    claimedContext: 'Apollo 11 lunar landing in July 1969 Neil Armstrong and Buzz Aldrin.',
    duration: 8,
    category: 'Historical Science',
    videoUrl: '/demo-videos/moon-landing.mp4',
    thumbnailUrl: '',
    sourceFilename: 'moon-landing.mp4',
  },
  {
    id: 'wildfire-recycled',
    title: 'Devastating California Wildfire 2026',
    description: 'Dramatic blaze footage circulated on social media claiming to be a wildfire in California in 2026.',
    claimedContext: 'Breaking: Massive California wildfire spreading in October 2026.',
    duration: 6,
    category: 'Context Recycling',
    videoUrl: '/demo-videos/wildfire-recycled.mp4',
    thumbnailUrl: '',
    sourceFilename: 'wildfire-recycled.mp4',
  },
  {
    id: 'fusion-ignition',
    title: 'National Ignition Facility Net Energy Gain',
    description: 'Laboratory report detailing controlled nuclear fusion experiment yielding 3.15 MJ output.',
    claimedContext: 'National Ignition Facility achieves net energy gain in nuclear fusion experiment.',
    duration: 10,
    category: 'Scientific Breakthrough',
    videoUrl: '/demo-videos/fusion-ignition.mp4',
    thumbnailUrl: '',
    sourceFilename: 'fusion-ignition.mp4',
  },
  {
    id: 'deep-field-jwst',
    title: 'James Webb Space Telescope First Deep Field',
    description: 'NASA press release video displaying galaxy cluster SMACS 0723 captured in infrared.',
    claimedContext: 'NASA James Webb Space Telescope releases deepest infrared image of the early universe.',
    duration: 8,
    category: 'Astronomy',
    videoUrl: '/demo-videos/deep-field-jwst.mp4',
    thumbnailUrl: '',
    sourceFilename: 'deep-field-jwst.mp4',
  },
  {
    id: 'wire-transfer-scam',
    title: 'CEO Video Urgent Wire Transfer Demand',
    description: 'Video message purporting to be from corporate executive ordering immediate treasury funds transfer.',
    claimedContext: 'Urgent emergency executive authorization for overseas account transfer.',
    duration: 5,
    category: 'Financial Social Engineering',
    videoUrl: '/demo-videos/wire-transfer-scam.mp4',
    thumbnailUrl: '',
    sourceFilename: 'wire-transfer-scam.mp4',
  },
  {
    id: 'venice-flooding',
    title: 'Extreme Aqua Alta Flooding in Venice',
    description: 'Footage showing high water levels submerging St. Mark\'s Square during seasonal storm surge.',
    claimedContext: 'Historic flood waters inundate Venice Italy during major tidal surge.',
    duration: 7,
    category: 'Weather & Climate',
    videoUrl: '/demo-videos/venice-flooding.mp4',
    thumbnailUrl: '',
    sourceFilename: 'venice-flooding.mp4',
  },
  {
    id: 'sprint-world-record',
    title: 'Men\'s 100m Track & Field World Record',
    description: 'Athletics broadcast clip claiming athlete set new sub-9.5s world record at world championships.',
    claimedContext: 'Sprinter breaks 100 meter world record with 9.48s official timing.',
    duration: 6,
    category: 'Sports & Athletics',
    videoUrl: '/demo-videos/sprint-world-record.mp4',
    thumbnailUrl: '',
    sourceFilename: 'sprint-world-record.mp4',
  },
  {
    id: 'protest-crowd',
    title: 'Mass Civil Protests in Capital Square',
    description: 'Aerial crowd footage depicting mass demonstration claimed to have happened in Madrid yesterday.',
    claimedContext: 'Over 500,000 citizens march in Madrid capital protest this week.',
    duration: 8,
    category: 'Political Demonstration',
    videoUrl: '/demo-videos/protest-crowd.mp4',
    thumbnailUrl: '',
    sourceFilename: 'protest-crowd.mp4',
  },
  {
    id: 'mars-curiosity',
    title: 'Mars Curiosity Rover Discovers Fossilized Skeleton',
    description: 'Gale Crater surface panorama with viral claim that sedimentary rocks contain dinosaur bone fossils.',
    claimedContext: 'NASA Curiosity rover discovers fossilized vertebrate bones on Mars surface.',
    duration: 7,
    category: 'Viral Misinformation',
    videoUrl: '/demo-videos/mars-curiosity.mp4',
    thumbnailUrl: '',
    sourceFilename: 'mars-curiosity.mp4',
  },
  {
    id: 'miracle-herb-cure',
    title: 'Secret Herbal Infusion Cures Type 2 Diabetes',
    description: 'Infomercial clip asserting that rare mountain herb permanently reverses chronic metabolic disease.',
    claimedContext: 'Medical doctors confirm herbal extract cures diabetes in 14 days without insulin.',
    duration: 9,
    category: 'Health Misinformation',
    videoUrl: '/demo-videos/miracle-herb-cure.mp4',
    thumbnailUrl: '',
    sourceFilename: 'miracle-herb-cure.mp4',
  },
];

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
