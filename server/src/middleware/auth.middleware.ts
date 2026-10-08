import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { userService } from '../services/user.service';

/**
 * Middleware to require authentication on protected routes
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Check cookies first, then Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
      return;
    }

    // 2. Verify token signature & expiry
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired session token.',
      });
      return;
    }

    // 3. Verify user still exists in database
    const user = await userService.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists.',
      });
      return;
    }

    // 4. Attach sanitized user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
