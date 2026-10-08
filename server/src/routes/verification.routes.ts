import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody, verifyTextSchema, verifyUrlSchema } from '../middleware/validate.middleware';
import { imageUploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// Protected verification endpoints
router.post('/text', requireAuth, validateBody(verifyTextSchema), verificationController.verifyText.bind(verificationController));
router.post('/url', requireAuth, validateBody(verifyUrlSchema), verificationController.verifyUrl.bind(verificationController));
router.post('/image', requireAuth, imageUploadMiddleware, verificationController.verifyImage.bind(verificationController));
router.get('/history', requireAuth, verificationController.listHistory.bind(verificationController));
router.get('/:id', requireAuth, verificationController.getById.bind(verificationController));

export default router;
