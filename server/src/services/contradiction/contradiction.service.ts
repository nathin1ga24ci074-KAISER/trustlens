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
- "SUPPORTS": The evidence directly confirms, affirms, or validates the specific factual assertion.
- "CONTRADICTS": The evidence directly disputes, disproves, denies, debunks, or contradicts the claim (or notes it is satirical/untrue).
- "NEUTRAL": The evidence discusses the event, entities, or subject but NEITHER proves nor disproves the specific disputed claim.
- "UNKNOWN": The snippet lacks sufficient context to determine.

CRITICAL RULE ON EVENT vs SPECIFIC DISPUTED SUB-CLAIM:
- If a snippet merely confirms that an underlying event occurred (e.g., Coldplay concert kiss cam incident), but does NOT confirm or substantiate the specific disputed assertion in the claim (e.g., that the cameraman was an ex-employee), you MUST classify the stance as "NEUTRAL", NOT "SUPPORTS".
- An article discussing the broader event or background entities is purely NEUTRAL context unless it explicitly validates the specific contested assertion.
- If a snippet notes that a viral claim is satirical, a rumor, unverified, or a joke, classify as "CONTRADICTS".

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
    const claimKeywords = claim
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4);

    return items.map((item) => {
      const lowerSnippet = (item.snippet + ' ' + item.title).toLowerCase();
      const hasNegation = /\b(false|hoax|debunked|fake|incorrect|not true|no evidence|disproven|unsubstantiated|unverified|parody|satire|fabrication|meme)\b/.test(lowerSnippet);
      const hasAffirmation = /\b(confirmed|officially|verified|announced|proven|fact|true statement)\b/.test(lowerSnippet);

      let stance: EvidenceStance = 'NEUTRAL';
      let explanation = 'Discusses related event context without confirming or refuting specific assertion.';

      if (hasNegation) {
        stance = 'CONTRADICTS';
        explanation = 'Snippet indicates claim is false, unverified, satirical, or disproven.';
      } else if (hasAffirmation) {
        // Only classify as SUPPORTS if snippet has significant keyword overlap with specific claim
        const matchedKeywords = claimKeywords.filter((k) => lowerSnippet.includes(k));
        const overlapRatio = claimKeywords.length > 0 ? matchedKeywords.length / claimKeywords.length : 0;
        if (overlapRatio >= 0.5) {
          stance = 'SUPPORTS';
          explanation = 'Snippet contains corroborating language aligning with specific claim.';
        } else {
          stance = 'NEUTRAL';
          explanation = 'Snippet discusses broader event but does not substantiate the specific disputed sub-claim.';
        }
      }

      return {
        ...item,
        stance,
        stanceExplanation: explanation,
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
