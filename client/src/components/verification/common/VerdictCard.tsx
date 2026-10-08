import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Badge } from '../../common/Badge';

export interface VerdictCardProps {
  verdict: 'LEGIT' | 'INCONCLUSIVE' | 'FAKE' | string;
  trustScore: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  summary: string;
  reasoning: string;
  limitations?: string[];
  inputType?: string;
  inputsProvided?: {
    text?: string | null;
    url?: string | null;
    hasImage?: boolean;
    hasVideo?: boolean;
    imageFilename?: string | null;
    videoFilename?: string | null;
  };
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  verdict,
  trustScore,
  confidence,
  summary,
  reasoning,
  limitations,
  inputType,
  inputsProvided,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showLimitations, setShowLimitations] = useState(false);

  const isLegit = verdict === 'LEGIT';
  const isFake = verdict === 'FAKE';
  const isInconclusive = verdict === 'INCONCLUSIVE';

  const badgeVariant = isLegit ? 'success' : isFake ? 'danger' : 'warning';
  const scoreColor =
    trustScore >= 65
      ? 'text-emerald-400'
      : trustScore <= 35
      ? 'text-rose-400'
      : 'text-amber-400';

  const borderColor = isLegit
    ? 'border-emerald-500/70 bg-emerald-950/20'
    : isFake
    ? 'border-rose-500/70 bg-rose-950/20'
    : 'border-amber-500/70 bg-amber-950/20';

  // Categorize algorithmic reason
  const getVerdictCategoryDescription = () => {
    if (isFake) {
      return 'Primary claim directly refuted by independent evidence or contains critical cross-modal contradictions.';
    }
    if (isLegit) {
      return 'Claims are verified and corroborated by authoritative, independent external sources without material contradiction.';
    }
    return 'Insufficient, uncorroborated, or mixed evidence. TrustLens errs on the side of caution without fabricating certainty.';
  };

  return (
    <div className={`rounded-2xl border-2 p-6 transition-all shadow-xl backdrop-blur-sm ${borderColor}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: Verdict info & summary */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {inputType ? `${inputType} VERIFICATION` : 'VERDICT'}
            </span>
            <Badge variant={badgeVariant} size="md" className="px-3.5 py-1 text-sm font-black tracking-wide">
              {isLegit && <CheckCircle2 className="w-4 h-4 mr-1 inline" />}
              {isFake && <XCircle className="w-4 h-4 mr-1 inline" />}
              {isInconclusive && <AlertTriangle className="w-4 h-4 mr-1 inline" />}
              {verdict}
            </Badge>

            <Badge variant="neutral" size="sm" className="font-mono text-slate-300">
              Confidence: {confidence}
            </Badge>

            {inputType === 'MULTIMODAL' && inputsProvided && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/60 font-medium">
                Fused Inputs: {[
                  inputsProvided.text ? 'Text' : null,
                  inputsProvided.url ? 'URL' : null,
                  inputsProvided.hasImage ? 'Image' : null,
                  inputsProvided.hasVideo ? 'Video' : null,
                ].filter(Boolean).join(' + ')}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-100 font-medium leading-relaxed">
            {summary}
          </p>

          <p className="text-xs text-slate-400 leading-normal flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
            <span>{getVerdictCategoryDescription()}</span>
          </p>
        </div>

        {/* Right: Trust Score Gauge */}
        <div className="flex items-center gap-4 shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-inner">
          <div className="text-center">
            <div className={`text-3xl font-black font-mono tracking-tight ${scoreColor}`}>
              {trustScore}
              <span className="text-sm font-normal text-slate-500">/100</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              Trust Score
            </div>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div className="text-left text-[11px] text-slate-400 max-w-[130px] leading-tight">
            {trustScore >= 65 && 'Corroborated by independent web sources'}
            {trustScore <= 35 && 'Contradicted or disproven by independent evidence'}
            {trustScore > 35 && trustScore < 65 && 'Mixed or inconclusive evidence pool'}
          </div>
        </div>
      </div>

      {/* Rationale and Details Accordion */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Algorithmic Rationale & Scoring Logic</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {limitations && limitations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLimitations(!showLimitations)}
              className="text-[11px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{limitations.length} Assessment Limitations</span>
              {showLimitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {showDetails && (
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 leading-relaxed animate-fade-in space-y-2">
            <div>
              <span className="font-semibold text-slate-200">Formal Rationale: </span>
              {reasoning}
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              TrustLens combines deterministic importance weighting, primary claim veto rules, and independent source consensus.
            </div>
          </div>
        )}

        {showLimitations && limitations && limitations.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-900/40 text-xs text-amber-200/90 animate-fade-in space-y-1.5">
            <div className="font-bold text-[11px] uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Pipeline Boundaries & Caveats
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-100/80">
              {limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
