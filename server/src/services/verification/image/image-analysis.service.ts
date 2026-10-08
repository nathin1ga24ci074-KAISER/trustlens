import { aiService } from '../../ai';
import { RawVisualUnderstanding, ValidatedImageInput } from './image.types';
import { ImageClassification } from '@trustlens/shared';

const IMAGE_ANALYSIS_SYSTEM_PROMPT = `You are the TrustLens Image Forensic and Visual Analysis Engine.
Analyze the provided image with high forensic rigor.

CRITICAL RULES:
1. STRICTLY DISTINGUISH "OBSERVED" from "INFERRED":
   - "OBSERVED": Directly visible physical facts (e.g., "A modern bridge over water", "A red sign with the word STOP", "A crowd of people carrying blue banners").
   - "INFERRED": Hypotheses, guesses, or possibilities (e.g., "This might be the Golden Gate Bridge", "This could be a climate protest").
2. EXTRACT ALL VISIBLE TEXT (OCR):
   - Extract headlines, signs, names, dates, quotes, statistics, watermarks, or social media handles verbatim.
3. CLASSIFY THE IMAGE:
   - "PHOTOGRAPH", "SCREENSHOT", "SCANNED_DOCUMENT", "MEME_OR_SOCIAL", "INFOGRAPHIC_OR_CHART", or "DIGITAL_GRAPHIC".
4. VISUAL MANIPULATION INDICATORS:
   - Cautiously inspect lighting consistency, geometric unnaturalness, compositing edges, duplicated patterns, or impossible text rendering.
   - Do NOT declare certainty that an image is fake merely because of compression artifacts.
5. USER CONTEXT:
   - If user-provided context is supplied, evaluate whether the visible content aligns with it, but DO NOT accept user context as ground truth.

OUTPUT JSON FORMAT ONLY:
{
  "description": "Comprehensive objective summary of the visual scene",
  "classification": "PHOTOGRAPH" | "SCREENSHOT" | "SCANNED_DOCUMENT" | "MEME_OR_SOCIAL" | "INFOGRAPHIC_OR_CHART" | "DIGITAL_GRAPHIC",
  "visibleText": ["text 1", "text 2"],
  "entities": ["entity 1", "entity 2"],
  "scene": "Short scene descriptor (e.g. urban street, indoor office, flooded road)",
  "possibleEvent": "Hypothesized event if identifiable or null",
  "possibleLocation": "Hypothesized geographical location or null",
  "possibleDate": "Hypothesized date/timeframe or null",
  "observations": ["Directly observed fact 1", "Directly observed fact 2"],
  "inferredAspects": ["Inference 1", "Inference 2"],
  "uncertainties": ["Uncertain aspect 1"],
  "manipulationIndicators": {
    "detected": true | false,
    "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH",
    "indicators": ["Specific observation if any"],
    "limitations": ["Visual inspection cannot prove digital generation or authenticity with 100% certainty"]
  }
}`;

export class ImageAnalysisService {
  /**
   * Perform multimodal vision analysis on an image buffer
   */
  async analyzeImage(
    input: ValidatedImageInput
  ): Promise<RawVisualUnderstanding> {
    const userContextPrompt = input.userContext
      ? `\n\nUSER-PROVIDED CONTEXT (HYPOTHESIS ONLY, NOT EVIDENCE):\n"${input.userContext}"\nEvaluate if visible elements match this context.`
      : '';

    const prompt = `Analyze this image thoroughly according to instructions.${userContextPrompt}`;

    try {
      const response = await aiService.generateMultimodal({
        prompt,
        images: [
          {
            data: input.buffer,
            mimeType: input.mimeType,
          },
        ],
        systemPrompt: IMAGE_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 2048,
        timeoutMs: 25000,
      });

      const parsed = this.parseVisualResponse(response.text);
      if (parsed) {
        return parsed;
      }
    } catch (aiErr: any) {
      console.warn(
        `[ImageAnalysisService] Multimodal vision call failed or unavailable: ${aiErr.message || aiErr}. Employing structured fallback.`
      );
    }

    // Fallback: heuristic analysis when multimodal provider is unavailable or in offline mode
    return this.createHeuristicVisualAnalysis(input);
  }

