import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory or server root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trustlens?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'trustlens_default_development_jwt_secret_change_in_production_32char',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  // AI Provider Configuration
  AI_PRIMARY_PROVIDER: (process.env.AI_PRIMARY_PROVIDER || 'gemini') as 'gemini' | 'groq',
  AI_FALLBACK_PROVIDER: (process.env.AI_FALLBACK_PROVIDER || 'groq') as 'gemini' | 'groq' | 'none',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
};
