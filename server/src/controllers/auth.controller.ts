import { Request, Response, NextFunction } from 'express';
import { authService, AuthConflictError, InvalidCredentialsError } from '../services/auth.service';
import { getAuthCookieOptions } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const { user, token } = await authService.register({ name, email, password });

      // Set secure HTTP-only cookie
      res.cookie('token', token, getAuthCookieOptions());

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user,
        token,
      });
    } catch (error) {
      if (error instanceof AuthConflictError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login({ email, password });

      // Set secure HTTP-only cookie
      res.cookie('token', token, getAuthCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        user,
        token,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('token', {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  /**
   * GET /api/auth/me
   */
  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthenticated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: req.user,
    });
  }
}

export const authController = new AuthController();
