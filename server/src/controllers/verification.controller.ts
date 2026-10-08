import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { textVerificationService } from '../services/text/text-verification.service';
import { urlVerificationService, UrlFetchError } from '../services/verification/url';
import { imageVerificationService, ImageSecurityError } from '../services/verification/image';
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
