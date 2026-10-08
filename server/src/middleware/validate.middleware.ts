import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const aiTestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, 'Prompt text is required')
    .max(8000, 'Prompt cannot exceed 8,000 characters'),
  provider: z.enum(['gemini', 'groq']).optional(),
  systemPrompt: z.string().trim().max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const verifyTextSchema = z.object({
  text: z
    .string()
    .trim()
    .min(2, 'Claim statement must be at least 2 characters')
    .max(5000, 'Claim statement cannot exceed 5,000 characters'),
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: issues,
        });
        return;
      }
      next(error);
    }
  };
}
