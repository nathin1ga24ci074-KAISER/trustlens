import React, { useState } from 'react';
import { UrlVerificationResult } from '@trustlens/shared';
import { api } from '../../services/api';

const PROGRESS_STEPS = [
  'Validating URL & Security',
  'Fetching Webpage',
  'Extracting Article Content',
  'Identifying Factual Claims',
  'Searching Independent Web Evidence',
  'Checking Cross-Source Contradictions',
  'Calculating Deterministic Trust Score',
  'Generating Final Assessment',
];

export const UrlVerifier: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UrlVerificationResult | null>(null);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveStep(0);

    // Simulate progress progression for realistic UX
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const response = await api.verifyUrl(url.trim());
      clearInterval(interval);
      setActiveStep(PROGRESS_STEPS.length - 1);
      setResult(response.data);
      if (response.data.claims.length > 0) {
        setExpandedClaim(response.data.claims[0].claimId);
      }
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'An unexpected error occurred during URL verification.');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'LEGIT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
            Legit (Verified)
          </span>
        );
      case 'FAKE':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400 mr-2 animate-pulse" />
            Fake (Contradicted)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
            Inconclusive
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 65) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score <= 35) return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300">High Risk</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300">Moderate</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300">Clean</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Input Box */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Article or Webpage URL to Verify
            </label>
            <p className="text-xs text-slate-400 mb-3">
              TrustLens fetches the article, extracts central claims, and independently checks them against external web evidence. The URL itself is never counted as self-evidence.
            </p>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/news/article-headline"
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-750 rounded-xl px-4 py-3.5 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-mono text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Strict SSRF protections active • Private networks protected
            </span>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verifying Webpage...
                </>
              ) : (
                'Verify URL'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Loading Progress Stepper */}
      {loading && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Pipeline Step {activeStep + 1} of {PROGRESS_STEPS.length}
            </span>
            <span className="text-xs text-slate-400">{PROGRESS_STEPS[activeStep]}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 transition-all duration-500 ease-out"
              style={{ width: `${((activeStep + 1) / PROGRESS_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {PROGRESS_STEPS.map((step, idx) => (
              <div
                key={step}
                className={`text-xs p-2 rounded-lg border transition-all ${
                  idx === activeStep
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-medium'
                    : idx < activeStep
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400'
                    : 'border-transparent text-slate-600'
                }`}
              >
                {idx + 1}. {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-6 text-rose-300">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-rose-200">URL Verification Request Failed</h4>
              <p className="text-sm mt-1 text-rose-300/90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Results View */}
      {result && (
        <div className="space-y-6">
          {/* Top Overview Banner */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center space-x-3">
                  {getVerdictBadge(result.overallVerdict)}
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {result.verificationId.slice(0, 8)}...
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {result.page.domain}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug">
                  {result.page.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  {result.page.publisher && <span>Publisher: <strong className="text-slate-300">{result.page.publisher}</strong></span>}
                  {result.page.author && <span>• Author: <strong className="text-slate-300">{result.page.author}</strong></span>}
                  {result.page.publishedAt && <span>• Published: <strong className="text-slate-300">{new Date(result.page.publishedAt).toLocaleDateString()}</strong></span>}
                  <span>• Target: <a href={result.finalUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{result.finalUrl}</a></span>
                </div>
              </div>

              {/* Overall Score Circle */}
              <div className="flex items-center space-x-4 self-start lg:self-center">
                <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 ${getScoreColor(result.trustScore)}`}>
                  <span className="text-3xl font-extrabold tracking-tight">{result.trustScore}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Trust Score</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Confidence</div>
                  <div className="text-sm font-semibold text-slate-200">{result.confidence}</div>
                  <div className="text-xs text-slate-500">{result.claims.length} claims verified</div>
                </div>
              </div>
            </div>

            {/* Summary & Reasoning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{result.summary}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Analysis Rationale</h4>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{result.reasoning}</p>
              </div>
            </div>

            {/* Cross-Analysis Cards: Headline Framing & Self-Consistency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Headline Framing */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Headline vs Body Framing</span>
                  {getSeverityBadge(result.headlineAnalysis.severity)}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {result.headlineAnalysis.explanation}
                </p>
              </div>

              {/* Self-Consistency */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Article Internal Consistency</span>
                  {getSeverityBadge(result.selfConsistencyAnalysis.severity)}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {result.selfConsistencyAnalysis.details}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Claims Analyzed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">
                Extracted Empirical Claims ({result.claims.length})
              </h3>
              <span className="text-xs text-slate-400">
                Each claim is verified independently using Stage 3 web evidence
              </span>
            </div>

            {result.claims.map((claim, idx) => {
              const isExpanded = expandedClaim === claim.claimId;
              return (
                <div
                  key={claim.claimId}
                  className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden transition-all shadow-md"
                >
                  <div
                    onClick={() => setExpandedClaim(isExpanded ? null : claim.claimId)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-cyan-300">
                          #{idx + 1}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          claim.importance === 'PRIMARY'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {claim.importance}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {claim.claimType}
                        </span>
                        {getVerdictBadge(claim.verdict)}
                      </div>
                      <p className="text-base font-semibold text-slate-100">
                        "{claim.claim}"
                      </p>
                      {claim.sourceParagraph && (
                        <p className="text-xs text-slate-400 italic line-clamp-1">
                          Context: "{claim.sourceParagraph}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-200">Score: {claim.trustScore}</div>
                        <div className="text-xs text-slate-400">{claim.supportingEvidence.length} sup / {claim.contradictingEvidence.length} con</div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-200">
                        <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Evidence Drawer for this claim */}
                  {isExpanded && (
                    <div className="p-5 pt-0 border-t border-slate-800/80 bg-slate-950/40 space-y-4">
                      {/* Search Queries Used */}
                      <div className="pt-4">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                          Independent Grounding Queries:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {claim.searchQueries.map((q) => (
                            <span key={q} className="text-xs px-2.5 py-1 rounded-md bg-slate-900 border border-slate-750 text-slate-300 font-mono">
                              🔍 {q}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Contradiction Analysis */}
                      {claim.contradictions.hasContradiction && (
                        <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-800/50 text-xs text-rose-300 space-y-1">
                          <div className="font-bold">Contradiction Detected ({claim.contradictions.severity}):</div>
                          <div>{claim.contradictions.details}</div>
                        </div>
                      )}

                      {/* External Evidence Cards */}
                      <div className="space-y-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                          Retrieved External Evidence Sources ({claim.supportingEvidence.length + claim.contradictingEvidence.length + claim.neutralEvidence.length})
                        </span>

                        {[...claim.supportingEvidence, ...claim.contradictingEvidence, ...claim.neutralEvidence].length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No external web sources were captured for this specific assertion.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[...claim.supportingEvidence, ...claim.contradictingEvidence, ...claim.neutralEvidence].map((ev) => (
                              <div
                                key={ev.id}
                                className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                                  ev.stance === 'SUPPORTS'
                                    ? 'bg-emerald-950/15 border-emerald-800/40'
                                    : ev.stance === 'CONTRADICTS'
                                    ? 'bg-rose-950/15 border-rose-800/40'
                                    : 'bg-slate-900 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                    ev.stance === 'SUPPORTS'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : ev.stance === 'CONTRADICTS'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}>
                                    {ev.stance}
                                  </span>
                                  <span className="text-slate-400 font-medium">{ev.domain}</span>
                                </div>
                                <h5 className="font-semibold text-slate-200 line-clamp-1">{ev.title}</h5>
                                <p className="text-slate-300/90 italic line-clamp-2">"{ev.snippet}"</p>
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:underline block truncate text-[11px]"
                                >
                                  {ev.url} ↗
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Limitations & Uncertainty */}
          {result.limitations.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-2 text-xs text-slate-400">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider">Uncertainty Factors & Limitations</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {result.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
