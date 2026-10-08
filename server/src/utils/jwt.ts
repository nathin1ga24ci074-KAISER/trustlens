import jwt, { SignOptions } from 'jsonwebtoken';
import { CookieOptions } from 'express';
import { env } from '../config/env';

export interface JwtTokenPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Generate a signed JWT token
 */
export function signToken(payload: JwtTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtTokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Standard cookie configuration for authentication token
 */
export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
}
