import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { aiService } from '../services/ai';
import { AIError } from '../services/ai/ai.errors';

export class AIController {
  /**
   * POST /api/ai/test
   * Protected development/test endpoint for AI provider connectivity
   */
  async test(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt, provider, systemPrompt, temperature } = req.body;

      const aiResponse = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature,
        targetProvider: provider,
      });

      res.status(200).json({
        success: true,
        isDevelopmentOnly: true,
        provider: aiResponse.provider,
        model: aiResponse.model,
        response: aiResponse.text,
        usage: aiResponse.usage
          ? {
              inputTokens: aiResponse.usage.inputTokens,
              outputTokens: aiResponse.usage.outputTokens,
              totalTokens: aiResponse.usage.totalTokens,
            }
          : null,
        latencyMs: aiResponse.latencyMs,
      });
    } catch (error: any) {
      if (error instanceof AIError) {
        res.status(error.statusCode).json({
          success: false,
          code: error.code,
          provider: error.provider,
          message: error.message,
          isRetryable: error.isRetryable,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/ai/status
   * Protected endpoint reporting AI configuration status
   */
  async status(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const providerStatus = aiService.getProviderStatus();
    const strategy = aiService.getConfiguredProviders();

    res.status(200).json({
      success: true,
      strategy,
      providers: providerStatus,
    });
  }
}

export const aiController = new AIController();
