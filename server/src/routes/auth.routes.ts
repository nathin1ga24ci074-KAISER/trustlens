import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody, registerSchema, loginSchema } from '../middleware/validate.middleware';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validateBody(registerSchema), authController.register.bind(authController));
router.post('/login', validateBody(loginSchema), authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));

// Protected Profile Endpoint
router.get('/me', requireAuth, authController.me.bind(authController));

export default router;
