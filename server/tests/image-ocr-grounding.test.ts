import assert from 'node:assert';
import { imageAnalysisService } from '../src/services/verification/image/image-analysis.service';
import { imageClaimExtractor } from '../src/services/verification/image/image-claim-extractor';
import { geminiSearchProvider } from '../src/services/evidence/providers/gemini-search.provider';
import { EvidenceService } from '../src/services/evidence/evidence.service';
import { webSearchProvider } from '../src/services/evidence/providers/web-search.provider';
import { contradictionService } from '../src/services/contradiction';
import { trustScoringService } from '../src/services/scoring';
import { claimExtractor } from '../src/services/text/claim-extractor';
import { EvidenceItem } from '@trustlens/shared';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    testResults.push({ name, passed: true });
    console.log(`✓ PASS: ${name}`);
  } catch (err: any) {
    testResults.push({ name, passed: false, error: err?.message || String(err) });
    console.error(`✗ FAIL: ${name} -> ${err?.message || err}`);
  }
}

async function runAll() {
  console.log('================================================================');
  console.log('  Image OCR & Search Grounding 10 Regression Tests               ');
  console.log('================================================================\n');

  // Test 1: OCR text correctly produces IMAGE_TEXT claims
  await runTest('1. OCR text correctly produces IMAGE_TEXT claims', async () => {
    const headline = "BREAKING: Coldplay's Kiss Cam: Cameraman Turns Out to Be Astronomer's Ex-Employee";
    const visual: any = {
      description: 'Screenshot showing breaking news alert',
      classification: 'SCREENSHOT',
      visibleText: [headline],
      entities: ['Coldplay', 'Astronomer'],
      scene: 'Digital screenshot',
      observations: ['Text overlay present'],
      inferredAspects: [],
      uncertainties: [],
      manipulationIndicators: { detected: false, severity: 'NONE', indicators: [], limitations: [] },
    };

    const claims = await imageClaimExtractor.extractClaims(visual, headline, { maxClaims: 4 });
    assert.ok(claims.length > 0, 'Claims should be extracted');
    const primaryClaim = claims[0];
    assert.strictEqual(primaryClaim.source, 'IMAGE_TEXT', 'Claim matching OCR text must have source IMAGE_TEXT');
    assert.strictEqual(primaryClaim.importance, 'PRIMARY', 'Visible text claim should be PRIMARY');
  });

  // Test 2: User hypotheses remain USER_CONTEXT when distinct
  await runTest('2. User hypotheses remain USER_CONTEXT when distinct from visible image text', async () => {
    const visual: any = {
      description: 'Concert stage with lights',
      classification: 'PHOTOGRAPH',
      visibleText: ['Coldplay Music of the Spheres Tour'],
      entities: ['Coldplay'],
      scene: 'Concert stadium',
      observations: ['Stage lighting'],
      inferredAspects: [],
      uncertainties: [],
      manipulationIndicators: { detected: false, severity: 'NONE', indicators: [], limitations: [] },
    };

    const distinctUserHypothesis = 'Filmed secretly in Singapore in January 2025 by fired employee';
    const claims = await imageClaimExtractor.extractClaims(visual, distinctUserHypothesis, { maxClaims: 4 });
    const userClaim = claims.find((c) => c.source === 'USER_CONTEXT');
    assert.ok(userClaim, 'Should have claim with source USER_CONTEXT');
    assert.ok(userClaim!.claim.includes('Singapore'), 'USER_CONTEXT claim should contain hypothesis');
  });

  // Test 3: OCR counters match actual extracted elements across diverse formats
  await runTest('3. OCR counters match actual extracted elements across strings, arrays, and objects', () => {
    const parseVisual = (imageAnalysisService as any).parseVisualResponse.bind(imageAnalysisService);

    // Format A: newline-separated string
    const jsonA = JSON.stringify({
      description: 'Test A',
      classification: 'SCREENSHOT',
      visibleText: "Headline 1\nHeadline 2\nHeadline 3",
    });
    const parsedA = parseVisual(jsonA);
    assert.strictEqual(parsedA.visibleText.length, 3, 'Multiline string should produce 3 items');

    // Format B: array of objects with aliases
    const jsonB = JSON.stringify({
      description: 'Test B',
      classification: 'SCREENSHOT',
      ocrText: [{ text: 'Line 1' }, { line: 'Line 2' }],
    });
    const parsedB = parseVisual(jsonB);
    assert.strictEqual(parsedB.visibleText.length, 2, 'Objects should produce 2 items');
    assert.deepStrictEqual(parsedB.visibleText, ['Line 1', 'Line 2']);
  });

  // Test 4: Grounding metadata is correctly parsed
  await runTest('4. Grounding metadata is correctly parsed into structured EvidenceItems', () => {
    const normalizer = (geminiSearchProvider as any).normalizeGroundingMetadata.bind(geminiSearchProvider);
    const mockMetadata = {
      webSearchQueries: ['Coldplay kiss cam Astronomer'],
      groundingChunks: [
        {
          web: {
            uri: 'https://people.com/music/coldplay-kiss-cam-astronomer-incident',
            title: 'People Magazine: Coldplay Kiss Cam Viral Moment',
          },
        },
      ],
      groundingSupports: [
        {
          groundingChunkIndices: [0],
          segment: {
            text: 'Astronomer CEO Andy Byron and HR chief Kristin Cabot were spotted on the kiss-cam.',
          },
        },
      ],
    };

    const items: EvidenceItem[] = normalizer(mockMetadata, 'Coldplay kiss cam Astronomer', 'Article summary text');
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].domain, 'people.com');
    assert.strictEqual(items[0].publisher, 'People');
    assert.ok(items[0].snippet.includes('Astronomer CEO Andy Byron'));
    assert.strictEqual(items[0].sourceType, 'GROUNDED_SEARCH');
  });

  // Test 5: Real sources survive normalization and deduplication
  await runTest('5. Real sources survive normalization and deduplication', async () => {
    const mockProvider = {
      name: 'mock-provider',
      isConfigured: () => true,
      search: async () => [
        {
          query: 'test query',
          status: 'SUCCESS' as const,
          items: [
            {
              id: '1',
              url: 'https://www.reuters.com/world/coldplay-incident-report',
              title: 'Reuters Report',
              publisher: 'Reuters',
              domain: 'reuters.com',
              retrievedAt: new Date().toISOString(),
              snippet: 'A comprehensive report detailing the event.',
              sourceType: 'GROUNDED_SEARCH' as const,
              stance: 'UNKNOWN' as const,
            },
            {
              id: '2',
              url: 'https://reuters.com/world/coldplay-incident-report/', // Duplicate
              title: 'Reuters Report Duplicate',
              publisher: 'Reuters',
              domain: 'reuters.com',
              retrievedAt: new Date().toISOString(),
              snippet: 'Duplicate article.',
              sourceType: 'GROUNDED_SEARCH' as const,
              stance: 'UNKNOWN' as const,
            },
          ],
          rawMetadata: null,
        },
      ],
    };

    const service = new EvidenceService(mockProvider as any, null as any);
    const { items, summary } = await service.retrieveEvidenceWithStatus(['test query'], 'test claim');
    assert.strictEqual(items.length, 1, 'Duplicate URLs should be deduplicated to 1 item');
    assert.strictEqual(summary.totalFound, 2);
    assert.strictEqual(summary.retained, 1);
    assert.strictEqual(summary.status, 'SUCCESS');
  });

  // Test 6: Irrelevant sources are rejected for a recorded reason
  await runTest('6. Irrelevant and invalid sources are rejected with recorded reasons', async () => {
    const mockProvider = {
      name: 'mock-provider',
      isConfigured: () => true,
      search: async () => [
        {
          query: 'test query',
          status: 'SUCCESS' as const,
          items: [
            {
              id: '1',
              url: 'https://duckduckgo.com/html/?q=search', // Search engine navigation URL
              title: 'Search results',
              publisher: 'DuckDuckGo',
              domain: 'duckduckgo.com',
              retrievedAt: new Date().toISOString(),
              snippet: 'Search results for coldplay',
              sourceType: 'GROUNDED_SEARCH' as const,
              stance: 'UNKNOWN' as const,
            },
            {
              id: '2',
              url: 'not-a-valid-url', // Malformed URL
              title: 'Bad URL',
              publisher: 'Unknown',
              domain: 'unknown',
              retrievedAt: new Date().toISOString(),
              snippet: 'Some snippet',
              sourceType: 'GROUNDED_SEARCH' as const,
              stance: 'UNKNOWN' as const,
            },
            {
              id: '3',
              url: 'https://example.com/short',
              title: 'Short snippet',
              publisher: 'Example',
              domain: 'example.com',
              retrievedAt: new Date().toISOString(),
              snippet: 'Too short', // < 15 characters
              sourceType: 'GROUNDED_SEARCH' as const,
              stance: 'UNKNOWN' as const,
            },
          ],
          rawMetadata: null,
        },
      ],
    };

    const service = new EvidenceService(mockProvider as any, null as any);
    const { items, summary } = await service.retrieveEvidenceWithStatus(['test query'], 'test claim');
    assert.strictEqual(items.length, 0);
    assert.strictEqual(summary.rejectedCount, 3);
    assert.ok(summary.rejections.some((r) => r.reason.includes('Search engine')));
    assert.ok(summary.rejections.some((r) => r.reason.includes('Malformed')));
    assert.ok(summary.rejections.some((r) => r.reason.includes('substantive')));
  });

  // Test 7: Provider quota errors do not create synthetic evidence
  await runTest('7. Provider quota errors return honest RATE_LIMITED status and zero synthetic citations', async () => {
    const searchRes = await geminiSearchProvider.search(['test query'], 'test claim');
    assert.ok(Array.isArray(searchRes));
    for (const res of searchRes) {
      if (res.status === 'RATE_LIMITED' || res.status === 'UNAVAILABLE') {
        assert.strictEqual(res.items.length, 0, 'Items must be empty on rate limit / error');
        assert.ok(res.errorMessage, 'Error message must be present');
      }
    }
  });

  // Test 8: No-source results remain INCONCLUSIVE
  await runTest('8. Zero evidence results remain INCONCLUSIVE with Trust Score 50 and LOW confidence', () => {
    const scoring = trustScoringService.evaluateClaim({
      supporting: [],
      contradicting: [],
      neutral: [],
      contradictions: {
        hasContradiction: false,
        severity: 'NONE',
        details: 'No evidence retrieved',
        conflictingAspects: [],
      },
    });

    assert.strictEqual(scoring.verdict, 'INCONCLUSIVE');
    assert.strictEqual(scoring.breakdown.overallScore, 50);
    assert.strictEqual(scoring.confidence, 'LOW');
  });

  // Test 9: Evidence about an event does not automatically verify every claim about that event
  await runTest('9. Event evidence does not automatically verify unverified sub-claims (classified as NEUTRAL)', async () => {
    const disputedClaim = "Coldplay's Kiss Cam: Cameraman Turns Out to Be Astronomer's Ex-Employee";

    // Evidence only discussing the concert and the CEO, without mentioning the cameraman being an ex-employee
    const generalEventEvidence: EvidenceItem[] = [
      {
        id: '1',
        url: 'https://today.com/popculture/coldplay-kiss-cam-astronomer-incident',
        title: 'Coldplay Kiss Cam Catches Astronomer CEO and Colleague',
        publisher: 'Today',
        domain: 'today.com',
        retrievedAt: new Date().toISOString(),
        snippet: 'At a recent Coldplay concert, the kiss-cam featured Astronomer CEO Andy Byron and Kristin Cabot.',
        sourceType: 'GROUNDED_SEARCH',
        stance: 'UNKNOWN',
      },
    ];

    const classified = await contradictionService.classifyEvidenceStances(disputedClaim, generalEventEvidence);
    assert.strictEqual(classified.length, 1);
    assert.notStrictEqual(classified[0].stance, 'SUPPORTS', 'Must not be SUPPORTS');
    assert.ok(['NEUTRAL', 'UNKNOWN'].includes(classified[0].stance), 'Must be NEUTRAL or UNKNOWN');
  });

  // Test 10: Query generation strips prefixes and avoids quote wrapping
  await runTest('10. Query generation strips prefixes like BREAKING: and avoids full-sentence quotes', async () => {
    const headline = "BREAKING: Coldplay's Kiss Cam: Cameraman Turns Out to Be Astronomer's Ex-Employee";
    const queries = await claimExtractor.generateSearchQueries(headline, ['Coldplay', 'Astronomer']);
    assert.ok(queries.length > 0);
    for (const q of queries) {
      assert.ok(!q.startsWith('BREAKING:'), 'Should strip BREAKING: prefix');
      assert.ok(!q.startsWith('""'), 'Should not have double double-quotes');
      assert.ok(!(q.startsWith('"') && q.endsWith('"') && q.length > 50), 'Should not wrap long sentence in quotes');
    }
  });

  console.log('\n================================================================');
  const allPassed = testResults.every((t) => t.passed);
  console.log(`Summary: ${testResults.filter((t) => t.passed).length}/${testResults.length} PASSED`);
  console.log(`Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('================================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
