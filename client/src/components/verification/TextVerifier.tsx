import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Network,
  Clock,
  Layers,
  FileText,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { TextVerificationResult, EvidenceItem } from '@trustlens/shared';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';
import { api } from '../../services/api';

const SAMPLE_CLAIMS = [
  'The Earth orbits the Sun in approximately 365.25 days.',
  'India won the 2026 FIFA World Cup.',
  'Drinking lemon water completely cures Type 1 diabetes.',
  'NASA landed astronauts on the Moon during the Apollo 11 mission in 1969.',
];

const ANALYSIS_STEPS = [
  'Analyzing statement & extracting factual claim',
  'Generating targeted multi-source search queries',
  'Retrieving independent web evidence & citations',
  'Evaluating source independence & detecting derivative reporting',
  'Classifying supporting, neutral, and contradicting evidence',
  'Cross-examining contradictory accounts & identifying nuances',
  'Calculating Bayesian uncertainty-aware Trust Score',
  'Synthesizing explainable empirical verdict',
];

interface TextVerifierProps {
  initialResult?: TextVerificationResult | null;
  onVerificationComplete?: (result: TextVerificationResult) => void;
}

export const TextVerifier: React.FC<TextVerifierProps> = ({
  initialResult = null,
  onVerificationComplete,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<TextVerificationResult | null>(initialResult);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (textToVerify?: string) => {
    const targetText = (textToVerify || input).trim();
    if (!targetText) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStepIndex(0);

    // Step progress animation simulation during request
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const response = await api.verifyText(targetText);
      clearInterval(stepInterval);
      setResult(response.data);
      if (onVerificationComplete) {
        onVerificationComplete(response.data);
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictStyles = (verdict: string) => {
    switch (verdict) {
      case 'LEGIT':
        return {
          badge: <Badge variant="success">LEGIT CLAIM</Badge>,
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
          border: 'border-emerald-600/50',
          bg: 'bg-emerald-950/20',
          text: 'text-emerald-400',
        };
      case 'FAKE':
        return {
          badge: <Badge variant="danger">FABRICATED / DISPROVEN</Badge>,
          icon: <XCircle className="w-8 h-8 text-rose-400" />,
          border: 'border-rose-600/50',
          bg: 'bg-rose-950/20',
          text: 'text-rose-400',
        };
      default:
        return {
          badge: <Badge variant="warning">INCONCLUSIVE EVIDENCE</Badge>,
          icon: <HelpCircle className="w-8 h-8 text-amber-400" />,
          border: 'border-amber-600/50',
          bg: 'bg-amber-950/20',
          text: 'text-amber-400',
        };
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Verification Input Box */}
      <Card className="border-sky-900/60 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
            <Search className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold text-white">
            What statement or claim do you want to verify?
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          TrustLens autonomously extracts factual assertions, queries independent web records, assesses source diversity, cross-examines contradictions, and calculates a calibrated Trust Score.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-4"
        >
          <div className="relative">
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste any factual assertion, news headline, or controversial claim..."
              disabled={loading}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all resize-none"
            />
          </div>

          {/* Sample Claims Pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Try an example:</span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_CLAIMS.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setInput(sample);
                    handleVerify(sample);
                  }}
                  disabled={loading}
                  className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  "{sample.slice(0, 48)}..."
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-500">
              Evidence-based verification • Zero hallucinated scores
            </span>

            <Button
              type="submit"
              size="md"
              disabled={loading || !input.trim()}
              isLoading={loading}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Verify Claim
            </Button>
          </div>
        </form>

        {error && (
          <Alert type="error" className="mt-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Card>

      {/* Analysis Progress Stepper */}
      {loading && (
        <Card className="border-sky-900/60 bg-slate-950/90 py-6">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Pipeline Active: Stage {currentStepIndex + 1} of {ANALYSIS_STEPS.length}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {Math.round(((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100)}%
              </span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-sky-500 h-1.5 transition-all duration-500 ease-out"
                style={{
                  width: `${((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%`,
                }}
              />
            </div>

            <p className="text-sm font-medium text-slate-200">
              {ANALYSIS_STEPS[currentStepIndex]}
            </p>
          </div>
        </Card>
      )}

      {/* Verification Result Showcase */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Verdict Header Card */}
          {(() => {
            const vStyle = getVerdictStyles(result.verdict);
            return (
              <div
                className={`rounded-2xl border ${vStyle.border} ${vStyle.bg} bg-slate-900/90 p-6 lg:p-8 backdrop-blur-md shadow-xl`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                      {vStyle.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        {vStyle.badge}
                        <Badge
                          variant={
                            result.confidence === 'HIGH'
                              ? 'success'
                              : result.confidence === 'MEDIUM'
                              ? 'neutral'
                              : 'warning'
                          }
                        >
                          {result.confidence} CONFIDENCE
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        "{result.claim}"
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Verification ID: {result.verificationId} •{' '}
                        {new Date(result.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Trust Score Gauge */}
                  <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-4 rounded-xl shrink-0">
                    <div className="text-right">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Trust Score
                      </span>
                      <span className="text-2xl font-black text-white">
                        {result.trustScore}
                        <span className="text-xs text-slate-500 font-normal"> / 100</span>
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                      <div
                        className={`text-xs font-bold ${vStyle.text}`}
                      >
                        {result.trustScore}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Executive Summary & Detailed Reasoning */}
                <div className="mt-6 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Executive Verdict
                    </h4>
                    <p className="text-base text-slate-100 font-medium leading-relaxed">
                      {result.summary}
                    </p>
                  </div>

                  {result.reasoning && (
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Factual Rationale
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {result.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Transparent Scoring Formula Breakdown */}
                  {result.scoreBreakdown && (
                    <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-4">
                      <span>Supporting: <strong className="text-emerald-400">{result.scoreBreakdown.supportingStrength}</strong></span>
                      <span>Contradicting: <strong className="text-rose-400">{result.scoreBreakdown.contradictingStrength}</strong></span>
                      <span>Source Credibility: <strong className="text-sky-400">{result.scoreBreakdown.sourceCredibility}</strong></span>
                      <span>Source Independence: <strong className="text-amber-400">{result.scoreBreakdown.sourceIndependence}</strong></span>
                      <span>Uncertainty Penalty: <strong className="text-purple-400">-{result.scoreBreakdown.uncertaintyPenalty}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Contradiction Analysis Section */}
          {result.contradictions && result.contradictions.hasContradiction && (
            <Card className="border-rose-900/60 bg-rose-950/10">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-semibold text-white">
                  Contradiction Analysis ({result.contradictions.severity} Severity)
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {result.contradictions.details}
              </p>

              {result.contradictions.conflictingAspects.length > 0 && (
                <div className="space-y-2">
                  {result.contradictions.conflictingAspects.map((aspect, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/80 border border-rose-900/40 text-xs"
                    >
                      <span className="font-semibold text-rose-300">
                        {aspect.contradictingEvidenceTitle || 'Contradicting Citation'}:
                      </span>{' '}
                      <span className="text-slate-300">{aspect.explanation}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Evidence Grid: Supporting vs Contradicting vs Neutral */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supporting Evidence Card */}
            <Card>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Supporting Evidence ({result.supportingEvidence.length})
                  </h4>
                </div>
                <Badge variant="success" size="sm">Confirms Claim</Badge>
              </div>

              {result.supportingEvidence.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No direct supporting web evidence was located.
                </p>
              ) : (
                <div className="space-y-3">
                  {result.supportingEvidence.map((item) => (
                    <EvidenceCard item={item} key={item.id} type="supporting" />
                  ))}
                </div>
              )}
            </Card>

            {/* Contradicting Evidence Card */}
            <Card>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Contradicting Evidence ({result.contradictingEvidence.length})
                  </h4>
                </div>
                <Badge variant="danger" size="sm">Disputes Claim</Badge>
              </div>

              {result.contradictingEvidence.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No direct contradicting evidence was found.
                </p>
              ) : (
                <div className="space-y-3">
                  {result.contradictingEvidence.map((item) => (
                    <EvidenceCard item={item} key={item.id} type="contradicting" />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Contextual & Neutral Evidence */}
          {result.neutralEvidence && result.neutralEvidence.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Contextual & Neutral Background Evidence ({result.neutralEvidence.length})
                  </h4>
                </div>
                <Badge variant="neutral" size="sm">Background</Badge>
              </div>

              <div className="space-y-3">
                {result.neutralEvidence.map((item) => (
                  <EvidenceCard item={item} key={item.id} type="neutral" />
                ))}
              </div>
            </Card>
          )}

          {/* Search Queries & Provenance Graph */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Generated Search Queries Used
              </h4>
              <div className="space-y-2">
                {result.searchQueries.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300"
                  >
                    "{q}"
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Source Lineage & Provenance
              </h4>
              <div className="space-y-2">
                {result.provenance.length === 0 ? (
                  <p className="text-xs text-slate-500">No external URLs recorded.</p>
                ) : (
                  result.provenance.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-200">{p.domain}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{p.relationship}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Limitations & Uncertainty Factors */}
          {result.limitations && result.limitations.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-slate-400">
              <span className="font-semibold text-slate-300 uppercase tracking-wider block text-[11px]">
                Epistemic Boundaries & Uncertainty Factors
              </span>
              <ul className="list-disc pl-4 space-y-1">
                {result.limitations.map((limit, idx) => (
                  <li key={idx}>{limit}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EvidenceCard: React.FC<{ item: EvidenceItem; type: 'supporting' | 'contradicting' | 'neutral' }> = ({
  item,
  type,
}) => {
  const borderCol =
    type === 'supporting'
      ? 'border-emerald-900/40 hover:border-emerald-700/60'
      : type === 'contradicting'
      ? 'border-rose-900/40 hover:border-rose-700/60'
      : 'border-slate-800 hover:border-slate-700';

  return (
    <div className={`p-4 rounded-xl bg-slate-950 border ${borderCol} transition-colors space-y-2 text-xs`}>
      <div className="flex items-start justify-between gap-3">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1.5"
        >
          {item.title}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
        <span className="font-mono text-[11px] text-slate-500 shrink-0">{item.domain}</span>
      </div>

      <p className="text-slate-300 leading-relaxed italic border-l-2 border-slate-800 pl-2.5">
        "{item.snippet}"
      </p>

      {item.stanceExplanation && (
        <p className="text-[11px] text-slate-400 font-mono">
          Analysis: {item.stanceExplanation}
        </p>
      )}
    </div>
  );
};
