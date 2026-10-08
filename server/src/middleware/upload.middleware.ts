import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { videoSecurityService } from '../services/verification/video/video-security.service';

// In-memory storage for images
const imageStorage = multer.memoryStorage();
const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
});

export const imageUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  imageUpload.single('image')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          errorCode: 'IMAGE_TOO_LARGE',
          message: 'Image size exceeds maximum allowable limit of 10MB.',
        });
        return;
      }
      res.status(400).json({
        success: false,
        errorCode: 'IMAGE_INVALID_TYPE',
        message: err.message || 'Error occurred during image upload processing.',
      });
      return;
    }
    next();
  });
};

// Disk storage for temporary video files
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, videoSecurityService.ensureTempDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload_${crypto.randomUUID()}${ext || '.mp4'}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: env.VIDEO_MAX_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

export const videoUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  videoUpload.single('video')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          errorCode: 'VIDEO_TOO_LARGE',
          message: `Video size exceeds maximum allowable limit of ${env.VIDEO_MAX_SIZE_MB}MB.`,
        });
        return;
      }
      res.status(400).json({
        success: false,
        errorCode: 'VIDEO_INVALID_TYPE',
        message: err.message || 'Error occurred during video upload processing.',
      });
      return;
    }
    next();
  });
};
