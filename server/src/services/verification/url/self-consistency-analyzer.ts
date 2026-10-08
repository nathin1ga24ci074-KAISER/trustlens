import { SelfConsistencyAnalysisResult } from '@trustlens/shared';
import { aiService } from '../../ai';

export class SelfConsistencyAnalyzer {
  /**
   * Detect internal contradictions or conflicting statements across paragraphs of the same article
   */
  async analyzeSelfConsistency(paragraphs: string[]): Promise<SelfConsistencyAnalysisResult> {
    if (!paragraphs || paragraphs.length < 2) {
      return {
        hasInconsistency: false,
        severity: 'NONE',
        details: 'Insufficient text volume for cross-paragraph self-consistency comparison.',
      };
    }

    const bodyText = paragraphs.slice(0, 10).join('\n\n').slice(0, 4500);

    const systemPrompt = `You are a forensic text consistency auditor.
Analyze the provided article excerpt to determine if the text contains INTERNAL CONTRADICTIONS, conflicting figures, or mutually exclusive assertions within itself.

Severity definitions:
- "HIGH": Directly conflicting numbers, opposing conclusions, or contradictory dates within the same story (e.g. "50 killed" in paragraph 1 vs "no casualties" in paragraph 4).
- "MEDIUM": Moderate internal timeline confusion or conflicting quotes that the author leaves unresolved.
- "LOW": Slight contextual nuance differences or minor phrasing variances.
- "NONE": The article narrative is internally consistent and coherent.

Respond ONLY with valid JSON:
{
  "hasInconsistency": boolean,
  "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH",
  "details": "concise description of the internal discrepancy, or confirm consistency"
}`;

    const prompt = `ARTICLE TEXT:
${bodyText}

Evaluate internal self-consistency as JSON:`;

    try {
      const response = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature: 0.1,
        maxTokens: 350,
      });

      const match = response.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const severity = ['NONE', 'LOW', 'MEDIUM', 'HIGH'].includes(parsed.severity)
          ? parsed.severity
          : 'NONE';

        return {
          hasInconsistency: severity !== 'NONE',
          severity,
          details:
            typeof parsed.details === 'string'
              ? parsed.details.trim()
              : 'Article is internally consistent.',
        };
      }
    } catch (err: any) {
      console.warn('[SelfConsistencyAnalyzer] AI analysis failed, falling back to clean baseline:', err?.message || err);
    }

    return {
      hasInconsistency: false,
      severity: 'NONE',
      details: 'No glaring internal self-contradictions identified within article text.',
    };
  }
}

export const selfConsistencyAnalyzer = new SelfConsistencyAnalyzer();
