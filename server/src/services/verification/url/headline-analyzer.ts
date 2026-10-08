import { HeadlineAnalysisResult } from '@trustlens/shared';
import { aiService } from '../../ai';

export class HeadlineAnalyzer {
  /**
   * Compare headline framing against the factual content of the article body
   */
  async analyzeHeadlineFraming(headline: string, bodyText: string): Promise<HeadlineAnalysisResult> {
    if (!headline || !headline.trim() || !bodyText || bodyText.trim().length < 50) {
      return {
        detected: false,
        severity: 'NONE',
        explanation: 'Insufficient content available for headline-body alignment evaluation.',
      };
    }

    const excerpt = bodyText.slice(0, 4000);

    const systemPrompt = `You are a media bias and clickbait detection specialist.
Analyze whether the headline exaggerates, sensationalizes, or distorts the actual substance of the article body.

Look for:
1. "HIGH" severity: Headline directly contradicts body findings, falsely claims certainty for unproven speculation, or asserts an extreme conclusion the body denies.
2. "MEDIUM" severity: Headline exaggerates statistics, omits critical caveats, or uses sensationalist baiting language not reflected in body tone.
3. "LOW" severity: Mild editorial hype or dramatic adjectives, but the core substance remains aligned.
4. "NONE": Headline accurately and neutrally reflects the article content.

Respond ONLY with valid JSON:
{
  "detected": boolean,
  "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH",
  "explanation": "concise explanation of whether and how the headline misrepresents or aligns with the body"
}`;

    const prompt = `HEADLINE: "${headline}"

ARTICLE BODY EXCERPT:
${excerpt}

Evaluate headline-to-body alignment as JSON:`;

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
          detected: severity !== 'NONE',
          severity,
          explanation:
            typeof parsed.explanation === 'string'
              ? parsed.explanation.trim()
              : 'Headline alignment analyzed.',
        };
      }
    } catch (err: any) {
      console.warn('[HeadlineAnalyzer] AI analysis failed, applying heuristic:', err?.message || err);
    }

    // Heuristic clickbait detection fallback
    const clickbaitPatterns = [
      /\b(you won'?t believe|shocking|mind[- ]blowing|what happens next|jaw[- ]dropping|miracle cure|destroys|obliterates)\b/i,
      /\b(\d+\s+reasons\s+why|\d+\s+things\s+you)\b/i,
      /[?!]{2,}/,
    ];

    const hasClickbaitPattern = clickbaitPatterns.some((pattern) => pattern.test(headline));
    if (hasClickbaitPattern) {
      return {
        detected: true,
        severity: 'MEDIUM',
        explanation: 'Headline employs sensationalist or baiting rhetorical patterns.',
      };
    }

    return {
      detected: false,
      severity: 'NONE',
      explanation: 'Headline generally reflects the narrative of the article body.',
    };
  }
}

export const headlineAnalyzer = new HeadlineAnalyzer();
