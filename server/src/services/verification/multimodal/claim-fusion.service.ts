import {
  UnifiedClaim,
  TextVerificationResult,
  UrlVerificationResult,
  ImageVerificationResult,
  VideoVerificationResult,
  EvidenceItem,
  ContradictionAnalysisResult,
  PrimaryVerdict,
} from '@trustlens/shared';

export interface ModalityVerificationInputs {
  textResult?: TextVerificationResult | null;
  urlResult?: UrlVerificationResult | null;
  imageResult?: ImageVerificationResult | null;
  videoResult?: VideoVerificationResult | null;
  userContextText?: string | null;
}

export class ClaimFusionService {
  /**
   * Fuses claims across multiple input modalities into deduplicated UnifiedClaims.
   * 
   * CORE PRINCIPLE:
   * Repeating the same claim in text, image, and video does NOT increase its credibility.
   * User inputs are HYPOTHESES, not independent evidence.
   * Claims that describe the same core event across modalities are fused into a single
   * unified claim with multiple source tags, avoiding double-counting in scoring.
   */
  fuseClaims(inputs: ModalityVerificationInputs): UnifiedClaim[] {
    const rawClaims: UnifiedClaim[] = [];

    // 1. Ingest Text Claims
    if (inputs.textResult && inputs.textResult.claim) {
      const vId = inputs.textResult.verificationId || crypto.randomUUID();
      rawClaims.push({
        claimId: `fused_text_${vId.slice(0, 8)}`,
        claim: inputs.textResult.claim,
        sources: ['TEXT'],
        claimType: inputs.textResult.claimType || 'EMPIRICAL_FACT',
        importance: 'PRIMARY',
        entities: this.extractEntities(inputs.textResult.claim),
        verdict: inputs.textResult.verdict || 'INCONCLUSIVE',
        trustScore: inputs.textResult.trustScore ?? 50,
        confidence: inputs.textResult.confidence || 'MEDIUM',
        supportingEvidence: inputs.textResult.supportingEvidence || [],
        contradictingEvidence: inputs.textResult.contradictingEvidence || [],
        neutralEvidence: inputs.textResult.neutralEvidence || [],
        contradictions: inputs.textResult.contradictions,
        provenance: inputs.textResult.provenance || [],
      });
    }

    // 2. Ingest URL Claims
    if (inputs.urlResult && Array.isArray(inputs.urlResult.claims)) {
      for (const urlClaim of inputs.urlResult.claims) {
        const cId = urlClaim.claimId || crypto.randomUUID();
        rawClaims.push({
          claimId: `fused_url_${cId.slice(0, 8)}`,
          claim: urlClaim.claim,
          sources: ['URL'],
          claimType: urlClaim.claimType || 'EMPIRICAL_FACT',
          importance: urlClaim.importance || 'PRIMARY',
          entities: this.extractEntities(urlClaim.claim),
          verdict: urlClaim.verdict || 'INCONCLUSIVE',
          trustScore: urlClaim.trustScore ?? 50,
          confidence: urlClaim.confidence || 'MEDIUM',
          supportingEvidence: urlClaim.supportingEvidence || [],
          contradictingEvidence: urlClaim.contradictingEvidence || [],
          neutralEvidence: urlClaim.neutralEvidence || [],
          contradictions: urlClaim.contradictions,
          provenance: urlClaim.provenance || [],
        });
      }
    }

    // 3. Ingest Image Claims
    if (inputs.imageResult && Array.isArray(inputs.imageResult.claims)) {
      for (const imgClaim of inputs.imageResult.claims) {
        const cId = imgClaim.claimId || crypto.randomUUID();
        rawClaims.push({
          claimId: `fused_img_${cId.slice(0, 8)}`,
          claim: imgClaim.claim,
          sources: [imgClaim.source as any],
          claimType: imgClaim.claimType || 'EMPIRICAL_FACT',
          importance: imgClaim.importance || 'PRIMARY',
          entities: imgClaim.entities || [],
          verdict: imgClaim.verdict || 'INCONCLUSIVE',
          trustScore: imgClaim.trustScore ?? 50,
          confidence: imgClaim.confidence || 'MEDIUM',
          supportingEvidence: imgClaim.supportingEvidence || [],
          contradictingEvidence: imgClaim.contradictingEvidence || [],
          neutralEvidence: imgClaim.neutralEvidence || [],
          contradictions: imgClaim.contradictions,
          provenance: imgClaim.provenance || [],
        });
      }
    }

    // 4. Ingest Video Claims
    if (inputs.videoResult && Array.isArray(inputs.videoResult.claims)) {
      for (const vidClaim of inputs.videoResult.claims) {
        const cId = vidClaim.claimId || crypto.randomUUID();
        rawClaims.push({
          claimId: `fused_vid_${cId.slice(0, 8)}`,
          claim: vidClaim.claim,
          sources: [vidClaim.source],
          claimType: vidClaim.claimType || 'EMPIRICAL_FACT',
          importance: vidClaim.importance || 'PRIMARY',
          entities: vidClaim.entities || [],
          verdict: vidClaim.verdict || 'INCONCLUSIVE',
          trustScore: vidClaim.trustScore ?? 50,
          confidence: vidClaim.confidence || 'MEDIUM',
          timestamps: vidClaim.timestamps,
          supportingEvidence: vidClaim.supportingEvidence || [],
          contradictingEvidence: vidClaim.contradictingEvidence || [],
          neutralEvidence: vidClaim.neutralEvidence || [],
          contradictions: vidClaim.contradictions,
          provenance: vidClaim.provenance || [],
        });
      }
    }

    // 5. Deduplicate and Fuse Overlapping Claims
    return this.deduplicateAndMergeClaims(rawClaims);
  }

