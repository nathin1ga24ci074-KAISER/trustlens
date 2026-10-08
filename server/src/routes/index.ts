import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import aiRoutes from './ai.routes';
import verificationRoutes from './verification.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    name: 'TrustLens API',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// AI Provider Foundation routes (diagnostic & execution)
router.use('/ai', aiRoutes);

// Evidence-backed verification routes
router.use('/verify', verificationRoutes);

export default router;
