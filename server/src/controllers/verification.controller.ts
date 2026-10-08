import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { textVerificationService } from '../services/text/text-verification.service';
import { urlVerificationService, UrlFetchError } from '../services/verification/url';
import { imageVerificationService, ImageSecurityError } from '../services/verification/image';
import {
  videoVerificationService,
  videoSecurityService,
  demoReelsService,
  VideoSecurityError,
} from '../services/verification/video';
import { multimodalVerificationService } from '../services/verification/multimodal';
import { verificationHistoryService } from '../services/verification/verification-history.service';

export class VerificationController {

  /**
   * POST /api/verify/text
   * Executes the full multi-stage evidence-backed text verification pipeline
   */
  async verifyText(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { text } = req.body;
      const result = await textVerificationService.verifyText(text, req.user.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/verify/url
   * Executes the full multi-stage evidence-backed URL verification pipeline
   */
  async verifyUrl(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { url } = req.body;
      const result = await urlVerificationService.verifyUrl(url, req.user.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof UrlFetchError) {
        const statusCode =
          error.code === 'URL_INVALID' || error.code === 'URL_UNSUPPORTED_PROTOCOL'
            ? 400
            : error.code === 'URL_BLOCKED' || error.code === 'URL_REDIRECT_BLOCKED'
            ? 403
            : error.code === 'URL_TIMEOUT'
            ? 504
            : 422;

        res.status(statusCode).json({
          success: false,
          errorCode: error.code,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/verify/image
   * Executes the full multi-stage evidence-backed image verification pipeline
   */
  async verifyImage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      if (!req.file || !req.file.buffer) {
        res.status(400).json({
          success: false,
          errorCode: 'IMAGE_EMPTY',
          message: 'An image file must be uploaded under the "image" field.',
        });
        return;
      }

      const context = typeof req.body?.context === 'string' ? req.body.context : undefined;

      const result = await imageVerificationService.verifyImage({
        buffer: req.file.buffer,
        declaredMimeType: req.file.mimetype,
        originalFilename: req.file.originalname,
        userContext: context,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ImageSecurityError) {
        const statusCode =
          error.code === 'IMAGE_TOO_LARGE'
            ? 400
            : error.code === 'IMAGE_INVALID_TYPE' || error.code === 'IMAGE_EMPTY'
            ? 400
            : error.code === 'IMAGE_DECOMPRESSION_BOMB'
            ? 400
            : 422;

        res.status(statusCode).json({
          success: false,
          errorCode: error.code,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/verify/video
   * Executes the full multi-stage evidence-backed video verification pipeline
   */
  async verifyVideo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      let filePath = req.file?.path;
      let originalFilename = req.file?.originalname || 'uploaded_video.mp4';
      let declaredMimeType = req.file?.mimetype;
      let fileSizeBytes = req.file?.size || 0;

      // Check if user submitted a demo reel ID instead of a direct file upload
      const demoId = req.body?.demoId;
      if (!filePath && demoId && typeof demoId === 'string') {
        const demoPath = demoReelsService.getDemoReelFilePath(demoId);
        if (!demoPath || !fs.existsSync(demoPath)) {
          res.status(400).json({
            success: false,
            errorCode: 'DEMO_REEL_NOT_FOUND',
            message: `Demo reel with ID "${demoId}" was not found or is unavailable.`,
          });
          return;
        }

        // Create temporary copy in upload dir so cleanup does not delete original demo file
        const tempCopyPath = path.join(
          videoSecurityService.ensureTempDir(),
          `demo_copy_${crypto.randomUUID()}_${path.basename(demoPath)}`
        );
        fs.copyFileSync(demoPath, tempCopyPath);

        filePath = tempCopyPath;
        originalFilename = path.basename(demoPath);
        declaredMimeType = 'video/mp4';
        fileSizeBytes = fs.statSync(tempCopyPath).size;
      }

      if (!filePath) {
        res.status(400).json({
          success: false,
          errorCode: 'VIDEO_EMPTY',
          message: 'A video file must be uploaded under the "video" field, or a valid "demoId" must be provided.',
        });
        return;
      }

      const context = typeof req.body?.context === 'string' ? req.body.context : undefined;

      const result = await videoVerificationService.verifyVideo({
        filePath,
        originalFilename,
        declaredMimeType,
        fileSizeBytes,
        userContext: context,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof VideoSecurityError) {
        const statusCode =
          error.code === 'VIDEO_TOO_LARGE' ||
          error.code === 'VIDEO_INVALID_TYPE' ||
          error.code === 'VIDEO_EMPTY' ||
          error.code === 'VIDEO_TOO_LONG' ||
          error.code === 'VIDEO_DIMENSIONS_TOO_LARGE' ||
          error.code === 'VIDEO_CORRUPT'
            ? 400
            : error.code === 'FFMPEG_UNAVAILABLE'
            ? 503
            : 422;

        res.status(statusCode).json({
          success: false,
          errorCode: error.code,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/verify/video/demo-reels
   * Lists available local demo reels for rapid hackathon testing
   */
  async getDemoReels(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      demoReelsService.ensureDemoVideos();
      const reels = demoReelsService.getDemoReels();
      res.status(200).json({
        success: true,
        data: reels,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/verify/multimodal
   * Executes unified multimodal verification across any combination of text, URL, image, and video
   */
  async verifyMultimodal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : undefined;
      const url = typeof req.body?.url === 'string' ? req.body.url.trim() : undefined;
      const demoId = typeof req.body?.demoId === 'string' ? req.body.demoId.trim() : undefined;

      const imageFileItem = files?.['image']?.[0];
      const videoFileItem = files?.['video']?.[0];

      let imageFile: { buffer: Buffer; originalFilename: string; mimeType: string } | undefined;
      if (imageFileItem) {
        const buffer = fs.readFileSync(imageFileItem.path);
        imageFile = {
          buffer,
          originalFilename: imageFileItem.originalname,
          mimeType: imageFileItem.mimetype || 'image/jpeg',
        };
        try { fs.unlinkSync(imageFileItem.path); } catch {}
      }

      let videoFile: { filePath: string; originalFilename: string; mimeType?: string; sizeBytes: number } | undefined;
      if (videoFileItem) {
        videoFile = {
          filePath: videoFileItem.path,
          originalFilename: videoFileItem.originalname,
          mimeType: videoFileItem.mimetype,
          sizeBytes: videoFileItem.size,
        };
      }

      if (!text && !url && !imageFile && !videoFile && !demoId) {
        res.status(400).json({
          success: false,
          errorCode: 'NO_INPUT_PROVIDED',
          message: 'At least one input modality (text, url, image, video, or demoId) must be provided.',
        });
        return;
      }

      const result = await multimodalVerificationService.verifyMultimodal({
        text,
        url,
        imageFile,
        videoFile,
        demoId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }



  /**
   * GET /api/verify/:id
   * Retrieves a specific verification ensuring strict user authorization
   */
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const record = await verificationHistoryService.getVerificationById(id, req.user.id);

      if (!record) {
        // Return 404 to avoid leaking existence of other users' records
        res.status(404).json({
          success: false,
          message: 'Verification record not found or access denied.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/verify/history
   * Lists all historical verifications belonging to the authenticated user
   */
  async listHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const records = await verificationHistoryService.listUserVerifications(req.user.id);

      res.status(200).json({
        success: true,
        data: records,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const verificationController = new VerificationController();