  private deduplicateAndMergeClaims(claims: UnifiedClaim[]): UnifiedClaim[] {
    if (claims.length <= 1) {
      return claims;
    }

    const merged: UnifiedClaim[] = [];
    const visited = new Set<number>();

    for (let i = 0; i < claims.length; i++) {
      if (visited.has(i)) continue;

      const current = { ...claims[i] };
      visited.add(i);

      for (let j = i + 1; j < claims.length; j++) {
        if (visited.has(j)) continue;

        const other = claims[j];
        if (this.areClaimsSemanticallyAligned(current.claim, other.claim, current.entities, other.entities)) {
          visited.add(j);

          // Merge sources without duplication
          for (const src of other.sources) {
            if (!current.sources.includes(src)) {
              current.sources.push(src);
            }
          }

          // Prioritize higher importance
          if (other.importance === 'PRIMARY') {
            current.importance = 'PRIMARY';
          } else if (other.importance === 'SUPPORTING' && current.importance === 'MINOR') {
            current.importance = 'SUPPORTING';
          }

          // Combine entities
          for (const ent of other.entities) {
            if (!current.entities.includes(ent)) {
              current.entities.push(ent);
            }
          }

          // Combine timestamps
          if (other.timestamps) {
            current.timestamps = Array.from(new Set([...(current.timestamps || []), ...other.timestamps])).sort((a, b) => a - b);
          }

          // Deduplicate evidence items
          current.supportingEvidence = this.deduplicateEvidence([
            ...current.supportingEvidence,
            ...other.supportingEvidence,
          ]);
          current.contradictingEvidence = this.deduplicateEvidence([
            ...current.contradictingEvidence,
            ...other.contradictingEvidence,
          ]);
          current.neutralEvidence = this.deduplicateEvidence([
            ...current.neutralEvidence,
            ...other.neutralEvidence,
          ]);

          // Combine contradictions if more severe
          if (other.contradictions?.hasContradiction) {
            if (!current.contradictions?.hasContradiction || other.contradictions.severity === 'SEVERE') {
              current.contradictions = other.contradictions;
            }
          }

          // Unified score: if either is contradicted/fake, conservative verdict applies
          if (current.verdict === 'FAKE' || other.verdict === 'FAKE') {
            current.verdict = 'FAKE';
            current.trustScore = Math.min(current.trustScore, other.trustScore);
          } else if (current.verdict === 'INCONCLUSIVE' || other.verdict === 'INCONCLUSIVE') {
            current.verdict = current.verdict === 'LEGIT' ? 'INCONCLUSIVE' : current.verdict;
            current.trustScore = Math.round((current.trustScore + other.trustScore) / 2);
          } else {
            current.trustScore = Math.max(current.trustScore, other.trustScore);
          }
        }
      }

      merged.push(current);
    }

    return merged;
  }

  /**
   * Evaluates if two claims represent the same factual proposition
   */
  areClaimsSemanticallyAligned(
    claimA: string,
    claimB: string,
    entitiesA: string[],
    entitiesB: string[]
  ): boolean {
    const cleanA = claimA.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const cleanB = claimB.toLowerCase().replace(/[^\w\s]/g, '').trim();

    if (cleanA === cleanB) return true;

    // Check entity overlap
    if (entitiesA.length > 0 && entitiesB.length > 0) {
      const setA = new Set(entitiesA.map((e) => e.toLowerCase()));
      const commonEntities = entitiesB.filter((e) => setA.has(e.toLowerCase()));
      if (commonEntities.length >= 2) {
        return true;
      }
    }

    // Token Jaccard overlap
    const wordsA = new Set(cleanA.split(/\s+/).filter((w) => w.length > 3));
    const wordsB = new Set(cleanB.split(/\s+/).filter((w) => w.length > 3));

    if (wordsA.size === 0 || wordsB.size === 0) return false;

    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    return jaccard >= 0.55;
  }

  private extractEntities(text: string): string[] {
    const words = text.split(/\s+/);
    const capitalized = words
      .filter((w) => /^[A-Z][a-z]{2,}/.test(w))
      .map((w) => w.replace(/[^\w]/g, ''));
    return Array.from(new Set(capitalized)).slice(0, 5);
  }

  private deduplicateEvidence(items: EvidenceItem[]): EvidenceItem[] {
    const seen = new Set<string>();
    const out: EvidenceItem[] = [];
    for (const item of items) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        out.push(item);
      }
    }
    return out;
  }
}

export const claimFusionService = new ClaimFusionService();
