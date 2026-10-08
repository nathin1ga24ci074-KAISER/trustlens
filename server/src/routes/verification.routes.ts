import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody, verifyTextSchema } from '../middleware/validate.middleware';

const router = Router();

// Protected verification endpoints
router.post('/text', requireAuth, validateBody(verifyTextSchema), verificationController.verifyText.bind(verificationController));
router.get('/history', requireAuth, verificationController.listHistory.bind(verificationController));
router.get('/:id', requireAuth, verificationController.getById.bind(verificationController));

export default router;