  /**
   * Safely parse structured JSON from model output
   */
  private parseVisualResponse(rawText: string): RawVisualUnderstanding | null {
    if (!rawText) return null;

    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      }

      const parsed = JSON.parse(cleaned);

      const classification: ImageClassification = [
        'PHOTOGRAPH',
        'SCREENSHOT',
        'SCANNED_DOCUMENT',
        'MEME_OR_SOCIAL',
        'INFOGRAPHIC_OR_CHART',
        'DIGITAL_GRAPHIC',
      ].includes(parsed.classification)
        ? parsed.classification
        : 'PHOTOGRAPH';

      return {
        description: parsed.description || 'Image uploaded for visual verification.',
        classification,
        visibleText: Array.isArray(parsed.visibleText) ? parsed.visibleText : [],
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        scene: parsed.scene || 'Visual content',
        possibleEvent: parsed.possibleEvent || null,
        possibleLocation: parsed.possibleLocation || null,
        possibleDate: parsed.possibleDate || null,
        observations: Array.isArray(parsed.observations) ? parsed.observations : [],
        inferredAspects: Array.isArray(parsed.inferredAspects) ? parsed.inferredAspects : [],
        uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
        manipulationIndicators: {
          detected: Boolean(parsed.manipulationIndicators?.detected),
          severity: ['NONE', 'LOW', 'MEDIUM', 'HIGH'].includes(
            parsed.manipulationIndicators?.severity
          )
            ? parsed.manipulationIndicators.severity
            : 'NONE',
          indicators: Array.isArray(parsed.manipulationIndicators?.indicators)
            ? parsed.manipulationIndicators.indicators
            : [],
          limitations: Array.isArray(parsed.manipulationIndicators?.limitations)
            ? parsed.manipulationIndicators.limitations
            : [
                'AI-based visual inspection cannot reliably prove that an image is authentic or generated in all circumstances.',
              ],
        },
      };
    } catch (err) {
      console.warn('[ImageAnalysisService] Failed to parse model JSON:', err);
      return null;
    }
  }

  /**
   * Deterministic fallback when AI is unavailable or offline
   */
  private createHeuristicVisualAnalysis(
    input: ValidatedImageInput
  ): RawVisualUnderstanding {
    const hasContext = Boolean(input.userContext && input.userContext.trim());
    const userCtx = input.userContext || '';

    const observations = [
      `Valid ${input.mimeType.toUpperCase()} file processed (${(input.sizeBytes / 1024).toFixed(1)} KB).`,
    ];
    const inferredAspects: string[] = [];

    if (hasContext) {
      inferredAspects.push(`User submitted verification hypothesis: "${userCtx}"`);
    }

    return {
      description: hasContext
        ? `Image associated with user query: "${userCtx}"`
        : 'Uploaded image file processed for visual evidence verification.',
      classification: 'PHOTOGRAPH',
      visibleText: [],
      entities: hasContext ? [userCtx.slice(0, 50)] : [],
      scene: 'Visual media',
      possibleEvent: hasContext ? userCtx : null,
      possibleLocation: null,
      possibleDate: null,
      observations,
      inferredAspects,
      uncertainties: [
        'Direct multimodal vision analysis could not be reached; utilizing structured evidence matching.',
      ],
      manipulationIndicators: {
        detected: false,
        severity: 'NONE',
        indicators: [],
        limitations: [
          'Visual inspection cannot definitively verify authenticity without independent ground-truth evidence.',
        ],
      },
    };
  }
}

export const imageAnalysisService = new ImageAnalysisService();
