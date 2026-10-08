import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error Handler]', err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  let safeMessage = err.message || 'An unexpected internal server error occurred';
  if (env.isProduction) {
    if (statusCode === 500) {
      safeMessage = 'An unexpected internal server error occurred';
    } else {
      safeMessage = safeMessage.replace(/([A-Z]:\\[^\s"']+)|(\/[a-z0-9_.-]+){2,}/gi, '[path redacted]');
    }
  }

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(env.isProduction ? {} : { stack: err.stack }),
  });
}
