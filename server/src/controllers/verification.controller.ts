import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { textVerificationService } from '../services/text/text-verification.service';
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
