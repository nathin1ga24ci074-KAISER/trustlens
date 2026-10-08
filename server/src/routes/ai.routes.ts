import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody, aiTestSchema } from '../middleware/validate.middleware';

const router = Router();

/**
 * Protected AI test & diagnostic endpoints (Development/Verification only)
 */
router.post('/test', requireAuth, validateBody(aiTestSchema), aiController.test.bind(aiController));
router.get('/status', requireAuth, aiController.status.bind(aiController));

export default router;
