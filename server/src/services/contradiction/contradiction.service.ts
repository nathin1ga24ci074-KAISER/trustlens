import { EvidenceItem, EvidenceStance, ContradictionAnalysisResult } from '@trustlens/shared';
import { aiService } from '../ai';

export class ContradictionService {
  /**
   * Classify the stance of each evidence item relative to the claim
   */
  async classifyEvidenceStances(claim: string, items: EvidenceItem[]): Promise<EvidenceItem[]> {
    if (!items || items.length === 0) {
      return [];
    }

    // Process stances in batches using AIService
    const evidenceListForPrompt = items.map((item, idx) => ({
      index: idx,
      title: item.title,
      domain: item.domain,
      snippet: item.snippet.slice(0, 300),
    }));

    const systemPrompt = `You are a forensic evidence analyst for a fact-checking platform.
Given a core claim and a list of web evidence snippets, determine each snippet's factual stance toward the claim.
Stance categories:
- "SUPPORTS": The evidence confirms, affirms, or validates the factual claim.
- "CONTRADICTS": The evidence directly disputes, disproves, denies, or contradicts the claim.
- "NEUTRAL": The evidence discusses the subject/entities but neither proves nor disproves the specific claim.
- "UNKNOWN": The snippet lacks sufficient context to determine.

Respond ONLY with a JSON array where each entry is:
{
  "index": number,
  "stance": "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" | "UNKNOWN",
  "explanation": "brief 1-sentence reason"
}`;

    const prompt = `Claim: "${claim}"\n\nEvidence Items:\n${JSON.stringify(evidenceListForPrompt, null, 2)}`;

    try {
      const response = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature: 0.1,
      });

      const parsed = this.safeParseJson(response.text);
      if (Array.isArray(parsed)) {
        const stanceMap = new Map<number, { stance: EvidenceStance; explanation?: string }>();
        for (const entry of parsed) {
          if (typeof entry.index === 'number' && ['SUPPORTS', 'CONTRADICTS', 'NEUTRAL', 'UNKNOWN'].includes(entry.stance)) {
            stanceMap.set(entry.index, {
              stance: entry.stance as EvidenceStance,
              explanation: entry.explanation,
            });
          }
        }

        // Apply classified stances
        return items.map((item, idx) => {
          const matched = stanceMap.get(idx);
          if (matched) {
            return {
              ...item,
              stance: matched.stance,
              stanceExplanation: matched.explanation || null,
            };
          }
          return item;
        });
      }
    } catch (err) {
      console.warn('[ContradictionService] AI stance classification failed, using heuristic classification:', err);
    }

    // Fallback heuristic: check for negative keywords in snippet
    return items.map((item) => {
      const lowerSnippet = item.snippet.toLowerCase();
      const hasNegation = /\b(false|hoax|debunked|fake|incorrect|not true|no evidence|disproven)\b/.test(lowerSnippet);
      const hasAffirmation = /\b(confirmed|officially|verified|announced|won|record|truth)\b/.test(lowerSnippet);

      let stance: EvidenceStance = 'NEUTRAL';
      if (hasNegation) stance = 'CONTRADICTS';
      else if (hasAffirmation) stance = 'SUPPORTS';

      return {
        ...item,
        stance,
        stanceExplanation: 'Classified via linguistic pattern matching.',
      };
    });
  }

  /**
   * In-depth contradiction analysis across supporting and contradicting evidence
   */
  async analyzeContradictions(
    claim: string,
    supporting: EvidenceItem[],
    contradicting: EvidenceItem[]
  ): Promise<ContradictionAnalysisResult> {
    if (contradicting.length === 0) {
      return {
        hasContradiction: false,
        severity: 'NONE',
        details: 'No direct contradiction detected among retrieved independent web evidence.',
        conflictingAspects: [],
        contextualFactors: [],
      };
    }

    const systemPrompt = `You are a contradiction inference specialist.
Given a claim and lists of supporting and contradicting evidence, perform a thorough cross-examination:
1. Determine whether the contradiction is DIRECT (actual factual conflict) or CONTEXTUAL (differences in timeframe, definitions, entities, or satire).
2. Rate severity: "LOW", "MODERATE", or "SEVERE".
3. Identify which specific aspect of the claim is in dispute.

Respond ONLY with a JSON object:
{
  "hasContradiction": true,
  "severity": "LOW" | "MODERATE" | "SEVERE",
  "details": "detailed synthesis of the conflict and what makes it disputed",
  "conflictingAspects": [
    {
      "claimSegment": "part of claim contested",
      "contradictingEvidenceTitle": "title of counter source",
      "explanation": "why it conflicts",
      "isContextualDisagreement": false
    }
  ],
  "contextualFactors": ["dates, geography, or scope differences if applicable"]
}`;

    const prompt = `Claim: "${claim}"\n\nSupporting Sources (${supporting.length}):\n${supporting.map((s) => `- ${s.title}: ${s.snippet.slice(0, 150)}`).join('\n')}\n\nContradicting Sources (${contradicting.length}):\n${contradicting.map((c) => `- ${c.title}: ${c.snippet.slice(0, 150)}`).join('\n')}`;

    try {
      const response = await aiService.generateText({
        prompt,
        systemPrompt,
        temperature: 0.1,
      });

      const parsed = this.safeParseJson(response.text);
      if (parsed && typeof parsed.hasContradiction === 'boolean') {
        return {
          hasContradiction: parsed.hasContradiction,
          severity: ['NONE', 'LOW', 'MODERATE', 'SEVERE'].includes(parsed.severity) ? parsed.severity : 'MODERATE',
          details: parsed.details || 'Factual discrepancies found across sources.',
          conflictingAspects: Array.isArray(parsed.conflictingAspects) ? parsed.conflictingAspects : [],
          contextualFactors: Array.isArray(parsed.contextualFactors) ? parsed.contextualFactors : [],
        };
      }
    } catch (err) {
      console.warn('[ContradictionService] Contradiction synthesis failed, using rule-based synthesis:', err);
    }

    // Fallback structured synthesis
    return {
      hasContradiction: true,
      severity: contradicting.length >= supporting.length ? 'SEVERE' : 'MODERATE',
      details: `Retrieved ${contradicting.length} source(s) directly disputing the claim against ${supporting.length} supporting source(s).`,
      conflictingAspects: contradicting.map((c) => ({
        claimSegment: claim,
        contradictingEvidenceTitle: c.title,
        explanation: c.snippet.slice(0, 200),
        isContextualDisagreement: false,
      })),
      contextualFactors: ['Synthesized through multi-source stance alignment.'],
    };
  }

  private safeParseJson(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

export const contradictionService = new ContradictionService();
